#[derive(Debug, Clone)]
pub struct ParsedChannel {
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
}

#[derive(Debug, Clone)]
pub struct ParsedExtInf {
    pub channel: ParsedChannel,
}
