use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ImportPhase {
    Idle,
    Running,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportProgress {
    pub phase: ImportPhase,
    pub inserted: u64,
    pub groups: u64,
    pub skipped: u64,
    pub source: Option<String>,
    pub message: Option<String>,
}

impl Default for ImportProgress {
    fn default() -> Self {
        Self {
            phase: ImportPhase::Idle,
            inserted: 0,
            groups: 0,
            skipped: 0,
            source: None,
            message: None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ImportHandle {
    pub cancel: Arc<AtomicBool>,
}

impl ImportHandle {
    pub fn new() -> Self {
        Self {
            cancel: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn cancel(&self) {
        self.cancel.store(true, Ordering::Relaxed);
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancel.load(Ordering::Relaxed)
    }
}

pub struct AppState {
    pub pool: SqlitePool,
    pub import_handle: Arc<Mutex<Option<ImportHandle>>>,
    pub import_progress: Arc<Mutex<ImportProgress>>,
}

impl AppState {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            import_handle: Arc::new(Mutex::new(None)),
            import_progress: Arc::new(Mutex::new(ImportProgress::default())),
        }
    }
}
