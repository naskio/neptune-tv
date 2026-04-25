use base64::Engine;
use serde::{de::DeserializeOwned, Deserialize, Serialize};

use crate::error::NeptuneError;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SortMode {
    Default,
    Name,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupCursorDefault {
    pub sort: SortMode,
    pub is_bookmarked: i64,
    pub sort_order: i64,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupCursorName {
    pub sort: SortMode,
    pub is_bookmarked: i64,
    pub title_lower: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelCursorDefault {
    pub sort: SortMode,
    pub bookmarked_at: i64,
    pub id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelCursorName {
    pub sort: SortMode,
    pub bookmarked_at: i64,
    pub name_lower: String,
    pub id: i64,
}

pub fn encode_cursor<T: Serialize>(value: &T) -> Result<String, NeptuneError> {
    let json = serde_json::to_vec(value)
        .map_err(|err| NeptuneError::InvalidRequest(format!("cursor encode failed: {err}")))?;
    Ok(base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(json))
}

pub fn decode_cursor<T: DeserializeOwned>(cursor: &str) -> Result<T, NeptuneError> {
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(cursor)
        .map_err(|err| NeptuneError::InvalidRequest(format!("cursor decode failed: {err}")))?;
    serde_json::from_slice::<T>(&bytes)
        .map_err(|err| NeptuneError::InvalidRequest(format!("cursor parse failed: {err}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cursor_roundtrip_group_default() {
        let cursor = GroupCursorDefault {
            sort: SortMode::Default,
            is_bookmarked: 1,
            sort_order: 42,
            title: "Sports".to_owned(),
        };

        let encoded = encode_cursor(&cursor).expect("encode should succeed");
        let decoded: GroupCursorDefault = decode_cursor(&encoded).expect("decode should succeed");

        assert!(matches!(decoded.sort, SortMode::Default));
        assert_eq!(decoded.is_bookmarked, 1);
        assert_eq!(decoded.sort_order, 42);
        assert_eq!(decoded.title, "Sports");
    }

    #[test]
    fn decode_invalid_cursor_fails() {
        let result: Result<GroupCursorName, NeptuneError> = decode_cursor("%%%not-base64%%%");
        assert!(result.is_err());
    }
}
