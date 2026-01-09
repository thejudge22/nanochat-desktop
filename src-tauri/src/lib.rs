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
    // Test connection by making a minimal request to generate-message endpoint
    // We send an incomplete request that will fail validation server-side,
    // but will confirm the API key is valid (401 vs 400)
    let client = reqwest::Client::new();
    let url = format!("{}/api/generate-message", server_url.trim_end_matches('/'));
    
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .body("{}")  // Empty body - will fail validation but tests auth
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    let status = response.status();
    
    // 400 = Bad Request (auth worked, but missing required fields) = SUCCESS for our test
    // 200 = OK (shouldn't happen with empty body, but would mean success)
    // 401 = Unauthorized (invalid API key)
    // 404 = Not Found (wrong URL)
    
    if status.is_success() || status == 400 {
        Ok(true)
    } else if status == 401 {
        Err("Invalid API key or unauthorized".to_string())
    } else if status == 404 {
        Err("API endpoint not found. Please check your server URL".to_string())
    } else {
        Err(format!("API returned error: {} - {}", status, status.canonical_reason().unwrap_or("Unknown")))
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
