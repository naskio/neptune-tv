//! Prefer **`tauri-plugin-opener`** (OS-resolved app names), then **direct launch** when the opener
//! stack cannot find VLC (e.g. Windows without `PATH`, Flatpak-only Linux).

#[cfg(target_os = "macos")]
use std::path::Path;
use std::process::Command;

use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

use crate::error::NeptuneError;
use crate::events::emit_vlc_fallback;

use super::{is_http_or_https_url, open_default_url, write_vlc_m3u_sidecar};

pub fn try_vlc_then_default(app: &AppHandle, target: &str) -> Result<(), NeptuneError> {
    if launch_vlc_hybrid(app, target) {
        return Ok(());
    }
    emit_vlc_fallback(app);
    open_default_url(app, target)
}

fn launch_vlc_hybrid(app: &AppHandle, target: &str) -> bool {
    if is_http_or_https_url(target) {
        if let Ok(m3u_path) = write_vlc_m3u_sidecar(target) {
            if let Some(p) = m3u_path.to_str() {
                if try_open_vlc(app, VlcOpenTarget::Path(p)) {
                    return true;
                }
            }
        }
    }
    try_open_vlc(app, VlcOpenTarget::Url(target))
}

#[derive(Clone, Copy)]
enum VlcOpenTarget<'a> {
    Url(&'a str),
    Path(&'a str),
}

/// Opener first (same as default-open path), then shell / known install locations.
fn try_open_vlc(app: &AppHandle, target: VlcOpenTarget<'_>) -> bool {
    try_via_opener(app, target) || try_via_shell(target)
}

fn try_via_opener(app: &AppHandle, target: VlcOpenTarget<'_>) -> bool {
    for with in vlc_opener_app_names() {
        let ok = match target {
            VlcOpenTarget::Url(u) => app.opener().open_url(u, Some(*with)).is_ok(),
            VlcOpenTarget::Path(p) => app.opener().open_path(p, Some(*with)).is_ok(),
        };
        if ok {
            return true;
        }
    }
    false
}

/// App names passed to `tauri_plugin_opener::open_url` / `open_path` as `with` — Launch Services / `start` / `PATH`.
fn vlc_opener_app_names() -> &'static [&'static str] {
    #[cfg(target_os = "macos")]
    {
        &["VLC"]
    }
    #[cfg(target_os = "windows")]
    {
        &["vlc"]
    }
    #[cfg(target_os = "linux")]
    {
        &["vlc"]
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        &[]
    }
}

fn try_via_shell(target: VlcOpenTarget<'_>) -> bool {
    let arg = match target {
        VlcOpenTarget::Url(u) => u,
        VlcOpenTarget::Path(p) => p,
    };
    shell_launch_vlc(arg)
}

fn shell_launch_vlc(target: &str) -> bool {
    #[cfg(target_os = "macos")]
    {
        macos_shell_vlc(target)
    }
    #[cfg(target_os = "windows")]
    {
        windows_shell_vlc(target)
    }
    #[cfg(target_os = "linux")]
    {
        linux_shell_vlc(target)
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        let _ = target;
        false
    }
}

#[cfg(target_os = "macos")]
fn macos_shell_vlc(target: &str) -> bool {
    const DEFAULT_VLC_BINARY: &str = "/Applications/VLC.app/Contents/MacOS/VLC";
    if Path::new(DEFAULT_VLC_BINARY).is_file()
        && Command::new(DEFAULT_VLC_BINARY)
            .arg(target)
            .spawn()
            .is_ok()
    {
        return true;
    }
    if Command::new("open")
        .args(["-b", "org.videolan.vlc", target])
        .status()
        .is_ok_and(|s| s.success())
    {
        return true;
    }
    if Command::new("open")
        .args(["-a", "VLC", target])
        .status()
        .is_ok_and(|s| s.success())
    {
        return true;
    }
    Command::new("vlc").arg(target).spawn().is_ok()
}

#[cfg(target_os = "windows")]
fn windows_shell_vlc(target: &str) -> bool {
    if spawn_vlc_with_url("vlc", target) {
        return true;
    }
    windows_vlc_exe_candidates()
        .into_iter()
        .any(|path| path.is_file() && spawn_vlc_with_url(path.to_string_lossy().as_ref(), target))
}

#[cfg(target_os = "windows")]
fn spawn_vlc_with_url(program: &str, stream_url: &str) -> bool {
    Command::new(program).arg(stream_url).spawn().is_ok()
}

#[cfg(target_os = "windows")]
fn windows_vlc_exe_candidates() -> Vec<std::path::PathBuf> {
    use std::path::PathBuf;
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
    out.push(PathBuf::from(
        r"C:\Program Files (x86)\VideoLAN\VLC\vlc.exe",
    ));
    out
}

#[cfg(target_os = "linux")]
fn linux_shell_vlc(target: &str) -> bool {
    spawn_vlc_with_url("vlc", target)
        || Command::new("flatpak")
            .args(["run", "org.videolan.VLC", target])
            .spawn()
            .is_ok()
        || Command::new("snap")
            .args(["run", "vlc", "--", target])
            .spawn()
            .is_ok()
}

#[cfg(target_os = "linux")]
fn spawn_vlc_with_url(program: &str, stream_url: &str) -> bool {
    Command::new(program).arg(stream_url).spawn().is_ok()
}
