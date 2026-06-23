import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useConversationStream } from '../../src/hooks/use-conversation-stream';

// ===================================================================
// Mocks
// ===================================================================

const { mockWsConnect, mockWsOn, mockSendMessage, mockCancelConv } = vi.hoisted(() => ({
  mockWsConnect: vi.fn(),
  mockWsOn: vi.fn().mockReturnValue(() => {}),
  mockSendMessage: vi.fn().mockResolvedValue({ msg_id: 'msg-1' }),
  mockCancelConv: vi.fn().mockResolvedValue(undefined),
}));

// We need to control WS event listeners from the test
let wsListeners: Record<string, (data: unknown) => void> = {};

vi.mock('../../src/lib/websocket', () => ({
  wsClient: {
    connect: mockWsConnect,
    on: (event: string, cb: (data: unknown) => void) => {
      wsListeners[event] = cb;
      return () => { delete wsListeners[event]; };
    },
    isConnected: true,
  },
}));

vi.mock('../../src/lib/api', () => ({
  sendMessage: mockSendMessage,
  cancelConversation: mockCancelConv,
}));

vi.mock('../../src/stores/chat-store', () => ({
  useChatStore: Object.assign(
    (selector?: (s: any) => any) => {
      const state = {
        messages: {},
        appendChunk: vi.fn(),
        flushMessage: vi.fn(),
        startStreaming: vi.fn(),
        setError: vi.fn(),
        addToolCall: vi.fn(),
        updateToolCall: vi.fn(),
        setTaskSteps: vi.fn(),
        updateTaskStep: vi.fn(),
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        messages: {},
        appendChunk: vi.fn(),
        flushMessage: vi.fn(),
        startStreaming: vi.fn(),
        setError: vi.fn(),
        addToolCall: vi.fn(),
        updateToolCall: vi.fn(),
        setTaskSteps: vi.fn(),
        updateTaskStep: vi.fn(),
      }),
    },
  ),
}));

vi.mock('../../src/stores/ui-store', () => ({
  useUIStore: Object.assign(
    (selector?: (s: any) => any) => {
      const state = {
        addToast: vi.fn(),
        setGenerating: vi.fn(),
        connectionStatus: 'connected' as const,
        isGenerating: false,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        addToast: vi.fn(),
        setGenerating: vi.fn(),
        connectionStatus: 'connected' as const,
        isGenerating: false,
      }),
    },
  ),
}));

// ===================================================================
// Tests
// ===================================================================

