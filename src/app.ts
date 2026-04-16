import { Editor } from "./editor";
import { DOMRenderer } from "./renderers/dom";
import { InputHandler } from "./input";
import { SoundManager } from "./sound";
import { loadConfig, saveConfig } from "./settings";
import { TauriFileManager, LocalFileManager, IFileManager } from "./file-manager";
import { detectTauri } from "./lib/tauri-detect";
import { SearchBar } from "./ui/search-bar";

export class App {
  private root: HTMLElement | null = null;
  private editor: Editor | null = null;
  private inputHandler: InputHandler | null = null;
  private soundManager: SoundManager;
  private fileManager: IFileManager;
  private searchBar: SearchBar | null = null;
  private currentFile: string | null = null;

  constructor() {
    this.root = document.getElementById("app");
    this.soundManager = new SoundManager();
    this.fileManager = new LocalFileManager();
  }

  async init() {
    if (!this.root) return;

    const isTauri = await detectTauri();
    if (isTauri) {
      this.fileManager = new TauriFileManager();
    }

    this.root.innerHTML = `
      <div class="editor-container">
        <div class="editor" id="editor"></div>
        <div class="status-bar">
          <div class="status-left">
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
    const renderer = new DOMRenderer();
    this.editor = new Editor(renderer);
    this.editor.setConfig(cfg);
    this.editor.setSoundManager(this.soundManager);
    this.editor.onAutoSave = () => this.handleAutoSave();
    this.editor.setContent([
      "# Welcome to Poe",
      "",
      "A minimal markdown editor for focused writing.",
      "",
      "## Keyboard Shortcuts",
      "",
      "- Ctrl+S: Save file",
      "- Ctrl+Z: Undo",
      "- Ctrl+Y: Redo",
      "- Ctrl+A: Select all",
      "- Ctrl+D: Duplicate line",
      "- Ctrl+K: Kill line",
      "- Alt+↑/↓: Move line up/down",
      "- Tab/Shift+Tab: Indent/dedent",
    ]);

    this.searchBar = new SearchBar(this.editor);
    const editorContainer = this.root.querySelector(".editor-container");
    if (editorContainer) {
      this.searchBar.create(editorContainer as HTMLElement);
    }

    this.inputHandler = new InputHandler(this.editor);
    this.inputHandler.onSave = () => this.handleSave();
    this.inputHandler.onSearch = () => this.searchBar?.toggle();
    this.inputHandler.install();

    this.soundManager.enable(cfg.sound);
    this.soundManager.setVolume(cfg.soundVolume);

    console.log("App initialized", { isTauri });
  }

  private async handleSave(): Promise<void> {
    if (!this.editor) return;

    const statusEl = document.getElementById("status");
    if (statusEl) {
      statusEl.textContent = "Saving...";
    }

    const content = this.editor.getContent();
    
    if (this.currentFile) {
      try {
        await this.fileManager.save(this.currentFile, content);
        if (statusEl) {
          statusEl.textContent = "Saved";
          setTimeout(() => {
            if (statusEl) statusEl.textContent = "";
          }, 1000);
        }
      } catch (error) {
        console.error("Save failed:", error);
        if (statusEl) {
          statusEl.textContent = "Save failed";
        }
      }
    }
  }

  private async handleAutoSave(): Promise<void> {
    if (!this.editor) return;

    const statusEl = document.getElementById("status");
    const content = this.editor.getContent();

    if (this.currentFile) {
      try {
        await this.fileManager.save(this.currentFile, content);
        if (statusEl) {
          statusEl.textContent = "Auto-saved";
          setTimeout(() => {
            if (statusEl) statusEl.textContent = "";
          }, 500);
        }
      } catch {}
    } else {
      // Sin archivo, guardar en localStorage como backup
      try {
        localStorage.setItem("poe:draft", content);
        if (statusEl) {
          statusEl.textContent = "Draft saved";
          setTimeout(() => {
            if (statusEl) statusEl.textContent = "";
          }, 500);
        }
      } catch {}
    }
  }
}
