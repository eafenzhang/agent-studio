/**
 * Agent Studio API Client
 * 封装所有后端 API 调用
 */

import { normalizeConversationList, normalizeConversation, normalizeMessageList, normalizeArtifactList } from './adapters/conversation-adapter.js';

const API_BASE_URL = 'http://127.0.0.1:25808';

/**
 * 通用请求方法
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  // Destructure to prevent options.headers from overwriting the defaults
  const { headers: optHeaders, ...restOptions } = options;
  const config = {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(optHeaders || {}),
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '请求失败');
    }

    return data.data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * 健康检查
 */
export async function healthCheck() {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.ok;
}

// ===== 认证相关 API =====

/**
 * 获取认证状态
 */
export async function getAuthStatus() {
  return request('/api/auth/status');
}

// ===== 会话相关 API =====

/**
 * 获取会话列表
 */
export async function getConversations(params = {}) {
  const query = new URLSearchParams(params).toString();
  const result = await request(`/api/conversations${query ? '?' + query : ''}`);
  return normalizeConversationList(result);
}

/**
 * 创建新会话
 */
export async function createConversation(data) {
  return request('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ ...data, extra: data.extra ?? {} }),
  });
}

/**
 * 获取单个会话
 */
export async function getConversation(id) {
  const result = await request(`/api/conversations/${id}`);
  return normalizeConversation(result);
}

/**
 * 更新会话
 */
