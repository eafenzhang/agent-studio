/**
 * Tests for api.js - API Client
 * Mocks fetch to verify request URLs, methods, and error handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after setting up mocks
import * as api from '../src/api.js';

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper: create a mock fetch response
   */
  function mockResponse(data, success = true) {
    return {
      ok: true,
      json: async () => ({ success, data }),
    };
  }

  /**
   * Helper: create a mock fetch error response
   */
  function mockErrorResponse(error = '请求失败') {
    return {
      ok: true,
      json: async () => ({ success: false, error }),
    };
  }

  // ===== healthCheck =====
  describe('healthCheck', () => {
    it('should return true when response is ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const result = await api.healthCheck();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://127.0.0.1:25808/health');
    });

    it('should return false when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const result = await api.healthCheck();
      expect(result).toBe(false);
    });
  });

  // ===== getConversations =====
  describe('getConversations', () => {
    it('should call GET /api/conversations', async () => {
      const conversations = [{ id: '1', name: 'Test' }];
      mockFetch.mockResolvedValueOnce(mockResponse(conversations));

      const result = await api.getConversations();
      expect(result[0].id).toBe('1');
      expect(result[0].name).toBe('Test');
      expect(result[0].title).toBe('Test'); // normalized by adapter
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/conversations',
        expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
      );
    });

    it('should include query params when provided', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([]));
      await api.getConversations({ limit: 10, offset: 5 });
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('limit=10');
      expect(url).toContain('offset=5');
    });
  });

  // ===== createConversation =====
  describe('createConversation', () => {
    it('should call POST /api/conversations with body', async () => {
      const conv = { id: 'abc', name: 'New Chat' };
      mockFetch.mockResolvedValueOnce(mockResponse(conv));

      const result = await api.createConversation({ type: 'aionrs', name: 'New Chat' });
      expect(result).toEqual(conv);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/conversations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ type: 'aionrs', name: 'New Chat', extra: {} }),
        })
      );
    });
  });

  // ===== deleteConversation =====
  describe('deleteConversation', () => {
    it('should call DELETE /api/conversations/:id', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(null));
      await api.deleteConversation('conv-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/conversations/conv-123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // ===== getMessages =====
  describe('getMessages', () => {
    it('should call GET /api/conversations/:id/messages', async () => {
      const messages = [{ id: 'msg1', content: 'Hello' }];
      mockFetch.mockResolvedValueOnce(mockResponse(messages));
      const result = await api.getMessages('conv-123');
      expect(result[0].id).toBe('msg1');
      expect(result[0].content).toBe('Hello');
      expect(result[0].createdAt).toBeDefined(); // normalized by adapter
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/conversations/conv-123/messages',
        expect.objectContaining({})
      );
    });
  });

  // ===== sendMessage =====
  describe('sendMessage', () => {
    it('should call POST /api/conversations/:id/messages with body', async () => {
      const msg = { id: 'msg1', content: 'test' };
      mockFetch.mockResolvedValueOnce(mockResponse(msg));
      const result = await api.sendMessage('conv-123', { content: 'Hello' });
      expect(result).toEqual(msg);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/conversations/conv-123/messages',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Hello' }),
        })
      );
    });
  });

  // ===== cancelConversation =====
  describe('cancelConversation', () => {
    it('should call POST /api/conversations/:id/cancel', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(null));
      await api.cancelConversation('conv-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/conversations/conv-123/cancel',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // ===== getAgents =====
  describe('getAgents', () => {
    it('should call GET /api/agents', async () => {
      const agents = [{ id: '1', name: 'Agent1' }];
      mockFetch.mockResolvedValueOnce(mockResponse(agents));
      const result = await api.getAgents();
      expect(result).toEqual(agents);
    });
  });

  // ===== getProviders =====
  describe('getProviders', () => {
    it('should call GET /api/providers', async () => {
      const providers = [{ id: '1', name: 'OpenAI', models: ['gpt-4'] }];
      mockFetch.mockResolvedValueOnce(mockResponse(providers));
      const result = await api.getProviders();
      expect(result).toEqual(providers);
    });
  });

  // ===== createProvider =====
  describe('createProvider', () => {
    it('should call POST /api/providers with body', async () => {
      const provider = { id: '1', name: 'OpenAI' };
      mockFetch.mockResolvedValueOnce(mockResponse(provider));
      await api.createProvider({ name: 'OpenAI', base_url: 'https://api.openai.com' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/providers',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // ===== getAssistants =====
  describe('getAssistants', () => {
    it('should call GET /api/assistants', async () => {
      const assistants = [{ id: '1', name: 'Assistant1' }];
      mockFetch.mockResolvedValueOnce(mockResponse(assistants));
      const result = await api.getAssistants();
      expect(result).toEqual(assistants);
    });
  });

  // ===== getSkills (NEW endpoint) =====
  describe('getSkills', () => {
    it('should call GET /api/skills', async () => {
      const skills = [{ id: 'skill1', name: 'Web Search' }];
      mockFetch.mockResolvedValueOnce(mockResponse(skills));
      const result = await api.getSkills();
      expect(result).toEqual(skills);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/skills',
        expect.objectContaining({})
      );
    });
  });

  // ===== toggleSkill (NEW endpoint) =====
  describe('toggleSkill', () => {
    it('should call PATCH /api/skills/:id/enabled with enabled flag', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(null));
      await api.toggleSkill('skill1', true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/skills/skill1/enabled',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ enabled: true }),
        })
      );
    });

    it('should send false when disabling', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(null));
      await api.toggleSkill('skill2', false);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/skills/skill2/enabled',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ enabled: false }),
        })
      );
    });
  });

  // ===== getArtifacts (NEW endpoint) =====
  describe('getArtifacts', () => {
    it('should call GET /api/artifacts without query when no conversationId', async () => {
      const artifacts = [{ id: 'art1', name: 'Report.pdf' }];
      mockFetch.mockResolvedValueOnce(mockResponse(artifacts));
      const result = await api.getArtifacts();
      expect(result).toEqual(artifacts);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/artifacts',
        expect.objectContaining({})
      );
    });

    it('should include conversation_id as path when provided', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([]));
      await api.getArtifacts('conv-123');
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('/api/conversations/conv-123/artifacts');
    });

    it('should URL-encode conversation_id in path', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([]));
      await api.getArtifacts('conv with spaces');
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('/api/conversations/conv%20with%20spaces/artifacts');
    });
  });

  // ===== getMemory (NEW endpoint) =====
  describe('getMemory', () => {
    it('should call GET /api/memory', async () => {
      const memory = [{ id: 'mem1', content: 'Remember this' }];
      mockFetch.mockResolvedValueOnce(mockResponse(memory));
      const result = await api.getMemory();
      expect(result).toEqual(memory);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/memory',
        expect.objectContaining({})
      );
    });
  });

  // ===== deleteMemory (NEW endpoint) =====
  describe('deleteMemory', () => {
    it('should call DELETE /api/memory/:id', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(null));
      await api.deleteMemory('mem-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/memory/mem-123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // ===== getSettings / updateSettings =====
  describe('getSettings', () => {
    it('should call GET /api/settings', async () => {
      const settings = { theme: 'dark' };
      mockFetch.mockResolvedValueOnce(mockResponse(settings));
      const result = await api.getSettings();
      expect(result).toEqual(settings);
    });
  });

  describe('updateSettings', () => {
    it('should call PATCH /api/settings with body', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(null));
      await api.updateSettings({ theme: 'light' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ theme: 'light' }),
        })
      );
    });
  });

  // ===== MCP APIs =====
  describe('getMcpConfig', () => {
    it('should call GET /api/mcp', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ servers: [] }));
      await api.getMcpConfig();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/mcp/servers',
        expect.objectContaining({})
      );
    });
  });

  describe('addMcpServer', () => {
    it('should call POST /api/mcp with body', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(null));
      await api.addMcpServer({ name: 'GitHub MCP', command: 'npx' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:25808/api/mcp/servers',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // ===== Error Handling =====
  describe('Error handling', () => {
    it('should throw an error when API returns success: false', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse('Custom error'));
      await expect(api.getConversations()).rejects.toThrow('Custom error');
    });

    it('should throw default error message when no error field', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(null));
      await expect(api.getConversations()).rejects.toThrow('请求失败');
    });

    it('should throw when fetch rejects (network error)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(api.getConversations()).rejects.toThrow('Network error');
    });

    it('should throw when response.json() fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });
      await expect(api.getConversations()).rejects.toThrow();
    });
  });

  // ===== Content-Type header =====
  describe('Content-Type header', () => {
    it('should always include Content-Type: application/json header', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([]));
      await api.getConversations();
      const config = mockFetch.mock.calls[0][1];
      expect(config.headers['Content-Type']).toBe('application/json');
    });
  });

  // ===== Default export =====
  describe('Default export', () => {
    it('should export all API functions as default', () => {
      const defaultExport = api.default;
      expect(defaultExport.healthCheck).toBeDefined();
      expect(defaultExport.getConversations).toBeDefined();
      expect(defaultExport.createConversation).toBeDefined();
      expect(defaultExport.getSkills).toBeDefined();
      expect(defaultExport.toggleSkill).toBeDefined();
      expect(defaultExport.getArtifacts).toBeDefined();
      expect(defaultExport.getMemory).toBeDefined();
      expect(defaultExport.deleteMemory).toBeDefined();
    });
  });
});
