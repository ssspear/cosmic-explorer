import TypeDistributionChart from './TypeDistributionChart';
import PlanetScatter from './PlanetScatter';
import { SIZE_CLASSES } from '../lib/sizeClasses';

function SizeFamiliesLens({ planets, yMeasure, onYMeasureChange, onSelect }) {
  return (
    <>
      <ul className="app__legend" aria-label="Size family colors">
        {SIZE_CLASSES.filter((c) => c.key !== 'unknown').map((c) => (
          <li key={c.key}>
            <span
              className="app__legend-swatch"
              style={{ background: c.color }}
            />
            {c.label}
          </li>
        ))}
      </ul>
      <section>
        <h2 className="app__section-title">Size families</h2>
        <TypeDistributionChart planets={planets} />
      </section>
      <section>
        <h2 className="app__section-title">Distance vs. size</h2>
        <PlanetScatter
          planets={planets}
          yMeasure={yMeasure}
          onYMeasureChange={onYMeasureChange}
          onSelect={onSelect}
        />
      </section>
    </>
  );
}

export default SizeFamiliesLens;
