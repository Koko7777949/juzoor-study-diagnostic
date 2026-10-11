// ============================================================
// Juzoor Engine — Explanation Generators
// Pure functions that format Arabic explanation text.
// ============================================================

import type {
  CauseScore,
  EngineState,
  ExplainText,
  Solution,
} from "./types";
import { sortContributionsByAbsWeight } from "./score-causes";

/**
 * Format a cause's contribution list as an Arabic string for the "why" drawer.
 * Example: "سؤال Q2B → إجابتك أغلب المواد (+2)"
 */
function formatContribution(
  contrib: { qid: string; optionLabel_ar: string; weight: number; questionLabel_ar: string },
): string {
  const sign = contrib.weight >= 0 ? "+" : "";
  return `سؤال ${contrib.qid} → إجابتك ${contrib.optionLabel_ar} (${sign}${contrib.weight})`;
}

/**
 * Explain why a cause was selected and how the score was derived.
 */
export function explainCause(
  causeId: string,
  causeScores: Record<string, CauseScore>,
  state: EngineState,
  explainText: ExplainText,
): string {
  const cs = causeScores[causeId];
  if (!cs) return explainText.lowConfidence;

  const cause = state.content.causes.find((c) => c.id === causeId);
  const causeLabel = cause?.label_ar ?? causeId;

  if (cs.excluded || cs.score === 0) {
    return `السبب ${causeLabel} اتستبعد أو مفيش دليل كافي على وجوده في إجاباتك.`;
  }

  const sorted = sortContributionsByAbsWeight(cs.contributions);
  // Filter to non-zero contributions; if all zero, show all (rare).
  const visible = sorted.filter((c) => c.weight !== 0);
  const list = (visible.length > 0 ? visible : sorted).map(formatContribution).join("؛ ");

  return explainText.causeTemplate
    .replace("{cause}", causeLabel)
    .replace("{score}", String(cs.score))
    .replace("{contributions}", list);
}

/**
 * Explain why a solution was recommended.
 */
export function explainSolution(
  solutionId: string,
  solutions: Solution[],
  state: EngineState,
  causeScores: Record<string, CauseScore>,
  explainText: ExplainText,
): string {
  const s = solutions.find((x) => x.id === solutionId);
  if (!s) return "الحل غير موجود.";

  // Best cause for this solution (max score among its causeIds)
  let maxCauseId = s.causeIds[0];
  let maxScore = 0;
  for (const cid of s.causeIds) {
    const cs = causeScores[cid];
    if (cs && !cs.excluded && cs.score > maxScore) {
      maxScore = cs.score;
      maxCauseId = cid;
    }
  }
  const cause = state.content.causes.find((c) => c.id === maxCauseId);
  const causeLabel = cause?.label_ar ?? maxCauseId;

  return explainText.solutionTemplate
    .replace("{solution}", s.label_ar)
    .replace("{cause}", causeLabel)
    .replace("{score}", String(maxScore))
    .replace("{E}", String(s.ratings.effectiveness))
    .replace("{A}", String(s.ratings.ease))
    .replace("{dailyMinutes}", String(s.dailyMinutes));
}

/**
 * Low-confidence message: when no cause is clear.
 */
export function explainLowConfidence(explainText: ExplainText): string {
  return explainText.lowConfidence;
}
