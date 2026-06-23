/**
 * Tests for state.js - Global State Management (Observer Pattern)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import state from '../src/state.js';

describe('State Management', () => {
  beforeEach(() => {
    // Reset state to initial values before each test
    state._data = {
      conversations: [],
      currentConversationId: null,
      messages: {},
      providers: [],
      assistants: [],
      skills: [],
      mcpServers: [],
      agents: [],
      artifacts: [],
      memory: [],
      settings: {},
      connectionStatus: 'disconnected',
      currentPage: 'home',
      selectedModel: null,
      selectedExpert: null,
      selectedMode: 'action',
      selectedSkills: [],
      selectedMcpTools: [],
      isGenerating: false,
      sidebarCollapsed: false,
      expertFilter: 'all',
      toolTab: 'skill',
      artifactFilter: 'all',
    };
    state._listeners = new Map();
  });

  describe('get / set', () => {
    it('should get a value by key', () => {
      expect(state.get('currentPage')).toBe('home');
      expect(state.get('isGenerating')).toBe(false);
      expect(state.get('selectedModel')).toBe(null);
    });

    it('should set a value by key', () => {
      state.set('currentPage', 'experts');
      expect(state.get('currentPage')).toBe('experts');
    });

    it('should set and get complex values (arrays, objects)', () => {
      const conversations = [{ id: '1', name: 'Test' }];
      state.set('conversations', conversations);
      expect(state.get('conversations')).toEqual(conversations);
      expect(state.get('conversations')).toHaveLength(1);
    });

    it('should overwrite existing values', () => {
      state.set('selectedModel', 'GPT-4o');
      expect(state.get('selectedModel')).toBe('GPT-4o');
      state.set('selectedModel', 'Claude 3.5');
      expect(state.get('selectedModel')).toBe('Claude 3.5');
    });

    it('should return undefined for non-existent keys', () => {
      expect(state.get('nonExistentKey')).toBeUndefined();
    });
  });

  describe('subscribe / notify', () => {
    it('should notify subscribers when value changes', () => {
      const callback = vi.fn();
      state.subscribe('currentPage', callback);

      state.set('currentPage', 'experts');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('experts', 'home');
    });

    it('should pass newValue and oldValue to callback', () => {
      const callback = vi.fn();
      state.set('selectedMode', 'action');
      state.subscribe('selectedMode', callback);

      state.set('selectedMode', 'plan');

      expect(callback).toHaveBeenCalledWith('plan', 'action');
    });

    it('should NOT notify when value is the same (reference equality)', () => {
      const callback = vi.fn();
      state.set('isGenerating', false);
      state.subscribe('isGenerating', callback);

      state.set('isGenerating', false);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers for the same key', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      state.subscribe('currentPage', cb1);
      state.subscribe('currentPage', cb2);

      state.set('currentPage', 'tools');

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('should not affect subscribers of other keys', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      state.subscribe('currentPage', cb1);
      state.subscribe('selectedModel', cb2);

      state.set('currentPage', 'experts');

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).not.toHaveBeenCalled();
    });

    it('should catch errors in subscriber callbacks without breaking others', () => {
      const errorCb = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCb = vi.fn();

      // Suppress console.error for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      state.subscribe('currentPage', errorCb);
      state.subscribe('currentPage', normalCb);

      state.set('currentPage', 'tools');

      expect(errorCb).toHaveBeenCalledTimes(1);
      expect(normalCb).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });

  describe('unsubscribe', () => {
    it('should return an unsubscribe function', () => {
      const callback = vi.fn();
      const unsub = state.subscribe('currentPage', callback);
      expect(typeof unsub).toBe('function');
    });

    it('should stop receiving notifications after unsubscribe', () => {
      const callback = vi.fn();
      const unsub = state.subscribe('currentPage', callback);

      state.set('currentPage', 'experts');
      expect(callback).toHaveBeenCalledTimes(1);

      unsub();

      state.set('currentPage', 'tools');
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe('update (partial object update)', () => {
    it('should update a nested field within an object value', () => {
      state.set('settings', { theme: 'light', lang: 'en' });
      state.update('settings', 'theme', 'dark');

      expect(state.get('settings').theme).toBe('dark');
      expect(state.get('settings').lang).toBe('en');
    });

    it('should notify subscribers when update is called', () => {
      const callback = vi.fn();
      state.set('settings', { theme: 'light' });
      state.subscribe('settings', callback);

      state.update('settings', 'theme', 'dark');

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should do nothing if the key holds a non-object value', () => {
      state.set('currentPage', 'home');
      state.update('currentPage', 'foo', 'bar');
      expect(state.get('currentPage')).toBe('home');
    });

    it('should do nothing if the key holds null', () => {
      state.set('selectedModel', null);
      state.update('selectedModel', 'foo', 'bar');
      expect(state.get('selectedModel')).toBe(null);
    });
  });

  describe('snapshot', () => {
    it('should return a copy of the entire state', () => {
      state.set('currentPage', 'experts');
      state.set('selectedModel', 'GPT-4o');

      const snap = state.snapshot();

      expect(snap.currentPage).toBe('experts');
      expect(snap.selectedModel).toBe('GPT-4o');
      expect(snap.isGenerating).toBe(false);
    });

    it('should return a shallow copy (modifying snapshot should not affect state)', () => {
      state.set('currentPage', 'home');
      const snap = state.snapshot();
      snap.currentPage = 'modified';

      expect(state.get('currentPage')).toBe('home');
    });

    it('should include all default keys', () => {
      const snap = state.snapshot();
      expect(snap).toHaveProperty('conversations');
      expect(snap).toHaveProperty('currentConversationId');
      expect(snap).toHaveProperty('messages');
      expect(snap).toHaveProperty('providers');
      expect(snap).toHaveProperty('assistants');
      expect(snap).toHaveProperty('skills');
      expect(snap).toHaveProperty('mcpServers');
      expect(snap).toHaveProperty('agents');
      expect(snap).toHaveProperty('artifacts');
      expect(snap).toHaveProperty('memory');
      expect(snap).toHaveProperty('settings');
      expect(snap).toHaveProperty('connectionStatus');
      expect(snap).toHaveProperty('currentPage');
      expect(snap).toHaveProperty('selectedModel');
      expect(snap).toHaveProperty('selectedExpert');
      expect(snap).toHaveProperty('selectedMode');
      expect(snap).toHaveProperty('selectedSkills');
      expect(snap).toHaveProperty('selectedMcpTools');
      expect(snap).toHaveProperty('isGenerating');
      expect(snap).toHaveProperty('sidebarCollapsed');
      expect(snap).toHaveProperty('expertFilter');
      expect(snap).toHaveProperty('toolTab');
      expect(snap).toHaveProperty('artifactFilter');
    });
  });
});
