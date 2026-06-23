import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  source: 'alignment' | 'manual';
  conversationId?: string;
  steps?: string[];
  currentStep?: number;
}

interface TaskState {
  tasks: TaskItem[];
  addTask: (task: TaskItem) => void;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;
  removeTask: (id: string) => void;
  createTaskFromMessage: (title: string, description: string, conversationId?: string) => string;
  advanceStep: (id: string) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),

      updateTask: (id, updates) => set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      })),

      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      createTaskFromMessage: (title, description, conversationId) => {
        const id = `task-${Date.now()}`;
        get().addTask({
          id, title, description,
          status: 'pending',
          createdAt: new Date().toISOString(),
          source: 'alignment',
          conversationId,
        });
        return id;
      },

      advanceStep: (id) => set((s) => ({
        tasks: s.tasks.map((t) => {
          if (t.id !== id) return t;
          const nextStep = (t.currentStep || 0) + 1;
          const isLast = !t.steps || nextStep >= t.steps.length;
          return {
            ...t,
            currentStep: nextStep,
            status: isLast ? 'completed' : 'in_progress',
          };
        }),
      })),
    }),
    { name: 'agent-studio-tasks' },
  ),
);
