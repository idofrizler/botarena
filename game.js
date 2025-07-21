// Game configuration
const GAME_CONFIG = {
    canvas: {
        baseWidth: 800,
        baseHeight: 600,
        width: 800,
        height: 600
    },
    arena: {
        centerX: 400,
        centerY: 300,
        radius: 250,
        sides: 8 // Octagon for more interesting bounces
    },
    bots: {
        radius: 25,
        speed: 8,
        maxSpeed: 12,
        heelArcAngle: Math.PI * 0.6, // 108 degrees arc for achilles heel
        heelDistance: 20
    },
    physics: {
        friction: 1.0, // No friction - bots maintain speed
        bounce: 1.0, // Perfect bounces
        minSpeed: 0.5
    },
    game: {
        maxHealth: 5,
        invulnerabilityTime: 1000 // 1 second of invulnerability after hit
    },
    mobile: {
        isMobile: false,
        scaleFactor: 1,
        reducedParticles: false
    }
};

// Game state
let gameState = {
    running: false,
    gameOver: false,
    winner: null,
    startTime: null,
    elapsedTime: 0,
    tweaks: {
        bot1: 'none',
        bot2: 'none'
    }
};

// Canvas and context
let canvas, ctx;

// Game objects
let bots = [];
let particles = [];
let arenaVertices = [];

// UI elements
let bot1HealthEl, bot2HealthEl, bot1PointsEl, bot2PointsEl;
let gameOverEl, winnerMessageEl, restartBtnEl, gameTimerEl;
let preGameMenuEl, startGameBtnEl, bot1TweakIndicatorEl, bot2TweakIndicatorEl;

// Vector utility functions
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }

    subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return new Vector2(this.x / mag, this.y / mag);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }
}

// Bot class
class Bot {
    constructor(x, y, color, id, tweak = 'none') {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(
            (Math.random() - 0.5) * GAME_CONFIG.bots.speed,
            (Math.random() - 0.5) * GAME_CONFIG.bots.speed
        );
        this.color = color;
        this.id = id;
        this.tweak = tweak;
        
        // Apply tweak-specific properties
        this.health = tweak === 'extra-life' ? 6 : GAME_CONFIG.game.maxHealth;
        this.maxHealth = this.health;
        this.radius = tweak === 'smaller' ? GAME_CONFIG.bots.radius * 0.7 : GAME_CONFIG.bots.radius;
        
        this.angle = Math.random() * Math.PI * 2;
        this.bodyAngle = Math.random() * Math.PI * 2; // Fixed body orientation
        this.lastHitTime = 0;
        this.squashScale = 1;
        this.targetAngle = this.angle;
        this.aiTimer = 0;
        this.lastRegenTime = 0; // For regeneration tweak
    }

    update(deltaTime) {
        // Update position
        this.position = this.position.add(this.velocity);
        
        // Update angle based on movement
        if (this.velocity.magnitude() > 0.1) {
            this.angle = Math.atan2(this.velocity.y, this.velocity.x);
        }

        // Apply minimal friction to maintain momentum
        this.velocity = this.velocity.multiply(GAME_CONFIG.physics.friction);
        
        // Limit max speed
        if (this.velocity.magnitude() > GAME_CONFIG.bots.maxSpeed) {
            this.velocity = this.velocity.normalize().multiply(GAME_CONFIG.bots.maxSpeed);
        }

        // Reset squash animation
        this.squashScale = Math.min(this.squashScale + 0.05, 1);
        
        // Rotate the achilles heel continuously
        this.bodyAngle += 0.02; // Slow rotation speed
    }

    getAchillesHeelArc() {
        const heelAngle = this.bodyAngle + Math.PI; // Fixed position on bot's body
        const halfArc = GAME_CONFIG.bots.heelArcAngle / 2;
        return {
            centerAngle: heelAngle,
            startAngle: heelAngle - halfArc,
            endAngle: heelAngle + halfArc
        };
    }

