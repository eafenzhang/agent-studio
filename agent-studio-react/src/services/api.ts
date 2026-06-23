const BASE_URL = import.meta.env.VITE_AION_CORE_URL || 'http://localhost:25808';

async function request<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const url = `${BASE_URL}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timer);
    if (!res.ok) {
      if (res.status >= 500) return null;
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.error || res.statusText, body.code);
    }
    const json: { success: boolean; data?: T; error?: string; code?: string } = await res.json();
    if (!json.success) return null;
    return json.data ?? null;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    return null;
  }
}

/** Default agent: Hermes (ACP handshake active). Aion CLI = 632f31d2, OpenCode = 53861a53 */
export const DEFAULT_AGENT_ID = '55f3ed1c';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// -- Conversation API : crates/aionui-conversation/src/routes.rs --
export const conversationApi = {
  list: () => request<ConversationList>('/api/conversations'),
  get: (id: string) => request<ConversationItem>(`/api/conversations/${id}`),
  create: async (name: string, agentId?: string, options?: { assistantId?: string; skills?: string[]; mode?: string; model?: string }) => {
    const modeMap: Record<string, string> = { '行动': 'action', '规划': 'plan', '自主': 'auto' };
    const id = agentId || DEFAULT_AGENT_ID;
    const isAionCli = id === '632f31d2';
    const body: Record<string, any> = {
      type: isAionCli ? 'aionrs' : 'acp',
      name,
      extra: isAionCli ? { backend: 'aionrs' } : { agent_id: id },
    };
    // 传入 assistant（专家）、skills 和 mode
    if (options?.assistantId) body.assistant = { id: options.assistantId };
    if (options?.skills && options.skills.length > 0) {
      body.extra = { ...body.extra, skill_ids: options.skills };
    }
    if (options?.mode) {
      const mappedMode = modeMap[options.mode] || options.mode;
      body.extra = { ...body.extra, mode: mappedMode };
    }
    // Aion CLI 需要传入 model 和多轮对话配置
    if (isAionCli) {
      body.extra.max_turns = 30;
      body.extra.system_prompt = '你是 Agent Studio 中的自主 AI 助手，具备多轮对话记忆和主动思考能力。\n\n核心原则：\n1. 【多轮记忆】记住用户在整个对话中说过的所有内容，包括姓名、偏好、项目细节等，在后续回答中引用这些信息\n2. 【主动思考】不要只被动回答问题——主动分析用户意图，预测下一步需求，提出建议或追问\n3. 【上下文连贯】每次回复前先回顾完整的对话历史，确保回答与之前的讨论保持一致\n4. 【任务导向】对于复杂任务，主动规划步骤，一步步完成，而不是一次性给出笼统回答\n5. 【工具使用】当需要执行代码、搜索信息或操作文件时，主动使用可用工具完成\n6. 【中文回复】始终用中文回复用户';
      try {
        const providers = await request<any[]>('/api/providers');
        if (providers && providers.length > 0) {
          const p = providers[0];
          const modelName = options?.model || (p.models || [])[0] || 'deepseek-chat';
          body.model = { provider_id: p.id, model: modelName };
        }
      } catch { /* 离线模式不用 model 信息 */ }
    }
    return request<ConversationItem>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  delete: (id: string) => request<void>(`/api/conversations/${id}`, { method: 'DELETE' }),
  messages: (id: string) => request<ConversationMessageList>(`/api/conversations/${id}/messages`),
  sendMessage: (id: string, content: string, options?: { files?: string[]; skills?: string[] }) =>
    request<MessageSendResult>(`/api/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        ...(options?.files?.length ? { files: options.files } : {}),
        ...(options?.skills?.length ? { inject_skills: options.skills } : {}),
      }),
    }),
  artifacts: (id: string) => request<ArtifactItem[]>(`/api/conversations/${id}/artifacts`),
  cancel: (id: string) => request<void>(`/api/conversations/${id}/cancel`, { method: 'POST' }),
};

// -- Agent API : crates/aionui-ai-agent/src/routes/agent.rs --
export const agentApi = {
  list: () => request<AgentItem[]>('/api/agents'),
  refresh: () => request<void>('/api/agents/refresh', { method: 'POST' }),
};

