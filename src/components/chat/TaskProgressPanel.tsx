import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TaskStep, TaskStepStatus } from '../../types/api';
import { useTaskStepsStore } from '../../stores/task-store';

interface TaskProgressPanelProps {
  convId: string;
  steps: TaskStep[];
  isStreaming: boolean;
}

/**
 * TaskProgressPanel — interactive multi-step task progress tracker.
 *
 * - Steps come from WS `plan` events (real-time) or localStorage (persisted).
 * - User can click on a step to cycle its status: pending → in_progress → done
 * - Progress bar + completion count shown at top.
 * - Only renders when there are real steps.
 */
export default function TaskProgressPanel({ convId, steps, isStreaming }: TaskProgressPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useTranslation();
  const updateStepStatus = useTaskStepsStore((s) => s.updateStepStatus);

  const hasRealSteps = steps.length > 0;

  // Merge persisted status overrides into display steps
  const persistedSteps = useTaskStepsStore((s) => s.stepsByConv[convId]);
  const displaySteps = useMemo<TaskStep[]>(() => {
    if (!hasRealSteps) return [];
    if (!persistedSteps || persistedSteps.length === 0) return steps;

    // Use persisted steps as the base, but merge in new steps from WS
    const merged = [...persistedSteps];
    for (const step of steps) {
      const existing = merged.find((s) => s.id === step.id);
      if (!existing) {
        merged.push(step);
      } else if (step.status !== existing.status && isStreaming) {
        // WS update takes priority during streaming
        const idx = merged.indexOf(existing);
        merged[idx] = step;
      }
    }
    return merged;
  }, [steps, persistedSteps, hasRealSteps, isStreaming]);

  // Cycle status: pending → in_progress → done → pending
  const handleStepClick = useCallback(
    (stepId: string, currentStatus: TaskStepStatus) => {
      if (isStreaming) return; // Don't allow manual changes during streaming
      const nextStatus: Record<TaskStepStatus, TaskStepStatus> = {
        pending: 'running' as TaskStepStatus,
        running: 'done' as TaskStepStatus,
        done: 'pending' as TaskStepStatus,
        error: 'pending' as TaskStepStatus,
      };
      updateStepStatus(convId, stepId, nextStatus[currentStatus] || 'pending');
    },
    [convId, isStreaming, updateStepStatus]
  );

  if (!hasRealSteps) return null;

  const completedCount = displaySteps.filter((s) => s.status === 'done').length;
  const totalCount = displaySteps.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="tw-px-5 tw-pt-2 tw-pb-0 tw-flex-shrink-0">
      <div className="tw-bg-[var(--cb-main-area-background)] tw-border tw-border-[var(--cb-border-subtle)] tw-rounded-lg tw-px-3 tw-py-2">
        {/* Header: progress bar + collapse toggle */}
        <div
          className="tw-flex tw-items-center tw-justify-between tw-mb-1 tw-cursor-pointer tw-select-none"
          onClick={() => setCollapsed((c) => !c)}
        >
          <div className="tw-flex tw-items-center tw-gap-2 tw-flex-1">
            <span className="tw-text-xs tw-font-medium tw-text-[var(--cb-text-secondary)]">
              {isStreaming ? t('tasks.inProgress') : completedCount === totalCount ? t('tasks.completed') : t('tasks.progress')}
            </span>
            {/* Mini progress bar */}
            <div className="tw-flex-1 tw-max-w-[120px] tw-h-1.5 tw-bg-[var(--cb-border)] tw-rounded-full tw-overflow-hidden">
              <div
                className="tw-h-full tw-rounded-full tw-transition-all tw-duration-300"
                style={{
                  width: `${progressPct}%`,
                  background: completedCount === totalCount ? '#22c55e' : 'var(--cb-button-primary)',
                }}
              />
            </div>
            <span className="tw-text-[11px] tw-text-[var(--wb-color-text-disabled)] tw-whitespace-nowrap">
              {completedCount}/{totalCount}
            </span>
          </div>
          {/* Collapse chevron */}
          <svg
            className={`tw-w-3 tw-h-3 tw-text-[var(--wb-color-text-disabled)] tw-transition-transform ${collapsed ? '' : 'tw-rotate-180'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Steps */}
        {!collapsed && (
          <div className="tw-flex tw-items-center tw-gap-3 tw-flex-wrap">
            {displaySteps.map((step, idx) => (
              <div
                key={step.id}
                className={`tw-flex tw-items-center tw-gap-2 tw-cursor-pointer tw-select-none tw-rounded tw-px-1 tw-py-0.5 tw-transition-colors ${
                  !isStreaming ? 'hover:tw-bg-[var(--cb-border-subtle)]' : ''
                }`}
                onClick={() => handleStepClick(step.id, step.status)}
                title={
                  isStreaming
                    ? ''
                    : step.status === 'pending'
                    ? t('tasks.clickToStart')
                    : step.status === 'running'
                    ? t('tasks.clickToDone')
                    : t('tasks.clickToReset')
                }
              >
                {/* Status icon */}
                <div
                  className={`tw-w-4 tw-h-4 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-[10px] tw-font-semibold tw-flex-shrink-0 ${
                    step.status === 'done'
                      ? 'tw-bg-[#22c55e] tw-text-white'
                      : step.status === 'running'
                      ? 'tw-bg-[var(--cb-button-primary)] tw-text-white tw-animate-pulse'
                      : step.status === 'error'
                      ? 'tw-bg-[#ff4d4f] tw-text-white'
                      : 'tw-bg-[var(--cb-border)] tw-text-[var(--wb-color-text-disabled)]'
                  }`}
                >
                  {step.status === 'done' ? (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : step.status === 'running' ? (
                    <svg className="tw-animate-spin" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                    </svg>
                  ) : step.status === 'error' ? (
                    '✕'
                  ) : (
                    idx + 1
                  )}
                </div>

                {/* Step label */}
                <span
                  className={`tw-text-xs ${
                    step.status === 'running'
                      ? 'tw-text-[var(--cb-button-primary)] tw-font-medium'
                      : step.status === 'done'
                      ? 'tw-text-[var(--cb-text-secondary)] tw-line-through'
                      : step.status === 'error'
                      ? 'tw-text-[#ff4d4f]'
                      : 'tw-text-[var(--wb-color-text-disabled)]'
                  }`}
                >
                  {step.label}
                </span>

                {/* Connector between steps */}
                {idx < displaySteps.length - 1 && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--cb-border)"
                    strokeWidth="2"
                    className="tw-flex-shrink-0"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