describe('useConversationStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wsListeners = {};
    mockWsOn.mockReturnValue(() => {});
  });

  // ===============================================================
  // Initial state
  // ===============================================================

  it('starts with default empty state', () => {
    const { result } = renderHook(() =>
      useConversationStream('conv-1', { sendMessage: mockSendMessage as any }),
    );

    expect(result.current.content).toBe('');
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.toolCalls).toEqual([]);
    expect(result.current.taskSteps).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('connects WebSocket on mount', () => {
    renderHook(() =>
      useConversationStream('conv-1', { sendMessage: mockSendMessage as any }),
    );
    expect(mockWsConnect).toHaveBeenCalled();
  });

  // ===============================================================
  // Send
  // ===============================================================

  it('sends a message and returns messageId', async () => {
    const { result } = renderHook(() =>
      useConversationStream('conv-1', { sendMessage: mockSendMessage as any }),
    );

    let msgId: string | null = null;

    await act(async () => {
      msgId = await result.current.send('Hello');
    });

    expect(mockSendMessage).toHaveBeenCalledWith('conv-1', { content: 'Hello' });
    expect(msgId).toBe('msg-1');
  });

  it('sends with options (model, mode, expert)', async () => {
    const { result } = renderHook(() =>
      useConversationStream('conv-1', { sendMessage: mockSendMessage as any }),
    );

    await act(async () => {
      await result.current.send('Analyze this', {
        model: 'gpt-4o',
        mode: 'plan',
        assistant_id: 'expert-1',
      });
    });

    expect(mockSendMessage).toHaveBeenCalledWith('conv-1', {
      content: 'Analyze this',
      model: 'gpt-4o',
      mode: 'plan',
      assistant_id: 'expert-1',
    });
  });

  it('sends with tool options (skills, MCP)', async () => {
    const { result } = renderHook(() =>
      useConversationStream('conv-1', { sendMessage: mockSendMessage as any }),
    );

    await act(async () => {
      await result.current.send('Use tools', {
        inject_skills: ['skill-1'],
        mcp_tools: ['mcp-1'],
      });
    });

    expect(mockSendMessage).toHaveBeenCalledWith('conv-1', {
      content: 'Use tools',
      inject_skills: ['skill-1'],
      mcp_tools: ['mcp-1'],
    });
  });

  // ===============================================================
  // WS event: message_chunk
  // ===============================================================

  it('appends chunks via WebSocket message_chunk event', async () => {
    const { result } = renderHook(
      () => useConversationStream('conv-1', {
        sendMessage: mockSendMessage as any,
        syncFlush: true,  // bypass rAF for test compatibility
      }),
    );

    // Send first to set up activeMsgId
    await act(async () => {
      await result.current.send('Hello');
    });

    expect(result.current.isStreaming).toBe(true);

    // Simulate WS chunk — syncFlush updates React state immediately
    act(() => {
      expect(typeof wsListeners.message_chunk).toBe('function');
      wsListeners.message_chunk({ message_id: 'msg-1', conversation_id: 'conv-1', chunk: 'Hello' });
    });

    // Content should be updated synchronously
    expect(result.current.content).toBe('Hello');

    // Second chunk
    act(() => {
      wsListeners.message_chunk({ message_id: 'msg-1', conversation_id: 'conv-1', chunk: ' World' });
    });

    expect(result.current.content).toBe('Hello World');
  });

  it('filters chunks for other conversations', async () => {
    const { result } = renderHook(() =>
      useConversationStream('conv-1', { sendMessage: mockSendMessage as any }),
    );

    await act(async () => {
      await result.current.send('Hello');
    });

    act(() => {
      wsListeners.message_chunk({ message_id: 'other', conversation_id: 'other-conv', chunk: 'Should be ignored' });
    });

    // No content update expected
    expect(result.current.content).toBe('');
  });

  // ===============================================================
  // WS event: tool_call_start / tool_call_result
  // ===============================================================

  it('tracks tool calls from WS events', async () => {
    const { result } = renderHook(() =>
      useConversationStream('conv-1', { sendMessage: mockSendMessage as any }),
    );

    await act(async () => {
      await result.current.send('Use tools');
    });

    act(() => {
      wsListeners.tool_call_start({
        message_id: 'msg-1',
        tool_call_id: 'tc-1',
        tool_name: 'read_file',
        arguments: { path: '/tmp/test' },
      });
    });

    expect(result.current.toolCalls).toHaveLength(1);
    expect(result.current.toolCalls[0].name).toBe('read_file');
    expect(result.current.toolCalls[0].status).toBe('running');

    act(() => {
      wsListeners.tool_call_result({
        message_id: 'msg-1',
        tool_call_id: 'tc-1',
        result: 'file content',
        status: 'completed',
      });
    });

    expect(result.current.toolCalls[0].status).toBe('done');
    expect(result.current.toolCalls[0].result).toBe('file content');
  });

  // ===============================================================
  // WS event: task_step_update
  // ===============================================================

  it('tracks task steps from WS events (full array)', async () => {
    const { result } = renderHook(() =>
      useConversationStream('conv-1', { sendMessage: mockSendMessage as any }),
    );

    await act(async () => {
      await result.current.send('Do multi-step task');
    });

    act(() => {
      wsListeners.task_step_update({
        message_id: 'msg-1',
        steps: [
          { id: 's1', label: '分析需求', status: 'done' },
          { id: 's2', label: '执行任务', status: 'running' },
        ],
      });
    });

    expect(result.current.taskSteps).toHaveLength(2);
    expect(result.current.taskSteps[0].label).toBe('分析需求');
    expect(result.current.taskSteps[0].status).toBe('done');
    expect(result.current.taskSteps[1].label).toBe('执行任务');
    expect(result.current.taskSteps[1].status).toBe('running');
  });

  it('tracks task steps from WS events (individual update)', async () => {
    const { result } = renderHook(() =>
      useConversationStream('conv-1', { sendMessage: mockSendMessage as any }),
    );

    await act(async () => {
      await result.current.send('Do multi-step task');
    });

    // Set initial steps
    act(() => {
      wsListeners.task_step_update({
        message_id: 'msg-1',
        steps: [
          { id: 's1', label: '步骤1', status: 'running' },
        ],
      });
    });

    // Update individual step
    act(() => {
      wsListeners.task_step_update({
        message_id: 'msg-1',
        step_id: 's1',
        label: '步骤1',
        status: 'done',
      });
    });

    expect(result.current.taskSteps[0].status).toBe('done');
  });

  // ===============================================================
  // WS event: stream_end
  // ===============================================================

  it('stops streaming on stream_end', async () => {
    const { result } = renderHook(() =>
      useConversationStream('conv-1', { sendMessage: mockSendMessage as any }),
    );

    await act(async () => {
      await result.current.send('Hello');
    });

    expect(result.current.isStreaming).toBe(true);

    act(() => {
      wsListeners.stream_end({ message_id: 'msg-1', conversation_id: 'conv-1' });
    });

    expect(result.current.isStreaming).toBe(false);
  });

  // ===============================================================
  // WS event: stream_error
  // ===============================================================

  it('sets error on stream_error', async () => {
    const { result } = renderHook(() =>
      useConversationStream('conv-1', { sendMessage: mockSendMessage as any }),
    );

    await act(async () => {
      await result.current.send('Hello');
    });

    act(() => {
      wsListeners.stream_error({
        message_id: 'msg-1',
        conversation_id: 'conv-1',
        error: 'API error',
      });
    });

    expect(result.current.error).toBe('API error');
    expect(result.current.isStreaming).toBe(false);
  });

  // ===============================================================
  // Cancel
  // ===============================================================

  it('cancels generation', async () => {
    const { result } = renderHook(() =>
      useConversationStream('conv-1', { sendMessage: mockSendMessage as any }),
    );

    await act(async () => {
      await result.current.send('Hello');
    });

    expect(result.current.isStreaming).toBe(true);

    await act(async () => {
      await result.current.cancel();
    });

    expect(result.current.isStreaming).toBe(false);
  });
});
