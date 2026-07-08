import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CelestialCard from '../CelestialCard';

const exoplanet = {
  name: 'Proxima Cen b',
  type: 'exoplanet',
  host_star: 'Proxima Cen',
  distance_ly: 4.24,
  discovery_year: 2016,
  discovery_method: 'Radial Velocity',
  orbital_period_days: 11.19,
  mass_earth: 1.05,
  radius_earth: null,
  equilibrium_temp_k: 218,
  constellation: null,
  description: 'Rocky world orbiting the nearest star.',
  fun_fact: 'The closest known exoplanet to Earth.',
};

const star = {
  name: 'Betelgeuse',
  type: 'star',
  host_star: null,
  distance_ly: 700,
  discovery_year: null,
  discovery_method: null,
  orbital_period_days: null,
  mass_earth: null,
  radius_earth: null,
  equilibrium_temp_k: null,
  constellation: 'Orion',
  description: 'A red supergiant nearing the end of its life.',
  fun_fact: 'Could explode as a supernova anytime.',
};

function renderCard(body) {
  const { container } = render(<CelestialCard body={body} />);
  return within(container.querySelector('.celestial-card'));
}

describe('CelestialCard', () => {
  it('renders the name as a heading', () => {
    const card = renderCard(exoplanet);
    expect(
      card.getByRole('heading', { name: /proxima cen b/i })
    ).toBeInTheDocument();
  });

  it('renders the type badge for an exoplanet', () => {
    const card = renderCard(exoplanet);
    expect(
      card.getByText('Exoplanet', { selector: 'span' })
    ).toBeInTheDocument();
  });

  it('renders the type badge for a star', () => {
    const card = renderCard(star);
    expect(card.getByText('Star', { selector: 'span' })).toBeInTheDocument();
  });

  it('renders the description', () => {
    const card = renderCard(exoplanet);
    expect(
      card.getByText(/rocky world/i, { selector: 'p' })
    ).toBeInTheDocument();
  });

  it('renders host star and distance', () => {
    const card = renderCard(exoplanet);
    expect(card.getByText(/proxima cen$/i)).toBeInTheDocument();
    expect(card.getByText(/4.24 light-years/i)).toBeInTheDocument();
  });

  it('renders NASA physical fields when present', () => {
    const card = renderCard(exoplanet);
    expect(card.getByText(/radial velocity/i)).toBeInTheDocument();
    expect(card.getByText(/11.19 days/i)).toBeInTheDocument();
    expect(card.getByText(/1.05× earth/i)).toBeInTheDocument();
    expect(card.getByText(/218 K/i)).toBeInTheDocument();
  });

  it('renders constellation for a star', () => {
    const card = renderCard(star);
    expect(card.getByText(/orion/i)).toBeInTheDocument();
  });

  it('omits constellation when null', () => {
    const card = renderCard(exoplanet);
    expect(card.queryByText('Constellation')).not.toBeInTheDocument();
  });

  it('renders the discovery year when present', () => {
    const card = renderCard(exoplanet);
    expect(card.getByText('2016')).toBeInTheDocument();
  });

  it('omits the discovery year when null', () => {
    const card = renderCard(star);
    expect(card.queryByText('Discovered')).not.toBeInTheDocument();
  });

  it('renders the fun fact', () => {
    const card = renderCard(exoplanet);
    expect(card.getByText(/closest known exoplanet/i)).toBeInTheDocument();
  });
});
