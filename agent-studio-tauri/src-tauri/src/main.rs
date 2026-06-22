// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // 启动 AionCore 后端作为 sidecar
            let shell = app.shell();
            let sidecar_command = shell.sidecar("aioncore")
                .expect("failed to create sidecar command")
                .args(["--local"]);
            let (mut _rx, child) = sidecar_command
                .spawn()
                .expect("failed to spawn AionCore sidecar");

            // 保存 child 到 app 状态，退出时清理
            let child_id = child.pid();
            app.manage(ManagedChild { pid: child_id });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // 应用关闭时清理后台进程
                kill_child_processes();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Agent Studio");
}

struct ManagedChild {
    pid: u32,
}

fn kill_child_processes() {
    // 使用 taskkill 终止 sidecar 进程及其子进程
    let _ = std::process::Command::new("taskkill")
        .args(["/F", "/IM", "aioncore.exe"])
        .output();
    let _ = std::process::Command::new("taskkill")
        .args(["/F", "/IM", "aionrs.exe"])
        .output();
    // 清理残余的 Hermes/OpenCode 进程
    let _ = std::process::Command::new("taskkill")
        .args(["/F", "/IM", "hermes.exe"])
        .output();
}
