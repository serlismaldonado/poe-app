import { EditorState, EditorSnapshot, createState } from "./state";
import { Config } from "./settings";
import { IRenderer } from "./renderers/types";

const MAX_UNDO = 200;

export class Editor {
  state: EditorState;
  renderer: IRenderer;

  constructor(renderer: IRenderer) {
    this.state = createState();
    this.renderer = renderer;
  }

  setConfig(cfg: Config): void {
    this.state.cfg = cfg;
  }

  setContent(lines: string[]): void {
    this.state.lines = lines.length > 0 ? lines : [""];
    this.state.cursorLine = 0;
    this.state.cursorCol = 0;
  }

  getContent(): string {
    return this.state.lines.join("\n");
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
      this.state.lines.splice(
        s.start.line + 1,
        s.end.line - s.start.line
      );
    }

    this.state.cursorLine = s.start.line;
    this.state.cursorCol = s.start.col;
    this.deselect();
    this.render();
    return true;
  }

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
    this.state.cursorCol =
      this.state.lines[this.state.cursorLine].length;
    this.render();
  }

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
      ln.slice(0, this.state.cursorCol) +
      ch +
      ln.slice(this.state.cursorCol);
    this.state.cursorCol++;

    this.handleWordWrap();
    this.render();
  }

  private handleWordWrap(): void {
    const cfg = this.state.cfg;
    if (!cfg.wrapColumn || cfg.wrapColumn <= 0) return;

    const current = this.state.lines[this.state.cursorLine];
    if (current.length > cfg.wrapColumn) {
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
          this.state.cursorCol =
            this.state.cursorCol - breakAt - 1;
        }
      }
    }
  }

  handleBackspace(): void {
    if (this.state.selectionStart && this.state.selectionEnd) {
      this.deleteSelection();
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
        ln.slice(0, this.state.cursorCol - 1) +
        ln.slice(this.state.cursorCol);
      this.state.cursorCol--;
    }

    this.render();
  }

  handleDelete(): void {
    if (this.state.selectionStart && this.state.selectionEnd) {
      this.deleteSelection();
      return;
    }

    this.pushUndo(this.snapshot());

    const ln = this.state.lines[this.state.cursorLine];
    if (this.state.cursorCol < ln.length) {
      this.state.lines[this.state.cursorLine] =
        ln.slice(0, this.state.cursorCol) +
        ln.slice(this.state.cursorCol + 1);
    } else if (this.state.cursorLine < this.state.lines.length - 1) {
      this.state.lines[this.state.cursorLine] +=
        this.state.lines[this.state.cursorLine + 1];
      this.state.lines.splice(this.state.cursorLine + 1, 1);
    }

    this.render();
  }

  handleEnter(): void {
    if (this.state.selectionStart && this.state.selectionEnd) {
      this.deselect();
    }

    this.pushUndo(this.snapshot());

    const ln = this.state.lines[this.state.cursorLine];
    const left = ln.slice(0, this.state.cursorCol);
    const right = ln.slice(this.state.cursorCol);

    const bulletMatch = ln.match(/^(\s*)([-*+] )(.*)/);
    if (bulletMatch) {
      const prefix = bulletMatch[1] + bulletMatch[2];
      if (
        bulletMatch[3].trim() === "" &&
        this.state.cursorCol === ln.length
      ) {
        this.state.lines[this.state.cursorLine] = "";
        this.state.cursorCol = 0;
      } else {
        this.state.lines[this.state.cursorLine] = left;
        this.state.lines.splice(
          this.state.cursorLine + 1,
          0,
          prefix + right
        );
        this.state.cursorLine++;
        this.state.cursorCol = prefix.length;
      }
      this.render();
      return;
    }

    this.state.lines[this.state.cursorLine] = left;
    this.state.lines.splice(this.state.cursorLine + 1, 0, right);
    this.state.cursorLine++;
    this.state.cursorCol = 0;
    this.render();
  }

  handleTab(shift = false): void {
    if (shift) {
      this.handleShiftTab();
      return;
    }

    if (this.state.selectionStart && this.state.selectionEnd) {
      this.pushUndo(this.snapshot());
      const s = this.normalizeSelection();
      if (s) {
        for (
          let i = s.start.line;
          i <= s.end.line;
          i++
        ) {
          const indent = " ".repeat(this.state.cfg.tabSize || 2);
          this.state.lines[i] = indent + this.state.lines[i];
        }
        this.state.cursorCol += this.state.cfg.tabSize || 2;
      }
      this.render();
      return;
    }

    this.pushUndo(this.snapshot());
    const indent = " ".repeat(this.state.cfg.tabSize || 2);
    const ln = this.state.lines[this.state.cursorLine];
    this.state.lines[this.state.cursorLine] =
      ln.slice(0, this.state.cursorCol) +
      indent +
      ln.slice(this.state.cursorCol);
    this.state.cursorCol += this.state.cfg.tabSize || 2;
    this.render();
  }

  private handleShiftTab(): void {
    const cfg = this.state.cfg;
    const tabSize = cfg.tabSize || 2;

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

    this.render();
  }

  duplicateLine(): void {
    this.pushUndo(this.snapshot());
    const ln = this.state.lines[this.state.cursorLine];
    this.state.lines.splice(this.state.cursorLine + 1, 0, ln);
    this.state.cursorLine++;
    this.render();
  }

  killLine(): void {
    this.pushUndo(this.snapshot());
    this.state.lines.splice(this.state.cursorLine, 1);
    if (this.state.lines.length === 0) {
      this.state.lines = [""];
    }
    this.state.cursorLine = Math.min(
      this.state.cursorLine,
      this.state.lines.length - 1
    );
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
      this.render();
    }
  }

  private render(): void {
    this.renderer.render(this.state);
  }
}
