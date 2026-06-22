import { useState, useEffect, useCallback } from 'react';

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  /** 是否正在使用 mock 数据（API 不可用时的降级） */
  isMock: boolean;
  /** 重新加载 */
  refetch: () => void;
}

/**
 * 通用的数据加载 Hook
 *
 * 优先请求 API，失败时自动降级到 mock 数据。
 *
 * @param fetchFn  - API 请求函数（返回 null 或抛出错误表示不可用）
 * @param mockData - 降级用的 mock 数据
 * @param deps     - 依赖数组（触发重新加载）
 */
export function useAsyncData<T>(
  fetchFn: () => Promise<T | null>,
  mockData: T,
  deps: React.DependencyList = [],
): AsyncState<T> {
  const [data, setData] = useState<T>(mockData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (result !== null) {
        setData(result);
        setIsMock(false);
      } else {
        setData(mockData);
        setIsMock(true);
      }
    } catch (err: any) {
      setData(mockData);
      setIsMock(true);
      setError(err?.message || '请求失败，使用离线数据');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, isMock, refetch: load };
}
