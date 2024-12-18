import { UIUtils } from './uiUtils.js';

export class PromptManager {
    constructor(prepromptManager, session) {
        this.prepromptManager = prepromptManager;
        this.session = session;
    }

    async selectPreprompt(rl) {
        const prompts = await this.prepromptManager.listPreprompts();
        
        console.log('\n📝 Choose your assistant type:');
        console.log('─────────────────────────────────────────────');
        
        for (let i = 0; i < prompts.length; i++) {
            const promptName = prompts[i];
            const promptContent = await this.prepromptManager.loadPreprompt(promptName);
            let description;
            
            switch (promptName) {
                case 'code':
                    description = 'Structured code-related responses in JSON format';
                    break;
                case 'creative':
                    description = 'Creative writing and brainstorming assistance';
                    break;
                case 'technical':
                    description = 'Technical explanations and code examples';
                    break;
                case 'default':
                    description = 'General-purpose helpful assistant';
                    break;
                default:
                    description = 'Custom assistant';
            }
            
            console.log(`${i + 1}. ${promptName.charAt(0).toUpperCase() + promptName.slice(1)}`);
            console.log(`   📌 ${description}`);
            console.log(`   💡 Preview: ${promptContent.split('\n')[0]}`);
            console.log('─────────────────────────────────────────────');
        }
        
        const answer = await UIUtils.askQuestion(rl, '\nSelect a number (or press Enter for default): ');
        
        if (answer && !isNaN(answer)) {
            const index = parseInt(answer) - 1;
            if (index >= 0 && index < prompts.length) {
                const selectedPrompt = await this.prepromptManager.loadPreprompt(prompts[index]);
                this.session.setPreprompt(selectedPrompt);
                console.log(`\n✨ Using: ${prompts[index].charAt(0).toUpperCase() + prompts[index].slice(1)} Assistant`);
            }
        } else {
            const defaultPrompt = await this.prepromptManager.loadPreprompt('default');
            this.session.setPreprompt(defaultPrompt);
            console.log('\n✨ Using: Default Assistant');
        }
    }

    async handlePromptCommands(rl) {
        console.log('\n📝 Preprompt Management:');
        console.log('1. List all preprompts');
        console.log('2. Create new preprompt');
        console.log('3. Delete preprompt');
        console.log('4. View preprompt content');
        console.log('5. Back to chat');

        const choice = await UIUtils.askQuestion(rl, '\nSelect an option (1-5): ');

        switch (choice) {
            case '1':
                const prompts = await this.prepromptManager.listPreprompts();
                console.log('\nAvailable preprompts:');
                prompts.forEach(prompt => console.log(`- ${prompt}`));
                break;

            case '2':
                const name = await UIUtils.askQuestion(rl, 'Enter preprompt name: ');
                if (!name) {
                    console.log('Name cannot be empty');
                    break;
                }
                console.log('Enter preprompt content (press Enter twice to finish):');
                let content = '';
                let lastLine = '';
                
                while (true) {
                    const line = await UIUtils.askQuestion(rl, '');
                    if (line === '' && lastLine === '') break;
                    content += line + '\n';
                    lastLine = line;
                }
                
                await this.prepromptManager.savePreprompt(name, content.trim());
                console.log('✅ Preprompt saved successfully!');
                break;

            case '3':
                const promptToDelete = await UIUtils.askQuestion(rl, 'Enter preprompt name to delete: ');
                if (promptToDelete === 'default') {
                    console.log('❌ Cannot delete default preprompt!');
                } else {
                    const success = await this.prepromptManager.deletePreprompt(promptToDelete);
                    if (success) {
                        console.log('✅ Preprompt deleted successfully!');
                    } else {
                        console.log('❌ Failed to delete preprompt');
                    }
                }
                break;

            case '4':
                const promptToView = await UIUtils.askQuestion(rl, 'Enter preprompt name to view: ');
                const promptContent = await this.prepromptManager.loadPreprompt(promptToView);
                if (promptContent) {
                    console.log('\nPreprompt content:');
                    console.log('-------------------');
                    console.log(promptContent);
                    console.log('-------------------');
                } else {
                    console.log('❌ Preprompt not found');
                }
                break;

            case '5':
                return;

            default:
                console.log('Invalid option');
        }

        // Return to prompt management menu unless user chose to exit
        if (choice !== '5') {
            await this.handlePromptCommands(rl);
        }
    }
}
