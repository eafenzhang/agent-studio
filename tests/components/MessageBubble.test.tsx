import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageBubble from '../../src/components/chat/MessageBubble';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('MessageBubble', () => {
  const baseProps = {
    id: 'msg-1',
    content: 'Hello world',
    isUser: false,
    onCopy: vi.fn(),
    onDelete: vi.fn(),
    onRegenerate: vi.fn(),
    onEdit: vi.fn(),
    timestamp: '2026-06-26T12:00:00Z',
  };

  it('renders user messages on the right', () => {
    const { container } = render(<MessageBubble {...baseProps} isUser content="User text" />);
    expect(container.querySelector('.msg-bubble.user')).toBeTruthy();
    expect(screen.getByText('User text')).toBeInTheDocument();
  });

  it('renders assistant messages on the left', () => {
    const { container } = render(<MessageBubble {...baseProps} content="AI text" />);
    expect(container.querySelector('.msg-bubble.assistant')).toBeTruthy();
    expect(screen.getByText('AI text')).toBeInTheDocument();
  });

  it('shows copy button on hover', async () => {
    render(<MessageBubble {...baseProps} />);
    const bubble = screen.getByText('Hello world').closest('.msg-bubble') || screen.getByText('Hello world');
    fireEvent.mouseEnter(bubble);
    expect(screen.getByTitle('chat.copy')).toBeInTheDocument();
  });

  it('renders streaming indicator', () => {
    const { container } = render(<MessageBubble {...baseProps} isStreaming content="Streaming..." />);
    expect(container.querySelector('.streaming-cursor')).toBeTruthy();
  });

  it('renders markdown in assistant messages', () => {
    render(<MessageBubble {...baseProps} content="**bold** and `code`" />);
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('code')).toBeInTheDocument();
  });
});