    isPointInAchillesHeel(point, attackingRadius = 0) {
        const vectorToPoint = point.subtract(this.position);
        const distance = vectorToPoint.magnitude();
        
        // Must be close enough to collide - use both bot radii for accurate collision detection
        const maxCollisionDistance = this.radius + attackingRadius + 10; // Small buffer for collision
        if (distance > maxCollisionDistance) {
            console.log(`    Distance check failed: ${distance.toFixed(1)} > ${maxCollisionDistance.toFixed(1)} (target:${this.radius.toFixed(1)} + attacker:${attackingRadius.toFixed(1)} + buffer:10)`);
            return false;
        }
        
        const angleToPoint = Math.atan2(vectorToPoint.y, vectorToPoint.x);
        const heel = this.getAchillesHeelArc();
        
        // Convert to degrees for easier comparison
        const attackAngleDegrees = ((angleToPoint * 180 / Math.PI) + 360) % 360;
        const startAngleDegrees = ((heel.startAngle * 180 / Math.PI) + 360) % 360;
        const endAngleDegrees = ((heel.endAngle * 180 / Math.PI) + 360) % 360;
        
        console.log(`    Distance: ${distance.toFixed(1)}, Attack: ${attackAngleDegrees.toFixed(1)}°, Range: ${startAngleDegrees.toFixed(1)}° to ${endAngleDegrees.toFixed(1)}°`);
        
        // Check if attack angle is within the heel arc
        if (startAngleDegrees <= endAngleDegrees) {
            // Normal case: no wrap-around (e.g., 109° to 217°)
            const result = attackAngleDegrees >= startAngleDegrees && attackAngleDegrees <= endAngleDegrees;
            console.log(`    Normal case: ${attackAngleDegrees.toFixed(1)} >= ${startAngleDegrees.toFixed(1)} && ${attackAngleDegrees.toFixed(1)} <= ${endAngleDegrees.toFixed(1)} = ${result}`);
            return result;
        } else {
            // Wrap-around case: (e.g., 255° to 3°)
            const result = attackAngleDegrees >= startAngleDegrees || attackAngleDegrees <= endAngleDegrees;
            console.log(`    Wrap-around case: ${attackAngleDegrees.toFixed(1)} >= ${startAngleDegrees.toFixed(1)} || ${attackAngleDegrees.toFixed(1)} <= ${endAngleDegrees.toFixed(1)} = ${result}`);
            return result;
        }
    }

    takeDamage() {
        if (Date.now() - this.lastHitTime < GAME_CONFIG.game.invulnerabilityTime) {
            return false; // Still invulnerable
        }

        this.health--;
        this.lastHitTime = Date.now();
        this.squashScale = 0.7; // Squash effect
        
        // Screen shake effect
        document.querySelector('.game-container').classList.add('shake');
        setTimeout(() => {
            document.querySelector('.game-container').classList.remove('shake');
        }, 300);

        // Create hit particles
        this.createHitParticles();
        
        return true;
    }

    createHitParticles() {
        createOptimizedParticles(this.position.x, this.position.y, '#ff6b6b', 15);
    }

    isInvulnerable() {
        return Date.now() - this.lastHitTime < GAME_CONFIG.game.invulnerabilityTime;
    }

    draw(ctx) {
        ctx.save();
        
        // Invulnerability flashing effect
        if (this.isInvulnerable()) {
            const flash = Math.sin(Date.now() * 0.02) > 0;
            if (flash) {
                ctx.globalAlpha = 0.5;
            }
        }

        // Draw bot body with squash effect
        ctx.translate(this.position.x, this.position.y);
        ctx.scale(this.squashScale, this.squashScale);
        
        // Main body
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // No facial features - clean bot design

        ctx.restore();

        // Draw achilles heel as an arc on the bot's surface
        const heel = this.getAchillesHeelArc();
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, heel.startAngle, heel.endAngle);
        ctx.strokeStyle = this.isInvulnerable() ? '#ffaa00' : '#00ff00';
        ctx.lineWidth = 6;
        ctx.stroke();
    }
}

