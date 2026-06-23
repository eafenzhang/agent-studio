# Agent Studio Desktop — 修复总结

**日期**：2026-06-21  
**项目路径**：`D:\Agent Studio\agent-studio-desktop`  
**修复人**：software-engineer-2

---

## 一、验收结果

| 检查项 | 结果 | 备注 |
|--------|------|------|
| `npx tsc --noEmit` | ✅ 0 errors | 无类型错误 |
| `npm run build` | ✅ 成功 | `dist/` 输出正常 |
| `npm test` | ✅ 14 个测试文件 / 209 个测试全部通过 | 无 regress |

**全局一致性审查**：`IS_PASS: YES`

跨文件引用、类型契约、数据流与 UI 状态均已对齐，未发现循环依赖或接口不一致问题。

---

## 二、已修复问题（QA 报告对应）

### P1 问题

1. **HomePage 发送请求携带模型/模式/专家/工具**（QA #1）  
   `src/pages/HomePage.tsx` 的 `handleSend` 已把 `selectedModel`、`selectedMode`、`selectedExpert`、`selectedTools` 拼入 `SendMessagePayload`，并同步调用 `api.sendMessage`。`src/types/api.d.ts` 中 `SendMessagePayload` 已包含 `model` / `mode` / `assistant_id` / `tools` 字段。

2. **ChatPage 渲染工具调用与任务进度**（QA #6、#7）  
   `src/pages/ChatPage.tsx` 已引入 `ToolCallCard` 与 `TaskProgressPanel`，并接入 `tool_call_start` / `tool_call_result` / `TASK_STEP_UPDATE` 等 WebSocket 事件，通过 `chat-store` 驱动 UI。

3. **HashRouter 与 bridge 兼容**（QA #25）  
   `src/main.tsx` 已使用 `HashRouter`；`src/lib/bridge.ts` 的 `legacy:switchPage` 事件改为通过 `window.location.hash` 导航，与 HashRouter 兼容。

4. **ProjectsPage 完整 CRUD**（QA #18）  
   `src/pages/ProjectsPage.tsx` 已实现列表、创建、编辑、删除、详情弹窗；优先调用后端 API，失败时自动降级到 `localStorage` 本地存储。

5. **SettingsPage 通用设置持久化**（QA #12）  
   `src/pages/SettingsPage.tsx` 已接入 `useSettings` / `useUpdateSettings`，并调用 `api.updateSettings`；同时 `ui-store` 通过 `localStorage` 做本地兜底。

6. **核心测试覆盖**（QA #36）  
   已补齐 `tests/pages/HomePage.test.tsx`、`ChatPage.test.tsx`、`SettingsPage.test.tsx`、`tests/hooks/use-api.test.ts`、`tests/stores/chat-store.test.ts`、`tests/lib/websocket.test.ts` 等。原有测试无 regress。

### 关键 P2 问题

- **聊天消息合并而非覆盖**（QA #8）：`ChatPage` 的 `useEffect` 现在将 API 消息与本地消息（流式/错误）合并，避免刷新时覆盖流式内容。本次额外将保留规则放宽为 `!apiIds.has(m.id)`，确保错误消息不会在 API 刷新后被清除。
- **Markdown 渲染**（QA #9）：`MessageBubble` 已使用 `marked` + `DOMPurify` + `highlight.js` 渲染 Markdown 与代码块。
- **侧栏折叠与搜索**（QA #22、#23）：`Sidebar` 已绑定 `ui-store.toggleSidebar` 并添加搜索框；`ConversationList` 按搜索关键字过滤。
- **设置关闭兜底**（QA #15）：`SettingsPage` 关闭按钮使用 `navigate('/')`。
- **记忆标签真实 API**（QA #16）：`SettingsPage` 已接入 `useMemory` / `useDeleteMemory`。
- **MUI 主题响应**（QA #26）：`main.tsx` 的 `AppWithTheme` 监听 `ui-store.theme` 变化并重新生成 MUI theme。
- **发送快捷键生效**（QA #27）：`HomePage` 与 `ChatInput` 均读取 `ui-store.sendShortcut` 并处理 Enter/Ctrl+Enter。
- **全局错误边界**（QA #28）：`ErrorBoundary` 已包裹路由树，提供返回首页/重新加载按钮。
- **下拉关闭外部点击**（QA #2）：`useDropdown` 已监听 document 点击与 Escape 关闭。

---

## 三、本次修复（software-engineer-2 增量）

在完成功能核查后，本次重点修复了测试套件 hang 与类型/健壮性问题：

- `src/stores/ui-store.ts`：为 Toast 定时器添加 `unref()` 兜底，避免测试进程因待处理的 4s 定时器无法退出。
- `tests/hooks/use-api.test.ts` 与 `tests/pages/settings-page.test.tsx`：为 `QueryClient` 设置 `gcTime: 0`，解决 React Query 默认 5 分钟缓存定时器导致测试 hang 的问题。
- `tests/pages/chat-page.test.tsx`：
  - 将 `useConversation` / `useMessages` 的 mock 数据提升为 `vi.hoisted` 稳定对象，避免每次渲染返回新引用导致 `ChatPage` 的 `useEffect` 无限循环。
  - 修正输入框 placeholder 匹配规则（i18n mock 返回 key）。
  - 为任务进度面板测试补充 `chat-store` 中的流式消息状态。
- `src/pages/ChatPage.tsx`：放宽本地消息保留规则，使 `STREAM_ERROR` 产生的错误消息在 API 刷新后仍然保留。

---

## 四、验证命令

```bash
cd "D:\Agent Studio\agent-studio-desktop"
npx tsc --noEmit
npm run build
npm test
```

全部通过。

---

## 五、关键设计决策

1. **状态持久化双保险**：`ui-store` 把语言、主题、快捷键、模型选择等写入 `localStorage`；`SettingsPage` 同时调用 `api.updateSettings` 同步后端，任意一端失败不影响另一端。
2. **项目 CRUD 本地降级**：`ProjectsPage` 优先使用后端 API，检测到接口不可用时自动切到本地 `localStorage` 存储，保证 UI 可继续演示。
3. **流式消息合并策略**：以 `messageId` 为唯一键，API 消息为基准，仅保留尚未进入 API 的本地消息（流式、错误），既防止覆盖又避免重复。
4. **测试稳定性**：通过 `gcTime: 0` 与 Toast `unref()` 彻底消除测试 hang；`vi.hoisted` 保证 mock 数据引用稳定。

---

## 六、与系统设计的偏差

- 无重大偏差。`SendMessagePayload` 使用 `assistant_id` 对应专家选择（而非 `expert_id`），与后端 `api.d.ts` 类型保持一致。
- `ToolCallCard` 与 `TaskProgressPanel` 使用项目已有的 `tw-` Tailwind 前缀（`tailwind.config.js` 已配置 `prefix: 'tw-'`），与 `original-ui.css` 的 CSS 变量并存。
- 未清理旧 JS 组件（`src/components/*.js` 等）以及 Tauri updater 占位符，因其属于 P3 范围且不影响主流程与测试通过；若后续需要可单独排期。

---

**全局一致性审查结论：IS_PASS: YES**
