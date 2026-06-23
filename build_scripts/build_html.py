#!/usr/bin/env python3
"""Rebuild index.html with UI4 CSS + body, preserving our JS."""
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(SCRIPT_DIR, '..')
SRC_DIR = os.path.join(PROJECT_DIR, 'src')
UI4_DIR = os.path.join(PROJECT_DIR, '..', 'UI4')

# Read UI4 file
ui4_path = os.path.join(UI4_DIR, 'agent-studio.html')
with open(ui4_path, 'r', encoding='utf-8') as f:
    ui4 = f.read()

# Extract CSS from UI4
style_start = ui4.find('<style>')
style_end = ui4.find('</style>') + len('</style>')
ui4_css = ui4[style_start:style_end]

# Extract BODY HTML from UI4 (from <body to just before first <script>)
body_start = ui4.find('<body')
first_script = ui4.find('<script>', body_start)
ui4_body = ui4[body_start:first_script]

# Build complete HTML
parts = []
parts.append('<!DOCTYPE html>')
parts.append('<html lang="zh-CN">')
parts.append('<head>')
parts.append('<meta charset="UTF-8" />')
parts.append('<meta name="viewport" content="width=device-width, initial-scale=1" />')
parts.append('<meta name="canvas:aspect-ratio" content="16:9" />')
parts.append('<title>Agent Studio</title>')
parts.append(ui4_css)
parts.append('</head>')
parts.append('')
# Body from UI4 (without its inline script)
parts.append(ui4_body)
parts.append('')

