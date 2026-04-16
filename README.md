# Poe App - Tauri Desktop Edition

Minimalista editor de markdown para desktop con Tauri + SQLite.

## Distribución

Para generar instaladores que puedas compartir en tu sitio web:

### Build local (macOS)

```bash
# Build para macOS (genera .app y .dmg)
npm run build:macos

# Build para todas las plataformas (solo macOS funciona localmente)
npm run build:all

# Organizar archivos en carpeta releases/
npm run package
```

Los instaladores se generan en:
- `src-tauri/target/release/bundle/` - Archivos originales
- `releases/` - Archivos organizados por plataforma

### CI/CD con GitHub Actions

Para builds multiplataforma automáticos (macOS, Windows, Linux):
1. Configura secrets en GitHub: `TAURI_PRIVATE_KEY` y `TAURI_KEY_PASSWORD` (opcional para firma de código)
2. Crea un tag: `git tag v1.0.0 && git push --tags`
3. GitHub Actions generará automáticamente los instaladores y los publicará en Releases

### Firma de código (recomendado para distribución)

Para macOS:
```bash
# Configurar identidad de firma en tauri.conf.json
# "signingIdentity": "Developer ID Application: Tu Nombre (TEAMID)"
```

Para Windows:
```bash
# Configurar certificateThumbprint en tauri.conf.json
```

### Archivos generados

- **macOS**: `.app` bundle y `.dmg` (disco de instalación)
- **Windows**: `.msi` (Windows Installer) y `.exe` (ejecutable portable)
- **Linux**: `.deb` (Debian/Ubuntu), `.rpm` (Fedora/RHEL), `.AppImage` (portable)

### Gestión de versiones

```bash
# Mostrar versión actual
node scripts/version.js current

# Establecer nueva versión
node scripts/version.js set 1.0.1

# Incrementar versión automáticamente
node scripts/version.js patch  # 1.0.0 → 1.0.1
node scripts/version.js minor  # 1.0.0 → 1.1.0
node scripts/version.js major  # 1.0.0 → 2.0.0
```

## Estructura del Proyecto

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

## Instalación para Desarrollo

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

## Build para Desarrollo

```bash
npm run build
```

Genera ejecutable en `src-tauri/target/release/` para tu sistema operativo.

## Scripts Disponibles

| Comando | Descripción |
|---|---|
| `npm run dev:ui` | Desarrollo frontend solo |
| `npm run dev` | Desarrollo completo con Tauri |
| `npm run build:ui` | Build frontend |
| `npm run build` | Build completo (desarrollo) |
| `npm run build:macos` | Build para macOS |
| `npm run build:windows` | Build para Windows (requiere cross-compilation) |
| `npm run build:linux` | Build para Linux (requiere cross-compilation) |
| `npm run build:all` | Build para todas las plataformas |
| `npm run package` | Organizar archivos en releases/ |
| `npm run dist` | Build y organización completa |
| `npm run clean` | Limpiar archivos de build |
| `npm run tauri` | Comandos Tauri CLI |

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
- ✅ Sistema de distribución multiplataforma
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

## CI/CD

El proyecto incluye configuración para GitHub Actions en `.github/workflows/build.yml` que:

1. Detecta tags (`v*`) automáticamente
2. Build para macOS, Windows y Linux en paralelo
3. Publica los instaladores en GitHub Releases
4. Soporta builds manuales con `workflow_dispatch`

## Licencia

MIT
