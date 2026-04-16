import { EditorState } from "../state";
import { IRenderer } from "./types";

export class DOMRenderer implements IRenderer {
  private editorEl: HTMLElement | null = null;
  private positionEl: HTMLElement | null = null;

  constructor() {
    this.editorEl = document.getElementById("editor");
    this.positionEl = document.getElementById("position");
  }

  render(state: EditorState): void {
    if (!this.editorEl) return;

    this.editorEl.textContent = state.lines.join("\n");
    this.updatePosition(state);
  }

  setSize(width: number, height: number): void {
    if (this.editorEl) {
      this.editorEl.style.width = `${width}px`;
      this.editorEl.style.height = `${height}px`;
    }
  }

  clear(): void {
    if (this.editorEl) {
      this.editorEl.textContent = "";
    }
  }

  private updatePosition(state: EditorState): void {
    if (this.positionEl) {
      const line = state.cursorLine + 1;
      const col = state.cursorCol + 1;
      this.positionEl.textContent = `Ln ${line}, Col ${col}`;
    }
  }
}
