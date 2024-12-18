import pkg from '@aws-sdk/client-bedrock-runtime';
const { BedrockRuntimeClient, InvokeModelCommand } = pkg;
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { createModelInput, extractModelResponse } from './bedrockModelUtils.js';
import { readFileSync } from 'fs';

// Pricing per 1K tokens (in USD)
const MODEL_PRICING = {
    'anthropic.claude-3-sonnet-20240229-v1:0': {
        input: 0.015,
        output: 0.075
    },
    'anthropic.claude-3-haiku-20240307-v1:0': {
        input: 0.00025,
        output: 0.00125
    },
    'anthropic.claude-3-5-sonnet-20240620-v1:0': {
        input: 0.015,
        output: 0.075
    }
};

// Estimate token count (rough approximation)
function estimateTokenCount(text) {
    return Math.ceil(text.split(/\s+/).length * 1.3);
}

function calculateCost(modelId, inputTokens, outputTokens = 0) {
    const pricing = MODEL_PRICING[modelId];
    if (!pricing) return null;

    const inputCost = (inputTokens / 1000) * (pricing.input || 0);
    const outputCost = (outputTokens / 1000) * (pricing.output || 0);
    
    return {
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost,
        inputTokens,
        outputTokens
    };
}

export class BedrockChat {
    constructor() {
        try {
            // Read models from model.json
            const modelData = JSON.parse(readFileSync('model.json', 'utf8'));
            
            // Filter for available models that are not embedding models
            this.availableModels = modelData
                .filter(model => 
                    model.available && 
                    model.Status === 'ACTIVE' && 
                    !model.ModelId.toLowerCase().includes('embed'))
                .map(model => model.ModelId);

            if (this.availableModels.length === 0) {
                throw new Error('No available chat models found in model.json');
            }

        } catch (error) {
            console.error('\n❌ Error loading models:', error.message);
            // Fallback to default model if model.json can't be read
            this.availableModels = ['anthropic.claude-3-haiku-20240307-v1:0'];
            console.log('Using fallback model:', this.availableModels[0]);
        }

        this.modelId = null;
        this.client = null;
        this.totalCost = 0;
        this.totalInputTokens = 0;
        this.totalOutputTokens = 0;
    }

    async initialize(rl) {
        try {
            // Initialize Bedrock client with default profile
            this.client = new BedrockRuntimeClient({
                region: process.env.AWS_REGION || 'us-east-1',
                credentials: fromIni()
            });

            // Verify AWS credentials and connection with a simple test invocation
            await this.verifyConnection();

            // Select model
            await this.selectModel(rl);

            // Display pricing information for selected model
            this.displayPricing();

            return true;
        } catch (error) {
            console.error('\n❌ Failed to initialize Bedrock client:', error.message);
            if (error.message.includes('credentials')) {
                console.error('Please ensure your AWS credentials are properly configured in ~/.aws/credentials');
                console.error('You can configure them using: aws configure');
            }
            return false;
        }
    }

    displayPricing() {
        const pricing = MODEL_PRICING[this.modelId];
        if (pricing) {
            console.log('\n💰 Model Pricing:');
            console.log(`Input: $${pricing.input}/1K tokens`);
            console.log(`Output: $${pricing.output}/1K tokens`);
        }
    }

    async verifyConnection() {
        try {
            // Test connection with a simple model invocation using our utility
            const input = createModelInput(this.availableModels[0], {
                input: "test",
                maxTokens: 1
            });

            const command = new InvokeModelCommand(input);
            await this.client.send(command);
        } catch (error) {
            if (error.name === 'AccessDeniedException') {
                throw new Error('Access denied. Please check your AWS permissions for Bedrock service.');
            } else if (error.name === 'ValidationException') {
                // If we get a validation error, that means we successfully connected but the model input was invalid
                // This is fine for our verification purposes
                return;
            }
            throw new Error(`Failed to connect to AWS Bedrock: ${error.message}`);
        }
    }

