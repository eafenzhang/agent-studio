import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../src/stores/ui-store';

describe('ui-store', () => {
  beforeEach(() => {
    useUIStore.setState({
      theme: 'light', sidebarOpen: true, currentPage: 'home',
      openTabs: [], activeTabIndex: -1, isGenerating: false, toasts: [],
      selectedModel: null, selectedExpert: null, selectedMode: 'action',
      connectionStatus: 'disconnected', language: 'zh', compactMode: false,
      sendShortcut: 'enter', selectedTools: [], autoUpdateSkills: true, lockScreenRemote: false,
    });
    localStorage.clear();
  });

  it('should start with light theme', () => {
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('should set theme and persist to localStorage', () => {
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
    const p = JSON.parse(localStorage.getItem('agent-studio-settings')!);
    expect(p.theme).toBe('dark');
  });

  it('should toggle sidebar', () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('should open and close tabs', () => {
    useUIStore.getState().openTab('conv-1', 'Chat 1');
    expect(useUIStore.getState().openTabs).toHaveLength(1);
    useUIStore.getState().openTab('conv-1', 'Chat 1');
    expect(useUIStore.getState().openTabs).toHaveLength(1);
    useUIStore.getState().closeTab(0);
    expect(useUIStore.getState().openTabs).toHaveLength(0);
  });

  it('should add and remove toasts', () => {
    useUIStore.getState().addToast('Test', 'success');
    expect(useUIStore.getState().toasts).toHaveLength(1);
    const id = useUIStore.getState().toasts[0].id;
    useUIStore.getState().removeToast(id);
    expect(useUIStore.getState().toasts).toHaveLength(0);
  });

  it('should cap toasts at 5', () => {
    for (let i = 0; i < 10; i++) useUIStore.getState().addToast(`T${i}`);
    expect(useUIStore.getState().toasts.length).toBeLessThanOrEqual(5);
  });

  it('should persist selectedModel', () => {
    useUIStore.getState().setSelectedModel('gpt-4o');
    const p = JSON.parse(localStorage.getItem('agent-studio-settings')!);
    expect(p.selectedModel).toBe('gpt-4o');
  });
});