// -- Assistant API : crates/aionui-assistant/src/routes.rs --
export const assistantApi = {
  list: () => request<AssistantItem[]>('/api/assistants'),
  create: (body: Record<string, unknown>) =>
    request<AssistantItem>('/api/assistants', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/api/assistants/${id}`, { method: 'DELETE' }),
};

// -- System API : crates/aionui-system/src/routes.rs --
export const systemApi = {
  info: () => request<SystemInfo>('/api/system/info'),
  settings: () => request<SystemSettings>('/api/settings'),
  updateSettings: (body: Record<string, unknown>) =>
    request<SystemSettings>('/api/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  providers: () => request<ProviderItem[]>('/api/providers'),
  createProvider: (body: Record<string, unknown>) =>
    request<ProviderItem>('/api/providers', { method: 'POST', body: JSON.stringify(body) }),
  deleteProvider: (id: string) => request<void>(`/api/providers/${id}`, { method: 'DELETE' }),
  /** 更新 Provider */
  updateProvider: (id: string, body: Record<string, unknown>) =>
    request<ProviderItem>(`/api/providers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  /** 测试 Provider 连接 */
  testConnection: (baseUrl: string, apiKey: string) =>
    request<{protocol:string}>('/api/providers/detect-protocol', {
      method: 'POST',
      body: JSON.stringify({ base_url: baseUrl, api_key: apiKey, timeout: 10000 }),
    }),
  /** 拉取 Provider 的可用模型列表 */
  fetchModels: (id: string) =>
    request<{models:{id:string}[];fixed_base_url?:string}>(`/api/providers/${id}/models`, {
      method: 'POST',
      body: JSON.stringify({ try_fix: true }),
    }),
  checkUpdate: () => request<UpdateResult>('/api/system/check-update', { method: 'POST' }),
};

// -- Extension API : crates/aionui-extension/src/routes.rs --
export const extensionApi = {
  list: () => request<ExtensionItem[]>('/api/extensions'),
};

// -- MCP API : crates/aionui-mcp/src/routes.rs --
export const mcpApi = {
  servers: () => request<McpItem[]>('/api/mcp/servers'),
};

// -- File API : crates/aionui-file/src/routes.rs --
export const fileApi = {
  list: (dir?: string) =>
    request<FileEntry[]>('/api/fs/list', { method: 'POST', body: JSON.stringify({ dir: dir || '' }) }),
};

// -- Cron API : crates/aionui-cron/src/routes.rs --
export const cronApi = {
  jobs: () => request<CronJob[]>('/api/cron/jobs'),
};

// -- Response types --
export interface ConversationList { items: ConversationItem[]; total?: number; hasMore?: boolean }
export interface ConversationItem { id: string; title?: string; name?: string; createdAt?: string; updatedAt?: string; messageCount?: number }
export interface MessageItem { id: string; conversationId?: string; role: string; content: string; createdAt?: string }
export interface ArtifactItem { id: string; name: string; type?: string; size?: string; updatedAt?: string; updatedBy?: string }
export interface AgentItem { id: string; name: string; description: string; enabled?: boolean }
export interface AssistantItem { id: string; name: string; description?: string; enabled: boolean; source: string; preset_agent_type: string; enabled_skills: string[]; custom_skill_names: string[]; models: string[] }
export interface MessageSendResult { msg_id: string; turn_id: string; runtime: Record<string, unknown> }
export interface ConversationMessageList { items: any[]; total: number; has_more?: boolean }
export interface SystemInfo { cache_dir: string; work_dir: string; log_dir: string; platform: string; arch: string }
export interface SystemSettings { language: string; notification_enabled: boolean; cron_notification_enabled: boolean; command_queue_enabled: boolean; save_upload_to_workspace: boolean }
export interface ProviderItem { id: string; name: string; type: string; enabled?: boolean }
export interface UpdateResult { hasUpdate: boolean; version?: string; releaseUrl?: string }
export interface ExtensionItem { id: string; name: string; description: string; version: string; enabled: boolean }
export interface McpItem { id: string; name: string; type: string; enabled: boolean; description?: string }
export interface FileEntry { name: string; path: string; type: 'file' | 'dir'; size?: number; modifiedAt?: string }
export interface CronJob { id: string; name: string; schedule: string; enabled: boolean; lastRun?: string; nextRun?: string }

export default { conversationApi, agentApi, assistantApi, systemApi, extensionApi, mcpApi, fileApi, cronApi };
