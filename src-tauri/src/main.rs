#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{async_runtime::Mutex, Manager};
use tempdir::TempDir;
use tierlist_maker::tierlist;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let img_tmp_dir = TempDir::new("imgs")?;
    let cur_file_path = Mutex::new("".to_owned());
    let tierlist = Mutex::new(tierlist::TierList::empty());
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .setup(|app| {
            app.manage(img_tmp_dir);
            app.manage(cur_file_path);
            app.manage(tierlist);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    Ok(())
}
