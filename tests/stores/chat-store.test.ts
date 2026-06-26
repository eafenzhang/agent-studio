import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../../src/stores/chat-store';

describe('chat-store', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useChatStore.setState({ messages: {} });
  });

  it('should start with empty messages', () => {
    expect(useChatStore.getState().messages).toEqual({});
  });

  it('should start streaming a message', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    const key = 'conv-1:msg-1';
    const msg = useChatStore.getState().messages[key];
    expect(msg).toBeDefined();
    expect(msg.isStreaming).toBe(true);
    expect(msg.content).toBe('');
  });

  it('should append chunks to a streaming message', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    useChatStore.getState().appendChunk('conv-1', 'msg-1', 'Hello ');
    useChatStore.getState().appendChunk('conv-1', 'msg-1', 'world');
    const key = 'conv-1:msg-1';
    expect(useChatStore.getState().messages[key].content).toBe('Hello world');
  });

  it('should flush a message (stop streaming and return it)', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    useChatStore.getState().appendChunk('conv-1', 'msg-1', 'Done');
    const flushed = useChatStore.getState().flushMessage('conv-1', 'msg-1');
    expect(flushed).toBeDefined();
    expect(flushed!.content).toBe('Done');
    expect(flushed!.isStreaming).toBe(false);
  });

  it('should set error on a message', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    useChatStore.getState().setError('conv-1', 'msg-1', 'Connection failed');
    const key = 'conv-1:msg-1';
    expect(useChatStore.getState().messages[key].error).toBe('Connection failed');
    expect(useChatStore.getState().messages[key].isStreaming).toBe(false);
  });

  it('should add and update tool calls', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    useChatStore.getState().addToolCall('conv-1', 'msg-1', { id: 'tc-1', name: 'read_file', args: {}, status: 'running' });
    const key = 'conv-1:msg-1';
    expect(useChatStore.getState().messages[key].toolCalls).toHaveLength(1);
    expect(useChatStore.getState().messages[key].toolCalls[0].name).toBe('read_file');
    useChatStore.getState().updateToolCall('conv-1', 'msg-1', 'tc-1', { status: 'done' });
    expect(useChatStore.getState().messages[key].toolCalls[0].status).toBe('done');
  });

  it('should set task steps', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    useChatStore.getState().setTaskSteps('conv-1', 'msg-1', [{ id: 's1', label: '分析', status: 'running' }]);
    const key = 'conv-1:msg-1';
    expect(useChatStore.getState().messages[key].taskSteps).toHaveLength(1);
    useChatStore.getState().updateTaskStep('conv-1', 'msg-1', 's1', { status: 'done' });
    expect(useChatStore.getState().messages[key].taskSteps[0].status).toBe('done');
  });

  it('should clear all messages for a conversation', () => {
    useChatStore.getState().startStreaming('conv-1', 'msg-1');
    useChatStore.getState().startStreaming('conv-1', 'msg-2');
    useChatStore.getState().startStreaming('conv-2', 'msg-1');
    useChatStore.getState().clearMessages('conv-1');
    const msgs = useChatStore.getState().messages;
    expect(Object.keys(msgs).filter(k => k.startsWith('conv-1:'))).toHaveLength(0);
    expect(Object.keys(msgs).filter(k => k.startsWith('conv-2:'))).toHaveLength(1);
  });
});
