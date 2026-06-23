/**
 * Agent Studio Desktop - Task Progress Component
 * Renders step-by-step task progress with status indicators
 */

import { escapeHtml } from '../utils.js';

/**
 * Step status icons
 */
const STEP_ICONS = {
  pending: '<span class="task-step-icon pending">○</span>',
  in_progress: '<span class="task-step-icon in-progress">⏳</span>',
  completed: '<span class="task-step-icon completed">✅</span>',
  error: '<span class="task-step-icon error">❌</span>',
};

/**
 * Render a task progress panel
 * @param {Array} steps - [{ id, title, status }]
 * @returns {HTMLElement}
 */
export function render(steps) {
  const panel = document.createElement('div');
  panel.className = 'task-progress-panel';

  const header = document.createElement('div');
  header.className = 'task-progress-header';
  header.innerHTML = `
    <span class="task-progress-title">任务进度</span>
    <span class="task-progress-collapse">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
    </span>
  `;
  panel.appendChild(header);

  const list = document.createElement('div');
  list.className = 'task-progress-steps';
  panel.appendChild(list);

  if (steps && steps.length > 0) {
    steps.forEach((step, index) => {
      list.appendChild(renderStep(step, index, steps.length));
    });
  }

  // Bind collapse toggle
  header.addEventListener('click', () => {
    list.style.display = list.style.display === 'none' ? 'block' : 'none';
    const chevron = header.querySelector('.task-progress-collapse svg');
    if (chevron) {
      chevron.style.transform = list.style.display === 'none' ? 'rotate(-90deg)' : '';
    }
  });

  return panel;
}

/**
 * Render a single step
 * @param {Object} step - { id, title, status }
 * @param {number} index
 * @param {number} total
 * @returns {HTMLElement}
 */
function renderStep(step, index, total) {
  const el = document.createElement('div');
  el.className = 'task-step';
  el.dataset.stepId = step.id || `step-${index}`;
  el.dataset.status = step.status || 'pending';

  const isLast = index === total - 1;
  const status = step.status || 'pending';

  el.innerHTML = `
    <div class="task-step-indicator">
      ${STEP_ICONS[status] || STEP_ICONS.pending}
      ${!isLast ? '<div class="task-step-connector"></div>' : ''}
    </div>
    <div class="task-step-content">
      <div class="task-step-title">${escapeHtml(step.title || `步骤 ${index + 1}`)}</div>
    </div>
  `;

  return el;
}

/**
 * Update a step's status in real-time
 * @param {string} stepId
 * @param {string} status - pending | in_progress | completed | error
 * @param {string} title - optional updated title
 */
export function updateStep(stepId, status, title) {
  const el = document.querySelector(`.task-step[data-step-id="${stepId}"]`);
  if (!el) return;

  el.dataset.status = status;
  const iconEl = el.querySelector('.task-step-icon');
  if (iconEl) {
    const iconHtml = STEP_ICONS[status] || STEP_ICONS.pending;
    const temp = document.createElement('div');
    temp.innerHTML = iconHtml;
    iconEl.replaceWith(temp.firstChild);
  }
  if (title) {
    const titleEl = el.querySelector('.task-step-title');
    if (titleEl) titleEl.textContent = title;
  }
}

/**
 * Add a new step to the panel
 * @param {Object} step - { id, title, status }
 */
export function addStep(step) {
  const list = document.querySelector('.task-progress-steps');
  if (!list) return;
  const steps = list.querySelectorAll('.task-step');
  list.appendChild(renderStep(step, steps.length, steps.length + 1));
  // Re-render connectors
  steps.forEach((s, i) => {
    const connector = s.querySelector('.task-step-connector');
    if (connector && i === steps.length - 1) {
      // Add connector to previous last step
      // Already has connector from renderStep, but if it was last, it didn't
    }
  });
}

/**
 * Collapse the task progress panel after a delay
 * @param {number} delay - milliseconds before collapse (default 3000)
 */
export function collapse(delay = 3000) {
  setTimeout(() => {
    const list = document.querySelector('.task-progress-steps');
    const header = document.querySelector('.task-progress-header');
    if (list && header) {
      list.style.display = 'none';
      const chevron = header.querySelector('.task-progress-collapse svg');
      if (chevron) chevron.style.transform = 'rotate(-90deg)';
    }
  }, delay);
}

export default { render, updateStep, addStep, collapse };
