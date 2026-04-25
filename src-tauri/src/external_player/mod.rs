//! Opens stream URLs in an external app. Tries **VLC** first when the URL looks like something
//! browsers and generic URL handlers often handle poorly: **HLS** (m3u8), **DASH** (.mpd), **M3U
//! playlists** (`.m3u` that is not `.m3u8`), and **stream protocols** (`rtsp:`, `rtmp:`, `srt:`, etc.).
//! For `http`/`https` where the URL string alone is **not** enough to prefer VLC (see
//! [`should_try_vlc`]), a single **GET** with `Range: bytes=0-1023` (the same class of request
//! browsers use) runs—there is no fast-path skip in that case. The probe follows redirects, reads
//! `Content-Type` and the final URL, and only a small body prefix is read. For `http`/`https` the long URL
//! can be written to a one-line **M3U sidecar** in the temp directory. Non-HTTP(S) streams use the
//! URL on the command line only. **VLC** uses **`tauri-plugin-opener`** first (OS-resolved app
//! names), then **shell fallbacks** (bundle id / standard install paths / Flatpak / Snap) when the
//! opener stack cannot start VLC. If every attempt fails, the app opens with the default handler
//! and emits `playback:vlc-fallback` so the UI can toast.

mod vlc_launch;

use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::Duration;

use futures_util::StreamExt;

use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use url::Position;
use url::Url;

use crate::error::NeptuneError;

/// Opens the stream. Resolves `http`/`https` entry URLs that redirect to manifests when needed.
pub async fn open_stream_in_external_player(
    app: &AppHandle,
    stream_url: &str,
) -> Result<(), NeptuneError> {
    let url = stream_url.trim();
    if url.is_empty() {
        return Err(NeptuneError::InvalidRequest("empty stream URL".to_string()));
    }

    if is_http_or_https_url(url) {
        if should_try_vlc(url) {
            // Fast path: clear manifest shape — no HTTP probe.
            return vlc_launch::try_vlc_then_default(app, url);
        }
        return match probe_http_for_vlc(http_probe_client(), url).await {
            None => {
                // GET probe failed (timeout, non-2xx, etc.) — conservative: default app only, original URL.
                open_default_url(app, url)
            }
            Some(ProbeResult::NoVlc) => open_default_url(app, url),
            Some(ProbeResult::Vlc { target }) => vlc_launch::try_vlc_then_default(app, &target),
        };
    }

    if let Some(path) = local_path_for_vlc_check(url) {
        if should_try_vlc_for_local_path(&path)? {
            return vlc_launch::try_vlc_then_default(app, url);
        }
        return open_default_url(app, url);
    }

    if should_try_vlc(url) {
        vlc_launch::try_vlc_then_default(app, url)
    } else {
        open_default_url(app, url)
    }
}

fn http_probe_client() -> &'static reqwest::Client {
    static HTTP: OnceLock<reqwest::Client> = OnceLock::new();
    HTTP.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(3))
            .connect_timeout(Duration::from_secs(2))
            .user_agent(concat!("NeptuneTV/", env!("CARGO_PKG_VERSION")))
            .build()
            .expect("neptune-tv: reqwest client for GET playback probe")
    })
}

/// Result of a successful **2xx** (or **206** partial) **GET** after redirects. `Vlc` carries the final URL for VLC.
#[derive(Debug, PartialEq, Eq)]
enum ProbeResult {
    /// Open with the **original** URL in the default handler.
    NoVlc,
    /// Open with the given URL, preferring VLC (often the effective post-redirect URL).
    Vlc { target: String },
}

/// **Single** probe: `GET` with a small `Range` (like a browser fetch, widely supported, follows redirects).
/// `None` = probe failed; caller opens the original with the default app only.
async fn probe_http_for_vlc(client: &reqwest::Client, original: &str) -> Option<ProbeResult> {
    const RANGE: &str = "bytes=0-1023";
    const MAX_BODY_DRAIN: usize = 32 * 1024;

    let resp = client
        .get(original)
        .header("Range", RANGE)
        .send()
        .await
        .ok()?;
    if !resp.status().is_success() {
        return None;
    }
    if let Some(cl) = resp.content_length() {
        if cl > 512 * 1024 {
            return None;
        }
    }
    let effective = resp.url().as_str().to_string();
    let ct = response_content_type_from_headers(resp.headers());
    let out = http_probe_merge_result(&effective, &ct);
    drop_body_from_probe_response_limited(resp, MAX_BODY_DRAIN).await;
    Some(out)
}

