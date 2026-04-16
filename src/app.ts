import { Editor } from "./editor";
import { DOMRenderer } from "./renderers/dom";
import { InputHandler } from "./input";
import { SoundManager } from "./sound";
import { Config, loadConfig } from "./settings";
import { detectTauri } from "./lib/tauri-detect";
import { SearchBar } from "./ui/search-bar";
import { SettingsPanel } from "./ui/settings-panel";
import { FileSwitcher } from "./ui/file-switcher";
import { openFileDialog, saveFileDialog, saveFile, getFileName } from "./file-ops";
import { listen } from "@tauri-apps/api/event";

export class App {
  private root: HTMLElement | null = null;
  private editor: Editor | null = null;
  private inputHandler: InputHandler | null = null;
  private soundManager: SoundManager;
  private searchBar: SearchBar | null = null;
  private settingsPanel: SettingsPanel | null = null;
  private fileSwitcher: FileSwitcher | null = null;
  private currentFile: string | null = null;
  private isTauri: boolean = false;
  private config: Config | null = null;

  constructor() {
    this.root = document.getElementById("app");
    this.soundManager = new SoundManager();
  }

  async init() {
    if (!this.root) return;

    this.isTauri = await detectTauri();

    this.root.innerHTML = `
      <div class="editor-container">
        <div class="editor" id="editor"></div>
        <div class="status-bar">
          <div class="status-left">
            <span class="status-item" id="filename">Untitled</span>
            <span class="status-item" id="position">1:1</span>
            <span class="status-item" id="stats">1L 0W</span>
            <span class="status-item" id="status"></span>
          </div>
          <div class="status-right">
            <span class="status-item" id="mode">MARKDOWN</span>
          </div>
        </div>
      </div>
    `;

    const cfg = await loadConfig();
    this.config = cfg;
    const renderer = new DOMRenderer();
    this.editor = new Editor(renderer);
    this.editor.setConfig(cfg);
    this.editor.setSoundManager(this.soundManager);
    this.editor.onAutoSave = () => this.handleAutoSave();
    
    // Load draft if exists
    const draft = localStorage.getItem("poe:draft");
    if (draft) {
      this.editor.setContent(draft.split("\n"));
    } else {
      this.editor.setContent([
        "# Welcome to Poe",
        "",
        "Ctrl+O to open a file",
        "Ctrl+S to save",
        "Ctrl+M to change mode",
      ]);
    }

    this.searchBar = new SearchBar(this.editor);
    const editorContainer = this.root.querySelector(".editor-container");
    if (editorContainer) {
      this.searchBar.create(editorContainer as HTMLElement);
      
      this.settingsPanel = new SettingsPanel(cfg);
      this.settingsPanel.create(editorContainer as HTMLElement);
      this.settingsPanel.setOnConfigChange((newCfg) => this.handleConfigChange(newCfg));
      
      this.fileSwitcher = new FileSwitcher();
      this.fileSwitcher.create(editorContainer as HTMLElement);
      this.fileSwitcher.setOnFileSelect((path, content) => this.handleFileFromSwitcher(path, content));
    }

    this.inputHandler = new InputHandler(this.editor);
    this.inputHandler.onSave = () => this.handleSave();
    this.inputHandler.onOpen = () => this.handleOpen();
    this.inputHandler.onNew = () => this.handleNew();
    this.inputHandler.onSearch = () => this.searchBar?.toggle();
    this.inputHandler.onSettings = () => this.settingsPanel?.toggle();
    this.inputHandler.onSwitcher = () => this.fileSwitcher?.toggle(this.currentFile);
    this.inputHandler.onKeyDown = (e) => this.handleGlobalKey(e);
    this.inputHandler.install();

    this.soundManager.enable(cfg.sound);
    this.soundManager.setVolume(cfg.soundVolume);

    this.updateFilename();
    this.updateModeDisplay();
    
    if (this.isTauri) {
      this.setupMenuListeners();
    }
    
    console.log("App initialized", { isTauri: this.isTauri });
  }

  private async setupMenuListeners(): Promise<void> {
    await listen("menu-open", () => this.handleOpen());
    await listen("menu-save", () => this.handleSave());
    await listen("menu-save-as", () => this.handleSaveAs());
    await listen("menu-settings", () => this.settingsPanel?.toggle());
    await listen("menu-new", () => this.handleNew());
    await listen("menu-switcher", () => this.fileSwitcher?.toggle(this.currentFile));
  }

