import { invoke } from "@tauri-apps/api/tauri";
import { readTextFile } from "@tauri-apps/api/fs";

export class FileSwitcher {
  private element: HTMLElement | null = null;
  private files: string[] = [];
  private currentDir: string = "";
  private selectedIndex: number = 0;
  private isVisible: boolean = false;
  private onFileSelect?: (path: string, content: string) => void;

  create(parent: HTMLElement): void {
    this.element = document.createElement("div");
    this.element.className = "file-switcher";
    this.element.style.display = "none";
    
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) {
        this.hide();
      }
    });
    
    parent.appendChild(this.element);
  }

  setOnFileSelect(callback: (path: string, content: string) => void): void {
    this.onFileSelect = callback;
  }

  async show(currentFilePath: string | null): Promise<void> {
    if (!this.element || !currentFilePath) return;
    
    const lastSlash = Math.max(currentFilePath.lastIndexOf("/"), currentFilePath.lastIndexOf("\\"));
    if (lastSlash === -1) return;
    
    this.currentDir = currentFilePath.substring(0, lastSlash);
    const currentFile = currentFilePath.substring(lastSlash + 1);
    
    try {
      this.files = await invoke<string[]>("list_md_files", { dir: this.currentDir });
      if (this.files.length === 0) return;
      
      this.selectedIndex = this.files.indexOf(currentFile);
      if (this.selectedIndex === -1) this.selectedIndex = 0;
      
      this.isVisible = true;
      this.element.style.display = "flex";
      this.render();
    } catch (e) {
      console.error("Failed to list files:", e);
    }
  }

  hide(): void {
    if (!this.element) return;
    this.isVisible = false;
    this.element.style.display = "none";
  }

  toggle(currentFilePath: string | null): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show(currentFilePath);
    }
  }

  isOpen(): boolean {
    return this.isVisible;
  }

  handleKey(e: KeyboardEvent): boolean {
    if (!this.isVisible) return false;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + this.files.length) % this.files.length;
        this.render();
        return true;

      case "ArrowDown":
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % this.files.length;
        this.render();
        return true;

      case "Enter":
        e.preventDefault();
        this.selectFile();
        return true;

      case "Escape":
        e.preventDefault();
        this.hide();
        return true;
    }

    return true;
  }

  private async selectFile(): Promise<void> {
    const file = this.files[this.selectedIndex];
    if (!file) return;
    
    const fullPath = `${this.currentDir}/${file}`;
    
    try {
      const content = await readTextFile(fullPath);
      this.onFileSelect?.(fullPath, content);
      this.hide();
    } catch (e) {
      console.error("Failed to read file:", e);
    }
  }

  private render(): void {
    if (!this.element) return;

    const maxVisible = Math.min(10, this.files.length);
    let scrollOffset = 0;
    
    if (this.selectedIndex >= maxVisible) {
      scrollOffset = this.selectedIndex - maxVisible + 1;
    }
    
    const visibleFiles = this.files.slice(scrollOffset, scrollOffset + maxVisible);

    const rows = visibleFiles.map((file, visibleIdx) => {
      const idx = visibleIdx + scrollOffset;
      const isSelected = idx === this.selectedIndex;
      
      return `
        <div class="switcher-row${isSelected ? " selected" : ""}" data-index="${idx}">
          <span class="switcher-icon">📄</span>
          <span class="switcher-name">${file}</span>
        </div>
      `;
    }).join("");

    this.element.innerHTML = `
      <div class="switcher-content">
        <div class="switcher-header">${this.currentDir}</div>
        <div class="switcher-rows">${rows}</div>
        <div class="switcher-footer">↑↓ navegar | Enter abrir | Esc cerrar</div>
      </div>
    `;

    this.element.querySelectorAll(".switcher-row").forEach((row) => {
      row.addEventListener("click", () => {
        const index = parseInt(row.getAttribute("data-index") || "0");
        this.selectedIndex = index;
        this.selectFile();
      });
    });
  }
}
