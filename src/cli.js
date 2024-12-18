#!/usr/bin/env node
import dotenv from 'dotenv';
import { ChatInterface } from './cmd/interface.js';

// Load environment variables
dotenv.config();

// Keep track of the chat interface
let chat = null;

// Handle process termination
process.on('SIGINT', () => {
    if (chat && chat.rl) {
        chat.rl.close();
    }
    console.log('\n\n👋 Goodbye!');
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('\n❌ Fatal error:', error);
    if (chat && chat.rl) {
        chat.rl.close();
    }
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('\n❌ Unhandled promise rejection:', error);
    if (chat && chat.rl) {
        chat.rl.close();
    }
    process.exit(1);
});

// Start the chat interface
async function runCLI() {
    try {
        chat = new ChatInterface();
        
        // Handle chat interface errors
        chat.on('error', (error) => {
            console.error('\n❌ Chat interface error:', error);
            // Don't exit, let the chat continue
        });

        await chat.initialize();
    } catch (error) {
        console.error('\n❌ Failed to start CLI:', error);
        if (chat && chat.rl) {
            chat.rl.close();
        }
        process.exit(1);
    }
}

// Run the CLI
runCLI().catch(error => {
    console.error('\n❌ Fatal error:', error);
    if (chat && chat.rl) {
        chat.rl.close();
    }
    process.exit(1);
});
