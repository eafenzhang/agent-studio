import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// ===================================================================
// Simple line-based diff algorithm
// ===================================================================

interface DiffLine {
  type: 'same' | 'added' | 'removed';
  value: string;
  lineNumLeft?: number;
  lineNumRight?: number;
}

function computeDiff(before: string, after: string): DiffLine[] {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');

  // Use a simple LCS-based approach
  const lcs: number[][] = Array.from({ length: beforeLines.length + 1 }, () =>
    Array(afterLines.length + 1).fill(0)
  );

  for (let i = 1; i <= beforeLines.length; i++) {
    for (let j = 1; j <= afterLines.length; j++) {
      if (beforeLines[i - 1] === afterLines[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  // Backtrack to build the diff
  const result: DiffLine[] = [];
  let i = beforeLines.length;
  let j = afterLines.length;
  const temp: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
      temp.push({ type: 'same', value: beforeLines[i - 1], lineNumLeft: i, lineNumRight: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      temp.push({ type: 'added', value: afterLines[j - 1], lineNumRight: j });
      j--;
    } else {
      temp.push({ type: 'removed', value: beforeLines[i - 1], lineNumLeft: i });
      i--;
    }
  }

  // Reverse to get correct order
  for (let k = temp.length - 1; k >= 0; k--) {
    result.push(temp[k]);
  }

  return result;
}

// ===================================================================
// Props
// ===================================================================

interface DiffViewProps {
  fileName: string;
  beforeContent: string;
  afterContent: string;
  language?: string;
}

// ===================================================================
// Helpers
// ===================================================================

function getLangClass(language?: string): string {
  if (!language) return '';
  try {
    const hljs = (window as any).hljs;
    if (hljs && hljs.getLanguage(language)) return language;
  } catch { /* ignore */ }
  return language || '';
}

function highlightLine(code: string, language?: string): string {
  // Basic highlighting — escape HTML
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ===================================================================
// Component
// ===================================================================

export default function DiffView({ fileName, beforeContent, afterContent, language }: DiffViewProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  const diffLines = useMemo(() => computeDiff(beforeContent, afterContent), [beforeContent, afterContent]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const line of diffLines) {
      if (line.type === 'added') added++;
      if (line.type === 'removed') removed++;
    }
    return { added, removed, total: diffLines.length };
  }, [diffLines]);

  // If no changes, show a simple message
  if (stats.added === 0 && stats.removed === 0) {
    return (
      <div style={{
        margin: '8px 0',
        border: '1px solid var(--cb-border-subtle)',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        <div className="code-block-header">
          <span className="code-block-lang">{fileName}</span>
          <span style={{ fontSize: 12, color: 'var(--wb-color-text-disabled)', padding: '0 8px' }}>无变更</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      margin: '8px 0',
      border: '1px solid var(--cb-border-subtle)',
      borderRadius: 8,
      overflow: 'hidden',
      fontSize: 12,
    }}>
      {/* Header */}
      <div className="code-block-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 10px',
        background: 'var(--cb-main-area-background)',
        borderBottom: '1px solid var(--cb-border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="code-block-lang">{fileName}</span>
          <span style={{ color: '#22c55e', fontSize: 11 }}>+{stats.added}</span>
          <span style={{ color: '#ef4444', fontSize: 11 }}>-{stats.removed}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setViewMode('unified')}
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              border: '1px solid var(--cb-border)',
              background: viewMode === 'unified' ? 'var(--cb-button-primary)' : 'transparent',
              color: viewMode === 'unified' ? '#fff' : 'var(--cb-text-secondary)',
              cursor: 'pointer',
            }}
          >
            统一
          </button>
          <button
            onClick={() => setViewMode('split')}
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              border: '1px solid var(--cb-border)',
              background: viewMode === 'split' ? 'var(--cb-button-primary)' : 'transparent',
              color: viewMode === 'split' ? '#fff' : 'var(--cb-text-secondary)',
              cursor: 'pointer',
            }}
          >
            分栏
          </button>
        </div>
      </div>

      {/* Unified view */}
      {viewMode === 'unified' && (
        <div style={{ overflowX: 'auto', fontFamily: 'var(--cb-font-mono, monospace)', lineHeight: 1.5 }}>
          {diffLines.map((line, idx) => {
            const bgColor = line.type === 'added' ? 'rgba(34,197,94,0.08)'
              : line.type === 'removed' ? 'rgba(239,68,68,0.08)'
              : 'transparent';
            const prefix = line.type === 'added' ? '+'
              : line.type === 'removed' ? '-'
              : ' ';
            const prefixColor = line.type === 'added' ? '#22c55e'
              : line.type === 'removed' ? '#ef4444'
              : 'var(--wb-color-text-disabled)';

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  background: bgColor,
                  padding: '0 8px',
                }}
              >
                <span style={{
                  width: 32,
                  textAlign: 'right',
                  paddingRight: 8,
                  color: 'var(--wb-color-text-disabled)',
                  userSelect: 'none',
                  flexShrink: 0,
                }}>
                  {line.lineNumLeft || ''}
                </span>
                <span style={{
                  width: 32,
                  textAlign: 'right',
                  paddingRight: 8,
                  color: 'var(--wb-color-text-disabled)',
                  userSelect: 'none',
                  flexShrink: 0,
                }}>
                  {line.lineNumRight || ''}
                </span>
                <span style={{
                  width: 16,
                  flexShrink: 0,
                  color: prefixColor,
                  fontWeight: 700,
                }}>
                  {prefix}
                </span>
                <span style={{
                  flex: 1,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: 'var(--cb-text-primary)',
                }}
                  dangerouslySetInnerHTML={{ __html: highlightLine(line.value, language) }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Split view */}
      {viewMode === 'split' && (
        <div style={{ display: 'flex', fontFamily: 'var(--cb-font-mono, monospace)', lineHeight: 1.5 }}>
          {/* Before */}
          <div style={{ flex: 1, borderRight: '1px solid var(--cb-border-subtle)', minWidth: 0 }}>
            <div style={{
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 600,
              color: '#ef4444',
              background: 'rgba(239,68,68,0.06)',
              borderBottom: '1px solid rgba(239,68,68,0.1)',
            }}>
              修改前
            </div>
            {beforeContent.split('\n').map((line, idx) => (
              <div key={idx} style={{ display: 'flex', padding: '0 8px', background: idx % 2 === 0 ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                <span style={{ width: 28, textAlign: 'right', paddingRight: 6, color: 'var(--wb-color-text-disabled)', userSelect: 'none', flexShrink: 0 }}>{idx + 1}</span>
                <span style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--cb-text-primary)' }}>{line}</span>
              </div>
            ))}
          </div>
          {/* After */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 600,
              color: '#22c55e',
              background: 'rgba(34,197,94,0.06)',
              borderBottom: '1px solid rgba(34,197,94,0.1)',
            }}>
              修改后
            </div>
            {afterContent.split('\n').map((line, idx) => (
              <div key={idx} style={{ display: 'flex', padding: '0 8px', background: idx % 2 === 0 ? 'rgba(34,197,94,0.03)' : 'transparent' }}>
                <span style={{ width: 28, textAlign: 'right', paddingRight: 6, color: 'var(--wb-color-text-disabled)', userSelect: 'none', flexShrink: 0 }}>{idx + 1}</span>
                <span style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--cb-text-primary)' }}>{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
