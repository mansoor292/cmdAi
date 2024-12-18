# CLI Chat with Claude 3.5

A powerful command-line interface (CLI) and library for interacting with AWS Bedrock's Claude 3.5 models, providing an interactive terminal-based chat experience with advanced features for context management and customization.

## Features

- 🤖 Direct integration with AWS Bedrock's Claude 3.5 models
- 💬 Interactive CLI chat interface with real-time responses
- 🔄 Persistent chat session management
- 📝 Customizable agents for different conversation styles
- 🛠️ Developer mode for debugging and testing
- 🎨 Rich command system for managing chat sessions
- 🔧 Configurable model parameters (temperature, max tokens)
- 📚 Usable as both a CLI tool and a library

## Prerequisites

- Node.js (version 18+)
- AWS account with Bedrock access
- AWS credentials configured (`~/.aws/credentials`) with permissions to access Bedrock models

## Installation

```bash
# Install dependencies
npm install

# Start the CLI
npm start
```

## CLI Usage

The CLI provides an interactive chat interface with various commands. All commands must be entered through the CLI interface after starting it with `npm start`.

### Available Commands

Commands are entered in the CLI interface after the "You:" prompt:

- `/new` - Start a new chat session
- `/load` - Load a previous session
- `/list` - List all available sessions
- `/clear` - Clear the current session
- `/agent` - Manage agents
- `/switch [name|custom] [extra]` - Switch to a different agent
- `/file [path]` - Save last response to file
- `/enrich [u3] [a0]` - Control context enrichment
- `/processStructure [instructions] [--continue]` - Process project structure in chunks
  - Processes the last AI response as a project structure
  - Optional instructions to guide code generation
  - `--continue` flag for automatic processing without confirmations
  - Safely handles existing files:
    - Checks for existing files before processing
    - Shows warnings for existing files
    - Prompts for confirmation before overwriting (unless --continue is used)
    - Creates output directories automatically
  - Example: `/processStructure "Use TypeScript and React" --continue`
- `/script [commands]` - Run multiple commands
- `/restart` - Restart session with current agent
- `/dev` - Toggle developer mode
- `/exit` - Exit the application
- `/help` - Show available commands

**Important**: Commands must be entered in the CLI interface after starting it with `npm start`. They cannot be run directly from your terminal.

Example usage:
```bash
# First, start the CLI
npm start

# Then in the CLI interface:
You: Hello, how are you?
Assistant: I'm doing well, thank you! How can I help you today?

You: /processStructure --continue
# This will process the last AI response as a project structure
# With --continue flag, it will automatically overwrite existing files
# Without --continue, it will ask for confirmation before overwriting
```

## Library Usage

```javascript
import { ChatInterface } from './cmd/interface.js';

async function main() {
  // Initialize the chat interface
  const chat = new ChatInterface({
    // Optional configuration
    devMode: true,
    // Custom session, bedrock, or agent manager can be passed
  });

  await chat.initializeCore();

  // Programmatically send messages
  const response1 = await chat.chat('Hello, how are you?');
  console.log(response1);

  const response2 = await chat.chat('Tell me about AWS Bedrock');
  console.log(response2);
}

main().catch(console.error);
```

## Configuration

1. Copy `.env.example` to `.env`
2. Set AWS region and model preferences:
   ```env
   AWS_REGION=us-east-1
   DEFAULT_TEMPERATURE=0.7
   MAX_TOKENS=4096
   MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
   ```

### AWS Credentials

Use your default AWS profile or set specific credentials in `.env`:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

## Project Structure

```
src/
├── cli.js              # CLI entry point
├── index.js            # Library entry point
├── cmd/                # Command-line interface
│   ├── interface.js    # Main CLI interface
│   ├── commandHandler.js # Command processing
│   └── uiUtils.js     # UI utilities
├── lib/               # Core library functionality
│   ├── fsInterface.js  # File system abstraction
│   ├── fileOperations.js # File operations
│   ├── bedrockChat.js # AWS Bedrock integration
│   ├── chatSession.js # Chat session management
│   └── ... (other modules)
├── agents/            # Agent templates
└── chat_sessions/     # Saved chat sessions
```

The project is organized into two main layers:
- `cmd/`: Command-line interface specific code
- `lib/`: Core library functionality

This separation ensures:
- Clear distinction between CLI and library code
- Better maintainability and testability
- Proper abstraction of file system operations
- Easy addition of new features to either layer

## Key Capabilities

- Multiple Bedrock model support
- Persistent chat sessions
- Customizable agents
- Developer mode for debugging
- Flexible configuration
- Error handling for AWS and model interactions
- Safe file operations with existence checks and confirmations

## Contributing

Contributions are welcome! Feel free to submit issues and enhancement requests.

## License

MIT License
