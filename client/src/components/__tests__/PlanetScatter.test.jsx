import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlanetScatter from '../PlanetScatter';

const planets = [
  {
    name: 'r1',
    distance_ly: 10,
    radius_earth: 1.2,
    mass_earth: null,
    size_class: 'rocky',
  },
  {
    name: 'r2',
    distance_ly: 20,
    radius_earth: null,
    mass_earth: 5,
    size_class: 'super_earth',
  },
];

describe('PlanetScatter', () => {
  it('reports how many planets are not shown on the current axis', () => {
    const { getByText } = render(
      <PlanetScatter
        planets={planets}
        yMeasure="radius_earth"
        onYMeasureChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    // r2 has no radius -> 1 not shown
    expect(getByText(/1 planet.*not shown/i)).toBeInTheDocument();
  });

  it('recomputes the not-shown count for the mass axis', () => {
    const { queryByText } = render(
      <PlanetScatter
        planets={planets}
        yMeasure="mass_earth"
        onYMeasureChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    // r1 has no mass -> 1 not shown on the mass axis
    expect(queryByText(/1 planet.*not shown/i)).toBeInTheDocument();
  });
});
