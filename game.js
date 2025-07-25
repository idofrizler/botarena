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

// Tweak Plugin System
class TweakPlugin {
    constructor(id, name, description) {
        this.id = id;
        this.name = name;
        this.description = description;
    }
    
    // Lifecycle hooks - to be overridden by specific tweaks
    onBotInit(bot) {} // Called when bot is created
    onBotUpdate(bot, deltaTime) {} // Called each frame
    onBotCollision(bot, otherBot) {} // Called on collision
    onBotDamage(bot) {} // Called when bot takes damage
    onBotDraw(bot, ctx) {} // Called during bot draw
}

// Built-in Tweak Implementations
class NoTweak extends TweakPlugin {
    constructor() {
        super('none', 'No Tweak', 'Standard gameplay');
    }
}

class SmallerSizeTweak extends TweakPlugin {
    constructor() {
        super('smaller', 'Smaller Size', '30% smaller bot, harder to hit');
    }
    
    onBotInit(bot) {
        bot.radius = GAME_CONFIG.bots.radius * 0.7;
    }
}

class ExtraLifeTweak extends TweakPlugin {
    constructor() {
        super('extra-life', 'Extra Life', 'Start with 6 lives instead of 5');
    }
    
    onBotInit(bot) {
        bot.health = 6;
        bot.maxHealth = 6;
    }
}

class RegenerationTweak extends TweakPlugin {
    constructor() {
        super('regeneration', 'Regeneration', 'Gain 1 life every minute');
    }
    
    onBotInit(bot) {
        bot.lastRegenTime = Date.now();
    }
    
    onBotUpdate(bot, deltaTime) {
        if (bot.health < bot.maxHealth) {
            const timeSinceLastRegen = Date.now() - bot.lastRegenTime;
            if (timeSinceLastRegen >= 60000) { 
                bot.health = Math.min(bot.health + 1, bot.maxHealth);
                bot.lastRegenTime = Date.now();
                createOptimizedParticles(bot.position.x, bot.position.y, '#00ff88', 10);
                console.log(`Bot ${bot.id} regenerated! Health: ${bot.health}`);
            }
        }
    }
}

// Tweak Registry
class TweakRegistry {
    constructor() {
        this.tweaks = new Map();
        this.registerBuiltInTweaks();
    }
    
    registerBuiltInTweaks() {
        this.register(new NoTweak());
        this.register(new SmallerSizeTweak());
        this.register(new ExtraLifeTweak());
        this.register(new RegenerationTweak());
    }
    
    register(tweak) {
        this.tweaks.set(tweak.id, tweak);
    }
    
    get(id) {
        return this.tweaks.get(id) || this.tweaks.get('none');
    }
    
    getAll() {
        return Array.from(this.tweaks.values());
    }
}

// Global tweak registry instance
const tweakRegistry = new TweakRegistry();

// AI Tweak Service
class AITweakService {
    constructor() {
        // Azure AI Foundry integration
        this.isDemo = false; // Now using real Azure AI!
        this.apiEndpoint = '/api/generate-tweak';
    }
    
    async generateTweak(description) {
        if (this.isDemo) {
            return this.mockAIGeneration(description);
        } else {
            return this.callAzureAI(description);
        }
    }
    
    async mockAIGeneration(description) {
        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock AI responses based on keywords in description
        const desc = description.toLowerCase();
        
        if (desc.includes('fast') || desc.includes('speed')) {
            return this.generateSpeedTweak(description);
        } else if (desc.includes('big') || desc.includes('large') || desc.includes('grow')) {
            return this.generateSizeTweak(description);
        } else if (desc.includes('invisible') || desc.includes('ghost')) {
            return this.generateInvisibilityTweak(description);
        } else if (desc.includes('trail') || desc.includes('particle')) {
            return this.generateTrailTweak(description);
        } else if (desc.includes('bounce') || desc.includes('elastic')) {
            return this.generateBounceTweak(description);
        } else {
            // Default creative tweak
            return this.generateDefaultTweak(description);
        }
    }
    
