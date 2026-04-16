# Poe App - Tauri Desktop Edition

Minimalista editor de markdown para desktop con Tauri + SQLite.

## Estructura

```
poe-app/
├── src/                  Frontend (TypeScript, Vite)
│   ├── main.ts          Entrada
│   ├── app.ts           App class
│   ├── editor.ts        Lógica de edición
│   ├── input.ts         Manejo de keyboard
│   ├── sound.ts         Web Audio API
│   ├── file-manager.ts  Abstracción FS
│   ├── settings.ts      Configuración
│   ├── state.ts         Estado global
│   ├── renderers/       DOM renderer
│   ├── lib/             Helpers
│   └── style.css        Estilos
├── src-tauri/           Backend Rust (Tauri)
│   ├── src/
│   │   ├── main.rs      Entrada Tauri
│   │   ├── db.rs        SQLite
│   │   └── commands.rs  Tauri commands
│   └── Cargo.toml       Deps Rust
├── dist/                Build output
├── index.html           HTML principal
├── tsconfig.json        Config TypeScript
├── vite.config.ts       Config Vite
└── tauri.conf.json      Config Tauri
```

## Instalación

```bash
npm install
```

## Desarrollo

### Frontend solo (con Vite dev server)

```bash
npm run dev:ui
```

Abre http://localhost:5173

### Desktop (con Tauri)

Requiere Rust instalado. Después:

```bash
npm run dev
```

Abre automáticamente la app en una ventana de Tauri.

## Build

```bash
npm run build
```

Genera ejecutable en `src-tauri/target/release/` para tu sistema operativo.

## Arquitectura

### Frontend

- **Editor**: Clase `Editor` con lógica pura (sin UI)
- **Renderer**: Interface `IRenderer` con implementación `DOMRenderer`
- **Input**: Clase `InputHandler` que mapea eventos del teclado
- **FileManager**: Interface `IFileManager` con implementaciones `LocalFileManager` y `TauriFileManager`
- **Sound**: Síntesis de sonido con Web Audio API

### Backend (Rust)

- **Database**: Módulo `db.rs` con SQLite
  - Tabla `files` - Posiciones de cursor y metadata
  - Tabla `recent_searches` - Historial de búsquedas
  - Tabla `settings` - Configuración persistente
- **Commands**: Módulo `commands.rs` expone funciones a JavaScript vía Tauri

### State Management

Estado global en `EditorState`:
- Contenido (`lines`)
- Cursor (`cursorLine`, `cursorCol`)
- Selección
- Undo/Redo stacks
- Configuración

## Shortcuts

| Atajo | Acción |
|---|---|
| `Ctrl+S` | Guardar |
| `Ctrl+Z` | Deshacer |
| `Ctrl+Y` | Rehacer |
| `Ctrl+A` | Seleccionar todo |
| `Ctrl+D` | Duplicar línea |
| `Ctrl+K` | Borrar línea |
| `Alt+↑↓` | Mover línea |
| `Tab` / `Shift+Tab` | Indentar |
| `↑↓←→` | Mover cursor |
| `Shift+↑↓←→` | Seleccionar |

## Features

- ✅ Editor minimalista
- ✅ Syntax highlighting (markdown básico)
- ✅ Undo/Redo (hasta 200 pasos)
- ✅ Auto-save
- ✅ Soundboard (optional)
- ✅ Cursor position persistence (SQLite)
- ✅ Desktop app (Tauri)
- ⏳ Búsqueda (en desarrollo)
- ⏳ Temas (en desarrollo)

## Desarrollo

### Agregar features

1. Editar lógica en `src/editor.ts`
2. Agregar input handler en `src/input.ts`
3. Actualizar renderer si es necesario

### Agregar comandos Tauri

1. Editar `src-tauri/src/db.rs` o crear nuevo módulo
2. Agregar comando en `src-tauri/src/commands.rs`
3. Invocar desde frontend con `invoke()`

## Licencia

MIT
