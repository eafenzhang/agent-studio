export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiRequestOptions {
  method?: string;
  body?: unknown;
}

// ===== Conversations =====

export interface Conversation {
  id: string;
  name?: string;
  title?: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
}

export interface ConversationListResponse {
  items: Conversation[];
  total?: number;
}

export interface CreateConversationPayload {
  type?: string;
  name?: string;
  title?: string;
  extra?: Record<string, unknown>;
}

export interface UpdateConversationPayload {
  name?: string;
  title?: string;
  status?: string;
}

// ===== Messages =====

export type MessageContent =
  | string
  | { content?: string; text?: string; [key: string]: unknown };

export interface Message {
  id: string;
  conversationId?: string;
  content: MessageContent;
  position?: 'left' | 'right';
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  toolCalls?: ToolCall[];
  taskSteps?: TaskStep[];
}

export interface MessageListResponse {
  items: Message[];
  total?: number;
}

export interface SendMessagePayload {
  content: string;
  type?: string;
  model?: string;
  mode?: string;
  assistant_id?: string;
  inject_skills?: string[];
  mcp_tools?: string[];
  tools?: string[];
}

/** Backend response from POST /api/conversations/{id}/messages */
export interface SendMessageResponse {
  msg_id: string;
  turn_id: string;
  runtime: string;
}

// ===== Tool Calls & Task Steps =====

export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error';
export type TaskStepStatus = 'pending' | 'running' | 'done' | 'error';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: ToolCallStatus;
  startedAt?: number;
  endedAt?: number;
}

export interface TaskStep {
  id: string;
  label: string;
  status: TaskStepStatus;
}

// ===== Artifacts =====

export interface Artifact {
  id: string;
  name?: string;
  type?: string;
  conversationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArtifactListResponse {
  items: Artifact[];
  total?: number;
}

// ===== Providers =====

export interface Provider {
  id: string;
  name?: string;
  base_url?: string;
  api_key?: string;
  platform?: string;
  models?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProviderPayload {
  name: string;
  base_url: string;
  api_key: string;
  platform?: string;
  models?: string[];
}

export interface UpdateProviderPayload {
  name?: string;
  base_url?: string;
  api_key?: string;
  platform?: string;
  models?: string[];
}

// ===== Agents & Assistants =====

export interface Agent {
  id: string;
  name?: string;
  name_i18n?: Record<string, string>;
  description?: string;
  description_i18n?: Record<string, string>;
  avatar?: string;
  source?: 'builtin' | 'custom';
  command?: string;
  args?: string[];
  enabled?: boolean;
}

export interface Assistant {
  id: string;
  name?: string;
  name_i18n?: Record<string, string>;
  description?: string;
  description_i18n?: Record<string, string>;
  avatar?: string;
  source?: 'builtin' | 'custom';
  tags?: string[];
}

export interface CreateCustomAgentPayload {
  name: string;
  command: string;
  args?: string[];
}

// ===== Skills =====

export interface Skill {
  id: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  stats?: string;
}

// ===== MCP =====

export interface McpServer {
  id: string;
  name?: string;
  description?: string;
  connected?: boolean;
  tools?: string[];
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpConfig {
  servers?: McpServer[];
}

export interface AddMcpServerPayload {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface UpdateMcpServerPayload {
  name?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

// ===== Settings =====

export interface Settings {
  theme?: 'light' | 'dark' | 'auto';
  language?: 'zh' | 'en';
  compactMode?: boolean;
  sendShortcut?: 'enter' | 'ctrl_enter';
  autoUpdateSkills?: boolean;
  lockScreenRemote?: boolean;
  defaultModel?: string;
  [key: string]: unknown;
}

// ===== System =====

export interface SystemInfo {
  version?: string;
  platform?: string;
  nodeVersion?: string;
}

// ===== Memory =====

export interface MemoryEntry {
  id: string;
  key?: string;
  value?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ===== Try Connect =====

export interface TryConnectPayload {
  provider_id: string;
}

// ===== Projects =====

export interface Project {
  id: string;
  name: string;
  description?: string;
  path?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectListResponse {
  items: Project[];
  total?: number;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  path?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  path?: string;
}
