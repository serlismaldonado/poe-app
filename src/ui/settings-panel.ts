import { Config, saveConfig } from "../settings";

interface SettingDef {
  key: keyof Config;
  label: string;
  type: "number" | "boolean" | "options";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: string[];
}

const SETTINGS_DEFS: SettingDef[] = [
  { key: "mode", label: "modo", type: "options", options: ["markdown", "screenplay", "novel"] },
  { key: "cursorStyle", label: "cursor", type: "options", options: ["bar", "underline", "block"] },
  { key: "cursorBlinkMs", label: "parpadeo", type: "number", min: 100, max: 2000, step: 100, unit: "ms" },
  { key: "wrapColumn", label: "wrap columna", type: "number", min: 40, max: 200, step: 1 },
  { key: "tabSize", label: "tab", type: "number", min: 1, max: 8, step: 1 },
  { key: "autosaveMs", label: "autoguardado", type: "number", min: 100, max: 5000, step: 100, unit: "ms" },
  { key: "fadeGray", label: "fade", type: "number", min: 0, max: 255, step: 5 },
  { key: "sound", label: "sonido", type: "boolean" },
  { key: "soundVolume", label: "volumen", type: "number", min: 0, max: 100, step: 5, unit: "%" },
  { key: "h1Gray", label: "# gris", type: "number", min: 0, max: 255, step: 5 },
  { key: "h2Gray", label: "## gris", type: "number", min: 0, max: 255, step: 5 },
  { key: "h3Gray", label: "### gris", type: "number", min: 0, max: 255, step: 5 },
  { key: "boldGray", label: "bold gris", type: "number", min: 0, max: 255, step: 5 },
  { key: "italicGray", label: "italic gris", type: "number", min: 0, max: 255, step: 5 },
  { key: "accentColor", label: "acento", type: "number", min: 0, max: 255, step: 5 },
];

export class SettingsPanel {
  private element: HTMLElement | null = null;
  private config: Config;
  private selectedIndex: number = 0;
  private isVisible: boolean = false;
  private onConfigChange?: (config: Config) => void;

  constructor(config: Config) {
    this.config = { ...config };
  }

  setOnConfigChange(callback: (config: Config) => void): void {
    this.onConfigChange = callback;
  }

  create(parent: HTMLElement): void {
    this.element = document.createElement("div");
    this.element.className = "settings-panel";
    this.element.style.display = "none";
    parent.appendChild(this.element);
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show(): void {
    if (!this.element) return;
    this.isVisible = true;
    this.element.style.display = "flex";
    this.render();
  }

  hide(): void {
    if (!this.element) return;
    this.isVisible = false;
    this.element.style.display = "none";
    saveConfig(this.config);
  }

  isOpen(): boolean {
    return this.isVisible;
  }

  updateConfig(config: Config): void {
    this.config = { ...config };
    if (this.isVisible) this.render();
  }

  handleKey(e: KeyboardEvent): boolean {
    if (!this.isVisible) return false;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.render();
        return true;

      case "ArrowDown":
        e.preventDefault();
        this.selectedIndex = Math.min(SETTINGS_DEFS.length - 1, this.selectedIndex + 1);
        this.render();
        return true;

      case "ArrowLeft":
        e.preventDefault();
        this.adjustValue(-1);
        return true;

      case "ArrowRight":
        e.preventDefault();
        this.adjustValue(1);
        return true;

      case "Enter":
      case "Escape":
        e.preventDefault();
        this.hide();
        return true;
    }

    return true;
  }

  private adjustValue(direction: number): void {
    const def = SETTINGS_DEFS[this.selectedIndex];
    const currentValue = this.config[def.key];

    if (def.type === "boolean") {
      (this.config as any)[def.key] = !currentValue;
    } else if (def.type === "options" && def.options) {
      const currentIdx = def.options.indexOf(currentValue as string);
      const newIdx = (currentIdx + direction + def.options.length) % def.options.length;
      (this.config as any)[def.key] = def.options[newIdx];
    } else if (def.type === "number") {
      const step = def.step || 1;
      const min = def.min ?? 0;
      const max = def.max ?? 1000;
      const newValue = Math.max(min, Math.min(max, (currentValue as number) + direction * step));
      (this.config as any)[def.key] = newValue;
    }

    this.render();
    this.onConfigChange?.(this.config);
  }

  private render(): void {
    if (!this.element) return;

    const rows = SETTINGS_DEFS.map((def, idx) => {
      const isSelected = idx === this.selectedIndex;
      const value = this.config[def.key];
      
      let valueStr: string;
      if (def.type === "boolean") {
        valueStr = value ? "on" : "off";
      } else if (def.unit) {
        valueStr = `${value}${def.unit}`;
      } else {
        valueStr = String(value);
      }

      const valueDisplay = isSelected ? `< ${valueStr} >` : valueStr;

      return `
        <div class="settings-row${isSelected ? " selected" : ""}">
          <span class="settings-label">${def.label}</span>
          <span class="settings-value">${valueDisplay}</span>
        </div>
      `;
    }).join("");

    this.element.innerHTML = `
      <div class="settings-content">
        <div class="settings-header">configuracion</div>
        <div class="settings-rows">${rows}</div>
        <div class="settings-footer">↑↓ navegar  ←→ cambiar  Enter cerrar</div>
      </div>
    `;
  }
}
