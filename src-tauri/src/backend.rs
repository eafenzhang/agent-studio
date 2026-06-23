use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
#[cfg(test)]
use std::net::TcpListener;
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::{Child, Command, ExitStatus, Stdio};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

const CREATE_NO_WINDOW: u32 = 0x08000000;

const BACKEND_PORT: u16 = 25808;
const BACKEND_HOST: &str = "127.0.0.1";
const HEALTH_TIMEOUT: Duration = Duration::from_secs(10);
const HEALTH_INTERVAL: Duration = Duration::from_millis(500);
const HEALTH_CONNECT_TIMEOUT: Duration = Duration::from_millis(500);

/// Errors that can occur while starting the bundled backend process.
#[derive(Debug)]
pub enum BackendStartError {
    ExecutableNotFound(String),
    SpawnFailed(String),
    ProcessExitedEarly(ExitStatus),
    HealthCheckTimeout(String),
}

impl std::fmt::Display for BackendStartError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ExecutableNotFound(msg) => {
                write!(f, "Backend executable not found: {}", msg)
            }
            Self::SpawnFailed(msg) => write!(f, "Failed to spawn backend: {}", msg),
            Self::ProcessExitedEarly(status) => {
                write!(f, "Backend process exited early with status: {}", status)
            }
            Self::HealthCheckTimeout(msg) => {
                write!(f, "Backend health check timed out: {}", msg)
            }
        }
    }
}

impl std::error::Error for BackendStartError {}

/// Check the backend health endpoint on the given port.
fn check_health_at_port(port: u16) -> Result<bool, String> {
    let addr: SocketAddr = format!("{}:{}", BACKEND_HOST, port)
        .parse()
        .map_err(|e| format!("Invalid backend address: {}", e))?;

    let mut stream = TcpStream::connect_timeout(&addr, HEALTH_CONNECT_TIMEOUT)
        .map_err(|e| format!("Failed to connect to backend health endpoint: {}", e))?;
    stream
        .set_read_timeout(Some(HEALTH_CONNECT_TIMEOUT))
        .map_err(|e| format!("Failed to set read timeout: {}", e))?;
    stream
        .set_write_timeout(Some(HEALTH_CONNECT_TIMEOUT))
        .map_err(|e| format!("Failed to set write timeout: {}", e))?;

    let request = format!(
        "GET /health HTTP/1.1\r\nHost: {}:{}\r\nConnection: close\r\n\r\n",
        BACKEND_HOST, port
    );
    stream
        .write_all(request.as_bytes())
        .map_err(|e| format!("Failed to send health request: {}", e))?;

    let mut buf = [0u8; 1024];
    let n = stream
        .read(&mut buf)
        .map_err(|e| format!("Failed to read health response: {}", e))?;
    if n == 0 {
        return Ok(false);
    }
    let resp = String::from_utf8_lossy(&buf[..n]);
    Ok(resp.starts_with("HTTP/1.1 200") || resp.starts_with("HTTP/1.0 200"))
}

/// Check the backend health endpoint on the configured port.
fn check_health() -> Result<bool, String> {
    check_health_at_port(BACKEND_PORT)
}

/// Poll the backend health endpoint until it responds or the timeout is reached.
/// If the child process exits early or the timeout expires, the child is killed.
fn wait_for_health(child: &mut Child) -> Result<(), BackendStartError> {
    let start = Instant::now();
    while start.elapsed() < HEALTH_TIMEOUT {
        match child.try_wait() {
            Ok(Some(status)) => {
                let _ = child.kill();
                return Err(BackendStartError::ProcessExitedEarly(status));
            }
            Ok(None) => match check_health() {
                Ok(true) => return Ok(()),
                Ok(false) => {}
                Err(e) => {
                    if start.elapsed() >= HEALTH_TIMEOUT {
                        let _ = child.kill();
                        return Err(BackendStartError::HealthCheckTimeout(e));
                    }
                }
            },
            Err(e) => {
                let _ = child.kill();
                return Err(BackendStartError::HealthCheckTimeout(e.to_string()));
            }
        }
        std::thread::sleep(HEALTH_INTERVAL);
    }
    let _ = child.kill();
    Err(BackendStartError::HealthCheckTimeout(format!(
        "Backend did not respond to health check within {} seconds",
        HEALTH_TIMEOUT.as_secs()
    )))
}

/// Locate and start the backend executable, then wait for it to become healthy.
pub fn start_backend(app_handle: &AppHandle) -> Result<(), BackendStartError> {
    // 1. Try bundled resource path (installed app)
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| BackendStartError::ExecutableNotFound(e.to_string()))?;
    let bundled = resource_dir.join("aioncore.exe");

    // 2. Try alongside the app exe (portable / unbundled)
    let sidecar = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("aioncore.exe")))
        .unwrap_or_default();

    // 3. Dev fallback
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("backend")
        .join("aioncore.exe");

    let exe = if bundled.exists() {
        bundled
    } else if sidecar.exists() {
        sidecar
    } else if dev.exists() {
        dev
    } else {
        return Err(BackendStartError::ExecutableNotFound(
            "Backend executable (aioncore.exe) not found. Place it next to AgentStudio.exe or in resources/backend/".into(),
        ));
    };

    let data_dir = exe.parent().unwrap().join("data");

    let mut child = Command::new(&exe)
        .arg("--local")
        .arg("--host")
        .arg(BACKEND_HOST)
        .arg("--port")
        .arg(BACKEND_PORT.to_string())
        .arg("--data-dir")
        .arg(&data_dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| BackendStartError::SpawnFailed(e.to_string()))?;

    wait_for_health(&mut child)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::thread;

    fn spawn_mock_health_server(listener: TcpListener) -> thread::JoinHandle<()> {
        thread::spawn(move || {
            if let Ok((mut stream, _)) = listener.accept() {
                let mut buf = [0u8; 1024];
                let _ = stream.read(&mut buf);
                let _ = stream.write_all(
                    b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok",
                );
            }
        })
    }

    #[test]
    fn test_check_health_at_port_success() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        let _server = spawn_mock_health_server(listener);

        // Give the mock server a moment to start.
        thread::sleep(Duration::from_millis(50));
        let result = check_health_at_port(port);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_check_health_at_port_failure() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        drop(listener); // close the listener so the port is unavailable

        let result = check_health_at_port(port);
        assert!(result.is_err());
    }

    #[test]
    fn test_backend_start_error_display() {
        let err = BackendStartError::HealthCheckTimeout("test".into());
        assert!(err.to_string().contains("test"));
    }
}
