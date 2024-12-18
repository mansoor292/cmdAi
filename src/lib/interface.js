import { BedrockChat } from './bedrockChat.js';
import { ChatSession } from './chatSession.js';
import { PrepromptManager } from './prepromptManager.js';
import { UIUtils } from './uiUtils.js';
import { PromptManager } from './promptManager.js';
import { CommandHandler } from './commandHandler.js';

export class ChatInterface {
    constructor() {
        this.session = new ChatSession();
        this.bedrock = new BedrockChat();
        this.prepromptManager = new PrepromptManager();
        this.rl = UIUtils.createReadlineInterface();
        this.promptManager = new PromptManager(this.prepromptManager, this.session);
        this.commandHandler = new CommandHandler(
            this.session,
            this.bedrock,
            this.prepromptManager,
            this.promptManager,
            this.rl
        );
    }

    async initialize() {
        try {
            console.clear();
            // Initialize Bedrock first to select model, passing the readline interface
            const bedrockInitialized = await this.bedrock.initialize(this.rl);
            if (!bedrockInitialized) {
                console.error('Failed to initialize Bedrock chat');
                process.exit(1);
            }
            
            await this.session.initialize();
            await this.prepromptManager.initialize();
            console.log('\n🤖 Welcome to CLI Chat with Claude 3.5!\n');
            await this.promptManager.selectPreprompt(this.rl);
            UIUtils.showCommands();
            this.startChat();
        } catch (error) {
            console.error('Failed to initialize chat interface:', error);
            process.exit(1);
        }
    }

    async startChat() {
        const { startSpinner, stopSpinner } = UIUtils.createSpinner();

        const askQuestion = () => {
            this.rl.question('\nYou: ', async (input) => {
                if (input.trim() === '') {
                    askQuestion();
                    return;
                }

                if (input.startsWith('/')) {
                    await this.commandHandler.handleCommand(input);
                    askQuestion();
                    return;
                }

                try {
                    // Add user message to context
                    this.session.addMessage('user', input);
                    
                    // Start thinking animation
                    startSpinner();
                    
                    // Get formatted messages for Bedrock
                    const messages = this.session.formatMessagesForBedrock(this.commandHandler.isDevMode());
                    
                    // Generate response using Bedrock
                    const response = await this.bedrock.generateResponse(messages, this.commandHandler.isDevMode());
                    
                    // Stop thinking animation
                    stopSpinner();
                    
                    // Display response
                    console.log('\nAssistant:', response, '\n');
                    
                    // Add assistant response to context
                    this.session.addMessage('assistant', response);
                    
                    // Save context after each exchange
                    await this.session.saveContext();
                } catch (error) {
                    stopSpinner();
                    console.error('\n❌ Error in chat interaction:', error);
                }
                
                askQuestion();
            });
        };

        console.log('\n🚀 Chat started! Type your message or command:');
        askQuestion();
    }
}
