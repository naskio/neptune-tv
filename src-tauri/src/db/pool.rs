use std::path::PathBuf;
use std::str::FromStr;

use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use sqlx::SqlitePool;
use tauri::{path::BaseDirectory, Manager};

use crate::error::NeptuneError;

use super::migrations;

pub async fn init_pool(app: &tauri::AppHandle) -> Result<SqlitePool, NeptuneError> {
    let mut db_path: PathBuf = app
        .path()
        .resolve("neptune-tv.sqlite", BaseDirectory::AppData)
        .map_err(|err| NeptuneError::InvalidRequest(err.to_string()))?;
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if !db_path.is_absolute() {
        db_path = std::env::current_dir()?.join(db_path);
    }

    let connect_options = SqliteConnectOptions::from_str(&format!(
        "sqlite://{}",
        db_path.to_string_lossy()
    ))?
    .create_if_missing(true)
    .journal_mode(SqliteJournalMode::Wal)
    .synchronous(SqliteSynchronous::Normal);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(connect_options)
        .await?;
    migrations::run(&pool).await?;
    Ok(pool)
}
