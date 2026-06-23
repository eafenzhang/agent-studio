import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useDropdown } from '../../src/hooks/use-dropdown';

function TestDropdown() {
  const dropdown = useDropdown();
  return (
    <div>
      <div ref={dropdown.ref} data-testid="dropdown-container">
        <button data-testid="toggle" onClick={() => dropdown.toggle('menu')}>
          Toggle
        </button>
        <button data-testid="close" onClick={() => dropdown.close()}>
          Close
        </button>
        <div
          data-testid="menu"
          className={dropdown.isOpen('menu') ? 'open' : ''}
        >
          Menu content
        </div>
      </div>
      <div data-testid="outside">Outside content</div>
    </div>
  );
}

function MultiDropdownTest() {
  const dropdown = useDropdown();
  return (
    <div>
      <div ref={dropdown.ref} data-testid="dropdown-container">
        <button data-testid="toggle-a" onClick={() => dropdown.toggle('menu-a')}>
          Toggle A
        </button>
        <div data-testid="menu-a" className={dropdown.isOpen('menu-a') ? 'open' : ''}>
          Menu A
        </div>
        <button data-testid="toggle-b" onClick={() => dropdown.toggle('menu-b')}>
          Toggle B
        </button>
        <div data-testid="menu-b" className={dropdown.isOpen('menu-b') ? 'open' : ''}>
          Menu B
        </div>
      </div>
      <div data-testid="outside">Outside content</div>
    </div>
  );
}

describe('useDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles a dropdown open and closed', () => {
    render(<TestDropdown />);
    const toggle = screen.getByTestId('toggle');
    const menu = screen.getByTestId('menu');

    expect(menu).not.toHaveClass('open');

    fireEvent.click(toggle);
    expect(menu).toHaveClass('open');

    fireEvent.click(toggle);
    expect(menu).not.toHaveClass('open');
  });

  it('closes any open dropdown via close()', () => {
    render(<TestDropdown />);
    const toggle = screen.getByTestId('toggle');
    const close = screen.getByTestId('close');
    const menu = screen.getByTestId('menu');

    fireEvent.click(toggle);
    expect(menu).toHaveClass('open');

    fireEvent.click(close);
    expect(menu).not.toHaveClass('open');
  });

  it('closes on click outside the container', () => {
    render(<TestDropdown />);
    const toggle = screen.getByTestId('toggle');
    const menu = screen.getByTestId('menu');
    const outside = screen.getByTestId('outside');

    fireEvent.click(toggle);
    expect(menu).toHaveClass('open');

    fireEvent.click(outside);
    expect(menu).not.toHaveClass('open');
  });

  it('does not close on click inside the container', () => {
    render(<TestDropdown />);
    const toggle = screen.getByTestId('toggle');
    const menu = screen.getByTestId('menu');

    fireEvent.click(toggle);
    expect(menu).toHaveClass('open');

    fireEvent.click(menu);
    expect(menu).toHaveClass('open');
  });

  it('closes on Escape key', () => {
    render(<TestDropdown />);
    const toggle = screen.getByTestId('toggle');
    const menu = screen.getByTestId('menu');

    fireEvent.click(toggle);
    expect(menu).toHaveClass('open');

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(menu).not.toHaveClass('open');
  });

  it('keeps only one dropdown open at a time', () => {
    render(<MultiDropdownTest />);
    const toggleA = screen.getByTestId('toggle-a');
    const toggleB = screen.getByTestId('toggle-b');
    const menuA = screen.getByTestId('menu-a');
    const menuB = screen.getByTestId('menu-b');

    fireEvent.click(toggleA);
    expect(menuA).toHaveClass('open');
    expect(menuB).not.toHaveClass('open');

    fireEvent.click(toggleB);
    expect(menuA).not.toHaveClass('open');
    expect(menuB).toHaveClass('open');

    fireEvent.click(toggleB);
    expect(menuA).not.toHaveClass('open');
    expect(menuB).not.toHaveClass('open');
  });

  it('closes all open dropdowns on Escape key', () => {
    render(<MultiDropdownTest />);
    const toggleA = screen.getByTestId('toggle-a');
    const menuA = screen.getByTestId('menu-a');

    fireEvent.click(toggleA);
    expect(menuA).toHaveClass('open');

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(menuA).not.toHaveClass('open');
  });

  it('closes all open dropdowns on outside click', () => {
    render(<MultiDropdownTest />);
    const toggleA = screen.getByTestId('toggle-a');
    const outside = screen.getByTestId('outside');
    const menuA = screen.getByTestId('menu-a');

    fireEvent.click(toggleA);
    expect(menuA).toHaveClass('open');

    fireEvent.click(outside);
    expect(menuA).not.toHaveClass('open');
  });
});
