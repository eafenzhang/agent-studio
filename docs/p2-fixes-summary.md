# P2 问题修复总结

## 修复概述

本轮针对 QA 回归报告中遗留的 3 个 P2 问题进行了根因修复，并补充了对应测试。所有修改均保持原有 UI 样式与既有接口契约。

---

## 1. 首页下拉菜单点击页面内容区域不关闭

**修改文件**

- `src/hooks/use-dropdown.ts`
- `src/pages/HomePage.tsx`
- `tests/hooks/use-dropdown.test.tsx`（新增）

**修复内容**

- `useDropdown` 已统一在全局 `document` 上监听捕获阶段 `click` 与 `keydown`（Escape）事件；当点击发生在 ref 容器外部或按下 Escape 时关闭当前打开的下拉菜单。
- `HomePage` 将 `dropdown.ref` 从整个 `.page.active` 容器下移到 `.chat-input-toolbar`，使“工具 / 模型 / 模式 / 专家 / 添加”等所有下拉按钮及其菜单被包含在容器内，点击页面其余区域（欢迎区、分类 chips、助手 chips 等）会正确关闭下拉。
- 未引入任何新 Tailwind / MUI 类名，仅使用原有 `original-ui.css` 的类名。

**测试覆盖**

- toggle 打开/关闭同一菜单
- `close()` 关闭已打开菜单
- 点击容器外部关闭
- 点击容器内部不关闭
- 按下 Escape 关闭

---

## 2. 工具调用 / 任务进度刷新后随历史消息丢失

**修改文件**

- `src/types/api.d.ts`
- `src/stores/chat-store.ts`
- `src/pages/ChatPage.tsx`
- `src/components/chat/TaskProgressPanel.tsx`
- `tests/stores/chat-store.test.ts`
- `tests/pages/chat-page.test.tsx`

**修复内容**

- 扩展 `Message` 类型，新增可选字段 `toolCalls?: ToolCall[]` 与 `taskSteps?: TaskStep[]`，与后端持久化字段对齐。
- 修改 `chat-store.ts` 的 `flushMessage`：在停止流式状态的同时，将当前工具调用与任务步骤快照一并返回（`StreamingMessage | undefined`），使 `ChatPage` 能直接拿到完成态消息的全部数据。
- `ChatPage` 中：
  - `LocalMessage` 增加 `toolCalls` / `taskSteps` 字段。
  - 从 `messagesData` 重建 `localMessages` 时，优先使用 API 返回的 `toolCalls` / `taskSteps`；若后端未返回，则保留内存中已有值，避免刷新即丢失。
  - 流式结束（`stream_end`）时，使用 `chatFlushMessage` 返回的已完成消息快照，将工具调用与任务步骤关联到对应消息对象并加入 `localMessages`。
  - 每条历史消息下方持久渲染其 `ToolCallCard`。
- `TaskProgressPanel` 增加可选 `steps` 属性；`ChatPage` 汇总所有历史消息的 `taskSteps` 传入，使任务进度在流式结束后仍可展示。

**测试覆盖**

- `chat-store.test.ts`：验证 `flushMessage` 返回的消息快照包含工具调用与任务步骤。
- `chat-page.test.tsx`：模拟流式结束，验证消息内容、工具调用卡片、任务步骤在结束后继续渲染。

---

## 3. Tauri 后端启动后未轮询 health，仅 sleep 4s

**修改文件**

- `src-tauri/src/backend.rs`
- `src-tauri/src/lib.rs`

**修复内容**

- 启动 `aioncore.exe` 后保存 `Child` 句柄，循环轮询 `http://127.0.0.1:25808/health`：
  - 最大等待约 10 秒（`HEALTH_TIMEOUT = 10s`）
  - 轮询间隔 500ms（`HEALTH_INTERVAL = 500ms`）
  - 单次连接/读取超时 500ms
- 一旦 health 返回 200 OK，立即返回 `Ok(())`。
- 若子进程提前退出，返回 `BackendStartError::ProcessExitedEarly` 并尝试 `kill` 异常子进程。
- 若超时仍未 health，返回 `BackendStartError::HealthCheckTimeout` 并 `kill` 子进程，避免僵尸进程。
- 新增 `BackendStartError` 枚举，实现 `Display` 与 `Error`，错误信息清晰可打印。
- `lib.rs` 在启动失败时通过 `eprintln` 输出，并通过 Tauri 事件 `backend-error` 向前端广播错误，便于前端感知。

**测试覆盖**

- `backend.rs` 单元测试：
  - `check_health_at_port` 成功场景（ mock TCP 服务器返回 200）
  - `check_health_at_port` 失败场景（端口未监听）
  - `BackendStartError` 的 `Display` 输出
- `cargo check` 与 `cargo test --lib` 均通过。

---

## 质量关卡

| 检查项 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | 通过 |
| `npm run build` | 通过 |
| `npm test -- --run` | 通过（216 tests，含新增 7 个） |
| `cargo check` | 通过 |
| `cargo test --lib` | 通过（3 tests） |

原有 209 个前端测试 + 新增 7 个 = 216 个全部通过；Rust 新增 3 个测试全部通过。

---

## 全局一致性审查

- 跨文件导入一致：无缺失导入、无循环依赖。
- 接口契约一致：`chat-store.ts` 的 `flushMessage` 返回类型与 `ChatPage` 调用方一致。
- 数据流一致：`Message` 类型、`LocalMessage`、渲染组件均包含 `toolCalls` / `taskSteps`；`TaskProgressPanel` 可接收外部 steps 或回退到 chatStore 的流式状态。
- 无重复实现：health 检查 `check_health` 复用 `check_health_at_port`，未写两份逻辑。

**IS_PASS: YES**

---

## 修改清单

```
M src/hooks/use-dropdown.ts
M src/pages/HomePage.tsx
M src/types/api.d.ts
M src/stores/chat-store.ts
M src/pages/ChatPage.tsx
M src/components/chat/TaskProgressPanel.tsx
M src-tauri/src/backend.rs
M src-tauri/src/lib.rs
A tests/hooks/use-dropdown.test.tsx
M tests/stores/chat-store.test.ts
M tests/pages/chat-page.test.tsx
A docs/p2-fixes-summary.md
```
