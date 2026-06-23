/**
 * Agent Studio Desktop - Chat Component
 * Renders messages, handles streaming, tool calls, task progress.
 * P1: Multi-conversation streaming, 50ms throttle, message actions, skeleton.
 */

import { renderMarkdown } from '../markdown.js';
import * as toolCallComponent from './tool-call.js';
import * as taskProgress from './task-progress.js';
import { formatClock, genId, copyToClipboard, showToast } from '../utils.js';
import state from '../state.js';
import * as chatService from '../services/chat-service.js';
import * as api from '../api.js';

let messagesContainer = null;

// P1: streamingMessages: conversationId -> Map<messageId, { element, text, row }>
/** @type {Map<string, Map<string, {element: HTMLElement, text: string, row: HTMLElement}>>} */
let streamingMessages = new Map();

// P1: render timers for throttle (messageId -> timeoutId)
const renderTimers = new Map();

/**
 * Initialize the chat component.
 */
export function init() {
  messagesContainer = document.getElementById('conversation-messages');
}

/**
 * Get or create the streaming messages map for a conversation.
 * @param {string} conversationId
 * @returns {Map<string, {element: HTMLElement, text: string, row: HTMLElement}>}
 */
function getStreamMap(conversationId) {
  if (!streamingMessages.has(conversationId)) {
    streamingMessages.set(conversationId, new Map());
  }
  return streamingMessages.get(conversationId);
}

/**
 * Get the messages container for the active tab or the default one.
 * @returns {HTMLElement|null}
 */
function getActiveContainer() {
  try {
    const tabs = state.get('openTabs') || [];
    const idx = state.get('activeTabIndex');
    if (idx >= 0 && idx < tabs.length) {
      const panel = document.getElementById(`tab-conv-${tabs[idx].conversationId}`);
      if (panel) return panel;
    }
  } catch (_) { /* fall through */ }
  return document.getElementById('conversation-messages');
}

// ===== Message Rendering =====

/**
 * Render a single message in the chat.
 * @param {Object} message - { id, role, content, createdAt, toolCalls, taskSteps }
 * @param {string} [conversationId] - optional conversation ID for tab targeting
 * @returns {HTMLElement}
 */
export function renderMessage(message, conversationId) {
  const container = conversationId
    ? (document.getElementById(`tab-conv-${conversationId}`) || getActiveContainer())
    : getActiveContainer();

  if (!container) {
    if (!messagesContainer) init();
    if (!messagesContainer) {
      const el = document.createElement('div');
      return el;
    }
  }

  const target = container || messagesContainer;

  const isUser = message.role === 'user' || message.position !== 'left';
  const role = isUser ? 'user' : 'assistant';
  const msgId = message.id || genId();

  const row = document.createElement('div');
  row.className = `msg-row ${role}`;
  row.dataset.messageId = msgId;

  const avatar = document.createElement('div');
  avatar.className = `msg-avatar ${isUser ? 'human' : 'bot'}`;
  avatar.textContent = isUser ? 'U' : 'A';

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'msg-content-wrapper';

  const bubble = document.createElement('div');
  bubble.className = `msg-bubble ${role}`;
  bubble.dataset.messageId = msgId;

  // Render content
  const content = extractContent(message);
  if (isUser) {
    bubble.textContent = content;
  } else {
    bubble.innerHTML = renderMarkdown(content) || '';
  }

  // P1: Message action buttons
  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.innerHTML =
    `<button class="msg-action-btn" data-action="copyMessage" data-msg-id="${msgId}" title="复制">&#128203;</button>` +
    (message.role === 'assistant' || message.position === 'left'
      ? `<button class="msg-action-btn" data-action="regenerateMessage" data-msg-id="${msgId}" title="重新生成">&#128260;</button>`
      : '') +
    (isUser
      ? `<button class="msg-action-btn" data-action="editMessage" data-msg-id="${msgId}" title="编辑">&#9998;</button>`
      : '') +
    `<button class="msg-action-btn msg-action-delete" data-action="deleteMessage" data-msg-id="${msgId}" title="删除">&#128465;</button>`;
  bubble.appendChild(actions);

  contentWrapper.appendChild(bubble);

  // Render tool calls if present
  if (message.toolCalls && message.toolCalls.length > 0) {
    message.toolCalls.forEach((tc) => {
      contentWrapper.appendChild(toolCallComponent.render(tc));
    });
  }

  // Render task progress if present
  if (message.taskSteps && message.taskSteps.length > 0) {
    const progressPanel = taskProgress.render(message.taskSteps);
    contentWrapper.appendChild(progressPanel);
  }

  // Timestamp
  if (message.createdAt) {
    const time = document.createElement('div');
    time.className = 'msg-time';
    if (isUser) time.style.textAlign = 'right';
    time.textContent = formatClock(message.createdAt);
    contentWrapper.appendChild(time);
  }

  row.appendChild(avatar);
  row.appendChild(contentWrapper);

  target.appendChild(row);
  scrollToBottom();

  return row;
}

