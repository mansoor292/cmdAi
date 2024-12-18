/**
 * Utility functions for handling different AWS Bedrock model types
 */

/**
 * Formats the input based on the model type
 * @param {string} modelId - The Bedrock model ID
 * @param {object} options - Configuration options
 * @param {string} options.input - The input text
 * @param {number} [options.maxTokens=100] - Maximum tokens to generate
 * @param {number} [options.temperature=0.7] - Temperature for response generation
 * @param {number} [options.topP=1] - Top P for response generation
 * @param {string[]} [options.stopSequences=[]] - Stop sequences for text generation
 * @returns {object} Formatted input for the model
 */
export function formatModelInput(modelId, options) {
    const {
        input,
        maxTokens = 100,
        temperature = 0.7,
        topP = 1,
        stopSequences = []
    } = options;

    // Claude 3 models
    if (modelId.startsWith('anthropic.claude-3')) {
        return {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: maxTokens,
            messages: [{ 
                role: "user", 
                content: input 
            }]
        };
    }
    
    // Other Claude models (v2, v2.1, instant)
    if (modelId.startsWith('anthropic.')) {
        return {
            prompt: `\n\nHuman: ${input}\n\nAssistant:`,
            max_tokens_to_sample: maxTokens,
            temperature,
            top_p: topP
        };
    }
    
    // Titan text generation models
    if (modelId.startsWith('amazon.titan-text') || modelId.startsWith('amazon.titan-tg1')) {
        return {
            inputText: input,
            textGenerationConfig: {
                maxTokenCount: maxTokens,
                temperature,
                topP,
                stopSequences
            }
        };
    }
    
    // Titan embedding models
    if (modelId.startsWith('amazon.titan-embed')) {
        return {
            inputText: input
        };
    }

    // Default format for other models
    return {
        prompt: input,
        maxTokens,
        temperature
    };
}

/**
 * Extracts the response text from the model output
 * @param {string} modelId - The Bedrock model ID
 * @param {object} response - Raw response from the model
 * @returns {string|number[]|null} Extracted response (text, embedding vector, or null if not found)
 */
export function extractModelResponse(modelId, response) {
    try {
        const parsedResponse = typeof response === 'string' 
            ? JSON.parse(response) 
            : response;

        // Claude 3 models
        if (modelId.startsWith('anthropic.claude-3')) {
            return parsedResponse.content?.[0]?.text || null;
        }

        // Other Claude models
        if (modelId.startsWith('anthropic.')) {
            return parsedResponse.completion || null;
        }

        // Titan embedding models
        if (modelId.startsWith('amazon.titan-embed')) {
            return parsedResponse.embedding || null;
        }

        // Titan text generation models
        if (modelId.startsWith('amazon.titan')) {
            return parsedResponse.results?.[0]?.outputText || 
                   parsedResponse.outputText || null;
        }

        // Default response extraction
        return parsedResponse.completion || 
               parsedResponse.generated_text || 
               parsedResponse.output || 
               null;
    } catch (error) {
        console.error('Error parsing model response:', error);
        return null;
    }
}

/**
 * Creates the input parameters for a Bedrock API call
 * @param {string} modelId - The Bedrock model ID
 * @param {object} options - Input options
 * @returns {object} Formatted input parameters for the Bedrock API
 */
export function createModelInput(modelId, options) {
    return {
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(formatModelInput(modelId, options))
    };
}

/**
 * Example usage:
 * 
 * import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
 * 
 * const client = new BedrockRuntimeClient({
 *     credentials: fromIni(),
 *     region: 'us-east-1'
 * });
 * 
 * // For text generation
 * const input = createModelInput('anthropic.claude-v2', {
 *     input: "What is the capital of France?",
 *     maxTokens: 100,
 *     temperature: 0.7
 * });
 * 
 * const command = new InvokeModelCommand(input);
 * const response = await client.send(command);
 * const responseBody = new TextDecoder().decode(response.body);
 * const result = extractModelResponse('anthropic.claude-v2', responseBody);
 * 
 * // For embeddings
 * const embeddingInput = createModelInput('amazon.titan-embed-g1-text-02', {
 *     input: "Hello, world!"
 * });
 * 
 * const embeddingCommand = new InvokeModelCommand(embeddingInput);
 * const embeddingResponse = await client.send(embeddingCommand);
 * const embeddingBody = new TextDecoder().decode(embeddingResponse.body);
 * const embedding = extractModelResponse('amazon.titan-embed-g1-text-02', embeddingBody);
 */
