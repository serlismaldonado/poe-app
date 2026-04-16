#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const bundleDir = path.join(projectRoot, 'src-tauri', 'target', 'release', 'bundle');
const distDir = path.join(projectRoot, 'dist');
const releaseDir = path.join(projectRoot, 'releases');

// Crear directorio de releases si no existe
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

// Limpiar releases anteriores
console.log('🧹 Limpiando releases anteriores...');
const files = fs.readdirSync(releaseDir);
for (const file of files) {
  fs.rmSync(path.join(releaseDir, file), { recursive: true, force: true });
}

// Función para copiar archivos
function copyFile(source, destination) {
  if (fs.existsSync(source)) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    console.log(`📦 Copiado: ${path.relative(projectRoot, source)} → ${path.relative(projectRoot, destination)}`);
    return true;
  }
  return false;
}

// Función para copiar directorios recursivamente
function copyDir(source, destination) {
  if (fs.existsSync(source)) {
    fs.mkdirSync(destination, { recursive: true });

    const items = fs.readdirSync(source);
    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);

      const stat = fs.statSync(sourcePath);
      if (stat.isDirectory()) {
        copyDir(sourcePath, destPath);
      } else {
        copyFile(sourcePath, destPath);
      }
    }
    return true;
  }
  return false;
}

console.log('🚀 Organizando archivos de distribución...');

// Buscar y organizar archivos generados
let foundFiles = [];

// macOS
const macosApp = path.join(bundleDir, 'macos', 'Poe.app');
const macosDmg = path.join(bundleDir, 'dmg', 'Poe_*.dmg');

if (fs.existsSync(macosApp)) {
  const macosDest = path.join(releaseDir, 'macos', 'Poe.app');
  copyDir(macosApp, macosDest);
  foundFiles.push('macos/Poe.app');
}

// Buscar archivos DMG
try {
  const dmgFiles = fs.readdirSync(path.join(bundleDir, 'dmg')).filter(file => file.endsWith('.dmg'));
  for (const dmgFile of dmgFiles) {
    const source = path.join(bundleDir, 'dmg', dmgFile);
    const dest = path.join(releaseDir, 'macos', dmgFile);
    if (copyFile(source, dest)) {
      foundFiles.push(`macos/${dmgFile}`);
    }
  }
} catch (err) {
  // No hay archivos DMG
}

// Windows (si existen)
const windowsMsi = path.join(bundleDir, 'msi', 'Poe_*.msi');
const windowsExe = path.join(bundleDir, 'nsis', 'Poe_*.exe');

// Buscar archivos de Windows
try {
  const msiDir = path.join(bundleDir, 'msi');
  if (fs.existsSync(msiDir)) {
    const msiFiles = fs.readdirSync(msiDir).filter(file => file.endsWith('.msi'));
    for (const msiFile of msiFiles) {
      const source = path.join(msiDir, msiFile);
      const dest = path.join(releaseDir, 'windows', msiFile);
      if (copyFile(source, dest)) {
        foundFiles.push(`windows/${msiFile}`);
      }
    }
  }
} catch (err) {
  // No hay archivos MSI
}

try {
  const nsisDir = path.join(bundleDir, 'nsis');
  if (fs.existsSync(nsisDir)) {
    const exeFiles = fs.readdirSync(nsisDir).filter(file => file.endsWith('.exe'));
    for (const exeFile of exeFiles) {
      const source = path.join(nsisDir, exeFile);
      const dest = path.join(releaseDir, 'windows', exeFile);
      if (copyFile(source, dest)) {
        foundFiles.push(`windows/${exeFile}`);
      }
    }
  }
} catch (err) {
  // No hay archivos EXE
}

// Linux (si existen)
const linuxDeb = path.join(bundleDir, 'deb', 'Poe_*.deb');
const linuxRpm = path.join(bundleDir, 'rpm', 'Poe_*.rpm');
const linuxAppImage = path.join(bundleDir, 'appimage', 'Poe_*.AppImage');

