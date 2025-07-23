// AI Code Validation and Critique System
class AICodeValidator {
    constructor() {
        this.validationRules = [
            {
                name: 'heel_modification',
                pattern: /bot\.heelArcAngle\s*=\s*.*$/m,
                description: 'Modifies bot heel arc angle',
                keywords: ['heel', 'smaller', 'bigger', 'larger', 'tiny', 'huge', 'arc']
            },
            {
                name: 'size_modification',
                pattern: /bot\.radius\s*=\s*.*$/m,
                description: 'Modifies bot size/radius',
                keywords: ['size', 'smaller', 'bigger', 'larger', 'tiny', 'huge', 'radius']
            },
            {
                name: 'health_modification',
                pattern: /(bot\.health\s*=|bot\.maxHealth\s*=).*$/m,
                description: 'Modifies bot health',
                keywords: ['health', 'life', 'lives', 'hp', 'extra', 'more']
            },
            {
                name: 'speed_modification',
                pattern: /(bot\.velocity\s*[=.]|velocity\s*[=.]|speed.*multiplier|speedMultiplier|_speedRamp|velocity\s*\*|normalize\(\)\.multiply)/m,
                description: 'Modifies bot speed',
                keywords: ['speed', 'fast', 'slow', 'velocity', 'quick']
            },
            {
                name: 'invisibility_effect',
                pattern: /(globalAlpha|invisible|stealth)/m,
                description: 'Creates invisibility effect',
                keywords: ['invisible', 'stealth', 'ghost', 'transparent', 'vanish', 'hide']
            }
        ];
    }

    validateCode(userRequest, generatedCode) {
        const analysis = this.analyzeUserRequest(userRequest);
        const codeFeatures = this.analyzeCode(generatedCode);
        
        return {
            isValid: this.checkAlignment(analysis, codeFeatures),
            userIntent: analysis,
            codeFeatures: codeFeatures,
            suggestions: this.generateSuggestions(analysis, codeFeatures),
            score: this.calculateScore(analysis, codeFeatures)
        };
    }

    analyzeUserRequest(request) {
        const normalized = request.toLowerCase();
        const detectedIntents = [];

        for (const rule of this.validationRules) {
            // Use more precise matching logic
            const matchScore = this.calculateContextualMatch(normalized, rule);
            
            if (matchScore > 0.3) { // Only include intents with reasonable confidence
                detectedIntents.push({
                    type: rule.name,
                    description: rule.description,
                    confidence: matchScore
                });
            }
        }

        // Extract specific percentages or amounts
        const percentageMatch = normalized.match(/(\d+)%/);
        const amountMatch = normalized.match(/(smaller|bigger|larger|tiny|huge)/);
        
        return {
            intents: detectedIntents,
            percentage: percentageMatch ? parseInt(percentageMatch[1]) : null,
            magnitude: amountMatch ? amountMatch[1] : null,
            rawRequest: request
        };
    }

    calculateContextualMatch(text, rule) {
        let score = 0;
        let matchedKeywords = 0;
        
        // Check for keyword matches with context
        for (const keyword of rule.keywords) {
            if (text.includes(keyword)) {
                matchedKeywords++;
                
                // Give higher scores for more specific/contextual matches
                if (rule.name === 'heel_modification' && (text.includes('heel') || text.includes('arc'))) {
                    score += 0.8;
                } else if (rule.name === 'size_modification' && (text.includes('size') || text.includes('radius'))) {
                    score += 0.8;
                } else if (rule.name === 'health_modification' && (text.includes('health') || text.includes('life') || text.includes('hp'))) {
                    score += 0.8;
                } else if (rule.name === 'speed_modification' && (text.includes('speed') || text.includes('fast') || text.includes('slow'))) {
                    score += 0.8;
                } else if (rule.name === 'invisibility_effect' && (text.includes('invisible') || text.includes('stealth') || text.includes('ghost'))) {
                    score += 0.8;
                } else {
                    // Special logic for ambiguous size terms
                    if (keyword === 'smaller' || keyword === 'bigger' || keyword === 'larger' || keyword === 'tiny' || keyword === 'huge') {
                        // If "heel" appears with size terms, prioritize heel modification
                        if (rule.name === 'heel_modification' && text.includes('heel')) {
                            score += 0.9; // Higher priority for heel context
                        } else if (rule.name === 'size_modification' && !text.includes('heel')) {
                            score += 0.7; // Give size modification credit when no heel context
                        } else if (rule.name === 'size_modification' && text.includes('bot')) {
                            score += 0.4; // Lower score if it might be about heel
                        } else {
                            score += 0.2; // Very generic match
                        }
                    } else {
                        // Lower score for very generic matches
                        score += 0.2;
                    }
                }
            }
        }
        
        // Normalize score based on how many keywords matched vs total keywords
        if (matchedKeywords > 0) {
            return Math.min(score, 1.0);
        }
        
        return 0;
    }

