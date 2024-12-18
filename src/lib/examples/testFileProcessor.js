import { FileProcessor } from '../fileProcessor.js';
import fs from 'fs/promises';
import path from 'path';

async function testFileProcessor() {
    try {
        // Read the test project JSON
        const testJson = await fs.readFile(path.join('src', 'lib', 'examples', 'testProject.json'), 'utf-8');
        
        // Create a test output directory in the current working directory
        const outputDir = './chat_sessions/test/files';
        await fs.mkdir(outputDir, { recursive: true });
        
        // Process the JSON and create the file structure
        await FileProcessor.processJSONContent(testJson, outputDir);
        
        console.log('✅ Test completed successfully. Check the file structure in:', outputDir);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testFileProcessor();
