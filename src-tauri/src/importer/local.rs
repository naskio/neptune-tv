use tokio::{
    fs::File,
    io::{AsyncBufReadExt, BufReader},
};

use crate::error::NeptuneError;

#[allow(dead_code)]
pub async fn read_local_lines<F>(path: &str, mut on_line: F) -> Result<(), NeptuneError>
where
    F: FnMut(String) -> Result<(), NeptuneError>,
{
    let file = File::open(path).await?;
    let mut reader = BufReader::new(file);
    let mut line = String::new();

    loop {
        line.clear();
        let bytes = reader.read_line(&mut line).await?;
        if bytes == 0 {
            break;
        }
        on_line(line.trim_end_matches(['\r', '\n']).to_owned())?;
    }

    Ok(())
}
