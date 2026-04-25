use futures_util::StreamExt;

use crate::error::NeptuneError;

#[allow(dead_code)]
pub async fn read_remote_lines<F>(url: &str, mut on_line: F) -> Result<(), NeptuneError>
where
    F: FnMut(String) -> Result<(), NeptuneError>,
{
    let response = reqwest::Client::new().get(url).send().await?;
    if !response.status().is_success() {
        return Err(NeptuneError::InvalidRequest(format!(
            "remote import failed with status {}",
            response.status()
        )));
    }

    let mut stream = response.bytes_stream();
    let mut pending = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        let text = String::from_utf8_lossy(&chunk);
        pending.push_str(&text);

        while let Some(idx) = pending.find('\n') {
            let line = pending[..idx].trim_end_matches('\r').to_owned();
            on_line(line)?;
            pending = pending[idx + 1..].to_owned();
        }
    }

    if !pending.is_empty() {
        on_line(pending.trim_end_matches('\r').to_owned())?;
    }

    Ok(())
}
