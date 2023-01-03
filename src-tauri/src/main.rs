#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use sqlx::SqlitePool;
use tauri::{async_runtime::Mutex, Manager};
use tempdir::TempDir;
use tierlist_maker::{db, scraping, tierlist};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let img_tmp_dir = TempDir::new("imgs")?;
    let tierlist = Mutex::new(tierlist::TierList::empty());
    let cur_sqlite_pool: Mutex<Option<SqlitePool>> = Mutex::new(None);
    let cur_file: Mutex<Option<String>> = Mutex::new(None);
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            db::commands::read_tierlist_from_db,
            db::commands::write_tierlist_to_db,
            scraping::commands::scrape_amazon,
        ])
        .setup(|app| {
            app.manage(img_tmp_dir);
            app.manage(tierlist);
            app.manage(cur_sqlite_pool);
            app.manage(cur_file);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    Ok(())
}
