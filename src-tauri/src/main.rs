#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod commands;
mod db;

use db::Database;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Menu, MenuItem, Submenu, CustomMenuItem};

fn create_menu() -> Menu {
    let open = CustomMenuItem::new("open", "Open").accelerator("CmdOrCtrl+O");
    let save = CustomMenuItem::new("save", "Save").accelerator("CmdOrCtrl+S");
    let save_as = CustomMenuItem::new("save_as", "Save As...").accelerator("CmdOrCtrl+Shift+S");
    let settings = CustomMenuItem::new("settings", "Settings...").accelerator("CmdOrCtrl+,");
    
    let file_menu = Submenu::new("File", Menu::new()
        .add_item(open)
        .add_item(save)
        .add_item(save_as)
        .add_native_item(MenuItem::Separator)
        .add_item(settings)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::CloseWindow)
        .add_native_item(MenuItem::Quit)
    );

    let edit_menu = Submenu::new("Edit", Menu::new()
        .add_native_item(MenuItem::Undo)
        .add_native_item(MenuItem::Redo)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Cut)
        .add_native_item(MenuItem::Copy)
        .add_native_item(MenuItem::Paste)
        .add_native_item(MenuItem::SelectAll)
    );

    let view_menu = Submenu::new("View", Menu::new()
        .add_native_item(MenuItem::EnterFullScreen)
    );

    Menu::new()
        .add_submenu(file_menu)
        .add_submenu(edit_menu)
        .add_submenu(view_menu)
}

fn main() {
    let db_path = {
        let app_dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        let poe_dir = app_dir.join("poe");
        std::fs::create_dir_all(&poe_dir).ok();
        poe_dir.join("app.db")
    };

    let db = Database::new(db_path).expect("Failed to initialize database");

    tauri::Builder::default()
        .menu(create_menu())
        .on_menu_event(|event| {
            let window = event.window();
            match event.menu_item_id() {
                "open" => {
                    window.emit("menu-open", {}).unwrap();
                }
                "save" => {
                    window.emit("menu-save", {}).unwrap();
                }
                "save_as" => {
                    window.emit("menu-save-as", {}).unwrap();
                }
                "settings" => {
                    window.emit("menu-settings", {}).unwrap();
                }
                _ => {}
            }
        })
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
