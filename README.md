# CLI Chat with Claude 3.5

A powerful command-line interface (CLI) chat application that integrates with AWS Bedrock's Claude 3.5 models, providing an interactive terminal-based chat experience with advanced features for context management and customization.

## Features

- 🤖 Direct integration with AWS Bedrock's Claude 3.5 models
- 💬 Interactive CLI chat interface with real-time responses
- 🔄 Persistent chat session management
- 📝 Customizable pre-prompts for different conversation styles
- 🛠️ Developer mode for debugging and testing
- 🎨 Rich command system for managing chat sessions
- 🔧 Configurable model parameters (temperature, max tokens)

## Prerequisites

- Node.js installed on your system
- AWS account with Bedrock access
- AWS credentials configured (`~/.aws/credentials`) with permissions to access Bedrock models
  - Your AWS credentials must have explicit access to the Bedrock models you want to use
  - Run `node model-list.js` in the root directory to see which models your AWS profile has access to
  - Use any of the available model IDs in your `.env` configuration

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Check available models:
   ```bash
   node model-list.js
   ```
   This will show you which Bedrock models your AWS profile has access to. You'll need this information for the next step.

4. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Set your AWS region and model preferences
   - Use a model ID from the list generated in step 3
   ```env
   AWS_REGION=us-east-1
   DEFAULT_TEMPERATURE=0.7
   MAX_TOKENS=4096
   MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0  # Use an available model from model-list.js
   ```

## Usage

Start the application:
```bash
npm start
```

### Available Commands

Type these commands during chat:

- `/new` - Start a new chat session
- `/load` - Load a previous session
- `/list` - List all available sessions
- `/clear` - Clear the current session
- `/prompt` - Manage preprompts
- `/switch` - Switch preprompt or set custom prompt:
  1. Use saved preprompt: `/switch [name] [extra prompt]`
     - `[name]`: Name of the preprompt to switch to
     - `[extra prompt]`: Optional additional instructions
     - Example: `/switch technical focus on performance`
  2. Use custom prompt: `/switch custom [prompt]`
     - Sets a completely custom system prompt
     - Example: `/switch custom You are a SQL expert`
- `/file` - Save last response to file (`/file [path]`)
- `/enrich` - Control context enrichment (`/enrich u[number] a[number]`)
  - `u[number]`: Number of user prompts to include (default: 3)
  - `a[number]`: Number of AI responses to include (default: 0)
  - Example: `/enrich u5 a3` - Include last 5 user prompts and 3 AI responses
- `/processfile` - Create project structure from JSON response
  - Must be valid JSON with project.rootDirectory structure
- `/processStructure [--continue] [prompt]` - Process project structure in chunks
  - Processes JSON structure with optional custom prompt
  - `--continue`: Automatically process all chunks without waiting
  - Shows each chunk with structure prompt and custom prompt
- `/script` - Run a script of commands separated by | (`/script command1 | command2 | command3`)
- `/restart` - Restart session with current preprompt
- `/dev` - Toggle developer mode (shows full prompt before sending)
- `/exit` - Exit the application
- `/help` - Show these commands

## Project Structure

```
src/
├── index.js                 # Application entry point
├── lib/
│   ├── bedrockChat.js      # AWS Bedrock integration
│   ├── bedrockModelUtils.js # Model utility functions
│   ├── chatSession.js      # Chat session management
│   ├── commandHandler.js    # Command processing
│   ├── interface.js        # Main chat interface
│   ├── prepromptManager.js # Pre-prompt management
│   ├── promptManager.js    # Prompt handling
│   └── uiUtils.js         # UI utilities
├── preprompts/             # Pre-prompt templates
└── chat_sessions/         # Saved chat sessions
```

## Configuration

The application uses AWS credentials from your default AWS profile. If you need to use different credentials, you can uncomment and set the following in your `.env` file:

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

## Features in Detail

### Pre-prompts
The application supports different conversation styles through pre-prompts, located in the `preprompts/` directory. These can be switched during chat using the `/preprompt` command.

### Chat Sessions
- Conversations are automatically saved after each exchange
- Previous sessions can be loaded using the `/load` command
- Clear the current session with `/clear`

### Developer Mode
Toggle developer mode with `/dev` to see:
- Raw model responses
- Debugging information
- Context management details

## AWS Bedrock Integration

The application integrates with AWS Bedrock's Claude 3.5 models, supporting:
- Multiple model variants (configurable via MODEL_ID)
- Adjustable response parameters (temperature, max tokens)
- Streaming responses for real-time interaction

## Error Handling

The application includes robust error handling for:
- AWS connectivity issues
- Model response failures
- File system operations
- Invalid commands or inputs

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License.
