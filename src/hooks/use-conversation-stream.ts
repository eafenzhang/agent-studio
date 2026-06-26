/**
 * useConversationStream — single source of truth for AI conversation streaming.
 *
 * Subscribes to the backend's real `message.stream` WS protocol and dispatches
 * by `type`: content, thinking, tips, tool_call, finish, error, agent_status, plan.
 *
 * Supports multi-turn agent behavior:
 * - Multiple content events per turn (system_responses → continuation)
 * - Thinking chain-of-thought blocks
 * - Tips (info/warning/error/success) from the agent
 * - Turn lifecycle tracking (turn_id, continuation count)
 *
 * Key design decisions:
 * 1. Single state tree for streaming content
 * 2. rAF-batched content updates (avoids excessive re-renders)
 * 3. Injectable dependencies (WS client and API can be mocked)
 * 4. Fallback: also listens for legacy v1 events (message_chunk etc.)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { wsClient } from '../lib/websocket';
import * as api from '../lib/api';
import { useChatStore } from '../stores/chat-store';
import { useUIStore } from '../stores/ui-store';
import { useAgentStore } from '../stores/agent-store';
import type { ToolCall, TaskStep } from '../types/api';
import {
  WS_EVENTS,
  dispatchMessageStreamEvent,
  getContentText,
  getThinkingText,
  getTipsInfo,
  getToolCallInfo,
  getToolCallResult,
  getErrorInfo,
  getFinishStatus,
  getFinishArtifacts,
  getPermissionInfo,
  AGENT_EVENT_TYPES,
} from '../lib/ws-events';
import type { DispatchedAgentEvent } from '../lib/ws-events';

// ===================================================================
// Types
// ===================================================================

export interface SendOptions {
  model?: string;
  mode?: string;
  assistant_id?: string;
  inject_skills?: string[];
  mcp_tools?: string[];
  tools?: string[];
}

export interface ThinkingBlock {
  id: string;
  content: string;
  timestamp: number;
}

export interface ConversationStreamState {
  /** Current streaming text content (concatenated). */
  content: string;
  /** Whether the agent is actively generating. */
  isStreaming: boolean;
  /** Active tool calls. */
  toolCalls: ToolCall[];
  /** Active task steps. */
  taskSteps: TaskStep[];
  /** Agent thinking/reasoning blocks. */
  thinkingBlocks: ThinkingBlock[];
  /** Error message (if any). */
  error: string | null;
  /** WebSocket connection state. */
  isConnected: boolean;
  /** Current turn ID (changes when the agent continues). */
  turnId: string | null;
  /** How many times this turn has auto-continued. */
  continuationCount: number;
  /** Pending permission requests awaiting user approval. */
  pendingPermissions: PermissionRequest[];
  /** Stats from the last completed turn. */
  lastTurnStats: TurnStats | null;
  /** Name of the currently active agent (from agent_status event). */
  currentAgentName: string | null;
}

export interface TurnStats {
  runtime: string;
  toolCallCount: number;
  turnId: string;
}

export interface PermissionRequest {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  description: string;
  reason: string;
}

export interface UseConversationStreamReturn extends ConversationStreamState {
  /** Send a message and begin streaming the AI response. */
  send: (text: string, options?: SendOptions) => Promise<string | null>;
  /** Cancel the current generation. */
  cancel: () => Promise<void>;
  /** Approve a pending permission request. */
  approvePermission: (permissionId: string) => void;
  /** Reject a pending permission request. */
  rejectPermission: (permissionId: string) => void;
  /** Approve this tool name for the entire session. */
  approveAlways: (permissionId: string, toolName: string) => void;
}

const WS_CONNECT_TIMEOUT_MS = 8_000;
const RAF_FLUSH_SAFETY_MS = 100;

// ===================================================================
// Hook
// ===================================================================

