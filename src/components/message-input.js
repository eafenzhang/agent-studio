/**
 * Agent Studio Desktop - Message Input Component
 * Binds send buttons, keyboard shortcuts, and toolbar dropdowns
 */

import state from '../state.js';
import { showToast, selectDropdown, escapeHtml, escapeAttr, genId, formatSize } from '../utils.js';
import * as chatService from '../services/chat-service.js';
import * as chatComponent from './chat.js';

let isBound = false;

/**
 * Initialize message input for all input areas
 */
export function init() {
  // Bind home page input
  bindInputArea('page-home');
  // Bind conversation detail page input
  bindInputArea('conversation-detail');
  // Bind assistant page input
  bindInputArea('page-assistant');

  // Bind toolbar dropdowns (model, expert, tool menus)
  bindToolbarDropdowns();

  isBound = true;
}

/**
 * Bind input area for a specific page/container
 * @param {string} containerId
 */
function bindInputArea(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Find textarea and send button within this container
  const textarea = container.querySelector('.chat-input-textarea');
  const sendBtn = container.querySelector('.chat-toolbar-send');

  if (!textarea || !sendBtn) return;

  // Enter to send, Shift+Enter for newline
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(textarea, containerId);
    }
  });

  // Send button click
  sendBtn.addEventListener('click', () => {
    handleSend(textarea, containerId);
  });

  // Auto-resize textarea
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  });

  // P1: Drag-and-drop file upload
  bindDragDrop(container, textarea);
}

// ===== P1: Drag-and-Drop File Upload =====

/**
 * Bind drag-and-drop handlers to a container.
 * @param {HTMLElement} container
 */
function bindDragDrop(container) {
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.classList.add('drag-over');
  });

  container.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.classList.remove('drag-over');
  });

  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    const processedFiles = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const dataUrl = await readFileAsDataURL(file);
        processedFiles.push({ name: file.name, type: file.type, dataUrl, size: file.size });
      } else {
        try {
          const text = await file.text();
          processedFiles.push({ name: file.name, type: file.type, content: text, size: file.size });
        } catch (_) {
          processedFiles.push({ name: file.name, type: file.type, size: file.size, content: '[无法读取文件内容]' });
        }
      }
    }

    const existing = state.get('draggedFiles') || [];
    state.set('draggedFiles', [...existing, ...processedFiles]);
    renderFilePreview(container);
  });
}

/**
 * Read a file as a data URL.
 * @param {File} file
 * @returns {Promise<string>}
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Render dragged file previews above the input area.
 * @param {HTMLElement} container
 */
function renderFilePreview(container) {
  const files = state.get('draggedFiles') || [];

  // Remove existing preview
  const existing = container.querySelector('.drag-file-preview');
  if (existing) existing.remove();

  if (files.length === 0) return;

  const preview = document.createElement('div');
  preview.className = 'drag-file-preview';
  preview.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;padding:6px 0;';

  files.forEach((file, index) => {
    const chip = document.createElement('div');
    chip.className = 'drag-file-chip';
    chip.style.cssText =
      'display:flex;align-items:center;gap:4px;background:var(--cb-tag-background);border-radius:4px;padding:3px 6px;font-size:11px;';

    const isImage = file.type && file.type.startsWith('image/');
    if (isImage && file.dataUrl) {
      const img = document.createElement('img');
      img.src = file.dataUrl;
      img.style.cssText = 'width:24px;height:24px;object-fit:cover;border-radius:2px;';
      chip.appendChild(img);
    } else {
      const icon = document.createElement('span');
      icon.textContent = '📄';
      chip.appendChild(icon);
    }

    const name = document.createElement('span');
    name.textContent = file.name.length > 20 ? file.name.substring(0, 18) + '…' : file.name;
    name.style.cssText = 'max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    chip.appendChild(name);

    if (file.size) {
      const size = document.createElement('span');
      size.textContent = formatSize(file.size);
      size.style.cssText = 'color:var(--wb-color-text-disabled);font-size:10px;';
      chip.appendChild(size);
    }

    const remove = document.createElement('button');
    remove.textContent = '×';
    remove.style.cssText = 'cursor:pointer;border:none;background:none;font-size:14px;padding:0 2px;color:var(--wb-color-text-disabled);';
    remove.addEventListener('click', () => {
      const current = state.get('draggedFiles') || [];
      current.splice(index, 1);
      state.set('draggedFiles', current);
      renderFilePreview(container);
    });
    chip.appendChild(remove);

    preview.appendChild(chip);
  });

  // Insert before textarea's parent
  const inputMain = container.querySelector('.chat-input-main');
  if (inputMain) {
    inputMain.parentNode.insertBefore(preview, inputMain);
  } else {
    container.insertBefore(preview, container.firstChild);
  }
}

