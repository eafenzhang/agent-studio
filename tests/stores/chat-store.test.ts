import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../../src/stores/chat-store';

describe('Chat Store', () => {
  beforeEach(() => {
    useChatStore.setState({ messages: {} });
  });

  it('should start streaming with empty content', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    const msg = useChatStore.getState().messages['conv-1:msg-1'];
    expect(msg).toBeDefined();
    expect(msg.content).toBe('');
    expect(msg.isStreaming).toBe(true);
    expect(msg.toolCalls).toEqual([]);
    expect(msg.taskSteps).toEqual([]);
    expect(msg.error).toBeNull();
  });

  it('should append chunks', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    useChatStore.getState().appendChunk('conv-1', 'msg-1', 'Hello');
    useChatStore.getState().appendChunk('conv-1', 'msg-1', ' World');
    expect(useChatStore.getState().messages['conv-1:msg-1'].content).toBe('Hello World');
  });

  it('should flush message and stop streaming', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    useChatStore.getState().appendChunk('conv-1', 'msg-1', 'Done');
    useChatStore.getState().flushMessage('conv-1', 'msg-1');
    expect(useChatStore.getState().messages['conv-1:msg-1'].isStreaming).toBe(false);
    expect(useChatStore.getState().messages['conv-1:msg-1'].content).toBe('Done');
  });

  it('should set error and stop streaming', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    useChatStore.getState().setError('conv-1', 'msg-1', 'Something went wrong');
    const msg = useChatStore.getState().messages['conv-1:msg-1'];
    expect(msg.error).toBe('Something went wrong');
    expect(msg.isStreaming).toBe(false);
  });

  it('should add and update tool calls', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    useChatStore.getState().addToolCall('conv-1', 'msg-1', {
      id: 'tc-1',
      name: 'read_file',
      args: { path: '/tmp/foo' },
      status: 'running',
      startedAt: Date.now(),
    });
    expect(useChatStore.getState().messages['conv-1:msg-1'].toolCalls).toHaveLength(1);

    useChatStore.getState().updateToolCall('conv-1', 'msg-1', 'tc-1', {
      status: 'done',
      result: 'file content',
      endedAt: Date.now(),
    });
    const tc = useChatStore.getState().messages['conv-1:msg-1'].toolCalls[0];
    expect(tc.status).toBe('done');
    expect(tc.result).toBe('file content');
  });

  it('should set and update task steps', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    useChatStore.getState().setTaskSteps('conv-1', 'msg-1', [
      { id: 's1', label: '分析需求', status: 'done' },
      { id: 's2', label: '执行任务', status: 'running' },
    ]);
    expect(useChatStore.getState().messages['conv-1:msg-1'].taskSteps).toHaveLength(2);

    useChatStore.getState().updateTaskStep('conv-1', 'msg-1', 's2', { status: 'done' });
    const step = useChatStore.getState().messages['conv-1:msg-1'].taskSteps.find((s) => s.id === 's2');
    expect(step?.status).toBe('done');
  });

  it('should flush message and snapshot tool calls and task steps', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    useChatStore.getState().appendChunk('conv-1', 'msg-1', 'Done');
    useChatStore.getState().addToolCall('conv-1', 'msg-1', {
      id: 'tc-1',
      name: 'read_file',
      args: { path: '/tmp/foo' },
      status: 'done',
      startedAt: Date.now(),
      endedAt: Date.now(),
    });
    useChatStore.getState().setTaskSteps('conv-1', 'msg-1', [
      { id: 's1', label: '分析需求', status: 'done' },
    ]);

    const flushed = useChatStore.getState().flushMessage('conv-1', 'msg-1');

    expect(flushed).toBeDefined();
    expect(flushed?.isStreaming).toBe(false);
    expect(flushed?.content).toBe('Done');
    expect(flushed?.toolCalls).toHaveLength(1);
    expect(flushed?.toolCalls[0].id).toBe('tc-1');
    expect(flushed?.taskSteps).toHaveLength(1);
    expect(flushed?.taskSteps[0].id).toBe('s1');

    const stored = useChatStore.getState().messages['conv-1:msg-1'];
    expect(stored.isStreaming).toBe(false);
    expect(stored.toolCalls[0].id).toBe('tc-1');
    expect(stored.taskSteps[0].id).toBe('s1');
  });

  it('should clear messages for a conversation', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    useChatStore.getState().startStreaming('conv-2', 'msg-2');
    useChatStore.getState().clearMessages('conv-1');
    expect(useChatStore.getState().messages['conv-1:msg-1']).toBeUndefined();
    expect(useChatStore.getState().messages['conv-2:msg-2']).toBeDefined();
  });
});
