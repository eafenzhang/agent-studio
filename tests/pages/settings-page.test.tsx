import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from '../../src/pages/SettingsPage';
import { useUIStore } from '../../src/stores/ui-store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

const {
  mockNavigate,
  mockGetProvider,
  mockUpdateProvider,
  mockFetchProviderModels,
  mockTryConnect,
  mockUpdateSettings,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetProvider: vi.fn(),
  mockUpdateProvider: vi.fn(),
  mockFetchProviderModels: vi.fn(),
  mockTryConnect: vi.fn(),
  mockUpdateSettings: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh', changeLanguage: vi.fn() } }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../src/hooks/use-api', () => ({
  useProviders: () => ({
    data: [
      { id: 'p1', name: 'OpenAI', base_url: 'https://api.openai.com', models: ['gpt-4o'] },
    ],
    isLoading: false,
  }),
  useCreateProvider: () => ({ mutateAsync: vi.fn() }),
  useDeleteProvider: () => ({ mutateAsync: vi.fn() }),
  useMemory: () => ({ data: [{ id: 'm1', key: '偏好', value: '中文' }], isLoading: false }),
  useDeleteMemory: () => ({ mutateAsync: vi.fn() }),
  useSettings: () => ({ data: { theme: 'light' } }),
  useUpdateSettings: () => ({ mutateAsync: mockUpdateSettings }),
}));

vi.mock('../../src/lib/api', () => ({
  getProvider: mockGetProvider,
  updateProvider: mockUpdateProvider,
  fetchProviderModels: mockFetchProviderModels,
  tryConnect: mockTryConnect,
  getSystemInfo: vi.fn().mockResolvedValue({ version: '1.0.8' }),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    useUIStore.setState({
      theme: 'light',
      sidebarOpen: true,
      currentPage: 'home',
      openTabs: [],
      activeTabIndex: -1,
      isGenerating: false,
      toasts: [],
      selectedModel: null,
      selectedExpert: null,
      selectedMode: '行动',
      connectionStatus: 'connected',
      language: 'zh',
      compactMode: false,
      sendShortcut: 'enter',
      autoUpdateSkills: true,
      lockScreenRemote: false,
      selectedTools: [],
    });
  });

  it('renders the settings tabs', () => {
    render(<SettingsPage />, { wrapper });
    expect(screen.getByText('系统设置')).toBeInTheDocument();
    expect(screen.getByText('系统')).toBeInTheDocument();
    expect(screen.getByText('模型')).toBeInTheDocument();
  });

  it('navigates home when close button is clicked', () => {
    render(<SettingsPage />, { wrapper });
    const closeButton = screen.getAllByRole('button').find((b) => b.classList.contains('settings-close-btn'));
    if (closeButton) fireEvent.click(closeButton);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('renders the provider list and opens the add provider dialog', () => {
    render(<SettingsPage />, { wrapper });
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    fireEvent.click(screen.getByText('settings.addModel'));
    expect(screen.getByText('添加模型提供商')).toBeInTheDocument();
  });

  it('saves general settings via updateSettings', async () => {
    render(<SettingsPage />, { wrapper });
    fireEvent.click(screen.getByText('settings.save'));
    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });

  it('shows memory entries with delete button', () => {
    render(<SettingsPage />, { wrapper });
    fireEvent.click(screen.getByText('记忆'));
    expect(screen.getByText('中文')).toBeInTheDocument();
    expect(screen.getAllByText('删除').length).toBeGreaterThanOrEqual(1);
  });
});
