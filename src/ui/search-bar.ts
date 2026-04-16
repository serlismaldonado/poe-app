import { Editor } from "../editor";

export class SearchBar {
  private editor: Editor;
  private container: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private visible: boolean = false;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  create(parent: HTMLElement): void {
    this.container = document.createElement("div");
    this.container.className = "search-bar";
    this.container.innerHTML = `
      <div class="search-bar-inner">
        <input type="text" class="search-input" placeholder="Search..." />
        <span class="search-count"></span>
        <button class="search-btn search-prev">↑</button>
        <button class="search-btn search-next">↓</button>
        <button class="search-btn search-close">×</button>
      </div>
    `;
    this.container.style.display = "none";
    parent.insertBefore(this.container, parent.firstChild);

    this.input = this.container.querySelector(".search-input");
    this.setupEvents();
  }

  private setupEvents(): void {
    if (!this.input || !this.container) return;

    this.input.addEventListener("input", () => {
      const query = this.input?.value || "";
      const matches = this.editor.search(query);
      this.updateCount(matches.length);
    });

    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          this.editor.prevSearchMatch();
        } else {
          this.editor.nextSearchMatch();
        }
      } else if (e.key === "Escape") {
        this.hide();
      }
    });

    const prevBtn = this.container.querySelector(".search-prev");
    const nextBtn = this.container.querySelector(".search-next");
    const closeBtn = this.container.querySelector(".search-close");

    prevBtn?.addEventListener("click", () => this.editor.prevSearchMatch());
    nextBtn?.addEventListener("click", () => this.editor.nextSearchMatch());
    closeBtn?.addEventListener("click", () => this.hide());
  }

  private updateCount(count: number): void {
    const countEl = this.container?.querySelector(".search-count");
    if (countEl) {
      countEl.textContent = count > 0 ? `${count} found` : "No matches";
    }
  }

  show(): void {
    if (!this.container || !this.input) return;
    this.container.style.display = "block";
    this.input.focus();
    this.input.select();
    this.visible = true;
  }

  hide(): void {
    if (!this.container) return;
    this.container.style.display = "none";
    this.editor.clearSearch();
    this.visible = false;
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }
}
