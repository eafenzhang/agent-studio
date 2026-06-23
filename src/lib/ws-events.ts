/**
 * Agent Studio — WebSocket Event Types & Validators
 *
 * The backend AionCore sends all agent events under a single WS event name
 * `message.stream`. The `data.type` field discriminates the subtype:
 *
 *   { "name": "message.stream", "data": {
 *       "conversation_id": "...",
 *       "msg_id": "...",
 *       "turn_id": "...",
 *       "type": "content" | "thinking" | "tips" | "tool_call" | "finish" | "error" | "agent_status" | "plan" | ...,
 *       "data": { ... subtype payload ... },
 *       "hidden": false
 *   }}
 *
 * This module provides:
 * 1. Typed interfaces for the wire format and each subtype
 * 2. A dispatch function that routes message.stream by `type`
 * 3. Runtime validators (never throw, log warnings in dev)
 */

// ===================================================================
// Event Name Constants
// ===================================================================

export const WS_EVENTS = {
  // Connection lifecycle
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECT_FAILED: 'reconnect_failed',

  /** The sole backend agent-stream event — dispatch by data.type */
  MESSAGE_STREAM: 'message.stream',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

// ===================================================================
// Backend Agent Event Subtypes (data.type values)
// ===================================================================

export const AGENT_EVENT_TYPES = {
  CONTENT: 'content',
  THINKING: 'thinking',
  TIPS: 'tips',
  TOOL_CALL: 'tool_call',
  ACP_TOOL_CALL: 'acp_tool_call',
  FINISH: 'finish',
  ERROR: 'error',
  AGENT_STATUS: 'agent_status',
  PLAN: 'plan',
  PERMISSION: 'permission',
  ACP_PERMISSION: 'acp_permission',
  SKILL_SUGGEST: 'skill_suggest',
  CRON_TRIGGER: 'cron_trigger',
  SYSTEM: 'system',
} as const;

export type AgentEventType = (typeof AGENT_EVENT_TYPES)[keyof typeof AGENT_EVENT_TYPES];

// ===================================================================
// Wire Format
// ===================================================================

/** Every `message.stream` payload has this envelope. */
export interface MessageStreamEnvelope {
  conversation_id?: string;
  msg_id?: string;
  turn_id?: string;
  /** The event subtype — `content`, `thinking`, `tips`, etc. */
  type: string;
  /** Subtype-specific payload. */
  data: Record<string, unknown>;
  /** If true, the UI should render this event invisibly (e.g. for mid-turn continuation). */
  hidden?: boolean;
}

// ===================================================================
// Subtype Payloads
// ===================================================================

/** `content` — streaming text fragment */
export interface ContentEventData {
  content: string;
}

/** `thinking` — the agent's chain-of-thought / reasoning */
export interface ThinkingEventData {
  content?: string;
  thought?: string;
}

/** `tips` — informational messages from the agent */
export interface TipsEventData {
  content: string;
  type?: 'error' | 'info' | 'success' | 'warning';
  code?: string;
  params?: Record<string, unknown>;
}

/** `tool_call` — tool invocation */
export interface ToolCallEventData {
  tool_call_id?: string;
  tool_name?: string;
  arguments?: Record<string, unknown>;
  result?: string;
  status?: string;
  error?: string;
  duration?: number;
}

/** `finish` — the turn/response is complete */
export interface FinishEventData {
  status?: string;
  artifacts?: Array<{ id?: string; name?: string; type?: string; url?: string }>;
}

/** `error` — an error during processing */
export interface ErrorEventData {
  code?: string;
  message?: string;
  error?: string;
}

/** `agent_status` — agent state change */
export interface AgentStatusEventData {
  status?: string;
  agent_name?: string;
}

/** `plan` — the agent's plan for a multi-step task */
export interface PlanEventData {
  steps?: Array<{ description?: string; status?: string; agent?: string }>;
  plan?: string;
}

// ===================================================================
// Dispatched Event Union
// ===================================================================

export type DispatchedAgentEvent =
  | { type: typeof AGENT_EVENT_TYPES.CONTENT; data: ContentEventData; envelope: MessageStreamEnvelope }
  | { type: typeof AGENT_EVENT_TYPES.THINKING; data: ThinkingEventData; envelope: MessageStreamEnvelope }
  | { type: typeof AGENT_EVENT_TYPES.TIPS; data: TipsEventData; envelope: MessageStreamEnvelope }
  | { type: typeof AGENT_EVENT_TYPES.TOOL_CALL; data: ToolCallEventData; envelope: MessageStreamEnvelope }
  | { type: typeof AGENT_EVENT_TYPES.FINISH; data: FinishEventData; envelope: MessageStreamEnvelope }
  | { type: typeof AGENT_EVENT_TYPES.ERROR; data: ErrorEventData; envelope: MessageStreamEnvelope }
  | { type: typeof AGENT_EVENT_TYPES.AGENT_STATUS; data: AgentStatusEventData; envelope: MessageStreamEnvelope }
  | { type: typeof AGENT_EVENT_TYPES.PLAN; data: PlanEventData; envelope: MessageStreamEnvelope }
  | { type: string; data: Record<string, unknown>; envelope: MessageStreamEnvelope }; // fallback for unknown types

// ===================================================================
// Runtime Dispatch
// ===================================================================

// Inline dev-only flag — avoids requiring @types/node for `process.env`
const isDev = typeof window !== 'undefined' && (
  (window as any).__DEV__ === true ||
  (window as any).location?.hostname === 'localhost' ||
  (window as any).location?.hostname === '127.0.0.1'
);

/**
 * Parse a raw WS message and dispatch by `data.type`.
 *
 * Usage:
 * ```
 * wsClient.on(WS_EVENTS.MESSAGE_STREAM, (raw) => {
 *   const event = dispatchMessageStreamEvent(raw);
 *   if (!event) return;
 *   switch (event.type) {
 *     case 'content': handleContent(event.data); break;
 *     case 'thinking': handleThinking(event.data); break;
 *     ...
 *   }
 * });
 * ```
 */
export function dispatchMessageStreamEvent(raw: unknown): DispatchedAgentEvent | null {
  const envelope = (raw ?? {}) as Record<string, unknown>;
  const convId = envelope.conversation_id as string | undefined;
  const msgId = envelope.msg_id as string | undefined;
  const turnId = envelope.turn_id as string | undefined;
  const eventType = (envelope.type as string) || '';
  const eventData = (envelope.data as Record<string, unknown>) || {};
  const hidden = envelope.hidden === true;

  if (!eventType) {
    if (isDev) console.warn('[ws-events] message.stream missing type field', envelope);
    return null;
  }

  const base: MessageStreamEnvelope = {
    conversation_id: convId,
    msg_id: msgId,
    turn_id: turnId,
    type: eventType,
    data: eventData,
    hidden,
  };

  // Return typed event. The caller switches on `event.type` to narrow.
  return { type: eventType, data: eventData, envelope: base } as DispatchedAgentEvent;
}

// ===================================================================
// Subtype-Specific Extractors
// ===================================================================

/** Extract content text from a `content` event. */
export function getContentText(data: Record<string, unknown>): string {
  return (data.content as string) ?? '';
}

/** Extract thinking text from a `thinking` event. */
export function getThinkingText(data: Record<string, unknown>): string {
  return (data.content ?? data.thought ?? '') as string;
}

/** Extract tip info from a `tips` event. */
export function getTipsInfo(data: Record<string, unknown>): { content: string; tipType: string } {
  return {
    content: (data.content as string) ?? '',
    tipType: (data.type as string) ?? 'info',
  };
}

/** Extract tool call info from a `tool_call` event (start). */
export function getToolCallInfo(data: Record<string, unknown>): {
  id: string;
  name: string;
  args: Record<string, unknown>;
} {
  return {
    id: (data.tool_call_id as string) ?? `tc-${Date.now()}`,
    name: (data.tool_name as string) ?? 'unknown',
    args: (data.arguments as Record<string, unknown>) ?? {},
  };
}

/** Extract tool call result from a `tool_call` event (completion). */
export function getToolCallResult(data: Record<string, unknown>): {
  id: string;
  result: string;
  status: 'done' | 'error';
  error?: string;
} {
  return {
    id: (data.tool_call_id as string) ?? '',
    result: (data.result as string) ?? '',
    status: data.error ? 'error' : 'done',
    error: data.error as string | undefined,
  };
}

/** Extract error info from an `error` event. */
export function getErrorInfo(data: Record<string, unknown>): string {
  return (data.message ?? data.error ?? data.code ?? 'Unknown error') as string;
}

/** Extract finish status from a `finish` event. */
export function getFinishStatus(data: Record<string, unknown>): string {
  return (data.status as string) ?? 'finish';
}

/** Extract artifacts from a `finish` event. */
export function getFinishArtifacts(data: Record<string, unknown>): Array<{ id?: string; name?: string; type?: string }> {
  return (data.artifacts as Array<{ id?: string; name?: string; type?: string }>) ?? [];
}
