import React, { useState } from 'react';
import { useTaskStore } from '../../stores/taskStore';

const statusLabels: Record<string, string> = { pending: '待处理', in_progress: '进行中', completed: '已完成', failed: '失败' };
const statusColors: Record<string, string> = { pending: '#f39c12', in_progress: '#3498db', completed: '#27ae60', failed: '#e74c3c' };
const sortOrders: Record<string, number> = { pending: 0, in_progress: 1, completed: 2, failed: 3 };

export const TasksPage: React.FC = () => {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const removeTask = useTaskStore((s) => s.removeTask);
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = [...tasks]
    .filter(t => filter === 'all' || t.status === filter)
    .sort((a, b) => (sortOrders[a.status] || 9) - (sortOrders[b.status] || 9));

  const counts = { all: tasks.length, pending: tasks.filter(t => t.status === 'pending').length, in_progress: tasks.filter(t => t.status === 'in_progress').length, completed: tasks.filter(t => t.status === 'completed').length };

  return (
    <div className="page active page-fade-in" style={{ padding: '16px 20px', overflowY: 'auto' }}>
      {/* 标题和统计 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--cb-text-primary)' }}>任务列表</div>
          <div style={{ fontSize: 12, color: 'var(--cb-text-secondary)', marginTop: 2 }}>共 {tasks.length} 个任务</div>
        </div>
      </div>

      {/* 筛选标签 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: `全部 (${counts.all})` },
          { id: 'pending', label: `待处理 (${counts.pending})` },
          { id: 'in_progress', label: `进行中 (${counts.in_progress})` },
          { id: 'completed', label: `已完成 (${counts.completed})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setFilter(tab.id)}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, border: 'none',
              background: filter === tab.id ? 'var(--cb-button-primary)' : 'var(--cb-tag-background)',
              color: filter === tab.id ? '#fff' : 'var(--cb-text-secondary)',
              cursor: 'pointer', fontWeight: filter === tab.id ? 500 : 400,
            }}>{tab.label}</button>
        ))}
        {tasks.length > 0 && (
          <button onClick={() => { useTaskStore.getState().tasks.forEach(t => { useTaskStore.getState().removeTask(t.id); }); }}
            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: '1px solid var(--cb-border)', background: 'transparent', color: 'var(--cb-text-tertiary)', cursor: 'pointer', marginLeft: 'auto' }}>
            清空
          </button>
        )}
      </div>

      {/* 任务列表 */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--cb-text-tertiary)', fontSize: 13 }}>
          {filter === 'all' ? '暂无任务，在对话中创建任务后将显示在这里' : '没有匹配的任务'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map(task => (
            <div key={task.id} style={{
              background: '#fff', border: '1px solid var(--cb-border-subtle)',
              borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
              transition: 'all 0.15s', borderLeft: `3px solid ${statusColors[task.status] || '#999'}`,
            }}
              onClick={() => setExpanded(expanded === task.id ? null : task.id)}
            >
              {/* 标题行 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusColors[task.status] || '#999', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--cb-text-primary)' }}>{task.title}</span>
                <span style={{ fontSize: 11, color: 'var(--cb-text-secondary)', background: 'var(--cb-tag-background)', padding: '1px 6px', borderRadius: 4 }}>{statusLabels[task.status]}</span>
                <span style={{ fontSize: 10, color: 'var(--cb-text-tertiary)' }}>{new Date(task.createdAt).toLocaleDateString()}</span>
              </div>

              {/* 展开详情 */}
              {expanded === task.id && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--cb-border-subtle)' }}>
                  <div style={{ fontSize: 12, color: 'var(--cb-text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{task.description}</div>
                  {/* 文档标签 */}
                  {task.docs && task.docs.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                      {task.docs.map(doc => (
                        <span key={doc.name} style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10, background: 'rgba(108,77,255,0.06)', border: '1px solid rgba(108,77,255,0.15)', color: 'var(--cb-button-primary)' }}>
                          📄 {doc.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* 步骤 */}
                  {task.steps && task.steps.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      {task.steps.map((step, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
                          fontSize: 12,
                          color: i < (task.currentStep || 0) ? 'var(--cb-switch-active-bg)'
                            : i === (task.currentStep || 0) ? 'var(--cb-button-primary)'
                            : 'var(--cb-text-tertiary)',
                        }}>
                          <span style={{ width: 16, textAlign: 'center' }}>
                            {i < (task.currentStep || 0) ? '✓' : i === (task.currentStep || 0) ? '→' : '○'}
                          </span>
                          {step}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {task.status === 'pending' && (
                      <button onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: 'in_progress' }); }}
                        style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, border: 'none', background: 'var(--cb-button-primary)', color: '#fff', cursor: 'pointer' }}>
                        开始执行
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: 'completed' }); }}
                        style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, border: 'none', background: 'var(--cb-switch-active-bg)', color: '#fff', cursor: 'pointer' }}>
                        标记完成
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
                      style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, border: '1px solid var(--cb-border)', background: 'transparent', color: 'var(--cb-text-secondary)', cursor: 'pointer' }}>
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
