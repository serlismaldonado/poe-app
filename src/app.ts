import { Editor } from "./editor";
import { DOMRenderer } from "./renderers/dom";
import { InputHandler } from "./input";
import { SoundManager } from "./sound";
import { loadConfig } from "./settings";
import { TauriFileManager } from "./file-manager";

export class App {
  private root: HTMLElement | null = null;
  private editor: Editor | null = null;
  private inputHandler: InputHandler | null = null;
  private soundManager: SoundManager;
  private fileManager: TauriFileManager;

  constructor() {
    this.root = document.getElementById("app");
    this.soundManager = new SoundManager();
    this.fileManager = new TauriFileManager();
  }

  async init() {
    if (!this.root) return;

    this.root.innerHTML = `
      <div class="editor-container">
        <div class="editor" id="editor"></div>
        <div class="status-bar">
          <div class="status-left">
            <span class="status-item">Poe 1.0.0</span>
            <span class="status-item" id="filename">Untitled</span>
          </div>
          <div class="status-right">
            <span class="status-item" id="position">Ln 1, Col 1</span>
            <span class="status-item" id="mode">Markdown</span>
            <span class="status-item" id="status"></span>
          </div>
        </div>
      </div>
    `;

    const cfg = await loadConfig();
    const renderer = new DOMRenderer();
    this.editor = new Editor(renderer);
    this.editor.setConfig(cfg);
    this.editor.setContent([
      "# Welcome to Poe",
      "",
      "Start typing to edit. Press Ctrl+S to save.",
    ]);

    this.inputHandler = new InputHandler(this.editor);
    this.inputHandler.onSave = () => this.handleSave();
    this.inputHandler.install();

    this.soundManager.enable(cfg.sound);

    console.log("App initialized");
  }

  private async handleSave(): Promise<void> {
    if (!this.editor) return;
    const statusEl = document.getElementById("status");
    if (statusEl) {
      statusEl.textContent = "Saving...";
      setTimeout(() => {
        statusEl.textContent = "";
      }, 500);
    }
  }
}
