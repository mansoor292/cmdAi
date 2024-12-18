

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { createModelInput, extractModelResponse } from '../bedrockModelUtils.js';
import { readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';

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
    },
    'anthropic.claude-v2': {
        input: 0.01102,
        output: 0.03268
    },
    'anthropic.claude-v2:1': {
        input: 0.01102,
        output: 0.03268
    },
    'anthropic.claude-instant-v1': {
        input: 0.00163,
        output: 0.00551
    },
    'amazon.titan-text-express-v1': {
        input: 0.0008,
        output: 0.0016
    },
    'amazon.titan-text-lite-v1': {
        input: 0.0003,
        output: 0.0004
    },
    'amazon.titan-embed-text-v1': {
        input: 0.0001
    },
    'amazon.titan-embed-g1-text-02': {
        input: 0.0001
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
        totalCost: inputCost + outputCost
    };
}

// Check if a model is an embedding model
function isEmbeddingModel(modelId) {
    return modelId.toLowerCase().includes('embed');
}

async function testModel(client, modelId) {
    console.log(chalk.blue(`\n🤖 Testing ${modelId}...`));
    
    try {
        // Skip detailed testing for embedding models
        if (isEmbeddingModel(modelId)) {
            console.log(chalk.yellow('Skipping detailed test for embedding model'));
            return {
                success: true,
                isEmbedding: true
            };
        }

        const options = {
            input: "Introduce yourself briefly as an AI assistant.",
            maxTokens: 100,
            temperature: 0.7,
            topP: 1
        };

        // Create model input using our utility
        const input = createModelInput(modelId, options);
        const command = new InvokeModelCommand(input);
        
        // Execute the request
        console.log(chalk.yellow('Sending request...'));
        const response = await client.send(command);
        const responseBody = new TextDecoder().decode(response.body);
        
        // Extract and format the response using our utility
        const result = extractModelResponse(modelId, responseBody);
        
        if (result) {
            console.log(chalk.green('Response received:'));
            console.log(chalk.cyan(result.trim()));
            
            // Calculate cost for text generation
            const inputTokens = estimateTokenCount(options.input);
            const outputTokens = estimateTokenCount(result);
            const cost = calculateCost(modelId, inputTokens, outputTokens);
            if (cost) {
                console.log(chalk.yellow('\nCost Analysis:'));
                console.log(chalk.yellow(`Input Tokens (est.): ${inputTokens}`));
                console.log(chalk.yellow(`Output Tokens (est.): ${outputTokens}`));
                console.log(chalk.yellow(`Input Cost: $${cost.inputCost.toFixed(6)}`));
                console.log(chalk.yellow(`Output Cost: $${cost.outputCost.toFixed(6)}`));
                console.log(chalk.yellow(`Total Cost: $${cost.totalCost.toFixed(6)}`));
            }

            return {
                success: true,
                isEmbedding: false
            };
        } else {
            console.log(chalk.red('No readable output found in response'));
            return {
                success: false,
                isEmbedding: false
            };
        }

    } catch (error) {
        console.error(chalk.red(`Error testing ${modelId}:`, error.message));
        if (error.name === 'ValidationException') {
            console.log(chalk.yellow('Validation error - might need format adjustment'));
            console.log(chalk.yellow('Error details:', error.message));
        }
        return {
            success: false,
            isEmbedding: false,
            error: error.message
        };
    }
}

async function main() {
    try {
        // Initialize Bedrock client
        const client = new BedrockRuntimeClient({
            credentials: fromIni(),
            region: 'us-east-1'
        });

        console.log(chalk.blue('🚀 Testing all models...\n'));
        console.log(chalk.yellow('Note: Token counts and costs are estimates. Actual costs may vary.\n'));

        // Read and parse model.json
        const modelData = JSON.parse(readFileSync('model.json', 'utf8'));
        let modelsUpdated = false;
        
        // Test all ACTIVE models
        const activeModels = modelData.filter(model => model.Status === 'ACTIVE');
        console.log(chalk.blue(`Found ${activeModels.length} active models to test:`));
        
        // Display models and pricing
        activeModels.forEach(model => {
            const pricing = MODEL_PRICING[model.ModelId];
            if (pricing) {
                console.log(chalk.cyan(`- ${model.ModelId}`));
                console.log(chalk.gray(`  Input: $${pricing.input}/1K tokens`));
                if (pricing.output) {
                    console.log(chalk.gray(`  Output: $${pricing.output}/1K tokens`));
                }
            } else {
                console.log(chalk.cyan(`- ${model.ModelId} (pricing not available)`));
            }
        });
        
        // Test each model and update availability
        for (const model of activeModels) {
            const result = await testModel(client, model.ModelId);
            
            // Update model availability based on test results
            const shouldBeAvailable = result.success && !result.isEmbedding;
            if (model.available !== shouldBeAvailable) {
                model.available = shouldBeAvailable;
                modelsUpdated = true;
                
                console.log(chalk.yellow(`\nUpdating availability for ${model.ModelId}:`));
                console.log(chalk.yellow(`Previous: ${!shouldBeAvailable}, New: ${shouldBeAvailable}`));
                if (result.error) {
                    console.log(chalk.red(`Reason: ${result.error}`));
                }
            }

            // Add a small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Save updated model.json if changes were made
        if (modelsUpdated) {
            console.log(chalk.green('\nUpdating model.json with new availability status...'));
            writeFileSync('model.json', JSON.stringify(modelData, null, 4));
            console.log(chalk.green('model.json updated successfully.'));
        } else {
            console.log(chalk.blue('\nNo changes needed in model.json'));
        }

    } catch (error) {
        console.error(chalk.red('\n❌ Error:', error.message));
        if (error.name === 'CredentialsProviderError') {
            console.log(chalk.yellow('\n📝 To configure AWS credentials:'));
            console.log('1. Install AWS CLI');
            console.log('2. Run: aws configure');
            console.log('3. Enter your AWS credentials when prompted');
        }
    }
}

main();
