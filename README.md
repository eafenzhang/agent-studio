# Agent Studio Desktop

AI Agent 桌面工作台 — 基于 Tauri 2.x + AionCore 后端，React + TypeScript 前端。

## 功能特性

### 对话系统
- ✅ **会话管理** — 创建、查看、切换 AI 会话，按时间分组
- ✅ **实时流式通信** — WebSocket `message.stream` 协议，支持多轮 agent 续写
- ✅ **消息操作** — 复制、重新生成、编辑（修改后重发）、删除
- ✅ **对话重命名** — 双击列表项、右键菜单、或点击标题栏
- ✅ **自动标题** — 首次 AI 回复后自动以首条消息命名（1s 防抖）
- ✅ **对话重置** — 清除 AI 上下文但保留消息记录
- ✅ **Tab 切换** — 多对话标签页，可点击切换和关闭
- ✅ **会话搜索** — 支持服务端全文搜索

### AI 内容渲染
- ✅ **Markdown 渲染** — 标题、列表、表格、引用等 GFM 语法
- ✅ **代码高亮** — highlight.js 支持 190+ 语言，30+ 行自动折叠
- ✅ **Mermaid 图表** — 动态加载渲染流程图、时序图、甘特图等
- ✅ **HTML 预览** — AI 生成的 HTML 文档可通过 iframe 沙箱预览
- ✅ **图片灯箱** — 点击消息中的图片全屏查看
- ✅ **思维链显示** — Agent 推理过程可折叠展示
- ✅ **工具调用卡片** — 工具调用的参数/结果可展开查看，120s 超时自动标记错误
- ✅ **任务进度面板** — AI 规划步骤实时展示进度条，可交互切换步骤状态

### 工具与集成
- ✅ **MCP 服务器管理** — 添加/编辑/删除 MCP 服务器，配置命令/参数/环境变量
- ✅ **技能管理** — 查看已安装技能，切换启用/禁用
- ✅ **模型提供商管理** — 配置 OpenAI/Anthropic 兼容 API（DeepSeek、Qwen、GLM 等）
- ✅ **文件上传** — 从本地选择文件/图片，经后端写入工作区后发送
- ✅ **文件浏览器** — 浏览工作区目录树，查看/编辑文件内容（带保存）
- ✅ **产物管理** — 查看 AI 生成的产物列表，支持类型筛选和内容预览

### 应用管理
- ✅ **专家列表** — 浏览内置和自定义 AI 助手，按类别筛选
- ✅ **项目管理** — 创建/编辑/删除项目，支持 API 和本地双模式
- ✅ **记忆管理** — 查看和删除 AI 持久化记忆条目
- ✅ **系统设置** — 主题切换（浅色/深色/自动）、语言（中文/English）、快捷键配置
- ✅ **版本检查** — 实时显示版本号，从 GitHub 检测更新
- ✅ **连接状态** — 顶栏实时显示后端 WebSocket 连接状态

## 技术栈

| 组件 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.x |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| 状态管理 | Zustand + React Query |
| UI 样式 | Tailwind CSS + CSS Variables |
| 国际化 | i18next (中文/English) |
| 后端 | AionCore (Rust) |
| 实时通信 | WebSocket |
| E2E 测试 | Playwright (30 个测试) |

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
├── src/                          # 前端源码 (React + TypeScript)
│   ├── main.tsx                  # React 入口
│   ├── App.tsx                   # 路由配置
│   ├── components/
│   │   ├── chat/                 # 聊天组件
│   │   │   ├── ChatInputPanel.tsx    # 输入面板（模式/模型/工具/文件选择）
│   │   │   ├── MessageBubble.tsx     # 消息气泡（Markdown/Mermaid/HTML 渲染）
│   │   │   ├── TaskProgressPanel.tsx # 任务进度面板
│   │   │   ├── ThinkingBlock.tsx     # AI 思维链显示
│   │   │   └── ToolCallCard.tsx      # 工具调用卡片
│   │   ├── layout/               # 布局组件
│   │   ├── sidebar/              # 侧边栏组件
│   │   └── ui/                   # 通用 UI 组件
│   ├── pages/                    # 页面
│   │   ├── HomePage.tsx          # 首页（欢迎页 + 快速入口）
│   │   ├── ChatPage.tsx          # 对话详情页
│   │   ├── SettingsPage.tsx      # 系统设置页
│   │   ├── ExpertsPage.tsx       # 专家列表页
│   │   ├── ToolsPage.tsx         # 工具管理页（MCP + 技能）
│   │   ├── ArtifactsPage.tsx     # 产物管理页
│   │   ├── ProjectsPage.tsx      # 项目管理页
│   │   └── FilesPage.tsx         # 文件浏览器页
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── use-api.ts            # React Query hooks
│   │   └── use-conversation-stream.ts  # WS 流式通信核心
│   ├── stores/                   # Zustand 状态管理
│   │   ├── ui-store.ts           # UI 状态（localStorage 持久化）
│   │   ├── chat-store.ts         # 流式消息（sessionStorage 持久化）
│   │   └── task-store.ts         # 任务步骤（localStorage 持久化）
│   ├── lib/                      # 核心库
│   │   ├── api.ts                # REST API 客户端
│   │   ├── websocket.ts          # WebSocket 客户端
│   │   ├── ws-events.ts          # WS 事件类型和提取器
│   │   └── tools.ts              # 工具分类共享逻辑
│   ├── styles/                   # 样式文件
│   ├── i18n/                     # 国际化
│   └── types/                    # TypeScript 类型定义
├── tests/                        # 测试
│   └── e2e/                      # Playwright E2E 测试（30 个）
├── package.json
├── vite.config.ts
├── tsconfig.json
├── playwright.config.ts
└── README.md
```

## API 对接

### 后端地址

- REST API: `http://127.0.0.1:25808`
- WebSocket: `ws://127.0.0.1:25808/ws`

### 认证模式

- Local 模式：跳过认证，使用 `system_default_user`

## 开发环境

### 前置要求

- Node.js 18+
- Rust 1.70+
- AionCore 后端（已编译，位于 `src-tauri/backend/aioncore.exe`）

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
# 终端 1: 启动前端开发服务器
npm run dev

# 终端 2: 启动 Tauri 应用（自动启动后端 + 前端）
npm run tauri dev
```

### 运行测试

```bash
# 运行 E2E 测试（自动启动 dev server）
npx playwright test

# 查看测试报告
npx playwright show-report
```

### 构建生产版本

```bash
npm run tauri build
```

产物位置：`src-tauri/target/release/bundle/`

## 相关链接

- [AionCore 仓库](https://github.com/iOfficeAI/AionCore)
- [Tauri 文档](https://tauri.app/v2/)
