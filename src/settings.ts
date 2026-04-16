export interface Config {
  wrapColumn: number;
  tabSize: number;
  autosaveMs: number;
  fadeGray: number;
  cursorBlinkMs: number;
  cursorStyle: "bar" | "underline" | "block";
  mode: "markdown" | "screenplay" | "novel";
  sound: boolean;
  soundVolume: number;
  h1Gray: number;
  h2Gray: number;
  h3Gray: number;
  h4Gray: number;
  h5Gray: number;
  h6Gray: number;
  boldGray: number;
  italicGray: number;
  searchBg: number;
  characterColor: number;
  accentColor: number;
}

export const DEFAULT_CONFIG: Config = {
  wrapColumn: 80,
  tabSize: 2,
  autosaveMs: 500,
  fadeGray: 140,
  cursorBlinkMs: 600,
  cursorStyle: "underline",
  mode: "markdown",
  sound: true,
  soundVolume: 60,
  h1Gray: 255,
  h2Gray: 245,
  h3Gray: 235,
  h4Gray: 225,
  h5Gray: 215,
  h6Gray: 205,
  boldGray: 255,
  italicGray: 200,
  searchBg: 58,
  characterColor: 51,
  accentColor: 100,
};

export interface SettingsDef {
  key: keyof Config;
  label: string;
  type: "options" | "number" | "boolean";
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export const SETTINGS_DEFS: SettingsDef[] = [
  {
    key: "mode",
    label: "modo",
    type: "options",
    options: ["markdown", "screenplay"],
  },
  {
    key: "cursorStyle",
    label: "cursor",
    type: "options",
    options: ["bar", "underline", "block"],
  },
  {
    key: "cursorBlinkMs",
    label: "parpadeo",
    type: "number",
    min: 100,
    max: 2000,
    step: 100,
    unit: "ms",
  },
  {
    key: "wrapColumn",
    label: "wrap columna",
    type: "number",
    min: 40,
    max: 200,
    step: 1,
  },
  {
    key: "tabSize",
    label: "tab",
    type: "number",
    min: 1,
    max: 8,
    step: 1,
  },
  {
    key: "autosaveMs",
    label: "autoguardado",
    type: "number",
    min: 100,
    max: 5000,
    step: 100,
    unit: "ms",
  },
  {
    key: "fadeGray",
    label: "fade",
    type: "number",
    min: 232,
    max: 255,
    step: 1,
  },
  { key: "sound", label: "sonido", type: "boolean" },
  {
    key: "soundVolume",
    label: "volumen",
    type: "number",
    min: 0,
    max: 100,
    step: 5,
    unit: "%",
  },
  {
    key: "h1Gray",
    label: "# gris",
    type: "number",
    min: 232,
    max: 255,
    step: 1,
  },
  {
    key: "h2Gray",
    label: "## gris",
    type: "number",
    min: 232,
    max: 255,
    step: 1,
  },
  {
    key: "h3Gray",
    label: "### gris",
    type: "number",
    min: 232,
    max: 255,
    step: 1,
  },
  {
    key: "boldGray",
    label: "bold gris",
    type: "number",
    min: 232,
    max: 255,
    step: 1,
  },
  {
    key: "italicGray",
    label: "italic gris",
    type: "number",
    min: 232,
    max: 255,
    step: 1,
  },
  {
    key: "searchBg",
    label: "búsqueda fondo",
    type: "number",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "characterColor",
    label: "personaje color",
    type: "number",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "accentColor",
    label: "acento color",
    type: "number",
    min: 0,
    max: 255,
    step: 1,
  },
];

export async function loadConfig(): Promise<Config> {
  try {
    const stored = localStorage.getItem("poe:config");
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export async function saveConfig(cfg: Config): Promise<void> {
  try {
    localStorage.setItem("poe:config", JSON.stringify(cfg));
  } catch {}
}
