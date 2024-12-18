import { JSONUtils } from './jsonUtils.js';
import { UIUtils } from './uiUtils.js';
import { FileProcessor } from './fileProcessor.js';
import fs from 'fs/promises';
import path from 'path';

export class StructureProcessor {
    constructor(rl, bedrock) {
        this.rl = rl;
        this.bedrock = bedrock;
        this.processedFiles = new Set();
    }

    /**
     * Process the structure in chunks of three files
     * @param {Object} structure - The project structure to process
     * @param {string} userPrompt - The user's custom prompt
     * @param {string} structurePrompt - The special structure prompt
     * @param {string} outputDir - Directory to save generated files
     * @param {boolean} autoContinue - Whether to automatically continue to next chunk
     * @returns {Promise<Array<Object>>} - Array of processed structure chunks
     */
    async processInChunks(structure, userPrompt, structurePrompt, outputDir, autoContinue = false) {
        // Get all chunks
        const chunks = FileProcessor.getStructureChunks(structure, 5);
        
        for (const chunk of chunks) {
            const chunkPaths = FileProcessor.getAllFilePaths(chunk.project.rootDirectory.contents);
            console.log('\n📦 Processing files:', chunkPaths.join(', '));
            
            // Format the message for AI
            const messages = [
                { role: 'system', content: structurePrompt },
                { 
                    role: 'user', 
                    content: `=== User Prompt ===
${userPrompt.replace(/--\w+\s*/g, '')}

=== Project Structure ===
${JSONUtils.stringify(structure)}

=== Current Chunk ===
${JSONUtils.stringify(chunk)}

Please generate the code for the files in this chunk. Respond only with the JSON structure containing the generated code in the contents field.`
                }
            ];

            console.log('\n=== System Prompt ===');
            console.log(structurePrompt);
            
            console.log('\n=== User Prompt ===');
            console.log(messages[1].content);

            // Get AI response
            console.log('\n🤖 Generating code...');
            const response = await this.bedrock.generateResponse(messages);
            
            console.log('\n✨ Generated Code:');
            console.log(response);

            try {
                // Parse the AI's response using JSONUtils to handle any extra text
                const generatedCode = JSONUtils.extractJSON(response);
                if (!generatedCode) {
                    throw new Error('Failed to extract valid JSON from AI response');
                }
                
                // Process the generated code using FileProcessor
                await FileProcessor.processJSONContent(JSONUtils.stringify(generatedCode), outputDir);
                console.log(`\n✅ Files created in: ${outputDir}`);
                
                // Save the response for reference
                const responsePath = path.join(outputDir, '.responses');
                await fs.mkdir(responsePath, { recursive: true });
                await fs.writeFile(
                    path.join(responsePath, `chunk_${chunks.indexOf(chunk) + 1}.json`),
                    JSONUtils.stringify(generatedCode)
                );
            } catch (error) {
                console.error('\n❌ Failed to process AI response:', error.message);
            }

            // Mark these files as processed
            chunkPaths.forEach(path => this.processedFiles.add(path));

            // If not the last chunk and not in auto-continue mode, ask to continue
            if (!autoContinue && chunks.indexOf(chunk) < chunks.length - 1) {
                const continue_ = await UIUtils.askQuestion(this.rl, '\nPress Enter to continue to next chunk (or type "stop" to end): ');
                if (continue_.toLowerCase() === 'stop') {
                    break;
                }
            }
        }

        return chunks;
    }

    /**
     * Validates and processes a project structure
     * @param {string} content - The JSON content to process
     * @param {string} userPrompt - The user's custom prompt
     * @param {string} outputDir - Directory to save generated files
     * @param {boolean} autoContinue - Whether to automatically continue to next chunk
     * @returns {Promise<boolean>} - Whether the processing was successful
     */
    async processStructure(content, userPrompt = '', outputDir = 'output', autoContinue = false) {
        try {
            // Load the special structure prompt
            const structurePromptPath = path.join(process.cwd(), 'preprompts', 'structure.txt');
            const structurePrompt = await fs.readFile(structurePromptPath, 'utf-8');
            
            let structure;

            // Use FileProcessor's JSON parsing logic
            try {
                structure = JSON.parse(content);
            } catch (e) {
                structure = JSONUtils.extractJSON(content);
            }
            
            if (!structure) {
                console.log('\n❌ No valid project structure found in the content');
                return false;
            }

            // Create output directory
            await fs.mkdir(outputDir, { recursive: true });

            const chunks = await this.processInChunks(structure, userPrompt, structurePrompt, outputDir, autoContinue);
            console.log(`\n✅ Successfully processed ${chunks.length} chunks`);
            console.log(`\n📁 All files have been created in: ${outputDir}`);
            console.log(`\n💾 AI responses saved in: ${path.join(outputDir, '.responses')}`);
            
            return true;
        } catch (error) {
            console.error('\n❌ Error processing structure:', error.message);
            return false;
        }
    }
}
