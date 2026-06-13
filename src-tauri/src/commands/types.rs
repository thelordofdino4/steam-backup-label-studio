#[derive(serde::Serialize)]
pub(crate) struct DownloadedArtwork {
    pub(crate) content_type: String,
    pub(crate) bytes: Vec<u8>,
}

#[derive(serde::Serialize)]
pub(crate) struct FetchedTextDocument {
    pub(crate) final_url: String,
    pub(crate) contents: String,
}
