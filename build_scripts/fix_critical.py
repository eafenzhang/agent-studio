#!/usr/bin/env python3
"""Fix all critical issues in index.html after UI4 migration."""
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(SCRIPT_DIR, '..')
SRC_FILE = os.path.join(PROJECT_DIR, 'src', 'index.html')

with open(SRC_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# === FIX 1: Add missing CSS ===
css_additions = '''
/* ===== Dialog / Form / Button Styles ===== */
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 200; display: none; align-items: center; justify-content: center; }
.dialog-overlay.visible { display: flex; }
.dialog { background: #fff; border-radius: 8px; width: 460px; max-width: 90vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,0.12); padding: 0; }
.dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--cb-border-subtle); }
.dialog-header h3 { font-size: 15px; font-weight: 600; color: var(--cb-text-primary); margin: 0; }
.dialog-body { padding: 16px 20px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--cb-border-subtle); }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 500; color: var(--cb-text-primary); margin-bottom: 4px; }
.form-input, .form-select { width: 100%; padding: 8px 12px; border: 1px solid var(--cb-border); border-radius: 4px; background: #fff; color: var(--cb-text-primary); font-size: 13px; font-family: var(--cb-font-family); outline: none; box-sizing: border-box; }
.form-input:focus, .form-select:focus { border-color: var(--cb-button-primary); }
.btn-accent { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: var(--cb-button-primary); color: #fff; border: none; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: var(--cb-font-family); }
.btn-accent:hover { background: #5a3de6; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: transparent; border: 1px solid var(--cb-border); border-radius: 4px; font-size: 13px; color: var(--cb-text-primary); cursor: pointer; font-family: var(--cb-font-family); }
.btn-ghost:hover { background: var(--wb-todo-menu-bg-hover); }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-xs { padding: 3px 8px; font-size: 11px; }
.btn-icon { display: inline-flex; align-items: center; justify-content: center; border: none; background: none; cursor: pointer; color: inherit; padding: 4px; border-radius: 4px; }
.btn-icon:hover { background: rgba(0,0,0,0.04); }
.loading-msg, .empty-msg { padding: 20px; text-align: center; color: var(--cb-text-secondary); font-size: 13px; }
.toast-notification { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(100px); background: #333; color: #fff; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 500; z-index: 1000; opacity: 0; transition: transform 0.3s ease, opacity 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.toast-notification.show { transform: translateX(-50%) translateY(0); opacity: 1; }
.model-card { background: var(--cb-main-area-background); border: 1px solid var(--cb-border-subtle); border-radius: 6px; padding: 12px; margin-bottom: 8px; }
.model-card-name { font-size: 13px; font-weight: 500; color: var(--cb-text-primary); margin-bottom: 2px; }
.model-card-desc { font-size: 12px; color: var(--cb-text-secondary); }
'''

style_end = content.find('</style>')
content = content[:style_end] + css_additions + '\n' + content[style_end:]
changes.append("Added dialog/form/button CSS")

# === FIX 2: Add id="ai-prompt" to home page textarea ===
content = content.replace(
    '<textarea class="chat-input-textarea" rows="2" placeholder="输入消息...',
    '<textarea id="ai-prompt" class="chat-input-textarea" rows="2" placeholder="输入消息...',
    1
)
changes.append("Added id=ai-prompt to home textarea")

# === FIX 3: Fix closeAddModelDialog ===
content = content.replace(
    "document.getElementById('add-model-dialog').style.display = 'none';",
    "document.getElementById('add-model-dialog').classList.remove('visible');",
)
changes.append("Fixed closeAddModelDialog")

# === FIX 4: Add selectExpert function ===
if 'function selectExpert' not in content:
    content = content.replace(
        'function selectDropdown(labelId, val, el) {',
        'function selectExpert(el) {\n  var m = el.closest(\'.chat-dropdown-menu\');\n  if (m) { m.querySelectorAll(\'.chat-dropdown-item\').forEach(function(i){ i.classList.remove(\'active\'); }); el.classList.add(\'active\'); m.classList.remove(\'open\'); }\n}\n\nfunction selectDropdown(labelId, val, el) {'
    )
    changes.append("Added selectExpert function")

# === FIX 5: Export loadProvidersForSettings from IIFE ===
content = content.replace(
    '  function loadProvidersForSettings() {',
    '  window.loadProvidersForSettings = function() {',
)
changes.append("Exported loadProvidersForSettings")

# === FIX 6: Fix settings language select values ===
content = content.replace(
    '<option>中文(简体)</option><option>English</option>',
    '<option value="zh-CN">中文(简体)</option><option value="en">English</option>',
)
changes.append("Fixed language select values")

# === FIX 7: Fix misleading tools/artifacts toast ===
content = content.replace(
    "    if (typeof showToast === 'function') showToast('功能开发中，敬请期待');",
    "    if (typeof initToolsPage === 'function') initToolsPage();",
)
changes.append("Fixed tools/artifacts toast")

# === FIX 8: Add connection status elements ===
status_html = '''<div style="display:none">
  <span id="connection-dot"></span>
  <span id="status-dot"></span>
  <span id="status-text"></span>
</div>'''
content = content.replace(
    '<script>\n// ===== Toast =====',
    status_html + '\n<script>\n// ===== Toast ====='
)
changes.append("Added connection status elements")

with open(SRC_FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("Changes applied:")
for c in changes:
    print(f"  - {c}")
print(f"\nFile size: {len(content)} bytes")
