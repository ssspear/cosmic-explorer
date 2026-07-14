import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlanetDetailDrawer from '../PlanetDetailDrawer';

const body = {
  name: 'Proxima Cen b',
  type: 'exoplanet',
  size_class: 'super_earth',
  description: 'Close rocky world.',
  fun_fact: 'Nearest exoplanet.',
};

describe('PlanetDetailDrawer', () => {
  it('renders the facts card and a representative image', () => {
    const { getByRole, getByAltText } = render(
      <PlanetDetailDrawer body={body} onClose={vi.fn()} />
    );
    expect(
      getByRole('heading', { name: /proxima cen b/i })
    ).toBeInTheDocument();
    expect(getByAltText(/super-earth/i)).toBeInTheDocument();
  });

  it('calls onClose from the close button', () => {
    const onClose = vi.fn();
    const { getByRole } = render(
      <PlanetDetailDrawer body={body} onClose={onClose} />
    );
    fireEvent.click(getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows no image for a non-exoplanet body', () => {
    const star = { name: 'Sirius', type: 'star', size_class: null, description: 'd', fun_fact: 'f' };
    const { queryByRole } = render(<PlanetDetailDrawer body={star} onClose={vi.fn()} />);
    expect(queryByRole('img')).toBeNull();
  });
});
