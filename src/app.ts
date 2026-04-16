import { Editor } from "./editor";
import { DOMRenderer } from "./renderers/dom";
import { InputHandler } from "./input";
import { SoundManager } from "./sound";
import { loadConfig } from "./settings";
import { detectTauri } from "./lib/tauri-detect";
import { SearchBar } from "./ui/search-bar";
import { openFileDialog, saveFileDialog, saveFile, getFileName } from "./file-ops";

export class App {
  private root: HTMLElement | null = null;
  private editor: Editor | null = null;
  private inputHandler: InputHandler | null = null;
  private soundManager: SoundManager;
  private searchBar: SearchBar | null = null;
  private currentFile: string | null = null;
  private isTauri: boolean = false;

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
    }

    this.inputHandler = new InputHandler(this.editor);
    this.inputHandler.onSave = () => this.handleSave();
    this.inputHandler.onOpen = () => this.handleOpen();
    this.inputHandler.onSearch = () => this.searchBar?.toggle();
    this.inputHandler.install();

    this.soundManager.enable(cfg.sound);
    this.soundManager.setVolume(cfg.soundVolume);

    this.updateFilename();
    console.log("App initialized", { isTauri: this.isTauri });
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
