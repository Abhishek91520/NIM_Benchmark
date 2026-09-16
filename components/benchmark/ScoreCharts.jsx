"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  CartesianGrid,
  Cell,
} from "recharts";

function getSignalColor(score) {
  if (score >= 70) return "var(--sig-ok)";
  if (score >= 40) return "var(--sig-warn)";
  return "var(--sig-fail)";
}

export default function ScoreCharts({ leaderboard = [], results = [] }) {
  const barChartData = useMemo(() => {
    return leaderboard.map((item) => {
      const shortName = item.modelId.split("/")[1] || item.modelId;
      return {
        name: shortName,
        fullName: item.modelId,
        composite: item.compositeScore,
        color: getSignalColor(item.compositeScore),
      };
    });
  }, [leaderboard]);

  const scatterData = useMemo(() => {
    return leaderboard
      .filter((item) => item.avgLatencyMs > 0)
      .map((item) => {
        const shortName = item.modelId.split("/")[1] || item.modelId;
        return {
          name: shortName,
          fullName: item.modelId,
          latency: item.avgLatencyMs,
          quality: item.qualityScore,
          color: getSignalColor(item.qualityScore),
        };
      });
  }, [leaderboard]);

  const radarData = useMemo(() => {
    const categories = ["reasoning", "coding", "instruction", "summarization", "structured", "creative"];
    const topModels = leaderboard.slice(0, 3);

    return categories.map((cat) => {
      const point = { category: cat };
      topModels.forEach((model, idx) => {
        const catResults = results.filter(
          (r) => r.modelId === model.modelId && r.category === cat && r.qualityScore !== null
        );
        const avg =
          catResults.length > 0
            ? Math.round(catResults.reduce((sum, r) => sum + r.qualityScore, 0) / catResults.length)
            : 0;
        point[`model_${idx}`] = avg;
      });
      return point;
    });
  }, [leaderboard, results]);

  const top3 = leaderboard.slice(0, 3);
  const strokeHues = ["var(--sig-ok)", "var(--focus)", "var(--sig-warn)"];

  if (leaderboard.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Composite Score Bar Chart per Section 6 */}
        <div className="rounded-[4px] border border-line bg-surface p-4 space-y-2">
          <div className="border-b border-line pb-2">
            <h3 className="text-xs font-semibold text-text-main font-sans">
              Composite score by model
            </h3>
            <p className="text-[11px] text-text-muted">
              Higher is better (0–100 scale)
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 25 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  cursor={{ fill: "var(--surface-raised)", opacity: 0.5 }}
                  contentStyle={{
                    backgroundColor: "var(--surface-raised)",
                    borderColor: "var(--line)",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text)",
                    padding: "6px 10px",
                  }}
                  formatter={(val) => [`${val} / 100`, "Composite"]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                />
                <Bar dataKey="composite" radius={[0, 0, 0, 0]} isAnimationActive={false}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Speed vs Quality Scatter Plot (Desktop/Tablet) or Ranked List (Mobile per Section 8) */}
        <div className="rounded-[4px] border border-line bg-surface p-4 space-y-2">
          <div className="border-b border-line pb-2">
            <h3 className="text-xs font-semibold text-text-main font-sans">
              Speed vs. quality frontier
            </h3>
            <p className="text-[11px] text-text-muted">
              Ideal quadrant: Upper-left (lowest latency, highest quality)
            </p>
          </div>

          {/* Desktop/Tablet: Scatter plot */}
          <div className="hidden md:block h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--line)" />
                <XAxis
                  type="number"
                  dataKey="latency"
                  name="Latency"
                  unit="ms"
                  stroke="var(--text-muted)"
                  fontSize={11}
                />
                <YAxis
                  type="number"
                  dataKey="quality"
                  name="Quality"
                  domain={[0, 100]}
                  stroke="var(--text-muted)"
                  fontSize={11}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "2 2", stroke: "var(--line-strong)" }}
                  contentStyle={{
                    backgroundColor: "var(--surface-raised)",
                    borderColor: "var(--line)",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text)",
                    padding: "6px 10px",
                  }}
                  formatter={(val, name) => [
                    name === "Latency" ? `${val} ms` : `${val} / 100`,
                    name,
                  ]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                />
                <Scatter name="Models" data={scatterData} isAnimationActive={false}>
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Mobile Ranked List per Section 8: replaces scatter on <768px */}
          <div className="md:hidden divide-y divide-line pt-2">
            {scatterData.map((item, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between text-xs font-mono">
                <span className="truncate max-w-[180px] text-text-main">{item.name}</span>
                <div className="flex items-center gap-3 text-text-muted tabular-nums">
                  <span>{item.latency} ms</span>
                  <span style={{ color: item.color }}>{item.quality} / 100</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Radar Chart: Category capability breakdown */}
      {top3.length > 0 && (
        <div className="rounded-[4px] border border-line bg-surface p-4 space-y-2">
          <div className="border-b border-line pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-text-main font-sans">
                Category capability profile
              </h3>
              <p className="text-[11px] text-text-muted">
                Quality score per category for top-ranked models
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
              {top3.map((m, idx) => (
                <span key={idx} className="flex items-center gap-1.5" style={{ color: strokeHues[idx] }}>
                  <span className="w-2 h-2 rounded-none" style={{ backgroundColor: strokeHues[idx] }} />
                  <span>#{m.rank} {m.modelId.split("/")[1] || m.modelId}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="var(--line)" />
                <PolarAngleAxis dataKey="category" stroke="var(--text-muted)" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--text-faint)" fontSize={10} />
                {top3.map((m, idx) => (
                  <Radar
                    key={idx}
                    name={m.modelId.split("/")[1] || m.modelId}
                    dataKey={`model_${idx}`}
                    stroke={strokeHues[idx]}
                    fill={strokeHues[idx]}
                    fillOpacity={0.15}
                    isAnimationActive={false}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
