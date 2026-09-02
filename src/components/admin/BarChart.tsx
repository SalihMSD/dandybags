import { formatInr } from "@/lib/format";

export function BarChart({
  data,
  dataIndex,
  labelKey,
  height = 160,
}: {
  data: Array<Record<string, unknown>>;
  dataIndex: string;
  labelKey: string;
  height?: number;
}) {
  if (!data.length) {
    return (
      <div className="py-8 text-center text-sm text-ink-soft">
        No data available for this period.
      </div>
    );
  }

  const values = data.map((d) => Number(d[dataIndex]) || 0);
  const labels = data.map((d) => String(d[labelKey]));
  const max = Math.max(...values, 1);

  const barWidth = 48;
  const gap = 8;
  const totalWidth = data.length * barWidth + (data.length - 1) * gap;
  const offset = (480 - totalWidth) / 2;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width="100%"
        height={height + 40}
        viewBox={`0 0 ${Math.max(480, totalWidth + offset * 2)} ${height + 40}`}
        preserveAspectRatio="xMidYMid meet"
        className="text-ink"
      >
        <line x1={offset} y1={height} x2={offset + totalWidth} y2={height} stroke="currentColor" strokeWidth="1" opacity="0.3" />
        {data.map((d, i) => {
          const val = Number(d[dataIndex]) || 0;
          const barHeight = max > 0 ? (val / max) * height : 0;
          const x = offset + i * (barWidth + gap);
          const y = height - barHeight;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill="var(--color-camel)"
                opacity={val > 0 ? 1 : 0.15}
              />
              <text
                x={x + barWidth / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize="10"
                opacity="0.8"
              >
                {dataIndex === "revenue" ? formatInr(val) : val}
              </text>
              <text
                x={x + barWidth / 2}
                y={height + 16}
                textAnchor="middle"
                fontSize="9"
                opacity="0.5"
              >
                {labels[i].slice(0, 12)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