fn response_content_type_from_headers(headers: &reqwest::header::HeaderMap) -> String {
    headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string()
}

/// Consume up to `max_bytes` of the body so the connection can return to the pool; headers already read.
async fn drop_body_from_probe_response_limited(resp: reqwest::Response, max_bytes: usize) {
    if max_bytes == 0 {
        return;
    }
    if let Some(0) = resp.content_length() {
        return;
    }
    let mut stream = resp.bytes_stream();
    let mut got = 0usize;
    while let Some(item) = stream.next().await {
        match item {
            Ok(b) => {
                got += b.len();
                if got >= max_bytes {
                    break;
                }
            }
            Err(_) => break,
        }
    }
}

/// Merge final URL + `Content-Type` from a successful GET probe — see `open_logic` tests in this file.
/// When this returns `Vlc { target }`, the caller opens that string with VLC; when `NoVlc`, the **original** entry URL
/// is passed to the default app only.
fn http_probe_merge_result(effective_url: &str, content_type: &str) -> ProbeResult {
    match vlc_preference_from_content_type(content_type) {
        Some(false) => ProbeResult::NoVlc,
        Some(true) => ProbeResult::Vlc {
            target: effective_url.to_string(),
        },
        None => {
            if should_try_vlc(effective_url) {
                ProbeResult::Vlc {
                    target: effective_url.to_string(),
                }
            } else {
                ProbeResult::NoVlc
            }
        }
    }
}

/// `Some(true)` = prefer VLC, `Some(false)` = do not, `None` = inconclusive (use URL heuristics on the effective URL).
fn vlc_preference_from_content_type(content_type: &str) -> Option<bool> {
    let ct = content_type
        .split(';')
        .next()
        .unwrap_or("")
        .trim()
        .to_ascii_lowercase();
    if ct.is_empty() {
        return None;
    }
    if ct == "text/html" {
        return Some(false);
    }
    if ct.starts_with("video/") {
        return Some(false);
    }
    if is_manifest_content_type(&ct) {
        return Some(true);
    }
    if ct == "text/plain" || ct == "application/octet-stream" {
        return None;
    }
    None
}

fn is_manifest_content_type(ct: &str) -> bool {
    matches!(
        ct,
        "application/vnd.apple.mpegurl"
            | "application/x-mpegurl"
            | "application/mpegurl"
            | "audio/mpegurl"
            | "audio/x-mpegurl"
    ) || ct == "application/dash+xml"
        || ct == "application/vnd.ms-sstr+xml"
}

fn open_default_url(app: &AppHandle, target: &str) -> Result<(), NeptuneError> {
    app.opener()
        .open_url(target, None::<&str>)
        .map_err(|e| NeptuneError::InvalidRequest(e.to_string()))
}

/// `file:` and bare absolute filesystem paths, for local classification.
fn local_path_for_vlc_check(s: &str) -> Option<PathBuf> {
    if let Ok(u) = Url::parse(s) {
        if u.scheme() == "file" {
            return u.to_file_path().ok();
        }
    }
    if is_plausible_bare_file_path(s) {
        return Some(PathBuf::from(s));
    }
    None
}

fn is_plausible_bare_file_path(s: &str) -> bool {
    if s.contains("://") {
        return false;
    }
    if cfg!(windows) {
        let b = s.as_bytes();
        if s.starts_with("\\\\?\\") {
            return b.len() > 4;
        }
        b.len() >= 3
            && b[0].is_ascii_alphabetic()
            && b[1] == b':'
            && (b[2] == b'\\' || b[2] == b'/')
    } else {
        s.starts_with('/') && !s.starts_with("//")
    }
}

