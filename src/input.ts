import { Editor } from "./editor";

type KeyHandler = (e: KeyboardEvent) => void;

export class InputHandler {
  private editor: Editor;
  private handlers: Map<string, KeyHandler> = new Map();

  constructor(editor: Editor) {
    this.editor = editor;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.handlers.set("ArrowUp", (e) => {
      e.preventDefault();
      this.editor.handleUp(e.shiftKey);
    });

    this.handlers.set("ArrowDown", (e) => {
      e.preventDefault();
      this.editor.handleDown(e.shiftKey);
    });

    this.handlers.set("ArrowLeft", (e) => {
      e.preventDefault();
      this.editor.handleLeft(e.shiftKey);
    });

    this.handlers.set("ArrowRight", (e) => {
      e.preventDefault();
      this.editor.handleRight(e.shiftKey);
    });

    this.handlers.set("Home", (e) => {
      e.preventDefault();
      this.editor.handleHome(e.shiftKey);
    });

    this.handlers.set("End", (e) => {
      e.preventDefault();
      this.editor.handleEnd(e.shiftKey);
    });

    this.handlers.set("Tab", (e) => {
      e.preventDefault();
      this.editor.handleTab(e.shiftKey);
    });

    this.handlers.set("Enter", (e) => {
      e.preventDefault();
      this.editor.handleEnter();
    });

    this.handlers.set("Backspace", (e) => {
      e.preventDefault();
      this.editor.handleBackspace();
    });

    this.handlers.set("Delete", (e) => {
      e.preventDefault();
      this.editor.handleDelete();
    });
  }

  install(): void {
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
    document.addEventListener("keypress", (e) => this.handleKeyPress(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey) {
      this.handleCtrlKey(e);
    } else if (e.altKey) {
      this.handleAltKey(e);
    } else {
      const handler = this.handlers.get(e.key);
      if (handler) {
        handler(e);
      }
    }
  }

  private handleKeyPress(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key && e.key.length === 1) {
      e.preventDefault();
      this.editor.handleChar(e.key);
    }
  }

  private handleCtrlKey(e: KeyboardEvent): void {
    const key = e.key.toUpperCase();

    switch (key) {
      case "Z":
        e.preventDefault();
        this.editor.undo();
        break;
      case "Y":
        e.preventDefault();
        this.editor.redo();
        break;
      case "A":
        e.preventDefault();
        this.editor.selectAll();
        break;
      case "S":
        e.preventDefault();
        this.onSave?.();
        break;
      case "D":
        e.preventDefault();
        this.editor.duplicateLine();
        break;
      case "K":
        e.preventDefault();
        this.editor.killLine();
        break;
      case "HOME":
        e.preventDefault();
        this.editor.handleCtrlHome();
        break;
      case "END":
        e.preventDefault();
        this.editor.handleCtrlEnd();
        break;
      case "ARROWUP":
        e.preventDefault();
        this.editor.moveLineUp();
        break;
      case "ARROWDOWN":
        e.preventDefault();
        this.editor.moveLineDown();
        break;
      case "F":
        e.preventDefault();
        this.onSearch?.();
        break;
      case "G":
        e.preventDefault();
        this.onGoto?.();
        break;
    }
  }

  private handleAltKey(e: KeyboardEvent): void {
    const key = e.key.toUpperCase();

    switch (key) {
      case "ARROWUP":
        e.preventDefault();
        this.editor.moveLineUp();
        break;
      case "ARROWDOWN":
        e.preventDefault();
        this.editor.moveLineDown();
        break;
    }
  }

  onSave?: () => void;
  onSearch?: () => void;
  onGoto?: () => void;
}
