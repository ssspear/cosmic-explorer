import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SizeFamiliesLens from '../SizeFamiliesLens';

describe('SizeFamiliesLens', () => {
  it('renders the size legend and both section titles', () => {
    const { getByText } = render(
      <SizeFamiliesLens
        planets={[]}
        yMeasure="radius_earth"
        onYMeasureChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    expect(getByText('Rocky')).toBeInTheDocument();
    expect(getByText('Size families')).toBeInTheDocument();
    expect(getByText('Distance vs. size')).toBeInTheDocument();
  });
});
