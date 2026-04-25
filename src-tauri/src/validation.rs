//! Defensive input validation for `#[tauri::command]` handlers.
//!
//! Every command must validate its arguments here before touching the DB so that
//! a malformed payload (empty title, negative id, huge limit, etc.) produces a
//! clean `NeptuneError::InvalidRequest` instead of an unbounded query, FTS
//! syntax error, or DoS-shaped result. Mirrors the Zod schemas in
//! `src/lib/schemas/`.

use crate::error::NeptuneError;

/// Hard upper bound on any paginated `LIMIT` accepted from the frontend.
/// Must match `MAX_LIMIT` in `src/lib/schemas/pagination.ts`.
pub const MAX_LIMIT: i64 = 500;

/// Maximum length of a `group_title` / `title` string. Matches SQLite TEXT
/// soft-cap we expose; anything longer is almost certainly a bug.
pub const MAX_TITLE_LEN: usize = 1024;

/// Maximum length of a free-form search query.
pub const MAX_QUERY_LEN: usize = 256;

/// Maximum length of a local filesystem path or remote URL.
pub const MAX_PATH_LEN: usize = 4096;

/// Validate a non-empty title (group title, channel name, etc.).
/// Returns the **trimmed** title to keep DB lookups consistent with the parser.
pub fn validate_title<'a>(raw: &'a str, field: &str) -> Result<&'a str, NeptuneError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(NeptuneError::InvalidRequest(format!(
            "{field} must not be empty"
        )));
    }
    if trimmed.len() > MAX_TITLE_LEN {
        return Err(NeptuneError::InvalidRequest(format!(
            "{field} exceeds {MAX_TITLE_LEN} chars"
        )));
    }
    Ok(trimmed)
}

/// Validate an optional title — `None` passes through untouched.
pub fn validate_optional_title(
    raw: Option<String>,
    field: &str,
) -> Result<Option<String>, NeptuneError> {
    match raw {
        None => Ok(None),
        Some(s) => Ok(Some(validate_title(&s, field)?.to_owned())),
    }
}

/// Validate a search query (non-empty after trim, length-capped).
pub fn validate_query(raw: &str) -> Result<&str, NeptuneError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(NeptuneError::InvalidRequest(
            "query must not be empty".to_owned(),
        ));
    }
    if trimmed.len() > MAX_QUERY_LEN {
        return Err(NeptuneError::InvalidRequest(format!(
            "query exceeds {MAX_QUERY_LEN} chars"
        )));
    }
    Ok(trimmed)
}

/// Validate a positive row id (channel id, etc.).
pub fn validate_id(id: i64, field: &str) -> Result<i64, NeptuneError> {
    if id <= 0 {
        return Err(NeptuneError::InvalidRequest(format!(
            "{field} must be a positive integer"
        )));
    }
    Ok(id)
}

/// Resolve an optional `limit`, falling back to `default` when absent and
/// clamping to `[1, MAX_LIMIT]` otherwise.
pub fn resolve_limit(value: Option<i64>, default: i64) -> Result<i64, NeptuneError> {
    let raw = value.unwrap_or(default);
    if raw < 1 {
        return Err(NeptuneError::InvalidRequest(
            "limit must be >= 1".to_owned(),
        ));
    }
    if raw > MAX_LIMIT {
        return Err(NeptuneError::InvalidRequest(format!(
            "limit must be <= {MAX_LIMIT}"
        )));
    }
    Ok(raw)
}

/// Validate a local filesystem path string from the picker.
pub fn validate_local_path(raw: &str) -> Result<&str, NeptuneError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(NeptuneError::InvalidRequest(
            "path must not be empty".to_owned(),
        ));
    }
    if trimmed.len() > MAX_PATH_LEN {
        return Err(NeptuneError::InvalidRequest(format!(
            "path exceeds {MAX_PATH_LEN} chars"
        )));
    }
    Ok(trimmed)
}

