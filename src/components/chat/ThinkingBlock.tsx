import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThinkingBlock as ThinkingBlockType } from '../../hooks/use-conversation-stream';

interface ThinkingBlockProps {
  block: ThinkingBlockType;
}

/**
 * ThinkingBlock — displays an agent's chain-of-thought as a collapsible
 * "thought" section. The agent's internal reasoning is shown in a muted,
 * code-like style so it's visually distinct from the final response.
 */
export default function ThinkingBlock({ block }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(true);
  const { t } = useTranslation();

  return (
    <div
      style={{
        marginTop: 8,
        marginBottom: 4,
        paddingLeft: 38,
      }}
    >
      <div
        style={{
          border: '1px solid var(--cb-border-subtle, #e5e7eb)',
          borderRadius: 8,
          background: 'var(--cb-main-area-background, #f8f8f8)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            padding: '6px 10px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--cb-text-secondary, #666)',
            fontWeight: 500,
          }}
        >
          {/* Sparkle icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--cb-button-primary, #6c4dff)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" />
          </svg>
          <span>{t('thinking.label')}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              marginLeft: 'auto',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Content */}
        {expanded && (
          <div
            style={{
              padding: '4px 10px 10px',
              fontSize: 12,
              lineHeight: 1.6,
              color: 'var(--cb-text-secondary, #666)',
              fontFamily: 'var(--cb-font-mono, SF Mono, Menlo, monospace)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {block.content}
          </div>
        )}
      </div>
    </div>
  );
}
