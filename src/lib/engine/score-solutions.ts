// ============================================================
// Juzoor Engine — Solution Scoring
// Pure function: scores every solution for the user's profile and cause scores.
// Per spec §8.4.
// ============================================================

import type {
  CauseScore,
  EngineState,
  Solution,
  SolutionScore,
} from "./types";

export interface SolutionWeights {
  wE: number;
  wA: number;
  wS: number;
  wF: number;
}

const DEFAULT_WEIGHTS: SolutionWeights = {
  wE: 0.35,
  wA: 0.25,
  wS: 0.15,
  wF: 0.25,
};

function normalizeWeights(w: SolutionWeights): SolutionWeights {
  const sum = w.wE + w.wA + w.wS + w.wF;
  if (sum <= 0) return DEFAULT_WEIGHTS;
  return {
    wE: w.wE / sum,
    wA: w.wA / sum,
    wS: w.wS / sum,
    wF: w.wF / sum,
  };
}

/**
 * Compute the fit value (1-5) for a solution given the user profile and state.
 * Also produces a list of Arabic reasons for the fit calculation.
 */
export function computeFit(
  s: Solution,
  state: EngineState,
): { fit: number; reasons: string[] } {
  const profile = state.profile;
  if (!profile) {
    return { fit: 4, reasons: [] };
  }

  let fit = 4; // baseline
  const reasons: string[] = [];

  // dailyMinutes adjustments
  if (s.dailyMinutes > profile.minutesPerDay) {
    fit = 2;
    reasons.push(
      `الحل محتاج ${s.dailyMinutes} دقيقة يومياً وأنت حددت ${profile.minutesPerDay} دقيقة فقط — رفعنا قابلية التطبيق للسهولة بعامل أقل.`,
    );
  } else if (s.dailyMinutes <= profile.minutesPerDay / 2) {
    fit = 5;
    reasons.push(
      `الحل محتاج وقت صغير (${s.dailyMinutes} دقيقة) مقارنة بوقتك المتاح (${profile.minutesPerDay} دقيقة) — سهل التطبيق.`,
    );
  }

  // needsTeam + alone
  if (s.needsTeam && profile.alone) {
    fit = 1;
    reasons.push(
      "الحل محتاج فريق وأنت ذاكر إنك بتشتغل لوحدك — صعب التطبيق في وضعك الحالي.",
    );
  }

  // urgent + slow speed
  if (profile.urgent && s.ratings.speed <= 2) {
    fit = Math.max(1, fit - 1);
    reasons.push(
      "عندك امتحان قريب والحل بطيء — قللنا قابلية التطبيق درجة.",
    );
  }

  // Override by setFit rule
  if (state.setFitValues[s.id] !== undefined) {
    fit = state.setFitValues[s.id];
    reasons.push(`قاعدة عدّلت قابلية التطبيق للحل ده لـ ${fit}/5.`);
  }

  return { fit, reasons };
}

/**
 * Score every solution. Sorts by score desc, then priority desc, then id asc.
 * Returns ALL solutions; the UI may filter to top 3.
 */
export function scoreSolutions(
  state: EngineState,
  causeScores: Record<string, CauseScore>,
  weights?: Partial<SolutionWeights>,
): SolutionScore[] {
  const w = normalizeWeights(weights ? { ...DEFAULT_WEIGHTS, ...weights } : DEFAULT_WEIGHTS);
  const profile = state.profile;
  const results: SolutionScore[] = [];

  for (const s of state.content.solutions) {
    // Compute fit (default 4 if no profile set)
    const { fit, reasons } = profile
      ? computeFit(s, state)
      : { fit: 4, reasons: [] as string[] };

    const E = s.ratings.effectiveness;
    const A = s.ratings.ease;
    const S = s.ratings.speed;

    const rawScore =
      w.wE * (E / 5) +
      w.wA * (A / 5) +
      w.wS * (S / 5) +
      w.wF * (fit / 5);
    const score = Math.round(rawScore * 100);

    // priority = score × (max cause score among s.causeIds / 100)
    let maxCause = 0;
    for (const cid of s.causeIds) {
      const cs = causeScores[cid];
      if (cs && !cs.excluded && cs.score > maxCause) {
        maxCause = cs.score;
      }
    }
    const priority = Math.round((score * maxCause) / 100);

    results.push({
      solutionId: s.id,
      score,
      priority,
      fit,
      E,
      A,
      S,
      causeIds: s.causeIds,
      fitReasons: reasons,
    });
  }

  // Sort by priority desc, then score desc, then id asc.
  // Priority = score × (top cause score / 100) represents "relevance for THIS user".
  // The UI takes the top N (typically 3) from this ordering.
  results.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (b.score !== a.score) return b.score - a.score;
    return a.solutionId.localeCompare(b.solutionId);
  });

  return results;
}
