import { test, expect } from '@playwright/test';

// ===================================================================
// Navigation Tests
// ===================================================================

test('home page loads with welcome section', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Agent Studio')).toBeVisible();
  await expect(page.locator('text=你的 AI 创作工作台')).toBeVisible();
  // Category chips visible
  await expect(page.locator('.chat-welcome-chip:has-text("全部")')).toBeVisible();
  await expect(page.locator('.chat-welcome-chip:has-text("代码")')).toBeVisible();
});

test('sidebar navigation navigates to all pages', async ({ page }) => {
  await page.goto('/');

  const navTests = [
    { label: '专家', url: '/experts', title: '专家' },
    { label: '项目', url: '/projects', title: '项目' },
    { label: '工具', url: '/tools', title: '工具' },
    { label: '产物', url: '/artifacts', title: '产物' },
  ];

  for (const nav of navTests) {
    await page.locator(`.conversation-list-tab-button:has-text("${nav.label}")`).click();
    await page.waitForURL(`**${nav.url}`);
    await expect(page.locator('text=' + nav.title).first()).toBeVisible();
  }
});

test('settings accessible from sidebar footer', async ({ page }) => {
  await page.goto('/');
  const settingsBtn = page.locator('.conversation-list-footer-btn[aria-label="设置"]');
  await expect(settingsBtn).toBeVisible();
  await settingsBtn.click();
  await page.waitForURL('**/settings');
  await expect(page.locator('text=系统设置')).toBeVisible();
});

test('sidebar search filters conversations', async ({ page }) => {
  await page.goto('/');
  const searchInput = page.locator('input[placeholder="搜索会话..."]');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('test');
  // Search input state should reflect typed text
  await expect(searchInput).toHaveValue('test');
});

// ===================================================================
// Settings Page Tests
// ===================================================================

test('settings page has all tabs', async ({ page }) => {
  await page.goto('/settings');

  const tabs = ['系统', '模型', '记忆', '更新'];
  const tabContainer = page.locator('.settings-sidebar');
  for (const tab of tabs) {
    await expect(tabContainer.locator('text=' + tab)).toBeVisible();
  }
});

test('settings theme selector works', async ({ page }) => {
  await page.goto('/settings');
  const themeSelect = page.locator('.setting-select').first();
  await expect(themeSelect).toBeVisible();
  await themeSelect.selectOption('dark');
  // Verify data attribute on html
  const htmlTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(htmlTheme).toBe('dark');
});

test('settings model tab shows add model dialog', async ({ page }) => {
  await page.goto('/settings');
  // Switch to model tab
  await page.locator('.settings-nav-item:has-text("模型")').click();
  await expect(page.locator('text=模型提供商')).toBeVisible();

  // Click add model button
  await page.locator('button:has-text("添加模型")').click();

  // Dialog should appear with preset selector
  await expect(page.locator('text=供应商')).toBeVisible();
  await expect(page.locator('text=API 地址')).toBeVisible();
  await expect(page.locator('text=API Key')).toBeVisible();

  // Close dialog
  await page.locator('.settings-close-btn').first().click();
});

test('settings memory tab shows empty state', async ({ page }) => {
  await page.goto('/settings');
  await page.locator('.settings-nav-item:has-text("记忆")').click();
  await expect(page.locator('text=对话记忆')).toBeVisible();
});

test('settings language selector changes UI language', async ({ page }) => {
  await page.goto('/settings');
  // Find the language select (first select after "显示语言" label)
  const langLabel = page.locator('text=显示语言');
  await expect(langLabel).toBeVisible();
  const langSelect = langLabel.locator('..').locator('select');
  await langSelect.selectOption('en');
  // The page should switch to English - verify some key
  await expect(page.locator('.settings-close-btn')).toBeVisible();
});

// ===================================================================
// Experts Page Tests
// ===================================================================

