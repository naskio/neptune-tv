use sqlx::{Row, SqlitePool};

use crate::{error::NeptuneError, types::PlaylistMeta};

pub async fn is_playlist_loaded(pool: &SqlitePool) -> Result<bool, NeptuneError> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(1) FROM channels")
        .fetch_one(pool)
        .await?;
    Ok(count > 0)
}

pub async fn list_playlist_meta(pool: &SqlitePool) -> Result<Vec<PlaylistMeta>, NeptuneError> {
    let rows = sqlx::query(
        "SELECT id, source, kind, imported_at, channel_count, group_count, skipped FROM playlist_meta ORDER BY id ASC",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| PlaylistMeta {
            id: row.get("id"),
            source: row.get("source"),
            kind: row.get("kind"),
            imported_at: row.get("imported_at"),
            channel_count: row.get("channel_count"),
            group_count: row.get("group_count"),
            skipped: row.get("skipped"),
        })
        .collect())
}

pub async fn save_playlist_meta(
    pool: &SqlitePool,
    source: &str,
    kind: &str,
    channel_count: i64,
    group_count: i64,
    skipped: i64,
) -> Result<(), NeptuneError> {
    sqlx::query(
        r#"
        INSERT INTO playlist_meta (source, kind, imported_at, channel_count, group_count, skipped)
        VALUES (?, ?, strftime('%s','now'), ?, ?, ?)
        "#,
    )
    .bind(source)
    .bind(kind)
    .bind(channel_count)
    .bind(group_count)
    .bind(skipped)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn wipe_playlist(pool: &SqlitePool) -> Result<(), NeptuneError> {
    let mut tx = pool.begin().await?;
    sqlx::query("DELETE FROM channels")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM groups").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM playlist_meta")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM channels_fts")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM groups_fts")
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use sqlx::sqlite::SqlitePoolOptions;

    use super::{is_playlist_loaded, list_playlist_meta, save_playlist_meta, wipe_playlist};
    use crate::db::migrations;

    #[tokio::test]
    async fn playlist_meta_roundtrip_and_wipe() {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("in-memory sqlite should connect");
        migrations::run(&pool).await.expect("migrations should run");

        assert!(!is_playlist_loaded(&pool).await.expect("query should work"));

        sqlx::query(
            "INSERT INTO groups (title, logo_url, sort_order, is_bookmarked, blocked_at) VALUES ('Sports', NULL, 1, 0, NULL)",
        )
        .execute(&pool)
        .await
        .expect("insert group");
        sqlx::query(
            r#"
            INSERT INTO channels (
                name, group_title, stream_url, logo_url, duration, tvg_id, tvg_name, tvg_chno, tvg_language,
                tvg_country, tvg_shift, tvg_rec, tvg_url, tvg_extras, watched_at, bookmarked_at, blocked_at
            ) VALUES ('Sky Sports 1', 'Sports', 'https://example.com/sky1', NULL,
                -1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
            "#,
        )
        .execute(&pool)
        .await
        .expect("insert channel");
        assert!(is_playlist_loaded(&pool).await.expect("query should work"));

        save_playlist_meta(&pool, "local-file.m3u8", "local", 1, 1, 0)
            .await
            .expect("meta save should succeed");
        let list = list_playlist_meta(&pool)
            .await
            .expect("meta query should succeed");
        assert_eq!(list.len(), 1);
        let meta = &list[0];
        assert_eq!(meta.id, 1);
        assert_eq!(meta.source, "local-file.m3u8");
        assert_eq!(meta.kind, "local");
        assert_eq!(meta.channel_count, 1);
        assert_eq!(meta.group_count, 1);
        assert_eq!(meta.skipped, 0);

        save_playlist_meta(&pool, "other.m3u8", "local", 1, 1, 0)
            .await
            .expect("second meta save");
        let list2 = list_playlist_meta(&pool)
            .await
            .expect("meta list should work");
        assert_eq!(list2.len(), 2);
        assert_eq!(list2[1].id, 2);
        assert_eq!(list2[1].source, "other.m3u8");

        wipe_playlist(&pool).await.expect("wipe should succeed");
        assert!(!is_playlist_loaded(&pool).await.expect("query should work"));
        let after = list_playlist_meta(&pool)
            .await
            .expect("meta query should succeed");
        assert!(after.is_empty());
    }
}
