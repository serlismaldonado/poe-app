#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

// Colores para la consola
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step) {
  console.log(`\n${colors.bright}${colors.cyan}▶ ${step}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      cwd: projectRoot,
      stdio: options.silent ? "pipe" : "inherit",
      encoding: "utf8",
      ...options,
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getCurrentVersion() {
  try {
    const pkgPath = path.join(projectRoot, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return pkg.version;
  } catch (error) {
    logError(`Error al leer la versión: ${error.message}`);
    process.exit(1);
  }
}

function cleanReleases() {
  logStep("Limpiando releases anteriores");

  const releasesDir = path.join(projectRoot, "releases");
  if (fs.existsSync(releasesDir)) {
    try {
      fs.rmSync(releasesDir, { recursive: true, force: true });
      logSuccess("Releases anteriores eliminados");
    } catch (error) {
      logError(`Error al limpiar releases: ${error.message}`);
    }
  }

  // Crear directorio de releases
  fs.mkdirSync(releasesDir, { recursive: true });
}

function buildFrontend() {
  logStep("Construyendo frontend");

  const result = runCommand("npm run build:ui");
  if (result.success) {
    logSuccess("Frontend construido exitosamente");
  } else {
    logError("Error al construir frontend");
    process.exit(1);
  }
}

function buildForPlatform(platform) {
  logStep(`Construyendo para ${platform}`);

  let command;
  switch (platform) {
    case "macos":
      command = "npm run build:macos";
      break;
    case "windows":
      command = "npm run build:windows";
      break;
    case "linux":
      command = "npm run build:linux";
      break;
    default:
      command = "npm run build";
  }

  const result = runCommand(command);
  if (result.success) {
    logSuccess(`Build para ${platform} completado`);
    return true;
  } else {
    logWarning(
      `Build para ${platform} falló (puede requerir cross-compilation)`,
    );
    return false;
  }
}

function organizeArtifacts() {
  logStep("Organizando artefactos");

  const releasesDir = path.join(projectRoot, "releases");

  // Buscar en múltiples targets posibles
  const possibleTargets = [
    path.join(projectRoot, "src-tauri", "target", "release", "bundle"),
    path.join(
      projectRoot,
      "src-tauri",
      "target",
      "aarch64-apple-darwin",
      "release",
      "bundle",
    ),
    path.join(
      projectRoot,
      "src-tauri",
      "target",
      "x86_64-pc-windows-msvc",
      "release",
      "bundle",
    ),
    path.join(
      projectRoot,
      "src-tauri",
      "target",
      "x86_64-unknown-linux-gnu",
      "release",
      "bundle",
    ),
  ];

  let bundleDir = null;
  for (const target of possibleTargets) {
    if (fs.existsSync(target)) {
      bundleDir = target;
      logSuccess(
        `Encontrados artefactos en: ${path.relative(projectRoot, target)}`,
      );
      break;
    }
  }

  if (!bundleDir) {
    logWarning("No se encontraron artefactos para organizar");
    return;
  }

  // Función para copiar archivos o directorios
  function copyItem(source, destination) {
    if (!fs.existsSync(source)) {
      return false;
    }

    const stat = fs.statSync(source);
    fs.mkdirSync(path.dirname(destination), { recursive: true });

    if (stat.isDirectory()) {
      // Usar cp -R para copiar directorios
      try {
        runCommand(`cp -R "${source}" "${destination}"`, { silent: true });
        return true;
      } catch (error) {
        logWarning(`Error al copiar directorio ${source}: ${error.message}`);
        return false;
      }
    } else {
      // Copiar archivo normal
      try {
        fs.copyFileSync(source, destination);
        return true;
      } catch (error) {
        logWarning(`Error al copiar archivo ${source}: ${error.message}`);
        return false;
      }
    }
  }

  // Organizar por plataforma
  const platforms = [
    { name: "macos", dirs: ["macos", "dmg"], exts: [".app", ".dmg"] },
    { name: "windows", dirs: ["msi", "nsis"], exts: [".msi", ".exe"] },
    {
      name: "linux",
      dirs: ["deb", "rpm", "appimage"],
      exts: [".deb", ".rpm", ".AppImage"],
    },
  ];

  let totalFiles = 0;

  for (const platform of platforms) {
    const platformDir = path.join(releasesDir, platform.name);

    for (const subdir of platform.dirs) {
      const sourceDir = path.join(bundleDir, subdir);
      if (!fs.existsSync(sourceDir)) continue;

      const files = fs.readdirSync(sourceDir);
      for (const file of files) {
        if (platform.exts.some((ext) => file.endsWith(ext))) {
          const source = path.join(sourceDir, file);
          const dest = path.join(platformDir, file);

          if (copyItem(source, dest)) {
            totalFiles++;
            logSuccess(`Copiado: ${platform.name}/${file}`);
          }
        }
      }
    }

    // Copiar .app bundle de macOS
    if (platform.name === "macos") {
      const macosApp = path.join(bundleDir, "macos", "Poe.app");
      if (fs.existsSync(macosApp)) {
        const destApp = path.join(platformDir, "Poe.app");
        try {
          // Eliminar destino si existe
          if (fs.existsSync(destApp)) {
            fs.rmSync(destApp, { recursive: true, force: true });
          }
          if (copyItem(macosApp, destApp)) {
            totalFiles++;
            logSuccess("Copiado: macos/Poe.app");
          }
        } catch (error) {
          logWarning(`Error al copiar .app bundle: ${error.message}`);
        }
      }
    }
  }

  // Si no se encontraron archivos, buscar en otros targets
  if (totalFiles === 0) {
    logWarning(
      "No se encontraron archivos en el target principal, buscando en otros...",
    );

    // Buscar recursivamente en todos los targets
    const targetRoot = path.join(projectRoot, "src-tauri", "target");
    if (fs.existsSync(targetRoot)) {
      const findAndCopyArtifacts = (dir) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);

          if (stat.isDirectory()) {
            // Buscar archivos de bundle
            if (item === "bundle") {
              const bundleSubdirs = [
                "macos",
                "dmg",
                "msi",
                "nsis",
                "deb",
                "rpm",
                "appimage",
              ];
              for (const subdir of bundleSubdirs) {
                const subdirPath = path.join(itemPath, subdir);
                if (fs.existsSync(subdirPath)) {
                  const files = fs.readdirSync(subdirPath);
                  for (const file of files) {
                    const source = path.join(subdirPath, file);

                    // Determinar plataforma basado en extensión o directorio
                    let platform = "unknown";
                    if (
                      file.endsWith(".dmg") ||
                      file.endsWith(".app") ||
                      subdir === "macos" ||
                      subdir === "dmg"
                    ) {
                      platform = "macos";
                    } else if (
                      file.endsWith(".msi") ||
                      file.endsWith(".exe") ||
                      subdir === "msi" ||
                      subdir === "nsis"
                    ) {
                      platform = "windows";
                    } else if (
                      file.endsWith(".deb") ||
                      file.endsWith(".rpm") ||
                      file.endsWith(".AppImage") ||
                      subdir === "deb" ||
                      subdir === "rpm" ||
                      subdir === "appimage"
                    ) {
                      platform = "linux";
                    }

                    const destDir = path.join(releasesDir, platform);
                    const dest = path.join(destDir, file);

                    if (copyItem(source, dest)) {
                      totalFiles++;
                      logSuccess(
                        `Copiado desde ${path.relative(targetRoot, source)} → ${platform}/${file}`,
                      );
                    }
                  }
                }
              }
            }
            // Buscar recursivamente
            findAndCopyArtifacts(itemPath);
          }
        }
      };

      findAndCopyArtifacts(targetRoot);
    }
  }

  logSuccess(`Organizados ${totalFiles} archivos`);
}

function createAppZip() {
  logStep("Creando ZIP de la aplicación macOS");

  const macosDir = path.join(projectRoot, "releases", "macos");
  const appPath = path.join(macosDir, "Poe.app");
  const zipPath = path.join(macosDir, "Poe.app.zip");

  if (fs.existsSync(appPath)) {
    try {
      // Verificar que es un directorio
      const stat = fs.statSync(appPath);
      if (stat.isDirectory()) {
        runCommand(`cd "${macosDir}" && zip -r Poe.app.zip Poe.app`, {
          silent: true,
        });
        if (fs.existsSync(zipPath)) {
          logSuccess("ZIP creado: macos/Poe.app.zip");
        }
      } else {
        logWarning("Poe.app no es un directorio, no se puede crear ZIP");
      }
    } catch (error) {
      logWarning(`No se pudo crear el ZIP: ${error.message}`);
    }
  }
}

function updateDownloadsPage() {
  logStep("Actualizando página de descargas");

  const version = getCurrentVersion();
  const downloadsHtml = path.join(projectRoot, "releases", "downloads.html");

  if (fs.existsSync(downloadsHtml)) {
    try {
      let content = fs.readFileSync(downloadsHtml, "utf8");

      // Actualizar versión
      content = content.replace(
        /<div class="version">Versión [\d.]+<\/div>/,
        `<div class="version">Versión ${version}</div>`,
      );

      // Actualizar fecha
      const now = new Date();
      const dateStr = now.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      content = content.replace(
        /<p>Esta página se actualiza automáticamente con cada nueva versión\. Los instaladores son generados automáticamente por nuestro sistema de CI\/CD\.<\/p>/,
        `<p>Esta página se actualiza automáticamente con cada nueva versión. Los instaladores son generados automáticamente por nuestro sistema de CI/CD.</p>
            <p><strong>Última actualización:</strong> ${dateStr}</p>`,
      );

      fs.writeFileSync(downloadsHtml, content);
      logSuccess("Página de descargas actualizada");
    } catch (error) {
      logWarning(`Error al actualizar página: ${error.message}`);
    }
  }
}

function createReleaseNotes() {
  logStep("Creando notas de versión");

  const version = getCurrentVersion();
  const releasesDir = path.join(projectRoot, "releases");
  const notesPath = path.join(releasesDir, `RELEASE_v${version}.md`);

  const notes = `# Poe v${version}

## Cambios en esta versión

### Nuevas características
- [ ] Agrega nuevas características aquí

### Mejoras
- [ ] Agrega mejoras aquí

### Correcciones de errores
- [ ] Agrega correcciones aquí

## Instaladores disponibles

### macOS
- \`Poe_${version}_aarch64.dmg\` - Disco de instalación
- \`Poe.app.zip\` - Aplicación bundle (portable)

### Windows
- Próximamente

### Linux
- Próximamente

## Requisitos del sistema

### macOS
- macOS 10.13 o superior
- Procesador Apple Silicon (M1/M2/M3) o Intel

### Windows
- Windows 10 o superior
- 64-bit

### Linux
- Kernel 3.2+ con glibc 2.17+
- 64-bit

## Instalación

### macOS
1. Descarga el archivo \`.dmg\`
2. Ábrelo y arrastra \`Poe.app\` a la carpeta Aplicaciones
3. Ejecuta desde Launchpad o Spotlight

### Windows
1. Descarga el archivo \`.msi\`
2. Ejecuta el instalador y sigue las instrucciones

### Linux
- **Debian/Ubuntu**: \`sudo dpkg -i Poe_${version}_amd64.deb\`
- **Fedora/RHEL**: \`sudo rpm -i Poe_${version}_x86_64.rpm\`
- **AppImage**: \`chmod +x Poe_${version}_amd64.AppImage && ./Poe_${version}_amd64.AppImage\`

## Notas para desarrolladores

Esta versión fue construida el ${new Date().toISOString().split("T")[0]}.

Para construir desde fuente:
\`\`\`bash
git clone https://github.com/serlismaldonado/poe-app
cd poe-app
npm install
npm run build
\`\`\`
`;

  fs.writeFileSync(notesPath, notes);
  logSuccess(`Notas de versión creadas: RELEASE_v${version}.md`);
}

function showSummary() {
  logStep("Resumen de la distribución");

  const version = getCurrentVersion();
  const releasesDir = path.join(projectRoot, "releases");

  console.log(
    `\n${colors.bright}${colors.green}🎉 DISTRIBUCIÓN COMPLETADA 🎉${colors.reset}`,
  );
  console.log(`${colors.bright}Versión:${colors.reset} ${version}`);
  console.log(
    `${colors.bright}Ubicación:${colors.reset} ${path.relative(projectRoot, releasesDir)}/`,
  );

  if (fs.existsSync(releasesDir)) {
    console.log(`\n${colors.bright}Archivos generados:${colors.reset}`);

    const platforms = ["macos", "windows", "linux"];
    for (const platform of platforms) {
      const platformDir = path.join(releasesDir, platform);
      if (fs.existsSync(platformDir)) {
        const files = fs.readdirSync(platformDir);
        if (files.length > 0) {
          console.log(
            `\n${colors.cyan}${platform.toUpperCase()}:${colors.reset}`,
          );
          files.forEach((file) => {
            const filePath = path.join(platformDir, file);
            const stats = fs.statSync(filePath);
            const size = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`  📦 ${file} (${size} MB)`);
          });
        }
      }
    }
  }

  console.log(`\n${colors.bright}Siguientes pasos:${colors.reset}`);
  console.log(
    `1. Sube la carpeta ${colors.cyan}releases/${colors.reset} a tu servidor web`,
  );
  console.log(
    `2. Agrega un enlace a ${colors.cyan}releases/downloads.html${colors.reset} en tu sitio`,
  );
  console.log(
    `3. Para CI/CD, configura GitHub Actions con el workflow en ${colors.cyan}.github/workflows/build.yml${colors.reset}`,
  );
  console.log(
    `4. Para firmar código, configura ${colors.cyan}TAURI_PRIVATE_KEY${colors.reset} y ${colors.cyan}TAURI_KEY_PASSWORD${colors.reset}`,
  );
}