/// Extension + small-file sniff: HLS (includes `#EXT-X-`) or EXTM3U+EXTINF playlist.
fn should_try_vlc_for_local_path(path: &Path) -> Result<bool, std::io::Error> {
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        match ext.to_ascii_lowercase().as_str() {
            "m3u8" | "m3u" | "mpd" => return Ok(true),
            _ => {}
        }
    }
    if path.is_file() && file_sniff_looks_like_hls_or_channel_m3u(path)? {
        return Ok(true);
    }
    Ok(false)
}

fn file_sniff_looks_like_hls_or_channel_m3u(path: &Path) -> std::io::Result<bool> {
    use std::io::Read;
    let mut f = std::fs::File::open(path)?;
    let mut buf = [0u8; 512];
    let n = f.read(&mut buf)?;
    let Some(s) = std::str::from_utf8(&buf[..n]).ok() else {
        return Ok(false);
    };
    if !s.contains("#EXTM3U") {
        return Ok(false);
    }
    if s.contains("#EXT-X-") {
        return Ok(true);
    }
    Ok(s.contains("#EXTINF"))
}

fn is_http_or_https_url(url: &str) -> bool {
    let lower = url.to_ascii_lowercase();
    lower.starts_with("http://") || lower.starts_with("https://")
}

/// UTF-8 M3U with a single stream URL — VLC follows the same code path as opening a remote `.m3u8`.
fn write_vlc_m3u_sidecar(original_url: &str) -> std::io::Result<PathBuf> {
    let name = format!(
        "neptune-tv-{}-{}.m3u",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );
    let path = std::env::temp_dir().join(name);
    let content = format!("#EXTM3U\n#EXTINF:-1,Neptune TV\n{original_url}\n");
    std::fs::write(&path, content)?;
    Ok(path)
}

/// Returns `true` when a dedicated player like VLC is a good first choice. Generic `http`/`https`
/// pages, MP4, etc. are left to the system default. Manifest-style tokens (`m3u8`, classic `.m3u`,
/// `.mpd`, common boundary needles) are matched on **path, query, and fragment only**, not the
/// hostname, so a host like `m3u8.example.com` does not alone imply VLC.
fn should_try_vlc(url: &str) -> bool {
    let t = url.trim();
    if t.is_empty() {
        return false;
    }

    if let Some((scheme, _)) = t.split_once("://") {
        if !scheme.is_empty() && stream_scheme_prefers_vlc(scheme) {
            return true;
        }
    }

    let lower = t.to_ascii_lowercase();
    match Url::parse(&lower) {
        Ok(u) => url_manifest_shape_from_parsed(&u),
        Err(_) if lower.contains("://") => url_manifest_shape_hierarchical_unparsed(&lower),
        Err(_) => url_manifest_shape_schemeless(&lower),
    }
}

/// Parsed URL: path / query / fragment (excluding authority) — single place for HLS / DASH / M3U hints.
fn url_manifest_shape_from_parsed(u: &Url) -> bool {
    let path = u.path();
    if path_suggests_http_like_manifest_path(path) {
        return true;
    }

    // From first `/`, `?`, or `#` after the authority (excludes `user:pass@host:port`).
    let after_host = &u[Position::BeforePath..];
    let al = after_host.to_ascii_lowercase();
    if al.contains("m3u8") {
        return true;
    }
    for needle in [".m3u?", ".m3u&", ".m3u#", ".mpd?", ".mpd&", ".mpd#"] {
        if al.contains(needle) {
            return true;
        }
    }
    false
}

/// Path only (lowercased in caller): HLS, DASH, or classic M3U by extension, including `.m3u8` in
/// a non-terminal segment (e.g. some CDN path shapes).
fn path_suggests_http_like_manifest_path(path: &str) -> bool {
    let p = path.to_ascii_lowercase();
    if p.ends_with(".m3u8") || p.ends_with(".mpd") {
        return true;
    }
    if p.ends_with(".m3u") {
        return true;
    }
    p.contains(".m3u8")
}

