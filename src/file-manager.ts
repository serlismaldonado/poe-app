import { EditorState } from "./state";

export interface IFileManager {
  load(path: string): Promise<string>;
  save(path: string, content: string): Promise<void>;
  getRecentFiles(): Promise<string[]>;
  saveCursorPosition(path: string, line: number, col: number): Promise<void>;
  getCursorPosition(
    path: string
  ): Promise<{ line: number; col: number } | null>;
}

export class LocalFileManager implements IFileManager {
  private positionsKey = "poe:positions";

  async load(path: string): Promise<string> {
    try {
      const response = await fetch(path);
      return response.text();
    } catch {
      throw new Error(`Failed to load file: ${path}`);
    }
  }

  async save(path: string, content: string): Promise<void> {
    try {
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = path.split("/").pop() || "file.md";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      throw new Error(`Failed to save file: ${path}`);
    }
  }

  async getRecentFiles(): Promise<string[]> {
    try {
      const stored = localStorage.getItem(`poe:positions:recent`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async saveCursorPosition(
    path: string,
    line: number,
    col: number
  ): Promise<void> {
    try {
      const positions = JSON.parse(
        localStorage.getItem("poe:positions") || "{}"
      );
      positions[path] = { line, col };
      localStorage.setItem("poe:positions", JSON.stringify(positions));
    } catch {}
  }

  async getCursorPosition(
    path: string
  ): Promise<{ line: number; col: number } | null> {
    try {
      const positions = JSON.parse(
        localStorage.getItem("poe:positions") || "{}"
      );
      return positions[path] || null;
    } catch {
      return null;
    }
  }
}

export class TauriFileManager implements IFileManager {
  async load(path: string): Promise<string> {
    try {
      const { readTextFile } = await import("@tauri-apps/api/fs");
      return readTextFile(path);
    } catch {
      throw new Error(`Failed to load file: ${path}`);
    }
  }

  async save(path: string, content: string): Promise<void> {
    try {
      const { writeTextFile } = await import("@tauri-apps/api/fs");
      await writeTextFile(path, content);
    } catch {
      throw new Error(`Failed to save file: ${path}`);
    }
  }

  async getRecentFiles(): Promise<string[]> {
    try {
      const stored = localStorage.getItem("poe:positions:recent");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async saveCursorPosition(
    path: string,
    line: number,
    col: number
  ): Promise<void> {
    try {
      const { invoke } = await import("@tauri-apps/api/tauri");
      await invoke("save_cursor_position", { path, line, col });
    } catch {
      // Fallback to localStorage
      try {
        const positions = JSON.parse(
          localStorage.getItem("poe:positions") || "{}"
        );
        positions[path] = { line, col };
        localStorage.setItem("poe:positions", JSON.stringify(positions));
      } catch {}
    }
  }

  async getCursorPosition(
    path: string
  ): Promise<{ line: number; col: number } | null> {
    try {
      const { invoke } = await import("@tauri-apps/api/tauri");
      const result = await invoke<[number, number] | null>(
        "get_cursor_position",
        { path }
      );
      if (result) {
        return { line: result[0], col: result[1] };
      }
      return null;
    } catch {
      // Fallback to localStorage
      try {
        const positions = JSON.parse(
          localStorage.getItem("poe:positions") || "{}"
        );
        return positions[path] || null;
      } catch {
        return null;
      }
    }
  }
}
