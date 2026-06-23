/**
 * Agent Studio Desktop - Global State Management
 * Observer pattern: get / set / subscribe / notify
 */

const state = {
  _data: {
    // Conversations
    conversations: [],
    currentConversationId: null,
    messages: {},
    // Data collections
    providers: [],
    assistants: [],
    skills: [],
    mcpServers: [],
    agents: [],
    artifacts: [],
    memory: [],
    settings: {},
    // UI state
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
    workspacePath: '',
    // P1: Multi-tab support
    openTabs: [],           // [{ conversationId, title, isDirty }]
    activeTabIndex: -1,     // 当前激活 Tab 的索引
    // P1: Pin / Archive persistence
    pinnedConversations: [], // localStorage 读取的置顶 ID 列表
    archivedConversations: [], // localStorage 读取的归档 ID 列表
    // P1: Drag-and-drop file upload
    draggedFiles: [],       // [{ name, type, dataUrl, size, content }]
  },
  _listeners: new Map(),

  /**
   * Get a value by key
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this._data[key];
  },

  /**
   * Set a value and notify subscribers
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    const oldValue = this._data[key];
    this._data[key] = value;
    if (oldValue !== value) {
      this.notify(key, value, oldValue);
    }
  },

  /**
   * Update a nested field within an object value
   * @param {string} key
   * @param {string} field
   * @param {*} value
   */
  update(key, field, value) {
    const obj = this._data[key];
    if (obj && typeof obj === 'object') {
      obj[field] = value;
      this.notify(key, obj);
    }
  },

  /**
   * Subscribe to changes for a specific key
   * @param {string} key
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(key, callback) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(callback);
    return () => {
      const set = this._listeners.get(key);
      if (set) set.delete(callback);
    };
  },

  /**
   * Notify all subscribers of a key
   * @param {string} key
   * @param {*} newValue
   * @param {*} oldValue
   */
  notify(key, newValue, oldValue) {
    const callbacks = this._listeners.get(key);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(newValue, oldValue);
        } catch (err) {
          console.error(`State listener error for "${key}":`, err);
        }
      });
    }
  },

  /**
   * Get a snapshot of the entire state (for debugging)
   * @returns {Object}
   */
  snapshot() {
    return { ...this._data };
  },
};

export default state;