/// Unparseable URL that still has `://` (very rare) — best-effort: same rules on the substring
/// after the authority, without false positives on the host label.
fn url_manifest_shape_hierarchical_unparsed(url_lower: &str) -> bool {
    let after_scheme = url_lower
        .split_once("://")
        .map(|(_, rest)| rest)
        .unwrap_or(url_lower);
    let start = after_scheme
        .char_indices()
        .find_map(|(i, c)| matches!(c, '/' | '?' | '#').then_some(i))
        .unwrap_or(after_scheme.len());
    let after_host = &after_scheme[start..];
    if after_host.is_empty() {
        return false;
    }
    if after_host.contains("m3u8") {
        return true;
    }
    for needle in [".m3u?", ".m3u&", ".m3u#", ".mpd?", ".mpd&", ".mpd#"] {
        if after_host.contains(needle) {
            return true;
        }
    }
    let path_part = after_host
        .split('?')
        .next()
        .unwrap_or("")
        .split('#')
        .next()
        .unwrap_or("");
    path_suggests_http_like_manifest_path(path_part)
}

/// No `scheme://` (relative path, filename, or non-URL string) — file-extension and needle heuristics.
fn url_manifest_shape_schemeless(s: &str) -> bool {
    if path_suggests_http_like_manifest_path(s) {
        return true;
    }
    if s.contains("m3u8") {
        return true;
    }
    for needle in [".m3u?", ".m3u&", ".m3u#", ".mpd?", ".mpd&", ".mpd#"] {
        if s.contains(needle) {
            return true;
        }
    }
    false
}

fn stream_scheme_prefers_vlc(scheme: &str) -> bool {
    const SCHEMES: &[&str] = &[
        "rtsp", "rtsps", "rtmp", "rtmps", "mms", "mmsh", "mmsu", "mmst", "udp", "rtp", "srt",
        "rist",
    ];
    SCHEMES.iter().any(|&c| scheme.eq_ignore_ascii_case(c))
}

#[cfg(test)]
mod should_try_vlc_tests {
    use super::should_try_vlc;

    #[test]
    fn hls_path_or_query() {
        assert!(should_try_vlc("https://c/a/index.m3u8"));
        assert!(should_try_vlc("https://c/a?f=m3u8"));
    }

    #[test]
    fn m3u_playlist() {
        assert!(should_try_vlc("https://c/channels.m3u?token=1"));
    }

    #[test]
    fn mp4_uses_default_handler() {
        assert!(!should_try_vlc("https://example.com/v.mp4"));
    }

    #[test]
    fn dash_manifest() {
        assert!(should_try_vlc("https://c/live.mpd?foo=1"));
    }

    #[test]
    fn non_http_schemes() {
        assert!(should_try_vlc("rtsp://192.168.0.1/stream"));
        assert!(should_try_vlc("RTMP://push.example/live"));
        assert!(should_try_vlc("srt://0.0.0.0:1234"));
    }

    #[test]
    fn m3u_not_m3u8_ends() {
        assert!(should_try_vlc("https://a/b/playlist.m3u"));
    }

    /// Long MediaTailor-style HLS master URL (path includes `playlist.m3u8` + long query string).
    #[test]
    fn aws_mediatailor_playlist_m3u8() {
        let url = "https://656cbf39ac7d4ee3a0bad01442e59415.mediatailor.us-east-1.amazonaws.com/v1/master/44f73ba4d03e9607dcd9bebdcb8494d86964f1d8/Samsung-fr_PeopleAreAwesome/playlist.m3u8?ads.wurl_channel=386&ads.coppa=0";
        assert!(should_try_vlc(url));
    }

    /// CloudFront path ending in `.m3u8` (long query; classification uses the path from the parsed URL).
    #[test]
    fn cloudfront_rmc_m3u8_path() {
        let url = "https://d171yrj5ba7twq.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/pb-c5al169c4n0ck/RMC_Story_FR.m3u8?ads.ads_cdn=cf&ads.service_id=FRBD41000097I";
        assert!(should_try_vlc(url));
    }

