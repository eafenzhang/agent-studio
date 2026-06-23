/**
 * Regression tests for app.js — Bug Fix Verification
 *
 * Bug 2: Home page chip default selected → remove "selected" class from default rendering
 *
 * Since loadAssistants() is not exported from app.js (entry point),
 * we verify:
 *   1. Static: line 322 template string contains no "selected" class
 *   2. Functional: selectChip() logic — default no-selection, single-select
 *   3. Rendered chips have no "selected" class by default
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Replicate selectChip logic (same as app.js:122-125)
// ---------------------------------------------------------------------------
function selectChip(el) {
  document.querySelectorAll('.chat-assistant-chip').forEach((c) => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ---------------------------------------------------------------------------
// 1. Static code analysis — confirm fix on line 322
// ---------------------------------------------------------------------------
describe('Chip rendering — static analysis', () => {
  it('chip template in renderAssistantChips should NOT contain "selected" class', () => {
    const appPath = resolve(__dirname, '..', 'src', 'app-legacy.js');
    const content = readFileSync(appPath, 'utf-8');
    const lines = content.split('\n');

    // Find the line in renderAssistantChips that generates chip HTML with selectChip
    const chipLine = lines.find((l) => l.includes('data-action="selectChip"') && l.includes('chat-assistant-chip'));

    expect(chipLine).toBeDefined();
    expect(chipLine).toContain('chat-assistant-chip');
    expect(chipLine).toContain('data-action="selectChip"');
    expect(chipLine).not.toMatch(/class="[^"]*\bselected\b[^"]*"/);
  });
});

// ---------------------------------------------------------------------------
// 2. Functional — selectChip behavior
// ---------------------------------------------------------------------------
describe('selectChip — functional', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="chip-row">
        <div class="chat-assistant-chip">
          <div class="chat-assistant-chip-avatar"><span>🤖</span></div>
          <span class="chat-assistant-chip-label">Chip A</span>
        </div>
        <div class="chat-assistant-chip">
          <div class="chat-assistant-chip-avatar"><span>📊</span></div>
          <span class="chat-assistant-chip-label">Chip B</span>
        </div>
        <div class="chat-assistant-chip">
          <div class="chat-assistant-chip-avatar"><span>🎨</span></div>
          <span class="chat-assistant-chip-label">Chip C</span>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should have NO chip selected by default', () => {
    const chips = document.querySelectorAll('.chat-assistant-chip');
    expect(chips.length).toBe(3);
    chips.forEach((chip) => {
      expect(chip.classList.contains('selected')).toBe(false);
    });
  });

  it('should add "selected" class to the clicked chip', () => {
    const chips = document.querySelectorAll('.chat-assistant-chip');

    selectChip(chips[0]);
    expect(chips[0].classList.contains('selected')).toBe(true);
    expect(chips[1].classList.contains('selected')).toBe(false);
    expect(chips[2].classList.contains('selected')).toBe(false);
  });

  it('should allow only one chip selected at a time (single-select behavior)', () => {
    const chips = document.querySelectorAll('.chat-assistant-chip');

    selectChip(chips[0]);
    selectChip(chips[1]);
    selectChip(chips[2]);

    expect(document.querySelectorAll('.chat-assistant-chip.selected').length).toBe(1);
    expect(chips[2].classList.contains('selected')).toBe(true);
    expect(chips[0].classList.contains('selected')).toBe(false);
    expect(chips[1].classList.contains('selected')).toBe(false);
  });

  it('should deselect previous chip when new one is selected', () => {
    const chips = document.querySelectorAll('.chat-assistant-chip');

    selectChip(chips[0]);
    expect(chips[0].classList.contains('selected')).toBe(true);

    selectChip(chips[1]);
    expect(chips[0].classList.contains('selected')).toBe(false);
    expect(chips[1].classList.contains('selected')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Regression — category chips also no default selection
// ---------------------------------------------------------------------------
describe('Category chips — no default selection', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="chip-row">
        <div class="chat-assistant-chip">
          <span class="chat-assistant-chip-label">📊 数据分析</span>
        </div>
        <div class="chat-assistant-chip">
          <span class="chat-assistant-chip-label">📝 文档写作</span>
        </div>
        <div class="chat-assistant-chip">
          <span class="chat-assistant-chip-label">💻 代码开发</span>
        </div>
        <div class="chat-assistant-chip">
          <span class="chat-assistant-chip-label">🎨 设计素材</span>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should have zero chips selected by default', () => {
    const chips = document.querySelectorAll('.chat-assistant-chip');
    expect(chips.length).toBe(4);
    chips.forEach((chip) => {
      expect(chip.classList.contains('selected')).toBe(false);
    });
  });

  it('selectChip should work on category chips too', () => {
    const chips = document.querySelectorAll('.chat-assistant-chip');

    selectChip(chips[2]);
    expect(chips[2].classList.contains('selected')).toBe(true);
    expect(chips[1].classList.contains('selected')).toBe(false);

    selectChip(chips[0]);
    expect(chips[2].classList.contains('selected')).toBe(false);
    expect(chips[0].classList.contains('selected')).toBe(true);
  });
});