/**
 * Extract text content from various message formats.
 * @param {Object} message
 * @returns {string}
 */
function extractContent(message) {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  if (message.content && typeof message.content === 'object') {
    return message.content.content || message.content.text || message.content.message || '';
  }
  if (message.text) return message.text;
  return '';
}

// ===== Streaming with Throttle (P1-6) =====

/**
 * Append a streaming chunk to a message.
 * P1: conversationId-scoped + 50ms throttle + requestAnimationFrame.
 * @param {string} messageId
 * @param {string} chunk
 * @param {string} [conversationId]
 */
export function appendChunk(messageId, chunk, conversationId) {
  // Backward compat: if conversationId is not passed but chunk is a string,
  // we use the currentConversationId from state
  const convId = conversationId || state.get('currentConversationId') || 'default';
  const streamMap = getStreamMap(convId);

  const container = document.getElementById(`tab-conv-${convId}`) || document.getElementById('conversation-messages');
  if (!container) return;

  let entry = streamMap.get(messageId);
  if (!entry) {
    // Create a new assistant message for streaming
    const row = document.createElement('div');
    row.className = 'msg-row assistant';
    row.dataset.messageId = messageId;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar bot';
    avatar.textContent = 'A';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'msg-content-wrapper';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble assistant streaming';
    bubble.dataset.messageId = messageId;
    bubble.innerHTML = '<span class="streaming-cursor"></span>';

    contentWrapper.appendChild(bubble);
    row.appendChild(avatar);
    row.appendChild(contentWrapper);

    container.appendChild(row);
    scrollToBottom();

    entry = { element: bubble, text: '', row };
    streamMap.set(messageId, entry);
  }

  entry.text += chunk;

  // P1: 50ms throttle + requestAnimationFrame
  if (renderTimers.has(messageId)) {
    clearTimeout(renderTimers.get(messageId));
  }

  renderTimers.set(messageId, setTimeout(() => {
    requestAnimationFrame(() => {
      const currentEntry = streamMap.get(messageId);
      if (!currentEntry) return;
      const rendered = renderMarkdown(currentEntry.text);
      currentEntry.element.innerHTML = rendered + '<span class="streaming-cursor"></span>';
      currentEntry.element.scrollIntoView({ block: 'nearest' });
    });
    renderTimers.delete(messageId);
  }, 50));
}

/**
 * Flush any pending throttled render for a streaming message.
 * Called on stream end to ensure final content is rendered.
 * @param {string} messageId
 * @param {string} [conversationId]
 */
export function flushStream(messageId, conversationId) {
  const convId = conversationId || state.get('currentConversationId') || 'default';
  const streamMap = getStreamMap(convId);
  const entry = streamMap.get(messageId);

  if (renderTimers.has(messageId)) {
    clearTimeout(renderTimers.get(messageId));
    renderTimers.delete(messageId);
  }

  if (entry) {
    entry.element.innerHTML = renderMarkdown(entry.text);
  }
}

/**
 * Update message status (remove cursor, mark as complete).
 * @param {string} messageId
 * @param {string} status - 'complete' | 'error' | 'cancelled'
 * @param {string} [conversationId]
 */
export function updateMessageStatus(messageId, status, conversationId) {
  const convId = conversationId || state.get('currentConversationId') || 'default';
  const streamMap = getStreamMap(convId);
  const entry = streamMap.get(messageId);

  if (entry) {
    entry.element.classList.remove('streaming');
    const cursor = entry.element.querySelector('.streaming-cursor');
    if (cursor) cursor.remove();
    streamMap.delete(messageId);
  }

  if (status === 'error') {
    const bubble = document.querySelector(`.msg-bubble[data-message-id="${messageId}"]`);
    if (bubble) {
      bubble.classList.add('error');
    }
  }
}

