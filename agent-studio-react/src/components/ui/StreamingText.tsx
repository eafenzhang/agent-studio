import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface StreamingTextProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * StreamingText — 支持流式追加的 Markdown 渲染组件
 *
 * 性能优化：流式渲染时每 200ms 才更新一次 DOM，避免每 token 重渲染。
 */
export const StreamingText: React.FC<StreamingTextProps> = ({
  content,
  isStreaming = false,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [displayContent, setDisplayContent] = useState(content);
  const lastUpdateRef = useRef(0);
  const contentRef = useRef(content);

  // 流式渲染节流：不阻塞 content 更新，但限制 DOM 刷新频率
  useEffect(() => {
    contentRef.current = content;
    if (!isStreaming) {
      setDisplayContent(content);
      return;
    }
    const now = Date.now();
    if (now - lastUpdateRef.current > 200) {
      setDisplayContent(content);
      lastUpdateRef.current = now;
    } else {
      const timer = setTimeout(() => {
        setDisplayContent(contentRef.current);
        lastUpdateRef.current = Date.now();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [content, isStreaming]);

  useEffect(() => {
    if (isStreaming && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayContent, isStreaming]);

  if (!displayContent) return null;

  return (
    <div className="streaming-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            if (!className) return <code className="inline-code" {...props}>{children}</code>;
            return <pre className="code-block"><code className={className} {...props}>{children}</code></pre>;
          },
          table({ children }) {
            return <div className="table-wrapper"><table>{children}</table></div>;
          },
        }}
      >
        {displayContent}
      </ReactMarkdown>
      {isStreaming && <span className="streaming-cursor">▊</span>}
      <div ref={bottomRef} />
    </div>
  );
};
