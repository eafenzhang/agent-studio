# Agent Studio Desktop — 回归测试报告

**日期**：2026-06-21  
**项目路径**：`D:\Agent Studio\agent-studio-desktop`  
**任务**：修复后的回归验证（QA 报告 #3）

---

## 一、基线验证（全部通过）

| 检查项 | 命令 | 结果 | 备注 |
|--------|------|------|------|
| 类型检查 | `npx tsc --noEmit` | ✅ 0 errors | 无类型错误 |
| 生产构建 | `npm run build` | ✅ 成功 | 792 模块转换成功，`dist/` 输出正常；有一个 chunk size warning（见下方） |
| 单元测试 | `npm test` | ✅ 209 / 209 passed | 14 个测试文件全部通过 |

---

## 二、测试覆盖统计

| 测试分类 | 文件数 | 用例数 | 说明 |
|----------|--------|--------|------|
| 原有测试 | 8 | 175 | `state`、`utils`、`api`、`chat-service`、`ws-events`、`app-chips`、`use-streaming`、`ui-store` |
| 新增测试 | 6 | 34 | `home-page.test.tsx`、`chat-page.test.tsx`、`settings-page.test.tsx`、`use-api.test.ts`、`chat-store.test.ts`、`websocket.test.ts` |
| **合计** | **14** | **209** | 全部通过 |

新增测试重点覆盖了主流程：

- **HomePage**：发送时携带 `model` / `mode` / `assistant_id` / `tools`，后端未连接时拦截。
- **ChatPage**：发送消息、WebSocket 监听、工具调用卡片渲染、任务进度面板渲染。
- **SettingsPage**：关闭按钮导航、模型列表与弹窗、通用设置 `updateSettings` 调用、记忆条目展示。
- **use-api**：对话、模型、记忆、项目等 hooks 调用后端 API。
- **chat-store**：流式消息、工具调用、任务步骤的增删改查。
- **websocket**：连接、消息解析、事件订阅/取消、异常重连。

---

## 三、P1 问题回归验证

### 1. 首页发送请求携带模型 / 模式 / 专家 / 工具 ✅
- **位置**：`src/pages/HomePage.tsx:209-257`（`handleSend`）
- **验证**：`tests/pages/home-page.test.tsx:66-103` 断言 `mockSendMessage` 收到的 payload 包含 `model='deepseek-chat'`、`mode='规划'`、`assistant_id='a1'`、`tools=['文件读取']`。
- **结论**：已修复，根因正确（在 `sendMessage` 前组装 payload 并同步更新 `SendMessagePayload` 类型）。

### 2. 聊天页渲染工具调用卡片 ✅
- **位置**：`src/pages/ChatPage.tsx:13-14`、`src/pages/ChatPage.tsx:646-657`、`src/components/chat/ToolCallCard.tsx:31-107`
- **验证**：`tests/pages/chat-page.test.tsx:107-124` 在 `chat-store` 中设置 `toolCalls` 后断言 `read_file` 与 `执行中` 出现在文档中。
- **结论**：已修复，组件正确渲染名称、状态、参数、结果。

### 3. 聊天页渲染任务进度面板 ✅
- **位置**：`src/pages/ChatPage.tsx:589`、`src/components/chat/TaskProgressPanel.tsx:8-69`
- **验证**：`tests/pages/chat-page.test.tsx:126-141` 断言流式消息存在时显示 `查询工具` 默认步骤。
- **结论**：已修复，支持 `TASK_STEP_UPDATE` 事件动态更新步骤。

### 4. 路由切换到 `HashRouter` 适配 Tauri ✅
- **位置**：`src/main.tsx:45`、`src/lib/bridge.ts:27-45`
- **验证**：`src/main.tsx` 使用 `<HashRouter>`；`bridge.ts` 通过 `window.location.hash` 导航；`vite.config.ts` 的 `base: './'` 与 `dist/index.html` 使用相对路径 `./assets/...`。
- **结论**：已修复，`BrowserRouter` 生产环境风险已消除。可在 Tauri 打包中通过 `#/chat/:id` 形式稳定路由/刷新。

### 5. 项目页完整 CRUD ✅
- **位置**：`src/pages/ProjectsPage.tsx:26-379`、`src/hooks/use-api.ts:190-227`、`src/lib/api.ts`（新增 `/api/projects` 端点）
- **验证**：`tests/hooks/use-api.test.ts:82-88` 验证 `useProjects` 调用 `api.getProjects`；页面已实现列表、新建、编辑、删除、详情弹窗，并支持后端失败时降级到 `localStorage`。
- **结论**：已修复。

