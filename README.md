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
- AWS credentials configured (`~/.aws/credentials`)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Set your AWS region and model preferences
   ```env
   AWS_REGION=us-east-1
   DEFAULT_TEMPERATURE=0.7
   MAX_TOKENS=4096
   MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
   ```

## Usage

Start the application:
```bash
npm start
```

### Available Commands

Type these commands during chat:

- `/help` - Show available commands
- `/clear` - Clear chat history
- `/save` - Save current chat session
- `/load` - Load a previous chat session
- `/dev` - Toggle developer mode
- `/preprompt` - Select a different pre-prompt style
- `/quit` - Exit the application

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
