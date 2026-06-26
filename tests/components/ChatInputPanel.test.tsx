import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatInputPanel from '../../src/components/chat/ChatInputPanel';
import { useUIStore } from '../../src/stores/ui-store';

vi.mock('../../src/hooks/use-api', () => ({
  useAssistants: () => ({ data: [] }),
  useProviders: () => ({ data: [] }),
  useSkills: () => ({ data: [] }),
  useMcpServers: () => ({ data: [] }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../src/hooks/use-dropdown', () => ({
  useDropdown: () => ({
    isOpen: () => false,
    toggle: vi.fn(),
    close: vi.fn(),
  }),
}));

describe('ChatInputPanel', () => {
  const mockSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({
      theme: 'light', sidebarOpen: true, currentPage: 'chat',
      openTabs: [], activeTabIndex: -1, isGenerating: false, toasts: [],
      selectedModel: null, selectedExpert: null, selectedMode: 'action',
      connectionStatus: 'connected', language: 'zh', compactMode: false,
      sendShortcut: 'enter', selectedTools: [], autoUpdateSkills: true, lockScreenRemote: false,
    });
  });

  it('renders textarea and send button', () => {
    render(<ChatInputPanel onSend={mockSend} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByLabelText('home.send')).toBeInTheDocument();
  });

  it('updates textarea on user input', () => {
    render(<ChatInputPanel onSend={mockSend} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(textarea).toHaveValue('Hello');
  });

  it('calls onSend with text when send button clicked', () => {
    render(<ChatInputPanel onSend={mockSend} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByLabelText('home.send'));
    expect(mockSend).toHaveBeenCalledWith('Test message');
  });

  it('calls onSend on Enter key (Enter shortcut)', () => {
    render(<ChatInputPanel onSend={mockSend} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Enter send' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(mockSend).toHaveBeenCalledWith('Enter send');
  });

  it('shows mode options in dropdown', () => {
    const { container } = render(<ChatInputPanel onSend={mockSend} />);
    // Should show current mode label
    expect(container.textContent).toContain('行动');
  });
});
