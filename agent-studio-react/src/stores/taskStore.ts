import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TaskDoc {
  /** alignment.md / task.md / verify.md / progress.md */
  name: string;
  content: string;
}

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
  /** 对齐生成的文档 */
  docs?: TaskDoc[];
}

interface TaskState {
  tasks: TaskItem[];
  addTask: (task: TaskItem) => void;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;
  removeTask: (id: string) => void;
  createTaskFromMessage: (title: string, description: string, conversationId?: string) => string;
  /** 从对齐对话生成完整任务文档 */
  createTaskFromAlignment: (title: string, description: string, convId: string, _alignmentContent?: string) => string;
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
        get().addTask({ id, title, description, status: 'pending', createdAt: new Date().toISOString(), source: 'alignment', conversationId });
        return id;
      },

      createTaskFromAlignment: (title, description, convId, _alignmentContent) => {
        const id = `task-${Date.now()}`;
        const now = new Date().toISOString();
        const docs: TaskDoc[] = [
          { name: 'alignment.md', content: `# Alignment Record\n\n## Context\n${description}\n\n## Key Decisions\n- 通过对齐对话得出任务需求\n\n## Scope Boundaries\n- 详见任务描述\n\n## Open Questions\n- 执行过程中发现的问题可在此补充` },
          { name: 'task.md', content: `# Task: ${title}\n\n## Goal\n${description}\n\n## Scope\n- 根据对齐对话确定\n\n## Verification\n- 参考 verify.md\n\n## Constraints\n- 由 AionCore Agent 执行` },
          { name: 'verify.md', content: `# Verification: ${title}\n\n## Automated Checks\n- [ ] 任务执行完成无错误\n\n## Integration\n- [ ] 结果符合预期\n\n## Notes\n- 验证标准可由执行 agent 补充` },
          { name: 'progress.md', content: `# Progress: ${title}\n\n## Status: Planned\n\n## Execution Plan\n1. [ ] 分析需求\n2. [ ] 制定执行方案\n3. [ ] 执行\n4. [ ] 验证结果\n\n## Change Log\n- ${now}: 任务从对齐对话创建` },
        ];
        get().addTask({
          id, title, description, status: 'pending', createdAt: now,
          source: 'alignment', conversationId: convId, docs,
          steps: ['分析需求', '制定执行方案', '执行', '验证结果'],
          currentStep: 0,
        });
        return id;
      },

      advanceStep: (id) => set((s) => ({
        tasks: s.tasks.map((t) => {
          if (t.id !== id) return t;
          const nextStep = (t.currentStep || 0) + 1;
          const isLast = !t.steps || nextStep >= t.steps.length;
          return { ...t, currentStep: nextStep, status: isLast ? 'completed' : 'in_progress' };
        }),
      })),
    }),
    { name: 'agent-studio-tasks' },
  ),
);
