import path from 'path';
import { fileURLToPath } from 'url';
import { FileSystemInterface } from './fsInterface.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class AgentManager {
    constructor() {
        this.agentsDir = path.join(__dirname, '../../agents');
        this.fsInterface = new FileSystemInterface();
    }

    async initialize() {
        try {
            await this.fsInterface.createDir(this.agentsDir);
            
            const agents = await this.listAgents();
            if (agents.length === 0) {
                await this.saveAgent('default', 'You are a helpful AI assistant.');
            }
        } catch (err) {
            console.error('Error initializing agents:', err);
            process.exit(1);
        }
    }

    async saveAgent(name, content) {
        const agentFile = path.join(this.agentsDir, `${name}.txt`);
        return await this.fsInterface.writeFile(agentFile, content);
    }

    async loadAgent(name) {
        const agentFile = path.join(this.agentsDir, `${name}.txt`);
        return await this.fsInterface.readFile(agentFile);
    }

    async listAgents() {
        const files = await this.fsInterface.readDir(this.agentsDir);
        return files
            .filter(file => file.endsWith('.txt'))
            .map(file => file.replace('.txt', ''));
    }

    async deleteAgent(name) {
        try {
            const agentFile = path.join(this.agentsDir, `${name}.txt`);
            const content = await this.fsInterface.readFile(agentFile);
            if (content === null) {
                return false;
            }
            // For now, we'll simulate deletion by writing an empty string
            // When implementing other storage backends, proper deletion methods can be added
            return await this.fsInterface.writeFile(agentFile, '');
        } catch (err) {
            console.error(`Error deleting agent ${name}:`, err);
            return false;
        }
    }
}
