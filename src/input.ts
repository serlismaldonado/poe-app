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

    this.handlers.set("Escape", (e) => {
      e.preventDefault();
      this.onEscape?.();
    });
  }

  install(): void {
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
    document.addEventListener("paste", (e) => this.handlePasteEvent(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Let modal panels handle keys first
    if (this.onKeyDown?.(e)) {
      return;
    }
    
    if (e.ctrlKey || e.metaKey) {
      this.handleCtrlKey(e);
    } else if (e.altKey) {
      this.handleAltKey(e);
    } else {
      const handler = this.handlers.get(e.key);
      if (handler) {
        handler(e);
      } else if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.editor.handleChar(e.key);
      }
    }
  }

  private handlePasteEvent(e: ClipboardEvent): void {
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain");
    if (text) {
      this.editor.handlePaste(text);
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
      case "O":
        e.preventDefault();
        this.onOpen?.();
        break;
      case "D":
        e.preventDefault();
        this.editor.duplicateLine();
        break;
      case "K":
        e.preventDefault();
        this.editor.killLine();
        break;
      case "B":
        e.preventDefault();
        this.editor.toggleBold();
        break;
      case "I":
        e.preventDefault();
        this.editor.toggleItalic();
        break;
      case "F":
        e.preventDefault();
        this.onSearch?.();
        break;
      case "G":
        e.preventDefault();
        this.onGoto?.();
        break;
      case ",":
        e.preventDefault();
        this.onSettings?.();
        break;
      case "N":
        e.preventDefault();
        this.onNew?.();
        break;
      case "P":
        e.preventDefault();
        this.onSwitcher?.();
        break;
      case "M":
        e.preventDefault();
        this.editor.toggleMode();
        break;
      case "HOME":
        e.preventDefault();
        this.editor.handleCtrlHome();
        break;
      case "END":
        e.preventDefault();
        this.editor.handleCtrlEnd();
        break;
      case "ARROWLEFT":
        e.preventDefault();
        this.editor.wordLeft();
        break;
      case "ARROWRIGHT":
        e.preventDefault();
        this.editor.wordRight();
        break;
    }
  }

  private handleAltKey(e: KeyboardEvent): void {
    const key = e.key;

    switch (key) {
      case "ArrowUp":
        e.preventDefault();
        this.editor.moveLineUp();
        break;
      case "ArrowDown":
        e.preventDefault();
        this.editor.moveLineDown();
        break;
    }
  }

  onSave?: () => void;
  onOpen?: () => void;
  onNew?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
  onSwitcher?: () => void;
  onGoto?: () => void;
  onEscape?: () => void;
  onKeyDown?: (e: KeyboardEvent) => boolean;
}