    #[test]
    fn m3u8_in_hostname_does_not_force_vlc() {
        assert!(!should_try_vlc("https://m3u8.cdns.com/movie.mp4"));
    }

    #[test]
    fn schemeless_m3u8_filename() {
        assert!(should_try_vlc("my_channel.m3u8"));
    }
}

#[cfg(test)]
mod content_type_preference_tests {
    use super::vlc_preference_from_content_type;

    #[test]
    fn html_is_no_vlc() {
        assert_eq!(Some(false), vlc_preference_from_content_type("text/html"));
    }

    #[test]
    fn video_is_no_vlc() {
        assert_eq!(Some(false), vlc_preference_from_content_type("video/mp4"));
    }

    #[test]
    fn apple_mpegurl_is_vlc() {
        assert_eq!(
            Some(true),
            vlc_preference_from_content_type("application/vnd.apple.mpegurl")
        );
    }

    #[test]
    fn octet_stream_inconclusive() {
        assert_eq!(
            None,
            vlc_preference_from_content_type("application/octet-stream")
        );
    }

    #[test]
    fn ct_with_params() {
        assert_eq!(
            Some(false),
            vlc_preference_from_content_type("text/html; charset=utf-8")
        );
    }

    #[test]
    fn smooth_streaming_manifest_is_vlc() {
        assert_eq!(
            Some(true),
            vlc_preference_from_content_type("application/vnd.ms-sstr+xml")
        );
    }
}

#[cfg(test)]
mod local_path_tests {
    use std::io::Write;

    use super::{local_path_for_vlc_check, should_try_vlc_for_local_path};

    #[test]
    fn bare_path_m3u8() {
        let mut tmp = std::env::temp_dir();
        tmp.push(format!("neptune-vlc-test-{}.m3u8", std::process::id()));
        let _ = std::fs::File::create(&tmp).and_then(|mut f| f.write_all(b"#EXTM3U\n"));
        let s = tmp.to_string_lossy();
        if let Some(p) = local_path_for_vlc_check(&s) {
            assert!(should_try_vlc_for_local_path(&p).expect("ok"));
        }
        let _ = std::fs::remove_file(&tmp);
    }

    #[test]
    fn sniff_hls() {
        let mut tmp = std::env::temp_dir();
        tmp.push(format!("neptune-vlc-sniff-{}.ts", std::process::id()));
        let mut f = std::fs::File::create(&tmp).expect("create");
        f.write_all(b"#EXTM3U\n#EXT-X-VERSION:3\n").expect("write");
        drop(f);
        if let Some(p) = local_path_for_vlc_check(&tmp.to_string_lossy()) {
            assert!(should_try_vlc_for_local_path(&p).expect("ok"));
        }
        let _ = std::fs::remove_file(&tmp);
    }
}

/// **Contributor reference:** fast path (no HTTP), ambiguous `https` (single `GET` with `Range` probe), and
/// [`http_probe_merge_result`] (final URL + `Content-Type`). See [`open_stream_in_external_player`].
#[cfg(test)]
mod open_logic_tests {
    use super::{
        http_probe_merge_result, is_http_or_https_url, is_plausible_bare_file_path,
        local_path_for_vlc_check, should_try_vlc, ProbeResult,
    };

