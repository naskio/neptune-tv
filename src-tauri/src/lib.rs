mod cursor;
mod db;
mod error;
mod external_player;
mod events;
mod importer;
mod parser;
mod state;
mod types;
mod validation;

use cursor::SortMode;
use error::NeptuneError;
use events::{emit_cancelled, emit_complete, emit_error, ImportCompleteEvent};
use importer::pipeline::{run_import, ImportSource};
use state::{AppState, ImportHandle, ImportPhase, ImportProgress};
use tauri::Manager;
use types::{Channel, ChannelPage, GroupDetail, GroupPage, PlaylistMeta, SearchResults};
use validation::{
    resolve_limit, validate_id, validate_local_path, validate_optional_cursor,
    validate_optional_title, validate_query, validate_remote_url, validate_title,
};

#[tauri::command]
async fn is_playlist_loaded(state: tauri::State<'_, AppState>) -> Result<bool, NeptuneError> {
    db::playlist::is_playlist_loaded(&state.pool).await
}

#[tauri::command]
async fn get_playlist_meta(
    state: tauri::State<'_, AppState>,
) -> Result<Option<PlaylistMeta>, NeptuneError> {
    db::playlist::get_playlist_meta(&state.pool).await
}

async fn start_import(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    source: ImportSource,
    source_name: String,
    kind: &'static str,
) -> Result<(), NeptuneError> {
    {
        let import_guard = state.import_handle.lock().await;
        if import_guard.is_some() {
            return Err(NeptuneError::ImportAlreadyRunning);
        }
    }

    db::playlist::wipe_playlist(&state.pool).await?;

    let import_handle = ImportHandle::new();
    {
        let mut import_guard = state.import_handle.lock().await;
        *import_guard = Some(import_handle.clone());
    }
    {
        let mut progress = state.import_progress.lock().await;
        *progress = ImportProgress {
            phase: ImportPhase::Running,
            inserted: 0,
            groups: 0,
            skipped: 0,
            source: Some(source_name.clone()),
            message: None,
        };
    }

    let pool = state.pool.clone();
    let progress_state = state.import_progress.clone();
    let handle_state = state.import_handle.clone();
    tauri::async_runtime::spawn(async move {
        let result = run_import(&app, &pool, &source, &import_handle).await;
        match result {
            Ok(summary) => {
                let _ = db::playlist::save_playlist_meta(
                    &pool,
                    &source_name,
                    kind,
                    summary.channels as i64,
                    summary.groups as i64,
                    summary.skipped as i64,
                )
                .await;
                {
                    let mut progress = progress_state.lock().await;
                    *progress = ImportProgress {
                        phase: ImportPhase::Completed,
                        inserted: summary.channels,
                        groups: summary.groups,
                        skipped: summary.skipped,
                        source: Some(source_name.clone()),
                        message: None,
                    };
                }
                let _ = emit_complete(
                    &app,
                    &ImportCompleteEvent {
                        channels: summary.channels,
                        groups: summary.groups,
                        skipped: summary.skipped,
                        source: source_name.clone(),
                    },
                );
            }
            Err(NeptuneError::ImportCancelled) => {
                let _ = db::playlist::wipe_playlist(&pool).await;
                {
                    let mut progress = progress_state.lock().await;
                    *progress = ImportProgress {
                        phase: ImportPhase::Cancelled,
                        inserted: 0,
                        groups: 0,
                        skipped: 0,
                        source: Some(source_name.clone()),
                        message: None,
                    };
                }
                let _ = emit_cancelled(&app);
            }
            Err(err) => {
                let _ = db::playlist::wipe_playlist(&pool).await;
                {
                    let mut progress = progress_state.lock().await;
                    *progress = ImportProgress {
                        phase: ImportPhase::Failed,
                        inserted: 0,
                        groups: 0,
                        skipped: 0,
                        source: Some(source_name.clone()),
                        message: Some(err.to_string()),
                    };
                }
                let _ = emit_error(&app, err.to_string());
            }
        }

        let mut import_guard = handle_state.lock().await;
        *import_guard = None;
    });

    Ok(())
}

