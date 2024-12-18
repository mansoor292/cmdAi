import { ChatSession } from '../lib/chatSession.js';
import { FileOperations } from '../lib/fileOperations.js';
import { UIUtils } from './uiUtils.js';
import { ScriptExecutor } from '../lib/scriptExecutor.js';
import { StructureProcessor } from '../lib/structureProcessor.js';

export class CommandHandler {
    constructor(session, bedrock, agentManager, agentUIManager, rl) {
        this.session = session;
        this.bedrock = bedrock;
        this.agentManager = agentManager;
        this.agentUIManager = agentUIManager;
        this.rl = rl;
        this.scriptExecutor = new ScriptExecutor(session, bedrock, this);
        this.structureProcessor = new StructureProcessor(rl, bedrock, session);
        this.devMode = false;
    }

    async handleCommand(command) {
        try {
            // Add /zip command handling
            if (command.startsWith('/zip ')) {
                const outputPath = command.slice(5).trim() || 'output';
                const result = await FileOperations.zipLastProject(outputPath);
                if (result) {
                    console.log(`\n📦 Last project zipped in: ${outputPath}`);
                }
                return;
            }

            // Existing command handling code remains the same...
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
                console.log(`\n✨ Now including last ${userPrompts} user messages and ${aiResponses} AI responses in context`);
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
                const userInstructions = args
                    .filter(arg => !arg.startsWith('--'))  // Remove all flags, not just --continue
                    .join(' ')
                    .trim();

                // Don't specify outputDir, let StructureProcessor use session path
                await this.structureProcessor.processStructure(
                    lastMessage.content,
                    userInstructions,
                    null,  // Let StructureProcessor determine output dir based on session
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
                const agentName = spaceIndex === -1 ? args : args.slice(0, spaceIndex);
                const extraInstructions = spaceIndex === -1 ? null : args.slice(spaceIndex + 1).trim();

                if (!agentName) {
                    console.log('\n❌ Please provide an agent name or "custom": /switch [name|custom] [extra instructions]');
                    return;
                }

                // Handle custom agentic AI case
                if (agentName.toLowerCase() === 'custom') {
                    if (!extraInstructions) {
                        console.log('\n❌ Please provide instructions: /switch custom [instructions]');
                        return;
                    }
                    this.session.setPreprompt(extraInstructions);
                    console.log('\n✨ Switched to custom agentic AI');
                    return;
                }

                // Handle regular agent case
                const agents = await this.agentManager.listAgents();
                if (!agents.includes(agentName)) {
                    console.log(`\n❌ Agent "${agentName}" not found. Available agents:`);
                    agents.forEach(p => console.log(`- ${p}`));
                    return;
                }

                const agentContent = await this.agentManager.loadAgent(agentName);
                if (agentContent) {
                    this.session.setPreprompt(agentContent, extraInstructions);
                    console.log(`\n✨ Switched to: ${agentName.charAt(0).toUpperCase() + agentName.slice(1)} Assistant`);
                    if (extraInstructions) {
                        console.log(`📝 Added extra instructions: ${extraInstructions}`);
                    }
                } else {
                    console.log('\n❌ Failed to load agent');
                }
                return;
            }

            // Handle commands that can be processed in the switch statement
            switch (command.toLowerCase()) {
                case '/new':
                    this.session = new ChatSession();
                    await this.session.initialize();
                    await this.agentUIManager.selectAgent(this.rl);
                    // Update structureProcessor with new session
                    this.structureProcessor = new StructureProcessor(this.rl, this.bedrock, this.session);
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
                        // Update structureProcessor with loaded session
                        this.structureProcessor = new StructureProcessor(this.rl, this.bedrock, this.session);
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
                    await this.agentUIManager.selectAgent(this.rl);
                    // Update structureProcessor with new session
                    this.structureProcessor = new StructureProcessor(this.rl, this.bedrock, this.session);
                    console.log('\n🧹 Session cleared.');
                    break;

                case '/agent':
                    await this.agentUIManager.handleAgentCommands(this.rl);
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
                    const currentAgent = this.session.preprompt;
                    const currentExtraInstructions = this.session.extraPrompt;
                    if (currentAgent) {
                        this.session.setPreprompt(currentAgent, currentExtraInstructions);
                    } else {
                        await this.agentUIManager.selectAgent(this.rl);
                    }
                    // Update structureProcessor with new session
                    this.structureProcessor = new StructureProcessor(this.rl, this.bedrock, this.session);
                    console.log('\n🔄 Session restarted with current agent.');
                    break;

                case '/dev':
                    this.devMode = !this.devMode;
                    console.log(`\n🛠️ Dev mode ${this.devMode ? 'enabled' : 'disabled'}`);
                    break;

                default:
                    console.log('\n❌ Unknown command. Type /help for available commands.');
            }
        } catch (error) {
            console.error('\n❌ Error executing command:', error);
        }
    }

    isDevMode() {
        return this.devMode;
    }
}
