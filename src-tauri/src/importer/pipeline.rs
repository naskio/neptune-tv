use std::collections::{HashMap, HashSet};

use futures_util::StreamExt;
use sqlx::{Sqlite, Transaction};
use tauri::AppHandle;
use tokio::{
    fs::File,
    io::{AsyncBufReadExt, BufReader},
};

use crate::{
    error::NeptuneError,
    events::{emit_progress, ImportProgressEvent},
    parser::{
        extinf::{group_default_logo, parse_extinf_line},
        types::{ParsedChannel, ParsedExtInf},
    },
    state::ImportHandle,
};

const INSERT_BATCH_SIZE: usize = 1_000;
const PROGRESS_STEP: u64 = 10_000;

#[derive(Debug, Clone)]
pub enum ImportSource {
    LocalPath(String),
    RemoteUrl(String),
}

#[derive(Debug, Clone)]
pub struct ImportSummary {
    pub channels: u64,
    pub groups: u64,
    pub skipped: u64,
}

pub async fn run_import(
    app: &AppHandle,
    pool: &sqlx::SqlitePool,
    source: &ImportSource,
    handle: &ImportHandle,
) -> Result<ImportSummary, NeptuneError> {
    let mut tx = pool.begin().await?;
    let mut state = ImportParserState::default();

    match source {
        ImportSource::LocalPath(path) => {
            let file = File::open(path).await?;
            let mut reader = BufReader::new(file);
            let mut line = String::new();
            loop {
                line.clear();
                let bytes = reader.read_line(&mut line).await?;
                if bytes == 0 {
                    break;
                }
                process_line(
                    Some(app),
                    &mut tx,
                    &mut state,
                    line.trim_end_matches(['\n', '\r']),
                    handle,
                )
                .await?;
            }
        }
        ImportSource::RemoteUrl(url) => {
            let response = reqwest::Client::new().get(url).send().await?;
            if !response.status().is_success() {
                return Err(NeptuneError::InvalidRequest(format!(
                    "remote import failed with status {}",
                    response.status()
                )));
            }
            let mut stream = response.bytes_stream();
            let mut pending = String::new();
            while let Some(chunk) = stream.next().await {
                let chunk = chunk?;
                let text = String::from_utf8_lossy(&chunk);
                pending.push_str(&text);
                while let Some(idx) = pending.find('\n') {
                    let line = pending[..idx].trim_end_matches('\r').to_owned();
                    process_line(Some(app), &mut tx, &mut state, &line, handle).await?;
                    pending = pending[idx + 1..].to_owned();
                }
            }
            if !pending.is_empty() {
                let trailing = pending.trim_end_matches('\r').to_owned();
                process_line(Some(app), &mut tx, &mut state, &trailing, handle).await?;
            }
        }
    }

    // A dangling EXTINF without a following stream URL is considered a skipped/bad entry.
    if state.pending_extinf.is_some() {
        state.pending_extinf = None;
        state.skipped += 1;
    }

    if handle.is_cancelled() {
        return Err(NeptuneError::ImportCancelled);
    }

    flush_channels(Some(app), &mut tx, &mut state).await?;
    tx.commit().await?;

    Ok(ImportSummary {
        channels: state.inserted_channels,
        groups: state.seen_groups.len() as u64,
        skipped: state.skipped,
    })
}

#[derive(Default)]
struct ImportParserState {
    pending_extinf: Option<ParsedExtInf>,
    batch: Vec<ParsedChannel>,
    inserted_channels: u64,
    skipped: u64,
    seen_groups: HashSet<String>,
    group_sort_order: HashMap<String, i64>,
}

async fn process_line(
    app: Option<&AppHandle>,
    tx: &mut Transaction<'_, Sqlite>,
    state: &mut ImportParserState,
    line: &str,
    handle: &ImportHandle,
) -> Result<(), NeptuneError> {
    if handle.is_cancelled() {
        return Err(NeptuneError::ImportCancelled);
    }

    let trimmed = line.trim();
    if trimmed.is_empty() {
        return Ok(());
    }

    if let Some(parsed) = parse_extinf_line(trimmed) {
        state.pending_extinf = Some(parsed);
        return Ok(());
    }

    if trimmed.starts_with('#') {
        return Ok(());
    }

    if let Some(mut pending) = state.pending_extinf.take() {
        pending.channel.stream_url = trimmed.to_owned();
        ensure_group(tx, state, &pending.channel.group_title).await?;
        state.batch.push(pending.channel);
        if state.batch.len() >= INSERT_BATCH_SIZE {
            flush_channels(app, tx, state).await?;
        }
    } else {
        state.skipped += 1;
    }
    Ok(())
}

