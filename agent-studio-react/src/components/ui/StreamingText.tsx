import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StreamingTextProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * 流式文本渲染组件
 *
 * 支持 Markdown 渲染（GFM 表格、代码块等）。
 * 流式追加时自动滚动到底部。
 */
export const StreamingText: React.FC<StreamingTextProps> = ({
  content,
  isStreaming = false,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [content, isStreaming]);

  if (!content) return null;

  return (
    <div className="streaming-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const isInline = !className;
            if (isInline) {
              return <code className="inline-code" {...props}>{children}</code>;
            }
            return (
              <pre className="code-block">
                <code className={className} {...props}>{children}</code>
              </pre>
            );
          },
          table({ children }) {
            return <div className="table-wrapper"><table>{children}</table></div>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && <span className="streaming-cursor">▊</span>}
      <div ref={bottomRef} />
    </div>
  );
};