/// Validate a remote URL: non-empty, http/https only, length-capped.
pub fn validate_remote_url(raw: &str) -> Result<&str, NeptuneError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(NeptuneError::InvalidRequest(
            "url must not be empty".to_owned(),
        ));
    }
    if trimmed.len() > MAX_PATH_LEN {
        return Err(NeptuneError::InvalidRequest(format!(
            "url exceeds {MAX_PATH_LEN} chars"
        )));
    }
    if !(trimmed.starts_with("http://") || trimmed.starts_with("https://")) {
        return Err(NeptuneError::InvalidRequest(
            "remote import only supports http/https".to_owned(),
        ));
    }
    Ok(trimmed)
}

/// Validate an opaque cursor string passed straight through to the DB layer.
/// The DB will reject malformed cursors during `decode_cursor`.
pub fn validate_optional_cursor(raw: Option<String>) -> Result<Option<String>, NeptuneError> {
    match raw {
        None => Ok(None),
        Some(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                return Err(NeptuneError::InvalidRequest(
                    "cursor must not be empty (omit it instead)".to_owned(),
                ));
            }
            Ok(Some(trimmed.to_owned()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn kind(err: NeptuneError) -> &'static str {
        match err {
            NeptuneError::InvalidRequest(_) => "invalid_request",
            _ => "other",
        }
    }

    #[test]
    fn validate_title_trims_and_rejects_empty() {
        assert_eq!(validate_title("  Sports  ", "title").unwrap(), "Sports");
        assert_eq!(
            kind(validate_title("", "title").unwrap_err()),
            "invalid_request"
        );
        assert_eq!(
            kind(validate_title("   ", "title").unwrap_err()),
            "invalid_request"
        );
    }

    #[test]
    fn validate_title_rejects_overlong() {
        let too_long = "a".repeat(MAX_TITLE_LEN + 1);
        assert_eq!(
            kind(validate_title(&too_long, "title").unwrap_err()),
            "invalid_request"
        );
    }

    #[test]
    fn validate_query_requires_non_empty() {
        assert_eq!(validate_query(" sky ").unwrap(), "sky");
        assert_eq!(kind(validate_query("").unwrap_err()), "invalid_request");
        assert_eq!(kind(validate_query("   ").unwrap_err()), "invalid_request");
    }

    #[test]
    fn validate_id_requires_positive() {
        assert_eq!(validate_id(1, "id").unwrap(), 1);
        assert_eq!(kind(validate_id(0, "id").unwrap_err()), "invalid_request");
        assert_eq!(kind(validate_id(-1, "id").unwrap_err()), "invalid_request");
    }

    #[test]
    fn resolve_limit_clamps_to_bounds_and_uses_default() {
        assert_eq!(resolve_limit(None, 50).unwrap(), 50);
        assert_eq!(resolve_limit(Some(10), 50).unwrap(), 10);
        assert_eq!(resolve_limit(Some(MAX_LIMIT), 50).unwrap(), MAX_LIMIT);
        assert_eq!(
            kind(resolve_limit(Some(0), 50).unwrap_err()),
            "invalid_request"
        );
        assert_eq!(
            kind(resolve_limit(Some(-1), 50).unwrap_err()),
            "invalid_request"
        );
        assert_eq!(
            kind(resolve_limit(Some(MAX_LIMIT + 1), 50).unwrap_err()),
            "invalid_request"
        );
    }

    #[test]
    fn validate_remote_url_rejects_non_http() {
        assert!(validate_remote_url("https://example.com/p.m3u").is_ok());
        assert!(validate_remote_url("http://example.com/p.m3u").is_ok());
        assert_eq!(
            kind(validate_remote_url("file:///a.m3u").unwrap_err()),
            "invalid_request"
        );
        assert_eq!(
            kind(validate_remote_url("ftp://example.com/x").unwrap_err()),
            "invalid_request"
        );
        assert_eq!(
            kind(validate_remote_url("").unwrap_err()),
            "invalid_request"
        );
    }

    #[test]
    fn validate_optional_cursor_rejects_empty_some() {
        assert_eq!(validate_optional_cursor(None).unwrap(), None);
        assert_eq!(
            validate_optional_cursor(Some("  abc ".to_owned())).unwrap(),
            Some("abc".to_owned())
        );
        assert_eq!(
            kind(validate_optional_cursor(Some("   ".to_owned())).unwrap_err()),
            "invalid_request"
        );
    }
}
