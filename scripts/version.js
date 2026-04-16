#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, "..");

// Archivos que contienen versiones
const filesToUpdate = [
  {
    path: path.join(projectRoot, "package.json"),
    updater: (content, newVersion) => {
      const pkg = JSON.parse(content);
      pkg.version = newVersion;
      return JSON.stringify(pkg, null, 2) + "\n";
    },
  },
  {
    path: path.join(projectRoot, "src-tauri", "tauri.conf.json"),
    updater: (content, newVersion) => {
      const config = JSON.parse(content);
      config.package.version = newVersion;
      return JSON.stringify(config, null, 2) + "\n";
    },
  },
  {
    path: path.join(projectRoot, "src-tauri", "Cargo.toml"),
    updater: (content, newVersion) => {
      // Actualizar versión en Cargo.toml
      const lines = content.split("\n");
      const updatedLines = lines.map((line) => {
        if (line.startsWith('version = "')) {
          return `version = "${newVersion}"`;
        }
        return line;
      });
      return updatedLines.join("\n");
    },
  },
];

function getCurrentVersion() {
  try {
    const pkgPath = path.join(projectRoot, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return pkg.version;
  } catch (error) {
    console.error("Error al leer la versión actual:", error);
    process.exit(1);
  }
}

async function updateVersion(newVersion) {
  console.log(`🔄 Actualizando versión a: ${newVersion}`);

  let updatedCount = 0;

  for (const fileInfo of filesToUpdate) {
    try {
      if (fs.existsSync(fileInfo.path)) {
        const content = fs.readFileSync(fileInfo.path, "utf8");
        const updatedContent = fileInfo.updater(content, newVersion);
        fs.writeFileSync(fileInfo.path, updatedContent);
        console.log(
          `✅ Actualizado: ${path.relative(projectRoot, fileInfo.path)}`,
        );
        updatedCount++;
      } else {
        console.log(
          `⚠️  No encontrado: ${path.relative(projectRoot, fileInfo.path)}`,
        );
      }
    } catch (error) {
      console.error(`❌ Error al actualizar ${fileInfo.path}:`, error.message);
    }
  }

  console.log(`\n🎉 Versión actualizada en ${updatedCount} archivos`);

  // Crear tag de Git
  console.log("\n📝 Creando tag de Git...");
  try {
    const { execSync } = await import("child_process");
    execSync(`git add .`, { cwd: projectRoot, stdio: "inherit" });
    execSync(`git commit -m "v${newVersion}"`, {
      cwd: projectRoot,
      stdio: "inherit",
    });
    execSync(`git tag -a v${newVersion} -m "Versión ${newVersion}"`, {
      cwd: projectRoot,
      stdio: "inherit",
    });
    console.log(`🏷️  Tag v${newVersion} creado`);
  } catch (error) {
    console.log(
      "ℹ️  No se pudo crear el tag de Git (puede que no sea un repositorio Git o haya cambios sin commit)",
    );
  }
}

function showHelp() {
  console.log(`
Uso: node scripts/version.js [comando] [versión]

Comandos:
  current                Muestra la versión actual
  set <versión>         Establece una nueva versión (ej: 1.0.1)
  patch                 Incrementa la versión patch (1.0.0 → 1.0.1)
  minor                 Incrementa la versión minor (1.0.0 → 1.1.0)
  major                 Incrementa la versión major (1.0.0 → 2.0.0)

Ejemplos:
  node scripts/version.js current
  node scripts/version.js set 1.2.3
  node scripts/version.js patch
  node scripts/version.js minor
  node scripts/version.js major
  `);
}

function incrementVersion(version, type) {
  const [major, minor, patch] = version.split(".").map(Number);

  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Tipo de incremento no válido: ${type}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const command = args[0];
  const currentVersion = getCurrentVersion();

  switch (command) {
    case "current":
      console.log(`📦 Versión actual: ${currentVersion}`);
      break;

    case "set":
      if (args.length < 2) {
        console.error("❌ Error: Se requiere un número de versión");
        showHelp();
        process.exit(1);
      }
      const newVersion = args[1];
      // Validar formato de versión semántica
      if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
        console.error(
          "❌ Error: La versión debe seguir el formato semántico (ej: 1.0.0)",
        );
        process.exit(1);
      }
      await updateVersion(newVersion);
      break;

    case "patch":
    case "minor":
    case "major":
      const incrementedVersion = incrementVersion(currentVersion, command);
      await updateVersion(incrementedVersion);
      break;

    default:
      console.error(`❌ Comando no reconocido: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