    /// For `http`/`https` only: fast path skips the network; otherwise one `GET` with `Range` (see `probe_http_for_vlc`).
    fn first_step_for_https(url: &str) -> &'static str {
        if !is_http_or_https_url(url) {
            return "not_http";
        }
        if should_try_vlc(url) {
            "fast_path_vlc_no_network"
        } else {
            "get_range_probe_required"
        }
    }

    #[test]
    fn https_clear_manifest_skips_network_probe() {
        let u = "https://cdn.example/live/playlist.m3u8";
        assert_eq!(first_step_for_https(u), "fast_path_vlc_no_network");
    }

    /// Short link / portal — one **GET** `Range` probe follows redirects to the manifest `Content-Type`.
    #[test]
    fn https_ambiguous_portal_runs_get_range_probe() {
        let u = "https://go.example.com/r/abc123";
        assert_eq!(first_step_for_https(u), "get_range_probe_required");
    }

    #[test]
    fn https_mp4_url_is_not_fast_vlc() {
        let u = "https://streams.example.com/movie.mp4";
        assert_eq!(first_step_for_https(u), "get_range_probe_required");
    }

    #[test]
    fn rtsp_is_not_https_routing() {
        assert_eq!(first_step_for_https("rtsp://192.168.1.1/live"), "not_http");
        assert!(should_try_vlc("rtsp://192.168.1.1/live"));
    }

    #[test]
    fn local_path_detection_file_url() {
        let p = if cfg!(windows) {
            local_path_for_vlc_check("file:///C:/Temp/neptune-test.m3u8")
        } else {
            local_path_for_vlc_check("file:///tmp/neptune-test.m3u8")
        };
        assert!(p.is_some());
        assert!(p
            .unwrap()
            .as_os_str()
            .to_string_lossy()
            .to_ascii_lowercase()
            .contains("neptune-test.m3u8"));
    }

    #[test]
    fn bare_path_plausible_on_this_os() {
        if cfg!(windows) {
            assert!(is_plausible_bare_file_path(r"C:\Users\dev\list.m3u"));
        } else {
            assert!(is_plausible_bare_file_path("/home/user/list.m3u"));
        }
    }

    #[test]
    fn probe_merge_ct_html_never_vlc_even_if_effective_m3u8() {
        // Deliberately weird: effective path looks like HLS, but server said HTML (login page, etc.).
        let r = http_probe_merge_result("https://origin.example/video/master.m3u8", "text/html");
        assert_eq!(r, ProbeResult::NoVlc);
    }

    #[test]
    fn probe_merge_ct_apple_mpegurl_vlc_with_effective() {
        let eff = "https://cdn.example/out/hls.m3u8";
        let r = http_probe_merge_result(eff, "application/vnd.apple.mpegurl");
        assert_eq!(
            r,
            ProbeResult::Vlc {
                target: eff.to_string()
            }
        );
    }

    #[test]
    fn probe_merge_ct_octet_stream_uses_effective_url_heuristic() {
        // Inconclusive CT: fall back to `should_try_vlc(effective_url)` — e.g. after 302 to a real manifest path.
        let eff = "https://edge.example/v1/index.m3u8?token=1";
        let r = http_probe_merge_result(eff, "application/octet-stream");
        assert_eq!(
            r,
            ProbeResult::Vlc {
                target: eff.to_string()
            }
        );
    }

    #[test]
    fn probe_merge_ct_octet_stream_plain_mp4_path_no_vlc() {
        let eff = "https://edge.example/asset.mp4";
        let r = http_probe_merge_result(eff, "application/octet-stream");
        assert_eq!(r, ProbeResult::NoVlc);
    }

    #[test]
    fn probe_merge_ct_video_mp4_no_vlc() {
        let r = http_probe_merge_result("https://x.test/real.mp4", "video/mp4; codecs=avc1");
        assert_eq!(r, ProbeResult::NoVlc);
    }

    #[test]
    fn probe_merge_dash_xml_vlc() {
        let eff = "https://dash.example/manifest.mpd";
        let r = http_probe_merge_result(eff, "application/dash+xml");
        assert_eq!(
            r,
            ProbeResult::Vlc {
                target: eff.to_string()
            }
        );
    }

    #[test]
    fn probe_merge_smooth_streaming_xml_vlc() {
        let eff = "https://ms.example/QualityLevels(1280000)/Manifest";
        let r = http_probe_merge_result(eff, "application/vnd.ms-sstr+xml; charset=utf-8");
        assert_eq!(
            r,
            ProbeResult::Vlc {
                target: eff.to_string()
            }
        );
    }

    #[test]
    fn probe_merge_text_plain_inconclusive_without_manifest_path() {
        let eff = "https://x.test/notes.txt";
        let r = http_probe_merge_result(eff, "text/plain");
        assert_eq!(r, ProbeResult::NoVlc);
    }
}