export function useConversationStream(
  convId: string,
  deps?: {
    sendMessage?: typeof api.sendMessage;
    wsClientOverride?: typeof wsClient;
    syncFlush?: boolean;
  },
): UseConversationStreamReturn {
  const $sendMessage = deps?.sendMessage ?? api.sendMessage;
  const $wsClient = deps?.wsClientOverride ?? wsClient;
  const syncFlush = deps?.syncFlush === true;

  // ---- Store selectors ----
  const addToast = useUIStore((s) => s.addToast);
  const setGenerating = useUIStore((s) => s.setGenerating);
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const chatAppendChunk = useChatStore((s) => s.appendChunk);
  const chatFlushMessage = useChatStore((s) => s.flushMessage);
  const chatStartStreaming = useChatStore((s) => s.startStreaming);
  const chatSetError = useChatStore((s) => s.setError);
  const chatAddToolCall = useChatStore((s) => s.addToolCall);
  const chatUpdateToolCall = useChatStore((s) => s.updateToolCall);
  const chatSetTaskSteps = useChatStore((s) => s.setTaskSteps);
  const chatUpdateTaskStep = useChatStore((s) => s.updateTaskStep);

  // ===============================================================
  // State
  // ===============================================================

  const [displayContent, setDisplayContent] = useState('');
  const bufferRef = useRef('');
  const rafRef = useRef<number>(0);

  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [taskSteps, setTaskSteps] = useState<TaskStep[]>([]);
  const [thinkingBlocks, setThinkingBlocks] = useState<ThinkingBlock[]>([]);
  const MAX_THINKING_BLOCKS = 20;
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnId, setTurnId] = useState<string | null>(null);
  const turnIdRef = useRef<string | null>(null);
  const [continuationCount, setContinuationCount] = useState(0);

  const activeMsgIdRef = useRef<string | null>(null);
  const unsubsRef = useRef<Array<() => void>>([]);
  const mountedRef = useRef(true);
  const hasMessageStreamRef = useRef(false);
  const toolCallTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const TOOL_CALL_TIMEOUT_MS = 120_000;

  // ---- Permission state ----
  const [pendingPermissions, setPendingPermissions] = useState<PermissionRequest[]>([]);
  const autoApprovedRef = useRef<Set<string>>(new Set());

  // ---- Turn stats ----
  const [lastTurnStats, setLastTurnStats] = useState<TurnStats | null>(null);
  const toolCallCountRef = useRef(0);
  const currentRuntimeRef = useRef('');

  // ---- Current agent tracking ----
  const [currentAgentName, setCurrentAgentName] = useState<string | null>(null);
  const agentStoreSetStatus = useAgentStore((s) => s.setAgentStatus);
  const agentStoreClear = useAgentStore((s) => s.clearAgent);

  // ===============================================================
  // rAF-batched content updates
  // ===============================================================

  const appendContent = useCallback(
    (chunk: string) => {
      bufferRef.current += chunk;
      if (syncFlush) {
        if (activeMsgIdRef.current) {
          chatAppendChunk(convId, activeMsgIdRef.current, chunk);
        }
        setDisplayContent((prev) => prev + chunk);
        bufferRef.current = '';
        return;
      }
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          if (bufferRef.current) {
            if (activeMsgIdRef.current) {
              chatAppendChunk(convId, activeMsgIdRef.current, bufferRef.current);
            }
            setDisplayContent((prev) => prev + bufferRef.current);
            bufferRef.current = '';
          }
        });
        setTimeout(() => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
            if (bufferRef.current) {
              if (activeMsgIdRef.current) {
                chatAppendChunk(convId, activeMsgIdRef.current, bufferRef.current);
              }
              setDisplayContent((prev) => prev + bufferRef.current);
              bufferRef.current = '';
            }
          }
        }, RAF_FLUSH_SAFETY_MS);
      }
    },
    [syncFlush, convId, chatAppendChunk],
  );

  // ===============================================================
  // Cleanup helpers
  // ===============================================================

  const cleanupListeners = useCallback(() => {
    unsubsRef.current.forEach((fn) => fn());
    unsubsRef.current = [];
  }, []);

  const stopStreaming = useCallback(() => {
    // Clear all tool call timeouts
    for (const [, timer] of toolCallTimersRef.current) clearTimeout(timer);
    toolCallTimersRef.current.clear();

    // Flush remaining buffer BEFORE clearing activeMsgIdRef
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (bufferRef.current) {
      if (activeMsgIdRef.current) {
        chatAppendChunk(convId, activeMsgIdRef.current, bufferRef.current);
      }
      setDisplayContent((prev) => prev + bufferRef.current);
      bufferRef.current = '';
    }
    setIsStreaming(false);
    setGenerating(false);
    activeMsgIdRef.current = null;
  }, [convId, chatAppendChunk, setGenerating]);

  const resetStreaming = useCallback(() => {
    setIsStreaming(false);
    setGenerating(false);
    activeMsgIdRef.current = null;
    rafRef.current = 0;
    bufferRef.current = '';
  }, [setGenerating]);

  // ===============================================================
  // Core event dispatcher — handles `message.stream` by type
  // ===============================================================

  const handleAgentEvent = useCallback(
    (raw: unknown) => {
      const event = dispatchMessageStreamEvent(raw);
      if (!event) return;

      const { type, envelope } = event;
      const data = event.data as Record<string, unknown>;

      // Mark that we're receiving message.stream protocol
      hasMessageStreamRef.current = true;

      // Filter by conversation and message
      if (envelope.conversation_id && envelope.conversation_id !== convId) return;
      if (envelope.msg_id && envelope.msg_id !== activeMsgIdRef.current) return;

      // Track turn_id (use ref to avoid listener churn)
      if (envelope.turn_id && envelope.turn_id !== turnIdRef.current) {
        turnIdRef.current = envelope.turn_id;
        setTurnId(envelope.turn_id);
      }

      switch (type) {
        // ============ CONTENT (streaming text) ============
        case AGENT_EVENT_TYPES.CONTENT: {
          const text = getContentText(data);
          if (text) appendContent(text);
          break;
        }

        // ============ THINKING (chain-of-thought) ============
        case AGENT_EVENT_TYPES.THINKING: {
          const thought = getThinkingText(data);
          if (thought) {
            setThinkingBlocks((prev) => {
              // Merge with the last block if it was very recent (streaming thought)
              const last = prev[prev.length - 1];
              let updated: ThinkingBlock[];
              if (last && (Date.now() - last.timestamp) < 2000) {
                updated = [...prev];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + thought,
                  timestamp: Date.now(),
                };
              } else {
                updated = [
                  ...prev,
                  { id: `think-${Date.now()}-${prev.length}`, content: thought, timestamp: Date.now() },
                ];
              }
              // Cap at MAX_THINKING_BLOCKS — drop oldest blocks
              if (updated.length > MAX_THINKING_BLOCKS) {
                updated = updated.slice(updated.length - MAX_THINKING_BLOCKS);
              }
              return updated;
            });
          }
          break;
        }

        // ============ TIPS (info/warning/error/success) ============
        case AGENT_EVENT_TYPES.TIPS: {
          const { content: tipContent, tipType } = getTipsInfo(data);
          if (tipContent) {
            // Show as toast notification
            const toastType = tipType === 'error' ? 'error' as const
              : tipType === 'warning' ? 'warning' as const
              : tipType === 'success' ? 'success' as const
              : 'info' as const;
            addToast(tipContent, toastType);
          }
          break;
        }

        // ============ TOOL_CALL ============
        case AGENT_EVENT_TYPES.TOOL_CALL: {
          // Determine if this is a start or result by checking for result/status field
          if (data.result !== undefined || data.error !== undefined || data.status === 'completed' || data.status === 'error') {
            // Tool call result
            const { id: tcId, result, status, error: tcError } = getToolCallResult(data);
            if (!tcId) break;
            // Clear timeout
            const prevTimer = toolCallTimersRef.current.get(tcId);
            if (prevTimer) { clearTimeout(prevTimer); toolCallTimersRef.current.delete(tcId); }
            const updates: Partial<ToolCall> = { result, status, endedAt: Date.now() };
            setToolCalls((prev) => prev.map((tc) => (tc.id === tcId ? { ...tc, ...updates } : tc)));
            if (activeMsgIdRef.current) {
              chatUpdateToolCall(convId, activeMsgIdRef.current, tcId, updates);
            }
          } else {
            // Tool call start
            const { id: tcId, name: tcName, args: tcArgs } = getToolCallInfo(data);
            if (!tcId) break;
            const tc: ToolCall = {
              id: tcId,
              name: tcName,
              args: tcArgs,
              status: 'running',
              startedAt: Date.now(),
            };
            setToolCalls((prev) => [...prev, tc]);
            if (activeMsgIdRef.current) {
              chatAddToolCall(convId, activeMsgIdRef.current, tc);
            }
            toolCallCountRef.current++;
            // Set 120s timeout for this tool call
            const prevTimer = toolCallTimersRef.current.get(tcId);
            if (prevTimer) clearTimeout(prevTimer);
            const timer = setTimeout(() => {
              if (!mountedRef.current) return;
              const timeoutUpdates: Partial<ToolCall> = {
                status: 'error',
                result: '工具调用超时 (120s)',
                endedAt: Date.now(),
              };
              setToolCalls((prev) => prev.map((tc2) => (tc2.id === tcId ? { ...tc2, ...timeoutUpdates } : tc2)));
              if (activeMsgIdRef.current) {
                chatUpdateToolCall(convId, activeMsgIdRef.current, tcId, timeoutUpdates);
              }
              toolCallTimersRef.current.delete(tcId);
            }, TOOL_CALL_TIMEOUT_MS);
            toolCallTimersRef.current.set(tcId, timer);
          }
          break;
        }

        // ============ FINISH ============
        case AGENT_EVENT_TYPES.FINISH: {
          const finishStatus = getFinishStatus(data);
          // Flush remaining buffer
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
          }
          if (bufferRef.current) {
            if (activeMsgIdRef.current) {
              chatAppendChunk(convId, activeMsgIdRef.current, bufferRef.current);
            }
            setDisplayContent((prev) => prev + bufferRef.current);
            bufferRef.current = '';
          }
          if (activeMsgIdRef.current) {
            chatFlushMessage(convId, activeMsgIdRef.current);
          }
          // Record turn stats
          setLastTurnStats({
            runtime: currentRuntimeRef.current || 'unknown',
            toolCallCount: toolCallCountRef.current,
            turnId: turnIdRef.current || '',
          });
          stopStreaming();
          cleanupListeners();
          agentStoreClear(convId);
          break;
        }

        // ============ ERROR ============
        case AGENT_EVENT_TYPES.ERROR: {
          const errMsg = getErrorInfo(data);
          setError(errMsg);
          setIsStreaming(false);
          setGenerating(false);
          if (activeMsgIdRef.current) {
            chatSetError(convId, activeMsgIdRef.current, errMsg);
          }
          addToast(errMsg, 'error');
          cleanupListeners();
          agentStoreClear(convId);
          activeMsgIdRef.current = null;
          break;
        }

        // ============ AGENT_STATUS ============
        case AGENT_EVENT_TYPES.AGENT_STATUS: {
          const agentName = (data.agent_name as string) || '';
          const agentStatus = (data.status as string) || 'running';
          if (agentName) {
            setCurrentAgentName(agentName);
            agentStoreSetStatus(convId, agentName, agentStatus, convId);
          }
          break;
        }

        // ============ PERMISSION ============
        case AGENT_EVENT_TYPES.PERMISSION:
        case AGENT_EVENT_TYPES.ACP_PERMISSION: {
          // Agent requests permission to execute an action
          const perm = getPermissionInfo(data);
          // If auto-approved (session-level), convert to a tool call immediately
          if (autoApprovedRef.current.has(perm.toolName)) {
            // Auto-approved — emit as synchronous tool call
            const autoTc: ToolCall = {
              id: perm.permissionId,
              name: perm.toolName,
              args: perm.args,
              status: 'running',
              startedAt: Date.now(),
            };
            setToolCalls((prev) => [...prev, autoTc]);
            if (activeMsgIdRef.current) {
              chatAddToolCall(convId, activeMsgIdRef.current, autoTc);
            }
            // Send approval via WS
            $wsClient.send('permission_response', {
              permission_id: perm.permissionId,
              conversation_id: envelope.conversation_id,
              approved: true,
            });
          } else {
            // Add to pending permissions — map permissionId → id
            setPendingPermissions((prev) => [...prev, {
              id: perm.permissionId,
              toolName: perm.toolName,
              args: perm.args,
              description: perm.description,
              reason: perm.reason,
            }]);
          }
          break;
        }

        // ============ PLAN ============
        case AGENT_EVENT_TYPES.PLAN: {
          // Agent plan — could render a plan preview
          // Currently seeds task steps if the plan has step descriptions
          const planSteps = (data.steps as Array<{ description?: string; status?: string }>) ?? [];
          if (planSteps.length > 0) {
            const steps: TaskStep[] = planSteps.map((s, i) => ({
              id: `plan-step-${i}`,
              label: s.description ?? `步骤 ${i + 1}`,
              status: (s.status as TaskStep['status']) ?? 'pending',
            }));
            setTaskSteps(steps);
            if (activeMsgIdRef.current) {
              chatSetTaskSteps(convId, activeMsgIdRef.current, steps);
            }
          }
          break;
        }
      }
    },
    [
      convId,
      appendContent,
      addToast,
      setGenerating,
      stopStreaming,
      cleanupListeners,
      chatAppendChunk,
      chatFlushMessage,
      chatSetError,
      chatAddToolCall,
      chatUpdateToolCall,
      chatSetTaskSteps,
    ],
  );

  // ===============================================================
  // Register WS listeners
  // ===============================================================

  const registerListeners = useCallback(() => {
    cleanupListeners();
    hasMessageStreamRef.current = false;

    // Primary: listen on the real backend `message.stream` event
    const unsubStream = $wsClient.on(WS_EVENTS.MESSAGE_STREAM, handleAgentEvent);

    // Fallback: legacy v1 individual events — only used if message.stream never fires
    // Once a message.stream event is received, these are skipped.
    const skipIfStreaming = (fn: (raw: unknown) => void) => (raw: unknown) => {
      if (!hasMessageStreamRef.current) fn(raw);
    };

    const unsubFallbacks = [
      $wsClient.on('message_chunk', skipIfStreaming((raw: unknown) => {
        const p = (raw ?? {}) as Record<string, unknown>;
        handleAgentEvent({
          conversation_id: p.conversation_id,
          msg_id: p.message_id,
          type: 'content',
          data: { content: p.chunk ?? p.content ?? '' },
          hidden: false,
        });
      })),
      $wsClient.on('tool_call_start', skipIfStreaming((raw: unknown) => {
        const p = (raw ?? {}) as Record<string, unknown>;
        handleAgentEvent({
          conversation_id: p.conversation_id,
          msg_id: p.message_id,
          type: 'tool_call',
          data: {
            tool_call_id: p.tool_call_id,
            tool_name: p.tool_name,
            arguments: p.arguments,
          },
          hidden: false,
        });
      })),
      $wsClient.on('tool_call_result', skipIfStreaming((raw: unknown) => {
        const p = (raw ?? {}) as Record<string, unknown>;
        handleAgentEvent({
          conversation_id: p.conversation_id,
          msg_id: p.message_id,
          type: 'tool_call',
          data: {
            tool_call_id: p.tool_call_id,
            result: p.result,
            error: p.error,
            status: p.status ?? (p.error ? 'error' : 'completed'),
          },
          hidden: false,
        });
      })),
      $wsClient.on('task_step_update', skipIfStreaming((raw: unknown) => {
        const p = (raw ?? {}) as Record<string, unknown>;
        const steps = p.steps as Array<{ id?: string; label?: string; status?: string }> | undefined;
        if (steps && Array.isArray(steps)) {
          const taskSteps: TaskStep[] = steps.map((s) => ({
            id: s.id ?? `step-${Date.now()}`,
            label: s.label ?? '',
            status: (s.status as TaskStep['status']) ?? 'pending',
          }));
          setTaskSteps(taskSteps);
          if (activeMsgIdRef.current) {
            chatSetTaskSteps(convId, activeMsgIdRef.current, taskSteps);
          }
        } else if (p.step_id && p.label) {
          const stepId = p.step_id as string;
          const updates: Partial<TaskStep> = {
            label: p.label as string,
            status: (p.status as TaskStep['status']) ?? 'running',
          };
          setTaskSteps((prev) =>
            prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
          );
          if (activeMsgIdRef.current) {
            chatUpdateTaskStep(convId, activeMsgIdRef.current, stepId, updates);
          }
        }
      })),
      $wsClient.on('stream_end', skipIfStreaming((raw: unknown) => {
        const p = (raw ?? {}) as Record<string, unknown>;
        handleAgentEvent({
          conversation_id: p.conversation_id,
          msg_id: p.message_id,
          type: 'finish',
          data: { status: 'finish', artifacts: p.artifacts },
          hidden: false,
        });
      })),
      $wsClient.on('stream_error', skipIfStreaming((raw: unknown) => {
        const p = (raw ?? {}) as Record<string, unknown>;
        handleAgentEvent({
          conversation_id: p.conversation_id,
          msg_id: p.message_id,
          type: 'error',
          data: { message: p.error ?? 'Stream error' },
          hidden: false,
        });
      })),
    ];

    unsubsRef.current = [unsubStream, ...unsubFallbacks];
  }, [$wsClient, handleAgentEvent, cleanupListeners, convId, chatSetTaskSteps]);

  // ===============================================================
  // Mount: connect WS, discover existing stream
  // ===============================================================

  useEffect(() => {
    mountedRef.current = true;
    $wsClient.connect();

    // Check chatStore for existing streaming messages
    const chatState = useChatStore.getState();
    const prefix = `${convId}:`;
    const streamingEntries = Object.entries(chatState.messages).filter(
      ([key, msg]) => key.startsWith(prefix) && msg.isStreaming,
    );

    if (streamingEntries.length > 0) {
      const [key, msg] = streamingEntries[0];
      const existingMsgId = key.slice(prefix.length);
      activeMsgIdRef.current = existingMsgId;
      setDisplayContent(msg.content);
      if (msg.toolCalls.length > 0) setToolCalls(msg.toolCalls);
      if (msg.taskSteps.length > 0) setTaskSteps(msg.taskSteps);
      setIsStreaming(true);
      setGenerating(true);
      setError(msg.error);
    }

    registerListeners();

    return () => {
      mountedRef.current = false;
      cleanupListeners();
    };
  }, [convId, $wsClient, setGenerating, registerListeners, cleanupListeners]);

  // ===============================================================
  // send: REST POST + WS correlation
  // ===============================================================

  const send = useCallback(
    async (text: string, options?: SendOptions): Promise<string | null> => {
      if (!mountedRef.current) return null;
      const trimmed = text.trim();
      if (!trimmed) return null;

      // Ensure WS is connected — register listener BEFORE connect to avoid race
      if (!$wsClient.isConnected) {
        try {
          const connected = await new Promise<void>((resolve, reject) => {
            const unsub = $wsClient.on(WS_EVENTS.CONNECTED, () => {
              unsub();
              resolve();
            });
            $wsClient.connect(); // connect AFTER listener registration
            setTimeout(() => {
              unsub();
              reject(new Error('WebSocket connect timeout'));
            }, WS_CONNECT_TIMEOUT_MS);
          });
        } catch {
          addToast('无法连接到后端服务，请检查 AionCore 是否已启动', 'warning');
          return null;
        }
      }

      // Flush any remaining buffer from a prior stream before reset
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      if (bufferRef.current) {
        setDisplayContent((prev) => prev + bufferRef.current);
        bufferRef.current = '';
      }

      // Reset state for new turn
      resetStreaming();
      setDisplayContent('');
      setToolCalls([]);
      setTaskSteps([]);
      setThinkingBlocks([]);
      setError(null);
      setTurnId(null);
      setContinuationCount(0);
      setIsStreaming(true);
      setGenerating(true);
      cleanupListeners();

      // Build payload
      const payload: Parameters<typeof api.sendMessage>[1] = { content: trimmed, type: 'text' };
      if (options?.model) payload.model = options.model;
      if (options?.mode) payload.mode = options.mode;
      if (options?.assistant_id) payload.assistant_id = options.assistant_id;
      if (options?.inject_skills?.length) payload.inject_skills = options.inject_skills;
      if (options?.mcp_tools?.length) payload.mcp_tools = options.mcp_tools;
      if (options?.tools?.length) payload.tools = options.tools;

      // If model is set but no assistant_id, use model name as assistant
      // for AionCore v0.38+ provider routing
      if (payload.model && !payload.assistant_id) {
        payload.assistant_id = payload.model;
      }

      // Send via REST
      let messageResult: Record<string, unknown>;
      try {
        messageResult = (await $sendMessage(convId, payload)) as unknown as Record<string, unknown>;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '发送失败';
        console.error('[SendMessage]', msg, 'payload:', JSON.stringify(payload));
        addToast(msg, 'error');
        resetStreaming();
        setGenerating(false);
        return null;
      }

      const messageId =
        (messageResult.msg_id as string) ||
        (messageResult.message_id as string) ||
        (messageResult.id as string) ||
        `msg-${Date.now()}`;
      activeMsgIdRef.current = messageId;

      // Capture runtime from this turn
      const runtimeStr = (messageResult.runtime as string) ?? '';
      if (runtimeStr) currentRuntimeRef.current = runtimeStr;
      toolCallCountRef.current = 0;

      // Persist to chatStore for cross-navigation continuity
      chatStartStreaming(convId, messageId);

      // Register WS listeners for this stream
      registerListeners();

      return messageId;
    },
    [convId, $wsClient, $sendMessage, addToast, resetStreaming, setGenerating, cleanupListeners, registerListeners, chatStartStreaming],
  );

  // ===============================================================
  // cancel
  // ===============================================================

  const cancel = useCallback(async () => {
    if (!activeMsgIdRef.current) return;
    const msgId = activeMsgIdRef.current;
    try {
      await api.cancelConversation(convId, turnIdRef.current ?? undefined);
    } catch {
      // Best-effort
    }
    cleanupListeners();
    stopStreaming();
    chatSetError(convId, msgId, '已取消');
  }, [convId, cleanupListeners, stopStreaming, chatSetError]);

  // ===============================================================
  // Permission approval/rejection
  // ===============================================================

  const approvePermission = useCallback((permissionId: string) => {
    setPendingPermissions((prev) => prev.filter((p) => p.id !== permissionId));
    // Send approval via WS
    $wsClient.send('permission_response', {
      permission_id: permissionId,
      conversation_id: convId,
      approved: true,
    });
  }, [convId, $wsClient]);

  const rejectPermission = useCallback((permissionId: string) => {
    setPendingPermissions((prev) => prev.filter((p) => p.id !== permissionId));
    // Send rejection via WS
    $wsClient.send('permission_response', {
      permission_id: permissionId,
      conversation_id: convId,
      approved: false,
    });
  }, [convId, $wsClient]);

  const approveAlways = useCallback((permissionId: string, toolName: string) => {
    autoApprovedRef.current.add(toolName);
    setPendingPermissions((prev) => prev.filter((p) => p.id !== permissionId));
    $wsClient.send('permission_response', {
      permission_id: permissionId,
      conversation_id: convId,
      approved: true,
    });
  }, [convId, $wsClient]);

  // ===============================================================
  // Return
  // ===============================================================

  const isConnected = connectionStatus === 'connected';

  return {
    content: displayContent,
    isStreaming,
    toolCalls,
    taskSteps,
    thinkingBlocks,
    error,
    isConnected,
    turnId,
    continuationCount,
    pendingPermissions,
    lastTurnStats,
    currentAgentName,
    send,
    cancel,
    approvePermission,
    rejectPermission,
    approveAlways,
  };
}