// Buscar archivos de Linux
try {
  const debDir = path.join(bundleDir, 'deb');
  if (fs.existsSync(debDir)) {
    const debFiles = fs.readdirSync(debDir).filter(file => file.endsWith('.deb'));
    for (const debFile of debFiles) {
      const source = path.join(debDir, debFile);
      const dest = path.join(releaseDir, 'linux', debFile);
      if (copyFile(source, dest)) {
        foundFiles.push(`linux/${debFile}`);
      }
    }
  }
} catch (err) {
  // No hay archivos DEB
}

try {
  const rpmDir = path.join(bundleDir, 'rpm');
  if (fs.existsSync(rpmDir)) {
    const rpmFiles = fs.readdirSync(rpmDir).filter(file => file.endsWith('.rpm'));
    for (const rpmFile of rpmFiles) {
      const source = path.join(rpmDir, rpmFile);
      const dest = path.join(releaseDir, 'linux', rpmFile);
      if (copyFile(source, dest)) {
        foundFiles.push(`linux/${rpmFile}`);
      }
    }
  }
} catch (err) {
  // No hay archivos RPM
}

try {
  const appimageDir = path.join(bundleDir, 'appimage');
  if (fs.existsSync(appimageDir)) {
    const appimageFiles = fs.readdirSync(appimageDir).filter(file => file.endsWith('.AppImage'));
    for (const appimageFile of appimageFiles) {
      const source = path.join(appimageDir, appimageFile);
      const dest = path.join(releaseDir, 'linux', appimageFile);
      if (copyFile(source, dest)) {
        foundFiles.push(`linux/${appimageFile}`);
      }
    }
  }
} catch (err) {
  // No hay archivos AppImage
}

// Crear archivo README para la distribución
const readmeContent = `# Poe - Releases

Esta carpeta contiene los instaladores de Poe para diferentes plataformas.

## Archivos disponibles:

${foundFiles.length > 0 ? foundFiles.map(file => `- \`${file}\``).join('\n') : 'No se encontraron archivos de distribución.'}

## Instalación

### macOS
1. Descarga el archivo \`.dmg\`
2. Ábrelo y arrastra \`Poe.app\` a la carpeta Aplicaciones
3. Ejecuta desde Launchpad o Spotlight

### Windows
1. Descarga el archivo \`.msi\` o \`.exe\`
2. Ejecuta el instalador y sigue las instrucciones

### Linux
- **Debian/Ubuntu**: Usa el archivo \`.deb\`
- **Fedora/RHEL**: Usa el archivo \`.rpm\`
- **Otras distribuciones**: Usa el archivo \`.AppImage\` (hazlo ejecutable: \`chmod +x Poe_*.AppImage\`)

## Notas
- Versión: 1.0.0
- Fecha de build: ${new Date().toISOString().split('T')[0]}
- Requisitos mínimos:
  - macOS: 10.13 o superior
  - Windows: 10 o superior
  - Linux: Kernel 3.2+ con glibc 2.17+

## Soporte
Para reportar problemas o sugerencias, visita el repositorio del proyecto.
`;

fs.writeFileSync(path.join(releaseDir, 'README.md'), readmeContent);
console.log('📝 Creado README.md en releases/');

// Crear archivo de manifest
const manifest = {
  version: '1.0.0',
  buildDate: new Date().toISOString(),
  files: foundFiles,
  platforms: {
    macos: foundFiles.some(f => f.startsWith('macos/')),
    windows: foundFiles.some(f => f.startsWith('windows/')),
    linux: foundFiles.some(f => f.startsWith('linux/'))
  }
};

fs.writeFileSync(
  path.join(releaseDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);
console.log('📄 Creado manifest.json en releases/');

console.log('\n✅ Distribución organizada exitosamente!');
console.log(`📁 Los archivos están en: ${path.relative(projectRoot, releaseDir)}/`);
if (foundFiles.length > 0) {
  console.log('\n📦 Archivos encontrados:');
  foundFiles.forEach(file => console.log(`  - ${file}`));
} else {
  console.log('\n⚠️  No se encontraron archivos de distribución. Ejecuta `npm run build` primero.');
}
