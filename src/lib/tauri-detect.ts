let isTauriEnv: boolean | null = null;

export async function detectTauri(): Promise<boolean> {
  if (isTauriEnv !== null) {
    return isTauriEnv;
  }

  try {
    await import("@tauri-apps/api");
    isTauriEnv = true;
    return true;
  } catch {
    isTauriEnv = false;
    return false;
  }
}

export function isTauri(): boolean {
  return isTauriEnv === true;
}
