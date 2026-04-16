import { open, save } from "@tauri-apps/api/dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";

export async function openFileDialog(): Promise<{ path: string; content: string } | null> {
  try {
    const selected = await open({
      multiple: false,
      filters: [
        { name: "Markdown", extensions: ["md", "markdown", "txt"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (selected && typeof selected === "string") {
      const content = await readTextFile(selected);
      return { path: selected, content };
    }
  } catch (e) {
    console.error("Error opening file:", e);
  }
  return null;
}

export async function saveFileDialog(
  content: string,
  currentPath?: string
): Promise<string | null> {
  try {
    if (currentPath) {
      await writeTextFile(currentPath, content);
      return currentPath;
    }

    const selected = await save({
      filters: [
        { name: "Markdown", extensions: ["md"] },
        { name: "Text", extensions: ["txt"] },
      ],
      defaultPath: "untitled.md",
    });

    if (selected) {
      await writeTextFile(selected, content);
      return selected;
    }
  } catch (e) {
    console.error("Error saving file:", e);
  }
  return null;
}

export async function saveFile(path: string, content: string): Promise<boolean> {
  try {
    await writeTextFile(path, content);
    return true;
  } catch (e) {
    console.error("Error saving file:", e);
    return false;
  }
}

export function getFileName(path: string): string {
  return path.split("/").pop() || path.split("\\").pop() || "Untitled";
}
