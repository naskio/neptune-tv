use std::collections::BTreeMap;

use serde_json::Value;

use super::types::{ParsedChannel, ParsedExtInf};

const UNCATEGORIZED: &str = "Uncategorized";
const GROUP_DEFAULT_LOGO: &str = "/group-default.svg";
const CHANNEL_DEFAULT_LOGO: &str = "/channel-default.svg";

pub fn parse_extinf_line(line: &str) -> Option<ParsedExtInf> {
    if !line.starts_with("#EXTINF:") {
        return None;
    }

    let body = line.trim_start_matches("#EXTINF:");
    let comma_idx = body.rfind(',')?;
    let (meta_part, display_name_part) = body.split_at(comma_idx);
    let display_name = display_name_part.trim_start_matches(',').trim();
    if display_name.is_empty() {
        return None;
    }

    let mut split = meta_part.trim().splitn(2, ' ');
    let duration_raw = split.next().unwrap_or("-1");
    let attrs_raw = split.next().unwrap_or("");
    let duration = duration_raw.parse::<i64>().unwrap_or(-1);
    let attributes = parse_attributes(attrs_raw);

    let logo_url = attributes
        .get("tvg-logo")
        .and_then(|v| non_empty(v))
        .map(str::to_owned)
        .unwrap_or_else(|| CHANNEL_DEFAULT_LOGO.to_owned());
    let group_title = attributes
        .get("group-title")
        .and_then(|v| non_empty(v))
        .map(str::to_owned)
        .unwrap_or_else(|| UNCATEGORIZED.to_owned());
    let tvg_id = attributes
        .get("tvg-id")
        .and_then(|v| non_empty(v))
        .map(str::to_owned);
    let tvg_name = attributes
        .get("tvg-name")
        .and_then(|v| non_empty(v))
        .map(str::to_owned);
    let tvg_chno = attributes
        .get("tvg-chno")
        .and_then(|v| non_empty(v))
        .and_then(|v| v.parse::<i64>().ok());
    let tvg_language = attributes
        .get("tvg-language")
        .and_then(|v| non_empty(v))
        .map(str::to_owned);
    let tvg_country = attributes
        .get("tvg-country")
        .and_then(|v| non_empty(v))
        .map(str::to_owned);
    let tvg_shift = attributes
        .get("tvg-shift")
        .and_then(|v| non_empty(v))
        .and_then(|v| v.parse::<f64>().ok());
    let tvg_rec = attributes
        .get("tvg-rec")
        .and_then(|v| non_empty(v))
        .map(str::to_owned);
    let tvg_url = attributes
        .get("tvg-url")
        .and_then(|v| non_empty(v))
        .map(str::to_owned);

    let extras = attributes
        .into_iter()
        .filter(|(key, _)| {
            !matches!(
                key.as_str(),
                "tvg-logo"
                    | "group-title"
                    | "tvg-id"
                    | "tvg-name"
                    | "tvg-chno"
                    | "tvg-language"
                    | "tvg-country"
                    | "tvg-shift"
                    | "tvg-rec"
                    | "tvg-url"
            )
        })
        .collect::<BTreeMap<String, String>>();
    let tvg_extras = if extras.is_empty() {
        None
    } else {
        serde_json::to_string(&Value::Object(
            extras
                .into_iter()
                .map(|(k, v)| (k, Value::String(v)))
                .collect(),
        ))
        .ok()
    };

    Some(ParsedExtInf {
        channel: ParsedChannel {
            name: display_name.to_owned(),
            group_title,
            stream_url: String::new(),
            logo_url,
            duration,
            tvg_id,
            tvg_name,
            tvg_chno,
            tvg_language,
            tvg_country,
            tvg_shift,
            tvg_rec,
            tvg_url,
            tvg_extras,
        },
    })
}

pub fn group_default_logo() -> &'static str {
    GROUP_DEFAULT_LOGO
}

