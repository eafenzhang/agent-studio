import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../../src/lib/api';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockOkResponse(data: unknown) {
  return { ok: true, json: async () => ({ success: true, data }) };
}

function mockFailResponse(error: string) {
  return { ok: true, json: async () => ({ success: false, error }) };
}

function mockNetworkError() {
  return Promise.reject(new Error('Network error'));
}

describe('api', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('healthCheck', () => {
    it('should return true on 200', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      expect(await api.healthCheck()).toBe(true);
    });

    it('should return false on non-200', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      expect(await api.healthCheck()).toBe(false);
    });
  });

  describe('getConversations', () => {
    it('should call GET /api/conversations', async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse({ items: [] }));
      const result = await api.getConversations();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversations'),
        expect.any(Object)
      );
      expect(result).toEqual({ items: [] });
    });

    it('should include query params', async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse({ items: [] }));
      await api.getConversations({ limit: '10', offset: '0' });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('limit=10');
      expect(url).toContain('offset=0');
    });
  });

  describe('createConversation', () => {
    it('should POST with body', async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse({ id: 'abc' }));
      const result = await api.createConversation({ name: 'Test' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversations'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"Test"'),
        })
      );
      expect(result.id).toBe('abc');
    });
  });

  describe('deleteConversation', () => {
    it('should call DELETE', async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse(null));
      await api.deleteConversation('conv-1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversations/conv-1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('getMessages', () => {
    it('should GET messages for a conversation', async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse({ items: [] }));
      await api.getMessages('conv-1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversations/conv-1/messages'),
        expect.any(Object)
      );
    });
  });

  describe('sendMessage', () => {
    it('should POST message', async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse({ msg_id: 'm1', turn_id: 't1' }));
      const result = await api.sendMessage('conv-1', { content: 'Hi' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversations/conv-1/messages'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.msg_id).toBe('m1');
    });
  });

  describe('getProviders / createProvider', () => {
    it('should GET providers', async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse([{ id: 'p1', name: 'OpenAI' }]));
      const result = await api.getProviders();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('OpenAI');
    });

    it('should POST provider', async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse({ id: 'p1' }));
      await api.createProvider({ name: 'DeepSeek', base_url: 'https://api.deepseek.com', api_key: 'sk-test' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/providers'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('error handling', () => {
    it('should throw on success false', async () => {
      mockFetch.mockResolvedValue(mockFailResponse('Custom error'));
      await expect(api.getConversations()).rejects.toThrow('Custom error');
    });
  });
});
