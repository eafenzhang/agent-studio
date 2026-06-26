/**
 * Agent Studio API Client (TypeScript wrapper)
 * Re-exports the existing JS API module with TypeScript type annotations.
 */

import type {
  Conversation,
  ConversationListResponse,
  Message,
  MessageListResponse,
  Artifact,
  ArtifactListResponse,
  Provider,
  Agent,
  Assistant,
  Skill,
  McpServer,
  McpConfig,
  Settings,
  SystemInfo,
  MemoryEntry,
  CreateConversationPayload,
  SendMessagePayload,
  SendMessageResponse,
  UpdateConversationPayload,
  CreateProviderPayload,
  UpdateProviderPayload,
  TryConnectPayload,
  CreateCustomAgentPayload,
  AddMcpServerPayload,
  UpdateMcpServerPayload,
  Project,
  ProjectListResponse,
  CreateProjectPayload,
  UpdateProjectPayload,
} from '../types/api';

const API_BASE_URL = 'http://127.0.0.1:25808';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { headers: optHeaders, ...restOptions } = options;
  const config: RequestInit = {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(optHeaders as Record<string, string> || {}),
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '请求失败');
    }

    return data.data as T;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ===== Health =====

export async function healthCheck(): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.ok;
}

// ===== Auth =====

export async function getAuthStatus(): Promise<unknown> {
  return request('/api/auth/status');
}

// ===== Conversations =====

export async function getConversations(
  params: Record<string, string> = {}
): Promise<ConversationListResponse> {
  const query = new URLSearchParams(params).toString();
  return request<ConversationListResponse>(
    `/api/conversations${query ? '?' + query : ''}`
  );
}

export async function createConversation(
  data: CreateConversationPayload
): Promise<Conversation> {
  return request<Conversation>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ ...data, extra: data.extra ?? {} }),
  });
}

export async function getConversation(id: string): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${id}`);
}

export async function updateConversation(
  id: string,
  data: UpdateConversationPayload
): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteConversation(id: string): Promise<void> {
  return request<void>(`/api/conversations/${id}`, {
    method: 'DELETE',
  });
}

export async function getMessages(
  conversationId: string,
  params: Record<string, string> = {}
): Promise<MessageListResponse> {
  const query = new URLSearchParams(params).toString();
  return request<MessageListResponse>(
    `/api/conversations/${conversationId}/messages${query ? '?' + query : ''}`
  );
}

export async function sendMessage(
  conversationId: string,
  data: SendMessagePayload
): Promise<SendMessageResponse> {
  return request<SendMessageResponse>(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelConversation(id: string, turnId?: string): Promise<void> {
  const body: Record<string, unknown> = {};
  if (turnId) body.turn_id = turnId;
  return request<void>(`/api/conversations/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function resetConversation(id: string): Promise<void> {
  return request<void>(`/api/conversations/${id}/reset`, {
    method: 'POST',
  });
}

// ===== Agents =====

export async function getAgents(): Promise<Agent[]> {
  return request<Agent[]>('/api/agents');
}

export async function refreshAgents(): Promise<void> {
  return request<void>('/api/agents/refresh', { method: 'POST' });
}

