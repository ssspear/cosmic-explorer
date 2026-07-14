import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResultsList from '../ResultsList';

const bodies = [
  { name: 'Proxima Cen b', type: 'exoplanet', size_class: 'super_earth' },
  { name: 'Sirius', type: 'star', size_class: null },
];

describe('ResultsList', () => {
  it('calls onSelect with the clicked body', () => {
    const onSelect = vi.fn();
    const { getByRole } = render(
      <ResultsList bodies={bodies} selectedName={null} onSelect={onSelect} />
    );
    fireEvent.click(getByRole('button', { name: /proxima cen b/i }));
    expect(onSelect).toHaveBeenCalledWith(bodies[0]);
  });

  it('marks the selected row with aria-current', () => {
    const { getByRole } = render(
      <ResultsList bodies={bodies} selectedName="Sirius" onSelect={vi.fn()} />
    );
    expect(getByRole('button', { name: /sirius/i })).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  it('renders an empty-state message when there are no bodies', () => {
    const { getByText } = render(
      <ResultsList bodies={[]} selectedName={null} onSelect={vi.fn()} />
    );
    expect(getByText(/no bodies match/i)).toBeInTheDocument();
  });

  it('shows a size chip for exoplanets but not for stars', () => {
    const { getByText, queryByText } = render(
      <ResultsList bodies={bodies} selectedName={null} onSelect={vi.fn()} />
    );
    expect(getByText('Super-Earth')).toBeInTheDocument();
    expect(queryByText('Unknown')).toBeNull();
  });
});
