import { invoke } from "@tauri-apps/api/tauri";
import { detectTauri } from "./lib/tauri-detect";

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

export async function loadConfig(): Promise<Config> {
  const isTauri = await detectTauri();
  
  if (isTauri) {
    try {
      const json = await invoke<string>("load_settings");
      const saved = JSON.parse(json);
      return { ...DEFAULT_CONFIG, ...saved };
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  } else {
    try {
      const saved = localStorage.getItem("poe:settings");
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch {}
  }
  
  return { ...DEFAULT_CONFIG };
}

export async function saveConfig(config: Config): Promise<void> {
  const isTauri = await detectTauri();
  
  if (isTauri) {
    try {
      await invoke("save_settings", { json: JSON.stringify(config, null, 2) });
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  } else {
    try {
      localStorage.setItem("poe:settings", JSON.stringify(config));
    } catch {}
  }
}

export async function getConfigPath(): Promise<string> {
  const isTauri = await detectTauri();
  
  if (isTauri) {
    try {
      return await invoke<string>("get_config_path_cmd");
    } catch {
      return "~/.config/poe/settings.json";
    }
  }
  return "localStorage";
}
