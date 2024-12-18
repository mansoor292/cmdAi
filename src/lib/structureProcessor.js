import { JSONUtils } from './jsonUtils.js';
import { UIUtils } from '../cmd/uiUtils.js';
import { FileProcessor } from './fileProcessor.js';
import { FileSystemInterface } from './fsInterface.js';
import path from 'path';

export class StructureProcessor {
    static lastProcessedProjectPath = null;

    constructor(rl, bedrock, session = null) {
        this.rl = rl;
        this.bedrock = bedrock;
        this.session = session;
        this.processedFiles = new Set();
        this.fsInterface = new FileSystemInterface();
    }

    async processInChunks(structure, userInstructions, agentInstructions, outputDir, autoContinue = false) {
        // Get all chunks
        const chunks = FileProcessor.getStructureChunks(structure, 5);
        
        for (const chunk of chunks) {
            const chunkPaths = FileProcessor.getAllFilePaths(chunk.project.rootDirectory.contents);
            console.log('\n📦 Processing files:', chunkPaths.join(', '));
            
            // Format the message for AI
            const messages = [
                { role: 'system', content: agentInstructions },
                { 
                    role: 'user', 
                    content: `=== User Instructions ===
${userInstructions.replace(/--\w+\s*/g, '')}

=== Project Structure ===
${JSONUtils.stringify(structure)}

=== Current Chunk ===
${JSONUtils.stringify(chunk)}

Please generate the code for the files in this chunk. Respond only with the JSON structure containing the generated code in the contents field.`
                }
            ];

            console.log('\n=== System Instructions ===');
            console.log(agentInstructions);
            
            console.log('\n=== User Instructions ===');
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
                
                // Create output directory if it doesn't exist
                await this.fsInterface.createDir(outputDir);

                // Check for existing files before processing
                const existingFiles = [];
                for (const filePath of chunkPaths) {
                    const fullPath = path.join(outputDir, filePath);
                    if (await this.fsInterface.exists(fullPath)) {
                        existingFiles.push(filePath);
                    }
                }

                if (existingFiles.length > 0) {
                    console.log('\n⚠️ The following files already exist:');
                    existingFiles.forEach(file => console.log(`- ${file}`));
                    if (!autoContinue) {
                        const proceed = await UIUtils.askQuestion(this.rl, '\nDo you want to overwrite these files? (y/n): ');
                        if (proceed.toLowerCase() !== 'y') {
                            console.log('\n⏭️ Skipping this chunk...');
                            continue;
                        }
                    }
                }
                
                // Process the generated code using FileProcessor
                await FileProcessor.processJSONContent(JSONUtils.stringify(generatedCode), outputDir);
                console.log(`\n✅ Files created in: ${outputDir}`);
                
                // Save the response for reference
                const responsePath = path.join(outputDir, '.responses');
                await this.fsInterface.createDir(responsePath);
                await this.fsInterface.writeFile(
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

    async processStructure(content, userInstructions = '', outputDir = null, autoContinue = false) {
        try {
            // Load the special structure agent instructions
            const structureAgentPath = path.join(process.cwd(), 'agents', 'structure.txt');
            const agentInstructions = await this.fsInterface.readFile(structureAgentPath);
            
            if (!agentInstructions) {
                throw new Error('Failed to load structure agent instructions');
            }

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

            // Determine output directory
            if (!outputDir) {
                // If no session is provided, fall back to 'output'
                if (!this.session || !this.session.sessionId) {
                    outputDir = 'output';
                } else {
                    // Save to chat_sessions/[sessionId]/files
                    outputDir = path.join('chat_sessions', this.session.sessionId, 'files');
                }
            }

            // Ensure output directory exists
            await this.fsInterface.createDir(outputDir);

            const chunks = await this.processInChunks(structure, userInstructions, agentInstructions, outputDir, autoContinue);
            console.log(`\n✅ Successfully processed ${chunks.length} chunks`);
            console.log(`\n📁 All files have been created in: ${outputDir}`);
            console.log(`\n💾 AI responses saved in: ${path.join(outputDir, '.responses')}`);
            
            // Track the last processed project path using absolute path
            StructureProcessor.lastProcessedProjectPath = path.resolve(outputDir);
            
            return true;
        } catch (error) {
            console.error('\n❌ Error processing structure:', error.message);
            return false;
        }
    }

    static getLastProcessedProjectPath() {
        return this.lastProcessedProjectPath;
    }
}