    generateSpeedTweak(description) {
        return {
            name: 'AI Speed Boost',
            description: 'Generated: Speed increases when health is low',
            code: `
class AISpeedTweak extends TweakPlugin {
    constructor() {
        super('ai-speed-${Date.now()}', 'AI Speed Boost', 'Speed increases when health is low');
    }
    
    onBotUpdate(bot, deltaTime) {
        const healthRatio = bot.health / bot.maxHealth;
        if (healthRatio < 0.6) {
            const speedMultiplier = 1 + (1 - healthRatio) * 0.8;
            const currentSpeed = bot.velocity.magnitude();
            if (currentSpeed > 0.1) {
                // Apply speed boost by scaling velocity
                const targetSpeed = Math.min(GAME_CONFIG.bots.maxSpeed * speedMultiplier, GAME_CONFIG.bots.maxSpeed * 1.8);
                bot.velocity = bot.velocity.normalize().multiply(targetSpeed);
            }
        }
    }
}
return new AISpeedTweak();`
        };
    }
    
    generateSizeTweak(description) {
        return {
            name: 'AI Size Morph',
            description: 'Generated: Bot grows bigger when hitting opponents',
            code: `
class AISizeTweak extends TweakPlugin {
    constructor() {
        super('ai-size-${Date.now()}', 'AI Size Morph', 'Bot grows bigger when hitting opponents');
    }
    
    onBotInit(bot) {
        bot.originalRadius = bot.radius;
        bot.growthLevel = 0;
    }
    
    onBotCollision(bot, otherBot) {
        if (bot.growthLevel < 3) {
            bot.growthLevel++;
            bot.radius = bot.originalRadius * (1 + bot.growthLevel * 0.15);
        }
    }
}
return new AISizeTweak();`
        };
    }
    
    generateInvisibilityTweak(description) {
        return {
            name: 'AI Stealth Mode',
            description: 'Generated: Becomes invisible and unhittable for 10 seconds after taking damage',
            code: `
class AIStealthTweak extends TweakPlugin {
    constructor() {
        super('ai-stealth-${Date.now()}', 'AI Stealth Mode', 'Becomes invisible and unhittable for 10 seconds after taking damage');
    }
    
    onBotDamage(bot) {
        bot.stealthMode = true;
        bot.stealthEndTime = Date.now() + 10000; // 10 seconds
        console.log('Bot entered stealth mode for 10 seconds');
    }
    
    onBotUpdate(bot, deltaTime) {
        if (bot.stealthMode && Date.now() > bot.stealthEndTime) {
            bot.stealthMode = false;
            console.log('Bot exited stealth mode');
        }
    }
    
    onBotDraw(bot, ctx) {
        if (bot.stealthMode) {
            ctx.globalAlpha *= 0.15; // Make bot very transparent (almost invisible)
        }
    }
    
    // Custom method to check if bot can be hit
    isInvisible(bot) {
        return bot.stealthMode;
    }
}
return new AIStealthTweak();`
        };
    }
    
    generateTrailTweak(description) {
        return {
            name: 'AI Particle Trail',
            description: 'Generated: Leaves a colorful particle trail',
            code: `
class AITrailTweak extends TweakPlugin {
    constructor() {
        super('ai-trail-${Date.now()}', 'AI Particle Trail', 'Leaves a colorful particle trail');
    }
    
    onBotUpdate(bot, deltaTime) {
        if (Math.random() < 0.3) {
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            createOptimizedParticles(bot.position.x, bot.position.y, color, 2);
        }
    }
}
return new AITrailTweak();`
        };
    }
    
    generateBounceTweak(description) {
        return {
            name: 'AI Super Bounce',
            description: 'Generated: Bounces with extra force off walls',
            code: `
class AIBounceTweak extends TweakPlugin {
    constructor() {
        super('ai-bounce-${Date.now()}', 'AI Super Bounce', 'Bounces with extra force off walls');
    }
    
    onBotUpdate(bot, deltaTime) {
        // Check if bot just bounced (velocity changed significantly)
        if (bot.lastVelocity) {
            const velocityChange = bot.velocity.subtract(bot.lastVelocity).magnitude();
            if (velocityChange > 5) {
                // Apply bounce boost
                const boostFactor = 1.3;
                bot.velocity = bot.velocity.multiply(boostFactor);
            }
        }
        bot.lastVelocity = new Vector2(bot.velocity.x, bot.velocity.y);
    }
}
return new AIBounceTweak();`
        };
    }
    
