import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '../../src/pages/HomePage';
import { useUIStore } from '../../src/stores/ui-store';

const { mockNavigate, mockSendMessage, mockCreateConversation, mockHealthCheck } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSendMessage: vi.fn(),
  mockCreateConversation: vi.fn(),
  mockHealthCheck: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh', changeLanguage: vi.fn() } }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../src/hooks/use-api', () => ({
  useAssistants: () => ({ data: [{ id: 'a1', name: 'Assistant 1', name_i18n: { 'zh-CN': '助手1' } }] }),
  useCreateConversation: () => ({ mutateAsync: mockCreateConversation }),
  // These are needed by ChatInputPanel
  useProviders: () => ({ data: [] }),
  useSkills: () => ({ data: [] }),
  useMcpServers: () => ({ data: [] }),
}));

vi.mock('../../src/lib/api', () => ({
  sendMessage: mockSendMessage,
  healthCheck: mockHealthCheck,
}));

vi.mock('../../src/stores/chat-store', () => ({
  useChatStore: {
    getState: () => ({ startStreaming: vi.fn() }),
  },
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      selectedMode: '行动',
      connectionStatus: 'connected',
      language: 'zh',
      compactMode: false,
      sendShortcut: 'enter',
      autoUpdateSkills: true,
      lockScreenRemote: false,
      selectedTools: [],
    });
  });

  it('renders the welcome screen and input', () => {
    render(<HomePage />);
    expect(screen.getByText('Agent Studio')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/输入消息/)).toBeInTheDocument();
  });

  it('sends a message with selected model, mode, expert', async () => {
    mockHealthCheck.mockResolvedValue(true);
    mockCreateConversation.mockResolvedValue({ id: 'conv-1' });
    mockSendMessage.mockResolvedValue({ id: 'msg-1' });

    render(<HomePage />);

    // Select model via dropdown
    const modelBtn = screen.getAllByText('GPT-4o')[0];
    fireEvent.click(modelBtn);
    fireEvent.click(screen.getByText('deepseek-chat'));

    // Select mode via dropdown
    const modeBtn = screen.getAllByText('行动')[0];
    fireEvent.click(modeBtn);
    fireEvent.click(screen.getByText('规划'));

    // Select expert via dropdown (person icon button)
    const expertBtn = document.querySelector('.chat-dropdown [title="选择专家助手"]') || screen.getAllByRole('button').filter(b => b.querySelector('svg')).find(b => b.parentElement?.className?.includes('chat-dropdown'));
    if (expertBtn) fireEvent.click(expertBtn);
    const expertItems = screen.getAllByText('助手1');
    fireEvent.click(expertItems[expertItems.length - 1]);

    // Type and send
    const input = screen.getByPlaceholderText(/输入消息/);
    fireEvent.change(input, { target: { value: 'Hello world' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockCreateConversation).toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalled();
    });

    const payload = mockSendMessage.mock.calls[0][1];
    expect(payload.content).toBe('Hello world');
    expect(payload.model).toBe('deepseek-chat');
    expect(payload.mode).toBe('plan');
    expect(payload.assistant_id).toBe('a1');
  });

  it('shows warning when backend is disconnected', async () => {
    mockHealthCheck.mockResolvedValue(false);
    render(<HomePage />);
    const input = screen.getByPlaceholderText(/输入消息/);
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(mockHealthCheck).toHaveBeenCalled();
    });
    expect(mockCreateConversation).not.toHaveBeenCalled();
  });
});
