import { create } from 'zustand';
import type { ToolCall, TaskStep } from '../types/api';

export interface StreamingMessage {
  content: string;
  isStreaming: boolean;
  toolCalls: ToolCall[];
  taskSteps: TaskStep[];
  error: string | null;
}

export interface ChatState {
  messages: Record<string, StreamingMessage>;
  appendChunk: (convId: string, msgId: string, chunk: string) => void;
  flushMessage: (convId: string, msgId: string) => StreamingMessage | undefined;
  startStreaming: (convId: string, msgId: string) => void;
  stopStreaming: (convId: string, msgId: string) => void;
  setError: (convId: string, msgId: string, error: string) => void;
  setMessageContent: (convId: string, msgId: string, content: string) => void;
  addToolCall: (convId: string, msgId: string, toolCall: ToolCall) => void;
  updateToolCall: (
    convId: string,
    msgId: string,
    toolCallId: string,
    updates: Partial<ToolCall>
  ) => void;
  setTaskSteps: (convId: string, msgId: string, steps: TaskStep[]) => void;
  updateTaskStep: (
    convId: string,
    msgId: string,
    stepId: string,
    updates: Partial<TaskStep>
  ) => void;
  clearMessages: (convId: string) => void;
}

const STORAGE_KEY = 'agent-studio-chat-store';

function messageKey(convId: string, msgId: string): string {
  return `${convId}:${msgId}`;
}

function loadPersisted(): Record<string, StreamingMessage> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist(messages: Record<string, StreamingMessage>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (e) {
    // sessionStorage quota exceeded — clear oldest entries
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      const entries = Object.entries(messages);
      // Remove oldest half by creation time (rough sort by key prefix)
      const half = Math.ceil(entries.length / 2);
      const trimmed = Object.fromEntries(entries.slice(half));
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }
}

function getOrCreateMessage(
  messages: Record<string, StreamingMessage>,
  convId: string,
  msgId: string
): StreamingMessage {
  const key = messageKey(convId, msgId);
  return (
    messages[key] || {
      content: '',
      isStreaming: false,
      toolCalls: [],
      taskSteps: [],
      error: null,
    }
  );
}

export const useChatStore = create<ChatState>((set, get) => {
  const initial = loadPersisted();

  return {
    messages: initial,

    appendChunk: (convId, msgId, chunk) => {
      const key = messageKey(convId, msgId);
      set((s) => {
        const existing = s.messages[key] || {
          content: '',
          isStreaming: false,
          toolCalls: [],
          taskSteps: [],
          error: null,
        };
        const next = {
          ...existing,
          content: existing.content + chunk,
          isStreaming: true,
        };
        const messages = { ...s.messages, [key]: next };
        persist(messages);
        return { messages };
      });
    },

    flushMessage: (convId, msgId) => {
      const key = messageKey(convId, msgId);
      let flushed: StreamingMessage | undefined;
      set((s) => {
        const existing = s.messages[key];
        if (!existing) return s;
        flushed = { ...existing, isStreaming: false };
        const messages = { ...s.messages, [key]: flushed };
        persist(messages);
        return { messages };
      });
      return flushed;
    },

    startStreaming: (convId, msgId) => {
      const key = messageKey(convId, msgId);
      set((s) => {
        const messages = {
          ...s.messages,
          [key]: {
            content: '',
            isStreaming: true,
            toolCalls: [],
            taskSteps: [],
            error: null,
          },
        };
        persist(messages);
        return { messages };
      });
    },

    stopStreaming: (convId, msgId) => {
      const key = messageKey(convId, msgId);
      set((s) => {
        const existing = s.messages[key];
        if (!existing) return s;
        const messages = {
          ...s.messages,
          [key]: { ...existing, isStreaming: false },
        };
        persist(messages);
        return { messages };
      });
    },

    setError: (convId, msgId, error) => {
      const key = messageKey(convId, msgId);
      set((s) => {
        const existing = getOrCreateMessage(s.messages, convId, msgId);
        const messages = {
          ...s.messages,
          [key]: { ...existing, error, isStreaming: false },
        };
        persist(messages);
        return { messages };
      });
    },

    setMessageContent: (convId, msgId, content) => {
      const key = messageKey(convId, msgId);
      set((s) => {
        const existing = getOrCreateMessage(s.messages, convId, msgId);
        const messages = {
          ...s.messages,
          [key]: { ...existing, content },
        };
        persist(messages);
        return { messages };
      });
    },

    addToolCall: (convId, msgId, toolCall) => {
      const key = messageKey(convId, msgId);
      set((s) => {
        const existing = getOrCreateMessage(s.messages, convId, msgId);
        const messages = {
          ...s.messages,
          [key]: {
            ...existing,
            toolCalls: [...existing.toolCalls, toolCall],
          },
        };
        persist(messages);
        return { messages };
      });
    },

    updateToolCall: (convId, msgId, toolCallId, updates) => {
      const key = messageKey(convId, msgId);
      set((s) => {
        const existing = getOrCreateMessage(s.messages, convId, msgId);
        const messages = {
          ...s.messages,
          [key]: {
            ...existing,
            toolCalls: existing.toolCalls.map((tc) =>
              tc.id === toolCallId ? { ...tc, ...updates } : tc
            ),
          },
        };
        persist(messages);
        return { messages };
      });
    },

    setTaskSteps: (convId, msgId, steps) => {
      const key = messageKey(convId, msgId);
      set((s) => {
        const existing = getOrCreateMessage(s.messages, convId, msgId);
        const messages = {
          ...s.messages,
          [key]: { ...existing, taskSteps: steps },
        };
        persist(messages);
        return { messages };
      });
    },

    updateTaskStep: (convId, msgId, stepId, updates) => {
      const key = messageKey(convId, msgId);
      set((s) => {
        const existing = getOrCreateMessage(s.messages, convId, msgId);
        const messages = {
          ...s.messages,
          [key]: {
            ...existing,
            taskSteps: existing.taskSteps.map((step) =>
              step.id === stepId ? { ...step, ...updates } : step
            ),
          },
        };
        persist(messages);
        return { messages };
      });
    },

    clearMessages: (convId) => {
      set((s) => {
        const prefix = `${convId}:`;
        const filtered: Record<string, StreamingMessage> = {};
        for (const [key, val] of Object.entries(s.messages)) {
          if (!key.startsWith(prefix)) {
            filtered[key] = val;
          }
        }
        persist(filtered);
        return { messages: filtered };
      });
    },
  };
});
