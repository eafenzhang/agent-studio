import React from 'react';
import { useTaskStore, TaskItem } from '../../stores/taskStore';

interface TaskCardProps {
  task: TaskItem;
  onView?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const updateTask = useTaskStore((s) => s.updateTask);
  const removeTask = useTaskStore((s) => s.removeTask);

  const statusColors: Record<string, string> = {
    pending: '#f39c12',
    in_progress: '#3498db',
    completed: '#27ae60',
    failed: '#e74c3c',
  };

  const statusLabels: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    failed: '失败',
  };

  return (
    <div style={{
      background: 'var(--cb-main-area-background)',
      border: '1px solid var(--cb-main-area-border-color)',
      borderRadius: 8, padding: 10, marginTop: 6, fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: statusColors[task.status] || '#999', flexShrink: 0,
        }} />
        <span style={{ fontWeight: 600, flex: 1, color: 'var(--cb-text-primary)' }}>{task.title}</span>
        <span style={{ fontSize: 10, color: 'var(--wb-color-text-disabled)' }}>
          {statusLabels[task.status] || task.status}
        </span>
      </div>
      {task.description && (
        <div style={{ color: 'var(--cb-text-secondary)', marginBottom: 4, lineHeight: 1.4 }}>
          {task.description}
        </div>
      )}
      {task.steps && task.steps.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {task.steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0',
              color: i < (task.currentStep || 0) ? 'var(--cb-switch-active-bg)'
                : i === (task.currentStep || 0) ? 'var(--cb-button-primary)'
                : 'var(--cb-text-tertiary)',
              fontSize: 11,
            }}>
              <span style={{ width: 14, textAlign: 'center' }}>
                {i < (task.currentStep || 0) ? '✓' : i === (task.currentStep || 0) ? '→' : '○'}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {task.status === 'pending' && (
          <button onClick={() => updateTask(task.id, { status: 'in_progress' })}
            style={btnStyle}>开始执行</button>
        )}
        {task.status === 'in_progress' && (
          <button onClick={() => updateTask(task.id, { status: 'completed' })}
            style={{ ...btnStyle, background: 'var(--cb-switch-active-bg)', color: '#fff' }}>完成</button>
        )}
        <button onClick={() => removeTask(task.id)}
          style={{ ...btnStyle, background: 'transparent', color: 'var(--cb-text-secondary)', border: '1px solid var(--cb-border)' }}>
          删除
        </button>
      </div>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  padding: '3px 10px', borderRadius: 4, fontSize: 11, border: 'none',
  background: 'var(--cb-button-primary)', color: '#fff', cursor: 'pointer',
};
