import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStepsStore } from '../../src/stores/task-store';

describe('task-store', () => {
  beforeEach(() => {
    localStorage.removeItem('agent-studio-task-steps');
    useTaskStepsStore.setState({ stepsByConv: {} });
  });

  it('should start with empty steps', () => {
    expect(useTaskStepsStore.getState().stepsByConv).toEqual({});
  });

  it('should set steps for a conversation', () => {
    const steps = [{ id: 's1', label: '分析需求', status: 'pending' as const }];
    useTaskStepsStore.getState().setSteps('conv-1', steps);
    expect(useTaskStepsStore.getState().stepsByConv['conv-1']).toEqual(steps);
  });

  it('should update a single step status', () => {
    useTaskStepsStore.getState().setSteps('conv-1', [
      { id: 's1', label: 'Step 1', status: 'pending' as const },
      { id: 's2', label: 'Step 2', status: 'pending' as const },
    ]);
    useTaskStepsStore.getState().updateStepStatus('conv-1', 's1', 'done' as const);
    const steps = useTaskStepsStore.getState().stepsByConv['conv-1'];
    expect(steps[0].status).toBe('done');
    expect(steps[1].status).toBe('pending');
  });

  it('should detect active tasks', () => {
    useTaskStepsStore.getState().setSteps('conv-1', [
      { id: 's1', label: 'Step 1', status: 'running' as const },
    ]);
    expect(useTaskStepsStore.getState().hasActiveTasks('conv-1')).toBe(true);
    useTaskStepsStore.getState().updateStepStatus('conv-1', 's1', 'done' as const);
    expect(useTaskStepsStore.getState().hasActiveTasks('conv-1')).toBe(false);
  });

  it('should return completion progress', () => {
    useTaskStepsStore.getState().setSteps('conv-1', [
      { id: 's1', label: 'Step 1', status: 'done' as const },
      { id: 's2', label: 'Step 2', status: 'running' as const },
    ]);
    const progress = useTaskStepsStore.getState().getProgress('conv-1');
    expect(progress.done).toBe(1);
    expect(progress.total).toBe(2);
  });

  it('should get active conversation IDs', () => {
    useTaskStepsStore.getState().setSteps('conv-1', [{ id: 's1', label: 'A', status: 'running' as const }]);
    useTaskStepsStore.getState().setSteps('conv-2', [{ id: 's2', label: 'B', status: 'done' as const }]);
    const active = useTaskStepsStore.getState().getActiveTaskConvs();
    expect(active).toEqual(['conv-1']);
  });
});
