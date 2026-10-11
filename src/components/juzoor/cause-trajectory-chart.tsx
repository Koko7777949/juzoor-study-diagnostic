"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { ScoreSnapshot } from "@/lib/store";

/**
 * Mini cause-trajectory sparkline chart.
 * Renders a small SVG showing the score evolution of the top 3 causes over
 * the answered questions. Placed below the progress bar on the question screen.
 *
 * - Width is responsive (100% of container, viewBox 240x60)
 * - Each cause gets a colored polyline (from the Juzoor palette)
 * - The right-most point (current state) is highlighted with a dot
 * - A subtle grid line at the 70% threshold (high-confidence marker)
 * - Legend below the chart shows the cause names with their colors
 */
interface CauseTrajectoryChartProps {
  history: ScoreSnapshot[];
  causeLabels: Record<string, string>; // causeId -> short label (branch name)
  className?: string;
}

// Colors for up to 3 lines (cycling if more)
const LINE_COLORS = [
  "var(--app-primary)",     // teal
  "var(--app-secondary)",  // purple
  "var(--app-success)",     // green
];

const CHART_W = 240;
const CHART_H = 60;
const PAD_X = 4;
const PAD_Y = 6;

export function CauseTrajectoryChart({
  history,
  causeLabels,
  className,
}: CauseTrajectoryChartProps) {
  // Determine the top 3 causes by latest score (descending)
  const topCauses = React.useMemo(() => {
    if (history.length === 0) return [] as string[];
    const latest = history[history.length - 1].scores;
    return Object.entries(latest)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  }, [history]);

  if (history.length < 2 || topCauses.length === 0) {
    // Need at least 2 data points and 1 cause to render a meaningful line
    return null;
  }

  const n = history.length;
  const innerW = CHART_W - PAD_X * 2;
  const innerH = CHART_H - PAD_Y * 2;

  // X coordinate for a given snapshot index (0..n-1)
  const xFor = (i: number) => {
    if (n === 1) return PAD_X + innerW / 2;
    return PAD_X + (i / (n - 1)) * innerW;
  };
  // Y coordinate for a given score (0..100)
  const yFor = (score: number) => PAD_Y + innerH - (score / 100) * innerH;

  // Build polyline points for each top cause
  const lines = topCauses.map((causeId, lineIdx) => {
    const points: { x: number; y: number; score: number }[] = [];
    for (let i = 0; i < n; i++) {
      const snap = history[i];
      const score = snap.scores[causeId];
      if (typeof score === "number" && score > 0) {
        points.push({ x: xFor(i), y: yFor(score), score });
      }
    }
    return {
      causeId,
      color: LINE_COLORS[lineIdx % LINE_COLORS.length],
      points,
      latestScore: points.length > 0 ? points[points.length - 1].score : 0,
    };
  });

  // 70% threshold line (high confidence)
  const thresholdY = yFor(70);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-card border border-border rounded-xl p-2.5 flex flex-col gap-1.5 ${className ?? ""}`}
      role="img"
      aria-label={`رسم بياني لتطور درجات الأسباب على ${n} أسئلة`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-app-secondary">
          تطور الأسباب
        </span>
        <span className="text-[10px] text-app-secondary tabular-nums">
          {n} إجابات
        </span>
      </div>

      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full h-12"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* 70% threshold dashed line */}
        <line
          x1={PAD_X}
          y1={thresholdY}
          x2={CHART_W - PAD_X}
          y2={thresholdY}
          stroke="var(--app-primary)"
          strokeWidth={0.5}
          strokeDasharray="2 2"
          opacity={0.3}
        />

        {/* Polylines for each top cause */}
        {lines.map((line) => {
          if (line.points.length < 2) return null;
          const d = line.points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
            .join(" ");
          const last = line.points[line.points.length - 1];
          return (
            <g key={line.causeId}>
              <motion.path
                d={d}
                fill="none"
                stroke={line.color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              {/* End dot */}
              <motion.circle
                cx={last.x}
                cy={last.y}
                r={2}
                fill={line.color}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 15 }}
              />
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        {lines.map((line) => (
          <div
            key={line.causeId}
            className="flex items-center gap-1"
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: line.color }}
              aria-hidden="true"
            />
            <span className="text-[10px] text-app-text font-medium leading-none">
              {causeLabels[line.causeId] ?? line.causeId}
            </span>
            <span className="text-[10px] text-app-secondary tabular-nums leading-none">
              {line.latestScore}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
