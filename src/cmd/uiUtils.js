import readline from 'readline';
import chalk from 'chalk';

export class UIUtils {
    static rl = null;

    static createReadlineInterface() {
        if (!this.rl) {
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            this.rl.setPrompt(chalk.blue('You: '));
        }
        return this.rl;
    }

    static showThinking() {
        process.stdout.write('\r' + chalk.yellow('Thinking...'));
    }

    static clearThinking() {
        process.stdout.write('\r\x1B[K');
    }

    static async askQuestion(rl, question) {
        return new Promise((resolve) => {
            rl.question(chalk.cyan(question), (answer) => {
                resolve(answer);
            });
        });
    }

    static showCommands() {
        console.log('\n📝 Available Commands:');
        console.log('/help - Show this help message');
        console.log('/new - Start a new chat session');
        console.log('/clear - Clear current session');
        console.log('/restart - Restart session with current agent');
        console.log('/load - Load a previous session');
        console.log('/list - List saved sessions');
        console.log('/agent - Manage agents');
        console.log('/switch [name|custom] [extra] - Switch to a different agent');
        console.log('/enrich [u3] [a0] - Include context from previous messages');
        console.log('/file [path] - Save last response to file');
        console.log('/processStructure [--continue] - Process project structure');
        console.log('/zip [path] - Zip last processed project');
        console.log('/script [commands] - Run multiple commands');
        console.log('/dev - Toggle dev mode');
        console.log('/exit - Exit the chat');
    }
}