// Particle class for effects
class Particle {
    constructor(x, y, color, angle, speed) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
        this.color = color;
        this.life = 1.0;
        this.decay = 0.02;
        this.size = 3 + Math.random() * 4;
    }

    update() {
        this.position = this.position.add(this.velocity);
        this.velocity = this.velocity.multiply(0.98);
        this.life -= this.decay;
        this.size *= 0.99;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Get UI elements
    bot1HealthEl = document.getElementById('bot1-health');
    bot2HealthEl = document.getElementById('bot2-health');
    bot1PointsEl = document.getElementById('bot1-points');
    bot2PointsEl = document.getElementById('bot2-points');
    gameOverEl = document.getElementById('gameOver');
    winnerMessageEl = document.getElementById('winnerMessage');
    restartBtnEl = document.getElementById('restartBtn');
    gameTimerEl = document.getElementById('gameTimer');
    preGameMenuEl = document.getElementById('preGameMenu');
    startGameBtnEl = document.getElementById('startGameBtn');
    bot1TweakIndicatorEl = document.getElementById('bot1-tweak-indicator');
    bot2TweakIndicatorEl = document.getElementById('bot2-tweak-indicator');
    
    // Event listeners
    restartBtnEl.addEventListener('click', showPreGameMenu);
    startGameBtnEl.addEventListener('click', handleStartGame);
    
    // Generate arena vertices (octagon)
    generateArenaVertices();
    
    // Show pre-game menu initially
    showPreGameMenu();
}

function showPreGameMenu() {
    gameState.running = false;
    gameState.gameOver = false;
    preGameMenuEl.style.display = 'block';
    gameOverEl.style.display = 'none';
    
    // Hide game elements when showing pre-game menu
    document.querySelector('.score-board').style.display = 'none';
    document.querySelector('#gameCanvas').style.display = 'none';
    
    // Reset timer display
    gameTimerEl.textContent = '00:00';
    
    // Clear any existing game state
    bots = [];
    particles = [];
}

function handleStartGame() {
    // Get selected tweaks
    const bot1Tweak = document.querySelector('input[name="bot1-tweak"]:checked').value;
    const bot2Tweak = document.querySelector('input[name="bot2-tweak"]:checked').value;
    
    gameState.tweaks.bot1 = bot1Tweak;
    gameState.tweaks.bot2 = bot2Tweak;
    
    // Hide pre-game menu and show game elements
    preGameMenuEl.style.display = 'none';
    document.querySelector('.score-board').style.display = 'flex';
    document.querySelector('#gameCanvas').style.display = 'block';
    
    // Update tweak indicators
    updateTweakIndicators();
    
    // Start the game
    startGame();
}

function updateTweakIndicators() {
    const tweakNames = {
        'none': '',
        'smaller': 'SMALL',
        'regeneration': 'REGEN',
        'extra-life': 'EXTRA'
    };
    
    bot1TweakIndicatorEl.textContent = tweakNames[gameState.tweaks.bot1];
    bot2TweakIndicatorEl.textContent = tweakNames[gameState.tweaks.bot2];
}

function generateArenaVertices() {
    arenaVertices = [];
    const sides = GAME_CONFIG.arena.sides;
    const radius = GAME_CONFIG.arena.radius;
    const centerX = GAME_CONFIG.arena.centerX;
    const centerY = GAME_CONFIG.arena.centerY;
    
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        arenaVertices.push(new Vector2(
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius
        ));
    }
}

function startGame() {
    gameState.running = true;
    gameState.gameOver = false;
    gameState.winner = null;
    gameState.startTime = Date.now();
    gameState.elapsedTime = 0;
    
    // Hide game over screen
    gameOverEl.style.display = 'none';
    
    // Initialize bots with their selected tweaks
    bots = [
        new Bot(300, 250, '#3498db', 0, gameState.tweaks.bot1),
        new Bot(500, 350, '#e74c3c', 1, gameState.tweaks.bot2)
    ];
    
    // Initialize regeneration timers
    bots.forEach(bot => {
        if (bot.tweak === 'regeneration') {
            bot.lastRegenTime = Date.now();
        }
    });
    
    // Debug: Log heel positions for each bot
    bots.forEach((bot, index) => {
        const heel = bot.getAchillesHeelArc();
        const centerDegrees = (heel.centerAngle * 180 / Math.PI) % 360;
        const startDegrees = (heel.startAngle * 180 / Math.PI) % 360;
        const endDegrees = (heel.endAngle * 180 / Math.PI) % 360;
        console.log(`Bot ${index} (${bot.color}) - Heel Center: ${centerDegrees.toFixed(1)}°, Arc: ${startDegrees.toFixed(1)}° to ${endDegrees.toFixed(1)}°`);
    });
    
    // Clear particles
    particles = [];
    
    // Update UI
    updateUI();
    
    // Start game loop
    gameLoop();
}

