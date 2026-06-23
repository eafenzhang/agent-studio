import { create } from 'zustand';

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
  /** 将对话消息转化为任务 */
  createTaskFromMessage: (title: string, description: string, conversationId?: string) => string;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],

  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),

  updateTask: (id, updates) => set((s) => ({
    tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),

  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  createTaskFromMessage: (title, description, conversationId) => {
    const id = `task-${Date.now()}`;
    get().addTask({
      id,
      title,
      description,
      status: 'pending',
      createdAt: new Date().toISOString(),
      source: 'alignment',
      conversationId,
    });
    return id;
  },
}));
