import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'auto';
export type SendShortcut = 'enter' | 'ctrl_enter';
export type Language = 'zh' | 'en';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface Tab {
  conversationId: string;
  title: string;
  isDirty: boolean;
}

export interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  currentPage: string;
  openTabs: Tab[];
  activeTabIndex: number;
  isGenerating: boolean;
  toasts: Toast[];
  selectedModel: string | null;
  selectedExpert: string | null;
  selectedMode: string;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  language: Language;
  compactMode: boolean;
  sendShortcut: SendShortcut;
  selectedTools: string[];
  autoUpdateSkills: boolean;
  lockScreenRemote: boolean;

  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setPage: (page: string) => void;
  openTab: (convId: string, title: string) => void;
  closeTab: (index: number) => void;
  setActiveTab: (index: number) => void;
  setGenerating: (v: boolean) => void;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  setSelectedModel: (model: string | null) => void;
  setSelectedExpert: (expert: string | null) => void;
  setSelectedMode: (mode: string) => void;
  setSelectedTools: (tools: string[]) => void;
  setConnectionStatus: (status: UIState['connectionStatus']) => void;
  setLanguage: (language: Language) => void;
  setCompactMode: (compactMode: boolean) => void;
  setSendShortcut: (sendShortcut: SendShortcut) => void;
  setAutoUpdateSkills: (autoUpdateSkills: boolean) => void;
  setLockScreenRemote: (lockScreenRemote: boolean) => void;
  applyPersistedSettings: () => void;
}

let toastCounter = 0;

const STORAGE_KEY = 'agent-studio-settings';

function getInitialSettings(): Partial<UIState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: ['light', 'dark', 'auto'].includes(parsed.theme) ? parsed.theme : 'light',
        language: ['zh', 'en'].includes(parsed.language) ? parsed.language : 'zh',
        compactMode: typeof parsed.compactMode === 'boolean' ? parsed.compactMode : false,
        sendShortcut: ['enter', 'ctrl_enter'].includes(parsed.sendShortcut)
          ? parsed.sendShortcut
          : 'enter',
        autoUpdateSkills:
          typeof parsed.autoUpdateSkills === 'boolean' ? parsed.autoUpdateSkills : true,
        lockScreenRemote:
          typeof parsed.lockScreenRemote === 'boolean' ? parsed.lockScreenRemote : false,
        selectedModel: parsed.selectedModel || null,
        selectedMode: parsed.selectedMode || 'action',
        selectedExpert: parsed.selectedExpert || null,
        selectedTools: Array.isArray(parsed.selectedTools) ? parsed.selectedTools : [],
      };
    }
  } catch {
    // ignore parsing errors
  }

  // Fallback to legacy theme key for backward compatibility
  const legacyTheme = localStorage.getItem('agent-studio-theme') as Theme | null;

  return {
    theme: legacyTheme && ['light', 'dark', 'auto'].includes(legacyTheme) ? legacyTheme : 'light',
    language: 'zh',
    compactMode: false,
    sendShortcut: 'enter',
    autoUpdateSkills: true,
    lockScreenRemote: false,
    selectedModel: null,
    selectedMode: 'action',
    selectedExpert: null,
    selectedTools: [],
  };
}

function persistSettings(settings: Partial<UIState>): void {
  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...existing,
        ...settings,
      })
    );
  } catch {
    // ignore storage errors
  }
}

