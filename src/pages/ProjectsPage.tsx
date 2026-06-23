import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/ui-store';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/use-api';
import type { Project } from '../types/api';

const LOCAL_PROJECTS_KEY = 'agent-studio-local-projects';

function loadLocalProjects(): Project[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalProjects(projects: Project[]) {
  try {
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    // ignore
  }
}

export default function ProjectsPage() {
  const { t } = useTranslation();
  const addToast = useUIStore((s) => s.addToast);
  const { data: apiProjects, isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [localProjects, setLocalProjects] = useState<Project[]>(loadLocalProjects);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', path: '' });
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);

  const projects = useMemo(() => {
    if (apiProjects?.items && apiProjects.items.length > 0) {
      return apiProjects.items;
    }
    if (usingLocalFallback || error) {
      return localProjects;
    }
    return [];
  }, [apiProjects, localProjects, usingLocalFallback, error]);

  const handleOpenNew = () => {
    setEditId(null);
    setForm({ name: '', description: '', path: '' });
    setDialogOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setEditId(project.id);
    setForm({
      name: project.name || '',
      description: project.description || '',
      path: project.path || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('请输入项目名称', 'warning');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      path: form.path.trim(),
    };

    try {
      if (usingLocalFallback || error) {
        // Local fallback mode
        if (editId) {
          const next = localProjects.map((p) =>
            p.id === editId ? { ...p, ...payload, updatedAt: new Date().toISOString() } : p
          );
          setLocalProjects(next);
          saveLocalProjects(next);
          addToast('项目已更新', 'success');
        } else {
          const newProject: Project = {
            id: `proj-${Date.now()}`,
            ...payload,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const next = [newProject, ...localProjects];
          setLocalProjects(next);
          saveLocalProjects(next);
          addToast('项目已创建', 'success');
        }
        setDialogOpen(false);
        return;
      }

      // Try API first
      try {
        if (editId) {
          await updateProject.mutateAsync({ id: editId, data: payload });
          addToast('项目已更新', 'success');
        } else {
          await createProject.mutateAsync(payload);
          addToast('项目已创建', 'success');
        }
        setDialogOpen(false);
      } catch (apiErr) {
        console.warn('Project API failed, switching to local fallback:', apiErr);
        setUsingLocalFallback(true);
        // Retry with local fallback
        if (editId) {
          const next = localProjects.map((p) =>
            p.id === editId ? { ...p, ...payload, updatedAt: new Date().toISOString() } : p
          );
          setLocalProjects(next);
          saveLocalProjects(next);
          addToast('项目已更新（本地模式）', 'success');
        } else {
          const newProject: Project = {
            id: `proj-${Date.now()}`,
            ...payload,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const next = [newProject, ...localProjects];
          setLocalProjects(next);
          saveLocalProjects(next);
          addToast('项目已创建（本地模式）', 'success');
        }
        setDialogOpen(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      addToast(message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('chat.deleteConv'))) return;
    try {
      if (usingLocalFallback || error) {
        const next = localProjects.filter((p) => p.id !== id);
        setLocalProjects(next);
        saveLocalProjects(next);
        addToast('项目已删除', 'success');
        return;
      }

      try {
        await deleteProject.mutateAsync(id);
        addToast('项目已删除', 'success');
      } catch (apiErr) {
        console.warn('Project API delete failed, switching to local fallback:', apiErr);
        setUsingLocalFallback(true);
        const next = localProjects.filter((p) => p.id !== id);
        setLocalProjects(next);
        saveLocalProjects(next);
        addToast('项目已删除（本地模式）', 'success');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败';
      addToast(message, 'error');
    }
  };

  const handleSwitchToLocal = () => {
    setUsingLocalFallback(true);
    addToast('已切换到本地项目列表', 'info');
  };

  return (
    <div className="page active">
      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="setting-label" style={{ marginBottom: 0 }}>项目列表</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!usingLocalFallback && !error && (
              <button className="chat-welcome-chip" onClick={handleSwitchToLocal}>
                使用本地模式
              </button>
            )}
            <button className="chat-welcome-chip active" onClick={handleOpenNew}>
              新建项目
            </button>
          </div>
        </div>

        {error && !usingLocalFallback && (
          <div style={{ padding: 12, marginBottom: 12, background: 'rgba(255,77,79,0.06)', borderRadius: 6, fontSize: 13, color: '#ff4d4f' }}>
            后端项目接口不可用，已自动切换到本地模式。
          </div>
        )}

        {isLoading && !usingLocalFallback && !error ? (
          <div style={{ textAlign: 'center', padding: 40, fontSize: 13, color: 'var(--wb-color-text-disabled)' }}>
            {t('common.loading')}
          </div>
        ) : projects.length === 0 ? (
          <div className="not-available" style={{ marginTop: 24 }}>
            <div className="not-available-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              </svg>
            </div>
            <div className="not-available-title">暂无项目</div>
            <div className="not-available-desc" style={{ marginTop: 8 }}>点击右上角新建项目开始使用</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map((p) => (
              <div
                key={p.id}
                style={{
                  background: '#fff',
                  border: '1px solid var(--cb-border-subtle)',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setDetailProject(p)}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cb-text-primary)' }}>{p.name}</div>
                  {p.description && (
                    <div style={{ fontSize: 12, color: 'var(--cb-text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.description}
                    </div>
                  )}
                  {p.path && (
                    <div style={{ fontSize: 11, color: 'var(--wb-color-text-disabled)', marginTop: 2 }}>
                      {p.path}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => handleOpenEdit(p)}
                    style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, color: 'var(--cb-text-secondary)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, color: '#ff4d4f' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,77,79,0.06)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <div className="settings-overlay visible" style={{ zIndex: 210 }} onClick={() => setDialogOpen(false)}>
          <div
            className="settings-modal"
            style={{ width: 420, height: 'auto', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-main-header">
              <span className="settings-main-title">{editId ? '编辑项目' : '新建项目'}</span>
              <button className="settings-close-btn" onClick={() => setDialogOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="settings-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>项目名称</div>
                  <input
                    className="chat-input-textarea"
                    style={{ width: '100%', border: '1px solid var(--cb-border)', borderRadius: 4, padding: '6px 10px' }}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="输入项目名称"
                  />
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>描述</div>
                  <input
                    className="chat-input-textarea"
                    style={{ width: '100%', border: '1px solid var(--cb-border)', borderRadius: 4, padding: '6px 10px' }}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="输入项目描述（可选）"
                  />
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>路径</div>
                  <input
                    className="chat-input-textarea"
                    style={{ width: '100%', border: '1px solid var(--cb-border)', borderRadius: 4, padding: '6px 10px' }}
                    value={form.path}
                    onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
                    placeholder="输入项目路径（可选）"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
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
        </div>
      )}

      {/* Detail Dialog */}
      {detailProject && (
        <div className="settings-overlay visible" style={{ zIndex: 210 }} onClick={() => setDetailProject(null)}>
          <div
            className="settings-modal"
            style={{ width: 420, height: 'auto', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-main-header">
              <span className="settings-main-title">项目详情</span>
              <button className="settings-close-btn" onClick={() => setDetailProject(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="settings-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>名称</div>
                  <div style={{ fontSize: 13, color: 'var(--cb-text-primary)' }}>{detailProject.name}</div>
                </div>
                {detailProject.description && (
                  <div>
                    <div className="setting-label" style={{ marginBottom: 4 }}>描述</div>
                    <div style={{ fontSize: 13, color: 'var(--cb-text-secondary)' }}>{detailProject.description}</div>
                  </div>
                )}
                {detailProject.path && (
                  <div>
                    <div className="setting-label" style={{ marginBottom: 4 }}>路径</div>
                    <div style={{ fontSize: 13, color: 'var(--cb-text-secondary)', wordBreak: 'break-all' }}>{detailProject.path}</div>
                  </div>
                )}
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>创建时间</div>
                  <div style={{ fontSize: 13, color: 'var(--cb-text-secondary)' }}>
                    {detailProject.createdAt ? new Date(detailProject.createdAt).toLocaleString() : '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
