import { create } from 'zustand';
import type { PageId } from '../types';

interface AppState {
  activePage: PageId;
  sidebarCollapsed: boolean;
  settingsOpen: boolean;
  conversationTitle: string | null;
  /** 当前会话 ID（直接传递，避免重复查找） */
  conversationId: string | null;
  selectedAgentId: string;

  switchPage: (page: PageId) => void;
  toggleSidebar: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openConversation: (title: string, id?: string) => void;
  closeConversation: () => void;
  setSelectedAgentId: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activePage: 'home',
  sidebarCollapsed: false,
  settingsOpen: false,
  conversationTitle: null,
  conversationId: null,
  selectedAgentId: '632f31d2',

  switchPage: (page) => set({ activePage: page, conversationTitle: null, conversationId: null }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openConversation: (title, id) => set({ conversationTitle: title, conversationId: id || null, activePage: 'conversation' }),
  closeConversation: () => set({ conversationTitle: null, conversationId: null }),
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
}));
