import { EditorState, EditorSnapshot, createState } from "./state";
import { Config } from "./settings";
import { IRenderer } from "./renderers/types";
import { SearchEngine, SearchMatch } from "./search";
import { SoundManager } from "./sound";

const MAX_UNDO = 200;

// Screenplay indentation levels
const SP = {
  ACTION: 0,
  DIALOGUE: 10,
  PARENTHETICAL: 15,
  CHARACTER: 20,
};

export class Editor {
  state: EditorState;
  renderer: IRenderer;
  private searchEngine: SearchEngine;
  private soundManager: SoundManager | null = null;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  onAutoSave?: () => void;

  constructor(renderer: IRenderer) {
    this.state = createState();
    this.renderer = renderer;
    this.searchEngine = new SearchEngine();
  }

  setSoundManager(soundManager: SoundManager): void {
    this.soundManager = soundManager;
  }

  private playSound(type: "key" | "space" | "enter" | "backspace"): void {
    if (this.soundManager && this.state.cfg) {
      this.soundManager.play(type, this.state.cfg as any);
    }
  }

  private triggerAutoSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    const delay = this.state.cfg.autosaveMs || 500;
    this.saveTimeout = setTimeout(() => {
      this.onAutoSave?.();
      this.saveTimeout = null;
    }, delay);
  }

  setConfig(cfg: Config): void {
    this.state.cfg = cfg;
  }

  setContent(lines: string[], cursorAtEnd: boolean = true): void {
    this.state.lines = lines.length > 0 ? lines : [""];
    if (cursorAtEnd) {
      this.state.cursorLine = this.state.lines.length - 1;
      this.state.cursorCol = this.state.lines[this.state.cursorLine].length;
    } else {
      this.state.cursorLine = 0;
      this.state.cursorCol = 0;
    }
    this.state.selectionStart = null;
    this.render();
  }

  getContent(): string {
    return this.state.lines.join("\n");
  }

  private mouseRenderPending: boolean = false;

  handleMouseDown(line: number, col: number): void {
    this.state.cursorLine = Math.min(line, this.state.lines.length - 1);
    this.state.cursorCol = Math.min(col, this.state.lines[this.state.cursorLine].length);
    this.state.selectionStart = { line: this.state.cursorLine, col: this.state.cursorCol };
    this.scheduleMouseRender();
  }

  handleMouseMove(line: number, col: number): void {
    const newLine = Math.min(line, this.state.lines.length - 1);
    const newCol = Math.min(col, this.state.lines[newLine].length);
    
    if (newLine !== this.state.cursorLine || newCol !== this.state.cursorCol) {
      this.state.cursorLine = newLine;
      this.state.cursorCol = newCol;
      this.scheduleMouseRender();
    }
  }

  handleMouseUp(): void {
    if (this.state.selectionStart) {
      if (this.state.selectionStart.line === this.state.cursorLine &&
          this.state.selectionStart.col === this.state.cursorCol) {
        this.state.selectionStart = null;
      }
    }
    this.render();
  }

  private scheduleMouseRender(): void {
    if (this.mouseRenderPending) return;
    this.mouseRenderPending = true;
    requestAnimationFrame(() => {
      this.mouseRenderPending = false;
      this.render();
    });
  }

  getMode(): string {
    return this.state.cfg.mode || "markdown";
  }

  toggleMode(): void {
    const currentMode = this.state.cfg.mode || "markdown";
    const modes = ["markdown", "screenplay", "novel"] as const;
    const currentIndex = modes.indexOf(currentMode as any);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.state.cfg.mode = modes[nextIndex];
    this.render();
  }

  private snapshot(): EditorSnapshot {
    return {
      lines: this.state.lines.slice(),
      cursorLine: this.state.cursorLine,
      cursorCol: this.state.cursorCol,
    };
  }

  private pushUndo(snap: EditorSnapshot): void {
    this.state.undoStack.push(snap);
    if (this.state.undoStack.length > MAX_UNDO) {
      this.state.undoStack.shift();
    }
    this.state.redoStack.length = 0;
  }

  undo(): void {
    if (!this.state.undoStack.length) return;
    this.state.redoStack.push(this.snapshot());
    const s = this.state.undoStack.pop()!;
    this.state.lines = s.lines;
    this.state.cursorLine = s.cursorLine;
    this.state.cursorCol = s.cursorCol;
    this.render();
  }

  redo(): void {
    if (!this.state.redoStack.length) return;
    this.state.undoStack.push(this.snapshot());
    const s = this.state.redoStack.pop()!;
    this.state.lines = s.lines;
    this.state.cursorLine = s.cursorLine;
    this.state.cursorCol = s.cursorCol;
    this.render();
  }

  private normalizeSelection(): {
    start: { line: number; col: number };
    end: { line: number; col: number };
  } | null {
    if (!this.state.selectionStart || !this.state.selectionEnd) return null;
    const start = this.state.selectionStart;
    const end = this.state.selectionEnd;
    if (
      start.line > end.line ||
      (start.line === end.line && start.col > end.col)
    ) {
      return { start: end, end: start };
    }
    return { start, end };
  }

  private deselect(): void {
    this.state.selectionStart = null;
    this.state.selectionEnd = null;
  }

  selectAll(): void {
    this.state.selectionStart = { line: 0, col: 0 };
    this.state.selectionEnd = {
      line: this.state.lines.length - 1,
      col: this.state.lines[this.state.lines.length - 1].length,
    };
    this.render();
  }

  private deleteSelection(): boolean {
    const s = this.normalizeSelection();
    if (!s) return false;

    this.pushUndo(this.snapshot());

    if (s.start.line === s.end.line) {
      const ln = this.state.lines[s.start.line];
      this.state.lines[s.start.line] =
        ln.slice(0, s.start.col) + ln.slice(s.end.col);
    } else {
      this.state.lines[s.start.line] =
        this.state.lines[s.start.line].slice(0, s.start.col) +
        this.state.lines[s.end.line].slice(s.end.col);
      this.state.lines.splice(s.start.line + 1, s.end.line - s.start.line);
    }

    this.state.cursorLine = s.start.line;
    this.state.cursorCol = s.start.col;
    this.deselect();
    this.render();
    return true;
  }

  // Movement
  private moveUp(): void {
    if (this.state.cursorLine > 0) {
      this.state.cursorLine--;
      this.state.cursorCol = Math.min(
        this.state.cursorCol,
        this.state.lines[this.state.cursorLine].length
      );
    }
  }

  private moveDown(): void {
    if (this.state.cursorLine < this.state.lines.length - 1) {
      this.state.cursorLine++;
      this.state.cursorCol = Math.min(
        this.state.cursorCol,
        this.state.lines[this.state.cursorLine].length
      );
    }
  }

  private moveLeft(): void {
    if (this.state.cursorCol > 0) {
      this.state.cursorCol--;
    } else if (this.state.cursorLine > 0) {
      this.state.cursorLine--;
      this.state.cursorCol = this.state.lines[this.state.cursorLine].length;
    }
  }

  private moveRight(): void {
    const currentLine = this.state.lines[this.state.cursorLine];
    if (this.state.cursorCol < currentLine.length) {
      this.state.cursorCol++;
    } else if (this.state.cursorLine < this.state.lines.length - 1) {
      this.state.cursorLine++;
      this.state.cursorCol = 0;
    }
  }

  private moveWithSelection(shift: boolean, moveFn: () => void): void {
    if (shift) {
      if (!this.state.selectionStart) {
        this.state.selectionStart = {
          line: this.state.cursorLine,
          col: this.state.cursorCol,
        };
      }
      moveFn();
      this.state.selectionEnd = {
        line: this.state.cursorLine,
        col: this.state.cursorCol,
      };
    } else {
      this.deselect();
      moveFn();
    }
    this.render();
  }

  handleUp(shift = false): void {
    this.moveWithSelection(shift, () => this.moveUp());
  }

  handleDown(shift = false): void {
    this.moveWithSelection(shift, () => this.moveDown());
  }

  handleLeft(shift = false): void {
    this.moveWithSelection(shift, () => this.moveLeft());
  }

  handleRight(shift = false): void {
    this.moveWithSelection(shift, () => this.moveRight());
  }

  handleHome(shift = false): void {
    this.moveWithSelection(shift, () => {
      this.state.cursorCol = 0;
    });
  }

  handleEnd(shift = false): void {
    this.moveWithSelection(shift, () => {
      this.state.cursorCol = this.state.lines[this.state.cursorLine].length;
    });
  }

  handleCtrlHome(): void {
    this.deselect();
    this.state.cursorLine = 0;
    this.state.cursorCol = 0;
    this.render();
  }

  handleCtrlEnd(): void {
    this.deselect();
    this.state.cursorLine = this.state.lines.length - 1;
    this.state.cursorCol = this.state.lines[this.state.cursorLine].length;
    this.render();
  }

  // Word navigation
  wordLeft(): void {
    if (this.state.cursorCol > 0) {
      let c = this.state.cursorCol - 1;
      const ln = this.state.lines[this.state.cursorLine];
      while (c > 0 && !/\w/.test(ln[c])) c--;
      while (c > 0 && /\w/.test(ln[c - 1])) c--;
      this.state.cursorCol = c;
    } else if (this.state.cursorLine > 0) {
      this.state.cursorLine--;
      this.state.cursorCol = this.state.lines[this.state.cursorLine].length;
    }
    this.render();
  }

  wordRight(): void {
    const ln = this.state.lines[this.state.cursorLine];
    if (this.state.cursorCol < ln.length) {
      let c = this.state.cursorCol;
      while (c < ln.length && !/\w/.test(ln[c])) c++;
      while (c < ln.length && /\w/.test(ln[c])) c++;
      this.state.cursorCol = c;
    } else if (this.state.cursorLine < this.state.lines.length - 1) {
      this.state.cursorLine++;
      this.state.cursorCol = 0;
    }
    this.render();
  }

  // Character input
  handleChar(ch: string): void {
    if (this.state.selectionStart && this.state.selectionEnd) {
      this.deleteSelection();
    }

    this.pushUndo(this.snapshot());

    this.state.cursorCol = Math.min(
      this.state.cursorCol,
      this.state.lines[this.state.cursorLine].length
    );

    const ln = this.state.lines[this.state.cursorLine];
    this.state.lines[this.state.cursorLine] =
      ln.slice(0, this.state.cursorCol) + ch + ln.slice(this.state.cursorCol);
    this.state.cursorCol++;

    this.handleWordWrap();
    this.playSound(ch === " " ? "space" : "key");
    this.triggerAutoSave();
    this.render();
  }

  private handleWordWrap(): void {
    const cfg = this.state.cfg;
    const current = this.state.lines[this.state.cursorLine];

    if (cfg.mode === "screenplay") {
      const ind = this.spIndent(current);
      let maxCol: number;
      if (ind >= 18) maxCol = ind + 40;
      else if (ind >= 13) maxCol = ind + 25;
      else if (ind >= 8) maxCol = ind + 35;
      else maxCol = Math.min(cfg.wrapColumn > 0 ? cfg.wrapColumn : 80, 60);

      if (current.length > maxCol) {
        let breakAt = -1;
        for (let i = Math.min(maxCol, current.length - 1); i >= ind + 1; i--) {
          if (current[i] === " ") {
            breakAt = i;
            break;
          }
        }
        if (breakAt > 0) {
          const next =
            " ".repeat(ind) + current.slice(breakAt + 1).trimStart();
          this.state.lines[this.state.cursorLine] = current.slice(0, breakAt);
          this.state.lines.splice(this.state.cursorLine + 1, 0, next);
          this.state.cursorLine++;
          this.state.cursorCol = ind + Math.max(0, this.state.cursorCol - breakAt - 1);
        }
      }
    } else if (cfg.wrapColumn > 0 && current.length > cfg.wrapColumn) {
      if (!/^#{1,3} /.test(current)) {
        let breakAt = -1;
        for (let i = cfg.wrapColumn; i >= 1; i--) {
          if (current[i] === " ") {
            breakAt = i;
            break;
          }
        }
        if (breakAt > 0) {
          this.state.lines[this.state.cursorLine] = current.slice(0, breakAt);
          this.state.lines.splice(
            this.state.cursorLine + 1,
            0,
            current.slice(breakAt + 1)
          );
          this.state.cursorLine++;
          this.state.cursorCol = this.state.cursorCol - breakAt - 1;
        }
      }
    }
  }

  handleBackspace(): void {
    if (this.state.selectionStart && this.state.selectionEnd) {
      this.deleteSelection();
      this.playSound("backspace");
      this.triggerAutoSave();
      return;
    }

    this.pushUndo(this.snapshot());

    if (this.state.cursorCol === 0) {
      if (this.state.cursorLine > 0) {
        this.state.cursorCol =
          this.state.lines[this.state.cursorLine - 1].length;
        this.state.lines[this.state.cursorLine - 1] +=
          this.state.lines[this.state.cursorLine];
        this.state.lines.splice(this.state.cursorLine, 1);
        this.state.cursorLine--;
      }
    } else {
      const ln = this.state.lines[this.state.cursorLine];
      this.state.lines[this.state.cursorLine] =
        ln.slice(0, this.state.cursorCol - 1) + ln.slice(this.state.cursorCol);
      this.state.cursorCol--;
    }

    this.playSound("backspace");
    this.triggerAutoSave();
    this.render();
  }

  handleDelete(): void {
    if (this.state.selectionStart && this.state.selectionEnd) {
      this.deleteSelection();
      this.playSound("backspace");
      this.triggerAutoSave();
      return;
    }

    this.pushUndo(this.snapshot());

    const ln = this.state.lines[this.state.cursorLine];
    if (this.state.cursorCol < ln.length) {
      this.state.lines[this.state.cursorLine] =
        ln.slice(0, this.state.cursorCol) + ln.slice(this.state.cursorCol + 1);
    } else if (this.state.cursorLine < this.state.lines.length - 1) {
      this.state.lines[this.state.cursorLine] +=
        this.state.lines[this.state.cursorLine + 1];
      this.state.lines.splice(this.state.cursorLine + 1, 1);
    }

    this.playSound("backspace");
    this.triggerAutoSave();
    this.render();
  }

  handleEnter(): void {
    if (this.state.cfg.mode === "screenplay") {
      this.screenplayEnter();
      return;
    }

    const ln = this.state.lines[this.state.cursorLine];
    const ahead = ln.slice(this.state.cursorCol);

    // Accept closing inline marker with Enter
    const markerLen = ahead.startsWith("**") ? 2 : ahead.startsWith("*") ? 1 : 0;
    if (markerLen) {
      this.pushUndo(this.snapshot());
      this.state.cursorCol += markerLen;
      const newLn = this.state.lines[this.state.cursorLine];
      this.state.lines[this.state.cursorLine] =
        newLn.slice(0, this.state.cursorCol) +
        " " +
        newLn.slice(this.state.cursorCol);
      this.state.cursorCol++;
      this.playSound("enter");
      this.triggerAutoSave();
      this.render();
      return;
    }

    if (this.state.selectionStart && this.state.selectionEnd) {
      this.deselect();
    }

    this.pushUndo(this.snapshot());

    const left = ln.slice(0, this.state.cursorCol);
    const right = ln.slice(this.state.cursorCol);

    // Auto-bullet
    const bulletMatch = ln.match(/^(\s*)([-*+] )(.*)/);
    if (bulletMatch) {
      const prefix = bulletMatch[1] + bulletMatch[2];
      if (bulletMatch[3].trim() === "" && this.state.cursorCol === ln.length) {
        this.state.lines[this.state.cursorLine] = "";
        this.state.cursorCol = 0;
      } else {
        this.state.lines[this.state.cursorLine] = left;
        this.state.lines.splice(this.state.cursorLine + 1, 0, prefix + right);
        this.state.cursorLine++;
        this.state.cursorCol = prefix.length;
      }
      this.playSound("enter");
      this.triggerAutoSave();
      this.render();
      return;
    }

    // Auto-numbered list
    const numMatch = ln.match(/^(\s*)(\d+(?:\.\d+)*)\. (.*)/);
    if (numMatch) {
      const indent = numMatch[1];
      const parts = numMatch[2].split(".");
      parts[parts.length - 1] = String(
        parseInt(parts[parts.length - 1], 10) + 1
      );
      const nextNum = parts.join(".");
      if (numMatch[3].trim() === "" && this.state.cursorCol === ln.length) {
        this.state.lines[this.state.cursorLine] = "";
        this.state.cursorCol = 0;
      } else {
        const nextPrefix = indent + nextNum + ". ";
        this.state.lines[this.state.cursorLine] = left;
        this.state.lines.splice(
          this.state.cursorLine + 1,
          0,
          nextPrefix + right
        );
        this.state.cursorLine++;
        this.state.cursorCol = nextPrefix.length;
      }
      this.playSound("enter");
      this.triggerAutoSave();
      this.render();
      return;
    }

    this.state.lines[this.state.cursorLine] = left;
    this.state.lines.splice(this.state.cursorLine + 1, 0, right);
    this.state.cursorLine++;
    this.state.cursorCol = 0;
    this.playSound("enter");
    this.triggerAutoSave();
    this.render();
  }

  handleTab(shift = false): void {
    if (shift) {
      this.handleShiftTab();
      return;
    }

    if (this.state.cfg.mode === "screenplay") {
      this.screenplayTab();
      return;
    }

    if (this.state.selectionStart && this.state.selectionEnd) {
      this.pushUndo(this.snapshot());
      const s = this.normalizeSelection();
      if (s) {
        for (let i = s.start.line; i <= s.end.line; i++) {
          const indent = " ".repeat(this.state.cfg.tabSize || 2);
          this.state.lines[i] = indent + this.state.lines[i];
        }
        this.state.cursorCol += this.state.cfg.tabSize || 2;
      }
      this.triggerAutoSave();
      this.render();
      return;
    }

    this.pushUndo(this.snapshot());
    const ln = this.state.lines[this.state.cursorLine];
    const tabSize = this.state.cfg.tabSize || 2;

    // Indent list items
    if (/^\s*[-*+] /.test(ln) || /^\s*\d+(?:\.\d+)*\. /.test(ln)) {
      const indent = " ".repeat(tabSize);
      this.state.lines[this.state.cursorLine] = indent + ln;
      this.state.cursorCol += tabSize;
    } else {
      const indent = " ".repeat(tabSize);
      this.state.lines[this.state.cursorLine] =
        ln.slice(0, this.state.cursorCol) +
        indent +
        ln.slice(this.state.cursorCol);
      this.state.cursorCol += tabSize;
    }
    this.triggerAutoSave();
    this.render();
  }

  private handleShiftTab(): void {
    const tabSize = this.state.cfg.tabSize || 2;

    this.pushUndo(this.snapshot());

    if (this.state.selectionStart && this.state.selectionEnd) {
      const s = this.normalizeSelection();
      if (s) {
        for (let i = s.start.line; i <= s.end.line; i++) {
          const ln = this.state.lines[i];
          const match = ln.match(/^ {1,}/);
          if (match) {
            const spaces = Math.max(0, match[0].length - tabSize);
            this.state.lines[i] = " ".repeat(spaces) + ln.slice(match[0].length);
          }
        }
        this.state.cursorCol = Math.max(0, this.state.cursorCol - tabSize);
      }
    } else {
      const ln = this.state.lines[this.state.cursorLine];
      const match = ln.match(/^ {1,}/);
      if (match) {
        const spaces = Math.max(0, match[0].length - tabSize);
        this.state.lines[this.state.cursorLine] =
          " ".repeat(spaces) + ln.slice(match[0].length);
        this.state.cursorCol = Math.max(0, this.state.cursorCol - tabSize);
      }
    }

    this.triggerAutoSave();
    this.render();
  }

  // Screenplay mode
  private spIndent(ln: string): number {
    const match = ln.match(/^ */);
    return match ? match[0].length : 0;
  }

  private spNextOnEnter(indent: number): number {
    if (indent >= 20) return SP.DIALOGUE;
    if (indent >= 14) return SP.DIALOGUE;
    if (indent >= 8) return SP.CHARACTER;
    return SP.ACTION;
  }

  private screenplayTab(): void {
    this.pushUndo(this.snapshot());
    const ln = this.state.lines[this.state.cursorLine];
    const ind = this.spIndent(ln);
    const body = ln.trimStart();

    let next: number;
    if (ind >= 20) next = SP.DIALOGUE;
    else if (ind >= 14) next = SP.ACTION;
    else if (ind >= 8) next = SP.PARENTHETICAL;
    else next = SP.CHARACTER;

    this.state.lines[this.state.cursorLine] = " ".repeat(next) + body;
    this.state.cursorCol = next + Math.max(0, this.state.cursorCol - ind);
    this.state.cursorCol = Math.min(
      this.state.cursorCol,
      this.state.lines[this.state.cursorLine].length
    );
    this.triggerAutoSave();
    this.render();
  }

  private screenplayEnter(): void {
    if (this.state.selectionStart && this.state.selectionEnd) {
      this.deselect();
    }
    this.pushUndo(this.snapshot());

    const ln = this.state.lines[this.state.cursorLine];
    const ind = this.spIndent(ln);
    const left = ln.slice(0, this.state.cursorCol);
    const right = ln.slice(this.state.cursorCol).trimStart();
    const next = this.spNextOnEnter(ind);

    this.state.lines[this.state.cursorLine] = left;

    if (next === SP.CHARACTER) {
      // Blank line before new character
      this.state.lines.splice(this.state.cursorLine + 1, 0, "");
      this.state.lines.splice(
        this.state.cursorLine + 2,
        0,
        " ".repeat(next) + right
      );
      this.state.cursorLine += 2;
    } else {
      this.state.lines.splice(
        this.state.cursorLine + 1,
        0,
        " ".repeat(next) + right
      );
      this.state.cursorLine++;
    }

    this.state.cursorCol = next;
    this.playSound("enter");
    this.triggerAutoSave();
    this.render();
  }

  // Extract character names for autocomplete
  extractCharacters(): string[] {
    const chars = new Set<string>();
    for (const line of this.state.lines) {
      const ind = this.spIndent(line);
      const trimmed = line.trimStart();
      if (
        ind >= 20 &&
        trimmed.length > 0 &&
        trimmed === trimmed.toUpperCase() &&
        !/^(INT\.|EXT\.|INT\/EXT|I\/E|CUT TO:|FADE)/.test(trimmed)
      ) {
        // Remove (V.O.) (O.S.) etc
        const name = trimmed.replace(/\s*\([^)]*\)\s*$/, "").trim();
        if (name) chars.add(name);
      }
    }
    return Array.from(chars).sort();
  }

  // Line operations
  duplicateLine(): void {
    this.pushUndo(this.snapshot());
    const ln = this.state.lines[this.state.cursorLine];
    this.state.lines.splice(this.state.cursorLine + 1, 0, ln);
    this.state.cursorLine++;
    this.triggerAutoSave();
    this.render();
  }

  killLine(): void {
    this.pushUndo(this.snapshot());
    if (this.state.lines.length === 1) {
      this.state.lines[0] = "";
      this.state.cursorCol = 0;
    } else {
      this.state.lines.splice(this.state.cursorLine, 1);
      this.state.cursorLine = Math.min(
        this.state.cursorLine,
        this.state.lines.length - 1
      );
      this.state.cursorCol = Math.min(
        this.state.cursorCol,
        this.state.lines[this.state.cursorLine].length
      );
    }
    this.triggerAutoSave();
    this.render();
  }

  moveLineUp(): void {
    if (this.state.cursorLine > 0) {
      this.pushUndo(this.snapshot());
      const tmp = this.state.lines[this.state.cursorLine];
      this.state.lines[this.state.cursorLine] =
        this.state.lines[this.state.cursorLine - 1];
      this.state.lines[this.state.cursorLine - 1] = tmp;
      this.state.cursorLine--;
      this.triggerAutoSave();
      this.render();
    }
  }

  moveLineDown(): void {
    if (this.state.cursorLine < this.state.lines.length - 1) {
      this.pushUndo(this.snapshot());
      const tmp = this.state.lines[this.state.cursorLine];
      this.state.lines[this.state.cursorLine] =
        this.state.lines[this.state.cursorLine + 1];
      this.state.lines[this.state.cursorLine + 1] = tmp;
      this.state.cursorLine++;
      this.triggerAutoSave();
      this.render();
    }
  }

  // Inline formatting
  wrapInline(marker: string): void {
    this.pushUndo(this.snapshot());
    const s = this.normalizeSelection();

    if (s && s.start.line === s.end.line) {
      const ln = this.state.lines[s.start.line];
      this.state.lines[s.start.line] =
        ln.slice(0, s.start.col) +
        marker +
        ln.slice(s.start.col, s.end.col) +
        marker +
        ln.slice(s.end.col);
      this.state.cursorCol = s.end.col + marker.length * 2;
      this.deselect();
    } else {
      const ln = this.state.lines[this.state.cursorLine];
      this.state.lines[this.state.cursorLine] =
        ln.slice(0, this.state.cursorCol) +
        marker +
        marker +
        ln.slice(this.state.cursorCol);
      this.state.cursorCol += marker.length;
    }

    this.triggerAutoSave();
    this.render();
  }

  toggleBold(): void {
    this.wrapInline("**");
  }

  toggleItalic(): void {
    this.wrapInline("*");
  }

  // Paste
  handlePaste(text: string): void {
    if (this.state.selectionStart && this.state.selectionEnd) {
      this.deleteSelection();
    }
    this.pushUndo(this.snapshot());

    const clean = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");

    const parts = clean.split("\n");

    if (parts.length === 1) {
      const ln = this.state.lines[this.state.cursorLine];
      this.state.lines[this.state.cursorLine] =
        ln.slice(0, this.state.cursorCol) +
        parts[0] +
        ln.slice(this.state.cursorCol);
      this.state.cursorCol += parts[0].length;
    } else {
      const ln = this.state.lines[this.state.cursorLine];
      const before = ln.slice(0, this.state.cursorCol);
      const after = ln.slice(this.state.cursorCol);
      this.state.lines[this.state.cursorLine] = before + parts[0];

      for (let i = 1; i < parts.length - 1; i++) {
        this.state.lines.splice(this.state.cursorLine + i, 0, parts[i]);
      }

      const lastIdx = this.state.cursorLine + parts.length - 1;
      this.state.lines.splice(lastIdx, 0, parts[parts.length - 1] + after);
      this.state.cursorLine = lastIdx;
      this.state.cursorCol = parts[parts.length - 1].length;
    }

    this.triggerAutoSave();
    this.render();
  }

  // Search
  search(query: string): SearchMatch[] {
    this.state.searchQuery = query;
    this.state.searchMode = true;
    const matches = this.searchEngine.search(this.state.lines, query);
    this.state.searchMatches = matches;
    this.state.searchIdx = 0;
    this.render();
    return matches;
  }

  nextSearchMatch(): void {
    const match = this.searchEngine.nextMatch();
    if (match) {
      this.state.searchIdx++;
      this.state.cursorLine = match.line;
      this.state.cursorCol = match.col;
      this.render();
    }
  }

  prevSearchMatch(): void {
    const match = this.searchEngine.prevMatch();
    if (match) {
      this.state.searchIdx--;
      this.state.cursorLine = match.line;
      this.state.cursorCol = match.col;
      this.render();
    }
  }

  clearSearch(): void {
    this.state.searchMode = false;
    this.state.searchQuery = "";
    this.state.searchMatches = [];
    this.state.searchIdx = 0;
    this.render();
  }

  replaceAll(replacement: string): number {
    if (!this.state.searchQuery) return 0;
    this.pushUndo(this.snapshot());
    const result = this.searchEngine.replace(this.state.lines, replacement);
    this.state.lines = result.lines;
    this.clearSearch();
    this.render();
    return result.count;
  }

  private render(): void {
    this.renderer.render(this.state);
  }
}
