import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SIZE_CLASSES } from '../lib/sizeClasses';

export function countByClass(planets) {
  return SIZE_CLASSES.map((c) => ({
    ...c,
    count: planets.filter((p) => p.size_class === c.key).length,
  })).filter((c) => c.count > 0);
}

function TypeDistributionChart({ planets }) {
  const counts = countByClass(planets);

  if (counts.length === 0) {
    return <p className="chart-empty">No planets match your filters.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={counts}>
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} />
        <Tooltip cursor={{ fillOpacity: 0.1 }} />
        <Bar dataKey="count" isAnimationActive={false}>
          {counts.map((c) => (
            <Cell key={c.key} fill={c.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default TypeDistributionChart;
