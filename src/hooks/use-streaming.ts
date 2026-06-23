import { useRef, useCallback, useState } from 'react';

/**
 * Custom hook for efficient streaming text rendering.
 * Uses requestAnimationFrame batching to avoid excessive re-renders
 * during high-frequency text streaming.
 *
 * @param initialContent - Starting text content (default '')
 * @returns { content, appendChunk, flush, setContent }
 */
export function useStreaming(initialContent = '') {
  const [content, setContent] = useState(initialContent);
  const bufferRef = useRef('');
  const rafRef = useRef<number>(0);

  const appendChunk = useCallback((chunk: string) => {
    bufferRef.current += chunk;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      setContent(bufferRef.current);
      bufferRef.current = '';
      rafRef.current = 0;
    });
  }, []);

  const flush = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (bufferRef.current) {
      setContent((prev) => prev + bufferRef.current);
      bufferRef.current = '';
    }
  }, []);

  return { content, appendChunk, flush, setContent } as const;
}
