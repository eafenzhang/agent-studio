import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/ui-store';
import { showConfirm } from '../components/ui/ConfirmModal';

// ===================================================================
// Types
// ===================================================================

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  goal?: string;
  verification?: string;
  schedule?: 'once' | 'recurring';
  cronExpression?: string;
}

// ===================================================================
// Local Storage Helpers
// ===================================================================

const STORAGE_KEY = 'agent-studio-tasks';

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // ignore
  }
}

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ===================================================================
// Preset Templates
// ===================================================================

const TASK_TEMPLATES = [
  {
    name: '代码审查',
    description: '审查代码变更，检查质量、安全和性能问题',
    goal: '审查指定代码变更，输出结构化报告',
    verification: '报告包含：问题列表、严重级别、修复建议',
  },
  {
    name: '文档生成',
    description: '根据代码或需求生成技术文档',
    goal: '生成完整的技术文档',
    verification: '文档包含：概述、使用说明、API 参考、示例',
  },
  {
    name: '定时报告',
    description: '按周期自动生成数据报告',
    goal: '定期生成并推送数据报告',
    verification: '报告按时生成，数据准确，格式正确',
    schedule: 'recurring' as const,
  },
];

// ===================================================================
// Component
// ===================================================================

export default function TasksPage() {
  const { t } = useTranslation();
  const addToast = useUIStore((s) => s.addToast);

  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    goal: string;
    verification: string;
    schedule: 'once' | 'recurring';
    cronExpression: string;
  }>({
    title: '',
    description: '',
    goal: '',
    verification: '',
    schedule: 'once',
    cronExpression: '',
  });
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  // ===============================================================
  // Computed
  // ===============================================================

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const statusCounts = useMemo(() => {
    const counts = { all: tasks.length, pending: 0, in_progress: 0, completed: 0 };
    tasks.forEach((t) => {
      if (t.status in counts) counts[t.status as keyof typeof counts]++;
    });
    return counts;
  }, [tasks]);

  // ===============================================================
  // Actions
  // ===============================================================

  const handleOpenNew = useCallback(() => {
    setSelectedTemplate(null);
    setForm({ title: '', description: '', goal: '', verification: '', schedule: 'once', cronExpression: '' });
    setDialogOpen(true);
  }, []);

  const handleApplyTemplate = useCallback((idx: number) => {
    const tmpl = TASK_TEMPLATES[idx];
    setSelectedTemplate(idx);
    setForm({
      title: tmpl.name,
      description: tmpl.description,
      goal: tmpl.goal,
      verification: tmpl.verification,
      schedule: (tmpl as any).schedule ?? 'once',
      cronExpression: '',
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!form.title.trim()) {
      addToast('请输入任务名称', 'warning');
      return;
    }

    const now = new Date().toISOString();
    const newTask: Task = {
      id: generateId(),
      title: form.title.trim(),
      description: form.description.trim(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      goal: form.goal.trim() || undefined,
      verification: form.verification.trim() || undefined,
      schedule: form.schedule,
      cronExpression: form.schedule === 'recurring' ? form.cronExpression.trim() || undefined : undefined,
    };

    const next = [newTask, ...tasks];
    setTasks(next);
    saveTasks(next);
    setDialogOpen(false);
    addToast('任务已创建', 'success');
  }, [form, tasks, addToast]);

  const handleStatusChange = useCallback((id: string, status: Task['status']) => {
    const next = tasks.map((t) =>
      t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t,
    );
    setTasks(next);
    saveTasks(next);
  }, [tasks]);

  const handleDelete = useCallback(async (id: string) => {
    if (!await showConfirm('确定要删除这个任务吗？')) return;
    const next = tasks.filter((t) => t.id !== id);
    setTasks(next);
    saveTasks(next);
    addToast('任务已删除', 'success');
  }, [tasks, addToast]);

  const getStatusLabel = (status: Task['status']): string => {
    const labels: Record<string, string> = {
      pending: '待执行',
      in_progress: '执行中',
      completed: '已完成',
      failed: '失败',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: Task['status']): string => {
    const colors: Record<string, string> = {
      pending: 'var(--wb-color-text-disabled)',
      in_progress: 'var(--cb-button-primary)',
      completed: '#22c55e',
      failed: '#ff4d4f',
    };
    return colors[status] || colors.pending;
  };

  // ===============================================================
  // Render
  // ===============================================================

  return (
    <div className="page active">
      <div className="tasks-page-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--cb-border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="setting-label" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>任务中心</div>
            <div style={{ fontSize: 12, color: 'var(--cb-text-secondary)' }}>
              管理和追踪 AI 任务的执行状态
            </div>
          </div>
          <button
            className="chat-welcome-chip active"
            onClick={handleOpenNew}
            style={{ padding: '6px 16px', fontSize: 13 }}
          >
            + 新建任务
          </button>
        </div>

        {/* Status filter tabs */}
        <div className="experts-tabs" style={{ marginTop: 12 }}>
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              className={`expert-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '全部' : getStatusLabel(f)}
              <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.6 }}>
                ({statusCounts[f]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div style={{ padding: '12px 20px', flex: 1, overflowY: 'auto' }}>
        {filteredTasks.length === 0 ? (
          <div className="not-available" style={{ marginTop: 32 }}>
            <div className="not-available-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="9" x2="15" y2="15" />
                <line x1="15" y1="9" x2="9" y2="15" />
              </svg>
            </div>
            <div className="not-available-title">暂无任务</div>
            <div className="not-available-desc">点击右上角「新建任务」创建第一个任务</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  background: '#fff',
                  border: '1px solid var(--cb-border-subtle)',
                  borderRadius: 8,
                  padding: 12,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cb-button-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cb-border-subtle)'; }}
                onClick={() => setDetailTask(task)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: getStatusColor(task.status),
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cb-text-primary)' }}>
                        {task.title}
                      </div>
                    </div>
                    {task.description && (
                      <div style={{ fontSize: 12, color: 'var(--cb-text-secondary)', marginTop: 4, marginLeft: 16 }}>
                        {task.description}
                      </div>
                    )}
                    {task.goal && (
                      <div style={{ fontSize: 11, color: 'var(--wb-color-text-disabled)', marginTop: 4, marginLeft: 16 }}>
                        目标: {task.goal}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--wb-color-text-disabled)', whiteSpace: 'nowrap' }}>
                      {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {task.status === 'pending' && (
                        <button
                          className="msg-action-btn"
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, 'in_progress'); }}
                        >
                          开始
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <>
                          <button
                            className="msg-action-btn"
                            style={{ color: '#22c55e', borderColor: '#22c55e' }}
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, 'completed'); }}
                          >
                            完成
                          </button>
                          <button
                            className="msg-action-btn"
                            style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, 'failed'); }}
                          >
                            失败
                          </button>
                        </>
                      )}
                      <button
                        className="msg-action-btn msg-action-btn-danger-hover"
                        onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Task Dialog */}
      {dialogOpen && (
        <div
          className="settings-overlay visible"
          style={{ zIndex: 210 }}
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="settings-modal"
            style={{ width: 520, height: 'auto', maxHeight: '80vh', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-main-header">
              <span className="settings-main-title">新建任务</span>
              <button className="settings-close-btn" onClick={() => setDialogOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="settings-content" style={{ overflowY: 'auto', flex: 1 }}>
              {/* Templates */}
              <div style={{ marginBottom: 16 }}>
                <div className="setting-label" style={{ marginBottom: 6 }}>快速模板</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TASK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      className={`chat-welcome-chip ${selectedTemplate === idx ? 'active' : ''}`}
                      onClick={() => handleApplyTemplate(idx)}
                      style={{ fontSize: 12 }}
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>任务名称 *</div>
                  <input
                    className="chat-input-textarea"
                    style={{ width: '100%', border: '1px solid var(--cb-border)', borderRadius: 4, padding: '6px 10px' }}
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="输入任务名称"
                  />
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>描述</div>
                  <textarea
                    className="chat-input-textarea"
                    style={{ width: '100%', border: '1px solid var(--cb-border)', borderRadius: 4, padding: '6px 10px', minHeight: 60 }}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="描述这个任务要做什么"
                  />
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>目标</div>
                  <textarea
                    className="chat-input-textarea"
                    style={{ width: '100%', border: '1px solid var(--cb-border)', borderRadius: 4, padding: '6px 10px', minHeight: 50 }}
                    value={form.goal}
                    onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                    placeholder="任务的目标是什么？成功的标准是什么？"
                  />
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>验证方式</div>
                  <textarea
                    className="chat-input-textarea"
                    style={{ width: '100%', border: '1px solid var(--cb-border)', borderRadius: 4, padding: '6px 10px', minHeight: 50 }}
                    value={form.verification}
                    onChange={(e) => setForm((f) => ({ ...f, verification: e.target.value }))}
                    placeholder="如何验证任务完成？"
                  />
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>执行方式</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className={`chat-welcome-chip ${form.schedule === 'once' ? 'active' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, schedule: 'once' }))}
                    >
                      一次性
                    </button>
                    <button
                      className={`chat-welcome-chip ${form.schedule === 'recurring' ? 'active' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, schedule: 'recurring' }))}
                    >
                      周期执行
                    </button>
                  </div>
                </div>
                {form.schedule === 'recurring' && (
                  <div>
                    <div className="setting-label" style={{ marginBottom: 4 }}>Cron 表达式</div>
                    <input
                      className="chat-input-textarea"
                      style={{ width: '100%', border: '1px solid var(--cb-border)', borderRadius: 4, padding: '6px 10px' }}
                      value={form.cronExpression}
                      onChange={(e) => setForm((f) => ({ ...f, cronExpression: e.target.value }))}
                      placeholder="例如: 0 9 * * * (每天早上9点)"
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button className="chat-welcome-chip" onClick={() => setDialogOpen(false)}>
                  {t('chat.cancel')}
                </button>
                <button className="chat-welcome-chip active" onClick={handleSave}>
                  {t('settings.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      {detailTask && (
        <div
          className="settings-overlay visible"
          style={{ zIndex: 210 }}
          onClick={() => setDetailTask(null)}
        >
          <div
            className="settings-modal"
            style={{ width: 480, height: 'auto', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-main-header">
              <span className="settings-main-title">任务详情</span>
              <button className="settings-close-btn" onClick={() => setDetailTask(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="settings-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: getStatusColor(detailTask.status),
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--cb-text-primary)' }}>
                    {detailTask.title}
                  </span>
                  <span style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: getStatusColor(detailTask.status) + '18',
                    color: getStatusColor(detailTask.status),
                  }}>
                    {getStatusLabel(detailTask.status)}
                  </span>
                </div>

                {detailTask.description && (
                  <div>
                    <div className="setting-label" style={{ marginBottom: 4 }}>描述</div>
                    <div style={{ fontSize: 13, color: 'var(--cb-text-secondary)', lineHeight: 1.5 }}>{detailTask.description}</div>
                  </div>
                )}
                {detailTask.goal && (
                  <div>
                    <div className="setting-label" style={{ marginBottom: 4 }}>目标</div>
                    <div style={{ fontSize: 13, color: 'var(--cb-text-secondary)', lineHeight: 1.5 }}>{detailTask.goal}</div>
                  </div>
                )}
                {detailTask.verification && (
                  <div>
                    <div className="setting-label" style={{ marginBottom: 4 }}>验证方式</div>
                    <div style={{ fontSize: 13, color: 'var(--cb-text-secondary)', lineHeight: 1.5 }}>{detailTask.verification}</div>
                  </div>
                )}
                {detailTask.schedule && (
                  <div>
                    <div className="setting-label" style={{ marginBottom: 4 }}>执行方式</div>
                    <div style={{ fontSize: 13 }}>
                      <span className="chat-welcome-chip active" style={{ cursor: 'default' }}>
                        {detailTask.schedule === 'recurring' ? '周期执行' : '一次性'}
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>创建时间</div>
                  <div style={{ fontSize: 13, color: 'var(--cb-text-secondary)' }}>
                    {new Date(detailTask.createdAt).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {detailTask.status === 'pending' && (
                    <button className="chat-welcome-chip active" onClick={() => { handleStatusChange(detailTask.id, 'in_progress'); setDetailTask(null); }}>
                      开始执行
                    </button>
                  )}
                  {detailTask.status === 'in_progress' && (
                    <>
                      <button className="chat-welcome-chip active" style={{ background: '#22c55e', borderColor: '#22c55e', color: '#fff' }} onClick={() => { handleStatusChange(detailTask.id, 'completed'); setDetailTask(null); }}>
                        标记完成
                      </button>
                      <button className="chat-welcome-chip" style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }} onClick={() => { handleStatusChange(detailTask.id, 'failed'); setDetailTask(null); }}>
                        标记失败
                      </button>
                    </>
                  )}
                  <button className="chat-welcome-chip" onClick={() => { handleDelete(detailTask.id); setDetailTask(null); }}>
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
