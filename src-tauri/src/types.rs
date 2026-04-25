use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistMeta {
    pub source: String,
    pub kind: String,
    pub imported_at: i64,
    pub channel_count: i64,
    pub group_count: i64,
    pub skipped: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Group {
    pub title: String,
    pub logo_url: String,
    pub sort_order: i64,
    pub is_bookmarked: i64,
    pub blocked_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupDetail {
    pub title: String,
    pub logo_url: String,
    pub sort_order: i64,
    pub is_bookmarked: i64,
    pub blocked_at: Option<i64>,
    pub channel_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Channel {
    pub id: i64,
    pub name: String,
    pub group_title: String,
    pub stream_url: String,
    pub logo_url: String,
    pub duration: i64,
    pub tvg_id: Option<String>,
    pub tvg_name: Option<String>,
    pub tvg_chno: Option<i64>,
    pub tvg_language: Option<String>,
    pub tvg_country: Option<String>,
    pub tvg_shift: Option<f64>,
    pub tvg_rec: Option<String>,
    pub tvg_url: Option<String>,
    pub tvg_extras: Option<String>,
    pub watched_at: Option<i64>,
    pub bookmarked_at: Option<i64>,
    pub blocked_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupPage {
    pub items: Vec<Group>,
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelPage {
    pub items: Vec<Channel>,
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResults {
    pub groups: Vec<Group>,
    pub channels: Vec<Channel>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct ChannelWithRank {
    pub id: i64,
    pub name: String,
    pub group_title: String,
    pub stream_url: String,
    pub logo_url: String,
    pub duration: i64,
    pub tvg_id: Option<String>,
    pub tvg_name: Option<String>,
    pub tvg_chno: Option<i64>,
    pub tvg_language: Option<String>,
    pub tvg_country: Option<String>,
    pub tvg_shift: Option<f64>,
    pub tvg_rec: Option<String>,
    pub tvg_url: Option<String>,
    pub tvg_extras: Option<String>,
    pub watched_at: Option<i64>,
    pub bookmarked_at: Option<i64>,
    pub blocked_at: Option<i64>,
}

impl From<ChannelWithRank> for Channel {
    fn from(value: ChannelWithRank) -> Self {
        Self {
            id: value.id,
            name: value.name,
            group_title: value.group_title,
            stream_url: value.stream_url,
            logo_url: value.logo_url,
            duration: value.duration,
            tvg_id: value.tvg_id,
            tvg_name: value.tvg_name,
            tvg_chno: value.tvg_chno,
            tvg_language: value.tvg_language,
            tvg_country: value.tvg_country,
            tvg_shift: value.tvg_shift,
            tvg_rec: value.tvg_rec,
            tvg_url: value.tvg_url,
            tvg_extras: value.tvg_extras,
            watched_at: value.watched_at,
            bookmarked_at: value.bookmarked_at,
            blocked_at: value.blocked_at,
        }
    }
}
