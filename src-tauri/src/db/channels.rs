use sqlx::{Row, SqlitePool};

use crate::{
    cursor::{decode_cursor, encode_cursor, ChannelCursorDefault, ChannelCursorName, SortMode},
    error::NeptuneError,
    types::{Channel, ChannelPage},
};

pub async fn list_channels_in_group(
    pool: &SqlitePool,
    group_title: &str,
    sort: SortMode,
    cursor: Option<String>,
    limit: i64,
) -> Result<ChannelPage, NeptuneError> {
    list_channels_filtered(
        pool,
        sort,
        cursor,
        limit,
        "c.group_title = ? AND c.blocked_at IS NULL AND g.blocked_at IS NULL",
        vec![group_title.to_string()],
    )
    .await
}

pub async fn list_favorite_channels(
    pool: &SqlitePool,
    sort: SortMode,
    cursor: Option<String>,
    limit: i64,
) -> Result<ChannelPage, NeptuneError> {
    list_channels_filtered(
        pool,
        sort,
        cursor,
        limit,
        "c.bookmarked_at IS NOT NULL AND c.blocked_at IS NULL AND g.blocked_at IS NULL",
        vec![],
    )
    .await
}

pub async fn list_blocked_channels(
    pool: &SqlitePool,
    cursor: Option<String>,
    limit: i64,
) -> Result<ChannelPage, NeptuneError> {
    let decoded = cursor
        .as_deref()
        .map(decode_cursor::<ChannelCursorName>)
        .transpose()?;
    let rows = if let Some(decoded) = decoded {
        sqlx::query_as::<_, Channel>(
            r#"
            SELECT c.id, c.name, c.group_title, c.stream_url, c.logo_url, c.duration, c.tvg_id, c.tvg_name,
                   c.tvg_chno, c.tvg_language, c.tvg_country, c.tvg_shift, c.tvg_rec, c.tvg_url, c.tvg_extras,
                   c.watched_at, c.bookmarked_at, c.blocked_at
            FROM channels c
            WHERE c.blocked_at IS NOT NULL
              AND (LOWER(c.name), c.id) > (?, ?)
            ORDER BY LOWER(c.name), c.id
            LIMIT ?
            "#,
        )
        .bind(decoded.name_lower)
        .bind(decoded.id)
        .bind(limit + 1)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, Channel>(
            r#"
            SELECT c.id, c.name, c.group_title, c.stream_url, c.logo_url, c.duration, c.tvg_id, c.tvg_name,
                   c.tvg_chno, c.tvg_language, c.tvg_country, c.tvg_shift, c.tvg_rec, c.tvg_url, c.tvg_extras,
                   c.watched_at, c.bookmarked_at, c.blocked_at
            FROM channels c
            WHERE c.blocked_at IS NOT NULL
            ORDER BY LOWER(c.name), c.id
            LIMIT ?
            "#,
        )
        .bind(limit + 1)
        .fetch_all(pool)
        .await?
    };
    paginate_channels(rows, limit, SortMode::Name)
}

