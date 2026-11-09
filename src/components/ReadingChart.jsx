const chartWidth = 760;
const chartHeight = 300;
const chartPadding = { top: 20, right: 18, bottom: 42, left: 44 };

function formatMonthDay(value, locale) {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
    new Date(value)
  );
}

export function ReadingChart({ readings, language = "en" }) {
  const locale = language === "sw" ? "sw-KE" : "en-KE";
  const points = readings.map((reading, index) => {
    const x =
      readings.length < 2
        ? (chartWidth - chartPadding.left - chartPadding.right) / 2 + chartPadding.left
        : chartPadding.left +
          (index / (readings.length - 1)) * (chartWidth - chartPadding.left - chartPadding.right);
    const y =
      chartPadding.top +
      ((100 - reading.cover_pct) / 100) *
        (chartHeight - chartPadding.top - chartPadding.bottom);
    return { reading, x, y };
  });
  const path = points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        aria-label={language === "sw" ? "Chati ya kifuniko cha gugu maji kwa muda" : "Hyacinth cover over time"}
        className="h-auto min-w-[560px] w-full"
        role="img"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      >
        {[0, 25, 50, 75, 100].map((value) => {
          const y =
            chartPadding.top +
            ((100 - value) / 100) *
              (chartHeight - chartPadding.top - chartPadding.bottom);
          return (
            <g key={value}>
              <line
                stroke="#334155"
                strokeDasharray={value === 0 ? undefined : "4 5"}
                x1={chartPadding.left}
                x2={chartWidth - chartPadding.right}
                y1={y}
                y2={y}
              />
              <text fill="#94a3b8" fontSize="11" textAnchor="end" x={chartPadding.left - 8} y={y + 4}>
                {value}%
              </text>
            </g>
          );
        })}
        {path && <path d={path} fill="none" stroke="#22d3ee" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />}
        {points.map(({ reading, x, y }) => (
          <g key={`${reading.beach}:${reading.recorded_at}`}>
            <circle cx={x} cy={y} fill="#0f172a" r="5" stroke="#67e8f9" strokeWidth="3">
              <title>{`${formatMonthDay(reading.recorded_at, locale)} · ${reading.cover_pct}% · ${reading.source}`}</title>
            </circle>
            <text fill="#94a3b8" fontSize="10" textAnchor="middle" x={x} y={chartHeight - 14}>
              {formatMonthDay(reading.recorded_at, locale)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
