export interface EditorState {
  lines: string[];
  fullPath: string;

  cursorLine: number;
  cursorCol: number;
  scrollTop: number;

  cursorBlink: boolean;
  blinkInterval: NodeJS.Timeout | null;
  saveTimeout: NodeJS.Timeout | null;
  isSaving: boolean;
  spinnerIndex: number;

  selectionStart: { line: number; col: number } | null;
  selectionEnd: { line: number; col: number } | null;

  undoStack: EditorSnapshot[];
  redoStack: EditorSnapshot[];

  searchMode: boolean;
  searchQuery: string;
  searchMatches: Array<{ line: number; col: number }>;
  searchIdx: number;

  settingsMode: boolean;
  settingsIdx: number;
  gotoMode: boolean;
  gotoInput: string;

  switcherMode: boolean;
  switcherFiles: string[];
  switcherIdx: number;

  cfg: Record<string, any>;
}

export interface EditorSnapshot {
  lines: string[];
  cursorLine: number;
  cursorCol: number;
}

export const createState = (): EditorState => ({
  lines: [""],
  fullPath: "",

  cursorLine: 0,
  cursorCol: 0,
  scrollTop: 0,

  cursorBlink: true,
  blinkInterval: null,
  saveTimeout: null,
  isSaving: false,
  spinnerIndex: 0,

  selectionStart: null,
  selectionEnd: null,

  undoStack: [],
  redoStack: [],

  searchMode: false,
  searchQuery: "",
  searchMatches: [],
  searchIdx: 0,

  settingsMode: false,
  settingsIdx: 0,
  gotoMode: false,
  gotoInput: "",

  switcherMode: false,
  switcherFiles: [],
  switcherIdx: 0,

  cfg: {},
});
