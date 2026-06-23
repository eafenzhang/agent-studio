# Agent Studio Desktop

AI Agent 桌面工作台 - 基于 Tauri 2.x + AionCore 后端

## 功能特性

- ✅ 会话管理 - 创建、查看、切换 AI 会话
- ✅ Agent 管理 - 查看可用 Agent，配置参数
- ✅ 文件操作 - 工作区文件浏览、编辑
- ✅ MCP 集成 - MCP 服务器管理、工具调用
- ✅ 实时通信 - WebSocket 实时事件推送

## 技术栈

| 组件 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.x |
| 前端构建 | Vite |
| UI | 纯 HTML/CSS/JS |
| 后端 | AionCore (Rust) |
| 实时通信 | WebSocket |

## 开发环境

### 前置要求

- Node.js 18+
- Rust 1.70+
- AionCore 后端（已编译）

### 安装依赖

```bash
cd agent-studio-desktop
npm install
```

### 启动开发服务器

```bash
# 终端 1: 启动前端开发服务器
npm run dev

# 终端 2: 启动 Tauri 应用
npm run tauri dev
```

### 构建生产版本

```bash
npm run tauri build
```

## 项目结构

```
agent-studio-desktop/
├── src-tauri/                    # Tauri Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       └── backend.rs            # AionCore 进程管理
├── src/                          # 前端源码
│   ├── index.html
│   ├── main.js
│   ├── api.js                    # API 客户端
│   ├── websocket.js              # WebSocket 客户端
│   ├── styles/
│   │   └── main.css
│   └── components/
│       ├── conversations.js
│       ├── agents.js
│       ├── fileBrowser.js
│       └── mcpPanel.js
├── package.json
├── vite.config.js
└── README.md
```

## API 对接

### 后端地址

- REST API: `http://127.0.0.1:25808`
- WebSocket: `ws://127.0.0.1:25808/ws`

### 认证模式

- Local 模式：跳过认证，使用 `system_default_user`

## 打包发布

### Windows

```bash
npm run tauri build
```

产物位置：`src-tauri/target/release/bundle/`

### 打包内容

- `aioncore.exe` - 后端可执行文件
- `data/` - 数据目录
- 前端资源

## 相关链接

- [AionCore 仓库](https://github.com/iOfficeAI/AionCore)
- [Tauri 文档](https://tauri.app/v2/)
