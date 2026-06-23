/**
 * Agent Studio WebSocket Client (TypeScript wrapper)
 * Manages real-time communication with the backend.
 */

const WS_BASE_URL = 'ws://127.0.0.1:25808/ws';
const HEARTBEAT_INTERVAL = 25000;
const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_ATTEMPTS = 10;

export type WsEventListener = (data: unknown) => void;

export interface WsMessage {
  name: string;
  data: unknown;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<WsEventListener>> = new Map();
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _isConnected = false;

  get isConnected(): boolean {
    return this._isConnected;
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Connecting to WebSocket...');
    this.ws = new WebSocket(WS_BASE_URL);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this._isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit('connected', null);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message: WsMessage = JSON.parse(event.data as string);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this._isConnected = false;
      this.stopHeartbeat();
      this.emit('disconnected', null);

      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error: Event) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.stopHeartbeat();
    this._isConnected = false;
  }

  send(name: string, data: unknown = {}): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }

    const message = JSON.stringify({ name, data });
    this.ws.send(message);
    return true;
  }

  private handleMessage(message: WsMessage): void {
    const { name, data } = message;
    console.log('Received:', name, data);

    this.emit(name, data);
    this.emit('*', { name, data });
  }

  on(event: string, callback: WsEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: WsEventListener): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  private emit(event: string, data: unknown): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send('ping');
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed', null);
      return;
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);
    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }
}

export const wsClient = new WebSocketClient();
export default wsClient;
