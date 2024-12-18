import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class PrepromptManager {
    constructor() {
        this.promptsDir = path.join(__dirname, '../../preprompts');
    }

    async initialize() {
        try {
            await fs.mkdir(this.promptsDir, { recursive: true });
            
            const prompts = await this.listPreprompts();
            if (prompts.length === 0) {
                await this.savePreprompt('default', 'You are a helpful AI assistant.');
            }
        } catch (err) {
            console.error('Error initializing preprompts:', err);
            process.exit(1);
        }
    }

    async savePreprompt(name, content) {
        const promptFile = path.join(this.promptsDir, `${name}.txt`);
        await fs.writeFile(promptFile, content);
    }

    async loadPreprompt(name) {
        const promptFile = path.join(this.promptsDir, `${name}.txt`);
        try {
            return await fs.readFile(promptFile, 'utf8');
        } catch (err) {
            console.error(`Error loading preprompt ${name}:`, err);
            return null;
        }
    }

    async listPreprompts() {
        try {
            const files = await fs.readdir(this.promptsDir);
            return files
                .filter(file => file.endsWith('.txt'))
                .map(file => file.replace('.txt', ''));
        } catch (err) {
            console.error('Error listing preprompts:', err);
            return [];
        }
    }

    async deletePreprompt(name) {
        const promptFile = path.join(this.promptsDir, `${name}.txt`);
        try {
            await fs.unlink(promptFile);
            return true;
        } catch (err) {
            console.error(`Error deleting preprompt ${name}:`, err);
            return false;
        }
    }
}