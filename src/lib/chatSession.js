import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ChatSession {
    constructor() {
        this.sessionId = crypto.randomUUID();
        this.messages = [];
        this.sessionDir = path.join(__dirname, '../../chat_sessions');
        this.preprompt = null;
        this.maxUserPrompts = 3; // Default to last 3 user prompts
        this.maxAIResponses = 0; // Default to no AI responses
        this.extraPrompt = null; // Store any extra prompt text
    }

    async initialize() {
        try {
            await fs.mkdir(this.sessionDir, { recursive: true });
        } catch (err) {
            console.error('Error creating sessions directory:', err);
            process.exit(1);
        }
    }

    setPreprompt(preprompt, extraPrompt = null) {
        this.preprompt = preprompt;
        this.extraPrompt = extraPrompt;
    }

    setPromptLimits(userPrompts, aiResponses) {
        this.maxUserPrompts = userPrompts;
        this.maxAIResponses = aiResponses;
    }

    async saveContext() {
        const sessionFile = path.join(this.sessionDir, `${this.sessionId}.json`);
        try {
            await fs.writeFile(sessionFile, JSON.stringify({
                sessionId: this.sessionId,
                messages: this.messages,
                preprompt: this.preprompt,
                extraPrompt: this.extraPrompt,
                maxUserPrompts: this.maxUserPrompts,
                maxAIResponses: this.maxAIResponses,
                timestamp: new Date().toISOString()
            }, null, 2));
        } catch (err) {
            console.error('Error saving session:', err);
        }
    }

    async loadSession(sessionId) {
        const sessionFile = path.join(this.sessionDir, `${sessionId}.json`);
        try {
            const data = await fs.readFile(sessionFile, 'utf8');
            const session = JSON.parse(data);
            this.sessionId = session.sessionId;
            this.messages = session.messages;
            this.preprompt = session.preprompt;
            this.extraPrompt = session.extraPrompt;
            this.maxUserPrompts = session.maxUserPrompts ?? 3;
            this.maxAIResponses = session.maxAIResponses ?? 0;
            return true;
        } catch (err) {
            return false;
        }
    }

    async listSessions() {
        try {
            const files = await fs.readdir(this.sessionDir);
            const sessions = [];
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const data = await fs.readFile(path.join(this.sessionDir, file), 'utf8');
                    const session = JSON.parse(data);
                    sessions.push({
                        id: session.sessionId,
                        timestamp: session.timestamp,
                        messageCount: session.messages.length
                    });
                }
            }
            
            return sessions;
        } catch (err) {
            console.error('Error listing sessions:', err);
            return [];
        }
    }

    addMessage(role, content) {
        this.messages.push({ role, content, timestamp: new Date().toISOString() });
    }

    formatMessagesForBedrock(devMode = false) {
        let formattedMessages = [];
        
        // Start with the base preprompt
        let systemMessage = this.preprompt || '';

        // Add extra prompt if present
        if (this.extraPrompt) {
            systemMessage += '\n\nAdditional Instructions:\n' + this.extraPrompt;
        }

        // Get previous messages excluding the current one
        const previousMessages = this.messages.slice(0, -1);
        
        // Add previous user prompts to system message
        const previousUserPrompts = previousMessages
            .filter(msg => msg.role === 'user')
            .slice(-this.maxUserPrompts)
            .map(msg => msg.content);

        if (previousUserPrompts.length > 0) {
            systemMessage += '\n\nPrevious user prompts for context:\n';
            previousUserPrompts.forEach((prompt, index) => {
                systemMessage += `[${index + 1}] ${prompt}\n`;
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
            console.log('\n🔍 Dev Mode - Full Prompt:');
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

    // Method to get full message history if needed
    getAllMessages() {
        return this.messages;
    }
}
