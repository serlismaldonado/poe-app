# Poe App - Minimalist Markdown Editor

![Poe App Screenshot](https://via.placeholder.com/800x450/667eea/ffffff?text=Poe+App+-+Minimalist+Markdown+Editor)

A minimalist, fast, and beautiful markdown editor for desktop built with Tauri and TypeScript. Poe offers a distraction-free writing experience with local data persistence.

## ✨ Features

- **Minimalist Interface**: Clean, distraction-free editor focused on writing
- **Markdown Support**: Full markdown syntax highlighting
- **Local First**: All data stored locally with SQLite
- **Cross-Platform**: Available for macOS, Windows, and Linux
- **Keyboard Focused**: Extensive keyboard shortcuts for efficient editing
- **Auto-Save**: Your work is automatically saved
- **Undo/Redo**: Unlimited undo/redo history
- **Sound Feedback**: Optional soundboard for typing feedback
- **Cursor Persistence**: Remembers your cursor position between sessions

## 🚀 Quick Start

### Download & Install

Visit our [releases page](https://github.com/serlismaldonado/poe-app/releases) to download the latest version for your platform:

- **macOS**: Download `.dmg` file (drag Poe.app to Applications)
- **Windows**: Download `.msi` installer
- **Linux**: Download `.deb`, `.rpm`, or `.AppImage`

### From Source

```bash
# Clone the repository
git clone https://github.com/serlismaldonado/poe-app.git
cd poe-app

# Install dependencies
npm install

# Development (with hot reload)
npm run dev

# Build for production
npm run build
```

## 📦 Installation

### macOS
1. Download `Poe_*.dmg` from releases
2. Open the DMG file
3. Drag `Poe.app` to your Applications folder
4. Launch from Applications or Spotlight

### Windows
1. Download `Poe_*.msi` from releases
2. Run the installer
3. Follow the installation wizard
4. Launch from Start Menu

### Linux
```bash
# Debian/Ubuntu
sudo dpkg -i poe_*.deb

# Fedora/RHEL
sudo rpm -i poe_*.rpm

# AppImage (any distribution)
chmod +x poe_*.AppImage
./poe_*.AppImage
```

## 🎯 Usage

### Basic Editing
- Start typing to create markdown content
- Use `#` for headers, `*` or `-` for lists
- `**bold**` and `*italic*` formatting
- `[links](url)` and `![images](url)`

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Save |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Y` / `Cmd+Y` | Redo |
| `Ctrl+A` / `Cmd+A` | Select all |
| `Ctrl+D` | Duplicate line |
| `Ctrl+K` | Delete line |
| `Alt+↑/↓` | Move line up/down |
| `Tab` / `Shift+Tab` | Indent/outdent |
| `Ctrl+F` | Find (coming soon) |
| `Ctrl+H` | Replace (coming soon) |

### File Management
- **New File**: `Ctrl+N` / `Cmd+N`
- **Open File**: `Ctrl+O` / `Cmd+O`
- **Save As**: `Ctrl+Shift+S` / `Cmd+Shift+S`
- **Recent Files**: Automatically tracked in SQLite

## 🏗️ Architecture

```
poe-app/
├── src/                    # Frontend (TypeScript + Vite)
│   ├── main.ts            # Entry point
│   ├── app.ts             # App class
│   ├── editor.ts          # Editor logic
│   ├── input.ts           # Keyboard handling
│   ├── file-manager.ts    # File system abstraction
│   ├── settings.ts        # Configuration
│   ├── state.ts           # Global state
│   ├── renderers/         # DOM renderer
│   └── style.css          # Styles
├── src-tauri/             # Backend (Rust + Tauri)
│   ├── src/
│   │   ├── main.rs        # Tauri entry
│   │   ├── db.rs          # SQLite database
│   │   └── commands.rs    # Tauri commands
│   └── Cargo.toml         # Rust dependencies
└── releases/              # Distribution files
```

### Frontend
- **TypeScript** with Vite for fast development
- **Virtual DOM** for efficient rendering
- **Web Audio API** for sound feedback
- **Modular architecture** with clear separation of concerns

### Backend
- **Rust** with Tauri for native performance
- **SQLite** for local data persistence
- **File system access** with proper sandboxing
- **Cross-platform** system APIs

## 🔧 Development

### Prerequisites
- Node.js 18+ and npm
- Rust and Cargo (for Tauri)
- Git

### Setup Development Environment
```bash
# Clone and install
git clone https://github.com/serlismaldonado/poe-app.git
cd poe-app
npm install

# Start development server
npm run dev:ui      # Frontend only (http://localhost:5173)
npm run dev         # Full app with Tauri
```

### Build Commands
```bash
# Build frontend only
npm run build:ui

# Build for current platform
npm run build

# Build for specific platforms
npm run build:macos
npm run build:windows
npm run build:linux

# Create distribution packages
npm run distribute
```

### Adding Features
1. Edit logic in `src/editor.ts`
2. Add input handlers in `src/input.ts`
3. Update renderer if needed in `src/renderers/`
4. Add Tauri commands in `src-tauri/src/commands.rs`

## 📁 Project Structure

### Key Files
- `src/editor.ts` - Core editor logic (pure, no UI)
- `src/renderers/dom-renderer.ts` - DOM-based rendering
- `src/state.ts` - Global application state
- `src-tauri/src/db.rs` - SQLite database operations
- `tauri.conf.json` - Tauri configuration

### Database Schema
```sql
-- Files table
CREATE TABLE files (
    id INTEGER PRIMARY KEY,
    path TEXT UNIQUE,
    content TEXT,
    cursor_line INTEGER,
    cursor_col INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Recent searches
CREATE TABLE recent_searches (
    id INTEGER PRIMARY KEY,
    query TEXT,
    timestamp TIMESTAMP
);

-- Settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT
);
```

## 🚢 Distribution

### Automated Releases
This project uses GitHub Actions for automated builds. When you create a git tag:
```bash
git tag v1.0.0
git push --tags
```
The workflow automatically builds for all platforms and creates a GitHub release.

### Manual Distribution
```bash
# Build and organize distribution files
npm run distribute

# Files will be organized in:
# releases/macos/     # .dmg and .app
# releases/windows/   # .msi and .exe  
# releases/linux/     # .deb, .rpm, .AppImage
```

### Code Signing (Optional)
For production distribution, configure code signing:
1. Set `TAURI_PRIVATE_KEY` environment variable
2. Configure `signingIdentity` in `tauri.conf.json` (macOS)
3. Configure `certificateThumbprint` in `tauri.conf.json` (Windows)

## 🤝 Contributing

We welcome contributions! Here's how to help:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Keep the codebase minimal and focused

### Roadmap
- [ ] Search and replace functionality
- [ ] Multiple themes (dark/light)
- [ ] Export to PDF/HTML
- [ ] Plugin system
- [ ] Cloud sync (optional)
- [ ] Collaborative editing

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) for the amazing desktop app framework
- [Vite](https://vitejs.dev/) for the fast build tool
- [SQLite](https://sqlite.org/) for reliable local storage
- All contributors and users of Poe App

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/serlismaldonado/poe-app/issues)
- **Email**: contacto@serlismaldonado.com
- **Website**: [serlismaldonado.com](https://serlismaldonado.com)

---

Made with ❤️ by [Serlis Maldonado](https://github.com/serlismaldonado)

*"Simplicity is the ultimate sophistication." - Leonardo da Vinci*
```

Ahora voy a actualizar el archivo README en el repositorio: