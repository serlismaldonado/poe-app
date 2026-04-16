use tauri::State;
use crate::db::Database;
use std::sync::Mutex;
use std::fs;
use std::path::PathBuf;

fn get_config_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".config").join("poe").join("settings.json")
}

#[tauri::command]
pub fn load_settings() -> Result<String, String> {
    let path = get_config_path();
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok("{}".to_string())
    }
}

#[tauri::command]
pub fn save_settings(json: String) -> Result<(), String> {
    let path = get_config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_config_path_cmd() -> String {
    get_config_path().to_string_lossy().to_string()
}

#[tauri::command]
pub fn list_md_files(dir: String) -> Result<Vec<String>, String> {
    let path = PathBuf::from(&dir);
    if !path.is_dir() {
        return Ok(vec![]);
    }
    
    let mut files: Vec<String> = fs::read_dir(&path)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext == "md" || ext == "markdown" || ext == "txt" {
                        return path.file_name()
                            .and_then(|n| n.to_str())
                            .map(|s| s.to_string());
                    }
                }
            }
            None
        })
        .collect();
    
    files.sort();
    Ok(files)
}

#[tauri::command]
pub fn save_cursor_position(
    line: i32,
    col: i32,
    path: String,
    db: State<Mutex<Database>>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.save_file_position(&path, line, col)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_cursor_position(
    path: String,
    db: State<Mutex<Database>>,
) -> Result<Option<(i32, i32)>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_file_position(&path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_search(query: String, db: State<Mutex<Database>>) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.add_recent_search(&query)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_searches(
    limit: i32,
    db: State<Mutex<Database>>,
) -> Result<Vec<String>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_recent_searches(limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_setting(
    key: String,
    value: String,
    db: State<Mutex<Database>>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.set_setting(&key, &value)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_setting(
    key: String,
    db: State<Mutex<Database>>,
) -> Result<Option<String>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_setting(&key)
        .map_err(|e| e.to_string())
}