async function main() {
  console.log(`${colors.bright}${colors.magenta}
╔══════════════════════════════════════════════╗
║           DISTRIBUCIÓN DE POE APP            ║
╚══════════════════════════════════════════════╝${colors.reset}
`);

  const args = process.argv.slice(2);
  const command = args[0] || "all";

  const version = getCurrentVersion();
  log(`Versión actual: ${colors.bright}${version}${colors.reset}`);

  switch (command) {
    case "clean":
      cleanReleases();
      break;

    case "build":
      buildFrontend();
      buildForPlatform("macos");
      break;

    case "package":
      organizeArtifacts();
      createAppZip();
      updateDownloadsPage();
      createReleaseNotes();
      break;

    case "all":
    default:
      cleanReleases();
      buildFrontend();

      // Intentar build para todas las plataformas
      const platforms = ["macos", "windows", "linux"];
      let builtPlatforms = 0;

      for (const platform of platforms) {
        if (buildForPlatform(platform)) {
          builtPlatforms++;
        }
      }

      if (builtPlatforms === 0) {
        logWarning(
          "No se pudo construir para ninguna plataforma. Intentando build general...",
        );
        buildForPlatform("general");
      }

      organizeArtifacts();
      createAppZip();
      updateDownloadsPage();
      createReleaseNotes();
      showSummary();
      break;
  }
}

// Manejo de errores
process.on("uncaughtException", (error) => {
  logError(`Error no manejado: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logError(`Promise rechazada no manejada: ${reason}`);
  process.exit(1);
});

// Ejecutar
main().catch((error) => {
  logError(`Error en la distribución: ${error.message}`);
  process.exit(1);
});
