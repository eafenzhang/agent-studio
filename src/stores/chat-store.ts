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

function messageKey(convId: string, msgId: string): string {
  return `${convId}:${msgId}`;
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

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},

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
      return {
        messages: {
          ...s.messages,
          [key]: {
            ...existing,
            content: existing.content + chunk,
            isStreaming: true,
          },
        },
      };
    });
  },

  flushMessage: (convId, msgId) => {
    const key = messageKey(convId, msgId);
    let flushed: StreamingMessage | undefined;
    set((s) => {
      const existing = s.messages[key];
      if (!existing) return s;
      flushed = { ...existing, isStreaming: false };
      return {
        messages: {
          ...s.messages,
          [key]: flushed,
        },
      };
    });
    return flushed;
  },

  startStreaming: (convId, msgId) => {
    const key = messageKey(convId, msgId);
    set((s) => ({
      messages: {
        ...s.messages,
        [key]: {
          content: '',
          isStreaming: true,
          toolCalls: [],
          taskSteps: [],
          error: null,
        },
      },
    }));
  },

  stopStreaming: (convId, msgId) => {
    const key = messageKey(convId, msgId);
    set((s) => {
      const existing = s.messages[key];
      if (!existing) return s;
      return {
        messages: {
          ...s.messages,
          [key]: {
            ...existing,
            isStreaming: false,
          },
        },
      };
    });
  },

  setError: (convId, msgId, error) => {
    const key = messageKey(convId, msgId);
    set((s) => {
      const existing = getOrCreateMessage(s.messages, convId, msgId);
      return {
        messages: {
          ...s.messages,
          [key]: {
            ...existing,
            error,
            isStreaming: false,
          },
        },
      };
    });
  },

  setMessageContent: (convId, msgId, content) => {
    const key = messageKey(convId, msgId);
    set((s) => {
      const existing = getOrCreateMessage(s.messages, convId, msgId);
      return {
        messages: {
          ...s.messages,
          [key]: {
            ...existing,
            content,
          },
        },
      };
    });
  },

  addToolCall: (convId, msgId, toolCall) => {
    const key = messageKey(convId, msgId);
    set((s) => {
      const existing = getOrCreateMessage(s.messages, convId, msgId);
      return {
        messages: {
          ...s.messages,
          [key]: {
            ...existing,
            toolCalls: [...existing.toolCalls, toolCall],
          },
        },
      };
    });
  },

  updateToolCall: (convId, msgId, toolCallId, updates) => {
    const key = messageKey(convId, msgId);
    set((s) => {
      const existing = getOrCreateMessage(s.messages, convId, msgId);
      return {
        messages: {
          ...s.messages,
          [key]: {
            ...existing,
            toolCalls: existing.toolCalls.map((tc) =>
              tc.id === toolCallId ? { ...tc, ...updates } : tc
            ),
          },
        },
      };
    });
  },

  setTaskSteps: (convId, msgId, steps) => {
    const key = messageKey(convId, msgId);
    set((s) => {
      const existing = getOrCreateMessage(s.messages, convId, msgId);
      return {
        messages: {
          ...s.messages,
          [key]: {
            ...existing,
            taskSteps: steps,
          },
        },
      };
    });
  },

  updateTaskStep: (convId, msgId, stepId, updates) => {
    const key = messageKey(convId, msgId);
    set((s) => {
      const existing = getOrCreateMessage(s.messages, convId, msgId);
      return {
        messages: {
          ...s.messages,
          [key]: {
            ...existing,
            taskSteps: existing.taskSteps.map((step) =>
              step.id === stepId ? { ...step, ...updates } : step
            ),
          },
        },
      };
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
      return { messages: filtered };
    });
  },
}));
