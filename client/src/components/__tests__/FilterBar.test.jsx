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

  it('emits the merged filters when the method changes', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <FilterBar filters={base} methods={['Transit']} onChange={onChange} />
    );
    fireEvent.change(getByLabelText(/discovery method/i), { target: { value: 'Transit' } });
    expect(onChange).toHaveBeenCalledWith({ ...base, method: 'Transit' });
  });

  it('emits the merged filters with a numeric distance when the range changes', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <FilterBar filters={base} methods={['Transit']} onChange={onChange} />
    );
    fireEvent.change(getByLabelText(/max distance/i), { target: { value: '250' } });
    expect(onChange).toHaveBeenCalledWith({ ...base, maxDistance: 250 });
  });
});