### 6. 核心测试覆盖 ✅
- **位置**：`tests/pages/*`、`tests/hooks/use-api.test.ts`、`tests/stores/chat-store.test.ts`、`tests/lib/websocket.test.ts`
- **验证**：14 个测试文件 / 209 个用例全部通过，新增测试覆盖主流程而非仅存在性。
- **结论**：已补齐。

---

## 四、关键 P2 问题回归验证

| 原 QA 编号 | 问题 | 状态 | 关键位置 |
|------------|------|------|----------|
| #8 | 聊天消息合并而非被 API 覆盖 | ✅ | `src/pages/ChatPage.tsx:137-156` 使用 `setLocalMessages((prev) => { ...apiIds... })` 合并 |
| #9 | Markdown 渲染 | ✅ | `src/components/chat/MessageBubble.tsx:63-74` 使用 `marked` + `DOMPurify` + `highlight.js` |
| #12 | 设置通用设置持久化 | ✅ | `src/pages/SettingsPage.tsx:257-274` 调用 `updateSettings`，`src/stores/ui-store.ts:162-270` 写入 `localStorage` |
| #15 | 设置关闭按钮兜底 | ✅ | `src/pages/SettingsPage.tsx:276-279` 改为 `navigate('/')` |
| #16 | 记忆页真实 API | ✅ | `src/pages/SettingsPage.tsx:543-583` 接入 `useMemory` / `useDeleteMemory` |
| #22 / #23 | 侧栏折叠与搜索 | ✅ | `src/components/sidebar/Sidebar.tsx:53-100`、`src/components/sidebar/ConversationList.tsx:44-51` |
| #26 | MUI 主题响应 | ✅ | `src/main.tsx:39-52` `AppWithTheme` 监听 `theme` 变化并重新生成 MUI theme |
| #27 | 发送快捷键生效 | ✅ | `src/pages/HomePage.tsx:259-270`、`src/components/chat/ChatInput.tsx:69-80` 读取 `sendShortcut` |
| #28 | 全局错误边界 | ✅ | `src/main.tsx:46-48`、`src/components/ui/ErrorBoundary.tsx:14-81` |
| #2 | 下拉菜单外部点击关闭 | ⚠️ 部分 | `src/hooks/use-dropdown.ts:38-61` 已增加 click/Escape 关闭，但 `HomePage.tsx:281` 的 `ref` 挂载在整页容器上，导致点击页面内容（如欢迎区）不关闭（见遗留问题 #1） |
| #13 | 默认模型选择器 | ✅ | `src/pages/SettingsPage.tsx:423-437` 已添加 |
| #17 | 模型 ID 字段 | ✅ | `src/pages/SettingsPage.tsx:679-696` 弹窗已添加“模型 ID”输入 |

---

## 五、遗留问题

> 以下问题不影响当前基线（测试/构建/类型检查均通过），但建议在后续迭代中继续处理。

### P2 — 遗留问题

#### 1. 首页下拉菜单点击页面内容区域不关闭
- **位置**：`src/pages/HomePage.tsx:281`（`ref={dropdown.ref}` 挂载在 `.page.active` 外层）、`src/hooks/use-dropdown.ts:42-47`（外部点击关闭逻辑）
- **复现**：在首页展开“模型”下拉，点击欢迎区或分类 chips，下拉仍保持展开。
- **期望**：点击页面任意非下拉区域都应关闭。
- **实际**：只有点击 `.page.active` 外部（如侧边栏）才会关闭。
- **根因**：`useDropdown` 的 `ref` 被绑定到整个页面容器，导致“外部”范围被错误放大；`ChatInput.tsx:102` 的 ref 绑定在 `.chat-input-area` 上，相对合理，但 `HomePage` 未区分输入工具栏与欢迎区。
- **处理建议**：需工程师修复，将 `HomePage` 的 `ref` 移到仅包含所有下拉菜单的工具栏容器，或为每个下拉单独使用 `useDropdown` 实例。

#### 2. 工具调用/任务进度仅在流式期间展示，刷新后丢失
- **位置**：`src/pages/ChatPage.tsx:646-657`（仅渲染 `isStreaming` 消息的 toolCalls）、`src/types/api.d.ts:48-56`（`Message` 类型未包含 toolCalls/taskSteps）
- **说明**：当前实现仅在消息生成过程中显示工具卡和进度；生成结束后从 API 加载的历史消息不包含工具调用信息，因此无法回放。
- **处理建议**：需后端在 `Message` 中补充工具调用与任务步骤字段，或前端在 `chat-store` 中持久化已完成消息的工具数据。

