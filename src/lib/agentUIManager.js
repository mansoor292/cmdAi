import { UIUtils } from '../cmd/uiUtils.js';

export class AgentUIManager {
    constructor(agentManager, session) {
        this.agentManager = agentManager;
        this.session = session;
    }

    async selectAgent(rl) {
        const agents = await this.agentManager.listAgents();
        
        console.log('\n📝 Choose your agent type:');
        console.log('─────────────────────────────────────────────');
        
        for (let i = 0; i < agents.length; i++) {
            const agentName = agents[i];
            const agentContent = await this.agentManager.loadAgent(agentName);
            let description;
            
            switch (agentName) {
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
                    description = 'General-purpose helpful agent';
                    break;
                default:
                    description = 'Custom agent';
            }
            
            console.log(`${i + 1}. ${agentName.charAt(0).toUpperCase() + agentName.slice(1)}`);
            console.log(`   📌 ${description}`);
            console.log(`   💡 Preview: ${agentContent.split('\n')[0]}`);
            console.log('─────────────────────────────────────────────');
        }
        
        const answer = await UIUtils.askQuestion(rl, '\nSelect a number (or press Enter for default): ');
        
        if (answer && !isNaN(answer)) {
            const index = parseInt(answer) - 1;
            if (index >= 0 && index < agents.length) {
                const selectedAgent = await this.agentManager.loadAgent(agents[index]);
                this.session.setPreprompt(selectedAgent);
                console.log(`\n✨ Using: ${agents[index].charAt(0).toUpperCase() + agents[index].slice(1)} Assistant`);
            }
        } else {
            const defaultAgent = await this.agentManager.loadAgent('default');
            this.session.setPreprompt(defaultAgent);
            console.log('\n✨ Using: Default Assistant');
        }
    }

    async handleAgentCommands(rl) {
        console.log('\n📝 Agent Management:');
        console.log('1. List all agents');
        console.log('2. Create new agent');
        console.log('3. Delete agent');
        console.log('4. View agent content');
        console.log('5. Back to chat');

        const choice = await UIUtils.askQuestion(rl, '\nSelect an option (1-5): ');

        switch (choice) {
            case '1':
                const agents = await this.agentManager.listAgents();
                console.log('\nAvailable agents:');
                agents.forEach(agent => console.log(`- ${agent}`));
                break;

            case '2':
                const name = await UIUtils.askQuestion(rl, 'Enter agent name: ');
                if (!name) {
                    console.log('Name cannot be empty');
                    break;
                }
                console.log('Enter agent instructions (press Enter twice to finish):');
                let content = '';
                let lastLine = '';
                
                while (true) {
                    const line = await UIUtils.askQuestion(rl, '');
                    if (line === '' && lastLine === '') break;
                    content += line + '\n';
                    lastLine = line;
                }
                
                await this.agentManager.saveAgent(name, content.trim());
                console.log('✅ Agent saved successfully!');
                break;

            case '3':
                const agentToDelete = await UIUtils.askQuestion(rl, 'Enter agent name to delete: ');
                if (agentToDelete === 'default') {
                    console.log('❌ Cannot delete default agent!');
                } else {
                    const success = await this.agentManager.deleteAgent(agentToDelete);
                    if (success) {
                        console.log('✅ Agent deleted successfully!');
                    } else {
                        console.log('❌ Failed to delete agent');
                    }
                }
                break;

            case '4':
                const agentToView = await UIUtils.askQuestion(rl, 'Enter agent name to view: ');
                const agentContent = await this.agentManager.loadAgent(agentToView);
                if (agentContent) {
                    console.log('\nAgent content:');
                    console.log('-------------------');
                    console.log(agentContent);
                    console.log('-------------------');
                } else {
                    console.log('❌ Agent not found');
                }
                break;

            case '5':
                return;

            default:
                console.log('Invalid option');
        }

        // Return to agent management menu unless user chose to exit
        if (choice !== '5') {
            await this.handleAgentCommands(rl);
        }
    }
}
