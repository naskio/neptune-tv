use sqlx::{Row, SqlitePool};

use crate::{
    cursor::{decode_cursor, encode_cursor, GroupCursorDefault, GroupCursorName, SortMode},
    error::NeptuneError,
    types::{Group, GroupDetail, GroupPage},
};

pub async fn list_groups(
    pool: &SqlitePool,
    sort: SortMode,
    cursor: Option<String>,
    limit: i64,
) -> Result<GroupPage, NeptuneError> {
    list_groups_internal(pool, sort, cursor, limit, false, false).await
}

pub async fn list_bookmarked_groups(
    pool: &SqlitePool,
    sort: SortMode,
    cursor: Option<String>,
    limit: i64,
) -> Result<GroupPage, NeptuneError> {
    list_groups_internal(pool, sort, cursor, limit, true, false).await
}

pub async fn list_blocked_groups(
    pool: &SqlitePool,
    cursor: Option<String>,
    limit: i64,
) -> Result<GroupPage, NeptuneError> {
    let decoded = cursor
        .as_deref()
        .map(decode_cursor::<GroupCursorName>)
        .transpose()?;
    let rows = if let Some(decoded) = decoded {
        sqlx::query_as::<_, Group>(
            r#"
            SELECT title, logo_url, sort_order, is_bookmarked, blocked_at, channel_count
            FROM groups
            WHERE blocked_at IS NOT NULL
              AND (LOWER(title), title) > (?, ?)
            ORDER BY LOWER(title), title
            LIMIT ?
            "#,
        )
        .bind(decoded.title_lower)
        .bind(decoded.title)
        .bind(limit + 1)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, Group>(
            r#"
            SELECT title, logo_url, sort_order, is_bookmarked, blocked_at, channel_count
            FROM groups
            WHERE blocked_at IS NOT NULL
            ORDER BY LOWER(title), title
            LIMIT ?
            "#,
        )
        .bind(limit + 1)
        .fetch_all(pool)
        .await?
    };
    paginate_groups(rows, limit, SortMode::Name)
}

async fn list_groups_internal(
    pool: &SqlitePool,
    sort: SortMode,
    cursor: Option<String>,
    limit: i64,
    bookmarked_only: bool,
    blocked_only: bool,
) -> Result<GroupPage, NeptuneError> {
    let where_clause = match (bookmarked_only, blocked_only) {
        (true, false) => "g.blocked_at IS NULL AND g.is_bookmarked = 1",
        (false, true) => "g.blocked_at IS NOT NULL",
        (true, true) => "g.blocked_at IS NOT NULL AND g.is_bookmarked = 1",
        (false, false) => "g.blocked_at IS NULL",
    };

    let rows = match sort {
        SortMode::Default => {
            let decoded = cursor
                .as_deref()
                .map(decode_cursor::<GroupCursorDefault>)
                .transpose()?;
            if let Some(decoded) = decoded {
                sqlx::query_as::<_, Group>(&format!(
                    r#"
                    SELECT g.title, g.logo_url, g.sort_order, g.is_bookmarked, g.blocked_at, g.channel_count
                    FROM groups g
                    WHERE {where_clause}
                      AND (g.sort_order > ? OR (g.sort_order = ? AND g.title > ?))
                    ORDER BY g.sort_order ASC, g.title ASC
                    LIMIT ?
                    "#
                ))
                .bind(decoded.sort_order)
                .bind(decoded.sort_order)
                .bind(decoded.title)
                .bind(limit + 1)
                .fetch_all(pool)
                .await?
            } else {
                sqlx::query_as::<_, Group>(&format!(
                    r#"
                    SELECT g.title, g.logo_url, g.sort_order, g.is_bookmarked, g.blocked_at, g.channel_count
                    FROM groups g
                    WHERE {where_clause}
                    ORDER BY g.sort_order ASC, g.title ASC
                    LIMIT ?
                    "#
                ))
                .bind(limit + 1)
                .fetch_all(pool)
                .await?
            }
        }
        SortMode::Name => {
            let decoded = cursor
                .as_deref()
                .map(decode_cursor::<GroupCursorName>)
                .transpose()?;
            if let Some(decoded) = decoded {
                sqlx::query_as::<_, Group>(&format!(
                    r#"
                    SELECT g.title, g.logo_url, g.sort_order, g.is_bookmarked, g.blocked_at, g.channel_count
                    FROM groups g
                    WHERE {where_clause}
                      AND (LOWER(g.title) > ? OR (LOWER(g.title) = ? AND g.title > ?))
                    ORDER BY LOWER(g.title) ASC, g.title ASC
                    LIMIT ?
                    "#
                ))
                .bind(decoded.title_lower.clone())
                .bind(decoded.title_lower)
                .bind(decoded.title)
                .bind(limit + 1)
                .fetch_all(pool)
                .await?
            } else {
                sqlx::query_as::<_, Group>(&format!(
                    r#"
                    SELECT g.title, g.logo_url, g.sort_order, g.is_bookmarked, g.blocked_at, g.channel_count
                    FROM groups g
                    WHERE {where_clause}
                    ORDER BY LOWER(g.title) ASC, g.title ASC
                    LIMIT ?
                    "#
                ))
                .bind(limit + 1)
                .fetch_all(pool)
                .await?
            }
        }
    };

    paginate_groups(rows, limit, sort)
}

