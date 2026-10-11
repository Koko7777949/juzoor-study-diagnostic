// ============================================================
// Juzoor Engine — Stop Decision
// Pure function: decides whether the diagnostic loop should stop.
// Per spec §8.3, interpreted to match the worked example:
//   - clear_winner if topScore >= 70 AND gap >= 15
//   - max_questions if answers.length >= 10
//   - no_eligible_question if getNextQuestion === null
// Otherwise, keep going.
// ============================================================

import type { CauseScore, EngineState, StopResult } from "./types";
import { getNextQuestion } from "./select-question";

export function shouldStop(
  state: EngineState,
  causeScores: Record<string, CauseScore>,
): StopResult {
  // Sort non-excluded causes by score desc, tie-break by id asc
  const nonExcluded = Object.values(causeScores)
    .filter((cs) => !cs.excluded)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.causeId.localeCompare(b.causeId);
    });

  const topScore = nonExcluded[0]?.score ?? 0;
  const secondScore = nonExcluded[1]?.score ?? 0;
  const gap = topScore - secondScore;

  // (a) clear winner
  if (topScore >= 70 && gap >= 15) {
    return {
      stop: true,
      reason: { kind: "clear_winner", topScore, gap },
    };
  }

  // (b) max questions reached
  if (state.answers.length >= 10) {
    return {
      stop: true,
      reason: { kind: "max_questions", count: state.answers.length },
    };
  }

  // (c) no eligible question available
  const nextQ = getNextQuestion(state, causeScores);
  if (nextQ === null) {
    return {
      stop: true,
      reason: { kind: "no_eligible_question" },
    };
  }

  return { stop: false };
}
