import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatPage from '../../src/pages/ChatPage';
import { useUIStore } from '../../src/stores/ui-store';
import { useChatStore } from '../../src/stores/chat-store';

// ===================================================================
// Hoisted mocks
// ===================================================================

const { mockNavigate, mockSendMessage, mockCancel, mockDeleteConv, mockConversationData } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSendMessage: vi.fn().mockResolvedValue({ msg_id: 'msg-2' }),
  mockCancel: vi.fn(),
  mockDeleteConv: vi.fn().mockResolvedValue(undefined),
  mockConversationData: { id: 'conv-1', name: 'Test Chat' },
}));

// Streaming hook mock state (controlled per-test)
let mockStreamState: Record<string, any> = {
  content: '',
  isStreaming: false,
  toolCalls: [] as any[],
  taskSteps: [] as any[],
  thinkingBlocks: [] as any[],
  error: null as string | null,
  isConnected: true,
};

let mockMessagesData: { items: Array<{ id: string; content: string; position: 'left' | 'right'; toolCalls?: any[]; taskSteps?: any[] }> } = {
  items: [{ id: 'm1', content: 'Hello', position: 'right' }],
};

// ===================================================================
// Module mocks
// ===================================================================

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ convId: 'conv-1' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('../../src/hooks/use-api', () => ({
  useConversation: () => ({ data: mockConversationData, isLoading: false }),
  useMessages: () => ({ data: mockMessagesData, isLoading: false }),
  useDeleteConversation: () => ({ mutateAsync: mockDeleteConv }),
  useAssistants: () => ({ data: [] }),
  useProviders: () => ({ data: [] }),
  useSkills: () => ({ data: [] }),
  useMcpServers: () => ({ data: [] }),
}));

vi.mock('../../src/hooks/use-conversation-stream', () => ({
  useConversationStream: () => ({
    content: mockStreamState.content,
    isStreaming: mockStreamState.isStreaming,
    toolCalls: mockStreamState.toolCalls,
    taskSteps: mockStreamState.taskSteps,
    thinkingBlocks: mockStreamState.thinkingBlocks ?? [],
    error: mockStreamState.error,
    isConnected: mockStreamState.isConnected,
    turnId: null,
    continuationCount: 0,
    send: mockSendMessage,
    cancel: mockCancel,
  }),
}));

vi.mock('../../src/lib/api', () => ({
  healthCheck: vi.fn().mockResolvedValue(true),
  getSkills: vi.fn().mockResolvedValue([]),
  getMcpServers: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn().mockResolvedValue({ msg_id: 'msg-2' }),
}));

