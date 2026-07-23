import DiscoveryTrendChart from './DiscoveryTrendChart';
import { METHODS } from '../lib/discoveryMethods';

function DiscoveryTrendLens({ planets }) {
  return (
    <>
      <ul className="app__legend" aria-label="Discovery method colors">
        {METHODS.map((m) => (
          <li key={m.key}>
            <span
              className="app__legend-swatch"
              style={{ background: m.color }}
            />
            {m.label}
          </li>
        ))}
      </ul>
      <section>
        <h2 className="app__section-title">Discovery trend</h2>
        <DiscoveryTrendChart planets={planets} />
      </section>
    </>
  );
}

export default DiscoveryTrendLens;
