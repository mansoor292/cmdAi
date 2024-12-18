import path from 'path';
import { FileProcessor } from './fileProcessor.js';
import { FileSystemInterface } from './fsInterface.js';

export class FileOperations {
    static fsInterface = new FileSystemInterface();

    static async saveResponseToFile(filePath, content) {
        const success = await this.fsInterface.writeFile(filePath, content);
        if (success) {
            console.log(`\n✅ Response saved to: ${filePath}`);
        }
        return success;
    }

    static async processFileFromResponse(sessionId, content) {
        try {
            const outputDir = path.join('chat_sessions', sessionId, 'files');
            await this.fsInterface.writeFile(path.join(outputDir, '.keep'), ''); // Ensure directory exists
            await FileProcessor.processJSONContent(content, outputDir);
            console.log(`\n✅ Project structure created in: ${outputDir}`);
            return true;
        } catch (error) {
            console.error('\n❌ Error processing file:', error.message);
            return false;
        }
    }

    static async zipLastProject(outputZipPath = 'output') {
        try {
            // Find the most recently created project directory in chat_sessions
            const chatSessionsDir = 'chat_sessions';
            const sessions = await this.fsInterface.readDir(chatSessionsDir);
            
            // Sort sessions by modification time, most recent first
            const sortedSessions = await Promise.all(
                sessions.map(async (session) => {
                    const sessionPath = path.join(chatSessionsDir, session);
                    const filesPath = path.join(sessionPath, 'files');
                    
                    const stats = await this.fsInterface.getStat(filesPath);
                    return stats ? { session, mtime: stats.mtime } : null;
                })
            ).then(sessions => 
                sessions
                    .filter(s => s !== null)
                    .sort((a, b) => b.mtime - a.mtime)
            );

            if (sortedSessions.length === 0) {
                console.log('\n❌ No project sessions found.');
                return false;
            }

            const latestSession = sortedSessions[0].session;
            const projectDir = path.join(chatSessionsDir, latestSession, 'files');

            // Check if project directory exists and has files
            const dirContents = await this.fsInterface.readDir(projectDir);
            if (!dirContents || dirContents.length === 0) {
                console.log(`\n❌ Project directory is empty or not found: ${projectDir}`);
                return false;
            }

            // Create zip file
            const zipFileName = `project_${latestSession}.zip`;
            const result = await this.fsInterface.createZipArchive(projectDir, outputZipPath, zipFileName);

            if (result.success) {
                console.log(`\n✅ Project zipped successfully: ${result.path}`);
                console.log(`📦 Archive size: ${result.size} bytes`);
                return true;
            } else {
                console.error('\n❌ Error zipping project:', result.error);
                return false;
            }
        } catch (error) {
            console.error('\n❌ Error zipping project:', error.message);
            return false;
        }
    }
}
