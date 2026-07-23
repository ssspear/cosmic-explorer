// client/src/components/__tests__/DiscoveryTrendLens.test.jsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DiscoveryTrendLens from '../DiscoveryTrendLens';

describe('DiscoveryTrendLens', () => {
  it('renders the title and a method legend', () => {
    const { getByText } = render(<DiscoveryTrendLens planets={[]} />);
    expect(getByText('Discovery trend')).toBeInTheDocument();
    expect(getByText('Radial velocity')).toBeInTheDocument();
    expect(getByText('Transit')).toBeInTheDocument();
    expect(getByText('Imaging')).toBeInTheDocument();
    expect(getByText('Other')).toBeInTheDocument();
  });
});
