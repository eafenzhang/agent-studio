import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ToolCallData {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'done' | 'error';
  startedAt?: number;
  endedAt?: number;
}

interface ToolCallCardProps {
  toolCall: ToolCallData;
}

const statusColors: Record<ToolCallData['status'], string> = {
  pending: 'tw-bg-[var(--cb-main-area-background)] tw-text-[var(--wb-color-text-disabled)]',
  running: 'tw-bg-[rgba(108,77,255,0.08)] tw-text-[var(--cb-button-primary)]',
  done: 'tw-bg-[rgba(34,197,94,0.1)] tw-text-[#22c55e]',
  error: 'tw-bg-[rgba(255,77,79,0.08)] tw-text-[#ff4d4f]',
};

const statusLabels: Record<ToolCallData['status'], string> = {
  pending: '待执行',
  running: '执行中',
  done: '已完成',
  error: '失败',
};

export default function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  const formatDuration = (): string => {
    if (!toolCall.startedAt) return '';
    const end = toolCall.endedAt || Date.now();
    const ms = end - toolCall.startedAt;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="tw-border tw-border-[var(--cb-border-subtle)] tw-rounded-lg tw-bg-white tw-overflow-hidden tw-transition-all">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="tw-w-full tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-text-left hover:tw-bg-[var(--cb-main-area-background)] tw-transition-colors"
      >
        <span
          className={`tw-inline-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5 tw-rounded tw-text-[11px] tw-font-medium ${statusColors[toolCall.status]}`}
        >
          {toolCall.status === 'running' && (
            <span className="tw-w-2 tw-h-2 tw-rounded-full tw-bg-[var(--cb-button-primary)] tw-animate-pulse" />
          )}
          {t(`toolCall.${toolCall.status}`)}
        </span>
        <span className="tw-text-[13px] tw-font-medium tw-text-[var(--cb-text-primary)] tw-flex-1 tw-truncate">
          {toolCall.name}
        </span>
        {toolCall.startedAt && (
          <span className="tw-text-[11px] tw-text-[var(--wb-color-text-disabled)] tw-flex-shrink-0">
            {formatDuration()}
          </span>
        )}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`tw-text-[var(--wb-color-text-disabled)] tw-transition-transform ${expanded ? 'tw-rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="tw-px-3 tw-pb-3 tw-space-y-2">
          {/* Arguments */}
          <div>
            <div className="tw-text-[11px] tw-font-medium tw-text-[var(--wb-color-text-disabled)] tw-mb-1 tw-uppercase tw-tracking-wide">
              {t('toolCall.args')}
            </div>
            <pre className="tw-text-xs tw-bg-[var(--cb-main-area-background)] tw-rounded-md tw-p-2 tw-overflow-x-auto tw-font-mono tw-text-[var(--cb-text-secondary)] tw-max-h-[120px] tw-overflow-y-auto">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {toolCall.result && (
            <div>
              <div className="tw-text-[11px] tw-font-medium tw-text-[var(--wb-color-text-disabled)] tw-mb-1 tw-uppercase tw-tracking-wide">
                {t('toolCall.result')}
              </div>
              <pre className="tw-text-xs tw-bg-[var(--cb-main-area-background)] tw-rounded-md tw-p-2 tw-overflow-x-auto tw-font-mono tw-text-[var(--cb-text-secondary)] tw-max-h-[200px] tw-overflow-y-auto">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
