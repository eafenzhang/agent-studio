/**
 * Legacy type re-exports for backward compatibility.
 * New code should import from './api' or 'lib/websocket' instead.
 */

export interface WsMessage {
  name: string;
  data: unknown;
}
