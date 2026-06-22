import React, { useMemo, useRef, useEffect } from 'react';

interface StreamingTextProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * 流式文本渲染组件
 *
 * 将纯文本按换行分割，流式追加时自动滚动到底部。
 * 后续可扩展支持 markdown 渲染（集成 react-markdown / rehype-highlight）。
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

  const lines = useMemo(() => content.split('\n'), [content]);

  return (
    <div className="streaming-text">
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
      {isStreaming && (
        <span className="streaming-cursor">▊</span>
      )}
      <div ref={bottomRef} />
    </div>
  );
};