    generateDefaultTweak(description) {
        return {
            name: 'AI Color Shift',
            description: 'Generated: Changes color based on health',
            code: `
class AIColorTweak extends TweakPlugin {
    constructor() {
        super('ai-color-${Date.now()}', 'AI Color Shift', 'Changes color based on health');
    }
    
    onBotInit(bot) {
        bot.originalColor = bot.color;
    }
    
    onBotUpdate(bot, deltaTime) {
        const healthRatio = bot.health / bot.maxHealth;
        if (healthRatio < 0.3) {
            bot.color = '#ff4757'; // Red when very low health
        } else if (healthRatio < 0.6) {
            bot.color = '#ffa502'; // Orange when medium health
        } else {
            bot.color = bot.originalColor; // Original color when healthy
        }
    }
}
return new AIColorTweak();`
        };
    }
    
    async callAzureAI(description) {
        const prompt = this.buildPrompt(description);
        
        try {
            const response = await fetch('/api/generate-tweak', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt })
            });
            
            const data = await response.json();
            return {
                name: data.name,
                description: data.description,
                code: data.code,
                validation: data.validation // Include validation results
            };
        } catch (error) {
            console.error('AI service error:', error);
            throw new Error('Failed to generate tweak. Please try again.');
        }
    }
    
    buildPrompt(description) {
        return `
Generate a JavaScript class that extends TweakPlugin for a bumper bot game.
The user wants: "${description}"

Available bot properties:
- position (Vector2): bot's x,y position
- velocity (Vector2): bot's movement vector
- health, maxHealth: current and maximum health
- radius: bot size
- color: bot color (hex string)
- heelArcAngle: achilles heel arc size in radians (default: π*0.6, safe range: π/8 to π)
- lastHitTime: timestamp of last damage taken

Available hooks:
- onBotInit(bot): Called when bot is created
- onBotUpdate(bot, deltaTime): Called each frame (60fps)
- onBotCollision(bot, otherBot): Called when bots collide
- onBotDamage(bot): Called when bot takes damage
- onBotDraw(bot, ctx): Called during rendering

Available utilities:
- Vector2 class with add, subtract, multiply, normalize methods
- createOptimizedParticles(x, y, color, count) for effects
- GAME_CONFIG constants for game settings

Return only a JavaScript class that extends TweakPlugin with a unique id.
Make the tweak fun, balanced, and visually interesting.
End with: return new YourTweakClass();
        `;
    }
}

