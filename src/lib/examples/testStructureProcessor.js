import { StructureProcessor } from '../structureProcessor.js';
import { UIUtils } from '../uiUtils.js';
import { BedrockChat } from '../bedrockChat.js';
import fs from 'fs/promises';
import path from 'path';

async function testStructureProcessor() {
    try {
        // Read the test structure file
        const testStructurePath = path.join(process.cwd(), 'extras/test-structure.json');
        const content = await fs.readFile(testStructurePath, 'utf-8');
        
        // Create readline interface
        const rl = UIUtils.createReadlineInterface();
        
        // Initialize Bedrock
        const bedrock = new BedrockChat();
        await bedrock.initialize(rl);
        
        // Initialize structure processor
        const processor = new StructureProcessor(rl, bedrock);
        
        console.log('🚀 Starting structure processing test...\n');

        // Process the structure and generate files in express-api directory
        // This matches the rootDirectory.name from the structure
        await processor.processStructure(content, 'this is an express-api with multiple routes', 'express-api');
        
        // Clean up
        rl.close();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testStructureProcessor().catch(console.error);
