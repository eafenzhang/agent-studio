/**
 * Task Steps Store — persists multi-step plan progress per conversation.
 *
 * Data is saved to localStorage so task progress survives page reloads.
 * The WS `plan` event seeds the steps; the user can manually update status
 * by clicking on steps in the TaskProgressPanel.
 */

import { create } from 'zustand';
import type { TaskStep, TaskStepStatus } from '../types/api';

const STORAGE_KEY = 'agent-studio-task-steps';

function loadPersisted(): Record<string, TaskStep[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist(data: Record<string, TaskStep[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export interface TaskStepsState {
  stepsByConv: Record<string, TaskStep[]>;
  /** Replace all steps for a conversation (from WS `plan` event). */
  setSteps: (convId: string, steps: TaskStep[]) => void;
  /** Update a single step's status (user click). */
  updateStepStatus: (convId: string, stepId: string, status: TaskStepStatus) => void;
  /** Get all conversation IDs that have active (non-done) tasks. */
  getActiveTaskConvs: () => string[];
  /** Check if a conversation has any active task steps. */
  hasActiveTasks: (convId: string) => boolean;
  /** Get completion count for a conversation. */
  getProgress: (convId: string) => { done: number; total: number };
}

export const useTaskStepsStore = create<TaskStepsState>((set, get) => {
  const persisted = loadPersisted();

  return {
    stepsByConv: persisted,

    setSteps: (convId, steps) => {
      set((s) => {
        const next = { ...s.stepsByConv, [convId]: steps };
        persist(next);
        return { stepsByConv: next };
      });
    },

    updateStepStatus: (convId, stepId, status) => {
      set((s) => {
        const convSteps = s.stepsByConv[convId];
        if (!convSteps) return s;
        const nextSteps = convSteps.map((step) =>
          step.id === stepId ? { ...step, status } : step
        );
        const next = { ...s.stepsByConv, [convId]: nextSteps };
        persist(next);
        return { stepsByConv: next };
      });
    },

    getActiveTaskConvs: () => {
      const state = get();
      return Object.entries(state.stepsByConv)
        .filter(([, steps]) => steps.some((s) => s.status !== 'done' && s.status !== 'error'))
        .map(([convId]) => convId);
    },

    hasActiveTasks: (convId) => {
      const steps = get().stepsByConv[convId];
      if (!steps || steps.length === 0) return false;
      return steps.some((s) => s.status !== 'done' && s.status !== 'error');
    },

    getProgress: (convId) => {
      const steps = get().stepsByConv[convId] || [];
      return {
        done: steps.filter((s) => s.status === 'done').length,
        total: steps.length,
      };
    },
  };
});