# JS - read from a clean JS source
# We'll inline our JavaScript here
parts.append("""
<script>
// ===== Toast =====
function showToast(msg) {
  var t = document.getElementById('toast-notification');
  if (!t) { t = document.createElement('div'); t.id = 'toast-notification'; t.className = 'toast-notification'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2500);
}

// ===== Assistants =====
var currentAssistants = [];
function loadAssistants() {
  fetch('http://127.0.0.1:25808/api/assistants').then(function(r){return r.json()}).then(function(data){
    if (data.success && data.data) { currentAssistants = data.data; renderAssistants(); }
  }).catch(function(){ console.log('Failed to load assistants'); });
}
function renderAssistants() {
  var c = document.getElementById('assistants-list');
  if (!c || !currentAssistants.length) return;
  var html = '';
  currentAssistants.forEach(function(a) {
    var name = (a.name_i18n && a.name_i18n['zh-CN']) || a.name;
    var icon = '';
    if (a.avatar && a.avatar.startsWith('/')) {
      icon = '<img src="http://127.0.0.1:25808' + a.avatar + '" alt="" />';
    } else {
      icon = '<span>' + (a.avatar || '🤖') + '</span>';
    }
    html += '<div class="assistant-pill" data-id="' + a.id + '" onclick="selectAssistant(\\'' + a.id + '\\',this)">';
    html += '<div class="assistant-pill-icon">' + icon + '</div>';
    html += name;
    html += '</div>';
  });
  c.innerHTML = html;
}
function selectAssistant(id, el) {
  document.querySelectorAll('.assistant-pill').forEach(function(p){p.classList.remove('selected')});
  el.classList.add('selected');
}

// ===== Connection =====
function updateConnection(connected) {
  var dot = document.getElementById('connection-dot');
  if (dot) dot.style.background = connected ? '#22c55e' : '#ff4d4f';
}
function checkBackendConnection() {
  fetch('http://127.0.0.1:25808/health').then(function(r){updateConnection(r.ok)}).catch(function(){updateConnection(false)});
}
checkBackendConnection();
setInterval(checkBackendConnection, 5000);
loadAssistants();

// Page switching
var pageTitles = { home:'新建任务', assistant:'助理', projects:'项目', experts:'专家', tools:'工具', artifacts:'产物', conversation:'会话' };
function switchPage(pageId, navEl) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active', 'page-fade-in'); });
  var target = document.getElementById('page-' + pageId);
  if (target) { target.classList.add('active'); requestAnimationFrame(function() { target.classList.add('page-fade-in'); }); }
  document.querySelectorAll('.conversation-list-tab-button').forEach(function(b) { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
  if (navEl) { navEl.classList.add('active'); navEl.setAttribute('aria-selected','true'); }
  var tb = document.getElementById('topbar-title');
  if (tb) tb.textContent = pageTitles[pageId] || '';
  var cd = document.getElementById('conversation-detail');
  if (cd) cd.classList.remove('active');
  if (pageId === 'tools' || pageId === 'artifacts') {
    if (typeof showToast === 'function') showToast('功能开发中，敬请期待');
  }
}
function switchTab(el) {
  document.querySelectorAll('.tab-item, .expert-tab, .tool-tab, .artifact-tab').forEach(function(t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
  el.classList.add('active'); el.setAttribute('aria-selected', 'true');
}

// UI4 helpers
var sidebarCollapsed = false;
function toggleSidebar() {
  var sb = document.querySelector('.conversation-list');
  var btn = document.getElementById('topbar-expand-btn');
  sidebarCollapsed = !sidebarCollapsed;
  if (sb) { sb.style.width = sidebarCollapsed ? '0px' : '240px'; sb.style.minWidth = sidebarCollapsed ? '0px' : '240px'; }
  if (btn) btn.style.display = sidebarCollapsed ? 'flex' : 'none';
}
function switchCategory(cat, btn) {
  document.querySelectorAll('.chat-welcome-chip').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  renderChips(cat);
}
var chipData = { office:['📊 数据分析','📝 文档写作','💻 代码开发','🎨 设计素材'], prototype:['📱 移动端原型','🖥️ Web 原型','📋 交互流程'], creative:['🎬 视频脚本','🖌️ 视觉设计','📰 营销文案'] };
function renderChips(cat) {
  var row = document.getElementById('chip-row');
  if (!row) return;
  var items = chipData[cat] || chipData.office;
  row.innerHTML = items.map(function(c){ return '<div class="chat-assistant-chip" onclick="selectChip(this)"><span class="chat-assistant-chip-label">'+c+'</span></div>'; }).join('');
}
function selectChip(el) {
  document.querySelectorAll('.chat-assistant-chip').forEach(function(c){ c.classList.remove('selected'); });
  el.classList.add('selected');
}
function scrollChips(dir) {
  var s = document.querySelector('.chat-assistant-chips-scroll');
  if (s) s.scrollBy({ left: dir * 150, behavior: 'smooth' });
}
function renderExperts() {
  var grid = document.querySelector('.experts-grid');
  if (!grid) return;
  fetch('http://127.0.0.1:25808/api/assistants').then(function(r){return r.json()}).then(function(d){
    if (d.success && d.data) {
      grid.innerHTML = d.data.map(function(a){
        var n = (a.name_i18n && a.name_i18n['zh-CN']) || a.name;
        var desc = (a.description_i18n && a.description_i18n['zh-CN']) || a.description || '';
        if (desc.length > 80) desc = desc.substring(0, 80) + '...';
        return '<article class="expert-card"><div class="expert-card-top"><div class="expert-avatar">'+n.charAt(0)+'</div><div><div class="expert-name">'+n+'</div><div class="expert-role">'+(a.source==='builtin'?'AionCore 内置':'自定义')+'</div></div></div><div class="expert-desc">'+desc+'</div></article>';
      }).join('');
    }
  }).catch(function(){});
}
function selectDropdown(labelId, val, el) {
  document.getElementById(labelId).textContent = val;
  var m = el.closest('.chat-dropdown-menu');
  if (m) { m.querySelectorAll('.chat-dropdown-item').forEach(function(i){ i.classList.remove('active'); }); el.classList.add('active'); m.classList.remove('open'); }
}
function openConversation(title) {
  var tb = document.getElementById('topbar-title');
  if (tb) tb.textContent = title;
  document.getElementById('page-home').classList.remove('active');
  document.getElementById('conversation-detail').classList.add('active');
}
document.querySelectorAll('.category-btn, .chat-welcome-chip').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.category-btn, .chat-welcome-chip').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeSettings(); }
});

// ===== Add Model Dialog =====
var API_URLS = {
  openai: 'https://api.openai.com',
  'new-api': 'http://localhost:3000',
  deepseek: 'https://api.deepseek.com',
  qwen: 'https://dashscope.aliyuncs.com',
  doubao: 'https://ark.cn-beijing.volces.com',
  baidu: 'https://aip.baidubce.com',
  glm: 'https://open.bigmodel.cn',
  moonshot: 'https://api.moonshot.cn',
  minimax: 'https://api.minimaxi.com',
  step: 'https://api.stepfun.com',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com'
};
function autoFillApiUrl(platform) {
  if (document.getElementById('add-model-dialog').getAttribute('data-edit-id')) return;
  var url = API_URLS[platform] || '';
  document.getElementById('model-api-url').value = url;
}
function showAddModelDialog() {
  document.getElementById('add-model-dialog').classList.add('visible');
  document.getElementById('add-model-dialog').setAttribute('data-edit-id', '');
  document.querySelector('#add-model-dialog h3').textContent = '添加模型';
  document.getElementById('model-api-url').value = '';
  document.getElementById('model-api-key').value = '';
  document.getElementById('model-name').value = '';
  document.getElementById('model-platform').value = 'openai';
  document.getElementById('model-protocol').value = 'openai';
}
function closeAddModelDialog() {
  document.getElementById('add-model-dialog').style.display = 'none';
  document.getElementById('add-model-dialog').removeAttribute('data-edit-id');
}
function toggleApiKeyVisibility() {
  var input = document.getElementById('model-api-key');
  input.type = input.type === 'password' ? 'text' : 'password';
}
function saveModel() {
  var platform = document.getElementById('model-platform').value;
  var apiUrl = document.getElementById('model-api-url').value.trim();
  var apiKey = document.getElementById('model-api-key').value.trim();
  var name = document.getElementById('model-name').value.trim();
  var protocol = document.getElementById('model-protocol').value;
  if (!apiUrl || !apiKey || !name) { showToast('请填写必填字段'); return; }
  var B = 'http://127.0.0.1:25808';
  var body = { name: name, base_url: apiUrl, api_key: apiKey, protocol: protocol, models: [name] };
  var editId = document.getElementById('add-model-dialog').getAttribute('data-edit-id');
  if (editId) {
    fetch(B + '/api/providers/' + editId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function(r){return r.json()}).then(function(d){ if (d.success) { showToast('已更新'); closeAddModelDialog(); loadProvidersForSettings(); } else showToast('更新失败: ' + (d.error || '')); }).catch(function(){showToast('网络错误')});
  } else {
    fetch(B + '/api/providers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function(r){return r.json()}).then(function(d){ if (d.success) { showToast('模型已添加'); closeAddModelDialog(); loadProvidersForSettings(); } else showToast('添加失败: ' + (d.error || '')); }).catch(function(){showToast('网络错误')});
  }
}

// ===== Custom Agent CRUD =====
var editingAgentId = null;
function showCreateDialog() {
  editingAgentId = null;
  document.getElementById('dialog-title').textContent = '创建自定义助手';
  document.getElementById('dialog-save-btn').textContent = '创建';
  document.getElementById('agent-name').value = '';
  document.getElementById('agent-command').value = '';
  document.getElementById('agent-args').value = '';
  document.getElementById('custom-overlay').style.display = 'flex';
}
function showEditDialog(name, command, args, id) {
  editingAgentId = id;
  document.getElementById('dialog-title').textContent = '编辑助手';
  document.getElementById('dialog-save-btn').textContent = '保存';
  document.getElementById('agent-name').value = name;
  document.getElementById('agent-command').value = command;
  document.getElementById('agent-args').value = (args || []).join(' ');
  document.getElementById('custom-overlay').style.display = 'flex';
}
function closeDialog() { document.getElementById('custom-overlay').style.display = 'none'; }
function saveCustomAgent() {
  var name = document.getElementById('agent-name').value.trim();
  var command = document.getElementById('agent-command').value.trim();
  var argsStr = document.getElementById('agent-args').value.trim();
  if (!name || !command) { showToast('请填写名称和命令'); return; }
  var B = 'http://127.0.0.1:25808';
  var body = { name: name, command: command };
  if (argsStr) body.args = argsStr.split(/\\s+/);
  if (editingAgentId) {
    fetch(B + '/api/agents/custom/' + editingAgentId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function(r){return r.json()}).then(function(d){ if (d.success) { showToast('已保存'); closeDialog(); } else showToast('保存失败: ' + (d.error || '')); }).catch(function(){showToast('网络错误')});
  } else {
    fetch(B + '/api/agents/custom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function(r){return r.json()}).then(function(d){ if (d.success) { showToast('已创建'); closeDialog(); } else showToast('创建失败: ' + (d.error || '')); }).catch(function(){showToast('网络错误')});
  }
}

// ===== Backend Integration =====
(function() {
  var BACKEND = 'http://127.0.0.1:25808';
  var backendOk = false;
  function checkBackend() {
    fetch(BACKEND + '/health').then(function(r) { backendOk = r.ok; updateConnectionDot(backendOk); }).catch(function() { backendOk = false; updateConnectionDot(false); });
  }
  function updateConnectionDot(ok) {
    var dot = document.getElementById('connection-dot');
    if (dot) dot.style.background = ok ? '#22c55e' : '#ff4d4f';
    var sdot = document.getElementById('status-dot');
    if (sdot) sdot.style.background = ok ? '#22c55e' : '#ff4d4f';
    var stxt = document.getElementById('status-text');
    if (stxt) stxt.textContent = ok ? '已连接' : '未连接';
  }
  function loadSettings() {
    if (!backendOk) return;
    fetch(BACKEND + '/api/settings').then(function(r) { return r.json(); }).then(function(d) {
      if (d.success && d.data) {
        var s = d.data;
        if (s.language) {
          var sel = document.querySelector('#settings-general .setting-select');
          if (sel) { for (var i=0;i<sel.options.length;i++) { if (sel.options[i].value===s.language) { sel.selectedIndex=i; break; } } }
        }
        if (s.default_model) {
          var ml = document.getElementById('model-label');
          if (ml) ml.textContent = s.default_model;
        }
        if (s.default_mode) {
          var mlabel = document.getElementById('mode-label');
          if (mlabel) mlabel.textContent = s.default_mode;
        }
        var boolKeys = ['notification_enabled','auto_start','close_to_tray','hardware_acceleration','save_upload_to_workspace','auto_preview_office','cron_notification_enabled'];
        for (var i=0;i<boolKeys.length;i++) {
          var k = boolKeys[i];
          if (s[k] !== undefined) {
            var el = document.querySelector('[data-key="'+k+'"]');
            if (el) { if (s[k]) el.classList.add('on'); else el.classList.remove('on'); }
          }
        }
      }
    }).catch(function() {});
  }
  function loadModels() {
    if (!backendOk) return;
    fetch(BACKEND + '/api/providers').then(function(r) { return r.json(); }).then(function(d) {
      if (d.success && d.data) {
        var models = [];
        d.data.forEach(function(p) { if (p.models) { p.models.forEach(function(m) { models.push(m); }); } });
        if (models.length > 0) {
          var menus = ['model-menu', 'convp-model-menu'];
          menus.forEach(function(mid) {
            var menu = document.getElementById(mid);
            if (menu) {
              var html = '';
              models.forEach(function(m, i) {
                html += '<div class="chat-dropdown-item' + (i === 0 ? ' active' : '') + '" onclick="selectDropdown(\\'' + (mid==='model-menu'?'model-label':'convp-model-label') + '\\',\\'' + m + '\\', this)">';
                html += '<span class="chat-dropdown-item-label">' + m + '</span>';
                html += '<svg class="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
                html += '</div>';
              });
              menu.innerHTML = html;
            }
          });
        }
      }
    }).catch(function() {});
  }
  function loadAgentsForExpert() {
    if (!backendOk) return;
    fetch(BACKEND + '/api/agents').then(function(r) { return r.json(); }).then(function(d) {
      if (d.success && d.data) {
        var menu = document.getElementById('expert-menu');
        if (menu) {
          var html = '';
          d.data.forEach(function(a, i) {
            var name = (a.name_i18n && a.name_i18n['zh-CN']) || a.name;
            html += '<div class="chat-dropdown-item' + (i === 0 ? ' active' : '') + '" onclick="selectDropdown(\\'expert-label\\',\\'' + name + '\\', this)">';
            html += '<span class="chat-dropdown-item-label">' + name + '</span>';
            html += '<svg class="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
            html += '</div>';
          });
          menu.innerHTML = html;
        }
      }
    }).catch(function() {});
  }
  function loadTools() {
    if (!backendOk) return;
    fetch(BACKEND + '/api/mcp').then(function(r) { return r.json(); }).then(function(d) {
      if (d.success && d.data) {
        var servers = d.data;
        if (servers.length > 0) {
          var menu = document.getElementById('tool-menu');
          if (menu) {
            var html = '<div class="chat-dropdown-section">MCP</div>';
            servers.forEach(function(s) {
              html += '<div class="chat-dropdown-item" onclick="this.classList.toggle(\\'active\\')">';
              html += '<span class="chat-dropdown-item-label">' + (s.name || s.id) + '</span>';
              html += '<svg class="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
              html += '</div>';
            });
            menu.innerHTML = html;
          }
        }
      }
    }).catch(function() {});
  }
  function loadConversations() {
    if (!backendOk) return;
    fetch(BACKEND + '/api/conversations').then(function(r) { return r.json(); }).then(function(d) {
      if (d.success && d.data && d.data.items) {
        var list = document.getElementById('recent-conversations');
        var count = document.getElementById('conversation-count');
        if (list) {
          var items = d.data.items;
          if (count) count.textContent = items.length;
          if (items.length > 0) {
            var html = '';
            items.slice(0, 8).forEach(function(c) {
              var title = c.name || c.title || '新对话';
              var time = c.updatedAt ? formatTime(c.updatedAt) : '';
              html += '<div class="conversation-agent-card" onclick="openConvPage(\\'' + c.id + '\\', \\'' + title.replace(/'/g, "\\\\'") + '\\')">';
              html += '  <div class="conversation-agent-card__info">';
              html += '    <div class="conversation-agent-card__title">' + title.substring(0, 20) + '</div>';
              if (time) html += '    <div class="conversation-agent-card__meta">' + time + '</div>';
              html += '  </div></div>';
            });
            list.innerHTML = html;
          } else {
            list.innerHTML = '<div style="padding:8px;color:var(--wb-color-text-disabled);font-size:12px;">暂无对话</div>';
          }
        }
      }
    }).catch(function() {});
  }
  function formatTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff/60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff/3600000) + ' 小时前';
    return Math.floor(diff/86400000) + ' 天前';
  }

  window.currentConvPageId = null;
  window.openConvPage = function(convId, convTitle) {
    currentConvPageId = convId;
    document.getElementById('page-home').classList.remove('active');
    document.getElementById('conversation-detail').classList.add('active');
    var container = document.getElementById('conv-page-messages');
    if (container) container.innerHTML = '<div style="padding:20px;text-align:center;color:#a0a0a0;font-size:13px;">加载中...</div>';
    loadConvPageMessages(convId);
  }
  function loadConvPageMessages(convId) {
    if (!backendOk) return;
    fetch(BACKEND + '/api/conversations/' + convId + '/messages').then(function(r){return r.json()}).then(function(d){
      if (d.success && d.data && d.data.items) {
        var container = document.getElementById('conv-page-messages');
        var html = '';
        d.data.items.forEach(function(m) {
          var isUser = m.position !== 'left';
          var content = '';
          if (m.content && typeof m.content === 'object') { content = m.content.content || m.content.text || JSON.stringify(m.content); }
          else { content = m.content || ''; }
          if (!content) return;
          html += '<div class="msg-row ' + (isUser ? 'user' : 'assistant') + '">';
          html += '  <div class="msg-avatar ' + (isUser ? 'human' : 'bot') + '">' + (isUser ? 'U' : 'A') + '</div>';
          html += '  <div><div class="msg-bubble ' + (isUser ? 'user' : 'assistant') + '">' + escapeHtml(content).replace(/\\n/g, '<br>') + '</div></div>';
          html += '</div>';
        });
        container.innerHTML = html || '<div style="padding:20px;text-align:center;color:#a0a0a0;font-size:13px;">暂无消息</div>';
        container.scrollTop = container.scrollHeight;
      }
    }).catch(function(){});
  }
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Settings save
  window.saveSetting = function(key, value) {
    if (!backendOk) { showToast('后端未连接'); return; }
    var body = {};
    body[key] = value;
    fetch(BACKEND + '/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function(r) { return r.json(); }).then(function(d) { if (d.success) showToast('设置已保存'); else showToast('保存失败: ' + (d.error || '')); }).catch(function() { showToast('网络错误'); });
  };

  window.currentExpertFilter = 'all';
  window.switchExpertTab = function(filter, el) {
    window.currentExpertFilter = filter;
    document.querySelectorAll('.experts-tabs .expert-tab').forEach(function(t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    el.classList.add('active'); el.setAttribute('aria-selected', 'true');
    loadExpertsPage();
  };
  function loadExpertsPage() {
    if (!backendOk) return;
    fetch(BACKEND + '/api/assistants').then(function(r) { return r.json(); }).then(function(d) {
      if (d.success && d.data) {
        var grid = document.querySelector('.experts-grid');
        if (grid) {
          var filtered = d.data;
          var f = window.currentExpertFilter || 'all';
          if (f === 'builtin') filtered = d.data.filter(function(a) { return a.source === 'builtin'; });
          else if (f === 'custom') filtered = d.data.filter(function(a) { return a.source !== 'builtin'; });
          var html = '';
          filtered.forEach(function(a) {
            var name = (a.name_i18n && a.name_i18n['zh-CN']) || a.name;
            var desc = (a.description_i18n && a.description_i18n['zh-CN']) || a.description || '';
            var icon = a.avatar || '🤖';
            if (desc.length > 80) desc = desc.substring(0, 80) + '...';
            html += '<article class="expert-card"><div class="expert-card-top"><div class="expert-avatar">' + icon + '</div><div><div class="expert-name">' + name + '</div><div class="expert-role">' + (a.source === 'builtin' ? 'AionCore 内置' : '自定义') + '</div></div></div><div class="expert-desc">' + desc + '</div></article>';
          });
          grid.innerHTML = html;
        }
      }
    }).catch(function() {});
  }

  // Model settings
  function loadProvidersForSettings() {
    fetch(BACKEND + '/api/providers').then(function(r){return r.json()}).then(function(d){
      if (d.success && d.data) {
        var container = document.getElementById('provider-list');
        if (container) {
          var html = '';
          d.data.forEach(function(p) {
            var models = (p.models || []).join(', ');
            html += '<div class="model-card"><div class="model-card-name">' + (p.name || '未知') + '</div><div class="model-card-desc">' + models.substring(0, 60) + '</div></div>';
          });
          container.innerHTML = html || '<div style="padding:20px;text-align:center;color:#a0a0a0;font-size:13px;">暂无配置</div>';
        }
      }
    }).catch(function(){});
  }
  function fetchModelsForProvider(id) {
    if (!backendOk) { showToast('后端未连接'); return; }
    showToast('正在获取模型列表...');
    fetch(BACKEND + '/api/providers/' + id + '/models', { method: 'POST' }).then(function(r){return r.json()}).then(function(d){ if (d.success) { showToast('模型列表已更新'); loadProvidersForSettings(); } else showToast('获取失败: ' + (d.error || '')); }).catch(function(){showToast('网络错误')});
  }
  function editProvider(id) {
    if (!backendOk) { showToast('后端未连接'); return; }
    document.getElementById('add-model-dialog').classList.add('visible');
    document.getElementById('add-model-dialog').setAttribute('data-edit-id', id);
    document.querySelector('#add-model-dialog h3').textContent = '编辑模型';
    fetch(BACKEND + '/api/providers/' + id).then(function(r){return r.json()}).then(function(d){ if (d.success && d.data) { var p = d.data; document.getElementById('model-name').value = p.name || ''; document.getElementById('model-api-url').value = p.base_url || ''; document.getElementById('model-api-key').value = p.api_key || ''; } }).catch(function(){showToast('加载失败')});
  }
  function testConnection(id) {
    if (!backendOk) { showToast('后端未连接'); return; }
    showToast('正在测试连接...');
    fetch(BACKEND + '/api/agents/custom/try-connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider_id: id }) })
      .then(function(r){return r.json()}).then(function(d){ if (d.success) showToast('连接成功 \\u2713'); else showToast('连接失败: ' + (d.error || '')); }).catch(function(){showToast('连接测试失败')});
  }
  function deleteProvider(id) {
    if (!confirm('确定要删除此提供商吗？')) return;
    fetch(BACKEND + '/api/providers/' + id, { method: 'DELETE' }).then(function(r){return r.json()}).then(function(d){ if (d.success) { showToast('已删除'); loadProvidersForSettings(); } else showToast('删除失败'); }).catch(function(){showToast('网络错误')});
  }
  window.deleteConv = function(id) {
    if (!confirm('确定要删除此会话吗？')) return;
    fetch(BACKEND + '/api/conversations/' + id, { method: 'DELETE' }).then(function(r){return r.json()}).then(function(d){ if (d.success) { showToast('已删除'); loadConversations(); } else showToast('删除失败'); }).catch(function(){showToast('网络错误')});
  }
  function loadToolsFromBackend() {
    if (!backendOk) return;
    fetch(BACKEND + '/api/skills').then(function(r){return r.json()}).then(function(d){
      if (d.success && d.data) {
        var container = document.getElementById('skill-items');
        if (container) {
          var html = '';
          d.data.forEach(function(s) {
            html += '<div class="tool-item"><div class="tool-icon">' + (s.name || '?').charAt(0).toUpperCase() + '</div><div class="tool-info"><div class="tool-name">' + (s.name || '未知') + '</div><div class="tool-desc">' + (s.description || '') + '</div></div></div>';
          });
          container.innerHTML = html || '<div style="padding:20px;text-align:center;color:#a0a0a0;font-size:13px;">暂无可用技能</div>';
        }
      }
    }).catch(function(){});
    fetch(BACKEND + '/api/extensions/mcp-servers').then(function(r){return r.json()}).then(function(d){
      if (d.success && d.data) {
        var container = document.getElementById('mcp-items');
        if (container) {
          var html = '';
          d.data.forEach(function(m) {
            var connected = m.connected ? '已连接' : '未连接';
            html += '<div class="tool-item"><div class="tool-icon">' + (m.name || '?').charAt(0).toUpperCase() + '</div><div class="tool-info"><div class="tool-name">' + (m.name || '未知 MCP') + '</div><div class="tool-desc">' + (m.description || '') + '</div></div><div class="tool-meta"><span class="tool-stat">' + connected + '</span></div></div>';
          });
          container.innerHTML = html || '<div style="padding:20px;text-align:center;color:#a0a0a0;font-size:13px;">暂无 MCP 服务器</div>';
        }
      }
    }).catch(function(){});
  }
  function initToolsPage() { loadToolsFromBackend(); }
  function initArtifactsPage() {
    document.querySelectorAll('#page-artifacts button, #page-artifacts .artifact-item').forEach(function(el) { el.addEventListener('click', function(e) { e.preventDefault(); showToast('功能开发中'); }); });
  }

  // Init
  checkBackend();
  setInterval(checkBackend, 8000);
  setTimeout(function() {
    loadSettings();
    loadModels();
    loadAgentsForExpert();
    loadTools();
    loadConversations();
    loadExpertsPage();
    initToolsPage();
    initArtifactsPage();
    loadProvidersForSettings();
  }, 1000);

  // Send message button
  var sendBtn = document.querySelector('.chat-toolbar-send');
  if (sendBtn) {
    sendBtn.onclick = function() {
      var textarea = document.getElementById('ai-prompt');
      var text = textarea ? textarea.value.trim() : '';
      if (!text) { showToast('请输入消息'); return; }
      if (!backendOk) { showToast('后端未连接'); return; }
      textarea.value = '';
      fetch(BACKEND + '/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'aionrs', name: text.substring(0, 30) }) })
        .then(function(r) { return r.json(); }).then(function(d) {
          if (d.success && d.data) {
            var convId = d.data.id;
            openConvPage(convId, text.substring(0, 30));
            fetch(BACKEND + '/api/conversations/' + convId + '/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text }) })
              .then(function(r2){return r2.json()}).then(function(d2){ if (d2.success) loadConversations(); }).catch(function(){});
          }
        }).catch(function() { showToast('创建会话失败'); });
    };
  }
})();

// ===== Settings =====
function openSettings() { document.getElementById('settings-overlay').classList.add('visible'); }
function closeSettings(e) { if (e && e.target !== e.currentTarget) return; document.getElementById('settings-overlay').classList.remove('visible'); }
var settingsPageTitles = { general: '系统设置', model: '模型', memory: '记忆', update: '更新' };
function switchSettingsPage(pageId, navEl) {
  document.querySelectorAll('.settings-page').forEach(function(p) { p.classList.remove('active'); });
  var target = document.getElementById('settings-' + pageId);
  if (target) target.classList.add('active');
  document.querySelectorAll('.settings-nav-item').forEach(function(n) { n.classList.remove('active'); });
  if (navEl) navEl.classList.add('active');
  document.getElementById('settings-page-title').textContent = settingsPageTitles[pageId] || '设置';
}

// ===== Toolbar =====
function toggleDropdown(id) {
  var menu = document.getElementById(id);
  if (!menu) return;
  var wasOpen = menu.classList.contains('open');
  document.querySelectorAll('.toolbar-dropdown-menu, .chat-dropdown-menu').forEach(function(m) { m.classList.remove('open'); });
  if (!wasOpen) menu.classList.add('open');
}
document.addEventListener('click', function(e) {
  if (!e.target.closest('.toolbar-dropdown') && !e.target.closest('.chat-dropdown')) {
    document.querySelectorAll('.toolbar-dropdown-menu, .chat-dropdown-menu').forEach(function(m) { m.classList.remove('open'); });
  }
});

// ===== Tool page =====
function switchToolTab(cat, tabEl) {
  document.querySelectorAll('.tool-tab').forEach(function(t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
  tabEl.classList.add('active');
  tabEl.setAttribute('aria-selected', 'true');
  document.querySelectorAll('[data-tool-category]').forEach(function(c) { c.style.display = c.getAttribute('data-tool-category') === cat ? '' : 'none'; });
}
function setSlider(dot) {
  var parent = dot.closest('.setting-slider-dots');
  parent.querySelectorAll('.setting-slider-dot').forEach(function(d) { d.classList.remove('active'); });
  dot.classList.add('active');
  var labels = parent.parentElement.querySelectorAll('.setting-slider-label');
  var idx = Array.from(parent.children).indexOf(dot);
  labels.forEach(function(l, i) { l.classList.toggle('active', i === idx); });
}
</script>
</body>
</html>""")

result = '\n'.join(parts)
out_path = os.path.join(SRC_DIR, 'index.html')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(result)

print(f'OK: wrote {len(result)} bytes to {out_path}')
print(f'Has CSS: {ui4_css[:40]}')
print(f'Has body tag: {"<body" in ui4_body}')
print(f'Has closing: {"</html>" in result}')
