# Poe App - Tauri Desktop Edition

Editor de markdown minimalista para desktop usando Tauri + SQLite.

## Estructura

```
poe-app/
├── src/                 Frontend (TypeScript, Vite)
│   ├── main.ts         Entrada
│   ├── app.ts          App class
│   └── style.css       Estilos
├── src-tauri/          Backend Rust (Tauri)
│   ├── src/main.rs     Entrada Rust
│   └── Cargo.toml      Deps Rust
├── index.html          HTML principal
├── tsconfig.json       Config TypeScript
├── vite.config.ts      Config Vite
└── tauri.conf.json     Config Tauri
```

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre automáticamente la app en Tauri.

## Build

```bash
npm run build
```

Genera ejecutable en `src-tauri/target/release/`.

## Licencia

MIT
