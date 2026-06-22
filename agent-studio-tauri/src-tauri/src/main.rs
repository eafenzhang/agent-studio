// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // 启动 AionCore 后端作为 sidecar
            let shell = app.shell();
            let sidecar_command = shell.sidecar("aioncore")
                .expect("failed to create sidecar command")
                .args(["--local"]);
            let (mut _rx, _child) = sidecar_command
                .spawn()
                .expect("failed to spawn AionCore sidecar");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Agent Studio");
}
