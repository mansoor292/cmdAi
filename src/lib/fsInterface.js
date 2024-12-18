import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import archiver from 'archiver';

export class FileSystemInterface {
    constructor(storageType = 'fs') {
        this.storageType = storageType;
    }

    // Base file operations
    async writeFile(filePath, content) {
        try {
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, content);
            return true;
        } catch (error) {
            console.error('\n❌ Storage error:', error.message);
            return false;
        }
    }

    async readFile(filePath) {
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (error) {
            console.error('\n❌ Storage error:', error.message);
            return null;
        }
    }

    async readDir(dirPath) {
        try {
            return await fs.readdir(dirPath);
        } catch (error) {
            console.error('\n❌ Storage error:', error.message);
            return [];
        }
    }

    async getStat(filePath) {
        try {
            return await fs.stat(filePath);
        } catch {
            return null;
        }
    }

    async exists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async createDir(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return true;
        } catch (error) {
            console.error('\n❌ Storage error:', error.message);
            return false;
        }
    }

    // Session-specific operations
    async saveSession(sessionDir, sessionId, sessionData) {
        const sessionFile = path.join(sessionDir, `${sessionId}.json`);
        return await this.writeFile(
            sessionFile,
            JSON.stringify(sessionData, null, 2)
        );
    }

    async loadSession(sessionDir, sessionId) {
        const sessionFile = path.join(sessionDir, `${sessionId}.json`);
        const data = await this.readFile(sessionFile);
        if (!data) return null;
        
        try {
            return JSON.parse(data);
        } catch (error) {
            console.error('\n❌ Session parse error:', error.message);
            return null;
        }
    }

    async listSessions(sessionDir) {
        const files = await this.readDir(sessionDir);
        const sessions = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = await this.readFile(path.join(sessionDir, file));
                if (data) {
                    try {
                        const session = JSON.parse(data);
                        sessions.push({
                            id: session.sessionId,
                            timestamp: session.timestamp,
                            messageCount: session.messages.length
                        });
                    } catch (error) {
                        console.error('\n❌ Error parsing session:', file, error.message);
                    }
                }
            }
        }
        
        return sessions;
    }

    // Archive operations
    async createZipArchive(sourceDir, outputPath, zipFileName) {
        try {
            const zipFilePath = path.join(outputPath, zipFileName);
            await fs.mkdir(outputPath, { recursive: true });

            const output = createWriteStream(zipFilePath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            return new Promise((resolve, reject) => {
                output.on('close', () => {
                    resolve({
                        success: true,
                        path: zipFilePath,
                        size: archive.pointer()
                    });
                });

                archive.on('error', (err) => {
                    reject({
                        success: false,
                        error: err.message
                    });
                });

                archive.on('warning', (err) => {
                    if (err.code === 'ENOENT') {
                        console.warn('\n⚠️ Zip warning:', err);
                    } else {
                        reject({
                            success: false,
                            error: err.message
                        });
                    }
                });

                archive.pipe(output);
                archive.directory(sourceDir, false);
                archive.finalize();
            });
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Future database methods could be:
    // async writeToDatabase(key, content) {}
    // async readFromDatabase(key) {}

    // Future S3 methods could be:
    // async uploadToS3(bucket, key, content) {}
    // async downloadFromS3(bucket, key) {}
}
