import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useConversations,
  useConversation,
  useMessages,
  useCreateConversation,
  useProviders,
  useMemory,
  useProjects,
} from '../../src/hooks/use-api';
import * as api from '../../src/lib/api';
import React from 'react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

vi.mock('../../src/lib/api', () => ({
  getConversations: vi.fn(),
  getConversation: vi.fn(),
  getMessages: vi.fn(),
  createConversation: vi.fn(),
  getProviders: vi.fn(),
  getMemory: vi.fn(),
  getProjects: vi.fn(),
}));

describe('use-api hooks', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('useConversations calls api.getConversations', async () => {
    const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockApi.getConversations.mockResolvedValue({ items: [{ id: '1', name: 'Test' }] });
    const { result } = renderHook(() => useConversations(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockApi.getConversations).toHaveBeenCalled();
  });

  it('useConversation is disabled when id is empty', () => {
    const { result } = renderHook(() => useConversation(''), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  it('useMessages is disabled when id is empty', () => {
    const { result } = renderHook(() => useMessages(''), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  it('useCreateConversation calls api.createConversation', async () => {
    const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockApi.createConversation.mockResolvedValue({ id: 'new', name: 'New' });
    const { result } = renderHook(() => useCreateConversation(), { wrapper });
    await result.current.mutateAsync({ name: 'New' });
    expect(mockApi.createConversation).toHaveBeenCalledWith({ name: 'New' });
  });

  it('useProviders calls api.getProviders', async () => {
    const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockApi.getProviders.mockResolvedValue([{ id: 'p1', name: 'OpenAI' }]);
    const { result } = renderHook(() => useProviders(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockApi.getProviders).toHaveBeenCalled();
  });

  it('useMemory calls api.getMemory', async () => {
    const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockApi.getMemory.mockResolvedValue([{ id: 'm1', value: 'Remember' }]);
    const { result } = renderHook(() => useMemory(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockApi.getMemory).toHaveBeenCalled();
  });

  it('useProjects calls api.getProjects', async () => {
    const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockApi.getProjects.mockResolvedValue({ items: [{ id: 'proj-1', name: 'Project' }] });
    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockApi.getProjects).toHaveBeenCalled();
  });
});
