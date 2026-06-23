import { create } from 'zustand';
import type { PageId } from '../types';

interface AppState {
  activePage: PageId;
  sidebarCollapsed: boolean;
  settingsOpen: boolean;
  conversationTitle: string | null;
  conversationId: string | null;
  selectedAgentId: string;
  /** 当前选中的模式: 行动/规划/自主 */
  selectedMode: string;
  /** 当前选中的技能列表 */
  selectedSkills: string[];
  /** 当前选中的模型名称 */
  selectedModel: string;
  /** 当前选中的专家/助手 ID */
  selectedAssistantId: string | null;

  switchPage: (page: PageId) => void;
  toggleSidebar: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openConversation: (title: string, id?: string) => void;
  closeConversation: () => void;
  setSelectedAgentId: (id: string) => void;
  setSelectedMode: (mode: string) => void;
  setSelectedSkills: (skills: string[]) => void;
  setSelectedAssistantId: (id: string | null) => void;
  setSelectedModel: (model: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activePage: 'home',
  sidebarCollapsed: false,
  settingsOpen: false,
  conversationTitle: null,
  conversationId: null,
  selectedAgentId: '632f31d2',
  selectedMode: '行动',
  selectedSkills: [],
  selectedModel: '',
  selectedAssistantId: null,

  switchPage: (page) => set({ activePage: page, conversationTitle: null, conversationId: null }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openConversation: (title, id) => set({ conversationTitle: title, conversationId: id || null, activePage: 'conversation' }),
  closeConversation: () => set({ conversationTitle: null, conversationId: null }),
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  setSelectedMode: (mode) => set({ selectedMode: mode }),
  setSelectedSkills: (skills) => set({ selectedSkills: skills }),
  setSelectedAssistantId: (id) => set({ selectedAssistantId: id }),
  setSelectedModel: (model) => set({ selectedModel: model }),
}));
