import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FilterBar from '../FilterBar';

const base = { type: 'all', method: 'all', maxDistance: 1000 };

describe('FilterBar', () => {
  it('emits the new type on change', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <FilterBar filters={base} methods={['Transit']} onChange={onChange} />
    );
    fireEvent.change(getByLabelText(/type/i), { target: { value: 'exoplanet' } });
    expect(onChange).toHaveBeenCalledWith({ ...base, type: 'exoplanet' });
  });

  it('lists provided discovery methods', () => {
    const { getByRole } = render(
      <FilterBar filters={base} methods={['Transit']} onChange={vi.fn()} />
    );
    expect(getByRole('option', { name: 'Transit' })).toBeInTheDocument();
  });
});
