import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export interface PermissionRequest {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  description: string;
  reason: string;
}

interface PermissionDialogProps {
  request: PermissionRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveAlways: (id: string) => void;
}

const TOOL_ICONS: Record<string, string> = {
  read_file: '📖',
  write_file: '✏️',
  edit_file: '✏️',
  create_file: '📄',
  delete_file: '🗑️',
  run_command: '💻',
  bash: '💻',
  execute: '▶️',
  search: '🔍',
  web_search: '🌐',
  web_fetch: '🌐',
  list_directory: '📁',
};

function getToolIcon(name: string): string {
  return TOOL_ICONS[name] || '🔧';
}

function getArgPreview(args: Record<string, unknown>): string {
  // Show command or file path as the preview
  const command = args.command as string;
  if (command) return command.length > 80 ? command.slice(0, 80) + '...' : command;

  const filePath = (args.path || args.file_path || args.file) as string;
  if (filePath) return filePath;

  const content = args.content as string;
  if (content) return content.length > 80 ? content.slice(0, 80) + '...' : content;

  return JSON.stringify(args).slice(0, 80);
}

export default function PermissionDialog({
  request,
  onApprove,
  onReject,
  onApproveAlways,
}: PermissionDialogProps) {
  const { t } = useTranslation();

  const handleApprove = useCallback(() => onApprove(request.id), [onApprove, request.id]);
  const handleReject = useCallback(() => onReject(request.id), [onReject, request.id]);
  const handleApproveAlways = useCallback(() => onApproveAlways(request.id), [onApproveAlways, request.id]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        margin: '4px 0 4px 38px',
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 8,
        fontSize: 13,
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{getToolIcon(request.toolName)}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, color: 'var(--cb-text-primary)', fontSize: 12 }}>
            {request.toolName}
          </span>
          <span style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 4,
            background: 'rgba(245,158,11,0.12)',
            color: '#d97706',
            fontWeight: 500,
          }}>
            待审批
          </span>
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--cb-text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {getArgPreview(request.args)}
        </div>
        {request.reason && (
          <div style={{ fontSize: 11, color: 'var(--wb-color-text-disabled)', marginTop: 2 }}>
            {request.reason}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button
          onClick={handleReject}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: 12,
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'transparent',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          ✕ 拒绝
        </button>
        <button
          onClick={handleApprove}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: 12,
            color: '#fff',
            background: 'var(--cb-button-primary)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          ✓ 允许
        </button>
        <button
          onClick={handleApproveAlways}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 11,
            color: 'var(--cb-text-secondary)',
            border: '1px solid var(--cb-border)',
            background: 'transparent',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          title="本次会话始终允许"
        >
          始终允许
        </button>
      </div>
    </div>
  );
}