// Global AI service instance
const aiTweakService = new AITweakService();

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
    constructor(x, y, color, id, tweakId = 'none') {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(
            (Math.random() - 0.5) * GAME_CONFIG.bots.speed,
            (Math.random() - 0.5) * GAME_CONFIG.bots.speed
        );
        this.color = color;
        this.id = id;
        this.tweakId = tweakId;
        
        // Initialize default properties
        this.health = GAME_CONFIG.game.maxHealth;
        this.maxHealth = this.health;
        this.radius = GAME_CONFIG.bots.radius;
        this.heelArcAngle = GAME_CONFIG.bots.heelArcAngle; // Per-bot heel arc angle
        
        this.angle = Math.random() * Math.PI * 2;
        this.bodyAngle = Math.random() * Math.PI * 2; // Fixed body orientation
        this.lastHitTime = 0;
        this.squashScale = 1;
        this.targetAngle = this.angle;
        this.aiTimer = 0;
        
        // Get and store the tweak plugin
        this.tweakPlugin = tweakRegistry.get(tweakId);
        
        // Apply tweak initialization
        this.tweakPlugin.onBotInit(this);
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
        
        // Call tweak update hook
        this.tweakPlugin.onBotUpdate(this, deltaTime);
    }

    getAchillesHeelArc() {
        const heelAngle = this.bodyAngle + Math.PI; // Fixed position on bot's body
        const halfArc = this.heelArcAngle / 2;
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
        
        // Call tweak damage hook
        this.tweakPlugin.onBotDamage(this);
        
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
        let baseAlpha = 1.0;
        if (this.isInvulnerable()) {
            const flash = Math.sin(Date.now() * 0.02) > 0;
            if (flash) {
                baseAlpha = 0.5;
            }
        }
        
        // Call tweak draw hook BEFORE drawing (for transparency effects)
        this.tweakPlugin.onBotDraw(this, ctx);
        
        // Apply any alpha modifications from tweaks
        ctx.globalAlpha *= baseAlpha;

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

        // Draw achilles heel as an arc on the bot's surface (with same alpha)
        ctx.save();
        this.tweakPlugin.onBotDraw(this, ctx);
        ctx.globalAlpha *= baseAlpha;
        
        const heel = this.getAchillesHeelArc();
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, heel.startAngle, heel.endAngle);
        ctx.strokeStyle = this.isInvulnerable() ? '#ffaa00' : '#00ff00';
        ctx.lineWidth = 6;
        ctx.stroke();
        
        ctx.restore();
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
    startGameBtnEl.addEventListener('click', handleStartGameWithAI);
    
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
    
    // Update bots (plugins handle their own logic via onBotUpdate)
    bots.forEach(bot => bot.update(deltaTime));
    
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
        
        // Call tweak collision hooks
        bot1.tweakPlugin.onBotCollision(bot1, bot2);
        bot2.tweakPlugin.onBotCollision(bot2, bot1);
        
        // Check achilles heel hits for both bots simultaneously
        console.log('=== COLLISION DETECTED ===');
        checkAchillesHeelHit(bot1, bot2, 'Bot1->Bot2');
        checkAchillesHeelHit(bot2, bot1, 'Bot2->Bot1');
        console.log('=========================');
    }
}

function checkAchillesHeelHit(checkingBot, targetBot, label) {
    // Check if target bot is in stealth mode (invisible/unhittable)
    if (targetBot.stealthMode) {
        console.log(`${label}: Bot${targetBot.id} is in stealth mode - cannot be hit!`);
        return;
    }
    
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

// AI Tweak Interface Handlers
let aiTweaks = {
    bot1: null,
    bot2: null
};

function initAIInterface() {
    // Show/hide AI overlays when AI custom tweak is selected
    document.addEventListener('change', (e) => {
        if (e.target.name === 'bot1-tweak' || e.target.name === 'bot2-tweak') {
            handleTweakSelection(e);
        }
    });
    
    // Bot 1 AI overlay handlers
    const generateBot1Btn = document.getElementById('generateBot1Btn');
    generateBot1Btn.addEventListener('click', () => generateBotTweak('bot1'));
    
    // Bot 2 AI overlay handlers
    const generateBot2Btn = document.getElementById('generateBot2Btn');
    generateBot2Btn.addEventListener('click', () => generateBotTweak('bot2'));
}

function handleTweakSelection(e) {
    const botNumber = e.target.name === 'bot1-tweak' ? 'bot1' : 'bot2';
    const selectedValue = e.target.value;
    
    if (selectedValue === 'ai-custom') {
        // Show overlay for this bot
        showBotAIOverlay(botNumber);
    } else {
        // Clear any existing AI tweak for this bot
        aiTweaks[botNumber] = null;
    }
}

function showBotAIOverlay(botNumber) {
    const overlayId = `${botNumber}AiOverlay`;
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.style.display = 'flex';
        
        // Clear any previous status
        const statusElement = document.getElementById(`${botNumber}AiStatus`);
        if (statusElement) {
            statusElement.textContent = '';
        }
        
        // Focus on input
        const inputElement = document.getElementById(`${botNumber}AiInput`);
        if (inputElement) {
            setTimeout(() => inputElement.focus(), 100);
        }
    }
}

function closeBotAIOverlay(botNumber) {
    const overlayId = `${botNumber}AiOverlay`;
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.style.display = 'none';
        
        // If no tweak was generated, revert selection to "none"
        if (!aiTweaks[botNumber]) {
            const radioButton = document.querySelector(`input[name="${botNumber}-tweak"][value="none"]`);
            if (radioButton) {
                radioButton.checked = true;
            }
        }
    }
}