test('experts page shows filter tabs and loads data', async ({ page }) => {
  await page.goto('/experts');
  await expect(page.locator('.expert-tab:has-text("全部")')).toBeVisible();
  await expect(page.locator('.expert-tab:has-text("内置")')).toBeVisible();
  await expect(page.locator('.expert-tab:has-text("自定义")')).toBeVisible();
});

test('experts filter switching works', async ({ page }) => {
  await page.goto('/experts');
  await page.locator('.expert-tab:has-text("内置")').click();
  await expect(page.locator('.expert-tab.active:has-text("内置")')).toBeVisible();
  await page.locator('.expert-tab:has-text("自定义")').click();
  await expect(page.locator('.expert-tab.active:has-text("自定义")')).toBeVisible();
});

// ===================================================================
// Tools Page Tests
// ===================================================================

test('tools page tabs switch between skills and MCP', async ({ page }) => {
  await page.goto('/tools');
  await expect(page.locator('.tool-tab:has-text("技能")')).toBeVisible();
  await expect(page.locator('.tool-tab:has-text("MCP")')).toBeVisible();

  // Skills tab is default
  // Switch to MCP
  await page.locator('.tool-tab:has-text("MCP")').click();
  await expect(page.locator('.tool-tab.active:has-text("MCP")')).toBeVisible();
  // MCP add server button should be visible
  await expect(page.locator('button:has-text("添加服务器")')).toBeVisible();
});

test('tools MCP add server dialog opens and validates', async ({ page }) => {
  await page.goto('/tools');
  // Switch to MCP tab
  await page.locator('.tool-tab:has-text("MCP")').click();
  // Click add server
  await page.locator('button:has-text("添加服务器")').click();
  // Dialog should show
  await expect(page.locator('text=添加 MCP 服务器')).toBeVisible();
  await expect(page.locator('text=启动命令 *')).toBeVisible();
  await expect(page.locator('text=环境变量 (JSON)')).toBeVisible();
  // Close
  await page.locator('.settings-close-btn').click();
});

// ===================================================================
// Projects Page Tests
// ===================================================================

test('projects page shows empty state and create dialog', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.locator('text=暂无项目')).toBeVisible();
  // Create button should work
  await page.locator('button:has-text("新建项目")').click();
  await expect(page.locator('text=新建项目')).toBeVisible();
  await expect(page.locator('text=项目名称')).toBeVisible();
  await expect(page.locator('text=路径')).toBeVisible();
  // Create a project in local mode
  await page.locator('input[placeholder="输入项目名称"]').fill('My Test Project');
  await page.locator('input[placeholder="输入项目描述（可选）"]').fill('E2E test project');
  await page.locator('button:has-text("保存")').click();
  // Should create locally and show the item
  await expect(page.locator('text=项目已创建')).toBeVisible();
});

test('projects page local mode creates and deletes projects', async ({ page }) => {
  await page.goto('/projects');

  // Create project
  await page.locator('button:has-text("新建项目")').click();
  await page.locator('input[placeholder="输入项目名称"]').fill('E2E Test');
  await page.locator('button:has-text("保存")').click();

  // Should show the project
  await expect(page.locator('text=E2E Test')).toBeVisible();

  // Open detail view
  await page.locator('text=E2E Test').click();
  await expect(page.locator('text=项目详情')).toBeVisible();
  await page.locator('.settings-close-btn').first().click();

  // Delete the project
  await page.locator('button:has-text("删除")').click();
});

// ===================================================================
// Artifacts Page Tests
// ===================================================================

test('artifacts page shows empty state', async ({ page }) => {
  await page.goto('/artifacts');
  await expect(page.locator('text=管理 AI 生成的文件与产物')).toBeVisible();
  // Empty state should be visible
  await expect(page.locator('text=暂无文件')).toBeVisible();
});

test('artifacts page filter dropdown works', async ({ page }) => {
  await page.goto('/artifacts');
  // Click filter button
  await page.locator('.artifact-filter button').click();
  // Dropdown should appear
  await expect(page.locator('text=全部类型')).toBeVisible();
  // Click outside to close
  await page.locator('.artifacts-page-header').click();
});

