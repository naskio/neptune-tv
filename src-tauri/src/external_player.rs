//! Opens HLS / IPTV stream URLs in an external app. Tries **VLC** first (macOS, Windows, Linux),
//! then falls back to the OS default handler (`tauri-plugin-opener`), which often opens a browser.

use std::process::Command;

#[cfg(target_os = "windows")]
use std::path::PathBuf;

use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

use crate::error::NeptuneError;

pub fn open_stream_in_external_player(app: &AppHandle, stream_url: &str) -> Result<(), NeptuneError> {
    if try_open_vlc(stream_url) {
        return Ok(());
    }
    app.opener()
        .open_url(stream_url, None::<&str>)
        .map_err(|e| NeptuneError::InvalidRequest(e.to_string()))
}

fn try_open_vlc(stream_url: &str) -> bool {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-a", "VLC", stream_url])
            .status()
            .is_ok_and(|s| s.success())
    }
    #[cfg(target_os = "windows")]
    {
        if spawn_vlc_with_url("vlc", stream_url) {
            true
        } else {
            windows_vlc_exe_paths().into_iter().any(|path| {
                path.is_file() && spawn_vlc_with_url(path.to_string_lossy().as_ref(), stream_url)
            })
        }
    }
    #[cfg(target_os = "linux")]
    {
        spawn_vlc_with_url("vlc", stream_url)
            || Command::new("flatpak")
                .args(["run", "org.videolan.VLC", stream_url])
                .spawn()
                .is_ok()
            || Command::new("snap")
                .args(["run", "vlc", "--", stream_url])
                .spawn()
                .is_ok()
    }
    #[cfg(not(any(
        target_os = "macos",
        target_os = "windows",
        target_os = "linux"
    )))]
    {
        let _ = stream_url;
        false
    }
}

#[cfg(any(target_os = "windows", target_os = "linux"))]
fn spawn_vlc_with_url(program: &str, stream_url: &str) -> bool {
    Command::new(program)
        .arg(stream_url)
        .spawn()
        .is_ok()
}

#[cfg(target_os = "windows")]
fn windows_vlc_exe_paths() -> Vec<PathBuf> {
    let mut out = Vec::new();
    if let Ok(root) = std::env::var("ProgramFiles") {
        out.push(
            PathBuf::from(root)
                .join("VideoLAN")
                .join("VLC")
                .join("vlc.exe"),
        );
    }
    if let Ok(root) = std::env::var("ProgramFiles(x86)") {
        out.push(
            PathBuf::from(root)
                .join("VideoLAN")
                .join("VLC")
                .join("vlc.exe"),
        );
    }
    out.push(PathBuf::from(r"C:\Program Files\VideoLAN\VLC\vlc.exe"));
    out.push(PathBuf::from(r"C:\Program Files (x86)\VideoLAN\VLC\vlc.exe"));
    out
}
