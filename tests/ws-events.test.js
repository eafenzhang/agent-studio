/**
 * Tests for ws-events.js - WebSocket Event Constants
 */
import { describe, it, expect } from 'vitest';
import { WS_EVENTS } from '../src/ws-events.js';

describe('WS_EVENTS Constants', () => {
  it('should export an object', () => {
    expect(typeof WS_EVENTS).toBe('object');
    expect(WS_EVENTS).not.toBeNull();
  });

  it('should have MESSAGE_CHUNK event with correct value', () => {
    expect(WS_EVENTS.MESSAGE_CHUNK).toBe('message_chunk');
  });

  it('should have TOOL_CALL_START event with correct value', () => {
    expect(WS_EVENTS.TOOL_CALL_START).toBe('tool_call_start');
  });

  it('should have TOOL_CALL_RESULT event with correct value', () => {
    expect(WS_EVENTS.TOOL_CALL_RESULT).toBe('tool_call_result');
  });

  it('should have TASK_STEP_UPDATE event with correct value', () => {
    expect(WS_EVENTS.TASK_STEP_UPDATE).toBe('task_step_update');
  });

  it('should have STREAM_END event with correct value', () => {
    expect(WS_EVENTS.STREAM_END).toBe('stream_end');
  });

  it('should have STREAM_ERROR event with correct value', () => {
    expect(WS_EVENTS.STREAM_ERROR).toBe('stream_error');
  });

  it('should have CONNECTED event with correct value', () => {
    expect(WS_EVENTS.CONNECTED).toBe('connected');
  });

  it('should have DISCONNECTED event with correct value', () => {
    expect(WS_EVENTS.DISCONNECTED).toBe('disconnected');
  });

  it('should have RECONNECT_FAILED event with correct value', () => {
    expect(WS_EVENTS.RECONNECT_FAILED).toBe('reconnect_failed');
  });

  it('should have exactly 9 event constants', () => {
    const keys = Object.keys(WS_EVENTS);
    expect(keys).toHaveLength(9);
  });

  it('should have all string values', () => {
    Object.values(WS_EVENTS).forEach((value) => {
      expect(typeof value).toBe('string');
    });
  });

  it('should have unique values', () => {
    const values = Object.values(WS_EVENTS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});
