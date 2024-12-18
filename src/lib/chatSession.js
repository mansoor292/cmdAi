import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { FileSystemInterface } from './fsInterface.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ChatSession {
    constructor() {
        this.sessionId = crypto.randomUUID();
        this.messages = [];
        this.sessionDir = path.join(__dirname, '../../chat_sessions');
        this.agent = null;
        this.maxUserPrompts = 3; // Default to last 3 user messages
        this.maxAIResponses = 0; // Default to no AI responses
        this.extraInstructions = null; // Store any extra instructions
        this.fsInterface = new FileSystemInterface();
    }

    async initialize() {
        const success = await this.fsInterface.createDir(this.sessionDir);
        if (!success) {
            console.error('Error creating sessions directory');
            process.exit(1);
        }
    }

    setPreprompt(agent, extraInstructions = null) {
        this.agent = agent;
        this.extraInstructions = extraInstructions;
    }

    setPromptLimits(userPrompts, aiResponses) {
        this.maxUserPrompts = userPrompts;
        this.maxAIResponses = aiResponses;
    }

    async saveContext() {
        const sessionData = {
            sessionId: this.sessionId,
            messages: this.messages,
            agent: this.agent,
            extraInstructions: this.extraInstructions,
            maxUserPrompts: this.maxUserPrompts,
            maxAIResponses: this.maxAIResponses,
            timestamp: new Date().toISOString()
        };

        const success = await this.fsInterface.saveSession(this.sessionDir, this.sessionId, sessionData);
        if (!success) {
            console.error('Error saving session');
        }
    }

    async loadSession(sessionId) {
        const session = await this.fsInterface.loadSession(this.sessionDir, sessionId);
        if (!session) return false;

        this.sessionId = session.sessionId;
        this.messages = session.messages;
        this.agent = session.agent || session.preprompt; // Support for legacy sessions
        this.extraInstructions = session.extraInstructions || session.extraPrompt; // Support for legacy sessions
        this.maxUserPrompts = session.maxUserPrompts ?? 3;
        this.maxAIResponses = session.maxAIResponses ?? 0;
        return true;
    }

    async listSessions() {
        return await this.fsInterface.listSessions(this.sessionDir);
    }

    addMessage(role, content) {
        this.messages.push({ role, content, timestamp: new Date().toISOString() });
    }

    formatMessagesForBedrock(devMode = false) {
        let formattedMessages = [];
        
        // Start with the base agent instructions
        let systemMessage = this.agent || '';

        // Add extra instructions if present
        if (this.extraInstructions) {
            systemMessage += '\n\nAdditional Instructions:\n' + this.extraInstructions;
        }

        // Get previous messages excluding the current one
        const previousMessages = this.messages.slice(0, -1);
        
        // Add previous user messages to system message
        const previousUserMessages = previousMessages
            .filter(msg => msg.role === 'user')
            .slice(-this.maxUserPrompts)
            .map(msg => msg.content);

        if (previousUserMessages.length > 0) {
            systemMessage += '\n\nPrevious user messages for context:\n';
            previousUserMessages.forEach((message, index) => {
                systemMessage += `[${index + 1}] ${message}\n`;
            });
        }

        // Add previous AI responses if configured
        if (this.maxAIResponses > 0) {
            const previousAIResponses = previousMessages
                .filter(msg => msg.role === 'assistant')
                .slice(-this.maxAIResponses)
                .map(msg => msg.content);

            if (previousAIResponses.length > 0) {
                systemMessage += '\n\nPrevious AI responses for context:\n';
                previousAIResponses.forEach((response, index) => {
                    systemMessage += `[${index + 1}] ${response}\n`;
                });
            }
        }

        // Add the combined system message
        formattedMessages.push({
            role: 'system',
            content: systemMessage
        });

        // Add the current user message
        const currentMessage = this.messages[this.messages.length - 1];
        if (currentMessage && currentMessage.role === 'user') {
            formattedMessages.push({
                role: 'user',
                content: currentMessage.content
            });
        }

        // If dev mode is enabled, show the formatted messages
        if (devMode) {
            console.log('\n🔍 Dev Mode - Full Agentic AI:');
            console.log('════════════════════════════════════════');
            formattedMessages.forEach((msg, index) => {
                console.log(`[${msg.role.toUpperCase()}]`);
                console.log(msg.content);
                if (index < formattedMessages.length - 1) {
                    console.log('────────────────────────────────────────');
                }
            });
            console.log('════════════════════════════════════════\n');
        }

        return formattedMessages;
    }

    getAllMessages() {
        return this.messages;
    }
}
