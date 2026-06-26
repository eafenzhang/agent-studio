/**
 * Agent Activity Store — tracks active agents across all conversations.
 *
 * - Each conversation can have one active agent at a time.
 * - The `agent_status` WS event updates the agent name/status.
 * - Agent handoffs are tracked as a history log.
 */

import { create } from 'zustand';

export interface AgentActivity {
  /** Agent name from the WS event (e.g. "coder", "researcher"). */
  agentName: string;
  /** Status string (e.g. "running", "handoff", "completed"). */
  status: string;
  /** Conversation ID this agent is running in. */
  convId: string;
  /** Conversation title for display. */
  convTitle: string;
  /** When this agent started. */
  startedAt: number;
}

export interface AgentHandoff {
  /** The agent that handed off. */
  from: string;
  /** The agent that took over. */
  to: string;
  /** Conversation where the handoff happened. */
  convId: string;
  /** Conversation title. */
  convTitle: string;
  /** When the handoff happened. */
  timestamp: number;
}

export interface AgentStoreState {
  /** Active agents keyed by conversation ID. */
  activeAgents: Record<string, AgentActivity>;
  /** Handoff history (newest first). */
  handoffs: AgentHandoff[];

  /** Update or add an agent activity for a conversation. */
  setAgentStatus: (convId: string, agentName: string, status: string, convTitle?: string) => void;
  /** Remove an agent activity (e.g. on finish/error/cancel). */
  clearAgent: (convId: string) => void;
  /** Update conversation title for display. */
  setConvTitle: (convId: string, title: string) => void;
  /** Get all currently active (non-completed) agents. */
  getActiveAgents: () => AgentActivity[];
  /** Get agent activity for a specific conversation. */
  getAgentForConv: (convId: string) => AgentActivity | undefined;
}

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  activeAgents: {},
  handoffs: [],

  setAgentStatus: (convId, agentName, status, convTitle) => {
    set((s) => {
      const existing = s.activeAgents[convId];
      const title = convTitle || existing?.convTitle || convId;

      // Detect handoff: agent name changed
      let handoffs = s.handoffs;
      if (existing && existing.agentName !== agentName) {
        handoffs = [
          { from: existing.agentName, to: agentName, convId, convTitle: title, timestamp: Date.now() },
          ...s.handoffs,
        ];
        // Keep last 20 handoffs
        if (handoffs.length > 20) handoffs = handoffs.slice(0, 20);
      }

      const activity: AgentActivity = {
        agentName,
        status,
        convId,
        convTitle: title,
        startedAt: existing?.startedAt ?? Date.now(),
      };

      if (status === 'completed' || status === 'error') {
        // Agent finished — mark as inactive after a short delay
        const { [convId]: _, ...rest } = s.activeAgents;
        return { activeAgents: rest, handoffs };
      }

      return {
        activeAgents: { ...s.activeAgents, [convId]: activity },
        handoffs,
      };
    });
  },

  clearAgent: (convId) => {
    set((s) => {
      const { [convId]: _, ...rest } = s.activeAgents;
      return { activeAgents: rest };
    });
  },

  setConvTitle: (convId, title) => {
    set((s) => {
      const existing = s.activeAgents[convId];
      if (!existing) return s;
      return {
        activeAgents: {
          ...s.activeAgents,
          [convId]: { ...existing, convTitle: title },
        },
      };
    });
  },

  getActiveAgents: () => {
    return Object.values(get().activeAgents);
  },

  getAgentForConv: (convId) => {
    return get().activeAgents[convId];
  },
}));
