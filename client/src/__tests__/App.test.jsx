import { render, screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const payload = {
  data: [
    {
      name: 'Kepler-22b',
      type: 'exoplanet',
      distance_ly: 620,
      discovery_year: 2011,
      constellation: 'Cygnus',
      description: 'First confirmed exoplanet in a habitable zone.',
      fun_fact: 'Orbits in 290 days.',
    },
    {
      name: 'Sirius',
      type: 'star',
      distance_ly: 8.6,
      discovery_year: null,
      constellation: 'Canis Major',
      description: 'Brightest star in the night sky.',
      fun_fact: 'Ancient Egyptians used it for their calendar.',
    },
  ],
};

describe('App', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /cosmic explorer/i })
    ).toBeInTheDocument();
  });

  it('renders celestial body names from the API', async () => {
    const { container } = render(<App />);
    const list = container.querySelector('.app__list');
    expect(
      await within(list).findByRole('button', { name: /kepler-22b/i })
    ).toBeInTheDocument();
    expect(
      within(list).getByRole('button', { name: /sirius/i })
    ).toBeInTheDocument();
  });

  it('shows a CelestialCard when a body is clicked', async () => {
    const { container } = render(<App />);
    const list = container.querySelector('.app__list');
    fireEvent.click(
      await within(list).findByRole('button', { name: /kepler-22b/i })
    );

    const card = container.querySelector('.celestial-card');
    expect(card).not.toBeNull();
    expect(
      within(card).getByRole('heading', { name: /kepler-22b/i })
    ).toBeInTheDocument();
    expect(
      within(card).getByText(/first confirmed exoplanet/i, { selector: 'p' })
    ).toBeInTheDocument();
    expect(within(card).getByText(/cygnus/i)).toBeInTheDocument();
    expect(within(card).getByText(/620 light-years/i)).toBeInTheDocument();
    expect(within(card).getByText(/orbits in 290 days/i)).toBeInTheDocument();
  });

  it('renders filter buttons', () => {
    const { container } = render(<App />);
    const nav = container.querySelector('.app__filters');
    expect(
      within(nav).getByRole('button', { name: 'All' })
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole('button', { name: 'Exoplanets' })
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole('button', { name: 'Stars' })
    ).toBeInTheDocument();
  });

  it('fetches with filter when a type button is clicked', async () => {
    const { container } = render(<App />);
    const list = container.querySelector('.app__list');
    await within(list).findByRole('button', { name: /kepler-22b/i });

    const nav = container.querySelector('.app__filters');
    fireEvent.click(within(nav).getByRole('button', { name: 'Exoplanets' }));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('body_type=exoplanet')
    );
  });
});