export async function setAgentEnabled(
  id: string,
  enabled: boolean
): Promise<void> {
  return request<void>(`/api/agents/${id}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function agentHealthCheck(data: {
  command?: string;
  args?: string[];
}): Promise<unknown> {
  return request('/api/agents/health-check', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ===== Files =====

export async function readFile(data: {
  path: string;
}): Promise<{ content: string }> {
  return request('/api/fs/read', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function writeFile(data: {
  path: string;
  content: string;
}): Promise<void> {
  return request('/api/fs/write', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listWorkspaceFiles(data: {
  root?: string;
}): Promise<{ files: unknown[]; root?: string }> {
  return request('/api/fs/list', {
    method: 'POST',
    body: JSON.stringify({ root: data.root ?? '' }),
  });
}

export async function browseDirectory(
  params: Record<string, string> = {}
): Promise<unknown> {
  const query = new URLSearchParams(params).toString();
  return request(`/api/fs/browse${query ? '?' + query : ''}`);
}

// ===== MCP =====

export async function getMcpConfig(): Promise<McpConfig> {
  return request<McpConfig>('/api/mcp/servers');
}

export async function addMcpServer(
  data: AddMcpServerPayload
): Promise<McpServer> {
  return request<McpServer>('/api/mcp/servers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMcpServer(
  id: string,
  data: UpdateMcpServerPayload
): Promise<McpServer> {
  return request<McpServer>(`/api/mcp/servers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMcpServer(id: string): Promise<void> {
  return request<void>(`/api/mcp/servers/${id}`, { method: 'DELETE' });
}

// ===== Settings =====

export async function getSettings(): Promise<Settings> {
  return request<Settings>('/api/settings');
}

export async function updateSettings(
  data: Partial<Settings>
): Promise<Settings> {
  return request<Settings>('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getSystemInfo(): Promise<SystemInfo> {
  return request<SystemInfo>('/api/system/info');
}

// ===== Providers =====

export async function getProviders(): Promise<Provider[]> {
  return request<Provider[]>('/api/providers');
}

export async function createProvider(
  data: CreateProviderPayload
): Promise<Provider> {
  return request<Provider>('/api/providers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProvider(
  id: string,
  data: UpdateProviderPayload
): Promise<Provider> {
  return request<Provider>(`/api/providers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProvider(id: string): Promise<void> {
  return request<void>(`/api/providers/${id}`, { method: 'DELETE' });
}

export async function getProvider(id: string): Promise<Provider> {
  return request<Provider>(`/api/providers/${id}`);
}

export async function fetchProviderModels(id: string): Promise<void> {
  return request<void>(`/api/providers/${id}/models`, { method: 'POST' });
}

// ===== Assistants =====

export async function getAssistants(): Promise<Assistant[]> {
  return request<Assistant[]>('/api/assistants');
}

// ===== Skills =====

export async function getSkills(): Promise<Skill[]> {
  return request<Skill[]>('/api/skills');
}

export async function createSkill(data: {
  name: string;
  description?: string;
}): Promise<Skill> {
  return request<Skill>('/api/skills', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function toggleSkill(
  id: string,
  enabled: boolean
): Promise<void> {
  return request<void>(`/api/skills/${id}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

// ===== Artifacts =====

export async function getArtifacts(
  conversationId: string | null = null
): Promise<ArtifactListResponse> {
  if (conversationId) {
    return request<ArtifactListResponse>(`/api/conversations/${encodeURIComponent(conversationId)}/artifacts`);
  }
  return request<ArtifactListResponse>('/api/artifacts');
}

// ===== Memory =====

export async function getMemory(): Promise<MemoryEntry[]> {
  return request<MemoryEntry[]>('/api/memory');
}

export async function deleteMemory(id: string): Promise<void> {
  return request<void>(`/api/memory/${id}`, { method: 'DELETE' });
}

// ===== MCP Extensions =====

export async function getMcpServers(): Promise<McpServer[]> {
  return request<McpServer[]>('/api/extensions/mcp-servers');
}

// ===== Custom Agents =====

export async function createCustomAgent(
  data: CreateCustomAgentPayload
): Promise<Agent> {
  return request<Agent>('/api/agents/custom', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCustomAgent(
  id: string,
  data: Partial<CreateCustomAgentPayload>
): Promise<Agent> {
  return request<Agent>(`/api/agents/custom/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function tryConnect(
  data: TryConnectPayload
): Promise<unknown> {
  return request('/api/agents/custom/try-connect', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ===== Projects =====

export async function getProjects(): Promise<ProjectListResponse> {
  return request<ProjectListResponse>('/api/projects');
}

export async function createProject(data: CreateProjectPayload): Promise<Project> {
  return request<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getProject(id: string): Promise<Project> {
  return request<Project>(`/api/projects/${id}`);
}

export async function updateProject(id: string, data: UpdateProjectPayload): Promise<Project> {
  return request<Project>(`/api/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<void> {
  return request<void>(`/api/projects/${id}`, { method: 'DELETE' });
}