// ===================================================================
// Tests
// ===================================================================

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamState = {
      content: '',
      isStreaming: false,
      toolCalls: [],
      taskSteps: [],
      error: null,
      isConnected: true,
    };
    mockMessagesData = {
      items: [{ id: 'm1', content: 'Hello', position: 'right' }],
    };
    useUIStore.setState({
      theme: 'light',
      sidebarOpen: true,
      currentPage: 'home',
      openTabs: [],
      activeTabIndex: -1,
      isGenerating: false,
      toasts: [],
      selectedModel: 'GPT-4o',
      selectedExpert: null,
      selectedMode: 'action',
      connectionStatus: 'connected',
      language: 'zh',
      compactMode: false,
      sendShortcut: 'enter',
      autoUpdateSkills: true,
      lockScreenRemote: false,
      selectedTools: [],
    });
    useChatStore.setState({ messages: {} });
  });

  // ===============================================================
  // Basic rendering
  // ===============================================================

  it('renders the conversation messages from API', () => {
    render(<ChatPage />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders empty state when no messages', () => {
    mockMessagesData = { items: [] };
    render(<ChatPage />);
    expect(screen.getByText(/chat.noMessages/)).toBeInTheDocument();
  });

  // ===============================================================
  // Streaming state
  // ===============================================================

  it('renders streaming content while AI is generating', () => {
    mockStreamState = {
      content: 'AI is thinking...',
      isStreaming: true,
      toolCalls: [],
      taskSteps: [],
      error: null,
      isConnected: true,
    };
    render(<ChatPage />);
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
  });

  it('renders tool call cards from streaming state', () => {
    mockStreamState = {
      content: '',
      isStreaming: true,
      toolCalls: [{ id: 'tc-1', name: 'read_file', args: {}, status: 'running' }],
      taskSteps: [],
      error: null,
      isConnected: true,
    };
    render(<ChatPage />);
    expect(screen.getByText('read_file')).toBeInTheDocument();
    expect(screen.getByText('执行中')).toBeInTheDocument();
  });

  it('renders task progress panel when task steps exist', () => {
    mockStreamState = {
      content: '',
      isStreaming: true,
      toolCalls: [],
      taskSteps: [{ id: 's1', label: '分析需求', status: 'done' }],
      error: null,
      isConnected: true,
    };
    render(<ChatPage />);
    expect(screen.getByText('分析需求')).toBeInTheDocument();
    expect(screen.getByText('1/1 已完成')).toBeInTheDocument();
  });

  it('does NOT render task progress panel when there are no real steps', () => {
    mockStreamState = {
      content: '',
      isStreaming: true,
      toolCalls: [],
      taskSteps: [],
      error: null,
      isConnected: true,
    };
    render(<ChatPage />);
    // The panel should not render at all since steps is empty
    expect(screen.queryByText('任务执行中...')).not.toBeInTheDocument();
  });

  // ===============================================================
  // API message rendering with tool calls / task steps
  // ===============================================================

  it('renders tool calls and task steps from API response', () => {
    mockMessagesData = {
      items: [
        { id: 'm1', content: 'Hello', position: 'right' },
        {
          id: 'm2',
          content: 'API with tool calls',
          position: 'left',
          toolCalls: [{ id: 'tc-api', name: 'search_web', args: { query: 'AI' }, status: 'done' }],
          taskSteps: [{ id: 's-api', label: 'API 步骤', status: 'done' }],
        },
      ],
    };
    render(<ChatPage />);
    expect(screen.getByText('search_web')).toBeInTheDocument();
    expect(screen.getByText('API 步骤')).toBeInTheDocument();
  });

  it('preserves tool calls when API drops them on re-fetch', async () => {
    mockMessagesData = {
      items: [{
        id: 'm1',
        content: 'Persistent',
        position: 'left',
        toolCalls: [{ id: 'tc-1', name: 'read_file', args: {}, status: 'done' }],
        taskSteps: [{ id: 's1', label: '内存步骤', status: 'done' }],
      }],
    };

    const { rerender } = render(<ChatPage />);
    expect(screen.getByText('read_file')).toBeInTheDocument();
    expect(screen.getByText('内存步骤')).toBeInTheDocument();

    // Simulate API refresh that drops the fields
    mockMessagesData = {
      items: [{ id: 'm1', content: 'Persistent', position: 'left' }],
    };
    rerender(<ChatPage />);
    await waitFor(() => {
      expect(screen.getByText('read_file')).toBeInTheDocument();
    });
    expect(screen.getByText('内存步骤')).toBeInTheDocument();
  });

  // ===============================================================
  // Send message
  // ===============================================================

  it('sends a message and calls the hook send function', async () => {
    render(<ChatPage />);
    mockSendMessage.mockClear();

    const textarea = screen.getAllByRole('textbox')[0];
    fireEvent.change(textarea, { target: { value: 'Direct test' } });

    const sendBtn = screen.getByLabelText('home.send');
    expect(sendBtn).not.toBeDisabled();

    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Direct test', expect.any(Object));
    });
  });

  // ===============================================================
  // Stream completion: message appears in list
  // ===============================================================

  it('shows completed streaming message in the message list', () => {
    // Start streaming
    mockStreamState = {
      content: 'Final answer',
      isStreaming: true,
      toolCalls: [{ id: 'tc-1', name: 'read_file', args: {}, status: 'done' }],
      taskSteps: [{ id: 's1', label: '分析需求', status: 'done' }],
      error: null,
      isConnected: true,
    };

    const { rerender } = render(<ChatPage />);
    expect(screen.getByText('Final answer')).toBeInTheDocument();

    // After streaming ends, the content should still be visible
    // (handled by the useEffect that detects isStreaming transition)
    mockStreamState = {
      ...mockStreamState,
      isStreaming: false,
    };
    rerender(<ChatPage />);
    expect(screen.getByText('read_file')).toBeInTheDocument();
  });

  // ===============================================================
  // Error state
  // ===============================================================

  it('renders error state in the streaming message', () => {
    mockStreamState = {
      content: 'Connection failed',
      isStreaming: true,
      toolCalls: [],
      taskSteps: [],
      error: 'Connection failed',
      isConnected: false,
    };

    render(<ChatPage />);
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  // ===============================================================
  // Delete conversation
  // ===============================================================

  it('deletes the conversation and navigates home', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    render(<ChatPage />);

    const deleteButtons = screen.getAllByRole('button', { name: 'chat.delete' });
    // Find the header delete button (not the message-level one)
    const headerDeleteBtn = deleteButtons[0];
    fireEvent.click(headerDeleteBtn);

    await waitFor(() => {
      expect(mockDeleteConv).toHaveBeenCalledWith('conv-1');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