/**
 * Append a tool call to a message.
 * @param {string} messageId
 * @param {Object} toolCall
 */
export function appendToolCall(messageId, toolCall) {
  const row = document.querySelector(`.msg-row[data-message-id="${messageId}"]`);
  if (!row) return;
  const contentWrapper = row.querySelector('.msg-content-wrapper');
  if (!contentWrapper) return;
  contentWrapper.appendChild(toolCallComponent.render(toolCall));
  scrollToBottom();
}

/**
 * Update a tool call within a message.
 * @param {string} toolCallId
 * @param {string} status
 * @param {*} result
 */
export function updateToolCall(toolCallId, status, result) {
  toolCallComponent.updateStatus(toolCallId, status, result);
}

/**
 * Render task steps for a message.
 * @param {string} messageId
 * @param {Array} steps
 */
export function renderTaskSteps(messageId, steps) {
  const row = document.querySelector(`.msg-row[data-message-id="${messageId}"]`);
  if (!row) return;
  const contentWrapper = row.querySelector('.msg-content-wrapper');
  if (!contentWrapper) return;
  const panel = taskProgress.render(steps);
  contentWrapper.appendChild(panel);
  scrollToBottom();
}

/**
 * Update a task step status.
 * @param {string} stepId
 * @param {string} status
 */
export function updateTaskStep(stepId, status) {
  taskProgress.updateStep(stepId, status);
}

/**
 * Scroll to the bottom of the active container.
 */
