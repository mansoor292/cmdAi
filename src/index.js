import dotenv from 'dotenv';
import { ChatInterface } from './lib/interface.js';

// Load environment variables
dotenv.config();

// Start the chat interface
const chat = new ChatInterface();
chat.initialize();