async function generateBotTweak(botNumber) {
    const inputElement = document.getElementById(`${botNumber}AiInput`);
    const generateBtn = document.getElementById(`generateBot${botNumber === 'bot1' ? '1' : '2'}Btn`);
    const statusElement = document.getElementById(`${botNumber}AiStatus`);
    
    const description = inputElement.value.trim();
    
    if (!description) {
        statusElement.textContent = 'Please describe your tweak first!';
        statusElement.style.color = '#ff6b6b';
        return;
    }
    
    // Disable button and show loading
    generateBtn.disabled = true;
    generateBtn.querySelector('.btn-text').style.display = 'none';
    generateBtn.querySelector('.btn-loading').style.display = 'inline';
    statusElement.textContent = `AI is creating your custom tweak...`;
    statusElement.style.color = '#00ff88';
    
    try {
        const tweakData = await aiTweakService.generateTweak(description);
        
        // Check validation results
        if (tweakData.validation) {
            displayValidationFeedback(botNumber, tweakData.validation, description);
            
            // Always show validation dialog when we have validation data
            const hasValidation = tweakData.validation;
            
            if (hasValidation) {
                const shouldProceed = await showValidationDialog(botNumber, tweakData.validation, tweakData);
                if (!shouldProceed) {
                    // User chose to regenerate
                    generateBtn.disabled = false;
                    generateBtn.querySelector('.btn-text').style.display = 'inline';
                    generateBtn.querySelector('.btn-loading').style.display = 'none';
                    statusElement.textContent = 'Try describing your tweak differently for better results.';
                    statusElement.style.color = '#ffa500';
                    return;
                }
            }
        }
        
        // Execute the generated code to create the tweak plugin
        const tweakPlugin = executeAITweakCode(tweakData.code);
        
        // Register the new tweak
        tweakRegistry.register(tweakPlugin);
        
        // Store the tweak for the appropriate bot
        aiTweaks[botNumber] = tweakPlugin;
        
        // Update status and clear input
        statusElement.textContent = `✅ Tweak Generated: ${tweakPlugin.name}`;
        statusElement.style.color = '#00ff88';
        inputElement.value = '';
        
        console.log(`AI Tweak Generated for ${botNumber}:`, tweakPlugin);
        console.log(`Validation Results:`, tweakData.validation);
        
        // Close overlay after success
        setTimeout(() => {
            closeBotAIOverlay(botNumber);
        }, 2000);
        
    } catch (error) {
        console.error('Failed to generate AI tweak:', error);
        statusElement.textContent = '❌ Failed to generate tweak. Please try again.';
        statusElement.style.color = '#ff6b6b';
    } finally {
        // Re-enable button
        generateBtn.disabled = false;
        generateBtn.querySelector('.btn-text').style.display = 'inline';
        generateBtn.querySelector('.btn-loading').style.display = 'none';
    }
}

function displayValidationFeedback(botNumber, validation, userRequest) {
    console.log(`🔍 Simplified validation feedback for ${botNumber}:`);
    console.log(`🎯 User request: ${userRequest}`);
    console.log(`💻 Generated code ready for review`);
    console.log(`🔍 Full validation object:`, JSON.stringify(validation, null, 2));
    
    // Debug AI critique availability
    if (validation.aiCritique) {
        console.log(`🧠 AI Critique available:`, validation.aiCritique);
        console.log(`🧠 AI Critique type:`, typeof validation.aiCritique);
        console.log(`🧠 AI Critique keys:`, Object.keys(validation.aiCritique));
        if (validation.aiCritique.error) {
            console.log(`❌ AI Critique error:`, validation.aiCritique.error);
        } else if (validation.aiCritique.rawText) {
            console.log(`✅ AI Critique rawText found:`, validation.aiCritique.rawText);
        } else {
            console.log(`⚠️  AI Critique object exists but no rawText or error`);
        }
    } else {
        console.log(`❌ No AI critique found in validation`);
    }
}

