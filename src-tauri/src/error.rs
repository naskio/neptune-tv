use std::io;

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum NeptuneError {
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("io error: {0}")]
    Io(#[from] io::Error),
    #[error("network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("invalid request: {0}")]
    InvalidRequest(String),
    #[error("import is already running")]
    ImportAlreadyRunning,
    #[error("import is not running")]
    ImportNotRunning,
    #[error("import cancelled")]
    ImportCancelled,
    #[error("channel not found")]
    ChannelNotFound,
}

#[derive(Debug, Serialize)]
pub struct NeptuneErrorPayload {
    pub kind: String,
    pub message: String,
}

impl Serialize for NeptuneError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let payload = NeptuneErrorPayload {
            kind: self.kind().to_owned(),
            message: self.to_string(),
        };
        payload.serialize(serializer)
    }
}

impl NeptuneError {
    fn kind(&self) -> &'static str {
        match self {
            NeptuneError::Database(_) => "database",
            NeptuneError::Io(_) => "io",
            NeptuneError::Network(_) => "network",
            NeptuneError::InvalidRequest(_) => "invalid_request",
            NeptuneError::ImportAlreadyRunning => "import_already_running",
            NeptuneError::ImportNotRunning => "import_not_running",
            NeptuneError::ImportCancelled => "import_cancelled",
            NeptuneError::ChannelNotFound => "channel_not_found",
        }
    }
}
