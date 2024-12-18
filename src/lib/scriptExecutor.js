export class ScriptExecutor {
    constructor(session, bedrock, commandHandler) {
        this.session = session;
        this.bedrock = bedrock;
        this.commandHandler = commandHandler;
    }

    async executeScript(script) {
        const commands = script.split('|').map(cmd => cmd.trim()).filter(cmd => cmd);
        console.log('\n📜 Executing script with commands:', commands);
        
        for (const command of commands) {
            console.log(`\n▶️ Executing: ${command}`);
            
            try {
                if (command.startsWith('/')) {
                    // Handle special commands using CommandHandler
                    await this.commandHandler.handleCommand(command);
                } else {
                    // Handle regular chat messages
                    this.session.addMessage('user', command);
                    const messages = this.session.formatMessagesForBedrock();
                    const response = await this.bedrock.generateResponse(messages);
                    console.log('\nAssistant:', response, '\n');
                    this.session.addMessage('assistant', response);
                    await this.session.saveContext();
                }
                
                // Add a small delay between commands
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`\n❌ Error executing command "${command}":`, error);
                break;
            }
        }
        
        console.log('\n✅ Script execution completed');
    }
}
