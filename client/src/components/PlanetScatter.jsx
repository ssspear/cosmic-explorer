import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { sizeClassMeta } from '../lib/sizeClasses';

const Y_LABELS = {
  radius_earth: 'Radius (Earth radii)',
  mass_earth: 'Mass (Earth masses)',
};

export function scatterPointPlanet(point) {
  return point?.payload?.planet ?? point?.planet ?? null;
}

function PlanetScatter({ planets, yMeasure, onYMeasureChange, onSelect }) {
  const plottable = planets.filter(
    (p) => p.distance_ly != null && p[yMeasure] != null
  );

  // Only treat this as the "nothing to show" empty state when there are no
  // planets at all — if some planets exist but lack the selected Y measure,
  // keep rendering the chart (with its own omitted-count messaging) rather
  // than hiding it.
  if (planets.length === 0 && plottable.length === 0) {
    return <p className="chart-empty">No planets match your filters.</p>;
  }

  const omitted = planets.length - plottable.length;
  const data = plottable.map((p) => ({
    x: p.distance_ly,
    y: p[yMeasure],
    planet: p,
    fill: sizeClassMeta(p.size_class).color,
  }));

  return (
    <div className="planet-scatter">
      <div className="planet-scatter__controls">
        <label>
          Y axis:{' '}
          <select
            value={yMeasure}
            onChange={(e) => onYMeasureChange(e.target.value)}
          >
            <option value="radius_earth">Radius</option>
            <option value="mass_earth">Mass</option>
          </select>
        </label>
        {omitted > 0 && (
          <span className="planet-scatter__omitted">
            {omitted} planet{omitted === 1 ? '' : 's'} not shown — no{' '}
            {yMeasure === 'radius_earth' ? 'radius' : 'mass'} measured
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeOpacity={0.2} />
          <XAxis
            type="number"
            dataKey="x"
            name="Distance"
            scale="log"
            domain={['auto', 'auto']}
            tick={{ fontSize: 12 }}
            label={{ value: 'Distance (light-years)', position: 'bottom' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={Y_LABELS[yMeasure]}
            scale="log"
            domain={['auto', 'auto']}
            tick={{ fontSize: 12 }}
          />
          <ZAxis range={[60, 60]} />
          <Tooltip
            cursor={{ strokeOpacity: 0.3 }}
            formatter={(value, name) => [value, name]}
            labelFormatter={() => ''}
          />
          <Scatter
            data={data}
            isAnimationActive={false}
            onClick={(d) => {
              const planet = scatterPointPlanet(d);
              if (planet) onSelect(planet);
            }}
            shape={(props) => (
              <circle
                cx={props.cx}
                cy={props.cy}
                r={6}
                fill={props.payload.fill}
                fillOpacity={0.8}
                style={{ cursor: 'pointer' }}
              />
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PlanetScatter;
