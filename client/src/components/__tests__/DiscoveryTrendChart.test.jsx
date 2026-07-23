import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DiscoveryTrendChart from '../DiscoveryTrendChart';

const planets = [
  { discovery_year: 2016, discovery_method: 'Transit' },
  { discovery_year: 2016, discovery_method: 'Radial Velocity' },
  { discovery_year: 2018, discovery_method: 'Imaging' },
];

describe('DiscoveryTrendChart', () => {
  // Recharts renders SVG jsdom sizes to 0px, so assert the empty/non-empty branch.
  it('does not show the empty message when there is data', () => {
    const { queryByText } = render(<DiscoveryTrendChart planets={planets} />);
    expect(queryByText(/no planets/i)).toBeNull();
  });
  it('shows the empty message for no data', () => {
    const { getByText } = render(<DiscoveryTrendChart planets={[]} />);
    expect(getByText(/no planets/i)).toBeInTheDocument();
  });
});
