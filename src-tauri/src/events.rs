use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::error::NeptuneError;

pub const EVENT_IMPORT_PROGRESS: &str = "import:progress";
pub const EVENT_IMPORT_COMPLETE: &str = "import:complete";
pub const EVENT_IMPORT_ERROR: &str = "import:error";
pub const EVENT_IMPORT_CANCELLED: &str = "import:cancelled";
/// Emitted when the stream should use VLC but every launcher failed; the app still opens the URL with the OS default handler.
pub const EVENT_PLAYBACK_VLC_FALLBACK: &str = "playback:vlc-fallback";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportProgressEvent {
    pub phase: String,
    pub inserted: u64,
    pub groups: u64,
    pub skipped: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportCompleteEvent {
    pub channels: u64,
    pub groups: u64,
    pub skipped: u64,
    pub source: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportErrorEvent {
    pub message: String,
}

pub fn emit_progress(app: &AppHandle, payload: &ImportProgressEvent) -> Result<(), NeptuneError> {
    app.emit(EVENT_IMPORT_PROGRESS, payload)
        .map_err(|err| NeptuneError::InvalidRequest(err.to_string()))
}

pub fn emit_complete(app: &AppHandle, payload: &ImportCompleteEvent) -> Result<(), NeptuneError> {
    app.emit(EVENT_IMPORT_COMPLETE, payload)
        .map_err(|err| NeptuneError::InvalidRequest(err.to_string()))
}

pub fn emit_error(app: &AppHandle, message: String) -> Result<(), NeptuneError> {
    let payload = ImportErrorEvent { message };
    app.emit(EVENT_IMPORT_ERROR, payload)
        .map_err(|err| NeptuneError::InvalidRequest(err.to_string()))
}

pub fn emit_cancelled(app: &AppHandle) -> Result<(), NeptuneError> {
    app.emit(EVENT_IMPORT_CANCELLED, ())
        .map_err(|err| NeptuneError::InvalidRequest(err.to_string()))
}

/// Tell the UI to show a toast: VLC was preferred but could not be started; default app was used.
pub fn emit_vlc_fallback(app: &AppHandle) {
    if let Err(err) = app.emit(EVENT_PLAYBACK_VLC_FALLBACK, ()) {
        eprintln!(
            "[neptune-tv] failed to emit {}: {err}",
            EVENT_PLAYBACK_VLC_FALLBACK
        );
    }
}
