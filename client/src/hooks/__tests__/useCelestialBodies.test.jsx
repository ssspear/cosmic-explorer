import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCelestialBodies } from '../useCelestialBodies';

afterEach(() => vi.restoreAllMocks());

describe('useCelestialBodies', () => {
  it('reaches ready with data on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ name: 'A', type: 'exoplanet' }] }),
    });
    const { result } = renderHook(() => useCelestialBodies('/api'));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.bodies).toHaveLength(1);
  });

  it('reaches error on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useCelestialBodies('/api'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.bodies).toEqual([]);
  });
});