    analyzeCode(code) {
        const features = [];
        
        for (const rule of this.validationRules) {
            if (rule.pattern.test(code)) {
                const matches = code.match(rule.pattern);
                features.push({
                    type: rule.name,
                    description: rule.description,
                    implementation: matches ? matches[0] : 'detected',
                    present: true
                });
            }
        }

        return features;
    }

    checkAlignment(analysis, codeFeatures) {
        const userIntents = analysis.intents.map(i => i.type);
        const codeTypes = codeFeatures.map(f => f.type);
        
        // Check if at least one user intent is implemented
        const hasMatchingImplementation = userIntents.some(intent => 
            codeTypes.includes(intent)
        );

        return hasMatchingImplementation;
    }

    calculateKeywordConfidence(text, keywords) {
        const matches = keywords.filter(keyword => text.includes(keyword));
        return matches.length / keywords.length;
    }

    calculateScore(analysis, codeFeatures) {
        if (analysis.intents.length === 0) return 0;
        
        const implementedIntents = analysis.intents.filter(intent =>
            codeFeatures.some(feature => feature.type === intent.type)
        );
        
        return implementedIntents.length / analysis.intents.length;
    }

    generateSuggestions(analysis, codeFeatures) {
        const suggestions = [];
        
        // Check for missing implementations
        for (const intent of analysis.intents) {
            const isImplemented = codeFeatures.some(feature => feature.type === intent.type);
            
            if (!isImplemented) {
                suggestions.push({
                    type: 'missing_feature',
                    message: `The code doesn't implement ${intent.description} as requested`,
                    fix: this.generateFixSuggestion(intent.type, analysis)
                });
            }
        }

        // Check for percentage accuracy
        if (analysis.percentage && !this.hasAccuratePercentage(codeFeatures, analysis.percentage)) {
            suggestions.push({
                type: 'percentage_mismatch',
                message: `User requested ${analysis.percentage}% change, but code may not implement this accurately`,
                fix: `Ensure the multiplication factor is ${(100 - analysis.percentage) / 100} for ${analysis.percentage}% smaller`
            });
        }

        return suggestions;
    }

    generateFixSuggestion(intentType, analysis) {
        const fixes = {
            'heel_modification': `Add: bot.heelArcAngle = bot.heelArcAngle * ${analysis.percentage ? (100 - analysis.percentage) / 100 : '0.6'};`,
            'size_modification': `Add: bot.radius = bot.radius * ${analysis.percentage ? (100 - analysis.percentage) / 100 : '0.7'};`,
            'health_modification': 'Add: bot.health += 1; bot.maxHealth += 1;',
            'speed_modification': 'Add speed modification in onBotUpdate hook',
            'invisibility_effect': 'Add transparency effect in onBotDraw hook'
        };
        
        return fixes[intentType] || 'Add appropriate implementation';
    }

    hasAccuratePercentage(codeFeatures, percentage) {
        const expectedFactor = (100 - percentage) / 100;
        const tolerance = 0.1;
        
        return codeFeatures.some(feature => {
            if (feature.implementation) {
                const factorMatch = feature.implementation.match(/\*\s*(0\.\d+)/);
                if (factorMatch) {
                    const actualFactor = parseFloat(factorMatch[1]);
                    return Math.abs(actualFactor - expectedFactor) < tolerance;
                }
            }
            return false;
        });
    }
}

// Export for use in server
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AICodeValidator };
}