#[tauri::command]
async fn import_playlist_local(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<(), NeptuneError> {
    let path = validate_local_path(&path)?.to_owned();
    start_import(
        app,
        state,
        ImportSource::LocalPath(path.clone()),
        path,
        "local",
    )
    .await
}

#[tauri::command]
async fn import_playlist_remote(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    url: String,
) -> Result<(), NeptuneError> {
    let url = validate_remote_url(&url)?.to_owned();
    start_import(
        app,
        state,
        ImportSource::RemoteUrl(url.clone()),
        url,
        "remote",
    )
    .await
}

#[tauri::command]
async fn cancel_import(state: tauri::State<'_, AppState>) -> Result<(), NeptuneError> {
    let import_guard = state.import_handle.lock().await;
    let Some(handle) = import_guard.as_ref() else {
        return Err(NeptuneError::ImportNotRunning);
    };
    handle.cancel();
    Ok(())
}

#[tauri::command]
async fn wipe_playlist(state: tauri::State<'_, AppState>) -> Result<(), NeptuneError> {
    db::playlist::wipe_playlist(&state.pool).await
}

#[tauri::command]
async fn get_import_status(
    state: tauri::State<'_, AppState>,
) -> Result<Option<ImportProgress>, NeptuneError> {
    let progress = state.import_progress.lock().await;
    if matches!(progress.phase, ImportPhase::Idle) {
        Ok(None)
    } else {
        Ok(Some(progress.clone()))
    }
}

#[tauri::command]
async fn list_groups(
    state: tauri::State<'_, AppState>,
    sort: SortMode,
    cursor: Option<String>,
    limit: Option<i64>,
) -> Result<GroupPage, NeptuneError> {
    let cursor = validate_optional_cursor(cursor)?;
    let limit = resolve_limit(limit, 50)?;
    db::groups::list_groups(&state.pool, sort, cursor, limit).await
}

#[tauri::command]
async fn list_bookmarked_groups(
    state: tauri::State<'_, AppState>,
    sort: SortMode,
    cursor: Option<String>,
    limit: Option<i64>,
) -> Result<GroupPage, NeptuneError> {
    let cursor = validate_optional_cursor(cursor)?;
    let limit = resolve_limit(limit, 50)?;
    db::groups::list_bookmarked_groups(&state.pool, sort, cursor, limit).await
}

#[tauri::command]
async fn get_group(
    state: tauri::State<'_, AppState>,
    title: String,
) -> Result<Option<GroupDetail>, NeptuneError> {
    let title = validate_title(&title, "title")?;
    db::groups::get_group(&state.pool, title).await
}

#[tauri::command]
async fn set_group_bookmarked(
    state: tauri::State<'_, AppState>,
    title: String,
    value: bool,
) -> Result<(), NeptuneError> {
    let title = validate_title(&title, "title")?;
    db::groups::set_group_bookmarked(&state.pool, title, value).await
}

#[tauri::command]
async fn set_group_blocked(
    state: tauri::State<'_, AppState>,
    title: String,
    value: bool,
) -> Result<(), NeptuneError> {
    let title = validate_title(&title, "title")?;
    db::groups::set_group_blocked(&state.pool, title, value).await
}

#[tauri::command]
async fn list_channels_in_group(
    state: tauri::State<'_, AppState>,
    group_title: String,
    sort: SortMode,
    cursor: Option<String>,
    limit: Option<i64>,
) -> Result<ChannelPage, NeptuneError> {
    let group_title = validate_title(&group_title, "groupTitle")?;
    let cursor = validate_optional_cursor(cursor)?;
    let limit = resolve_limit(limit, 100)?;
    db::channels::list_channels_in_group(&state.pool, group_title, sort, cursor, limit).await
}

#[tauri::command]
async fn list_recently_watched(
    state: tauri::State<'_, AppState>,
    group_title: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<Channel>, NeptuneError> {
    let group_title = validate_optional_title(group_title, "groupTitle")?;
    let limit = resolve_limit(limit, 50)?;
    db::channels::list_recently_watched(&state.pool, group_title, limit).await
}

#[tauri::command]
async fn list_favorite_channels(
    state: tauri::State<'_, AppState>,
    sort: SortMode,
    cursor: Option<String>,
    limit: Option<i64>,
) -> Result<ChannelPage, NeptuneError> {
    let cursor = validate_optional_cursor(cursor)?;
    let limit = resolve_limit(limit, 100)?;
    db::channels::list_favorite_channels(&state.pool, sort, cursor, limit).await
}

#[tauri::command]
async fn get_channel(
    state: tauri::State<'_, AppState>,
    id: i64,
) -> Result<Option<Channel>, NeptuneError> {
    let id = validate_id(id, "id")?;
    db::channels::get_channel(&state.pool, id).await
}

#[tauri::command]
async fn set_channel_bookmarked(
    state: tauri::State<'_, AppState>,
    id: i64,
    value: bool,
) -> Result<(), NeptuneError> {
    let id = validate_id(id, "id")?;
    db::channels::set_channel_bookmarked(&state.pool, id, value).await
}

#[tauri::command]
async fn set_channel_blocked(
    state: tauri::State<'_, AppState>,
    id: i64,
    value: bool,
) -> Result<(), NeptuneError> {
    let id = validate_id(id, "id")?;
    db::channels::set_channel_blocked(&state.pool, id, value).await
}

#[tauri::command]
async fn search_global(
    state: tauri::State<'_, AppState>,
    query: String,
    group_limit: Option<i64>,
    channel_limit: Option<i64>,
) -> Result<SearchResults, NeptuneError> {
    let query = validate_query(&query)?;
    let group_limit = resolve_limit(group_limit, 5)?;
    let channel_limit = resolve_limit(channel_limit, 20)?;
    db::search::search_global(&state.pool, query, group_limit, channel_limit).await
}

#[tauri::command]
async fn search_channels_in_group(
    state: tauri::State<'_, AppState>,
    group_title: String,
    query: String,
    cursor: Option<String>,
    limit: Option<i64>,
) -> Result<ChannelPage, NeptuneError> {
    let group_title = validate_title(&group_title, "groupTitle")?;
    let query = validate_query(&query)?;
    let cursor = validate_optional_cursor(cursor)?;
    let limit = resolve_limit(limit, 100)?;
    db::search::search_channels_in_group(&state.pool, group_title, query, cursor, limit).await
}

#[tauri::command]
async fn list_blocked_groups(
    state: tauri::State<'_, AppState>,
    cursor: Option<String>,
    limit: Option<i64>,
) -> Result<GroupPage, NeptuneError> {
    let cursor = validate_optional_cursor(cursor)?;
    let limit = resolve_limit(limit, 50)?;
    db::groups::list_blocked_groups(&state.pool, cursor, limit).await
}

#[tauri::command]
async fn list_blocked_channels(
    state: tauri::State<'_, AppState>,
    cursor: Option<String>,
    limit: Option<i64>,
) -> Result<ChannelPage, NeptuneError> {
    let cursor = validate_optional_cursor(cursor)?;
    let limit = resolve_limit(limit, 100)?;
    db::channels::list_blocked_channels(&state.pool, cursor, limit).await
}

#[tauri::command]
async fn play_channel(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i64,
) -> Result<(), NeptuneError> {
    let id = validate_id(id, "id")?;
    let stream_url = db::channels::get_channel_stream_url(&state.pool, id).await?;
    external_player::open_stream_in_external_player(&app, stream_url.as_str())?;
    db::channels::mark_channel_watched(&state.pool, id).await?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let pool = tauri::async_runtime::block_on(db::pool::init_pool(app.handle()))
                .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;
            app.manage(AppState::new(pool));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            is_playlist_loaded,
            get_playlist_meta,
            import_playlist_local,
            import_playlist_remote,
            cancel_import,
            wipe_playlist,
            get_import_status,
            list_groups,
            list_bookmarked_groups,
            get_group,
            set_group_bookmarked,
            set_group_blocked,
            list_channels_in_group,
            list_recently_watched,
            list_favorite_channels,
            get_channel,
            set_channel_bookmarked,
            set_channel_blocked,
            search_global,
            search_channels_in_group,
            list_blocked_groups,
            list_blocked_channels,
            play_channel
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