function gameLoop() {
    if (!gameState.running) return;
    
    update();
    draw();
    
    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState.gameOver) return;
    
    const deltaTime = 16; // Assume 60fps
    
    // Update bots
    bots.forEach(bot => bot.update(deltaTime));
    
    // Check regeneration for bots with regeneration tweak
    bots.forEach(bot => {
        if (bot.tweak === 'regeneration' && bot.health < bot.maxHealth) {
            const timeSinceLastRegen = Date.now() - bot.lastRegenTime;
            if (timeSinceLastRegen >= 60000) { // 60 seconds = 1 minute
                bot.health = Math.min(bot.health + 1, bot.maxHealth);
                bot.lastRegenTime = Date.now();
                
                // Create regeneration particles
                createOptimizedParticles(bot.position.x, bot.position.y, '#00ff88', 10);
                
                console.log(`Bot ${bot.id} regenerated! Health: ${bot.health}`);
            }
        }
    });
    
    // Check wall collisions
    bots.forEach(bot => checkWallCollision(bot));
    
    // Check bot-to-bot collisions
    checkBotCollisions();
    
    // Update particles
    particles.forEach(particle => particle.update());
    particles = particles.filter(particle => !particle.isDead());
    
    // Check win condition
    checkWinCondition();
    
    // Update UI
    updateUI();
}

function checkWallCollision(bot) {
    const vertices = arenaVertices;
    const botPos = bot.position;
    const radius = bot.radius;
    
    for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];
        
        // Calculate distance from bot to line segment
        const line = v2.subtract(v1);
        const toBotStart = botPos.subtract(v1);
        const projection = Math.max(0, Math.min(1, toBotStart.dot(line) / line.dot(line)));
        const closest = v1.add(line.multiply(projection));
        const distance = botPos.subtract(closest).magnitude();
        
        if (distance < radius) {
            // Collision detected - bounce bot
            const normal = botPos.subtract(closest).normalize();
            const penetration = radius - distance;
            
            // Move bot out of wall
            bot.position = bot.position.add(normal.multiply(penetration));
            
            // Reflect velocity without reducing speed
            const dot = bot.velocity.dot(normal);
            bot.velocity = bot.velocity.subtract(normal.multiply(2 * dot));
            
            // Create bounce particles
            for (let j = 0; j < 5; j++) {
                particles.push(new Particle(
                    closest.x,
                    closest.y,
                    '#ffffff',
                    Math.random() * Math.PI * 2,
                    1 + Math.random() * 2
                ));
            }
        }
    }
}

function checkBotCollisions() {
    const bot1 = bots[0];
    const bot2 = bots[1];
    
    const distance = bot1.position.subtract(bot2.position).magnitude();
    const minDistance = bot1.radius + bot2.radius;
    
    if (distance < minDistance) {
        // Simple immediate bounce - bots reverse away from each other
        const normal = bot2.position.subtract(bot1.position).normalize();
        const penetration = minDistance - distance;
        
        // Separate bots completely
        bot1.position = bot1.position.subtract(normal.multiply(penetration));
        bot2.position = bot2.position.add(normal.multiply(penetration));
        
        // Simple velocity swap - they bounce off each other
        const speed1 = bot1.velocity.magnitude();
        const speed2 = bot2.velocity.magnitude();
        
        bot1.velocity = normal.multiply(-speed1);
        bot2.velocity = normal.multiply(speed2);
        
        // Squash effect
        bot1.squashScale = 0.8;
        bot2.squashScale = 0.8;
        
        // Check achilles heel hits for both bots simultaneously
        console.log('=== COLLISION DETECTED ===');
        checkAchillesHeelHit(bot1, bot2, 'Bot1->Bot2');
        checkAchillesHeelHit(bot2, bot1, 'Bot2->Bot1');
        console.log('=========================');
    }
}

