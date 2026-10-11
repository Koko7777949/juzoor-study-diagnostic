"use client";

import * as React from "react";
import { useJuzoor } from "@/lib/store";
import { getRankingForDisplay } from "@/lib/engine";
import type { Cause, CauseScore } from "@/lib/engine/types";

interface IshikawaDiagramProps {
  /** Causes from the current domain's content bundle. */
  causes: Cause[];
  /** Map of causeId -> CauseScore from the engine. */
  causeScores: Record<string, CauseScore>;
  /** The label of the symptom (the "head" of the fish). */
  symptomLabel: string;
}

/**
 * A responsive Ishikawa-style fishbone diagram showing the 6-8 root-cause
 * branches feeding into the visible symptom. The spine uses --app-primary;
 * the top 3 ranked causes use --app-accent.
 *
 * The diagram is laid out on a 720x280 viewBox and scales to its container.
 */
export function IshikawaDiagram({ causes, causeScores, symptomLabel }: IshikawaDiagramProps) {
  // Filter to causes that are not excluded and order by their position in the
  // content array (so the layout stays stable across re-renders).
  const visibleCauses = React.useMemo(
    () => causes.filter((c) => !causeScores[c.id]?.excluded),
    [causes, causeScores],
  );

  // Top 3 cause IDs by score (regardless of excluded state)
  const top3Ids = React.useMemo(() => {
    const ranking = getRankingForDisplay(causeScores)
      .filter((cs) => !cs.excluded && cs.score > 0)
      .slice(0, 3);
    return new Set(ranking.map((cs) => cs.causeId));
  }, [causeScores]);

  if (visibleCauses.length === 0) return null;

  // Layout: viewBox 720x280
  // Spine: y=140, from x=40 to x=600
  // Arrow head at x=600
  // Symptom box at x=612..710, y=120..160
  // N branches evenly spaced between x=80 and x=560

  const SPINE_Y = 140;
  const SPINE_X_START = 40;
  const SPINE_X_END = 600;
  const ARROW_X = 600;
  const SYMPTOM_X = 615;
  const SYMPTOM_W = 100;

  const branchCount = visibleCauses.length;
  const xMin = 80;
  const xMax = 560;
  const step = branchCount > 1 ? (xMax - xMin) / (branchCount - 1) : 0;
  const branchPositions = visibleCauses.map((_, i) => xMin + i * step);

  return (
    <svg
      viewBox="0 0 720 280"
      role="img"
      aria-label={`خريطة أسباب: ${visibleCauses.map((c) => c.label_ar).join("، ")} بتأدي للعرض: ${symptomLabel}`}
      className="w-full h-auto max-w-2xl mx-auto block"
      style={{ color: "var(--app-text)" }}
    >
      {/* Defs: arrow head marker */}
      <defs>
        <marker
          id="ishikawa-arrow"
          markerWidth="12"
          markerHeight="12"
          refX="0"
          refY="6"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L12,6 L0,12 Z" fill="var(--app-primary)" />
        </marker>
      </defs>

      {/* Spine */}
      <line
        x1={SPINE_X_START}
        y1={SPINE_Y}
        x2={SPINE_X_END}
        y2={SPINE_Y}
        stroke="var(--app-primary)"
        strokeWidth={3}
        strokeLinecap="round"
        markerEnd="url(#ishikawa-arrow)"
      />

      {/* Symptom box (the "head" of the fish) */}
      <rect
        x={SYMPTOM_X}
        y={SPINE_Y - 22}
        width={SYMPTOM_W}
        height={44}
        rx={10}
        ry={10}
        fill="var(--app-primary)"
        opacity={0.12}
        stroke="var(--app-primary)"
        strokeWidth={1.5}
      />
      <text
        x={SYMPTOM_X + SYMPTOM_W / 2}
        y={SPINE_Y - 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="var(--app-primary)"
        style={{ direction: "rtl" }}
      >
        العرض
      </text>
      <text
        x={SYMPTOM_X + SYMPTOM_W / 2}
        y={SPINE_Y + 10}
        textAnchor="middle"
        fontSize={10}
        fill="var(--app-text)"
        style={{ direction: "rtl" }}
      >
        {truncate(symptomLabel, 14)}
      </text>

      {/* Branches */}
      {visibleCauses.map((cause, i) => {
        const x = branchPositions[i];
        const isTop = i % 2 === 0; // alternate top/bottom starting from top
        const score = causeScores[cause.id]?.score ?? 0;
        const isHighlight = top3Ids.has(cause.id);
        const branchColor = isHighlight ? "var(--app-accent)" : "var(--app-primary)";

        // Branch diagonal: from spine point (x, SPINE_Y) up/down to (x-30, tip)
        const tipY = isTop ? 50 : 230;
        const tipX = x - 30;
        // Label position (centered around the branch tip, slightly further out)
        const labelX = tipX + 14;
        const labelY = isTop ? 38 : 252;
        // Intensity bar position (right above the label for top, below for bottom)
        const barX = labelX - 22;
        const barY = isTop ? 22 : 232;
        const barW = 44;
        const barH = 5;
        const fillW = (score / 100) * barW;

        return (
          <g key={cause.id}>
            {/* Diagonal branch line */}
            <line
              x1={x}
              y1={SPINE_Y}
              x2={tipX}
              y2={tipY}
              stroke={branchColor}
              strokeWidth={isHighlight ? 2.5 : 1.8}
              strokeLinecap="round"
              opacity={isHighlight ? 1 : 0.7}
            />
            {/* Branch label (use cause's branch name, fallback to label_ar) */}
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              fontSize={11}
              fontWeight={isHighlight ? 700 : 600}
              fill={isHighlight ? "var(--app-text)" : "var(--app-secondary)"}
              style={{ direction: "rtl" }}
            >
              {cause.branch || cause.label_ar}
            </text>
            {/* Intensity bar background */}
            <rect
              x={barX}
              y={barY}
              width={barW}
              height={barH}
              rx={2.5}
              ry={2.5}
              fill="var(--app-muted)"
            />
            {/* Intensity bar fill */}
            {score > 0 && (
              <rect
                x={barX}
                y={barY}
                width={Math.max(2, fillW)}
                height={barH}
                rx={2.5}
                ry={2.5}
                fill={branchColor}
              />
            )}
            {/* Score number to the side of the bar */}
            <text
              x={barX + barW + 4}
              y={barY + barH - 0.5}
              fontSize={9}
              fontWeight={700}
              fill={isHighlight ? "var(--app-primary)" : "var(--app-secondary)"}
              style={{ direction: "ltr" }}
            >
              {Math.round(score)}
            </text>
          </g>
        );
      })}

      {/* Title (small, bottom-left of the SVG) */}
      <text
        x={SPINE_X_START}
        y={266}
        fontSize={10}
        fontWeight={600}
        fill="var(--app-secondary)"
        style={{ direction: "rtl" }}
      >
        الأسباب
      </text>
      <text
        x={SPINE_X_START}
        y={14}
        fontSize={10}
        fontWeight={600}
        fill="var(--app-secondary)"
        style={{ direction: "rtl" }}
      >
        خريطة الأسباب (Ishikawa)
      </text>
    </svg>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