async fn list_channels_filtered(
    pool: &SqlitePool,
    sort: SortMode,
    cursor: Option<String>,
    limit: i64,
    where_clause: &str,
    extra_binds: Vec<String>,
) -> Result<ChannelPage, NeptuneError> {
    let rows = match sort {
        SortMode::Default => {
            let decoded = cursor
                .as_deref()
                .map(decode_cursor::<ChannelCursorDefault>)
                .transpose()?;
            let sql = if decoded.is_some() {
                format!(
                    r#"
                    SELECT c.id, c.name, c.group_title, c.stream_url, c.logo_url, c.duration, c.tvg_id, c.tvg_name,
                           c.tvg_chno, c.tvg_language, c.tvg_country, c.tvg_shift, c.tvg_rec, c.tvg_url, c.tvg_extras,
                           c.watched_at, c.bookmarked_at, c.blocked_at
                    FROM channels c
                    JOIN groups g ON g.title = c.group_title
                    WHERE {where_clause}
                      AND c.id > ?
                    ORDER BY c.id ASC
                    LIMIT ?
                    "#
                )
            } else {
                format!(
                    r#"
                    SELECT c.id, c.name, c.group_title, c.stream_url, c.logo_url, c.duration, c.tvg_id, c.tvg_name,
                           c.tvg_chno, c.tvg_language, c.tvg_country, c.tvg_shift, c.tvg_rec, c.tvg_url, c.tvg_extras,
                           c.watched_at, c.bookmarked_at, c.blocked_at
                    FROM channels c
                    JOIN groups g ON g.title = c.group_title
                    WHERE {where_clause}
                    ORDER BY c.id ASC
                    LIMIT ?
                    "#
                )
            };
            let mut query = sqlx::query_as::<_, Channel>(&sql);
            for bind in extra_binds {
                query = query.bind(bind);
            }
            if let Some(decoded) = decoded {
                query = query.bind(decoded.id);
            }
            query.bind(limit + 1).fetch_all(pool).await?
        }
        SortMode::Name => {
            let decoded = cursor
                .as_deref()
                .map(decode_cursor::<ChannelCursorName>)
                .transpose()?;
            let sql = if decoded.is_some() {
                format!(
                    r#"
                    SELECT c.id, c.name, c.group_title, c.stream_url, c.logo_url, c.duration, c.tvg_id, c.tvg_name,
                           c.tvg_chno, c.tvg_language, c.tvg_country, c.tvg_shift, c.tvg_rec, c.tvg_url, c.tvg_extras,
                           c.watched_at, c.bookmarked_at, c.blocked_at
                    FROM channels c
                    JOIN groups g ON g.title = c.group_title
                    WHERE {where_clause}
                      AND (LOWER(c.name) > ? OR (LOWER(c.name) = ? AND c.id > ?))
                    ORDER BY LOWER(c.name) ASC, c.id ASC
                    LIMIT ?
                    "#
                )
            } else {
                format!(
                    r#"
                    SELECT c.id, c.name, c.group_title, c.stream_url, c.logo_url, c.duration, c.tvg_id, c.tvg_name,
                           c.tvg_chno, c.tvg_language, c.tvg_country, c.tvg_shift, c.tvg_rec, c.tvg_url, c.tvg_extras,
                           c.watched_at, c.bookmarked_at, c.blocked_at
                    FROM channels c
                    JOIN groups g ON g.title = c.group_title
                    WHERE {where_clause}
                    ORDER BY LOWER(c.name) ASC, c.id ASC
                    LIMIT ?
                    "#
                )
            };
            let mut query = sqlx::query_as::<_, Channel>(&sql);
            for bind in extra_binds {
                query = query.bind(bind);
            }
            if let Some(decoded) = decoded {
                query = query
                    .bind(decoded.name_lower.clone())
                    .bind(decoded.name_lower)
                    .bind(decoded.id);
            }
            query.bind(limit + 1).fetch_all(pool).await?
        }
    };

    paginate_channels(rows, limit, sort)
}

fn paginate_channels(
    mut rows: Vec<Channel>,
    limit: i64,
    sort: SortMode,
) -> Result<ChannelPage, NeptuneError> {
    let next_cursor = if rows.len() as i64 > limit {
        rows.pop();
        let tail = rows.last().expect("row exists after trim");
        Some(match sort {
            SortMode::Default => encode_cursor(&ChannelCursorDefault {
                sort,
                bookmarked_at: tail.bookmarked_at.unwrap_or(0),
                id: tail.id,
            })?,
            SortMode::Name => encode_cursor(&ChannelCursorName {
                sort,
                bookmarked_at: tail.bookmarked_at.unwrap_or(0),
                name_lower: tail.name.to_lowercase(),
                id: tail.id,
            })?,
        })
    } else {
        None
    };
    Ok(ChannelPage {
        items: rows,
        next_cursor,
    })
}

