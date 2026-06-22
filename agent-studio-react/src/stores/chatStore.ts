import { create } from 'zustand';
import type { Message, Conversation } from '../types';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  pendingMessage: string | null;

  setConversations: (list: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  setStreaming: (v: boolean) => void;
  appendStreaming: (chunk: string) => void;
  resetStreaming: () => void;
  setPendingMessage: (msg: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  pendingMessage: null,

  setConversations: (list) => set({ conversations: list }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (msgs) => set({ messages: msgs }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setStreaming: (v) => set({ isStreaming: v }),
  appendStreaming: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),
  resetStreaming: () => set({ streamingContent: '' }),
  setPendingMessage: (msg) => set({ pendingMessage: msg }),
}));