  private handleGlobalKey(e: KeyboardEvent): boolean {
    if (this.settingsPanel?.isOpen()) {
      return this.settingsPanel.handleKey(e);
    }
    if (this.fileSwitcher?.isOpen()) {
      return this.fileSwitcher.handleKey(e);
    }
    return false;
  }

  private handleNew(): void {
    if (!this.editor) return;
    this.currentFile = null;
    this.editor.setContent([""]);
    this.updateFilename();
    localStorage.removeItem("poe:draft");
  }

  private handleFileFromSwitcher(path: string, content: string): void {
    if (!this.editor) return;
    this.currentFile = path;
    this.editor.setContent(content.split("\n"));
    this.updateFilename();
  }

  private handleConfigChange(newCfg: Config): void {
    this.config = newCfg;
    if (this.editor) {
      this.editor.setConfig(newCfg);
    }
    this.soundManager.enable(newCfg.sound);
    this.soundManager.setVolume(newCfg.soundVolume);
    this.updateModeDisplay();
  }

  private updateModeDisplay(): void {
    const modeEl = document.getElementById("mode");
    if (modeEl && this.config) {
      modeEl.textContent = this.config.mode.toUpperCase();
    }
  }

  private updateFilename(): void {
    const filenameEl = document.getElementById("filename");
    if (filenameEl) {
      filenameEl.textContent = this.currentFile 
        ? getFileName(this.currentFile) 
        : "Untitled";
    }
  }

  private async handleOpen(): Promise<void> {
    if (!this.isTauri || !this.editor) return;

    try {
      const result = await openFileDialog();
      if (result) {
        this.currentFile = result.path;
        this.editor.setContent(result.content.split("\n"));
        this.updateFilename();
        
        const statusEl = document.getElementById("status");
        if (statusEl) {
          statusEl.textContent = "Opened";
          setTimeout(() => {
            if (statusEl) statusEl.textContent = "";
          }, 1000);
        }
      }
    } catch (e) {
      console.error("Open failed:", e);
    }
  }

  private async handleSave(): Promise<void> {
    if (!this.editor) return;

    const statusEl = document.getElementById("status");
    const content = this.editor.getContent();

    if (this.isTauri) {
      try {
        if (statusEl) statusEl.textContent = "Saving...";
        
        const path = await saveFileDialog(content, this.currentFile || undefined);
        if (path) {
          this.currentFile = path;
          this.updateFilename();
          if (statusEl) {
            statusEl.textContent = "Saved";
            setTimeout(() => {
              if (statusEl) statusEl.textContent = "";
            }, 1000);
          }
        }
      } catch (e) {
        console.error("Save failed:", e);
        if (statusEl) statusEl.textContent = "Save failed";
      }
    } else {
      // Web fallback - download file
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.md";
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  private async handleSaveAs(): Promise<void> {
    if (!this.editor || !this.isTauri) return;

    const statusEl = document.getElementById("status");
    const content = this.editor.getContent();

    try {
      if (statusEl) statusEl.textContent = "Saving...";
      
      // Force dialog by not passing current path
      const path = await saveFileDialog(content, undefined);
      if (path) {
        this.currentFile = path;
        this.updateFilename();
        if (statusEl) {
          statusEl.textContent = "Saved";
          setTimeout(() => {
            if (statusEl) statusEl.textContent = "";
          }, 1000);
        }
      }
    } catch (e) {
      console.error("Save As failed:", e);
      if (statusEl) statusEl.textContent = "Save failed";
    }
  }

  private async handleAutoSave(): Promise<void> {
    if (!this.editor) return;

    const statusEl = document.getElementById("status");
    const content = this.editor.getContent();

    if (this.isTauri && this.currentFile) {
      try {
        await saveFile(this.currentFile, content);
        if (statusEl) {
          statusEl.textContent = "Saved";
          setTimeout(() => {
            if (statusEl) statusEl.textContent = "";
          }, 500);
        }
      } catch {}
    } else {
      // Save draft to localStorage
      try {
        localStorage.setItem("poe:draft", content);
      } catch {}
    }
  }
}