    async selectModel(rl) {
        console.log('\n📋 Available Models:');
        this.availableModels.forEach((model, index) => {
            const pricing = MODEL_PRICING[model];
            if (pricing) {
                console.log(`${index + 1}. ${model}`);
                console.log(`   Input: $${pricing.input}/1K tokens`);
                console.log(`   Output: $${pricing.output}/1K tokens`);
            } else {
                console.log(`${index + 1}. ${model} (pricing not available)`);
            }
        });

        const answer = await new Promise(resolve => {
            rl.question('\nSelect a model number (or press Enter for default): ', resolve);
        });

        if (answer && !isNaN(answer)) {
            const index = parseInt(answer) - 1;
            if (index >= 0 && index < this.availableModels.length) {
                this.modelId = this.availableModels[index];
            } else {
                console.log('\n❌ Invalid selection, using default model.');
                this.modelId = this.availableModels[0];
            }
        } else {
            this.modelId = this.availableModels[0];
        }

        console.log(`\n✨ Using model: ${this.modelId}`);
    }

    async generateResponse(messages, devMode = false) {
        try {
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage || lastMessage.role !== 'user') {
                throw new Error('Invalid message format');
            }

            // Format conversation history into a single string
            let input = '';
            for (const msg of messages) {
                if (msg.role === 'system') {
                    input += `${msg.content}\n\n`;
                } else {
                    input += `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}\n\n`;
                }
            }

            // If dev mode is enabled, show the raw input
            if (devMode) {
                console.log('\n🔍 Dev Mode - Raw Input:');
                console.log('════════════════════════════════════════');
                console.log(input.trim());
                console.log('════════════════════════════════════════\n');
            }

            // Create model input using our utility with a higher default token limit
            const options = {
                input: input.trim(),
                maxTokens: parseInt(process.env.MAX_TOKENS || '4096'),
                temperature: parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7')
            };

            const modelInput = createModelInput(this.modelId, options);
            const command = new InvokeModelCommand(modelInput);
            const response = await this.client.send(command);
            const responseBody = new TextDecoder().decode(response.body);
            
            // Extract response using our utility
            const result = extractModelResponse(this.modelId, responseBody);
            
            if (!result) {
                throw new Error('No readable output found in response');
            }

            // Calculate and track costs
            const cost = calculateCost(
                this.modelId,
                estimateTokenCount(input),
                estimateTokenCount(result)
            );

            if (cost) {
                this.totalCost += cost.totalCost;
                this.totalInputTokens += cost.inputTokens;
                this.totalOutputTokens += cost.outputTokens;

                // Log cost information
                console.log('\n💰 Request Cost:');
                console.log(`Input Tokens: ${cost.inputTokens} ($${cost.inputCost.toFixed(6)})`);
                console.log(`Output Tokens: ${cost.outputTokens} ($${cost.outputCost.toFixed(6)})`);
                console.log(`Total Cost: $${cost.totalCost.toFixed(6)}`);
                console.log(`Session Total: $${this.totalCost.toFixed(6)}`);
            }

            return result;
        } catch (error) {
            console.error('\n❌ Request Error:', error);
            
            if (error.name === 'ValidationException') {
                console.error('\n❌ Model Validation Error:');
                console.error(`Current model: ${this.modelId}`);
                console.error('\nAvailable models:');
                this.availableModels.forEach(model => console.error(`- ${model}`));
                throw new Error('Invalid model configuration. Please restart the application and select a valid model.');
            } else if (error.name === 'AccessDeniedException') {
                throw new Error('Access denied. Please check your AWS permissions for Bedrock service.');
            } else if (error.name === 'ThrottlingException') {
                throw new Error('Request was throttled. Please try again in a few moments.');
            } else {
                throw new Error(`Bedrock API Error: ${error.message}`);
            }
        }
    }
}
