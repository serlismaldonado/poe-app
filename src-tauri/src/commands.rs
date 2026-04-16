use tauri::State;
use crate::db::Database;
use std::sync::Mutex;

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
