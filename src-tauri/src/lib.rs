mod config;

use config::Config;

#[tauri::command]
fn get_config() -> Result<Config, String> {
    Config::load()
}

#[tauri::command]
fn save_config(config: Config) -> Result<(), String> {
    config.save()
}

#[tauri::command]
async fn validate_connection(server_url: String, api_key: String) -> Result<bool, String> {
    // Test connection by trying to fetch conversations
    let client = reqwest::Client::new();
    let url = format!("{}/api/db/conversations", server_url.trim_end_matches('/'));
    
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("API returned error: {} - {}", response.status(), response.status().canonical_reason().unwrap_or("Unknown")))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        get_config,
        save_config,
        validate_connection
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
