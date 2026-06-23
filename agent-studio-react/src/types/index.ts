export type PageId = 'home' | 'assistant' | 'projects' | 'tasks' | 'experts' | 'tools' | 'artifacts' | 'conversation';

export interface Expert {
  id: string;
  name: string;
  role: string;
  description: string;
  tags: string[];
  avatar: string;
  avatarUrl?: string;
}

export interface Chip {
  label: string;
  color: string;
  initial: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  time: string;
  type?: string;
  toolCalls?: ToolCall[];
  files?: { name: string; path: string }[];
  status?: 'sending' | 'sent' | 'failed';
}

export interface ToolCall {
  id: string;
  name: string;
  args: string;
  result?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface Conversation {
  id: string;
  title: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  error?: string;
}
