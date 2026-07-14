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
  it('reports the omitted count and measure word on the radius axis', () => {
    const { getByText } = render(
      <PlanetScatter
        planets={planets}
        yMeasure="radius_earth"
        onYMeasureChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    // r2 has no radius -> 1 omitted, radius wording
    expect(getByText(/1 planet\b.*not shown/i)).toBeInTheDocument();
    expect(getByText(/no radius measured/i)).toBeInTheDocument();
  });

  it('recomputes the omitted count and measure word on the mass axis', () => {
    const { getByText } = render(
      <PlanetScatter
        planets={planets}
        yMeasure="mass_earth"
        onYMeasureChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    // r1 has no mass -> 1 omitted, mass wording
    expect(getByText(/1 planet\b.*not shown/i)).toBeInTheDocument();
    expect(getByText(/no mass measured/i)).toBeInTheDocument();
  });

  it('shows the empty-state message when there are no planets at all', () => {
    const { getByText, queryByText } = render(
      <PlanetScatter
        planets={[]}
        yMeasure="radius_earth"
        onYMeasureChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    expect(getByText(/no planets match your filters/i)).toBeInTheDocument();
    expect(queryByText(/not shown/i)).toBeNull();
  });

  it('still renders the chart (not the empty state) when planets exist but none are plottable', () => {
    const noRadius = [
      {
        name: 'a',
        distance_ly: 5,
        radius_earth: null,
        mass_earth: 2,
        size_class: 'rocky',
      },
    ];
    const { queryByText, getByText } = render(
      <PlanetScatter
        planets={noRadius}
        yMeasure="radius_earth"
        onYMeasureChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    expect(queryByText(/no planets match your filters/i)).toBeNull();
    expect(getByText(/1 planet\b.*not shown/i)).toBeInTheDocument();
  });

  it('pluralizes when multiple planets are omitted', () => {
    const many = [
      {
        name: 'a',
        distance_ly: 5,
        radius_earth: 1.0,
        mass_earth: 2,
        size_class: 'rocky',
      },
      {
        name: 'b',
        distance_ly: 6,
        radius_earth: null,
        mass_earth: 3,
        size_class: 'super_earth',
      },
      {
        name: 'c',
        distance_ly: 7,
        radius_earth: null,
        mass_earth: 4,
        size_class: 'super_earth',
      },
    ];
    const { getByText } = render(
      <PlanetScatter
        planets={many}
        yMeasure="radius_earth"
        onYMeasureChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    // b and c have no radius -> 2 omitted, plural
    expect(getByText(/2 planets not shown/i)).toBeInTheDocument();
  });
});