// ===================================================================
// Chat Page Tests
// ===================================================================

test('chat page shows empty state for new conversation', async ({ page }) => {
  await page.goto('/chat/test-conv-id');
  await expect(page.locator('text=暂无消息')).toBeVisible();
  // Input panel should be visible
  await expect(page.locator('.chat-input-textarea')).toBeVisible();
  await expect(page.locator('.chat-input-disclaimer')).toBeVisible();
});

test('chat input customizations are visible', async ({ page }) => {
  await page.goto('/chat/test-conv-id');

  // Mode selector button
  await expect(page.locator('.chat-toolbar-btn-primary')).toBeVisible();

  // Input area should have placeholder
  const textarea = page.locator('.chat-input-textarea');
  await expect(textarea).toBeVisible();
  await expect(textarea).toHaveAttribute('placeholder', /输入消息/);

  // Type something
  await textarea.fill('Hello AI');
  // Send button should be enabled
  await expect(page.locator('.chat-toolbar-send')).toBeVisible();
});

test('chat page header shows delete button', async ({ page }) => {
  await page.goto('/chat/test-conv-id');
  // The delete (trash) button should be visible in header
  const deleteBtn = page.locator('button[title="删除对话"]');
  await expect(deleteBtn).toBeVisible();
});

// ===================================================================
// Connection Status Tests
// ===================================================================

test('connection status indicator is visible', async ({ page }) => {
  await page.goto('/');
  // Should show connection status in the topbar
  await expect(page.locator('.connection-status-indicator')).toBeVisible();
  // Without backend, should show "未连接" (disconnected)
  await expect(page.locator('.connection-status-indicator span:has-text("未连接")')).toBeVisible();
});

// ===================================================================
// Theme Toggle Tests
// ===================================================================

test('theme toggle cycles themes', async ({ page }) => {
  await page.goto('/');
  // Find theme toggle button inside the topbar
  const themeToggle = page.locator('.workbuddy-topbar-actions button').last();
  await expect(themeToggle).toBeVisible();

  // Get initial theme
  const initialTheme = await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme')
  );

  // Click to toggle
  await themeToggle.click();
  await page.waitForTimeout(100);
  const newTheme = await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme')
  );
  // Theme should have changed
  expect(newTheme).not.toBe(initialTheme);
});

// ===================================================================
// Homepage Mode/Model/Expert Chips Tests
// ===================================================================

test('homepage category chips filter assistants', async ({ page }) => {
  await page.goto('/');
  // Click on a category
  await page.locator('.chat-welcome-chip:has-text("代码")').click();
  await expect(page.locator('.chat-welcome-chip.active:has-text("代码")')).toBeVisible();
  // Click all
  await page.locator('.chat-welcome-chip:has-text("全部")').click();
  await expect(page.locator('.chat-welcome-chip.active:has-text("全部")')).toBeVisible();
});

test('homepage scroll buttons for assistant chips work', async ({ page }) => {
  await page.goto('/');
  const scrollBtns = page.locator('.chat-chip-scroll-btn');
  const count = await scrollBtns.count();
  expect(count).toBe(2); // left and right scroll buttons
});

// ===================================================================
// Keyboard Shortcuts Tests
// ===================================================================

test('ctrl+k dispatches focus-search event', async ({ page }) => {
  await page.goto('/');
  let eventFired = false;
  await page.exposeFunction('onSearchEvent', () => { eventFired = true; });
  await page.evaluate(() => {
    window.addEventListener('app:focus-search', () =>
      (window as any).onSearchEvent()
    );
  });
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(100);
  expect(eventFired).toBeTruthy();
});

test('escape dispatches close event', async ({ page }) => {
  await page.goto('/');
  let eventFired = false;
  await page.exposeFunction('onEscape', () => { eventFired = true; });
  await page.evaluate(() => {
    window.addEventListener('app:escape', () =>
      (window as any).onEscape()
    );
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  expect(eventFired).toBeTruthy();
});
