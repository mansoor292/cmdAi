import pkg from '@aws-sdk/client-bedrock-runtime';
const { BedrockRuntimeClient, InvokeModelCommand } = pkg;
import { fromIni } from '@aws-sdk/credential-provider-ini';
import chalk from 'chalk';
import { readFileSync, writeFileSync } from 'fs';

function getModelInput(modelId) {
    // Base test message
    const testMessage = "test";

    // Different input formats for different model families
    if (modelId.startsWith('anthropic.claude-3')) {
        return {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1,
            messages: [{ role: "user", content: testMessage }]
        };
    } else if (modelId.startsWith('anthropic.')) {
        return {
            prompt: `\n\nHuman: ${testMessage}\n\nAssistant:`,
            max_tokens_to_sample: 1,
            temperature: 0.5
        };
    } else if (modelId.startsWith('amazon.titan-image')) {
        return {
            taskType: "TEXT_IMAGE",
            textToImageParams: {
                text: testMessage
            },
            imageGenerationConfig: {
                numberOfImages: 1,
                quality: "standard",
                cfgScale: 8.0
            }
        };
    } else if (modelId.startsWith('amazon.titan-text')) {
        return {
            inputText: testMessage,
            textGenerationConfig: {
                maxTokenCount: 1,
                temperature: 0
            }
        };
    } else if (modelId.startsWith('amazon.titan-embed')) {
        return {
            inputText: testMessage
        };
    } else if (modelId.startsWith('cohere.command')) {
        return {
            prompt: testMessage,
            max_tokens: 1,
            temperature: 0
        };
    } else if (modelId.startsWith('cohere.embed')) {
        return {
            texts: [testMessage],
            input_type: "search_query"
        };
    } else if (modelId.startsWith('ai21.')) {
        return {
            prompt: testMessage,
            maxTokens: 1,
            temperature: 0
        };
    } else if (modelId.startsWith('meta.')) {
        return {
            prompt: testMessage,
            max_gen_len: 1,
            temperature: 0
        };
    } else if (modelId.startsWith('mistral.')) {
        return {
            prompt: testMessage,
            max_tokens: 1,
            temperature: 0
        };
    } else if (modelId.startsWith('amazon.titan-tg1')) {
        return {
            inputText: testMessage,
            textGenerationConfig: {
                maxTokenCount: 1,
                temperature: 0,
                topP: 1
            }
        };
    } else {
        // Default format for other models
        return {
            prompt: testMessage,
            maxTokens: 1,
            temperature: 0
        };
    }
}

async function testModelAccess(client, modelId) {
    try {
        const input = {
            modelId: modelId,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(getModelInput(modelId))
        };

        const command = new InvokeModelCommand(input);
        await client.send(command);
        return true;
    } catch (error) {
        if (error.name === 'ValidationException') {
            // If we get a validation error, that means we can access the model but the input format was wrong
            console.log(chalk.yellow(`⚠️  ${modelId}: Validation error - ${error.message}`));
            return true;
        }
        if (error.name === 'AccessDeniedException') {
            return false;
        }
        console.error(chalk.red(`Error testing ${modelId}:`, error.message));
        return false;
    }
}

async function main() {
    try {
        const client = new BedrockRuntimeClient({
            credentials: fromIni(),
            region: 'us-east-1'
        });

        console.log(chalk.blue('🔍 Testing model access...\n'));

        // Read and parse models from model.json
        const modelData = JSON.parse(readFileSync('model.json', 'utf8'));
        
        // Filter for active models only
        const activeModels = modelData.filter(model => model.Status === 'ACTIVE');

        console.log(chalk.blue(`Found ${activeModels.length} active models to test\n`));

        // Test each model and update availability
        for (const model of activeModels) {
            const hasAccess = await testModelAccess(client, model.ModelId);
            model.available = hasAccess;
            
            if (hasAccess) {
                console.log(chalk.green(`✅ ${model.ModelId}: Access granted`));
            } else {
                console.log(chalk.red(`❌ ${model.ModelId}: No access`));
            }
        }

        // Update model.json with availability results
        const updatedModelData = modelData.map(model => {
            if (model.Status === 'ACTIVE') {
                const activeModel = activeModels.find(m => m.ModelId === model.ModelId);
                return {
                    ...model,
                    available: activeModel.available
                };
            }
            return {
                ...model,
                available: false // LEGACY models are not available
            };
        });

        // Write updated data back to model.json with proper formatting
        writeFileSync('model.json', JSON.stringify(updatedModelData, null, 4));
        console.log(chalk.blue('\n✍️  Updated model.json with availability information'));

    } catch (error) {
        console.error(chalk.red('\n❌ Error:', error.message));
        if (error.name === 'CredentialsProviderError') {
            console.log(chalk.yellow('\n📝 To configure AWS credentials:'));
            console.log('1. Install AWS CLI');
            console.log('2. Run: aws configure');
            console.log('3. Enter your AWS credentials when prompted');
        }
        if (error.name === 'AccessDeniedException') {
            console.log(chalk.yellow('\n⚠️  Your AWS user needs permissions for Bedrock.'));
            console.log('Required permissions:');
            console.log('- bedrock:InvokeModel');
        }
    }
}

main();
