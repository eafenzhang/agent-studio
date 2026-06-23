import type { StreamChunk } from '../types';

const WS_URL = import.meta.env.VITE_AION_WS_URL || 'ws://localhost:25808/ws';

type EventHandler = (data: any) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _connected = false;
  private _connecting = false;
  private _convStreamHandlers = new Map<string, Set<(chunk: StreamChunk) => void>>();
  private _convEndHandlers = new Map<string, Set<() => void>>();
  private _convErrorHandlers = new Map<string, Set<(err: string) => void>>();

  get connected() { return this._connected; }

  connect(): Promise<void> {
    if (this._connecting) return Promise.reject(new Error('already connecting'));
    this._connecting = true;
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) { this._connecting = false; resolve(); return; }
      // 清理旧 WS 的 onclose 避免重连竞争
      if (this.ws) { this.ws.onclose = null; this.ws.onerror = null; }
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this._connected = true;
        this._connecting = false;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // 后端推送格式: { name: "message.stream", data: { conversation_id, msg_id, type, data } }
          if (msg.name === 'message.stream' && msg.data) {
            const d = msg.data;
            const chunk: StreamChunk = {
              type: this.mapEventType(d.type || ''),
              content: d.data?.content || '',
              toolCall: d.type === 'tool_call' ? {
                id: d.data?.call_id || d.msg_id || '',
                name: d.data?.name || '',
                args: JSON.stringify(d.data?.arguments || d.data?.args || {}),
                status: 'running',
              } : undefined,
            };
            // 派发给订阅此会话的监听器
            const convHandlers = this._convStreamHandlers.get(d.conversation_id);
            if (convHandlers) convHandlers.forEach(h => h(chunk));

            // type === 'finish' 时通知结束
            if (d.type === 'finish') {
              const endHandlers = this._convEndHandlers.get(d.conversation_id);
              if (endHandlers) endHandlers.forEach(h => h());
              this._convStreamHandlers.delete(d.conversation_id);
              this._convEndHandlers.delete(d.conversation_id);
              this._convErrorHandlers.delete(d.conversation_id);
            }
            if (d.type === 'error') {
              const errMsg = d.data?.content || 'AI 处理出错';
              const errHandlers = this._convErrorHandlers.get(d.conversation_id);
              if (errHandlers) errHandlers.forEach(h => h(errMsg));
            }
          }
          this.dispatch(msg.name, msg.data);
        } catch { /* ignore parse errors */ }
      };

      this.ws.onclose = () => {
        this._connected = false;
        this._connecting = false;
        this.scheduleReconnect();
      };
      this.ws.onerror = () => { this._connecting = false; reject(new Error('WebSocket connection failed')); };
    });
  }

  disconnect() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close(); this.ws = null; this._connected = false;
  }

  /** 订阅某个会话的流式消息 */
  subscribeConversationStream(
    convId: string,
    callbacks: {
      onChunk?: (chunk: StreamChunk) => void;
      onDone?: () => void;
      onError?: (err: string) => void;
    },
  ) {
    if (callbacks.onChunk) {
      if (!this._convStreamHandlers.has(convId)) this._convStreamHandlers.set(convId, new Set());
      this._convStreamHandlers.get(convId)!.add(callbacks.onChunk);
    }
    if (callbacks.onDone) {
      if (!this._convEndHandlers.has(convId)) this._convEndHandlers.set(convId, new Set());
      this._convEndHandlers.get(convId)!.add(callbacks.onDone);
    }
    if (callbacks.onError) {
      if (!this._convErrorHandlers.has(convId)) this._convErrorHandlers.set(convId, new Set());
      this._convErrorHandlers.get(convId)!.add(callbacks.onError);
    }
    return () => {
      if (callbacks.onChunk) this._convStreamHandlers.get(convId)?.delete(callbacks.onChunk);
      if (callbacks.onDone) this._convEndHandlers.get(convId)?.delete(callbacks.onDone);
      if (callbacks.onError) this._convErrorHandlers.get(convId)?.delete(callbacks.onError);
    };
  }

  private mapEventType(t: string): StreamChunk['type'] {
    switch (t) {
      case 'content': return 'text';
      case 'tool_call': return 'tool_call';
      case 'tool_result': return 'tool_result';
      case 'error': return 'error';
      case 'finish': return 'done';
      default: return 'text';
    }
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  off(event: string, handler: EventHandler) { this.handlers.get(event)?.delete(handler); }

  private dispatch(event: string, data: any) {
    this.handlers.get(event)?.forEach(fn => fn(data));
    this.handlers.get('*')?.forEach(fn => fn({ event, data }));
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, 3000);
  }
}

export const wsClient = new WsClient();