/**
 * Handle sending a message from a textarea
 * @param {HTMLTextAreaElement} textarea
 * @param {string} containerId
 */
async function handleSend(textarea, containerId) {
  const text = textarea.value.trim();
  if (!text) {
    showToast('请输入消息');
    return;
  }

  if (state.get('isGenerating')) {
    showToast('正在生成中，请等待...');
    return;
  }

  // Clear input
  textarea.value = '';
  textarea.style.height = 'auto';

  // Get selected options from state
  const options = {
    mode: state.get('selectedMode') || 'action',
    model: state.get('selectedModel'),
    expert: state.get('selectedExpert'),
    skills: state.get('selectedSkills') || [],
    mcpTools: state.get('selectedMcpTools') || [],
  };

  // Get current conversation ID
  const currentConvId = state.get('currentConversationId');

  // Send message via chat service
  const result = await chatService.sendMessage(currentConvId, text, options);
  if (!result) return;

  const { conversationId, messageId } = result;

  // If on home page, switch to conversation detail
  if (containerId === 'page-home' || containerId === 'page-assistant') {
    openConversationDetail(conversationId, text.substring(0, 30));
  }

  // Render the user message immediately
  chatComponent.renderMessage({
    id: genId(),
    role: 'user',
    content: text,
    createdAt: new Date().toISOString(),
  });

  // Set up stream callbacks
  chatService.setStreamCallbacks(messageId, {
    onChunk: (chunk) => {
      chatComponent.appendChunk(messageId, chunk);
    },
    onToolCallStart: ({ toolCallId, toolName, arguments: args }) => {
      chatComponent.appendToolCall(messageId, {
        id: toolCallId,
        name: toolName,
        arguments: args,
        status: 'in_progress',
      });
    },
    onToolCallResult: ({ toolCallId, result, error }) => {
      chatComponent.updateToolCall(toolCallId, error ? 'error' : 'success', result || error);
    },
    onTaskStep: ({ stepId, status, title }) => {
      chatComponent.updateTaskStep(stepId, status);
      if (title) {
        // Could update step title here
      }
    },
    onEnd: () => {
      chatComponent.updateMessageStatus(messageId, 'complete');
      // Reload sidebar conversations
      state.notify('conversationsChanged');
    },
    onError: (error) => {
      chatComponent.updateMessageStatus(messageId, 'error');
      showToast('生成失败: ' + error);
    },
  });

  // Refresh conversation list in sidebar
  state.notify('conversationsChanged');
}

/**
 * Open the conversation detail page
 * @param {string} convId
 * @param {string} title
 */
function openConversationDetail(convId, title) {
  // Hide all pages
  document.querySelectorAll('.page').forEach((p) => {
    p.classList.remove('active', 'page-fade-in');
  });

  // Show conversation detail
  const detail = document.getElementById('conversation-detail');
  if (detail) {
    detail.classList.add('active');
  }

  // Update topbar
  const topbar = document.getElementById('topbar-title');
  if (topbar) topbar.textContent = title || '会话';

  // Update state
  state.set('currentConversationId', convId);
  state.set('currentPage', 'conversation');

  // Load conversation messages
  chatComponent.loadAndRender(convId);

  // Bind the conversation detail input area
  setTimeout(() => bindInputArea('conversation-detail'), 100);
}

/**
 * Bind toolbar dropdowns to real data from state
 */
function bindToolbarDropdowns() {
  // Populate model menu from providers
  state.subscribe('providers', (providers) => {
    populateModelMenu(providers);
  });

  // Populate expert menu from assistants
  state.subscribe('assistants', (assistants) => {
    populateExpertMenu(assistants);
  });

  // Populate tool menu from skills + MCP servers
  state.subscribe('skills', () => {
    populateToolMenu();
  });
  state.subscribe('mcpServers', () => {
    populateToolMenu();
  });

  // Bind mode menu items
  document.querySelectorAll('#mode-menu .chat-dropdown-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const label = item.querySelector('.chat-dropdown-item-label');
      if (label) {
        state.set('selectedMode', label.textContent.toLowerCase());
      }
    });
  });
}

/**
 * Populate the model dropdown with provider models
 * @param {Array} providers
 */