function persistThemeLegacy(theme: Theme): void {
  try {
    localStorage.setItem('agent-studio-theme', theme);
  } catch {
    // ignore storage errors
  }
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export const useUIStore = create<UIState>((set, get) => {
  const initial = getInitialSettings();
  const resolvedTheme = resolveTheme(initial.theme as Theme);
  document.documentElement.setAttribute('data-theme', resolvedTheme);

  return {
    theme: initial.theme as Theme,
    sidebarOpen: true,
    currentPage: 'home',
    openTabs: [],
    activeTabIndex: -1,
    isGenerating: false,
    toasts: [],
    selectedModel: initial.selectedModel || null,
    selectedExpert: initial.selectedExpert || null,
    selectedMode: initial.selectedMode || 'action',
    selectedTools: initial.selectedTools || [],
    connectionStatus: 'disconnected',
    language: initial.language as Language,
    compactMode: initial.compactMode as boolean,
    sendShortcut: initial.sendShortcut as SendShortcut,
    autoUpdateSkills: initial.autoUpdateSkills as boolean,
    lockScreenRemote: initial.lockScreenRemote as boolean,

    setTheme: (theme) => {
      const resolved = resolveTheme(theme);
      document.documentElement.setAttribute('data-theme', resolved);
      persistSettings({ theme });
      persistThemeLegacy(theme);
      set({ theme });
    },

    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

    setPage: (page) => set({ currentPage: page }),

    openTab: (conversationId, title) => {
      const tabs = get().openTabs;
      const existingIdx = tabs.findIndex(
        (t) => t.conversationId === conversationId
      );
      if (existingIdx >= 0) {
        set({ activeTabIndex: existingIdx });
        return;
      }
      const newTab: Tab = { conversationId, title, isDirty: false };
      set((s) => ({
        openTabs: [...s.openTabs, newTab],
        activeTabIndex: s.openTabs.length,
      }));
    },

    closeTab: (index) => {
      set((s) => {
        const tabs = [...s.openTabs];
        if (index < 0 || index >= tabs.length) return s;
        tabs.splice(index, 1);
        let newIdx = s.activeTabIndex;
        if (tabs.length === 0) {
          newIdx = -1;
        } else if (newIdx >= tabs.length) {
          newIdx = tabs.length - 1;
        } else if (newIdx > index) {
          newIdx--;
        }
        return { openTabs: tabs, activeTabIndex: newIdx };
      });
    },

    setActiveTab: (index) => set({ activeTabIndex: index }),

    setGenerating: (v) => set({ isGenerating: v }),

    addToast: (message, type = 'info') => {
      const id = `toast-${Date.now()}-${++toastCounter}`;
      set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
      const timer = setTimeout(() => {
        get().removeToast(id);
      }, 4000);
      // Allow the process to exit in test environments even if the toast
      // timer hasn't fired yet (Node-only; no-op in browsers).
      if (
        typeof timer === 'object' &&
        timer &&
        'unref' in timer &&
        typeof (timer as { unref?: () => void }).unref === 'function'
      ) {
        (timer as { unref: () => void }).unref();
      }
    },

    removeToast: (id) => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    setSelectedModel: (model) => {
      persistSettings({ selectedModel: model });
      set({ selectedModel: model });
    },
    setSelectedExpert: (expert) => {
      persistSettings({ selectedExpert: expert });
      set({ selectedExpert: expert });
    },
    setSelectedMode: (mode) => {
      persistSettings({ selectedMode: mode });
      set({ selectedMode: mode });
    },
    setSelectedTools: (tools) => {
      persistSettings({ selectedTools: tools });
      set({ selectedTools: tools });
    },
    setConnectionStatus: (status) => set({ connectionStatus: status }),

    setLanguage: (language) => {
      persistSettings({ language });
      set({ language });
    },
    setCompactMode: (compactMode) => {
      persistSettings({ compactMode });
      set({ compactMode });
    },
    setSendShortcut: (sendShortcut) => {
      persistSettings({ sendShortcut });
      set({ sendShortcut });
    },
    setAutoUpdateSkills: (autoUpdateSkills) => {
      persistSettings({ autoUpdateSkills });
      set({ autoUpdateSkills });
    },
    setLockScreenRemote: (lockScreenRemote) => {
      persistSettings({ lockScreenRemote });
      set({ lockScreenRemote });
    },

    applyPersistedSettings: () => {
      const settings = getInitialSettings();
      const resolved = resolveTheme(settings.theme as Theme);
      document.documentElement.setAttribute('data-theme', resolved);
      set({
        theme: settings.theme as Theme,
        language: settings.language as Language,
        compactMode: settings.compactMode as boolean,
        sendShortcut: settings.sendShortcut as SendShortcut,
        autoUpdateSkills: settings.autoUpdateSkills as boolean,
        lockScreenRemote: settings.lockScreenRemote as boolean,
        selectedModel: settings.selectedModel || null,
        selectedMode: settings.selectedMode || 'action',
        selectedExpert: settings.selectedExpert || null,
        selectedTools: settings.selectedTools || [],
      });
    },
  };
});
