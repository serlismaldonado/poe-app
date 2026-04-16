import { EditorState } from "../state";
import { IRenderer } from "./types";
import { highlightLine, TokenType } from "../lib/highlight";

export interface MouseEventCallback {
  (line: number, col: number, type: "down" | "move" | "up"): void;
}

export class DOMRenderer implements IRenderer {
  private editorEl: HTMLElement | null = null;
  private positionEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private modeEl: HTMLElement | null = null;
  private statsEl: HTMLElement | null = null;
  private onMouseEvent: MouseEventCallback | null = null;
  private isMouseDown: boolean = false;

  constructor() {
    this.editorEl = document.getElementById("editor");
    this.positionEl = document.getElementById("position");
    this.statusEl = document.getElementById("status");
    this.modeEl = document.getElementById("mode");
    this.statsEl = document.getElementById("stats");
  }

  setMouseCallback(callback: MouseEventCallback): void {
    this.onMouseEvent = callback;
    this.setupMouseEvents();
  }

  private setupMouseEvents(): void {
    if (!this.editorEl) return;

    this.editorEl.addEventListener("mousedown", (e) => {
      const pos = this.getPositionFromEvent(e);
      if (pos) {
        this.isMouseDown = true;
        this.isDragging = true;
        this.onMouseEvent?.(pos.line, pos.col, "down");
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (this.isMouseDown) {
        const pos = this.getPositionFromEvent(e);
        if (pos) {
          this.onMouseEvent?.(pos.line, pos.col, "move");
        }
      }
    });

    document.addEventListener("mouseup", () => {
      if (this.isMouseDown) {
        this.isMouseDown = false;
        this.isDragging = false;
        this.fullRenderNeeded = true;
        this.onMouseEvent?.(0, 0, "up");
      }
    });
  }

  private getPositionFromEvent(e: MouseEvent): { line: number; col: number } | null {
    const target = e.target as HTMLElement;
    
    // Check if clicked on a char span
    if (target.classList.contains("char")) {
      const line = target.closest(".line");
      if (line) {
        const lineNum = parseInt(line.getAttribute("data-line") || "0");
        const chars = Array.from(line.querySelectorAll(".char"));
        const charIdx = chars.indexOf(target);
        return { line: lineNum, col: Math.max(0, charIdx) };
      }
    }
    
    // Check if clicked on a line (but not on a char)
    const line = target.closest(".line") as HTMLElement;
    if (line) {
      const lineNum = parseInt(line.getAttribute("data-line") || "0");
      const chars = line.querySelectorAll(".char");
      return { line: lineNum, col: chars.length };
    }
    
    // Clicked on editor but outside lines - go to last line
    if (target.closest(".editor")) {
      const lines = this.editorEl?.querySelectorAll(".line");
      if (lines && lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        const lineNum = parseInt(lastLine.getAttribute("data-line") || "0");
        const chars = lastLine.querySelectorAll(".char");
        return { line: lineNum, col: chars.length };
      }
    }
    
    return null;
  }

  private lastState: { cursorLine: number; cursorCol: number; selectionStart: any; linesHash: string } | null = null;
  private fullRenderNeeded: boolean = true;
  private isDragging: boolean = false;

  render(state: EditorState): void {
    if (!this.editorEl) return;

    const mode = state.cfg.mode || "markdown";
    const linesHash = state.lines.join("\n");
    
    // Check if we need full render or just cursor update
    const needsFullRender = this.fullRenderNeeded || 
      !this.lastState || 
      this.lastState.linesHash !== linesHash ||
      (!this.isDragging && this.lastState.cursorLine !== state.cursorLine);

    if (needsFullRender) {
      const html = this.renderLines(state);
      this.editorEl.innerHTML = `<div class="content mode-${mode}">${html}</div>`;
      this.fullRenderNeeded = false;
    } else {
      // Just update cursor and selection classes
      this.updateCursorAndSelection(state);
    }

    this.lastState = {
      cursorLine: state.cursorLine,
      cursorCol: state.cursorCol,
      selectionStart: state.selectionStart ? { ...state.selectionStart } : null,
      linesHash
    };

    this.updatePosition(state);
    this.updateStatus(state);
    this.scrollToVisibleCursor(state);
  }

  forceFullRender(): void {
    this.fullRenderNeeded = true;
  }

  private updateCursorAndSelection(state: EditorState): void {
    const content = this.editorEl?.querySelector(".content");
    if (!content) return;

    // Remove old cursor and selection classes
    content.querySelectorAll(".cursor").forEach(el => el.classList.remove("cursor"));
    content.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
    content.querySelectorAll(".line.active").forEach(el => el.classList.remove("active"));

    // Add active line class
    const lines = content.querySelectorAll(".line");
    if (lines[state.cursorLine]) {
      lines[state.cursorLine].classList.add("active");
    }

    // Add cursor class
    const cursorLine = lines[state.cursorLine];
    if (cursorLine) {
      const chars = cursorLine.querySelectorAll(".char");
      if (chars[state.cursorCol]) {
        chars[state.cursorCol].classList.add("cursor");
      } else if (chars.length > 0 && state.cursorCol >= chars.length) {
        // Cursor at end of line - add to last char or create placeholder
        chars[chars.length - 1]?.classList.add("cursor");
      }
    }

    // Add selection classes
    if (state.selectionStart) {
      const sel = this.normalizeSelection(state.selectionStart, { line: state.cursorLine, col: state.cursorCol });
      if (sel) {
        for (let lineNum = sel.start.line; lineNum <= sel.end.line; lineNum++) {
          const line = lines[lineNum];
          if (!line) continue;
          const chars = line.querySelectorAll(".char");
          
          const startCol = lineNum === sel.start.line ? sel.start.col : 0;
          const endCol = lineNum === sel.end.line ? sel.end.col : chars.length;
          
          for (let col = startCol; col < endCol; col++) {
            if (chars[col]) {
              chars[col].classList.add("selected");
            }
          }
        }
      }
    }
  }

  private normalizeSelection(start: { line: number; col: number }, end: { line: number; col: number }) {
    if (start.line < end.line || (start.line === end.line && start.col <= end.col)) {
      return { start, end };
    }
    return { start: end, end: start };
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

  private renderLines(state: EditorState): string {
    const mode = (state.cfg.mode || "markdown") as "markdown" | "screenplay" | "novel";

    return state.lines
      .map((line, lineNum) => {
        const isCurrentLine = lineNum === state.cursorLine;
        const elementType = mode === "screenplay" ? this.getLineElementType(line) : "";

        // Novel mode: detect empty lines and paragraph starts
        let novelClass = "";
        if (mode === "novel") {
          const isEmpty = line.trim() === "";
          const prevLineEmpty = lineNum > 0 && state.lines[lineNum - 1].trim() === "";
          const isFirstLine = lineNum === 0;
          const isChapter = /^(cap[ií]tulo|chapter|parte|part)\s+/i.test(line.trim());

          if (isEmpty) {
            novelClass = " empty-line";
          } else if (isFirstLine || prevLineEmpty || isChapter) {
            novelClass = " paragraph-start";
          }
        }

        const lineClass = `line${isCurrentLine ? " active" : ""}${elementType}${novelClass}`;
        const content = this.renderLine(line, lineNum, state, mode);
        return `<div class="${lineClass}" data-line="${lineNum}">${content}</div>`;
      })
      .join("");
  }

  private getLineElementType(line: string): string {
    const ind = line.match(/^ */)?.[0].length || 0;
    const trimmed = line.trimStart();

    if (ind === 0 && /^(INT\.|EXT\.|INT\/EXT|I\/E)/i.test(trimmed)) {
      return "line-scene";
    }
    if (ind === 0 && /^(CUT TO:|FADE OUT|FADE IN|DISSOLVE TO|SMASH CUT)/i.test(trimmed)) {
      return "line-transition";
    }
    if (ind >= 20) return "line-character";
    if (ind >= 14) return "line-parenthetical";
    if (ind >= 8) return "line-dialogue";
    return "line-action";
  }

  private renderLine(
    line: string,
    lineNum: number,
    state: EditorState,
    mode: "markdown" | "screenplay" | "novel"
  ): string {
    const isCurrentLine = lineNum === state.cursorLine;
    const tokens = highlightLine(line, mode, isCurrentLine);
    let html = "";
    let charOffset = 0;

    // Calcular indentación para screenplay
    const lineIndent = line.match(/^ */)?.[0].length || 0;

    // Calcular límites de palabra actual para focus mode
    const wordBounds = isCurrentLine ? this.getWordBoundaries(line, state.cursorCol) : null;

    for (const token of tokens) {
      // Saltar tokens ocultos (marcadores en líneas no activas)
      if (token.hidden) {
        charOffset += token.text.length;
        continue;
      }

      for (let i = 0; i < token.text.length; i++) {
        const char = token.text[i];
        const col = charOffset + i;
        const isCursor = isCurrentLine && col === state.cursorCol;
        const isSelected = this.isCharSelected(lineNum, col, state);
        const isSearchMatch = this.isSearchMatch(lineNum, col, state);
        const isInCurrentWord = wordBounds && col >= wordBounds.start && col < wordBounds.end;

        let className = `char token-${token.type}`;
        if (isCursor) className += " cursor";
        if (isSelected) className += " selected";
        if (isSearchMatch) className += " search-match";
        
        // Aplicar color de gris según configuración
        let inlineStyle = "";
        const cfg = state.cfg;
        if (token.type === "h1" && cfg.h1Gray) {
          inlineStyle = `color: rgb(${cfg.h1Gray}, ${cfg.h1Gray}, ${cfg.h1Gray})`;
        } else if (token.type === "h2" && cfg.h2Gray) {
          inlineStyle = `color: rgb(${cfg.h2Gray}, ${cfg.h2Gray}, ${cfg.h2Gray})`;
        } else if (token.type === "h3" && cfg.h3Gray) {
          inlineStyle = `color: rgb(${cfg.h3Gray}, ${cfg.h3Gray}, ${cfg.h3Gray})`;
        } else if (token.type === "h4" && cfg.h4Gray) {
          inlineStyle = `color: rgb(${cfg.h4Gray}, ${cfg.h4Gray}, ${cfg.h4Gray})`;
        } else if (token.type === "h5" && cfg.h5Gray) {
          inlineStyle = `color: rgb(${cfg.h5Gray}, ${cfg.h5Gray}, ${cfg.h5Gray})`;
        } else if (token.type === "h6" && cfg.h6Gray) {
          inlineStyle = `color: rgb(${cfg.h6Gray}, ${cfg.h6Gray}, ${cfg.h6Gray})`;
        } else if (token.type === "bold" && cfg.boldGray) {
          inlineStyle = `color: rgb(${cfg.boldGray}, ${cfg.boldGray}, ${cfg.boldGray})`;
        } else if (token.type === "italic" && cfg.italicGray) {
          inlineStyle = `color: rgb(${cfg.italicGray}, ${cfg.italicGray}, ${cfg.italicGray})`;
        }

        // Marcar espacios de indentación en screenplay
        if (mode === "screenplay" && col < lineIndent && char === " ") {
          className += " indent-space";
        }

        // Focus mode: fade based on word proximity
        if (!state.selectionStart) {
          if (mode === "screenplay") {
            if (!isCurrentLine && token.type !== "scene-heading" && token.type !== "character") {
              className += " faded";
            } else if (isCurrentLine && !isInCurrentWord && !isCursor) {
              className += " faded-soft";
            }
          } else {
            // markdown and novel modes
            if (!isCurrentLine) {
              className += " faded";
            } else if (!isInCurrentWord && !isCursor) {
              className += " faded-soft";
            }
          }
        }

        const styleAttr = inlineStyle ? ` style="${inlineStyle}"` : "";
        html += `<span class="${className}"${styleAttr}>${this.escapeChar(char)}</span>`;
      }
      charOffset += token.text.length;
    }

    // Cursor at end of line
    if (isCurrentLine && state.cursorCol === line.length) {
      html += '<span class="char cursor">&nbsp;</span>';
    }

    if (!html) {
      html = "&nbsp;";
    }

    return html;
  }

  private escapeChar(char: string): string {
    switch (char) {
      case " ":
        return "&nbsp;";
      case "\t":
        return "&nbsp;&nbsp;&nbsp;&nbsp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      default:
        return char;
    }
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

  private isSearchMatch(
    lineNum: number,
    col: number,
    state: EditorState
  ): boolean {
    if (!state.searchMode || !state.searchQuery) return false;

    for (const match of state.searchMatches) {
      if (
        match.line === lineNum &&
        col >= match.col &&
        col < match.col + (match.length || state.searchQuery.length)
      ) {
        return true;
      }
    }
    return false;
  }

  private updatePosition(state: EditorState): void {
    if (this.positionEl) {
      const line = state.cursorLine + 1;
      const col = state.cursorCol + 1;
      this.positionEl.textContent = `${line}:${col}`;
    }

    if (this.statsEl) {
      const lines = state.lines.length;
      const words = state.lines.join(" ").split(/\s+/).filter(Boolean).length;
      this.statsEl.textContent = `${lines}L ${words}W`;
    }
  }

  private updateStatus(state: EditorState): void {
    const mode = state.cfg.mode || "markdown";

    if (this.modeEl) {
      if (mode === "screenplay") {
        const element = this.getScreenplayElement(state);
        this.modeEl.textContent = element;
        this.modeEl.className = "status-item screenplay-element";
      } else {
        this.modeEl.textContent = mode.toUpperCase();
        this.modeEl.className = "status-item";
      }
    }

    if (this.statusEl) {
      if (state.isSaving) {
        this.statusEl.textContent = "Saving...";
      }
    }
  }

  private getWordBoundaries(line: string, col: number): { start: number; end: number } | null {
    if (col < 0 || col > line.length) return null;

    let start = col;
    let end = col;

    // Si estamos en un caracter de palabra, expandir
    if (col < line.length && /\w/.test(line[col])) {
      while (start > 0 && /\w/.test(line[start - 1])) start--;
      while (end < line.length && /\w/.test(line[end])) end++;
    }
    // Si estamos justo después de una palabra
    else if (col > 0 && /\w/.test(line[col - 1])) {
      end = col;
      start = col - 1;
      while (start > 0 && /\w/.test(line[start - 1])) start--;
    }

    return start < end ? { start, end } : null;
  }

  private getScreenplayElement(state: EditorState): string {
    const ln = state.lines[state.cursorLine] || "";
    const ind = ln.match(/^ */)?.[0].length || 0;
    const trimmed = ln.trimStart();

    if (ind === 0 && /^(INT\.|EXT\.|INT\/EXT|I\/E)/i.test(trimmed)) {
      return "ESCENA";
    }
    if (ind === 0 && /^(CUT TO:|FADE OUT|FADE IN|DISSOLVE TO|SMASH CUT)/i.test(trimmed)) {
      return "TRANSICIÓN";
    }
    if (ind >= 20) return "PERSONAJE";
    if (ind >= 14) return "PARÉNTESIS";
    if (ind >= 8) return "DIÁLOGO";
    return "ACCIÓN";
  }

  private scrollToVisibleCursor(state: EditorState): void {
    if (!this.editorEl) return;

    const content = this.editorEl.querySelector(".content");
    if (!content) return;

    const lines = content.querySelectorAll(".line");
    if (lines[state.cursorLine]) {
      const line = lines[state.cursorLine] as HTMLElement;
      line.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
  }
}
