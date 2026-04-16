# POE - Legacy → Tauri Migration Plan

## Original Codebase (legacy/)

- `index.js` (451 líneas) - Entry point, blessed TUI, input handling
- `editor.js` (934 líneas) - Core editing logic
- `render.js` (617 líneas) - Syntax highlighting, rendering
- `state.js` (55 líneas) - Global state
- `settings.js` (63 líneas) - Config management
- `terminal.js` (89 líneas) - ANSI helpers
- `sound.js` (85 líneas) - Keyboard sound effects

## Migration Strategy

### Phase 2: Port JavaScript

#### Step 1: Core Logic (No UI)
```
legacy/state.js → src/state.ts
  - Keep as-is, just convert to TypeScript
  - No blessed dependencies
  
legacy/editor.js → src/editor.ts
  - Remove blessed input handlers
  - Implement abstract IRenderer interface
  - Keep all editing logic
  
legacy/settings.js → src/settings.ts
  - Keep load/save (will use Tauri fs API + SQLite)
  - Convert to TypeScript
```

#### Step 2: Rendering Abstraction
```
legacy/render.js → src/renderers/base.ts
  - Abstract IRenderer interface
  
legacy/render.js + legacy/terminal.js → src/renderers/ansi.ts
  - Legacy ANSI renderer (for reference)
  
WRITE src/renderers/dom.ts
  - New HTML/CSS DOM renderer
  - Convert ANSI styles → CSS classes
```

#### Step 3: Input & Sound
```
legacy/index.js → src/input.ts
  - Extract input mapping (Ctrl+S, Ctrl+Z, etc)
  - Map to DOM keyboard events
  
legacy/sound.js → src/sound.ts
  - Port to Web Audio API
  - Remove ffmpeg dependency
```

### Phase 3: Tauri Integration

```
src-tauri/src/db.rs
  - SQLite setup
  - File operations
  - Cursor position persistence
  
src-tauri/src/commands.rs
  - Tauri commands for fs + db
```

### Phase 4: UI & Integration

```
src/app.ts
  - Main app class
  - Integrate editor + renderer + input
  
src/style.css
  - Terminal-like CSS (monospace, colors)
  - Focus on minimalism
```

## Checklist

- [ ] Copy legacy files to legacy/
- [ ] Convert state.js → state.ts
- [ ] Convert settings.js → settings.ts
- [ ] Convert editor.js → editor.ts (remove blessed)
- [ ] Create IRenderer abstract class
- [ ] Implement DOM renderer
- [ ] Port keyboard input
- [ ] Setup SQLite commands
- [ ] Integrate in App class
- [ ] Test with sample markdown file
- [ ] Build & package with Tauri