async function showValidationDialog(botNumber, validation, tweakData) {
    return new Promise((resolve) => {
        // Create custom dialog focused on showing code and AI critique
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #00ff88;
            border-radius: 10px;
            padding: 25px;
            color: white;
            font-family: 'Courier New', monospace;
            max-width: 700px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10000;
            text-align: center;
        `;
        
        // Generate compilation error section if present
        let compilationErrorSection = '';
        if (validation.compilationError) {
            compilationErrorSection = `
                <div style="text-align: left; background: rgba(20,0,0,0.4); padding: 15px; border-radius: 5px; margin-bottom: 15px; border: 1px solid #e74c3c;">
                    <strong style="color: #e74c3c;">⚠️ Code Compilation Error:</strong><br><br>
                    <div style="color: #ff6b6b; font-family: monospace; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 3px;">
                        ${validation.compilationError}
                    </div>
                    <div style="color: #ffcc88; margin-top: 10px; font-size: 12px;">
                        This code has syntax errors and will not run. Please try again with a different description.
                    </div>
                </div>
            `;
        }

        // Generate AI critique section
        let aiCritiqueSection = '';
        if (validation.aiCritique && validation.aiCritique.rawText) {
            aiCritiqueSection = `
                <div style="text-align: left; background: rgba(0,0,20,0.4); padding: 15px; border-radius: 5px; margin-bottom: 15px; border: 1px solid #3498db;">
                    <strong style="color: #3498db;">🧠 AI Code Review:</strong><br><br>
                    <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 4px; font-family: monospace; line-height: 1.6; white-space: pre-wrap; color: #e6e6e6; max-height: 300px; overflow-y: auto;">
${validation.aiCritique.rawText}
                    </div>
                </div>
            `;
        } else if (validation.aiCritique && validation.aiCritique.error) {
            aiCritiqueSection = `
                <div style="text-align: left; background: rgba(20,0,0,0.4); padding: 15px; border-radius: 5px; margin-bottom: 15px; border: 1px solid #e74c3c;">
                    <strong style="color: #e74c3c;">🧠 AI Code Review:</strong><br><br>
                    <div style="color: #ff6b6b;">
                        ❌ AI critique unavailable: ${validation.aiCritique.error}
                    </div>
                </div>
            `;
        } else {
            aiCritiqueSection = `
                <div style="text-align: left; background: rgba(20,20,0,0.4); padding: 15px; border-radius: 5px; margin-bottom: 15px; border: 1px solid #ffa500;">
                    <strong style="color: #ffa500;">🧠 AI Code Review:</strong><br><br>
                    <div style="color: #ffcc88;">
                        ⏳ AI critique is loading or unavailable
                    </div>
                </div>
            `;
        }

        // Always show the generated code prominently
        dialog.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #00ff88;">🤖 AI Generated Tweak</h3>
                
                <div style="text-align: left; background: rgba(20,20,20,0.9); padding: 15px; border-radius: 5px; margin-bottom: 15px; border: 1px solid #444;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="color: #00ff88;">📄 Generated Code:</strong>
                        <button id="copyCode" style="padding: 4px 8px; background: #555; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;">📋 Copy</button>
                    </div>
                    <pre style="margin: 0; white-space: pre-wrap; color: #e6e6e6; font-size: 10px; max-height: 250px; overflow-y: auto; background: rgba(40,40,40,0.8); padding: 10px; border-radius: 3px;">${tweakData.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                </div>
                
                ${compilationErrorSection}
                ${aiCritiqueSection}
            </div>
            <div>
                <button id="useAnyway" style="margin: 5px; padding: 10px 15px; background: #00ff88; color: black; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">✅ Use This Tweak</button>
                <button id="tryAgain" style="margin: 5px; padding: 10px 15px; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer;">🔄 Try Again</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Copy functionality
        document.getElementById('copyCode').onclick = () => {
            navigator.clipboard.writeText(tweakData.code);
            document.getElementById('copyCode').textContent = '✅ Copied!';
            setTimeout(() => {
                const btn = document.getElementById('copyCode');
                if (btn) btn.textContent = '📋 Copy';
            }, 2000);
        };
        
        document.getElementById('useAnyway').onclick = () => {
            document.body.removeChild(dialog);
            resolve(true);
        };
        
        document.getElementById('tryAgain').onclick = () => {
            document.body.removeChild(dialog);
            resolve(false);
        };
    });
}

// Make closeBotAIOverlay globally available for onclick handlers
window.closeBotAIOverlay = closeBotAIOverlay;

function executeAITweakCode(code) {
    try {
        // Create a safe execution context
        const func = new Function(
            'TweakPlugin',
            'GAME_CONFIG', 
            'createOptimizedParticles',
            'Vector2',
            'Date',
            'Math',
            'console',
            code
        );
        
        // Execute the code with safe globals
        const tweakPlugin = func(
            TweakPlugin,
            GAME_CONFIG,
            createOptimizedParticles,
            Vector2,
            Date,
            Math,
            console
        );
        
        if (!tweakPlugin || !(tweakPlugin instanceof TweakPlugin)) {
            throw new Error('Generated code did not return a valid TweakPlugin instance');
        }
        
        return tweakPlugin;
        
    } catch (error) {
        console.error('Error executing AI tweak code:', error);
        throw new Error('Invalid tweak code generated. Please try a different description.');
    }
}

// Update the handleStartGame function to handle AI tweaks
function handleStartGameWithAI() {
    // Check if we need to validate AI tweaks first
    const bot1Tweak = document.querySelector('input[name="bot1-tweak"]:checked').value;
    const bot2Tweak = document.querySelector('input[name="bot2-tweak"]:checked').value;
    
    // Check if AI tweaks are needed but not generated
    if (bot1Tweak === 'ai-custom' && !aiTweaks.bot1) {
        const aiStatus = document.getElementById('aiStatus');
        aiStatus.textContent = '❌ Please generate Bot 1 AI tweak first!';
        aiStatus.style.color = '#ff6b6b';
        return;
    }
    
    if (bot2Tweak === 'ai-custom' && !aiTweaks.bot2) {
        const aiStatus = document.getElementById('aiStatus');
        aiStatus.textContent = '❌ Please generate Bot 2 AI tweak first!';
        aiStatus.style.color = '#ff6b6b';
        return;
    }
    
    // Replace ai-custom with the actual AI tweak IDs
    if (bot1Tweak === 'ai-custom') {
        gameState.tweaks.bot1 = aiTweaks.bot1.id;
    } else {
        gameState.tweaks.bot1 = bot1Tweak;
    }
    
    if (bot2Tweak === 'ai-custom') {
        gameState.tweaks.bot2 = aiTweaks.bot2.id;
    } else {
        gameState.tweaks.bot2 = bot2Tweak;
    }
    
    // Hide pre-game menu and show game elements
    preGameMenuEl.style.display = 'none';
    document.querySelector('.score-board').style.display = 'flex';
    document.querySelector('#gameCanvas').style.display = 'block';
    
    // Update tweak indicators
    updateTweakIndicatorsWithAI();
    
    // Start the game
    startGame();
}

function updateTweakIndicatorsWithAI() {
    const tweakNames = {
        'none': '',
        'smaller': 'SMALL',
        'regeneration': 'REGEN',
        'extra-life': 'EXTRA'
    };
    
    // Handle AI tweak display
    const bot1TweakId = gameState.tweaks.bot1;
    const bot2TweakId = gameState.tweaks.bot2;
    
    // Get display name for bot 1
    if (bot1TweakId.startsWith('ai-')) {
        const aiTweak = tweakRegistry.get(bot1TweakId);
        bot1TweakIndicatorEl.textContent = aiTweak ? 'AI' : '';
    } else {
        bot1TweakIndicatorEl.textContent = tweakNames[bot1TweakId] || '';
    }
    
    // Get display name for bot 2
    if (bot2TweakId.startsWith('ai-')) {
        const aiTweak = tweakRegistry.get(bot2TweakId);
        bot2TweakIndicatorEl.textContent = aiTweak ? 'AI' : '';
    } else {
        bot2TweakIndicatorEl.textContent = tweakNames[bot2TweakId] || '';
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    detectMobile();
    init();
    initAIInterface();
});
