const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Azure OpenAI client setup
const { AzureOpenAI } = require('openai');

// Import AI validation system
const { AICodeValidator } = require('./ai-validation.js');

const client = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment: "gpt-4.1",
    apiVersion: "2024-04-01-preview"
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Main route - serve the game
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// AI Tweak Generation Endpoint
app.post('/api/generate-tweak', async (req, res) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            console.log(`[${requestId}] ❌ Missing prompt in request`);
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log(`\n🤖 [${requestId}] =================================`);
        console.log(`🤖 [${requestId}] NEW AI TWEAK GENERATION REQUEST`);
        console.log(`🤖 [${requestId}] =================================`);
        console.log(`📝 [${requestId}] User Prompt: "${prompt}"`);
        console.log(`⏰ [${requestId}] Request Time: ${new Date().toISOString()}`);

        const systemPrompt = `You are a JavaScript game developer creating dynamic tweaks for a 2D bumper bot arena game.

GAME MECHANICS CONTEXT:
- Bots are circular objects that bounce around an octagonal arena
- Each bot has an "achilles heel" - a green arc that rotates around the bot's perimeter
- Players win by hitting the opponent's achilles heel arc (not by visual modifications)
- The achilles heel size can be modified per-bot using bot.heelArcAngle property
- Bots are drawn as simple circles with white borders, no complex shapes
- Built-in tweaks modify: bot.radius, bot.health/maxHealth, regeneration timers, etc.

EXAMPLE BUILT-IN TWEAKS:
- Smaller Size: bot.radius = GAME_CONFIG.bots.radius * 0.7
- Extra Life: bot.health = 6; bot.maxHealth = 6
- Regeneration: Adds lastRegenTime tracking and health restoration

IMPORTANT: You must respond with ONLY valid JavaScript code that returns a TweakPlugin instance. No explanations, no markdown, no backticks.

Available TweakPlugin lifecycle hooks:
- onBotInit(bot): Called when bot is created - set initial properties here
- onBotUpdate(bot, deltaTime): Called each frame (60fps) - ongoing effects here  
- onBotCollision(bot, otherBot): Called when bots collide - collision effects here
- onBotDamage(bot): Called when bot takes damage - damage effects here
- onBotDraw(bot, ctx): Called during rendering - visual effects here (DO NOT redraw the main bot)

Available bot properties:
- position (Vector2): bot's x,y position
- velocity (Vector2): bot's movement vector  
- health, maxHealth: current and maximum health
- radius: bot size (safe to modify)
- color: bot color (safe to modify)
- heelArcAngle: achilles heel arc size in radians (default: π*0.6, safe range: π/8 to π)
- lastHitTime: timestamp of last damage taken
- bodyAngle: rotation angle for achilles heel
- squashScale: animation scale factor

Available utilities:
- Vector2 class with add, subtract, multiply, normalize methods
- createOptimizedParticles(x, y, color, count) for effects
- GAME_CONFIG constants for game settings
- Date, Math, console objects

Rules:
1. Create a class that extends TweakPlugin
2. Constructor must have: super('ai-[type]-\${Date.now()}', 'Name', 'Description')
3. Focus on gameplay mechanics, not visual redesigns
4. DO NOT redraw the main bot circle in onBotDraw
5. DO NOT modify GAME_CONFIG values
6. Make tweaks fun but balanced
7. End with: return new YourTweakClass();
8. NO markdown, NO explanations, ONLY JavaScript code`;

        const messages = [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: prompt
            }
        ];

        console.log(`🔄 [${requestId}] Sending request to Azure OpenAI...`);
        console.log(`📋 [${requestId}] System Prompt Length: ${systemPrompt.length} characters`);
        console.log(`📋 [${requestId}] Messages:`, JSON.stringify(messages, null, 2));

        // Call Azure OpenAI
        const response = await client.chat.completions.create({
            model: "gpt-4.1",
            messages: messages,
            max_completion_tokens: 1000,
            temperature: 0.7,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`✅ [${requestId}] Azure OpenAI Response received in ${duration}ms`);
        console.log(`📊 [${requestId}] Response metadata:`, {
            id: response.id,
            model: response.model,
            usage: response.usage,
            created: response.created
        });

        const generatedCode = response.choices[0].message.content.trim();
        
        console.log(`\n📝 [${requestId}] =================================`);
        console.log(`📝 [${requestId}] AI GENERATED CODE:`);
        console.log(`📝 [${requestId}] =================================`);
        console.log(generatedCode);
        console.log(`📝 [${requestId}] =================================`);
        console.log(`📝 [${requestId}] Generated Code Length: ${generatedCode.length} characters`);
        
        // Validate the generated code against user request
        const validator = new AICodeValidator();
        const validation = validator.validateCode(prompt, generatedCode);
        
        console.log(`\n🔍 [${requestId}] =================================`);
        console.log(`🔍 [${requestId}] CODE VALIDATION ANALYSIS`);
        console.log(`🔍 [${requestId}] =================================`);
        console.log(`📊 [${requestId}] Validation Score: ${(validation.score * 100).toFixed(1)}%`);
        console.log(`✅ [${requestId}] Code Alignment: ${validation.isValid ? 'VALID' : 'NEEDS REVIEW'}`);
        console.log(`🎯 [${requestId}] User Intents: ${validation.userIntent.intents.map(i => i.type).join(', ')}`);
        console.log(`⚙️ [${requestId}] Code Features: ${validation.codeFeatures.map(f => f.type).join(', ')}`);
        
        if (validation.suggestions.length > 0) {
            console.log(`💡 [${requestId}] Suggestions:`);
            validation.suggestions.forEach((suggestion, index) => {
                console.log(`   ${index + 1}. ${suggestion.message}`);
                console.log(`      Fix: ${suggestion.fix}`);
            });
        } else {
            console.log(`✨ [${requestId}] No issues found - code looks good!`);
        }
        console.log(`🔍 [${requestId}] =================================\n`);
        
        // Extract name and description from the code for response
        const nameMatch = generatedCode.match(/super\('([^']+)'/);
        const descMatch = generatedCode.match(/'([^']+)', '([^']+)'/);
        
        const tweakName = nameMatch ? nameMatch[1] : 'AI Generated Tweak';
        const tweakDescription = descMatch ? descMatch[2] : 'Custom AI generated tweak';

        console.log(`🎯 [${requestId}] Extracted Tweak Name: "${tweakName}"`);
        console.log(`📖 [${requestId}] Extracted Description: "${tweakDescription}"`);

        const responseData = {
            name: tweakName,
            description: tweakDescription,
            code: generatedCode,
            validation: {
                score: validation.score,
                isValid: validation.isValid,
                suggestions: validation.suggestions,
                userIntent: validation.userIntent,
                codeFeatures: validation.codeFeatures
            }
        };

        console.log(`📤 [${requestId}] Sending response to frontend`);
        console.log(`⏱️  [${requestId}] Total request duration: ${duration}ms`);
        console.log(`🎉 [${requestId}] AI Tweak generation completed successfully!\n`);

        res.json(responseData);

    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.error(`\n❌ [${requestId}] =================================`);
        console.error(`❌ [${requestId}] AI TWEAK GENERATION ERROR`);
        console.error(`❌ [${requestId}] =================================`);
        console.error(`❌ [${requestId}] Error after ${duration}ms:`, error.message);
        console.error(`❌ [${requestId}] Error stack:`, error.stack);
        console.error(`❌ [${requestId}] =================================\n`);
        
        res.status(500).json({ 
            error: 'Failed to generate tweak', 
            details: error.message,
            requestId: requestId
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Bot Arena AI service is running' });
});

app.listen(PORT, () => {
    console.log(`🤖 Bot Arena server running on http://localhost:${PORT}`);
    console.log(`🎮 Game available at: http://localhost:${PORT}`);
    console.log(`🔧 API endpoint: http://localhost:${PORT}/api/generate-tweak`);
});
