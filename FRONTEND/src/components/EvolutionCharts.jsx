const CHART_COLORS = [
  "#1565c0",
  "#2e7d32",
  "#c62828",
  "#ef6c00",
  "#6a1b9a",
  "#00838f",
  "#4e342e",
  "#ad1457",
];

const CHART_PAD = { top: 28, right: 20, bottom: 52, left: 52 };

function buildWeeklyLabels(students, kind = "attendance") {
  let longest = [];
  for (const student of students) {
    const timeline =
      kind === "attendance"
        ? student.attendance?.timeline || []
        : student.cpt?.weekly_timeline || [];
    if (timeline.length > longest.length) {
      longest = timeline;
    }
  }
  return longest.map((point) => point.week_label);
}

function buildStudentSeries(students, valueKey, timelinePath) {
  return students.map((node, index) => {
    const timeline =
      timelinePath === "attendance"
        ? node.attendance?.timeline || []
        : node.cpt?.weekly_timeline || [];

    return {
      id: node.enrollment_id,
      name: node.student.name,
      color: CHART_COLORS[index % CHART_COLORS.length],
      values: timeline.map((point) => point[valueKey] ?? 0),
    };
  });
}

function MultiLineChart({
  title,
  subtitle,
  series,
  xLabels,
  yMin,
  yMax,
  ySuffix = "",
  height = 280,
}) {
  if (!series.length || !xLabels.length) {
    return (
      <div style={chartCard}>
        <h4 style={chartTitle}>{title}</h4>
        <p style={chartEmpty}>Pas assez de donnees pour afficher le graphique.</p>
      </div>
    );
  }

  const width = 920;
  const plotW = width - CHART_PAD.left - CHART_PAD.right;
  const plotH = height - CHART_PAD.top - CHART_PAD.bottom;
  const allValues = series.flatMap((item) => item.values);
  const computedMin = Math.min(0, ...allValues);
  const computedMax = Math.max(...allValues, 1);
  const minY = yMin ?? computedMin;
  const maxY = yMax ?? computedMax;
  const yRange = maxY - minY || 1;

  const toX = (index) =>
    CHART_PAD.left +
    (xLabels.length <= 1 ? plotW / 2 : (index / (xLabels.length - 1)) * plotW);
  const toY = (value) =>
    CHART_PAD.top + plotH - ((value - minY) / yRange) * plotH;

  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, step) => {
    const value = minY + (yRange / gridSteps) * step;
    return { value, y: toY(value) };
  });

  return (
    <div style={chartCard}>
      <h4 style={chartTitle}>{title}</h4>
      {subtitle && <p style={chartSubtitle}>{subtitle}</p>}
      <div style={chartScroll}>
        <svg viewBox={`0 0 ${width} ${height}`} style={chartSvg} role="img">
          {gridLines.map((line) => (
            <g key={line.value}>
              <line
                x1={CHART_PAD.left}
                y1={line.y}
                x2={width - CHART_PAD.right}
                y2={line.y}
                stroke="#e0e6ef"
                strokeDasharray="4 4"
              />
              <text
                x={CHART_PAD.left - 8}
                y={line.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#666"
              >
                {Math.round(line.value)}
                {ySuffix}
              </text>
            </g>
          ))}

          {xLabels.map((label, index) => (
            <text
              key={`${label}-${index}`}
              x={toX(index)}
              y={height - 18}
              textAnchor="middle"
              fontSize="11"
              fill="#666"
            >
              {label}
            </text>
          ))}

          {series.map((item) => {
            const points = item.values
              .map((value, index) => `${toX(index)},${toY(value)}`)
              .join(" ");
            return (
              <g key={item.id}>
                <polyline
                  fill="none"
                  stroke={item.color}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={points}
                />
                {item.values.map((value, index) => (
                  <circle
                    key={`${item.id}-${index}`}
                    cx={toX(index)}
                    cy={toY(value)}
                    r="4"
                    fill={item.color}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <div style={legendRow}>
        {series.map((item) => (
          <span key={item.id} style={legendItem}>
            <span style={{ ...legendDot, backgroundColor: item.color }} />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function BarComparisonChart({ title, subtitle, items, valueSuffix = "" }) {
  if (!items.length) {
    return (
      <div style={chartCard}>
        <h4 style={chartTitle}>{title}</h4>
        <p style={chartEmpty}>Pas assez de donnees pour afficher le graphique.</p>
      </div>
    );
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div style={chartCard}>
      <h4 style={chartTitle}>{title}</h4>
      {subtitle && <p style={chartSubtitle}>{subtitle}</p>}
      <div style={barList}>
        {items.map((item) => (
          <div key={item.id} style={barRow}>
            <span style={barLabel}>{item.label}</span>
            <div style={barTrack}>
              <div
                style={{
                  ...barFill,
                  width: `${Math.max((item.value / maxValue) * 100, 4)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
            <span style={barValue}>
              {item.value}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PromotionEvolutionCharts({ students }) {
  if (!students?.length) return null;

  const weekLabels = buildWeeklyLabels(students, "attendance");
  const attendanceSeries = buildStudentSeries(students, "attendance_rate", "attendance");
  const cptSeries = buildStudentSeries(students, "balance", "cpt");

  const attendanceSnapshot = students.map((node, index) => ({
    id: node.enrollment_id,
    label: node.student.name,
    value: node.attendance.summary.present_days,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const cptSnapshot = students.map((node, index) => ({
    id: node.enrollment_id,
    label: node.student.name,
    value: node.cpt.balance,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <section style={chartsSection}>
      <h3 style={chartsSectionTitle}>Evolution par promotion</h3>
      <div style={chartsGrid}>
        <MultiLineChart
          title="Assiduite hebdomadaire"
          subtitle="Taux de presence (%) par semaine"
          series={attendanceSeries}
          xLabels={weekLabels}
          yMin={0}
          yMax={100}
          ySuffix="%"
        />
        <MultiLineChart
          title="Evolution CPT hebdomadaire"
          subtitle="Solde cumule de points de comportement"
          series={cptSeries}
          xLabels={weekLabels}
        />
        <BarComparisonChart
          title="Comparatif presences (periode)"
          subtitle="Nombre total de jours presents"
          items={attendanceSnapshot}
        />
        <BarComparisonChart
          title="Comparatif CPT actuel"
          subtitle="Solde actuel par etudiant"
          items={cptSnapshot}
        />
      </div>
    </section>
  );
}

export function StudentEvolutionCharts({ studentNode }) {
  const attendanceTimeline = studentNode.attendance?.timeline || [];
  const cptTimeline = studentNode.cpt?.timeline || [];

  const attendanceSeries = [
    {
      id: studentNode.enrollment_id,
      name: studentNode.student.name,
      color: CHART_COLORS[0],
      values: attendanceTimeline.map((point) => point.attendance_rate),
    },
  ];

  const cptSeries = [
    {
      id: studentNode.enrollment_id,
      name: studentNode.student.name,
      color: CHART_COLORS[2],
      values: cptTimeline.map((point) => point.balance),
    },
  ];

  const weekLabels = attendanceTimeline.map((point) => point.week_label);
  const cptLabels = cptTimeline.map((point) => point.date_label);

  return (
    <section style={studentChartsSection}>
      <h4 style={studentChartsTitle}>Evolution individuelle</h4>
      <div style={studentChartsGrid}>
        <MultiLineChart
          title="Assiduite"
          subtitle="Taux de presence par semaine"
          series={attendanceSeries}
          xLabels={weekLabels}
          yMin={0}
          yMax={100}
          ySuffix="%"
          height={240}
        />
        <MultiLineChart
          title="Points CPT"
          subtitle="Solde cumule dans le temps"
          series={cptSeries}
          xLabels={cptLabels}
          height={240}
        />
      </div>
    </section>
  );
}

const chartCard = {
  backgroundColor: "#fafbfd",
  border: "1px solid #e0e6ef",
  borderRadius: "12px",
  padding: "14px",
};
const chartTitle = { margin: "0 0 4px", color: "#1a237e", fontSize: "15px" };
const chartSubtitle = { margin: "0 0 10px", color: "#666", fontSize: "13px" };
const chartEmpty = { margin: 0, color: "#666", fontSize: "13px" };
const chartScroll = { overflowX: "auto" };
const chartSvg = { width: "100%", minWidth: "520px", height: "auto", display: "block" };
const legendRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "10px",
};
const legendItem = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "12px",
  color: "#444",
};
const legendDot = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  display: "inline-block",
};
const chartsSection = {
  marginBottom: "18px",
  padding: "14px",
  borderRadius: "12px",
  backgroundColor: "#f5f9ff",
  border: "1px solid #dbe7f5",
};
const chartsSectionTitle = { margin: "0 0 12px", color: "#1a237e", fontSize: "16px" };
const chartsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "14px",
};
const barList = { display: "grid", gap: "10px" };
const barRow = {
  display: "grid",
  gridTemplateColumns: "120px 1fr 48px",
  gap: "10px",
  alignItems: "center",
};
const barLabel = { fontSize: "13px", color: "#444", overflow: "hidden", textOverflow: "ellipsis" };
const barTrack = {
  height: "10px",
  backgroundColor: "#e8eef8",
  borderRadius: "999px",
  overflow: "hidden",
};
const barFill = { height: "100%", borderRadius: "999px" };
const barValue = { fontSize: "13px", fontWeight: 700, color: "#1a237e", textAlign: "right" };
const studentChartsSection = { marginBottom: "16px" };
const studentChartsTitle = { margin: "0 0 10px", color: "#333", fontSize: "15px" };
const studentChartsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "12px",
};
