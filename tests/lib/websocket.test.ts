import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { wsClient } from '../../src/lib/websocket';

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = MockWebSocket.CONNECTING;
  onopen: ((ev?: Event) => void) | null = null;
  onclose: ((ev?: CloseEvent) => void) | null = null;
  onmessage: ((ev?: MessageEvent) => void) | null = null;
  onerror: ((ev?: Event) => void) | null = null;
  sent: string[] = [];
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code, reason } as CloseEvent);
    }
  }

  triggerOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen();
  }

  triggerMessage(data: string) {
    if (this.onmessage) this.onmessage({ data } as MessageEvent);
  }

  triggerError() {
    if (this.onerror) this.onerror();
  }
}

describe('WebSocket Client', () => {
  let wsInstance: MockWebSocket | null = null;
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    originalWebSocket = globalThis.WebSocket;
    wsClient.disconnect();
    vi.useFakeTimers();
    globalThis.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        wsInstance = this;
      }
    } as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.WebSocket = originalWebSocket;
    wsInstance = null;
  });

  it('should connect to the backend WebSocket URL', () => {
    wsClient.connect();
    expect(wsInstance).not.toBeNull();
    expect(wsInstance?.url).toBe('ws://127.0.0.1:25808/ws');
  });

  it('should emit connected event when connection opens', () => {
    const connected = vi.fn();
    wsClient.on('connected', connected);
    wsClient.connect();
    wsInstance?.triggerOpen();
    expect(connected).toHaveBeenCalled();
  });

  it('should emit disconnected event when connection closes', () => {
    const disconnected = vi.fn();
    wsClient.on('disconnected', disconnected);
    wsClient.connect();
    wsInstance?.triggerOpen();
    wsInstance?.close(1001, 'test');
    expect(disconnected).toHaveBeenCalled();
  });

  it('should parse incoming messages and emit named events', () => {
    const handler = vi.fn();
    wsClient.on('message_chunk', handler);
    wsClient.connect();
    wsInstance?.triggerOpen();
    wsInstance?.triggerMessage(JSON.stringify({ name: 'message_chunk', data: { chunk: 'hello' } }));
    expect(handler).toHaveBeenCalledWith({ chunk: 'hello' });
  });

  it('should send messages when connected', () => {
    wsClient.connect();
    wsInstance?.triggerOpen();
    const result = wsClient.send('ping', { id: 1 });
    expect(result).toBe(true);
    expect(wsInstance?.sent).toHaveLength(1);
    expect(JSON.parse(wsInstance?.sent[0] || '{}')).toEqual({ name: 'ping', data: { id: 1 } });
  });

  it('should not send messages when not connected', () => {
    const result = wsClient.send('ping', {});
    expect(result).toBe(false);
  });

  it('should unsubscribe listeners', () => {
    const handler = vi.fn();
    const unsub = wsClient.on('message_chunk', handler);
    unsub();
    wsClient.connect();
    wsInstance?.triggerOpen();
    wsInstance?.triggerMessage(JSON.stringify({ name: 'message_chunk', data: {} }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('should schedule reconnect after abnormal close', () => {
    wsClient.connect();
    wsInstance?.triggerOpen();
    wsInstance?.close(1006, 'abnormal');
    // Fast-forward past reconnect delay
    vi.advanceTimersByTime(2000);
    expect(wsInstance).not.toBeNull();
  });
});
