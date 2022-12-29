#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use sqlx::SqlitePool;
use tauri::{async_runtime::Mutex, Manager};
use tempdir::TempDir;
use tierlist_maker::{db, tierlist};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let img_tmp_dir = TempDir::new("imgs")?;
    let tierlist = Mutex::new(tierlist::TierList::empty());
    let cur_sqlite_pool: Mutex<Option<SqlitePool>> = Mutex::new(None);
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            tierlist::commands::add_new_item,
            tierlist::commands::delete_item,
            tierlist::commands::move_item,
            tierlist::commands::add_new_tier,
            tierlist::commands::delete_tier,
            tierlist::commands::move_tier,
            db::commands::open_db,
            db::commands::read_tierlist_from_db,
            db::commands::write_tierlist_to_db,
        ])
        .setup(|app| {
            app.manage(img_tmp_dir);
            app.manage(tierlist);
            app.manage(cur_sqlite_pool);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    Ok(())
}
