use reqwest;
use scraper;
use tempdir::TempDir;
use tokio::fs;

pub async fn get_amazon_img_url(url: &str) -> Result<String, String> {
    let selector = scraper::Selector::parse("img#ebooksImgBlkFront, img#imgBlkFront").unwrap();
    let body = reqwest::get(url)
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;
    let document = scraper::Html::parse_document(&body);
    let img = document.select(&selector).next().ok_or("Image not found")?;

    img.value()
        .attr("src")
        .ok_or("Could not retrieve image URL".to_owned())
        .map(|url| url.to_owned())
}

async fn download_img(img_dir: &TempDir, amazon_url: &str) -> Result<String, String> {
    let img_url = get_amazon_img_url(amazon_url).await?;
    let img = reqwest::get(&img_url).await.map_err(|e| e.to_string())?;

    let img_url = url::Url::parse(&img_url).map_err(|e| e.to_string())?;
    let mut path = img_url
        .path_segments()
        .ok_or("Invalid image URL".to_owned())?;
    let filename = path.next_back().ok_or("Filename not found")?;
    let filepath = img_dir.path().join(filename);

    fs::write(&filepath, img.bytes().await.map_err(|e| e.to_string())?)
        .await
        .map_err(|e| e.to_string())?;

    Ok(filepath.to_string_lossy().to_string())
}

pub mod commands {
    use tauri::State;

    use super::*;

    #[tauri::command]
    pub async fn download_img(
        img_dir: State<'_, TempDir>,
        amazon_url: &str,
    ) -> Result<String, String> {
        super::download_img(&*img_dir, amazon_url).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn long_kindle_url_ok() {
        let url = "https://www.amazon.co.jp/gp/product/B07N3NRSKF?pf_rd_m=AN1VRQENFRJN5&storeType=ebooks&pageType=manga-store&pf_rd_p=2e113e83-cc39-4b92-bd2a-b0ee4c341c16&pf_rd_r=M8X29G7H4BJPVSCW4HP7&pf_rd_s=desktop-center-3&pf_rd_t=&ref_=msw_m_2293143051_rwt_0000_vol_dc3_gr_2293143051_2&pf_rd_i=store-2293143051";
        let image_url = get_amazon_img_url(url).await.unwrap();
        assert!(image_url.starts_with("https://m.media-amazon.com/images/I/51gWu2+kUvL"));
    }

    #[tokio::test]
    async fn short_kindle_url_ok() {
        let url = "https://www.amazon.co.jp/gp/product/B07N3NRSKF";
        let image_url = get_amazon_img_url(url).await.unwrap();
        assert!(image_url.starts_with("https://m.media-amazon.com/images/I/51gWu2+kUvL"));
    }

    #[tokio::test]
    async fn long_book_url_ok() {
        let url= "https://www.amazon.co.jp/%E3%81%BC%E3%81%A3%E3%81%A1%E3%83%BB%E3%81%96%E3%83%BB%E3%82%8D%E3%81%A3%E3%81%8F%EF%BC%81-1-%E3%81%BE%E3%82%93%E3%81%8C%E3%82%BF%E3%82%A4%E3%83%A0KR%E3%82%B3%E3%83%9F%E3%83%83%E3%82%AF%E3%82%B9-%E3%81%AF%E3%81%BE%E3%81%98%E3%81%82%E3%81%8D/dp/4832270729/ref=tmm_other_meta_binding_swatch_0?_encoding=UTF8&qid=&sr=";
        let image_url = get_amazon_img_url(url).await.unwrap();
        assert!(image_url.starts_with("https://m.media-amazon.com/images/I/51WSIfaeliL"));
    }

    #[tokio::test]
    async fn short_book_url_ok() {
        let url = "https://www.amazon.co.jp/dp/4832270729/";
        let image_url = get_amazon_img_url(url).await.unwrap();
        assert!(image_url.starts_with("https://m.media-amazon.com/images/I/51WSIfaeliL"));
    }

    #[tokio::test]
    async fn dl_img() {
        let url = "https://www.amazon.co.jp/gp/product/B07N3NRSKF";
        let dir = TempDir::new("test").unwrap();
        let path = download_img(&dir, &url).await.unwrap();
        assert!(fs::metadata(&path).await.is_ok())
    }
}