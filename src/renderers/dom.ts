import { EditorState } from "../state";
import { IRenderer } from "./types";
import { highlightMarkdownLine } from "../lib/markdown-highlight";

export class DOMRenderer implements IRenderer {
  private editorEl: HTMLElement | null = null;
  private positionEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;

  constructor() {
    this.editorEl = document.getElementById("editor");
    this.positionEl = document.getElementById("position");
    this.statusEl = document.getElementById("status");
  }

  render(state: EditorState): void {
    if (!this.editorEl) return;

    const html = this.highlightLines(state.lines, state);
    this.editorEl.innerHTML = html;
    this.updatePosition(state);
    this.updateStatus(state);
    this.scrollToVisibleCursor(state);
  }

  setSize(width: number, height: number): void {
    if (this.editorEl) {
      this.editorEl.style.width = `${width}px`;
      this.editorEl.style.height = `${height}px`;
    }
  }

  clear(): void {
    if (this.editorEl) {
      this.editorEl.innerHTML = "";
    }
  }

  private highlightLines(lines: string[], state: EditorState): string {
    return lines
      .map((line, lineNum) => this.highlightLine(line, lineNum, state))
      .map((content, idx) => `<div class="line" data-line="${idx}">${content}</div>`)
      .join("");
  }

  private highlightLine(line: string, lineNum: number, state: EditorState): string {
    const tokens = highlightMarkdownLine(line);
    let html = "";
    let charOffset = 0;

    for (const token of tokens) {
      for (let i = 0; i < token.text.length; i++) {
        const char = token.text[i];
        const col = charOffset + i;
        const isCurrentLine = lineNum === state.cursorLine;
        const isCursor = isCurrentLine && col === state.cursorCol;
        const isSelected = this.isCharSelected(lineNum, col, state);

        let className = `char token-${token.type}`;
        if (isCursor) className += " cursor";
        if (isSelected) className += " selected";

        let displayChar = char;
        if (char === " ") {
          displayChar = "&nbsp;";
        } else if (char === "\t") {
          displayChar = "&nbsp;&nbsp;&nbsp;&nbsp;";
        } else if (char === "<") {
          displayChar = "&lt;";
        } else if (char === ">") {
          displayChar = "&gt;";
        } else if (char === "&") {
          displayChar = "&amp;";
        }

        html += `<span class="${className}">${displayChar}</span>`;
      }
      charOffset += token.text.length;
    }

    // Ensure cursor shows at end of line
    if (state.cursorLine === lineNum && state.cursorCol === line.length) {
      html += '<span class="char cursor">&nbsp;</span>';
    }

    if (!html) {
      html = "&nbsp;";
    }

    return html;
  }

  private isCharSelected(
    lineNum: number,
    col: number,
    state: EditorState
  ): boolean {
    if (!state.selectionStart || !state.selectionEnd) return false;

    const start = state.selectionStart;
    const end = state.selectionEnd;

    const startLine = Math.min(start.line, end.line);
    const endLine = Math.max(start.line, end.line);
    const startCol =
      start.line < end.line ? start.col : Math.min(start.col, end.col);
    const endCol =
      start.line < end.line ? end.col : Math.max(start.col, end.col);

    if (lineNum < startLine || lineNum > endLine) return false;
    if (lineNum === startLine && lineNum === endLine) {
      return col >= startCol && col < endCol;
    }
    if (lineNum === startLine) return col >= startCol;
    if (lineNum === endLine) return col < endCol;
    return true;
  }

  private updatePosition(state: EditorState): void {
    if (this.positionEl) {
      const line = state.cursorLine + 1;
      const col = state.cursorCol + 1;
      this.positionEl.textContent = `Ln ${line}, Col ${col}`;
    }
  }

  private updateStatus(state: EditorState): void {
    if (this.statusEl) {
      const mode = (state.cfg.mode || "markdown").toUpperCase();
      let status = mode;
      if (state.isSaving) {
        status += " [saving...]";
      }
      this.statusEl.textContent = status;
    }
  }

  private scrollToVisibleCursor(state: EditorState): void {
    if (!this.editorEl) return;

    const lines = this.editorEl.querySelectorAll(".line");
    if (lines[state.cursorLine]) {
      const line = lines[state.cursorLine] as HTMLElement;
      line.scrollIntoView({ behavior: "auto", block: "center" });
    }
  }
}