pub async fn list_recently_watched(
    pool: &SqlitePool,
    group_title: Option<String>,
    limit: i64,
) -> Result<Vec<Channel>, NeptuneError> {
    let bounded_limit = limit.clamp(1, 50);
    if let Some(group_title) = group_title {
        let rows = sqlx::query_as::<_, Channel>(
            r#"
            SELECT c.id, c.name, c.group_title, c.stream_url, c.logo_url, c.duration, c.tvg_id, c.tvg_name,
                   c.tvg_chno, c.tvg_language, c.tvg_country, c.tvg_shift, c.tvg_rec, c.tvg_url, c.tvg_extras,
                   c.watched_at, c.bookmarked_at, c.blocked_at
            FROM channels c
            JOIN groups g ON g.title = c.group_title
            WHERE c.watched_at IS NOT NULL
              AND c.blocked_at IS NULL
              AND g.blocked_at IS NULL
              AND c.group_title = ?
            ORDER BY c.watched_at DESC
            LIMIT ?
            "#,
        )
        .bind(group_title)
        .bind(bounded_limit)
        .fetch_all(pool)
        .await?;
        return Ok(rows);
    }
    let rows = sqlx::query_as::<_, Channel>(
        r#"
        SELECT c.id, c.name, c.group_title, c.stream_url, c.logo_url, c.duration, c.tvg_id, c.tvg_name,
               c.tvg_chno, c.tvg_language, c.tvg_country, c.tvg_shift, c.tvg_rec, c.tvg_url, c.tvg_extras,
               c.watched_at, c.bookmarked_at, c.blocked_at
        FROM channels c
        JOIN groups g ON g.title = c.group_title
        WHERE c.watched_at IS NOT NULL
          AND c.blocked_at IS NULL
          AND g.blocked_at IS NULL
        ORDER BY c.watched_at DESC
        LIMIT ?
        "#,
    )
    .bind(bounded_limit)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn get_channel(pool: &SqlitePool, id: i64) -> Result<Option<Channel>, NeptuneError> {
    let row = sqlx::query_as::<_, Channel>(
        r#"
        SELECT c.id, c.name, c.group_title, c.stream_url, c.logo_url, c.duration, c.tvg_id, c.tvg_name,
               c.tvg_chno, c.tvg_language, c.tvg_country, c.tvg_shift, c.tvg_rec, c.tvg_url, c.tvg_extras,
               c.watched_at, c.bookmarked_at, c.blocked_at
        FROM channels c
        WHERE c.id = ?
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

pub async fn set_channel_bookmarked(
    pool: &SqlitePool,
    id: i64,
    value: bool,
) -> Result<(), NeptuneError> {
    if value {
        sqlx::query("UPDATE channels SET bookmarked_at = strftime('%s','now') WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;
    } else {
        sqlx::query("UPDATE channels SET bookmarked_at = NULL WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;
    }
    Ok(())
}

pub async fn set_channel_blocked(
    pool: &SqlitePool,
    id: i64,
    value: bool,
) -> Result<(), NeptuneError> {
    let mut tx = pool.begin().await?;
    let row = sqlx::query("SELECT group_title, blocked_at FROM channels WHERE id = ?")
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?;
    let Some(row) = row else {
        tx.commit().await?;
        return Ok(());
    };
    let group_title: String = row.get("group_title");
    let was_blocked = row.get::<Option<i64>, _>("blocked_at").is_some();

    if value {
        sqlx::query("UPDATE channels SET blocked_at = strftime('%s','now') WHERE id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;
    } else {
        sqlx::query("UPDATE channels SET blocked_at = NULL WHERE id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;
    }

    if was_blocked != value {
        let delta: i64 = if value { -1 } else { 1 };
        sqlx::query("UPDATE groups SET channel_count = MAX(channel_count + ?, 0) WHERE title = ?")
            .bind(delta)
            .bind(group_title)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok(())
}

pub async fn get_channel_stream_url(pool: &SqlitePool, id: i64) -> Result<String, NeptuneError> {
    let row = sqlx::query("SELECT stream_url FROM channels WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?;
    let Some(row) = row else {
        return Err(NeptuneError::ChannelNotFound);
    };
    let stream_url: String = row.get("stream_url");
    Ok(stream_url)
}

pub async fn mark_channel_watched(pool: &SqlitePool, id: i64) -> Result<(), NeptuneError> {
    sqlx::query("UPDATE channels SET watched_at = strftime('%s','now') WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

    use super::{
        get_channel, get_channel_stream_url, list_channels_in_group, list_recently_watched,
        mark_channel_watched, set_channel_blocked, set_channel_bookmarked,
    };
    use crate::{cursor::SortMode, db::migrations};

    async fn setup_pool() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("in-memory sqlite should connect");
        migrations::run(&pool).await.expect("migrations should run");
        pool
    }

    async fn seed_one_channel(pool: &SqlitePool) -> i64 {
        sqlx::query(
            "INSERT INTO groups (title, logo_url, sort_order, is_bookmarked, blocked_at) VALUES ('Sports', NULL, 1, 0, NULL)",
        )
        .execute(pool)
        .await
        .expect("insert group");
        let result = sqlx::query(
            r#"
            INSERT INTO channels (
                name, group_title, stream_url, logo_url, duration, tvg_id, tvg_name, tvg_chno, tvg_language,
                tvg_country, tvg_shift, tvg_rec, tvg_url, tvg_extras, watched_at, bookmarked_at, blocked_at
            ) VALUES ('Sky Sports 1', 'Sports', 'https://example.com/sky1', NULL,
                -1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
            "#,
        )
        .execute(pool)
        .await
        .expect("insert channel");
        sqlx::query("UPDATE groups SET channel_count = 1 WHERE title = 'Sports'")
            .execute(pool)
            .await
            .expect("update group channel count");
        result.last_insert_rowid()
    }

    #[tokio::test]
    async fn bookmark_block_and_watch_roundtrip() {
        let pool = setup_pool().await;
        let id = seed_one_channel(&pool).await;

        set_channel_bookmarked(&pool, id, true)
            .await
            .expect("bookmark should succeed");
        set_channel_blocked(&pool, id, true)
            .await
            .expect("block should succeed");
        mark_channel_watched(&pool, id)
            .await
            .expect("mark watched should succeed");

        let channel = get_channel(&pool, id)
            .await
            .expect("get channel should succeed")
            .expect("channel should exist");
        assert!(channel.bookmarked_at.is_some());
        assert!(channel.blocked_at.is_some());
        assert!(channel.watched_at.is_some());

        set_channel_bookmarked(&pool, id, false)
            .await
            .expect("unbookmark should succeed");
        set_channel_blocked(&pool, id, false)
            .await
            .expect("unblock should succeed");
        let channel = get_channel(&pool, id)
            .await
            .expect("get channel should succeed")
            .expect("channel should exist");
        assert!(channel.bookmarked_at.is_none());
        assert!(channel.blocked_at.is_none());
    }

    #[tokio::test]
    async fn list_channels_in_group_returns_rows_when_group_title_matches_groups_pk() {
        let pool = setup_pool().await;
        let _id = seed_one_channel(&pool).await;

        for sort in [SortMode::Default, SortMode::Name] {
            let page = list_channels_in_group(&pool, "Sports", sort, None, 50)
                .await
                .expect("list channels in group should succeed");
            assert_eq!(
                page.items.len(),
                1,
                "regression: UI list uses this query — empty means no row with matching group_title or all blocked"
            );
            assert_eq!(page.items[0].name, "Sky Sports 1");
            assert_eq!(page.items[0].group_title, "Sports");
        }
    }

    #[tokio::test]
    async fn list_channels_in_group_returns_empty_when_no_channel_in_that_group() {
        let pool = setup_pool().await;
        let _id = seed_one_channel(&pool).await;

        let page = list_channels_in_group(&pool, "News", SortMode::Default, None, 50)
            .await
            .expect("list should succeed");
        assert!(page.items.is_empty());
        assert!(page.next_cursor.is_none());
    }

    #[tokio::test]
    async fn stream_url_and_recently_watched_scope() {
        let pool = setup_pool().await;
        let id = seed_one_channel(&pool).await;

        let stream_url = get_channel_stream_url(&pool, id)
            .await
            .expect("stream url should be returned");
        assert_eq!(stream_url, "https://example.com/sky1");

        mark_channel_watched(&pool, id)
            .await
            .expect("mark watched should succeed");

        let all_recent = list_recently_watched(&pool, None, 50)
            .await
            .expect("global recent should succeed");
        assert_eq!(all_recent.len(), 1);

        let scoped_recent = list_recently_watched(&pool, Some("Sports".to_owned()), 50)
            .await
            .expect("scoped recent should succeed");
        assert_eq!(scoped_recent.len(), 1);
    }

    #[tokio::test]
    async fn set_channel_blocked_keeps_group_channel_count_in_sync() {
        let pool = setup_pool().await;
        let id = seed_one_channel(&pool).await;

        let before: i64 =
            sqlx::query_scalar("SELECT channel_count FROM groups WHERE title = 'Sports'")
                .fetch_one(&pool)
                .await
                .expect("read initial channel_count");
        assert_eq!(before, 1);

        set_channel_blocked(&pool, id, true)
            .await
            .expect("block should succeed");
        let blocked: i64 =
            sqlx::query_scalar("SELECT channel_count FROM groups WHERE title = 'Sports'")
                .fetch_one(&pool)
                .await
                .expect("read blocked channel_count");
        assert_eq!(blocked, 0);

        set_channel_blocked(&pool, id, false)
            .await
            .expect("unblock should succeed");
        let unblocked: i64 =
            sqlx::query_scalar("SELECT channel_count FROM groups WHERE title = 'Sports'")
                .fetch_one(&pool)
                .await
                .expect("read unblocked channel_count");
        assert_eq!(unblocked, 1);
    }
}
