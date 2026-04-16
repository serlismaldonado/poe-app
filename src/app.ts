export class App {
  private root: HTMLElement | null = null;

  constructor() {
    this.root = document.getElementById("app");
  }

  init() {
    if (!this.root) return;

    this.root.innerHTML = `
      <div class="editor-container">
        <div class="editor" id="editor"></div>
        <div class="status-bar">
          <div class="status-left">
            <span class="status-item">Poe 1.0.0</span>
          </div>
          <div class="status-right">
            <span class="status-item" id="position">Ln 1, Col 1</span>
            <span class="status-item" id="mode">Markdown</span>
          </div>
        </div>
      </div>
    `;

    console.log("App initialized");
  }
}
