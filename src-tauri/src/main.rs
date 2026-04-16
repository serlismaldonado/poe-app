#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod commands;
mod db;

use db::Database;
use std::path::PathBuf;
use std::sync::Mutex;

fn main() {
    let db_path = {
        let app_dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        let poe_dir = app_dir.join("poe");
        std::fs::create_dir_all(&poe_dir).ok();
        poe_dir.join("app.db")
    };

    let db = Database::new(db_path).expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(Mutex::new(db))
        .invoke_handler(tauri::generate_handler![
            commands::save_cursor_position,
            commands::get_cursor_position,
            commands::add_search,
            commands::get_searches,
            commands::set_setting,
            commands::get_setting,
            commands::load_settings,
            commands::save_settings,
            commands::get_config_path_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
