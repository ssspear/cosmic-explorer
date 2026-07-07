import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CelestialCard from '../CelestialCard';

const exoplanet = {
  name: 'TRAPPIST-1e',
  type: 'exoplanet',
  distance_ly: 40,
  discovery_year: 2017,
  constellation: 'Aquarius',
  description: 'Rocky world in the habitable zone.',
  fun_fact: 'Seven Earth-sized planets in the system.',
};

const star = {
  name: 'Betelgeuse',
  type: 'star',
  distance_ly: 700,
  discovery_year: null,
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
      card.getByRole('heading', { name: /trappist-1e/i })
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

  it('renders constellation and distance', () => {
    const card = renderCard(exoplanet);
    expect(card.getByText(/aquarius/i)).toBeInTheDocument();
    expect(card.getByText(/40 light-years/i)).toBeInTheDocument();
  });

  it('renders the discovery year when present', () => {
    const card = renderCard(exoplanet);
    expect(card.getByText('2017')).toBeInTheDocument();
  });

  it('omits the discovery year when null', () => {
    const card = renderCard(star);
    expect(card.queryByText('Discovered')).not.toBeInTheDocument();
  });

  it('renders the fun fact', () => {
    const card = renderCard(exoplanet);
    expect(card.getByText(/seven earth-sized/i)).toBeInTheDocument();
  });
});
