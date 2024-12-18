import { ChatSession } from './chatSession.js';
import { FileOperations } from './fileOperations.js';
import { UIUtils } from './uiUtils.js';
import { ScriptExecutor } from './scriptExecutor.js';
import { StructureProcessor } from './structureProcessor.js';

export class CommandHandler {
    constructor(session, bedrock, prepromptManager, promptManager, rl) {
        this.session = session;
        this.bedrock = bedrock;
        this.prepromptManager = prepromptManager;
        this.promptManager = promptManager;
        this.rl = rl;
        this.scriptExecutor = new ScriptExecutor(session, bedrock, this);
        this.structureProcessor = new StructureProcessor(rl, bedrock);
        this.devMode = false;
    }

    async handleCommand(command) {
        // Handle special commands that need to be processed before the switch statement
        if (command.startsWith('/script ')) {
            const script = command.slice(8).trim();
            if (!script) {
                console.log('\n❌ Please provide commands: /script command1 | command2 | command3');
                return;
            }
            await this.scriptExecutor.executeScript(script);
            return;
        }

        if (command.startsWith('/enrich ')) {
            const args = command.slice(8).trim().split(' ');
            let userPrompts = 3; // default
            let aiResponses = 0; // default
            
            for (const arg of args) {
                if (arg.startsWith('u')) {
                    userPrompts = parseInt(arg.slice(1)) || 3;
                } else if (arg.startsWith('a')) {
                    aiResponses = parseInt(arg.slice(1)) || 0;
                }
            }
            
            this.session.setPromptLimits(userPrompts, aiResponses);
            console.log(`\n✨ Now including last ${userPrompts} user prompts and ${aiResponses} AI responses in context`);
            return;
        }

        if (command.startsWith('/processStructure')) {
            const lastMessage = this.session.messages.filter(msg => msg.role === 'assistant').pop();
            if (!lastMessage) {
                console.log('\n❌ No assistant response to process');
                return;
            }

            // Improved flag parsing
            const args = command.slice(16).trim().split(' ');
            const continueFlag = args.includes('--continue');
            const userPrompt = args
                .filter(arg => !arg.startsWith('--'))  // Remove all flags, not just --continue
                .join(' ')
                .trim();

            await this.structureProcessor.processStructure(
                lastMessage.content,
                userPrompt,
                'output',
                continueFlag
            );
            return;
        }

        if (command.startsWith('/file ')) {
            const filePath = command.slice(6).trim();
            if (!filePath) {
                console.log('\n❌ Please provide a file path: /file [path]');
                return;
            }

            const lastMessage = this.session.messages.filter(msg => msg.role === 'assistant').pop();
            if (!lastMessage) {
                console.log('\n❌ No assistant response to save');
                return;
            }

            await FileOperations.saveResponseToFile(filePath, lastMessage.content);
            return;
        }

        if (command.startsWith('/switch ')) {
            const args = command.slice(8).trim();
            const spaceIndex = args.indexOf(' ');
            const promptName = spaceIndex === -1 ? args : args.slice(0, spaceIndex);
            const extraPrompt = spaceIndex === -1 ? null : args.slice(spaceIndex + 1).trim();

            if (!promptName) {
                console.log('\n❌ Please provide a preprompt name or "custom": /switch [name|custom] [extra prompt]');
                return;
            }

            // Handle custom prompt case
            if (promptName.toLowerCase() === 'custom') {
                if (!extraPrompt) {
                    console.log('\n❌ Please provide a prompt: /switch custom [prompt]');
                    return;
                }
                this.session.setPreprompt(extraPrompt);
                console.log('\n✨ Switched to custom prompt');
                return;
            }

            // Handle regular preprompt case
            const prompts = await this.prepromptManager.listPreprompts();
            if (!prompts.includes(promptName)) {
                console.log(`\n❌ Preprompt "${promptName}" not found. Available preprompts:`);
                prompts.forEach(p => console.log(`- ${p}`));
                return;
            }

            const promptContent = await this.prepromptManager.loadPreprompt(promptName);
            if (promptContent) {
                this.session.setPreprompt(promptContent, extraPrompt);
                console.log(`\n✨ Switched to: ${promptName.charAt(0).toUpperCase() + promptName.slice(1)} Assistant`);
                if (extraPrompt) {
                    console.log(`📝 Added extra instructions: ${extraPrompt}`);
                }
            } else {
                console.log('\n❌ Failed to load preprompt');
            }
            return;
        }

        // Handle commands that can be processed in the switch statement
        switch (command.toLowerCase()) {
            case '/new':
                this.session = new ChatSession();
                await this.session.initialize();
                await this.promptManager.selectPreprompt(this.rl);
                console.log(`\n✨ Started new session: ${this.session.sessionId}`);
                break;

            case '/load':
                const sessions = await this.session.listSessions();
                if (sessions.length === 0) {
                    console.log('\n❌ No saved sessions found.');
                    return;
                }

                console.log('\n📚 Available sessions:');
                sessions.forEach(s => {
                    console.log(`\nID: ${s.id}`);
                    console.log(`Date: ${s.timestamp}`);
                    console.log(`Messages: ${s.messageCount}`);
                    console.log('---');
                });

                const sessionId = await UIUtils.askQuestion(this.rl, '\nEnter session ID to load: ');
                if (await this.session.loadSession(sessionId)) {
                    console.log('✅ Session loaded successfully!');
                } else {
                    console.log('❌ Failed to load session.');
                }
                break;

            case '/list':
                const availableSessions = await this.session.listSessions();
                if (availableSessions.length === 0) {
                    console.log('\n❌ No saved sessions found.');
                    return;
                }
                console.log('\n📚 Saved sessions:');
                availableSessions.forEach(s => {
                    console.log(`\nID: ${s.id}`);
                    console.log(`Date: ${s.timestamp}`);
                    console.log(`Messages: ${s.messageCount}`);
                    console.log('---');
                });
                break;

            case '/clear':
                this.session = new ChatSession();
                await this.session.initialize();
                await this.promptManager.selectPreprompt(this.rl);
                console.log('\n🧹 Session cleared.');
                break;

            case '/prompt':
                await this.promptManager.handlePromptCommands(this.rl);
                break;

            case '/help':
                UIUtils.showCommands();
                break;

            case '/exit':
                console.log('\n👋 Goodbye!');
                this.rl.close();
                process.exit(0);
                break;

            case '/restart':
                this.session = new ChatSession();
                await this.session.initialize();
                const currentPreprompt = this.session.preprompt;
                const currentExtraPrompt = this.session.extraPrompt;
                if (currentPreprompt) {
                    this.session.setPreprompt(currentPreprompt, currentExtraPrompt);
                } else {
                    await this.promptManager.selectPreprompt(this.rl);
                }
                console.log('\n🔄 Session restarted with current preprompt.');
                break;

            case '/dev':
                this.devMode = !this.devMode;
                console.log(`\n🛠️ Dev mode ${this.devMode ? 'enabled' : 'disabled'}`);
                break;

            default:
                console.log('\n❌ Unknown command. Type /help for available commands.');
        }
    }

    // Method to check if dev mode is enabled
    isDevMode() {
        return this.devMode;
    }
}
