/**
 * AionCore WebSocket 客户端
 *
 * 处理实时消息流式推送和事件广播。
 * - 流式对话响应（type: 'stream' 事件）
 * - 会话列表变更通知
 * - 工具调用状态更新
 */

import type { StreamChunk } from '../types';

const WS_URL = import.meta.env.VITE_AION_WS_URL || 'ws://localhost:25808/ws';

type EventHandler = (data: any) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _connected = false;

  get connected() {
    return this._connected;
  }

  // ── 生命周期 ─────────────────────────────────

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const url = token ? `${WS_URL}?token=${token}` : WS_URL;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this._connected = true;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.dispatch(msg.name || msg.type, msg.data || msg);
        } catch {
          // 忽略解析失败的 message
        }
      };

      this.ws.onclose = () => {
        this._connected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        reject(new Error('WebSocket connection failed'));
      };
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this._connected = false;
  }

  // ── 事件订阅 ─────────────────────────────────

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  off(event: string, handler: EventHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  // ── 发送 ─────────────────────────────────────

  send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // ── 流式对话快捷方法 ─────────────────────────

  /** 发送消息并监听流式响应 */
  sendStreamingMessage(
    conversationId: string,
    content: string,
    callbacks: {
      onText?: (chunk: string) => void;
      onToolCall?: (call: StreamChunk['toolCall']) => void;
      onDone?: () => void;
      onError?: (err: string) => void;
    },
  ) {
    const unsubs: (() => void)[] = [];

    const handleChunk = (chunk: StreamChunk) => {
      switch (chunk.type) {
        case 'text':
          callbacks.onText?.(chunk.content || '');
          break;
        case 'tool_call':
          callbacks.onToolCall?.(chunk.toolCall);
          break;
        case 'done':
          cleanup();
          callbacks.onDone?.();
          break;
        case 'error':
          cleanup();
          callbacks.onError?.(chunk.error || 'Unknown error');
          break;
      }
    };

    const cleanup = () => {
      unsubs.forEach((fn) => fn());
    };

    unsubs.push(this.on('conversation.streamChunk', handleChunk));
    unsubs.push(this.on('conversation.streamError', (data: { error: string }) => {
      cleanup();
      callbacks.onError?.(data.error);
    }));
    unsubs.push(this.on('conversation.streamEnd', () => {
      cleanup();
      callbacks.onDone?.();
    }));

    this.send({
      type: 'conversation.sendMessage',
      data: { conversationId, content },
    });

    return cleanup;
  }

  // ── 私有方法 ─────────────────────────────────

  private dispatch(event: string, data: any) {
    this.handlers.get(event)?.forEach((fn) => fn(data));
    // 也触发通配符监听
    this.handlers.get('*')?.forEach((fn) => fn({ event, data }));
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, 3000);
  }
}

/** 全局单例 */
export const wsClient = new WsClient();
