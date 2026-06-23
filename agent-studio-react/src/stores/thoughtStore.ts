import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Thought {
  id: string;
  content: string;
  createdAt: string;
  source: 'manual' | 'conversation';
  conversationId?: string;
  taskId?: string;
}

interface ThoughtState {
  thoughts: Thought[];
  addThought: (thought: Omit<Thought, 'id' | 'createdAt'>) => string;
  removeThought: (id: string) => void;
  linkToTask: (thoughtId: string, taskId: string) => void;
}

export const useThoughtStore = create<ThoughtState>()(
  persist(
    (set) => ({
      thoughts: [],
      addThought: (data) => {
        const id = `thought-${Date.now()}`;
        set((s) => ({
          thoughts: [{ ...data, id, createdAt: new Date().toISOString() }, ...s.thoughts],
        }));
        return id;
      },
      removeThought: (id) => set((s) => ({ thoughts: s.thoughts.filter((t) => t.id !== id) })),
      linkToTask: (thoughtId, taskId) => set((s) => ({
        thoughts: s.thoughts.map((t) => t.id === thoughtId ? { ...t, taskId } : t),
      })),
    }),
    { name: 'agent-studio-thoughts' },
  ),
);
