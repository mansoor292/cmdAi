# CLI Chat Application

A command-line interface chat application powered by AWS Bedrock, supporting multiple language models.

## Features

- Interactive chat interface with AWS Bedrock models
- Session management with persistent storage
- Customizable preprompts for different conversation contexts
- Configurable conversation history enrichment
- Command system for managing chats and preprompts
- Project structure generation and code completion
- Environment configuration support
- Multiple model support with testing utilities

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your AWS credentials and configuration

## Usage

Start the application:
```bash
npm start
```

### Available Commands

- `/new` - Start a new chat session
- `/load` - Load a previous session
- `/list` - List all available sessions
- `/clear` - Clear the current session
- `/prompt` - Manage preprompts
- `/switch` - Switch preprompt or set custom prompt:
  1. Use saved preprompt: `/switch [name] [extra prompt]`
     - Example: `/switch technical focus on performance`
  2. Use custom prompt: `/switch custom [prompt]`
     - Example: `/switch custom You are a SQL expert`
- `/enrich` - Control conversation history (/enrich u[number] a[number])
  - u[number]: Number of user prompts to include (default: 3)
  - a[number]: Number of AI responses to include (default: 0)
  - Example: `/enrich u5 a3` includes last 5 user prompts and 3 AI responses
- `/file` - Save last response to file (/file [path])
- `/processfile` - Create project structure from JSON response
- `/processStructure [prompt]` - Process project structure in chunks with AI code generation
- `/script` - Run a script of commands separated by | (/script command1 | command2)
- `/exit` - Exit the application
- `/help` - Show commands

### Conversation Context Control

The application provides two ways to control the conversation context:

1. **Preprompt System** (`/switch` command):
   - Switch between saved preprompts: `/switch technical`
   - Add extra instructions: `/switch technical focus on performance`
   - Use custom prompt: `/switch custom You are a SQL expert`
   - Settings persist across session saves/loads

2. **History Enrichment** (`/enrich` command):
   - Control how much conversation history is included
   - Configure user prompts: `/enrich u5` (include last 5 user messages)
   - Configure AI responses: `/enrich a3` (include last 3 AI responses)
   - Combine both: `/enrich u5 a3`
   - Default: 3 user prompts, 0 AI responses
   - Settings persist across session saves/loads

### Project Structure Processing

The `/processStructure` command processes JSON project structures and generates code:

1. Takes a JSON structure defining a project layout:
```json
{
  "project": {
    "rootDirectory": {
      "name": "project-name",
      "contents": {
        "files": [...],
        "directories": [...]
      }
    }
  }
}
```

2. Processes files in chunks of 3 for manageable AI responses
3. Generates code for each file based on the project context
4. Creates files in their correct directory structure
5. Saves AI responses in a .responses directory for reference

Optional: Add custom requirements with `/processStructure "Add TypeScript types"`.

### Managing Preprompts

Use the `/prompt` command to:
1. List all preprompts
2. Create new preprompt
3. Delete existing preprompt
4. View preprompt content

## Project Structure

```
.
├── src/
│   ├── index.js
│   └── lib/
│       ├── bedrockChat.js
│       ├── bedrockModelUtils.js
│       ├── chatSession.js
│       ├── commandHandler.js
│       ├── fileOperations.js
│       ├── fileProcessor.js
│       ├── interface.js
│       ├── jsonUtils.js
│       ├── prepromptManager.js
│       ├── structureProcessor.js
│       └── examples/
│           ├── modelExample.js
│           ├── testAllModels.js
│           └── testStructureProcessor.js
├── chat_sessions/
├── preprompts/
│   ├── code.txt
│   ├── creative.txt
│   ├── default.txt
│   ├── structure.txt
│   └── technical.txt
├── .env
├── .gitignore
├── package.json
└── README.md
```

## Testing and Examples

The project includes several utility files for testing and demonstrating functionality:

- `test-available-models.js` - Test AWS Bedrock model availability
- `embedding-chat-example.js` - Example of chat with embeddings
- `model-list.js` - List of supported models
- `model.json` - Model configuration
- `testStructureProcessor.js` - Example of project structure processing

## Environment Variables

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (default: us-east-1)
- `DEFAULT_TEMPERATURE` - Model temperature (default: 0.7)
- `MAX_TOKENS` - Maximum tokens per response (default: 1024)
- `MODEL_ID` - Bedrock model ID

## License

MIT
