import { BedrockChat } from '../lib/bedrockChat.js';
import { ChatSession } from '../lib/chatSession.js';
import { AgentManager } from '../lib/agentManager.js';
import { UIUtils } from './uiUtils.js';
import { AgentUIManager } from '../lib/agentUIManager.js';
import { CommandHandler } from './commandHandler.js';
import { EventEmitter } from 'events';
import chalk from 'chalk';

export class ChatInterface extends EventEmitter {
    constructor(options = {}) {
        super();
        const {
            session = new ChatSession(),
            bedrock = new BedrockChat(),
            agentManager = new AgentManager(),
            rl = null,
            devMode = false
        } = options;

        this.session = session;
        this.bedrock = bedrock;
        this.agentManager = agentManager;
        this.rl = rl || UIUtils.createReadlineInterface();
        this.agentUIManager = new AgentUIManager(this.agentManager, this.session);
        this.commandHandler = new CommandHandler(
            this.session,
            this.bedrock,
            this.agentManager,
            this.agentUIManager,
            this.rl
        );
        this.devMode = devMode;
        this.isRunning = true;

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.rl.on('line', async (input) => {
            if (!this.isRunning) return;
            await this.handleInput(input.trim());
        });

        this.rl.on('close', () => {
            console.log(chalk.blue('\n👋 Goodbye!'));
            this.isRunning = false;
            process.exit(0);
        });

        process.on('SIGINT', () => {
            console.log(chalk.blue('\n👋 Goodbye!'));
            this.isRunning = false;
            this.rl.close();
            process.exit(0);
        });

        this.on('error', (error) => {
            console.error(chalk.red('\n❌ Error:', error));
            this.rl.prompt();
        });
    }

    async handleInput(input) {
        if (!input) {
            this.rl.prompt();
            return;
        }

        try {
            if (input.startsWith('/')) {
                await this.commandHandler.handleCommand(input);
                this.rl.prompt();
            } else {
                UIUtils.showThinking();
                const response = await this.chat(input);
                UIUtils.clearThinking();
                
                if (response) {
                    console.log('\n' + chalk.green('Assistant:'), response);
                }
                this.rl.prompt();
            }
        } catch (error) {
            UIUtils.clearThinking();
            this.emit('error', error);
        }
    }

    async initializeCore() {
        try {
            await this.bedrock.initialize(this.rl);
            await this.session.initialize();
            await this.agentManager.initialize();
            return this;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async chat(userMessage) {
        if (!this.session) {
            throw new Error('Chat interface not initialized. Call initializeCore() first.');
        }

        try {
            this.session.addMessage('user', userMessage);
            const messages = this.session.formatMessagesForBedrock(this.devMode);
            const response = await this.bedrock.generateResponse(messages, this.devMode);
            this.session.addMessage('assistant', response);
            await this.session.saveContext();
            return response;
        } catch (error) {
            console.error(chalk.red('\n❌ Error in chat:', error));
            return 'Sorry, I encountered an error processing your message. Please try again.';
        }
    }

    async initialize() {
        try {
            console.clear();
            await this.initializeCore();
            
            console.log(chalk.blue('\n🤖 Welcome to CLI Chat with Claude 3.5!\n'));
            await this.agentUIManager.selectAgent(this.rl);
            UIUtils.showCommands();
            
            console.log(chalk.blue('\n🚀 Chat started! Type your message or command:'));
            this.rl.prompt();
        } catch (error) {
            this.emit('error', error);
            this.isRunning = false;
            process.exit(1);
        }
    }
}
