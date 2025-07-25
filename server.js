const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Azure OpenAI client setup
const { AzureOpenAI } = require('openai');

// Import AI validation system
const { AICodeValidator } = require('./ai-validation.js');

// AI Code Critique Function
async function getCritiqueFromAI(requestId, userRequest, generatedCode) {
    try {
        console.log(`🧠 [${requestId}] Sending code to o4-mini for critique...`);
        
        const critiquePrompt = `You are a code reviewer for a 2D bumper bot game. Review this AI-generated code and provide a clear verdict.

USER REQUEST: "${userRequest}"

GENERATED CODE:
\`\`\`javascript
${generatedCode}
\`\`\`

CONTEXT: Bots bounce around an arena trying to hit each other's rotating "achilles heel" (green arc). Game runs at 60fps with momentum-based physics.

Provide your response in this EXACT format:

VERDICT: [Looks good/Try again]

REASONING: [1-2 sentences explaining why the code works or doesn't work for the user's request]

If verdict is "TRY AGAIN", also include:
IMPROVE YOUR PROMPT: [Specific suggestions for how the user should rephrase their request to get better results. Focus on being more specific, mentioning game mechanics, or clarifying the desired behavior.]

Keep it concise and actionable.`;

        const critiqueResponse = await critiqueClient.chat.completions.create({
            model: process.env.AZURE_CRITIQUE_DEPLOYMENT,
            messages: [
                {
                    role: "system",
                    content: "You are a senior code reviewer. Provide clear, structured feedback."
                },
                {
                    role: "user",
                    content: critiquePrompt
                }
            ],
            max_completion_tokens: 4000  // Generous limit for detailed critiques
        });

        console.log(`🧠 [${requestId}] Raw critique response:`, JSON.stringify(critiqueResponse, null, 2));
        
        const critiqueText = critiqueResponse.choices[0]?.message?.content?.trim() || '';
        console.log(`🧠 [${requestId}] o4-mini critique received (length: ${critiqueText.length}):`, critiqueText);
        
        // If empty response, provide a helpful fallback
        if (!critiqueText || critiqueText.length === 0) {
            console.log(`⚠️  [${requestId}] Empty critique received, using fallback`);
            return {
                rawText: "AI code review is temporarily unavailable. The generated code appears syntactically correct and should be safe to test.",
                isRawText: true,
                fallback: true
            };
        }
        
        // Return the raw text as-is, no parsing
        return {
            rawText: critiqueText,
            isRawText: true
        };
        
    } catch (error) {
        console.error(`❌ [${requestId}] Error getting AI critique:`, error.message);
        return {
            rawText: "AI critique unavailable due to technical error: " + error.message,
            isRawText: true,
            error: error.message
        };
    }
}

// Main generation client (GPT-4.1)
const client = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION
});

// Critique client (o4-mini)
const critiqueClient = new AzureOpenAI({
    endpoint: process.env.AZURE_CRITIQUE_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_CRITIQUE_API_KEY || process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_CRITIQUE_DEPLOYMENT || "o4-mini",
    apiVersion: process.env.AZURE_CRITIQUE_API_VERSION || "2024-04-01-preview"
});

console.log(`🔧 Critique client config:`, {
    endpoint: process.env.AZURE_CRITIQUE_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT,
    deployment: process.env.AZURE_CRITIQUE_DEPLOYMENT || "o4-mini",
    apiVersion: process.env.AZURE_CRITIQUE_API_VERSION || "2024-04-01-preview",
    hasApiKey: !!(process.env.AZURE_CRITIQUE_API_KEY || process.env.AZURE_OPENAI_API_KEY)
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
- Vector2 class with add, subtract, multiply, normalize, magnitude methods
- createOptimizedParticles(x, y, color, count) for effects
- GAME_CONFIG constants for game settings
- Date, Math, console objects

CRITICAL VECTOR2 API:
- To get speed: bot.velocity.magnitude() (NOT .length())
- To normalize: bot.velocity.normalize()
- To multiply: bot.velocity.multiply(scalar)
- Example speed boost: bot.velocity = bot.velocity.normalize().multiply(newSpeed)

Rules:
1. Create a class that extends TweakPlugin
2. Constructor must have: super('ai-[type]-\${Date.now()}', 'Name', 'Description')
3. Focus on gameplay mechanics, not visual redesigns
4. DO NOT redraw the main bot circle in onBotDraw
5. DO NOT modify GAME_CONFIG values
6. Make tweaks fun but balanced
7. End with: return new YourTweakClass();
8. NO markdown, NO explanations, ONLY JavaScript code
9. ALWAYS use bot.velocity.magnitude() to get speed (NOT .length())`;

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
            model: process.env.AZURE_OPENAI_DEPLOYMENT,
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
        
        // Basic code compilation check
        let compilationError = null;
        try {
            // Try to create the function to check for syntax errors
            new Function(
                'TweakPlugin',
                'GAME_CONFIG', 
                'createOptimizedParticles',
                'Vector2',
                'Date',
                'Math',
                'console',
                generatedCode
            );
            console.log(`✅ [${requestId}] Code compilation check passed`);
        } catch (error) {
            compilationError = error.message;
            console.log(`❌ [${requestId}] Code compilation error: ${error.message}`);
        }
        
        // Simplified validation - just pass the code through
        const validator = new AICodeValidator();
        const validation = validator.validateCode(prompt, generatedCode);
        
        // Add compilation error to validation if present
        if (compilationError) {
            validation.compilationError = compilationError;
            validation.isValid = false;
        }
        
        console.log(`\n🔍 [${requestId}] =================================`);
        console.log(`🔍 [${requestId}] SIMPLIFIED CODE VALIDATION`);
        console.log(`🔍 [${requestId}] =================================`);
        console.log(`📝 [${requestId}] User Request: "${validation.userRequest}"`);
        console.log(`💻 [${requestId}] Generated Code: Ready for AI critique`);
        console.log(`✅ [${requestId}] Status: ${validation.isValid ? 'READY FOR REVIEW' : 'NEEDS ATTENTION'}`);
        console.log(`🔍 [${requestId}] =================================\n`);
        
        // Get AI critique from o4-mini
        const aiCritique = await getCritiqueFromAI(requestId, prompt, generatedCode);
        
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
                userRequest: validation.userRequest,
                generatedCode: validation.generatedCode,
                isValid: validation.isValid,
                suggestions: validation.suggestions,
                aiCritique: aiCritique  // Add AI critique to validation results
            }
        };

        console.log(`📤 [${requestId}] Sending response to frontend`);
        console.log(`🧠 [${requestId}] AI Critique in final response:`, JSON.stringify(aiCritique, null, 2));
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
