import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';

// ===== Conversation hooks =====

export function useConversations(searchQuery?: string) {
  return useQuery({
    queryKey: ['conversations', searchQuery || ''],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (searchQuery?.trim()) {
        params.search = searchQuery.trim();
      }
      return api.getConversations(params);
    },
    staleTime: 30_000,
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => api.getConversation(id),
    enabled: !!id,
  });
}

export function useMessages(convId: string) {
  return useQuery({
    queryKey: ['messages', convId],
    queryFn: () => api.getMessages(convId),
    enabled: !!convId,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.createConversation>[0]) =>
      api.createConversation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useSendMessage(convId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.sendMessage>[1]) =>
      api.sendMessage(convId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', convId] });
    },
  });
}

// ===== Provider hooks =====

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: () => api.getProviders(),
    staleTime: 60_000,
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

// ===== Agent/Assistant hooks =====

export function useAssistants() {
  return useQuery({
    queryKey: ['assistants'],
    queryFn: () => api.getAssistants(),
    staleTime: 60_000,
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => api.getAgents(),
    staleTime: 60_000,
  });
}

// ===== Settings hooks =====

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
    staleTime: 120_000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

// ===== Skills hooks =====

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: () => api.getSkills(),
    staleTime: 60_000,
  });
}

// ===== MCP hooks =====

export function useMcpServers() {
  return useQuery({
    queryKey: ['mcpServers'],
    queryFn: () => api.getMcpServers(),
    staleTime: 60_000,
  });
}

export function useMcpConfig() {
  return useQuery({
    queryKey: ['mcpConfig'],
    queryFn: () => api.getMcpConfig(),
    staleTime: 60_000,
  });
}

// ===== Artifacts hooks =====

export function useArtifacts(conversationId: string | null = null) {
  return useQuery({
    queryKey: ['artifacts', conversationId],
    queryFn: () => api.getArtifacts(conversationId),
    enabled: true,
  });
}

// ===== Memory hooks =====

export function useMemory() {
  return useQuery({
    queryKey: ['memory'],
    queryFn: () => api.getMemory(),
    staleTime: 60_000,
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteMemory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] });
    },
  });
}

// ===== Project hooks =====

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
    staleTime: 60_000,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateProject>[1] }) =>
      api.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