export async function updateConversation(id, data) {
  return request(`/api/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * 删除会话
 */
export async function deleteConversation(id) {
  return request(`/api/conversations/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 获取会话消息列表
 */
export async function getMessages(conversationId, params = {}) {
  const query = new URLSearchParams(params).toString();
  const result = await request(`/api/conversations/${conversationId}/messages${query ? '?' + query : ''}`);
  return normalizeMessageList(result);
}

/**
 * 发送消息
 */
export async function sendMessage(conversationId, data) {
  return request(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 取消会话
 */
export async function cancelConversation(id, turnId) {
  return request(`/api/conversations/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ turn_id: turnId || '' }),
  });
}

/**
 * 重置会话
 */
export async function resetConversation(id) {
  return request(`/api/conversations/${id}/reset`, {
    method: 'POST',
  });
}

// ===== Agent 相关 API =====

/**
 * 获取 Agent 列表
 */
export async function getAgents() {
  return request('/api/agents');
}

/**
 * 刷新 Agent 列表
 */
export async function refreshAgents() {
  return request('/api/agents/refresh', {
    method: 'POST',
  });
}

/**
 * 启用/禁用 Agent
 */
export async function setAgentEnabled(id, enabled) {
  return request(`/api/agents/${id}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

/**
 * Agent 健康检查
 */
export async function agentHealthCheck(data) {
  return request('/api/agents/health-check', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ===== 文件相关 API =====

/**
 * 读取文件
 */
export async function readFile(data) {
  return request('/api/fs/read', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 写入文件
 */
export async function writeFile(data) {
  return request('/api/fs/write', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 列出工作区文件
 */
export async function listWorkspaceFiles(data = {}) {
  return request('/api/fs/list', {
    method: 'POST',
    body: JSON.stringify({ root: data.root ?? data.path ?? '' }),
  });
}

/**
 * 浏览目录
 */
export async function browseDirectory(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/fs/browse${query ? '?' + query : ''}`);
}

// ===== MCP 相关 API =====

/**
 * 获取 MCP 配置
 */
export async function getMcpConfig() {
  return request('/api/mcp/servers');
}

/**
 * 添加 MCP 服务器
 */
export async function addMcpServer(data) {
  return request('/api/mcp/servers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 更新 MCP 服务器
 */
export async function updateMcpServer(id, data) {
  return request(`/api/mcp/servers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * 删除 MCP 服务器
 */
export async function deleteMcpServer(id) {
  return request(`/api/mcp/servers/${id}`, {
    method: 'DELETE',
  });
}

// ===== 系统相关 API =====

/**
 * 获取系统设置
 */
export async function getSettings() {
  return request('/api/settings');
}

/**
 * 更新系统设置
 */
export async function updateSettings(data) {
  return request('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * 获取系统信息
 */
export async function getSystemInfo() {
  return request('/api/system/info');
}

/**
 * 获取 Provider 列表
 */
export async function getProviders() {
  return request('/api/providers');
}

/**
 * 创建 Provider
 */
export async function createProvider(data) {
  return request('/api/providers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 更新 Provider
 */
export async function updateProvider(id, data) {
  return request(`/api/providers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * 删除 Provider
 */
export async function deleteProvider(id) {
  return request(`/api/providers/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 获取助手列表
 */
export async function getAssistants() {
  return request('/api/assistants');
}

// ===== Skills API =====

/**
 * 获取技能列表
 * GET /api/skills
 */
export async function getSkills() {
  return request('/api/skills');
}

/**
 * 创建新技能
 * POST /api/skills
 */
export async function createSkill(data) {
  return request('/api/skills', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 启用/禁用技能
 * PATCH /api/skills/:id/enabled
 */
export async function toggleSkill(id, enabled) {
  return request(`/api/skills/${id}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

// ===== Artifacts API =====

/**
 * 获取产物列表
 * GET /api/artifacts?conversation_id=xxx
 */
export async function getArtifacts(conversationId = null) {
  const result = conversationId
    ? await request(`/api/conversations/${encodeURIComponent(conversationId)}/artifacts`)
    : await request('/api/artifacts');
  return normalizeArtifactList(result);
}

// ===== Memory API =====

/**
 * 获取记忆列表
 * GET /api/memory
 */
export async function getMemory() {
  return request('/api/memory');
}

/**
 * 删除记忆条目
 * DELETE /api/memory/:id
 */
export async function deleteMemory(id) {
  return request(`/api/memory/${id}`, {
    method: 'DELETE',
  });
}

// ===== MCP Extensions API =====

/**
 * 获取 MCP 扩展服务器列表
 * GET /api/extensions/mcp-servers
 */
export async function getMcpServers() {
  return request('/api/extensions/mcp-servers');
}

/**
 * 获取单个 Provider
 * GET /api/providers/:id
 */
export async function getProvider(id) {
  return request(`/api/providers/${id}`);
}

/**
 * 获取 Provider 模型列表
 * POST /api/providers/:id/models
 */
export async function fetchProviderModels(id) {
  return request(`/api/providers/${id}/models`, {
    method: 'POST',
  });
}

/**
 * 创建自定义 Agent
 * POST /api/agents/custom
 */
export async function createCustomAgent(data) {
  return request('/api/agents/custom', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 更新自定义 Agent
 * PUT /api/agents/custom/:id
 */
export async function updateCustomAgent(id, data) {
  return request(`/api/agents/custom/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * 测试连接
 * POST /api/agents/custom/try-connect
 */
export async function tryConnect(data) {
  return request('/api/agents/custom/try-connect', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export default {
  healthCheck,
  getAuthStatus,
  getConversations,
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
  getMessages,
  sendMessage,
  cancelConversation,
  resetConversation,
  getAgents,
  refreshAgents,
  setAgentEnabled,
  agentHealthCheck,
  readFile,
  writeFile,
  listWorkspaceFiles,
  browseDirectory,
  getMcpConfig,
  addMcpServer,
  updateMcpServer,
  deleteMcpServer,
  getSettings,
  updateSettings,
  getSystemInfo,
  getProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  getAssistants,
  getSkills,
  createSkill,
  toggleSkill,
  getArtifacts,
  getMemory,
  deleteMemory,
  getMcpServers,
  getProvider,
  fetchProviderModels,
  createCustomAgent,
  updateCustomAgent,
  tryConnect,
};