async fn ensure_group(
    tx: &mut Transaction<'_, Sqlite>,
    state: &mut ImportParserState,
    group_title: &str,
) -> Result<(), NeptuneError> {
    if state.seen_groups.contains(group_title) {
        return Ok(());
    }
    state.seen_groups.insert(group_title.to_owned());
    let sort_order = state.seen_groups.len() as i64;
    state
        .group_sort_order
        .insert(group_title.to_owned(), sort_order);
    sqlx::query(
        r#"
        INSERT INTO groups (title, logo_url, sort_order, is_bookmarked, blocked_at)
        VALUES (?, ?, ?, 0, NULL)
        ON CONFLICT(title) DO NOTHING
        "#,
    )
    .bind(group_title)
    .bind(group_default_logo())
    .bind(sort_order)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn flush_channels(
    app: Option<&AppHandle>,
    tx: &mut Transaction<'_, Sqlite>,
    state: &mut ImportParserState,
) -> Result<(), NeptuneError> {
    if state.batch.is_empty() {
        return Ok(());
    }

    for channel in state.batch.drain(..) {
        sqlx::query(
            r#"
            INSERT INTO channels (
                name, group_title, stream_url, logo_url, duration, tvg_id, tvg_name, tvg_chno,
                tvg_language, tvg_country, tvg_shift, tvg_rec, tvg_url, tvg_extras,
                watched_at, bookmarked_at, blocked_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)
            "#,
        )
        .bind(channel.name)
        .bind(channel.group_title)
        .bind(channel.stream_url)
        .bind(channel.logo_url)
        .bind(channel.duration)
        .bind(channel.tvg_id)
        .bind(channel.tvg_name)
        .bind(channel.tvg_chno)
        .bind(channel.tvg_language)
        .bind(channel.tvg_country)
        .bind(channel.tvg_shift)
        .bind(channel.tvg_rec)
        .bind(channel.tvg_url)
        .bind(channel.tvg_extras)
        .execute(&mut **tx)
        .await?;
        state.inserted_channels += 1;
    }

    if state.inserted_channels.is_multiple_of(PROGRESS_STEP) {
        let Some(app) = app else {
            return Ok(());
        };
        emit_progress(
            app,
            &ImportProgressEvent {
                phase: "channels".to_owned(),
                inserted: state.inserted_channels,
                groups: state.seen_groups.len() as u64,
                skipped: state.skipped,
            },
        )?;
    }

    Ok(())
}

#[cfg(test)]
async fn run_import_from_lines(
    pool: &sqlx::SqlitePool,
    lines: &[&str],
    handle: &ImportHandle,
) -> Result<ImportSummary, NeptuneError> {
    let mut tx = pool.begin().await?;
    let mut state = ImportParserState::default();

    for line in lines {
        process_line(None, &mut tx, &mut state, line, handle).await?;
    }

    if state.pending_extinf.is_some() {
        state.pending_extinf = None;
        state.skipped += 1;
    }

    if handle.is_cancelled() {
        return Err(NeptuneError::ImportCancelled);
    }

    flush_channels(None, &mut tx, &mut state).await?;
    tx.commit().await?;

    Ok(ImportSummary {
        channels: state.inserted_channels,
        groups: state.seen_groups.len() as u64,
        skipped: state.skipped,
    })
}

#[cfg(test)]
mod tests {
    use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

    use super::run_import_from_lines;
    use crate::{db::migrations, error::NeptuneError, state::ImportHandle};

    async fn setup_pool() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("in-memory sqlite should connect");
        migrations::run(&pool).await.expect("migrations should run");
        pool
    }

    #[tokio::test]
    async fn import_from_lines_counts_groups_channels_and_skipped() {
        let pool = setup_pool().await;
        let handle = ImportHandle::new();
        let lines = vec![
            r#"#EXTINF:-1 group-title="News",News 24"#,
            "https://example.com/news24",
            r#"#EXTINF:-1,No Group Channel"#,
            "https://example.com/ungrouped",
            "https://example.com/orphan-url",
            r#"#EXTINF:-1 group-title="News",Missing Stream Url"#,
        ];

        let summary = run_import_from_lines(&pool, &lines, &handle)
            .await
            .expect("import should succeed");

        assert_eq!(summary.channels, 2);
        assert_eq!(summary.groups, 2);
        assert_eq!(summary.skipped, 2);

        let db_channels: i64 = sqlx::query_scalar("SELECT COUNT(1) FROM channels")
            .fetch_one(&pool)
            .await
            .expect("channel count query should succeed");
        let db_groups: i64 = sqlx::query_scalar("SELECT COUNT(1) FROM groups")
            .fetch_one(&pool)
            .await
            .expect("group count query should succeed");
        assert_eq!(db_channels, 2);
        assert_eq!(db_groups, 2);
    }

    #[tokio::test]
    async fn import_from_lines_honors_cancellation_and_rolls_back() {
        let pool = setup_pool().await;
        let handle = ImportHandle::new();
        handle.cancel();
        let lines = vec![
            r#"#EXTINF:-1 group-title="News",News 24"#,
            "https://example.com/news24",
        ];

        let result = run_import_from_lines(&pool, &lines, &handle).await;
        assert!(matches!(result, Err(NeptuneError::ImportCancelled)));

        let db_channels: i64 = sqlx::query_scalar("SELECT COUNT(1) FROM channels")
            .fetch_one(&pool)
            .await
            .expect("channel count query should succeed");
        let db_groups: i64 = sqlx::query_scalar("SELECT COUNT(1) FROM groups")
            .fetch_one(&pool)
            .await
            .expect("group count query should succeed");
        assert_eq!(db_channels, 0);
        assert_eq!(db_groups, 0);
    }
}
