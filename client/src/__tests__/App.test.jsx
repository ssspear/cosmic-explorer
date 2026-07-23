import { render, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const bodies = [
  {
    name: 'Rocky b',
    type: 'exoplanet',
    size_class: 'rocky',
    distance_ly: 10,
    radius_earth: 1.1,
    mass_earth: 1.2,
    discovery_method: 'Transit',
    description: 'd',
    fun_fact: 'f',
  },
  {
    name: 'Giant b',
    type: 'exoplanet',
    size_class: 'gas_giant',
    distance_ly: 40,
    radius_earth: 12,
    mass_earth: 300,
    discovery_method: 'Radial Velocity',
    description: 'd',
    fun_fact: 'f',
  },
  {
    name: 'Sirius',
    type: 'star',
    size_class: null,
    distance_ly: 8.6,
    radius_earth: null,
    mass_earth: null,
    discovery_method: null,
    description: 'd',
    fun_fact: 'f',
  },
];

afterEach(() => vi.restoreAllMocks());

function mockFetchOk() {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ data: bodies, source: 'snapshot' }),
  });
}

describe('App', () => {
  it('renders the results list after loading', async () => {
    mockFetchOk();
    const { getByRole } = render(<App />);
    await waitFor(() =>
      expect(getByRole('button', { name: /rocky b/i })).toBeInTheDocument()
    );
  });

  it('opens the detail drawer when a body is selected', async () => {
    mockFetchOk();
    const { getByRole, findByRole } = render(<App />);
    const row = await findByRole('button', { name: /giant b/i });
    fireEvent.click(row);
    expect(getByRole('heading', { name: /giant b/i })).toBeInTheDocument();
  });

  it('shows an error state when the fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));
    const { getByText } = render(<App />);
    await waitFor(() =>
      expect(getByText(/could not load/i)).toBeInTheDocument()
    );
  });

  it('closes the detail drawer when a filter change excludes the selected body', async () => {
    mockFetchOk();
    const { getByRole, getByLabelText, findByRole, queryByRole } = render(
      <App />
    );
    const row = await findByRole('button', { name: /giant b/i });
    fireEvent.click(row);
    expect(getByRole('heading', { name: /giant b/i })).toBeInTheDocument();

    fireEvent.change(getByLabelText(/type/i), { target: { value: 'star' } });

    expect(
      queryByRole('heading', { name: /giant b/i })
    ).not.toBeInTheDocument();
  });

  it('switches from the size lens to the discovery-trend lens', async () => {
    mockFetchOk();
    const { getByRole, findByRole, queryByRole } = render(<App />);
    // default lens is Size families
    expect(await findByRole('tab', { name: /size families/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    fireEvent.click(getByRole('tab', { name: /discovery trend/i }));
    expect(getByRole('tab', { name: /discovery trend/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    // size-families section title (heading) is gone; trend heading present.
    // Scoped to role: 'heading' rather than a plain text query, since the
    // still-rendered (now inactive) "Size families" tab button shares the
    // same text as the section title and would otherwise falsely match.
    expect(
      queryByRole('heading', { name: 'Size families' })
    ).not.toBeInTheDocument();
    expect(
      getByRole('heading', { name: 'Discovery trend' })
    ).toBeInTheDocument();
  });
});
