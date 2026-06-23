/**
 * Agent Studio Desktop - Tool Call Component
 * Renders collapsible tool call cards with status indicators
 */

import { escapeHtml } from '../utils.js';

/**
 * Status icons for tool calls
 */
const STATUS_ICONS = {
  pending: '<span class="tool-call-spinner"></span>',
  in_progress: '<span class="tool-call-spinner"></span>',
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
};

/**
 * Render a tool call card
 * @param {Object} toolCall - { id, name, arguments, result, status }
 * @returns {HTMLElement}
 */
export function render(toolCall) {
  const { id, name, arguments: args, result, status = 'pending' } = toolCall;
  const card = document.createElement('div');
  card.className = 'tool-call-card';
  card.dataset.toolCallId = id || '';

  const argStr = typeof args === 'string' ? args : JSON.stringify(args, null, 2);
  const resultStr = result
    ? typeof result === 'string'
      ? result
      : JSON.stringify(result, null, 2)
    : '';

  card.innerHTML = `
    <div class="tool-call-header" data-action="toggle">
      <span class="tool-call-icon ${status}">${STATUS_ICONS[status] || STATUS_ICONS.pending}</span>
      <span class="tool-call-name">${escapeHtml(name || 'Unknown Tool')}</span>
      <span class="tool-call-chevron">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </span>
    </div>
    <div class="tool-call-body" style="display:none;">
      <div class="tool-call-section">
        <div class="tool-call-section-label">入参</div>
        <pre class="tool-call-code"><code>${escapeHtml(argStr || '{}')}</code></pre>
      </div>
      ${resultStr ? `
        <div class="tool-call-section">
          <div class="tool-call-section-label">结果</div>
          <pre class="tool-call-code tool-call-result ${status === 'error' ? 'error' : ''}"><code>${escapeHtml(resultStr)}</code></pre>
        </div>
      ` : ''}
    </div>
  `;

  // Bind toggle
  const header = card.querySelector('.tool-call-header');
  header.addEventListener('click', () => toggleExpand(card));

  return card;
}

/**
 * Toggle expand/collapse of a tool call card
 * @param {HTMLElement} card
 */
export function toggleExpand(card) {
  const body = card.querySelector('.tool-call-body');
  const chevron = card.querySelector('.tool-call-chevron');
  if (!body) return;
  const isExpanded = body.style.display !== 'none';
  body.style.display = isExpanded ? 'none' : 'block';
  if (chevron) {
    chevron.style.transform = isExpanded ? '' : 'rotate(180deg)';
  }
  card.classList.toggle('expanded', !isExpanded);
}

/**
 * Update the status of a tool call card
 * @param {string} toolCallId
 * @param {string} status - pending | in_progress | success | error
 * @param {*} result - optional result data
 */
export function updateStatus(toolCallId, status, result) {
  const card = document.querySelector(`.tool-call-card[data-tool-call-id="${toolCallId}"]`);
  if (!card) return;

  // Update status icon
  const icon = card.querySelector('.tool-call-icon');
  if (icon) {
    icon.className = `tool-call-icon ${status}`;
    icon.innerHTML = STATUS_ICONS[status] || STATUS_ICONS.pending;
  }

  // Update or add result section
  if (result !== undefined) {
    let resultSection = card.querySelector('.tool-call-section:last-child');
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    if (resultSection && resultSection.querySelector('.tool-call-section-label')?.textContent === '结果') {
      const code = resultSection.querySelector('code');
      if (code) code.textContent = resultStr;
      if (status === 'error') {
        resultSection.querySelector('.tool-call-code')?.classList.add('error');
      }
    } else {
      const body = card.querySelector('.tool-call-body');
      if (body) {
        const section = document.createElement('div');
        section.className = 'tool-call-section';
        section.innerHTML = `
          <div class="tool-call-section-label">结果</div>
          <pre class="tool-call-code tool-call-result ${status === 'error' ? 'error' : ''}"><code>${escapeHtml(resultStr)}</code></pre>
        `;
        body.appendChild(section);
      }
    }
  }
}

export default { render, toggleExpand, updateStatus };
