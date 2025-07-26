const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Azure OpenAI client setup
const { AzureOpenAI } = require('openai');

// Frontend content cache
let gameJsContent = null;
let styleCssContent = null;
let indexHtmlContent = null;

// Load frontend files content on server startup
function loadFrontendContent() {
    try {
        // Load game.js
        gameJsContent = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
        console.log('✅ Game.js content loaded successfully');
        
        // Load style.css
        styleCssContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
        console.log('✅ Style.css content loaded successfully');
        
        // Load index.html
        indexHtmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
        console.log('✅ Index.html content loaded successfully');
        
        return true;
    } catch (error) {
        console.error('❌ Failed to load frontend files:', error.message);
        throw new Error('Cannot start server without frontend content');
    }
}

// Main generation client (GPT-4.1)
const client = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION
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

IMPORTANT: You must respond with ONLY valid JavaScript code that returns a TweakPlugin instance. No explanations, no markdown, no backticks.

COMPLETE FRONTEND SOURCE CODE FOR REFERENCE:

GAME LOGIC (game.js):
\`\`\`javascript
${gameJsContent}
\`\`\`

STYLING (style.css):
\`\`\`css
${styleCssContent}
\`\`\`

HTML STRUCTURE (index.html):
\`\`\`html
${indexHtmlContent}
\`\`\`

You have complete knowledge of the game mechanics, UI elements, styling classes, and DOM structure. Use this knowledge to create tweaks that integrate perfectly with the existing codebase and can leverage UI elements, animations, and visual effects.

Rules:
1. Create a class that extends TweakPlugin
2. Constructor must have: super('ai-[type]-\${Date.now()}', 'Name', 'Description')  
3. Focus on gameplay mechanics
4. You can use CSS classes like .shake, .pulse, and DOM elements by ID
5. Make tweaks balanced and fun, not overpowered
6. Only change what the user asked for; don't add extra features
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
            code: generatedCode
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

// Load frontend content on server startup
loadFrontendContent();

app.listen(PORT, () => {
    console.log(`🤖 Bot Arena server running on http://localhost:${PORT}`);
    console.log(`🎮 Game available at: http://localhost:${PORT}`);
    console.log(`🔧 API endpoint: http://localhost:${PORT}/api/generate-tweak`);
});
