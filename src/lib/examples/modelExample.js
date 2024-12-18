import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { createModelInput, extractModelResponse } from '../bedrockModelUtils.js';

async function main() {
    try {
        const client = new BedrockRuntimeClient({
            credentials: fromIni(),
            region: 'us-east-1'
        });

        // Example 1: Text generation with Claude
        console.log('\nExample 1: Text Generation with Claude');
        const textInput = createModelInput('anthropic.claude-v2', {
            input: "What is the capital of France?",
            maxTokens: 100,
            temperature: 0.7
        });

        const textCommand = new InvokeModelCommand(textInput);
        const textResponse = await client.send(textCommand);
        const textBody = new TextDecoder().decode(textResponse.body);
        const textResult = extractModelResponse('anthropic.claude-v2', textBody);
        console.log('Response:', textResult);

        // Example 2: Generate embeddings with Titan
        console.log('\nExample 2: Generate Embeddings with Titan');
        const embeddingInput = createModelInput('amazon.titan-embed-g1-text-02', {
            input: "Hello, world!"
        });

        const embeddingCommand = new InvokeModelCommand(embeddingInput);
        const embeddingResponse = await client.send(embeddingCommand);
        const embeddingBody = new TextDecoder().decode(embeddingResponse.body);
        const embedding = extractModelResponse('amazon.titan-embed-g1-text-02', embeddingBody);
        
        if (Array.isArray(embedding)) {
            console.log(`Embedding generated successfully. First 3 dimensions: [${
                embedding.slice(0, 3).map(n => n.toFixed(4)).join(', ')
            }] (total dimensions: ${embedding.length})`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