fn paginate_groups(
    mut rows: Vec<Group>,
    limit: i64,
    sort: SortMode,
) -> Result<GroupPage, NeptuneError> {
    let next_cursor = if rows.len() as i64 > limit {
        rows.pop();
        let tail = rows.last().expect("row exists after trim");
        Some(match sort {
            SortMode::Default => encode_cursor(&GroupCursorDefault {
                sort,
                is_bookmarked: tail.is_bookmarked,
                sort_order: tail.sort_order,
                title: tail.title.clone(),
            })?,
            SortMode::Name => encode_cursor(&GroupCursorName {
                sort,
                is_bookmarked: tail.is_bookmarked,
                title_lower: tail.title.to_lowercase(),
                title: tail.title.clone(),
            })?,
        })
    } else {
        None
    };
    Ok(GroupPage {
        items: rows,
        next_cursor,
    })
}

pub async fn get_group(
    pool: &SqlitePool,
    title: &str,
) -> Result<Option<GroupDetail>, NeptuneError> {
    let row = sqlx::query(
        r#"
        SELECT g.title, g.logo_url, g.sort_order, g.is_bookmarked, g.blocked_at, g.channel_count
        FROM groups g
        WHERE g.title = ?
        "#,
    )
    .bind(title)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|row| GroupDetail {
        title: row.get("title"),
        logo_url: row.get("logo_url"),
        sort_order: row.get("sort_order"),
        is_bookmarked: row.get("is_bookmarked"),
        blocked_at: row.get("blocked_at"),
        channel_count: row.get("channel_count"),
    }))
}

pub async fn set_group_bookmarked(
    pool: &SqlitePool,
    title: &str,
    value: bool,
) -> Result<(), NeptuneError> {
    sqlx::query("UPDATE groups SET is_bookmarked = ? WHERE title = ?")
        .bind(if value { 1 } else { 0 })
        .bind(title)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn set_group_blocked(
    pool: &SqlitePool,
    title: &str,
    value: bool,
) -> Result<(), NeptuneError> {
    if value {
        sqlx::query("UPDATE groups SET blocked_at = strftime('%s','now') WHERE title = ?")
            .bind(title)
            .execute(pool)
            .await?;
    } else {
        sqlx::query("UPDATE groups SET blocked_at = NULL WHERE title = ?")
            .bind(title)
            .execute(pool)
            .await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use sqlx::sqlite::SqlitePoolOptions;

    use super::{list_groups, set_group_blocked};
    use crate::{cursor::SortMode, db::migrations};

    #[tokio::test]
    async fn groups_default_pagination_and_block_filter() {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("in-memory sqlite should connect");
        migrations::run(&pool).await.expect("migrations should run");

        for (title, sort_order, is_bookmarked) in [
            ("Alpha", 1_i64, 0_i64),
            ("Beta", 2_i64, 1_i64),
            ("Gamma", 3_i64, 0_i64),
        ] {
            sqlx::query(
                "INSERT INTO groups (title, logo_url, sort_order, is_bookmarked, blocked_at) VALUES (?, NULL, ?, ?, NULL)",
            )
            .bind(title)
            .bind(sort_order)
            .bind(is_bookmarked)
            .execute(&pool)
            .await
            .expect("insert group");
        }

        set_group_blocked(&pool, "Gamma", true)
            .await
            .expect("blocking should succeed");

        let page1 = list_groups(&pool, SortMode::Default, None, 1)
            .await
            .expect("first page should succeed");
        assert_eq!(page1.items.len(), 1);
        assert_eq!(page1.items[0].title, "Alpha");
        assert!(page1.next_cursor.is_some());

        let page2 = list_groups(&pool, SortMode::Default, page1.next_cursor, 10)
            .await
            .expect("second page should succeed");
        assert_eq!(page2.items.len(), 1);
        assert_eq!(page2.items[0].title, "Beta");
    }
}
