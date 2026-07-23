import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { METHODS, discoveriesByYear } from '../lib/discoveryMethods';

function DiscoveryTrendChart({ planets }) {
  const data = discoveriesByYear(planets);

  if (data.length === 0) {
    return <p className="chart-empty">No planets match your filters.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data}>
        <XAxis dataKey="year" tick={{ fontSize: 11 }} minTickGap={12} />
        <YAxis allowDecimals={false} />
        <Tooltip cursor={{ fillOpacity: 0.1 }} />
        {METHODS.map((m) => (
          <Bar
            key={m.key}
            dataKey={m.key}
            stackId="discoveries"
            name={m.label}
            fill={m.color}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default DiscoveryTrendChart;