function checkAchillesHeelHit(checkingBot, targetBot, label) {
    // Get collision angle for debugging
    const vectorToChecker = checkingBot.position.subtract(targetBot.position);
    const angleToChecker = Math.atan2(vectorToChecker.y, vectorToChecker.x);
    const collisionAngleDegrees = ((angleToChecker * 180 / Math.PI) + 360) % 360;
    
    const heel = targetBot.getAchillesHeelArc();
    const heelCenterDegrees = ((heel.centerAngle * 180 / Math.PI) + 360) % 360;
    const heelStartDegrees = ((heel.startAngle * 180 / Math.PI) + 360) % 360;
    const heelEndDegrees = ((heel.endAngle * 180 / Math.PI) + 360) % 360;
    
    console.log(`${label}: Bot${checkingBot.id} vs Bot${targetBot.id} at ${collisionAngleDegrees.toFixed(1)}°`);
    console.log(`  Bot${targetBot.id} heel: ${heelStartDegrees.toFixed(1)}° to ${heelEndDegrees.toFixed(1)}°`);
    
    // Check if the checking bot's position is hitting the target bot's achilles heel arc
    // Pass the checking bot's position for the hit detection
    if (targetBot.isPointInAchillesHeel(checkingBot.position, checkingBot.radius)) {
        console.log(`  🎯 HEEL HIT! Bot${checkingBot.id} hit Bot${targetBot.id}'s heel!`);
        if (targetBot.takeDamage()) {
            console.log(`  ✅ Damage applied! Bot${targetBot.id} health: ${targetBot.health}`);
            // No knockback - let bots maintain their speed
        } else {
            console.log(`  ❌ Damage blocked - Bot${targetBot.id} still invulnerable`);
        }
    } else {
        console.log(`  ❌ No heel hit - collision angle ${collisionAngleDegrees.toFixed(1)}° not in heel range`);
    }
}

function checkWinCondition() {
    const bot1Dead = bots[0].health <= 0;
    const bot2Dead = bots[1].health <= 0;
    
    if (bot1Dead && bot2Dead) {
        // Both bots died simultaneously - it's a draw
        endGame(null);
    } else if (bot1Dead) {
        // Bot 1 died, Bot 2 wins
        endGame(1);
    } else if (bot2Dead) {
        // Bot 2 died, Bot 1 wins
        endGame(0);
    }
}

function endGame(winnerId) {
    gameState.gameOver = true;
    gameState.winner = winnerId;
    gameState.running = false;
    
    if (winnerId === null) {
        // It's a draw
        winnerMessageEl.textContent = `It's a Draw!`;
    } else {
        // Someone won
        const winnerColor = winnerId === 0 ? 'Blue' : 'Red';
        winnerMessageEl.textContent = `${winnerColor} Bot Wins!`;
    }
    
    gameOverEl.style.display = 'block';
}

function updateUI() {
    // Update timer
    if (gameState.startTime) {
        gameState.elapsedTime = Date.now() - gameState.startTime;
        const formattedTime = formatTime(gameState.elapsedTime);
        gameTimerEl.textContent = formattedTime;
    }
    
    // Update health bars (use each bot's max health for proper percentage)
    const bot1HealthPercent = (bots[0].health / bots[0].maxHealth) * 100;
    const bot2HealthPercent = (bots[1].health / bots[1].maxHealth) * 100;
    
    bot1HealthEl.style.width = `${bot1HealthPercent}%`;
    bot2HealthEl.style.width = `${bot2HealthPercent}%`;
    
    // Update point displays
    bot1PointsEl.textContent = bots[0].health;
    bot2PointsEl.textContent = bots[1].health;
    
    // Update health bar colors based on health
    if (bots[0].health <= 2) {
        bot1HealthEl.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
    }
    if (bots[1].health <= 2) {
        bot2HealthEl.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
    }
}

