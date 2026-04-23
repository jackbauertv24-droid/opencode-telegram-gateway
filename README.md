# OpenCode Telegram Gateway

A Telegram bot gateway for OpenCode serve that allows you to interact with OpenCode via Telegram.

## Features

- **Telegram Bot Interface**: Interact with OpenCode through Telegram messages
- **User Authentication**: Pre-approved user list managed via CLI
- **Session Management**: Create, switch, list, and delete sessions
- **Permission Handling**: Interactive permission prompts on Telegram
- **Auto-approve Toggle**: Optionally auto-approve all permissions
- **Message Chunking**: Long responses split into Telegram-friendly chunks
- **File Resend**: Get last response as a `.txt` file attachment

## Prerequisites

- Node.js 20+ or Bun
- OpenCode CLI installed (`curl -fsSL https://opencode.ai/install | bash`)
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

## Installation

```bash
# Clone or copy the project
cd opencode-telegram-gateway

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and add your Telegram bot token
# TELEGRAM_BOT_TOKEN=your_bot_token_here
```

## Configuration

Edit `.env`:

```bash
# Telegram Bot Token (required)
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# OpenCode Serve URL
OPENCODE_SERVE_URL=http://localhost:4096

# Auto-start OpenCode serve if not running
OPENCODE_SERVE_AUTO_START=true

# Working directory for OpenCode
OPENCODE_WORKING_DIR=.

# Database path
DATABASE_PATH=./data/gateway.db
```

## Usage

### CLI Commands

```bash
# Start the gateway
npx tsx src/cli/index.ts start

# Check status
npx tsx src/cli/index.ts status

# Manage users
npx tsx src/cli/index.ts users list
npx tsx src/cli/index.ts users add <telegram_id> [display_name]
npx tsx src/cli/index.ts users remove <telegram_id>
npx tsx src/cli/index.ts users approve <telegram_id> [display_name]
```

### Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Show welcome message and your Telegram ID |
| `/new [title]` | Create a new session |
| `/sessions` | List all your sessions |
| `/switch <id>` | Switch to a different session |
| `/delete <id>` | Delete a session |
| `/status` | Show current session info |
| `/resend` | Get last response as .txt file |
| `/approve on/off` | Toggle auto-approve permissions |
| `/cancel` | Cancel current operation |
| `/help` | Show help message |

### Quick Start

1. **Create a Telegram Bot**
   - Message [@BotFather](https://t.me/BotFather)
   - Use `/newbot` and follow instructions
   - Copy the bot token

2. **Configure the Gateway**
   ```bash
   # Add your bot token to .env
   echo "TELEGRAM_BOT_TOKEN=your_token_here" >> .env
   ```

3. **Start the Gateway**
   ```bash
   npx tsx src/cli/index.ts start
   ```

4. **Get Your Telegram ID**
   - Message your bot with `/start`
   - It will reply with your Telegram ID

5. **Approve Yourself**
   ```bash
   # In another terminal
   npx tsx src/cli/index.ts users approve 123456789 "Your Name"
   ```

6. **Start Using**
   - Send `/new` to create a session
   - Send any message to interact with OpenCode

## Architecture

```
┌─────────────────┐
│  Telegram Bot   │
│   (grammY)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│  Message Router │───▶│  Session Store  │
│                 │    │   (SQLite)      │
└────────┬────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│ OpenCode Client │
│   (HTTP/SSE)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ opencode serve  │
│  (port 4096)    │
└─────────────────┘
```

## Files

```
src/
├── index.ts              # Main entry point
├── config.ts             # Configuration
├── logger.ts             # Logging
├── types.ts              # TypeScript types
├── cli/
│   ├── index.ts          # CLI entry
│   └── commands/         # CLI commands
├── bot/
│   ├── index.ts          # Bot setup
│   ├── commands/         # Telegram commands
│   ├── handlers/         # Message handlers
│   └── middleware/       # Auth middleware
├── opencode/
│   ├── client.ts         # HTTP client
│   └── sse.ts            # SSE subscriber
├── store/
│   ├── db.ts             # SQLite setup
│   ├── users.ts          # User CRUD
│   ├── sessions.ts       # Session CRUD
│   ├── permissions.ts    # Permission CRUD
│   └── cache.ts          # Message cache
├── process/
│   └── opencode.ts       # Process manager
└── utils/
    ├── chunk.ts          # Message chunking
    └── format.ts         # Text formatting
```

## Development

```bash
# Development mode with auto-reload
npm run dev

# Type check
npx tsc --noEmit

# Build
npm run build
```

## Security Notes

- Users must be pre-approved via CLI
- Telegram ID is exposed to unauth'd users (for approval process)
- Auto-approve mode will approve all permissions without prompting
- Database stores Telegram IDs and session mappings

## License

MIT
