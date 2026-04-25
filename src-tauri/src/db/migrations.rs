use sqlx::SqlitePool;

use crate::error::NeptuneError;

pub async fn run(pool: &SqlitePool) -> Result<(), NeptuneError> {
    sqlx::query(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS groups (
            title TEXT PRIMARY KEY,
            logo_url TEXT,
            sort_order INTEGER NOT NULL,
            is_bookmarked INTEGER NOT NULL DEFAULT 0,
            blocked_at INTEGER,
            channel_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            group_title TEXT NOT NULL,
            stream_url TEXT NOT NULL,
            logo_url TEXT,
            duration INTEGER NOT NULL DEFAULT -1,
            tvg_id TEXT,
            tvg_name TEXT,
            tvg_chno INTEGER,
            tvg_language TEXT,
            tvg_country TEXT,
            tvg_shift REAL,
            tvg_rec TEXT,
            tvg_url TEXT,
            tvg_extras TEXT,
            watched_at INTEGER,
            bookmarked_at INTEGER,
            blocked_at INTEGER,
            FOREIGN KEY(group_title) REFERENCES groups(title) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS playlist_meta (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            kind TEXT NOT NULL,
            imported_at INTEGER NOT NULL,
            channel_count INTEGER NOT NULL,
            group_count INTEGER NOT NULL,
            skipped INTEGER NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS groups_fts USING fts5(
            title,
            content='groups',
            content_rowid='rowid'
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS channels_fts USING fts5(
            name,
            group_title,
            content='channels',
            content_rowid='id'
        );

        CREATE TRIGGER IF NOT EXISTS groups_ai AFTER INSERT ON groups BEGIN
            INSERT INTO groups_fts(rowid, title) VALUES (new.rowid, new.title);
        END;
        CREATE TRIGGER IF NOT EXISTS groups_ad AFTER DELETE ON groups BEGIN
            INSERT INTO groups_fts(groups_fts, rowid, title) VALUES('delete', old.rowid, old.title);
        END;
        CREATE TRIGGER IF NOT EXISTS groups_au AFTER UPDATE ON groups BEGIN
            INSERT INTO groups_fts(groups_fts, rowid, title) VALUES('delete', old.rowid, old.title);
            INSERT INTO groups_fts(rowid, title) VALUES (new.rowid, new.title);
        END;

        CREATE TRIGGER IF NOT EXISTS channels_ai AFTER INSERT ON channels BEGIN
            INSERT INTO channels_fts(rowid, name, group_title) VALUES (new.id, new.name, new.group_title);
        END;
        CREATE TRIGGER IF NOT EXISTS channels_ad AFTER DELETE ON channels BEGIN
            INSERT INTO channels_fts(channels_fts, rowid, name, group_title) VALUES('delete', old.id, old.name, old.group_title);
        END;
        CREATE TRIGGER IF NOT EXISTS channels_au AFTER UPDATE ON channels BEGIN
            INSERT INTO channels_fts(channels_fts, rowid, name, group_title) VALUES('delete', old.id, old.name, old.group_title);
            INSERT INTO channels_fts(rowid, name, group_title) VALUES (new.id, new.name, new.group_title);
        END;

        CREATE INDEX IF NOT EXISTS idx_channels_group_blocked_bookmarked_id
            ON channels(group_title, blocked_at, bookmarked_at DESC, id);
        CREATE INDEX IF NOT EXISTS idx_channels_group_blocked_bookmarked_name
            ON channels(group_title, blocked_at, bookmarked_at DESC, name);
        CREATE INDEX IF NOT EXISTS idx_channels_blocked_bookmarked
            ON channels(blocked_at, bookmarked_at);
        CREATE INDEX IF NOT EXISTS idx_channels_blocked_watched
            ON channels(blocked_at, watched_at);
        CREATE INDEX IF NOT EXISTS idx_channels_tvg_chno
            ON channels(tvg_chno);

        CREATE INDEX IF NOT EXISTS idx_groups_blocked_bookmarked_sort
            ON groups(blocked_at, is_bookmarked DESC, sort_order);
        CREATE INDEX IF NOT EXISTS idx_groups_blocked_bookmarked_title
            ON groups(blocked_at, is_bookmarked DESC, title);
        "#,
    )
    .execute(pool)
    .await?;

    // Lightweight schema migration for databases created before `groups.channel_count` existed.
    let has_channel_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM pragma_table_info('groups') WHERE name = 'channel_count'",
    )
    .fetch_one(pool)
    .await?;
    if has_channel_count == 0 {
        sqlx::query("ALTER TABLE groups ADD COLUMN channel_count INTEGER NOT NULL DEFAULT 0")
            .execute(pool)
            .await?;
        sqlx::query(
            r#"
            UPDATE groups
            SET channel_count = (
                SELECT COUNT(1)
                FROM channels c
                WHERE c.group_title = groups.title
                  AND c.blocked_at IS NULL
            )
            "#,
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}
