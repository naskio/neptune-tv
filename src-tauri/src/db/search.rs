use sqlx::SqlitePool;

use crate::{
    cursor::{decode_cursor, encode_cursor, ChannelCursorName, SortMode},
    error::NeptuneError,
    types::{Channel, ChannelPage, Group, SearchResults},
};

pub async fn search_global(
    pool: &SqlitePool,
    query: &str,
    group_limit: i64,
    channel_limit: i64,
) -> Result<SearchResults, NeptuneError> {
    if query.trim().is_empty() {
        return Ok(SearchResults {
            groups: Vec::new(),
            channels: Vec::new(),
        });
    }

    let groups = sqlx::query_as::<_, Group>(
        r#"
        SELECT g.title, g.logo_url, g.sort_order, g.is_bookmarked, g.blocked_at
        FROM groups g
        JOIN groups_fts ON groups_fts.rowid = g.rowid
        WHERE groups_fts MATCH ?
          AND g.blocked_at IS NULL
        ORDER BY bm25(groups_fts)
        LIMIT ?
        "#,
    )
    .bind(query)
    .bind(group_limit)
    .fetch_all(pool)
    .await?;

    let channels = sqlx::query_as::<_, Channel>(
        r#"
        SELECT c.id, c.name, c.group_title, c.stream_url, c.logo_url, c.duration, c.tvg_id, c.tvg_name,
               c.tvg_chno, c.tvg_language, c.tvg_country, c.tvg_shift, c.tvg_rec, c.tvg_url, c.tvg_extras,
               c.watched_at, c.bookmarked_at, c.blocked_at
        FROM channels c
        JOIN groups g ON g.title = c.group_title
        JOIN channels_fts ON channels_fts.rowid = c.id
        WHERE channels_fts.name MATCH ?
          AND c.blocked_at IS NULL
          AND g.blocked_at IS NULL
        ORDER BY bm25(channels_fts)
        LIMIT ?
        "#,
    )
    .bind(query)
    .bind(channel_limit)
    .fetch_all(pool)
    .await?;

    Ok(SearchResults { groups, channels })
}

pub async fn search_channels_in_group(
    pool: &SqlitePool,
    group_title: &str,
    query: &str,
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
            JOIN groups g ON g.title = c.group_title
            JOIN channels_fts ON channels_fts.rowid = c.id
            WHERE c.group_title = ?
              AND channels_fts.name MATCH ?
              AND c.blocked_at IS NULL
              AND g.blocked_at IS NULL
              AND (LOWER(c.name), c.id) > (?, ?)
            ORDER BY LOWER(c.name), c.id
            LIMIT ?
            "#,
        )
        .bind(group_title)
        .bind(query)
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
            JOIN groups g ON g.title = c.group_title
            JOIN channels_fts ON channels_fts.rowid = c.id
            WHERE c.group_title = ?
              AND channels_fts.name MATCH ?
              AND c.blocked_at IS NULL
              AND g.blocked_at IS NULL
            ORDER BY LOWER(c.name), c.id
            LIMIT ?
            "#,
        )
        .bind(group_title)
        .bind(query)
        .bind(limit + 1)
        .fetch_all(pool)
        .await?
    };

    let next_cursor = if rows.len() as i64 > limit {
        let mut rows = rows;
        rows.pop();
        let tail = rows.last().expect("row exists after trim");
        let next = encode_cursor(&ChannelCursorName {
            sort: SortMode::Name,
            bookmarked_at: tail.bookmarked_at.unwrap_or(0),
            name_lower: tail.name.to_lowercase(),
            id: tail.id,
        })?;
        return Ok(ChannelPage {
            items: rows,
            next_cursor: Some(next),
        });
    } else {
        None
    };
    Ok(ChannelPage {
        items: rows,
        next_cursor,
    })
}

#[cfg(test)]
mod tests {
    use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

    use super::{search_channels_in_group, search_global};
    use crate::db::migrations;

    async fn setup_pool() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("in-memory sqlite should connect");
        migrations::run(&pool).await.expect("migrations should run");
        pool
    }

    async fn seed(pool: &SqlitePool) {
        sqlx::query(
            "INSERT INTO groups (title, logo_url, sort_order, is_bookmarked, blocked_at) VALUES (?, ?, ?, 0, NULL)",
        )
        .bind("Sports")
        .bind("/group-default.svg")
        .bind(1_i64)
        .execute(pool)
        .await
        .expect("insert group sports");

        sqlx::query(
            "INSERT INTO groups (title, logo_url, sort_order, is_bookmarked, blocked_at) VALUES (?, ?, ?, 0, strftime('%s','now'))",
        )
        .bind("Hidden")
        .bind("/group-default.svg")
        .bind(2_i64)
        .execute(pool)
        .await
        .expect("insert blocked group");

        for (name, group_title, blocked_at) in [
            ("Sky Sports 1", "Sports", None::<i64>),
            ("Sky Sports 2", "Sports", None::<i64>),
            ("Sky Blocked Channel", "Sports", Some(1_i64)),
            ("Sky Hidden Group", "Hidden", None::<i64>),
        ] {
            sqlx::query(
                r#"
                INSERT INTO channels (
                    name, group_title, stream_url, logo_url, duration, tvg_id, tvg_name, tvg_chno, tvg_language,
                    tvg_country, tvg_shift, tvg_rec, tvg_url, tvg_extras, watched_at, bookmarked_at, blocked_at
                ) VALUES (?, ?, ?, ?, -1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?)
                "#,
            )
            .bind(name)
            .bind(group_title)
            .bind(format!("https://example.com/{}", name.replace(' ', "_")))
            .bind("/channel-default.svg")
            .bind(blocked_at)
            .execute(pool)
            .await
            .expect("insert channel");
        }
    }

    #[tokio::test]
    async fn global_search_excludes_blocked_items() {
        let pool = setup_pool().await;
        seed(&pool).await;

        let results = search_global(&pool, "Sky", 10, 10)
            .await
            .expect("search should succeed");

        assert_eq!(results.groups.len(), 0);
        assert_eq!(results.channels.len(), 2);
        let names: Vec<String> = results.channels.into_iter().map(|c| c.name).collect();
        assert!(names.iter().any(|n| n == "Sky Sports 1"));
        assert!(names.iter().any(|n| n == "Sky Sports 2"));
        assert!(!names.iter().any(|n| n == "Sky Blocked Channel"));
        assert!(!names.iter().any(|n| n == "Sky Hidden Group"));
    }

    #[tokio::test]
    async fn scoped_search_supports_cursor_pagination() {
        let pool = setup_pool().await;
        seed(&pool).await;

        let page1 = search_channels_in_group(&pool, "Sports", "Sky", None, 1)
            .await
            .expect("first page should succeed");
        assert_eq!(page1.items.len(), 1);
        assert!(page1.next_cursor.is_some());

        let page2 = search_channels_in_group(&pool, "Sports", "Sky", page1.next_cursor, 1)
            .await
            .expect("second page should succeed");
        assert_eq!(page2.items.len(), 1);

        let mut names = vec![page1.items[0].name.clone(), page2.items[0].name.clone()];
        names.sort();
        assert_eq!(
            names,
            vec!["Sky Sports 1".to_owned(), "Sky Sports 2".to_owned()]
        );
    }
}