fn parse_attributes(input: &str) -> BTreeMap<String, String> {
    let mut out = BTreeMap::new();
    let bytes = input.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        while i < bytes.len() && bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        if i >= bytes.len() {
            break;
        }

        let key_start = i;
        while i < bytes.len() && bytes[i] != b'=' && !bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        let key_end = i;
        while i < bytes.len() && bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        if i >= bytes.len() || bytes[i] != b'=' {
            while i < bytes.len() && !bytes[i].is_ascii_whitespace() {
                i += 1;
            }
            continue;
        }
        i += 1;
        while i < bytes.len() && bytes[i].is_ascii_whitespace() {
            i += 1;
        }

        let value = if i < bytes.len() && bytes[i] == b'"' {
            i += 1;
            let start = i;
            while i < bytes.len() && bytes[i] != b'"' {
                i += 1;
            }
            let end = i.min(bytes.len());
            if i < bytes.len() {
                i += 1;
            }
            String::from_utf8_lossy(&bytes[start..end]).to_string()
        } else {
            let start = i;
            while i < bytes.len() && !bytes[i].is_ascii_whitespace() {
                i += 1;
            }
            String::from_utf8_lossy(&bytes[start..i]).to_string()
        };

        if key_end > key_start {
            let key = String::from_utf8_lossy(&bytes[key_start..key_end]).to_string();
            out.insert(key, value);
        }
    }

    out
}

fn non_empty(value: &str) -> Option<&str> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    }
}

#[cfg(test)]
mod tests {
    use super::parse_extinf_line;

    #[test]
    fn parse_extinf_maps_known_fields_and_extras() {
        let line = r#"#EXTINF:-1 tvg-id="abc" tvg-name="BBC One" tvg-logo="https://logo.png" tvg-chno="101" tvg-language="en" tvg-country="GB" tvg-shift="1.5" tvg-rec="rec" tvg-url="epg" group-title="News" tvg-foo="bar",BBC One HD"#;
        let parsed = parse_extinf_line(line).expect("line should parse");
        let channel = parsed.channel;

        assert_eq!(channel.name, "BBC One HD");
        assert_eq!(channel.duration, -1);
        assert_eq!(channel.group_title, "News");
        assert_eq!(channel.logo_url, "https://logo.png");
        assert_eq!(channel.tvg_id.as_deref(), Some("abc"));
        assert_eq!(channel.tvg_name.as_deref(), Some("BBC One"));
        assert_eq!(channel.tvg_chno, Some(101));
        assert_eq!(channel.tvg_language.as_deref(), Some("en"));
        assert_eq!(channel.tvg_country.as_deref(), Some("GB"));
        assert_eq!(channel.tvg_shift, Some(1.5));
        assert_eq!(channel.tvg_rec.as_deref(), Some("rec"));
        assert_eq!(channel.tvg_url.as_deref(), Some("epg"));
        assert_eq!(channel.tvg_extras.as_deref(), Some(r#"{"tvg-foo":"bar"}"#));
    }

    #[test]
    fn parse_extinf_applies_defaults_and_nullables() {
        let line = r#"#EXTINF:120 tvg-id="" group-title="",Sample Channel"#;
        let parsed = parse_extinf_line(line).expect("line should parse");
        let channel = parsed.channel;

        assert_eq!(channel.name, "Sample Channel");
        assert_eq!(channel.duration, 120);
        assert_eq!(channel.group_title, "Uncategorized");
        assert_eq!(channel.logo_url, "/channel-default.svg");
        assert!(channel.tvg_id.is_none());
        assert!(channel.tvg_extras.is_none());
    }

    #[test]
    fn parse_extinf_rejects_invalid_lines() {
        assert!(parse_extinf_line("not-extinf").is_none());
        assert!(parse_extinf_line("#EXTINF:-1 tvg-id=\"x\"").is_none());
        assert!(parse_extinf_line("#EXTINF:-1, ").is_none());
    }
}
