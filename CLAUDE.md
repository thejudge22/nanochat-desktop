# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NanoChat Desktop is a cross-platform desktop client for the NanoChat AI chat service, built with Tauri 2.x. It combines a Rust backend with a Svelte 5 frontend to create a native desktop application.

## GitHub CLI Integration

The project uses GitHub CLI (`gh`) for streamlined workflows. See [`GH_CLI.md`](GH_CLI.md) for complete documentation.

**Branch-based versioning**: When creating releases, use branch names like `v03`, `v12`, etc. The release script will automatically:
- Convert `v03` → version `0.3.0`
- Convert `v12` → version `1.2.0`
- Update `package.json` and `src-tauri/tauri.conf.json`
- Create git tag `v0.3.0` or `v1.2.0`

Quick commands:
- `npm run release` - Create draft release (auto-detects version from branch)
- `npm run pr` - Create pull request
- `npm run issues` - List issues

## Development Commands

### Frontend Development
```bash
npm run dev           # Start Vite dev server (frontend only)
npm run build         # Build production bundle
npm run preview       # Preview production build
npm run check         # TypeScript type checking with svelte-check
```

### Tauri Desktop App
```bash
npm run tauri:dev           # Start Tauri development mode (full app)
npm run tauri:build         # Build desktop app for distribution
npm run tauri:build:appimage  # Build AppImage with Fedora 42+/Toolbx workarounds
./build.sh                  # Full build with all workarounds (recommended for Linux)
```

#### Linux Build Notes (Fedora 42+, Toolbx, modern distros)

On modern Linux distributions that only have libfuse3 (not libfuse2) or use newer GCC with `.relr.dyn` ELF sections, the AppImage build requires special environment variables:

```bash
# Required for AppImage builds on libfuse3-only systems:
export APPIMAGE_EXTRACT_AND_RUN=1  # Runs AppImages by extracting first (no FUSE needed)
export NO_STRIP=1                   # Skips stripping to avoid .relr.dyn section errors
```

The `./build.sh` script and `npm run tauri:build:appimage` automatically set these.

### Rust Backend
```bash
cd src-tauri
cargo build           # Build Rust code
cargo test            # Run Rust tests
cargo clippy          # Lint Rust code
```

## Architecture

### Hybrid Frontend-Backend Architecture

The application uses a client-server pattern where the Rust backend handles system-level operations and the Svelte frontend manages UI and application logic.

#### Frontend (TypeScript/Svelte)
- **Entry point**: `src/main.ts` mounts the Svelte app
- **Root component**: `src/App.svelte` handles initial config loading and routing
- **State management**: Svelte stores in `src/lib/stores/`
  - `config.ts` - API server configuration and auth
  - `conversations.ts` - Conversation list and selection
  - `chat.ts` - Message polling and real-time updates
  - `models.ts` - AI model selection

#### Backend (Rust)
- **Entry point**: `src-tauri/src/main.rs` → `lib.rs`
- **Config module**: `src-tauri/src/config.rs` handles TOML config file persistence
- **Tauri commands**: Exposed to frontend via `invoke()`
  - `get_config()` - Load configuration from disk
  - `save_config()` - Persist configuration
  - `validate_connection()` - Test API connectivity

### Data Flow

1. **Startup**: App loads → Check `config.toml` → Show Settings if invalid → Load main UI
2. **Chat flow**: User types message → `chatStore.sendMessage()` → API generates response → Polling detects new assistant message → UI updates
3. **Configuration flow**: Settings UI → `save_config()` → Rust writes to `~/.config/nanochat-desktop/config.toml`

### Polling Mechanism

The app uses a custom polling system to track AI response generation:

- Polls every 500ms for up to 60 seconds (120 attempts)
- Tracks initial message/assistant counts before sending
- Stops when a **new** assistant message with non-empty content is detected
- Critical: Assistant messages are created before content is generated, so polling checks for actual content (`content` or `contentHtml` fields)

See `src/lib/stores/chat.ts:124-186` for polling implementation.

### API Client

The frontend communicates with the NanoChat API server through `src/lib/api/client.ts`:

- Uses Tauri's HTTP plugin (`@tauri-apps/plugin-http`) instead of fetch
- Automatic Bearer token auth from config
- Centralized error handling with `ApiError` type
- Three request types: `apiRequest<T>` (JSON), `apiRequestBlob` (files), `apiRequestRaw` (streaming)

API modules in `src/lib/api/`:
- `conversations.ts` - CRUD for conversations
- `messages.ts` - Message generation and retrieval
- `models.ts` - Model listing
- `assistants.ts` - Assistant management
- `projects.ts` - Project/workspace management
- `storage.ts` - File uploads/downloads

## Configuration

Config is stored as TOML at `~/.config/nanochat-desktop/config.toml` (Linux), `~/Library/Application Support/nanochat-desktop/config.toml` (macOS), or `%APPDATA%\nanochat-desktop\config.toml` (Windows).

```toml
server_url = "https://api.example.com"
api_key = "your-api-key"
```

The Rust backend handles config I/O. The frontend calls Tauri commands to read/write.

## Key Technologies

- **Frontend**: Svelte 5, TypeScript, Vite
- **Backend**: Rust, Tauri 2.x
- **HTTP**: Tauri HTTP plugin (not `window.fetch`)
- **Async**: Tokio (Rust), native promises (TS)

## Common Patterns

### Adding a new Tauri command

1. Define the function in `src-tauri/src/lib.rs` with `#[tauri::command]`
2. Add to `invoke_handler![]` macro in `run()`
3. Call from frontend: `import { invoke } from '@tauri-apps/api/core'; invoke('command_name', args)`

### Adding a new API endpoint

1. Add function to appropriate module in `src/lib/api/`
2. Use `apiRequest<T>()` from `client.ts`
3. Define TypeScript types in `src/lib/api/types.ts`

## Testing

No testing framework is currently configured. This would be a valuable addition.
