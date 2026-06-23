import { useMemo } from 'react';
import type { TaskStep } from '../../types/api';

interface TaskProgressPanelProps {
  convId: string;
  steps: TaskStep[];
  isStreaming: boolean;
}

/**
 * TaskProgressPanel — displays real-time multi-step task progress.
 *
 * - Only renders when there are REAL steps (no fake/hardcoded fallback).
 * - Shows each step's status: pending (○), running (⏳), done (✅), error (❌).
 * - When streaming ends with no steps recorded, the panel simply disappears.
 */
export default function TaskProgressPanel({ steps, isStreaming }: TaskProgressPanelProps) {
  const hasRealSteps = steps.length > 0;

  const displaySteps = useMemo(() => {
    if (!hasRealSteps) return [];
    return steps;
  }, [steps, hasRealSteps]);

  // Don't render anything if there are no real steps, even while streaming.
  // Some simple AI responses don't have multi-step tasks, and showing nothing
  // is better than showing fake "分析需求 → 查询工具 → 执行任务 → 生成结果".
  if (!hasRealSteps) return null;

  // When streaming ends but steps exist, keep showing the panel with final state
  const completedCount = displaySteps.filter((s) => s.status === 'done').length;

  return (
    <div className="tw-px-5 tw-pt-2 tw-pb-0 tw-flex-shrink-0">
      <div className="tw-bg-[var(--cb-main-area-background)] tw-border tw-border-[var(--cb-border-subtle)] tw-rounded-lg tw-px-3 tw-py-2">
        {/* Progress summary header */}
        <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
          <div className="tw-text-xs tw-font-medium tw-text-[var(--cb-text-secondary)]">
            {isStreaming ? '任务执行中...' : '任务完成'}
          </div>
          {hasRealSteps && (
            <div className="tw-text-[11px] tw-text-[var(--wb-color-text-disabled)]">
              {completedCount}/{displaySteps.length} 已完成
            </div>
          )}
        </div>

        {/* Step list */}
        <div className="tw-flex tw-items-center tw-gap-3 tw-flex-wrap">
          {displaySteps.map((step, idx) => (
            <div key={step.id} className="tw-flex tw-items-center tw-gap-2">
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
                    ? 'tw-text-[var(--cb-text-secondary)]'
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
      </div>
    </div>
  );
}