// Format time in MM:SS format
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw arena
    drawArena();
    
    // Draw particles
    particles.forEach(particle => particle.draw(ctx));
    
    // Draw bots
    bots.forEach(bot => bot.draw(ctx));
}

function drawArena() {
    // Draw arena walls
    ctx.beginPath();
    ctx.moveTo(arenaVertices[0].x, arenaVertices[0].y);
    for (let i = 1; i < arenaVertices.length; i++) {
        ctx.lineTo(arenaVertices[i].x, arenaVertices[i].y);
    }
    ctx.closePath();
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 6;
    ctx.stroke();
    
    // Draw arena glow
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

// Mobile detection and setup
function detectMobile() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 600;
    
    GAME_CONFIG.mobile.isMobile = isMobile || isSmallScreen;
    
    if (GAME_CONFIG.mobile.isMobile) {
        // Enable reduced particles for better performance
        GAME_CONFIG.mobile.reducedParticles = true;
        
        // Set up responsive canvas scaling
        setupResponsiveCanvas();
        
        // Handle orientation changes
        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleResize);
        
        // Handle orientation hint
        handleOrientationHint();
    }
}

function setupResponsiveCanvas() {
    const canvas = document.getElementById('gameCanvas');
    const scoreBoard = document.querySelector('.score-board');
    
    function updateCanvasSize() {
        // Get the actual width of the score board to match it exactly
        const scoreBoardWidth = scoreBoard ? scoreBoard.offsetWidth : window.innerWidth - 20;
        
        const aspectRatio = GAME_CONFIG.canvas.baseHeight / GAME_CONFIG.canvas.baseWidth;
        
        // Make canvas match score board width exactly
        let newWidth = scoreBoardWidth;
        let newHeight = newWidth * aspectRatio;
        
        // Ensure minimum playable size
        const minWidth = 300;
        if (newWidth < minWidth) {
            newWidth = minWidth;
            newHeight = newWidth * aspectRatio;
        }
        
        // Calculate scale factor for mobile optimizations
        GAME_CONFIG.mobile.scaleFactor = newWidth / GAME_CONFIG.canvas.baseWidth;
        
        // Update canvas dimensions to match score board width
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
        
        // Keep internal canvas dimensions consistent
        GAME_CONFIG.canvas.width = GAME_CONFIG.canvas.baseWidth;
        GAME_CONFIG.canvas.height = GAME_CONFIG.canvas.baseHeight;
        GAME_CONFIG.arena.centerX = GAME_CONFIG.canvas.baseWidth / 2;
        GAME_CONFIG.arena.centerY = GAME_CONFIG.canvas.baseHeight / 2;
    }
    
    updateCanvasSize();
}

function handleOrientationChange() {
    setTimeout(() => {
        handleOrientationHint();
        if (GAME_CONFIG.mobile.isMobile) {
            setupResponsiveCanvas();
        }
    }, 100);
}

function handleResize() {
    if (GAME_CONFIG.mobile.isMobile) {
        setupResponsiveCanvas();
    }
}

function handleOrientationHint() {
    const orientationHint = document.getElementById('orientationHint');
    const isPortrait = window.innerHeight > window.innerWidth;
    const isSmallScreen = window.innerWidth <= 768;
    
    if (isPortrait && isSmallScreen) {
        orientationHint.style.display = 'flex';
    } else {
        orientationHint.style.display = 'none';
    }
}

// Override particle creation for mobile performance
function createOptimizedParticles(x, y, color, count, angle = null, speed = null) {
    const particleCount = GAME_CONFIG.mobile.reducedParticles ? Math.ceil(count / 2) : count;
    
    for (let i = 0; i < particleCount; i++) {
        const particleAngle = angle !== null ? angle : Math.random() * Math.PI * 2;
        const particleSpeed = speed !== null ? speed : 2 + Math.random() * 3;
        
        particles.push(new Particle(x, y, color, particleAngle, particleSpeed));
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    detectMobile();
    init();
});
