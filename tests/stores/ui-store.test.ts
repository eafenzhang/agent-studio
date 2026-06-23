import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from '../../src/stores/ui-store';

describe('UI Store', () => {
  beforeEach(() => {
    // Mock window.matchMedia for 'auto' theme test
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    useUIStore.setState({
      theme: 'light',
      sidebarOpen: true,
      currentPage: 'home',
      openTabs: [],
      activeTabIndex: -1,
      isGenerating: false,
      toasts: [],
      selectedModel: null,
      selectedExpert: null,
      selectedMode: 'action',
      connectionStatus: 'disconnected',
    });
  });

  it('should initialize with default values', () => {
    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(state.currentPage).toBe('home');
    expect(state.openTabs).toEqual([]);
    expect(state.activeTabIndex).toBe(-1);
    expect(state.isGenerating).toBe(false);
    expect(state.toasts).toEqual([]);
    expect(state.connectionStatus).toBe('disconnected');
  });

  it('should toggle sidebar', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('should set theme and persist to localStorage', () => {
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
    expect(localStorage.getItem('agent-studio-theme')).toBe('dark');

    useUIStore.getState().setTheme('light');
    expect(useUIStore.getState().theme).toBe('light');
    expect(localStorage.getItem('agent-studio-theme')).toBe('light');
  });

  it('should set theme to auto', () => {
    useUIStore.getState().setTheme('auto');
    expect(useUIStore.getState().theme).toBe('auto');
    expect(localStorage.getItem('agent-studio-theme')).toBe('auto');
  });

  it('should set current page', () => {
    useUIStore.getState().setPage('experts');
    expect(useUIStore.getState().currentPage).toBe('experts');

    useUIStore.getState().setPage('tools');
    expect(useUIStore.getState().currentPage).toBe('tools');
  });

  it('should manage tabs - open new tab', () => {
    useUIStore.getState().openTab('conv-1', 'Test Chat');
    expect(useUIStore.getState().openTabs).toHaveLength(1);
    expect(useUIStore.getState().openTabs[0]).toEqual({
      conversationId: 'conv-1',
      title: 'Test Chat',
      isDirty: false,
    });
    expect(useUIStore.getState().activeTabIndex).toBe(0);
  });

  it('should not duplicate tabs with same conversationId', () => {
    useUIStore.getState().openTab('conv-1', 'Test Chat');
    useUIStore.getState().openTab('conv-1', 'Test Chat Updated');
    expect(useUIStore.getState().openTabs).toHaveLength(1);
    expect(useUIStore.getState().activeTabIndex).toBe(0);
  });

  it('should close tab and adjust activeTabIndex', () => {
    useUIStore.getState().openTab('conv-1', 'Tab 1');
    useUIStore.getState().openTab('conv-2', 'Tab 2');
    useUIStore.getState().openTab('conv-3', 'Tab 3');
    expect(useUIStore.getState().openTabs).toHaveLength(3);
    expect(useUIStore.getState().activeTabIndex).toBe(2);

    // Close middle tab
    useUIStore.getState().closeTab(1);
    expect(useUIStore.getState().openTabs).toHaveLength(2);
    expect(useUIStore.getState().openTabs[0].conversationId).toBe('conv-1');
    expect(useUIStore.getState().openTabs[1].conversationId).toBe('conv-3');
    expect(useUIStore.getState().activeTabIndex).toBe(1);
  });

  it('should handle closing last tab', () => {
    useUIStore.getState().openTab('conv-1', 'Only Tab');
    useUIStore.getState().closeTab(0);
    expect(useUIStore.getState().openTabs).toHaveLength(0);
    expect(useUIStore.getState().activeTabIndex).toBe(-1);
  });

  it('should handle closing tab with invalid index', () => {
    useUIStore.getState().openTab('conv-1', 'Tab');
    useUIStore.getState().closeTab(-1);
    expect(useUIStore.getState().openTabs).toHaveLength(1);

    useUIStore.getState().closeTab(99);
    expect(useUIStore.getState().openTabs).toHaveLength(1);
  });

  it('should set active tab', () => {
    useUIStore.getState().openTab('conv-1', 'Tab 1');
    useUIStore.getState().openTab('conv-2', 'Tab 2');
    useUIStore.getState().setActiveTab(0);
    expect(useUIStore.getState().activeTabIndex).toBe(0);
    useUIStore.getState().setActiveTab(1);
    expect(useUIStore.getState().activeTabIndex).toBe(1);
  });

  it('should set generating state', () => {
    expect(useUIStore.getState().isGenerating).toBe(false);
    useUIStore.getState().setGenerating(true);
    expect(useUIStore.getState().isGenerating).toBe(true);
    useUIStore.getState().setGenerating(false);
    expect(useUIStore.getState().isGenerating).toBe(false);
  });

  it('should add and remove toasts', () => {
    useUIStore.getState().addToast('Hello World', 'success');
    const toasts = useUIStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Hello World');
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].id).toMatch(/^toast-/);

    useUIStore.getState().addToast('Error occurred', 'error');
    expect(useUIStore.getState().toasts).toHaveLength(2);

    // Remove first toast
    useUIStore.getState().removeToast(toasts[0].id);
    expect(useUIStore.getState().toasts).toHaveLength(1);
    expect(useUIStore.getState().toasts[0].message).toBe('Error occurred');
  });

  it('should handle removing non-existent toast id', () => {
    useUIStore.getState().addToast('Test', 'info');
    useUIStore.getState().removeToast('non-existent-id');
    expect(useUIStore.getState().toasts).toHaveLength(1);
  });

  it('should set selected model', () => {
    useUIStore.getState().setSelectedModel('gpt-4');
    expect(useUIStore.getState().selectedModel).toBe('gpt-4');
    useUIStore.getState().setSelectedModel(null);
    expect(useUIStore.getState().selectedModel).toBeNull();
  });

  it('should set selected expert', () => {
    useUIStore.getState().setSelectedExpert('expert-1');
    expect(useUIStore.getState().selectedExpert).toBe('expert-1');
    useUIStore.getState().setSelectedExpert(null);
    expect(useUIStore.getState().selectedExpert).toBeNull();
  });

  it('should set selected mode', () => {
    useUIStore.getState().setSelectedMode('plan');
    expect(useUIStore.getState().selectedMode).toBe('plan');
    useUIStore.getState().setSelectedMode('action');
    expect(useUIStore.getState().selectedMode).toBe('action');
  });

  it('should set connection status', () => {
    useUIStore.getState().setConnectionStatus('connected');
    expect(useUIStore.getState().connectionStatus).toBe('connected');

    useUIStore.getState().setConnectionStatus('connecting');
    expect(useUIStore.getState().connectionStatus).toBe('connecting');

    useUIStore.getState().setConnectionStatus('disconnected');
    expect(useUIStore.getState().connectionStatus).toBe('disconnected');
  });
});
