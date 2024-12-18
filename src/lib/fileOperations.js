import fs from 'fs/promises';
import path from 'path';
import { FileProcessor } from './fileProcessor.js';

export class FileOperations {
    static async saveResponseToFile(filePath, content) {
        try {
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, content);
            console.log(`\n✅ Response saved to: ${filePath}`);
            return true;
        } catch (error) {
            console.error('\n❌ Error saving file:', error.message);
            return false;
        }
    }

    static async processFileFromResponse(sessionId, content) {
        try {
            const outputDir = path.join('chat_sessions', sessionId, 'files');
            await fs.mkdir(outputDir, { recursive: true });
            await FileProcessor.processJSONContent(content, outputDir);
            console.log(`\n✅ Project structure created in: ${outputDir}`);
            return true;
        } catch (error) {
            console.error('\n❌ Error processing file:', error.message);
            return false;
        }
    }
}