function populateModelMenu(providers) {
  const menu = document.getElementById('model-menu');
  if (!menu || !providers || providers.length === 0) return;

  const models = [];
  providers.forEach((p) => {
    if (p.models) {
      p.models.forEach((m) => models.push({ name: m, providerId: p.id }));
    }
  });

  if (models.length === 0) return;

  menu.innerHTML = models
    .map(
      (m, i) => `
    <div class="chat-dropdown-item ${i === 0 ? 'active' : ''}" data-model="${escapeAttr(m.name)}">
      <span class="chat-dropdown-item-label">${escapeHtml(m.name)}</span>
      <svg class="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
  `
    )
    .join('');

  // Set default model
  if (models.length > 0) {
    state.set('selectedModel', models[0].name);
    const label = document.getElementById('model-label');
    if (label) label.textContent = models[0].name;
  }

  // Bind click handlers
  menu.querySelectorAll('.chat-dropdown-item').forEach((item) => {
    item.addEventListener('click', () => {
      const modelName = item.dataset.model;
      state.set('selectedModel', modelName);
      selectDropdown('model-label', modelName, item);
    });
  });
}

/**
 * Populate the expert dropdown with assistants
 * @param {Array} assistants
 */
function populateExpertMenu(assistants) {
  const menu = document.getElementById('expert-menu');
  if (!menu || !assistants || assistants.length === 0) return;

  menu.innerHTML = assistants
    .map((a, i) => {
      const name = (a.name_i18n && a.name_i18n['zh-CN']) || a.name || 'Unknown';
      return `
      <div class="chat-dropdown-item ${i === 0 ? 'active' : ''}" data-expert-id="${escapeAttr(a.id || '')}">
        <span class="chat-dropdown-item-label">${escapeHtml(name)}</span>
        <svg class="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    `;
    })
    .join('');

  // Bind click handlers
  menu.querySelectorAll('.chat-dropdown-item').forEach((item) => {
    item.addEventListener('click', () => {
      const expertId = item.dataset.expertId;
      state.set('selectedExpert', expertId);
      menu.querySelectorAll('.chat-dropdown-item').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      menu.classList.remove('open');
    });
  });
}

/**
 * Populate the tool dropdown with skills and MCP servers
 */
function populateToolMenu() {
  const menu = document.getElementById('tool-menu');
  if (!menu) return;

  const skills = state.get('skills') || [];
  const mcpServers = state.get('mcpServers') || [];

  let html = '';

  if (skills.length > 0) {
    html += '<div class="chat-dropdown-section">Skill</div>';
    skills.forEach((s) => {
      const name = s.name || s.id || 'Unknown';
      html += `
        <div class="chat-dropdown-item" data-skill-id="${escapeAttr(s.id || '')}">
          <span class="chat-dropdown-item-label">${escapeHtml(name)}</span>
          <svg class="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      `;
    });
  }

  if (mcpServers.length > 0) {
    html += '<div class="chat-dropdown-divider"></div>';
    html += '<div class="chat-dropdown-section">MCP</div>';
    mcpServers.forEach((m) => {
      const name = m.name || m.id || 'Unknown MCP';
      html += `
        <div class="chat-dropdown-item" data-mcp-id="${escapeAttr(m.id || '')}">
          <span class="chat-dropdown-item-label">${escapeHtml(name)}</span>
          <svg class="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      `;
    });
  }

  if (!html) {
    html = '<div class="chat-dropdown-section">暂无可用工具</div>';
  }

  menu.innerHTML = html;

  // Bind toggle handlers for skill/MCP selection
  menu.querySelectorAll('.chat-dropdown-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      item.classList.toggle('active');

      // Update selected skills/MCP in state
      const selectedSkills = Array.from(menu.querySelectorAll('[data-skill-id].active')).map(
        (el) => el.dataset.skillId
      );
      const selectedMcp = Array.from(menu.querySelectorAll('[data-mcp-id].active')).map(
        (el) => el.dataset.mcpId
      );
      state.set('selectedSkills', selectedSkills);
      state.set('selectedMcpTools', selectedMcp);

      // Update badge count
      const total = selectedSkills.length + selectedMcp.length;
      const badge = document.querySelector('#tool-menu').closest('.chat-dropdown')?.querySelector('.chat-toolbar-badge');
      if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? '' : 'none';
      }
    });
  });

  // Update badge
  const total = (state.get('selectedSkills') || []).length + (state.get('selectedMcpTools') || []).length;
  const badge = document.querySelector('#tool-menu')?.closest('.chat-dropdown')?.querySelector('.chat-toolbar-badge');
  if (badge) {
    badge.textContent = total;
    badge.style.display = total > 0 ? '' : 'none';
  }
}

export default { init };
