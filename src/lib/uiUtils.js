import readline from 'readline';

export class UIUtils {
    static createReadlineInterface() {
        return readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    static async askQuestion(rl, question) {
        return new Promise((resolve) => {
            rl.question(question, resolve);
        });
    }

    static showCommands() {
        console.log('\nAvailable commands:');
        console.log('/new     - Start a new chat session');
        console.log('/load    - Load a previous session');
        console.log('/list    - List all available sessions');
        console.log('/clear   - Clear the current session');
        console.log('/prompt  - Manage preprompts');
        console.log('/switch  - Switch preprompt or set custom prompt:');
        console.log('            1. Use saved preprompt: /switch [name] [extra prompt]');
        console.log('               [name]: Name of the preprompt to switch to');
        console.log('               [extra prompt]: Optional additional instructions');
        console.log('               Example: /switch technical focus on performance');
        console.log('            2. Use custom prompt: /switch custom [prompt]');
        console.log('               Sets a completely custom system prompt');
        console.log('               Example: /switch custom You are a SQL expert');
        console.log('/file    - Save last response to file (/file [path])');
        console.log('/enrich  - Control context enrichment (/enrich u[number] a[number])');
        console.log('            u[number]: Number of user prompts to include (default: 3)');
        console.log('            a[number]: Number of AI responses to include (default: 0)');
        console.log('            Example: /enrich u5 a3 - Include last 5 user prompts and 3 AI responses');
        console.log('/processfile - Create project structure from JSON response');
        console.log('            Must be valid JSON with project.rootDirectory structure');
        console.log('/processStructure [--continue] [prompt] - Process project structure in chunks');
        console.log('            Processes JSON structure with optional custom prompt');
        console.log('            --continue: Automatically process all chunks without waiting');
        console.log('            Shows each chunk with structure prompt and custom prompt');
        console.log('/script  - Run a script of commands separated by | (/script command1 | command2 | command3)');
        console.log('/restart - Restart session with current preprompt');
        console.log('/dev     - Toggle developer mode (shows full prompt before sending)');
        console.log('/exit    - Exit the application');
        console.log('/help    - Show these commands');
        console.log('');
    }

    static createSpinner() {
        const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let spinnerIndex = 0;
        let spinnerInterval;

        const startSpinner = () => {
            spinnerInterval = setInterval(() => {
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(`${spinners[spinnerIndex]} Assistant is thinking...`);
                spinnerIndex = (spinnerIndex + 1) % spinners.length;
            }, 80);
        };

        const stopSpinner = () => {
            clearInterval(spinnerInterval);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        };

        return { startSpinner, stopSpinner };
    }
}
