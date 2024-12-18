import dotenv from 'dotenv';
import { ChatInterface } from './cmd/interface.js';
import { BedrockChat } from './lib/bedrockChat.js';
import { ChatSession } from './lib/chatSession.js';
import { AgentManager } from './lib/agentManager.js';
import { FileOperations } from './lib/fileOperations.js';
import { FileProcessor } from './lib/fileProcessor.js';
import { StructureProcessor } from './lib/structureProcessor.js';

// Load environment variables
dotenv.config();

// Export core classes for library usage
export {
    ChatInterface,
    BedrockChat,
    ChatSession,
    AgentManager,
    FileOperations,
    FileProcessor,
    StructureProcessor
};

// Create a programmatic interface that doesn't use readline
export class ProgrammaticInterface {
    constructor(options = {}) {
        this.chat = new ChatInterface({
            ...options,
            // Don't create readline interface for programmatic use
            rl: null
        });
    }

    async initialize() {
        await this.chat.initializeCore();
        return this;
    }

    async sendMessage(message) {
        return await this.chat.chat(message);
    }

    async close() {
        if (this.chat.isRunning) {
            this.chat.isRunning = false;
            // Clean up any resources
            this.chat.removeAllListeners();
        }
    }
}

// Default export for convenience
export default ProgrammaticInterface;
