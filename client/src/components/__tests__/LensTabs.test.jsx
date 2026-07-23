import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LensTabs from '../LensTabs';

const lenses = [
  { key: 'size', label: 'Size families' },
  { key: 'trend', label: 'Discovery trend' },
];

describe('LensTabs', () => {
  it('marks the active tab and fires onChange on click', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <LensTabs lenses={lenses} active="size" onChange={onChange} />
    );
    const trend = getByRole('tab', { name: 'Discovery trend' });
    expect(getByRole('tab', { name: 'Size families' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(trend).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(trend);
    expect(onChange).toHaveBeenCalledWith('trend');
  });

  it('moves selection with the right arrow key', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <LensTabs lenses={lenses} active="size" onChange={onChange} />
    );
    fireEvent.keyDown(getByRole('tab', { name: 'Size families' }), {
      key: 'ArrowRight',
    });
    expect(onChange).toHaveBeenCalledWith('trend');
  });

  it('moves selection to the previous tab with the left arrow key, wrapping from first to last', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <LensTabs lenses={lenses} active="size" onChange={onChange} />
    );
    fireEvent.keyDown(getByRole('tab', { name: 'Size families' }), {
      key: 'ArrowLeft',
    });
    expect(onChange).toHaveBeenCalledWith('trend');
  });

  it('moves DOM focus to the newly-active tab on arrow-key nav', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <LensTabs lenses={lenses} active="size" onChange={onChange} />
    );
    fireEvent.keyDown(getByRole('tab', { name: 'Size families' }), {
      key: 'ArrowRight',
    });
    expect(getByRole('tab', { name: 'Discovery trend' })).toHaveFocus();
  });
});
