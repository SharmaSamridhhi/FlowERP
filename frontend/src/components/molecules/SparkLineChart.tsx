export interface SparkLineChartProps {
  points: { date: string; value: number }[];
  height?: number;
}

// Minimal hand-rolled SVG line chart — no charting library dependency for
// a single 30-point revenue trend line.
export function SparkLineChart({ points, height = 200 }: SparkLineChartProps) {
  const width = 600;
  const padding = 8;
  const max = Math.max(1, ...points.map((p) => p.value));

  const coords = points.map((p, i) => {
    const x = padding + (i / Math.max(1, points.length - 1)) * (width - padding * 2);
    const y = height - padding - (p.value / max) * (height - padding * 2);
    return { x, y };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1]?.x ?? 0},${height} L${coords[0]?.x ?? 0},${height} Z`;

  const labelIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full" preserveAspectRatio="none">
      <path d={areaPath} fill="var(--color-brand-100, #faead0)" opacity={0.6} />
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-brand-500, #d1892a)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {labelIndexes.map((i) => {
        const point = points[i];
        const coord = coords[i];
        if (!point || !coord) {
          return null;
        }
        return (
          <text
            key={i}
            x={coord.x}
            y={height + 16}
            fontSize={10}
            fill="#94a3b8"
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
          >
            {new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </text>
        );
      })}
    </svg>
  );
}
