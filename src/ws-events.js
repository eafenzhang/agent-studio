/**
 * Agent Studio Desktop - WebSocket Event Constants
 * Centralized event name registry for all WS communication
 */
export const WS_EVENTS = {
  MESSAGE_CHUNK: 'message_chunk',
  TOOL_CALL_START: 'tool_call_start',
  TOOL_CALL_RESULT: 'tool_call_result',
  TASK_STEP_UPDATE: 'task_step_update',
  STREAM_END: 'stream_end',
  STREAM_ERROR: 'stream_error',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECT_FAILED: 'reconnect_failed',
};

export default WS_EVENTS;