#### 3. Tauri 后端启动未确认是否成功
- **位置**：`src-tauri/src/backend.rs:42-55`
- **说明**：启动 `aioncore.exe` 后固定 `sleep(4s)`，未轮询 `http://127.0.0.1:25808/health` 确认端口真正监听。
- **处理建议**：需工程师在 Rust 端增加健康检查轮询，失败时向用户反馈。

### P3 — 遗留问题

#### 4. 生产构建 `ChatPage` 分块过大（> 500 kB）
- **位置**：构建日志 `assets/ChatPage-Dg8-THuH.js 1,030.53 kB`
- **说明**：`ChatPage` 懒加载 chunk 因 `MessageBubble` 引入 `marked`/`highlight.js`/`DOMPurify` 而膨胀到 1 MB。
- **影响**：非阻断，但首次进入聊天页加载时间增加。
- **处理建议**：可考虑将 Markdown 渲染器拆分为独立 chunk 或动态导入，降低 `ChatPage` 初始体积。

#### 5. 旧 JS 组件文件仍未清理
- **位置**：`src/components/agents.js`、`conversations.js`、`fileBrowser.js`、`mcpPanel.js`、`chat.js`、`sidebar.js`、`message-input.js`、`tabs.js`、`task-progress.js`、`tool-call.js`、`app-legacy.js`、`main.js` 等
- **说明**：文件已不被新 React 架构引用，但仍在仓库中，可能误导维护者并影响覆盖率统计。
- **处理建议**：确认无引用后删除，或更新 `vitest.config.js` 的 coverage exclude。

#### 6. Tauri 更新器配置为占位符
- **位置**：`src-tauri/tauri.conf.json:36-39`
- **说明**：`endpoints` 为 `github.com/your-org/...`，`pubkey` 为空。
- **处理建议**：正式发布前替换为真实地址与公钥，或关闭 `active`。

#### 7. 专家页 / 工具页 / 产物页管理功能仍缺失
- **位置**：`src/pages/ExpertsPage.tsx`、`src/pages/ToolsPage.tsx`、`src/pages/ArtifactsPage.tsx`
- **说明**：专家页无搜索/启用开关；工具页无启用/禁用与 MCP 管理；产物页无详情/创建/编辑/删除。
- **处理建议**：按后续 PRD 排期实现，或明确本版本范围。

#### 8. `use-streaming` 的 `setContent` 后 `flush` 行为存疑
- **位置**：`src/hooks/use-streaming.ts:31-32`、`tests/hooks/use-streaming.test.ts:66-77`
- **说明**：`flush` 会追加 `bufferRef.current` 到当前内容；测试断言 `setContent('Replaced')` 后再 `flush` 仍保持 `'Replaced'`，但代码逻辑为 `prev + bufferRef.current`。当前测试通过，可能依赖测试时序，存在潜在风险。
- **处理建议**：建议工程师审查 `setContent` 与 `flush` 的语义，确保生产环境中无脏数据追加。

---

## 六、智能路由判定

- **测试结果**：`209/209` 通过，无失败用例。
- **类型检查**：`0` 错误。
- **生产构建**：成功，仅有 chunk size warning（非错误）。
- **P1 修复**：全部验证通过。
- **P2 修复**：主要问题已修复，仅下拉菜单位置绑定存在部分回归不完整。

**路由决策**：`NoOne`（测试与构建通过，可进入下一阶段）。

遗留的 P2/P3 问题已在报告中明确标注，建议作为后续迭代任务分配给工程师，不作为当前阻断项。

---

## 七、最终结论

**可以进入本地应用 / Tauri 打包测试。**

理由：

1. 全部基线检查通过。
2. QA 报告中的 P1 问题已全部修复并验证。
3. 关键 P2 问题（消息合并、Markdown、设置持久化、侧栏、主题、快捷键、错误边界）已修复。
4. `HashRouter` + 相对路径构建产物适配 Tauri 桌面环境。
5. 新增测试覆盖主流程，无 regress。

**建议的下一步**：

- 在真实 Tauri 桌面环境中运行，重点验证：
  - 首页创建会话 → 聊天页流式接收 → 工具卡/进度面板显示。
  - 设置页模型 CRUD 与通用设置持久化。
  - 项目页 CRUD 与后端不可用时的本地降级。
  - 侧边栏折叠、搜索、会话切换。
- 同步处理遗留的 P2 下拉菜单位置绑定问题与 P3 技术债。

---

*报告由 QA 工程师 Edward 生成，本次回归未修改任何源码。*
