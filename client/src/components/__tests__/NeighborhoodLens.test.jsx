import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NeighborhoodLens from '../NeighborhoodLens';

// The R3F scene needs WebGL (absent in jsdom); mock it to a marker.
vi.mock('../NeighborhoodMap', () => ({
  default: (props) => (
    <div data-testid="map" data-rings={String(props.showRings)} />
  ),
}));

const planet = (over = {}) => ({
  name: 'A',
  ra: 10,
  dec: 20,
  distance_ly: 12,
  star_temp_k: 5800,
  radius_earth: 1,
  size_class: 'rocky',
  ...over,
});

describe('NeighborhoodLens', () => {
  it('shows the empty message when nothing is placeable', () => {
    const { getByText, queryByTestId } = render(
      <NeighborhoodLens planets={[]} onSelect={vi.fn()} selectedName={null} />
    );
    expect(getByText('No planets match your filters.')).toBeInTheDocument();
    expect(queryByTestId('map')).not.toBeInTheDocument();
  });

  it('renders the map, legend, and an omitted-count note', () => {
    const { getByTestId, getByText } = render(
      <NeighborhoodLens
        planets={[planet(), planet({ name: 'B', ra: null })]}
        onSelect={vi.fn()}
        selectedName={null}
      />
    );
    expect(getByTestId('map')).toBeInTheDocument();
    expect(getByText('Neighborhood')).toBeInTheDocument();
    expect(getByText(/1 not shown/)).toBeInTheDocument(); // B has no coords
  });

  it('toggles the distance rings', () => {
    const { getByRole, getByTestId } = render(
      <NeighborhoodLens
        planets={[planet()]}
        onSelect={vi.fn()}
        selectedName={null}
      />
    );
    expect(getByTestId('map').dataset.rings).toBe('true');
    fireEvent.click(getByRole('button', { name: /rings/i }));
    expect(getByTestId('map').dataset.rings).toBe('false');
  });
});