export function scrollToBottom() {
  const container = getActiveContainer();
  if (container) {
    container.scrollTop = container.scrollHeight;
  } else if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

/**
 * Clear all messages from the active container.
 */
export function clearMessages() {
  const container = getActiveContainer();
  if (container) {
    container.innerHTML = '';
  } else if (messagesContainer) {
    messagesContainer.innerHTML = '';
  }
  // Clear streaming for current conversation
  const convId = state.get('currentConversationId') || 'default';
  const sm = streamingMessages.get(convId);
  if (sm) sm.clear();
}

// ===== Skeleton Screen (P1-7) =====

/**
 * Render skeleton loading placeholders for messages.
 * @param {HTMLElement} container
 */
function renderMessageSkeleton(container) {
  if (!container) return;
  let html = '';
  // 3 pairs of left/right skeleton bubbles
  for (let i = 0; i < 3; i++) {
    const isRight = i % 2 === 1;
    html += `
      <div class="msg-row ${isRight ? 'user' : 'assistant'}">
        <div class="msg-avatar skeleton skeleton-avatar" style="width:36px;height:36px;"></div>
        <div class="msg-content-wrapper">
          <div class="skeleton skeleton-bubble" style="width:${isRight ? '180px' : '280px'};height:40px;"></div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

// ===== Load & Render =====

/**
 * Load and render conversation history in the default container.
 * @param {string} conversationId
 */
export async function loadAndRender(conversationId) {
  if (!messagesContainer) init();
  clearMessages();

  const container = getActiveContainer() || messagesContainer;
  if (!container) return;

  // P1: Show skeleton
  renderMessageSkeleton(container);

  try {
    const messages = await chatService.loadConversation(conversationId);

    container.innerHTML = '';

    if (!messages || messages.length === 0) {
      container.innerHTML = '<div class="loading-msg">暂无消息，发送第一条消息开始对话</div>';
      return;
    }

    messages.forEach((msg) => {
      const normalized = {
        id: msg.id,
        role: msg.position === 'left' ? 'assistant' : (msg.role || 'user'),
        position: msg.position,
        content: msg.content,
        createdAt: msg.createdAt,
        toolCalls: msg.tool_calls,
        taskSteps: msg.task_steps,
      };
      renderMessage(normalized, conversationId);
    });

    scrollToBottom();
  } catch (err) {
    console.error('Load and render error:', err);
    container.innerHTML = '<div class="loading-msg">加载消息失败</div>';
  }
}

/**
 * Load and render conversation history into a specific tab panel.
 * @param {string} conversationId
 * @param {HTMLElement} panel
 */
export async function loadAndRenderForTab(conversationId, panel) {
  if (!panel) return;

  // Skeleton
  renderMessageSkeleton(panel);

  try {
    const messages = await chatService.loadConversation(conversationId);
    panel.innerHTML = '';

    if (!messages || messages.length === 0) {
      panel.innerHTML = '<div class="loading-msg">暂无消息，发送第一条消息开始对话</div>';
      return;
    }

    messages.forEach((msg) => {
      const normalized = {
        id: msg.id,
        role: msg.position === 'left' ? 'assistant' : (msg.role || 'user'),
        position: msg.position,
        content: msg.content,
        createdAt: msg.createdAt,
        toolCalls: msg.tool_calls,
        taskSteps: msg.task_steps,
      };
      // Render into the tab panel by temporarily overriding the container logic
      const row = renderMessageInto(normalized, panel);
    });

    panel.scrollTop = panel.scrollHeight;
  } catch (err) {
    console.error('Load and render for tab error:', err);
    panel.innerHTML = '<div class="loading-msg">加载消息失败</div>';
  }
}

/**
 * Render a message into a specific container.
 * @param {Object} message
 * @param {HTMLElement} target
 * @returns {HTMLElement}
 */
function renderMessageInto(message, target) {
  const isUser = message.role === 'user' || message.position !== 'left';
  const role = isUser ? 'user' : 'assistant';
  const msgId = message.id || genId();

  const row = document.createElement('div');
  row.className = `msg-row ${role}`;
  row.dataset.messageId = msgId;

  const avatar = document.createElement('div');
  avatar.className = `msg-avatar ${isUser ? 'human' : 'bot'}`;
  avatar.textContent = isUser ? 'U' : 'A';

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'msg-content-wrapper';

  const bubble = document.createElement('div');
  bubble.className = `msg-bubble ${role}`;
  bubble.dataset.messageId = msgId;

  const content = extractContent(message);
  if (isUser) {
    bubble.textContent = content;
  } else {
    bubble.innerHTML = renderMarkdown(content) || '';
  }

  // P1: Message action buttons
  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.innerHTML =
    `<button class="msg-action-btn" data-action="copyMessage" data-msg-id="${msgId}" title="复制">&#128203;</button>` +
    (!isUser
      ? `<button class="msg-action-btn" data-action="regenerateMessage" data-msg-id="${msgId}" title="重新生成">&#128260;</button>`
      : '') +
    (isUser
      ? `<button class="msg-action-btn" data-action="editMessage" data-msg-id="${msgId}" title="编辑">&#9998;</button>`
      : '') +
    `<button class="msg-action-btn msg-action-delete" data-action="deleteMessage" data-msg-id="${msgId}" title="删除">&#128465;</button>`;
  bubble.appendChild(actions);

  contentWrapper.appendChild(bubble);

  if (message.toolCalls && message.toolCalls.length > 0) {
    message.toolCalls.forEach((tc) => {
      contentWrapper.appendChild(toolCallComponent.render(tc));
    });
  }

  if (message.taskSteps && message.taskSteps.length > 0) {
    contentWrapper.appendChild(taskProgress.render(message.taskSteps));
  }

  if (message.createdAt) {
    const time = document.createElement('div');
    time.className = 'msg-time';
    if (isUser) time.style.textAlign = 'right';
    time.textContent = formatClock(message.createdAt);
    contentWrapper.appendChild(time);
  }

  row.appendChild(avatar);
  row.appendChild(contentWrapper);
  target.appendChild(row);

  return row;
}

// ===== Message Actions (P1-2) =====

/**
 * Handle copy message action.
 * @param {string} msgId
 */
export function handleCopyMessage(msgId) {
  const bubble = document.querySelector(`.msg-bubble[data-message-id="${msgId}"]`);
  if (!bubble) return;
  // Clone and remove action buttons to get clean text
  const clone = bubble.cloneNode(true);
  const actionsEl = clone.querySelector('.msg-actions');
  if (actionsEl) actionsEl.remove();
  copyToClipboard(clone.textContent || '');
}

/**
 * Handle delete message action (optimistic delete).
 * @param {string} msgId
 */
export function handleDeleteMessage(msgId) {
  const row = document.querySelector(`.msg-row[data-message-id="${msgId}"]`);
  if (!row) return;

  // Show inline confirmation
  let confirmBar = row.querySelector('.msg-delete-confirm');
  if (confirmBar) {
    // Already showing confirm
    confirmBar.remove();
    return;
  }

  confirmBar = document.createElement('div');
  confirmBar.className = 'msg-delete-confirm';
  confirmBar.innerHTML = `
    <span>确认删除?</span>
    <button class="msg-action-btn" data-action="cancelDelete" data-msg-id="${msgId}">取消</button>
    <button class="msg-action-btn msg-action-delete" data-action="confirmDelete" data-msg-id="${msgId}">删除</button>
  `;
  row.appendChild(confirmBar);

  // Bind cancel
  confirmBar.querySelector('[data-action="cancelDelete"]').addEventListener('click', () => {
    confirmBar.remove();
  });

  // Bind confirm
  confirmBar.querySelector('[data-action="confirmDelete"]').addEventListener('click', async () => {
    const convId = state.get('currentConversationId');
    // Optimistic: remove from DOM immediately
    row.remove();

    if (convId && msgId) {
      try {
        await api.sendMessage(convId, { delete_message_id: msgId });
        // Fallback: try a direct delete if the API supports it
      } catch {
        // If API doesn't support message deletion, just keep it removed from UI
        showToast('消息已从视图中移除');
      }
    }
  });
}

/**
 * Handle regenerate message action.
 * Deletes current AI reply, re-sends previous user message.
 * @param {string} msgId
 */
export async function handleRegenerateMessage(msgId) {
  const row = document.querySelector(`.msg-row[data-message-id="${msgId}"]`);
  if (!row) return;

  // Find the previous user message
  let prevRow = row.previousElementSibling;
  while (prevRow) {
    if (prevRow.classList.contains('user')) break;
    prevRow = prevRow.previousElementSibling;
  }

  if (!prevRow) {
    showToast('未找到上一条用户消息');
    return;
  }

  const prevBubble = prevRow.querySelector('.msg-bubble');
  if (!prevBubble) return;
  // Remove action buttons from text content
  const clone = prevBubble.cloneNode(true);
  const actionsEl = clone.querySelector('.msg-actions');
  if (actionsEl) actionsEl.remove();
  const prevText = clone.textContent?.trim();

  if (!prevText) {
    showToast('上一条消息内容为空');
    return;
  }

  // Remove current AI message row
  row.remove();

  // Re-send the previous user message
  const convId = state.get('currentConversationId');
  if (!convId) return;

  state.set('isGenerating', true);

  try {
    const result = await chatService.sendMessage(convId, prevText, {
      mode: state.get('selectedMode') || 'action',
      model: state.get('selectedModel'),
      expert: state.get('selectedExpert'),
      skills: state.get('selectedSkills') || [],
      mcpTools: state.get('selectedMcpTools') || [],
    });

    if (result) {
      chatService.setStreamCallbacks(result.messageId, {
        onChunk: (chunk) => {
          chatComponentNoCircular.appendChunk(result.messageId, chunk, convId);
        },
        onToolCallStart: (data) => {
          chatComponentNoCircular.appendToolCall(result.messageId, {
            id: data.toolCallId,
            name: data.toolName,
            arguments: data.arguments,
            status: 'in_progress',
          });
        },
        onToolCallResult: (data) => {
          chatComponentNoCircular.updateToolCall(data.toolCallId, data.error ? 'error' : 'success', data.result || data.error);
        },
        onTaskStep: (data) => {
          chatComponentNoCircular.updateTaskStep(data.stepId, data.status);
        },
        onEnd: () => {
          chatComponentNoCircular.flushStream(result.messageId, convId);
          chatComponentNoCircular.updateMessageStatus(result.messageId, 'complete', convId);
          state.set('isGenerating', false);
          state.notify('conversationsChanged');
        },
        onError: (error) => {
          chatComponentNoCircular.updateMessageStatus(result.messageId, 'error', convId);
          state.set('isGenerating', false);
          showToast('重新生成失败: ' + error);
        },
      });
    }
  } catch (err) {
    state.set('isGenerating', false);
    showToast('重新生成失败');
  }
}

// Self-reference for regenerate handler (avoid circular import at top level)
const chatComponentNoCircular = {
  appendChunk,
  appendToolCall,
  updateToolCall,
  updateTaskStep,
  flushStream,
  updateMessageStatus,
};

/**
 * Handle edit message action.
 * Replace user message with a textarea for inline editing, then re-send.
 * @param {string} msgId
 */
export function handleEditMessage(msgId) {
  const bubble = document.querySelector(`.msg-bubble.user[data-message-id="${msgId}"]`);
  if (!bubble) return;

  // Save original text
  const clone = bubble.cloneNode(true);
  const actionsEl = clone.querySelector('.msg-actions');
  if (actionsEl) actionsEl.remove();
  const originalText = clone.textContent?.trim() || '';

  // Replace with textarea
  const textarea = document.createElement('textarea');
  textarea.className = 'msg-edit-textarea';
  textarea.value = originalText;
  textarea.rows = Math.max(2, Math.min(10, originalText.split('\n').length));
  textarea.style.cssText = 'width:100%;min-width:300px;padding:8px;border:1px solid var(--cb-border-subtle);border-radius:6px;font-size:13px;font-family:inherit;resize:vertical;';

  const editActions = document.createElement('div');
  editActions.className = 'msg-edit-actions';
  editActions.style.cssText = 'display:flex;gap:4px;margin-top:6px;';
  editActions.innerHTML = `
    <button class="msg-edit-cancel" style="padding:4px 10px;border:1px solid var(--cb-border-subtle);border-radius:4px;font-size:12px;cursor:pointer;">取消</button>
    <button class="msg-edit-send" style="padding:4px 10px;background:var(--cb-button-primary);color:#fff;border-radius:4px;font-size:12px;cursor:pointer;">发送</button>
  `;

  bubble.innerHTML = '';
  bubble.appendChild(textarea);
  bubble.appendChild(editActions);
  textarea.focus();

  // Cancel
  editActions.querySelector('.msg-edit-cancel').addEventListener('click', () => {
    bubble.innerHTML = '';
    // Restore original - simpler approach
    bubble.textContent = originalText;
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    actions.innerHTML =
      `<button class="msg-action-btn" data-action="copyMessage" data-msg-id="${msgId}" title="复制">&#128203;</button>` +
      `<button class="msg-action-btn" data-action="editMessage" data-msg-id="${msgId}" title="编辑">&#9998;</button>` +
      `<button class="msg-action-btn msg-action-delete" data-action="deleteMessage" data-msg-id="${msgId}" title="删除">&#128465;</button>`;
    bubble.appendChild(actions);
  });

  // Send edited message
  editActions.querySelector('.msg-edit-send').addEventListener('click', async () => {
    const newText = textarea.value.trim();
    if (!newText) {
      showToast('消息不能为空');
      return;
    }

    // Restore UI
    bubble.innerHTML = '';
    bubble.textContent = newText;
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    actions.innerHTML =
      `<button class="msg-action-btn" data-action="copyMessage" data-msg-id="${msgId}" title="复制">&#128203;</button>` +
      `<button class="msg-action-btn" data-action="editMessage" data-msg-id="${msgId}" title="编辑">&#9998;</button>` +
      `<button class="msg-action-btn msg-action-delete" data-action="deleteMessage" data-msg-id="${msgId}" title="删除">&#128465;</button>`;
    bubble.appendChild(actions);

    // Re-send
    const convId = state.get('currentConversationId');
    if (!convId) return;
    state.set('isGenerating', true);

    try {
      const result = await chatService.sendMessage(convId, newText, {
        mode: state.get('selectedMode') || 'action',
        model: state.get('selectedModel'),
        expert: state.get('selectedExpert'),
        skills: state.get('selectedSkills') || [],
        mcpTools: state.get('selectedMcpTools') || [],
      });
      if (result) {
        chatService.setStreamCallbacks(result.messageId, {
          onChunk: (chunk) => {
            chatComponentNoCircular.appendChunk(result.messageId, chunk, convId);
          },
          onEnd: () => {
            chatComponentNoCircular.flushStream(result.messageId, convId);
            chatComponentNoCircular.updateMessageStatus(result.messageId, 'complete', convId);
            state.set('isGenerating', false);
            state.notify('conversationsChanged');
          },
          onError: (error) => {
            chatComponentNoCircular.updateMessageStatus(result.messageId, 'error', convId);
            state.set('isGenerating', false);
            showToast('发送失败: ' + error);
          },
        });
      }
    } catch (err) {
      state.set('isGenerating', false);
      showToast('发送失败');
    }
  });
}

export default {
  init,
  renderMessage,
  appendChunk,
  flushStream,
  updateMessageStatus,
  appendToolCall,
  updateToolCall,
  renderTaskSteps,
  updateTaskStep,
  scrollToBottom,
  clearMessages,
  loadAndRender,
  loadAndRenderForTab,
  handleCopyMessage,
  handleDeleteMessage,
  handleRegenerateMessage,
  handleEditMessage,
};
