import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TypeDistributionChart, { countByClass } from '../TypeDistributionChart';

const planets = [
  { name: 'a', size_class: 'rocky' },
  { name: 'b', size_class: 'rocky' },
  { name: 'c', size_class: 'gas_giant' },
];

describe('countByClass', () => {
  it('counts per family and drops empty families', () => {
    const rows = countByClass(planets);
    expect(rows.map((r) => [r.key, r.count])).toEqual([
      ['rocky', 2],
      ['gas_giant', 1],
    ]);
  });

  it('returns an empty array for no planets', () => {
    expect(countByClass([])).toEqual([]);
  });
});

describe('TypeDistributionChart', () => {
  // Recharts renders SVG that jsdom sizes to 0px, so assert on the reliable
  // empty/non-empty branch rather than on rendered SVG bars.
  it('does not show the empty message when planets are present', () => {
    const { queryByText } = render(<TypeDistributionChart planets={planets} />);
    expect(queryByText(/no planets/i)).toBeNull();
  });

  it('shows the empty message for an empty set', () => {
    const { getByText } = render(<TypeDistributionChart planets={[]} />);
    expect(getByText(/no planets/i)).toBeInTheDocument();
  });
});
