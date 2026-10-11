// ============================================================
// Juzoor Engine — Public API
// Re-exports all engine modules and provides high-level helpers.
// All functions are pure: no React, no IO, no Date.now() unless passed.
// ============================================================

import type {
  Answer,
  CauseScore,
  ContentBundle,
  EngineState,
  Profile,
  Question,
} from "./types";

// Re-exports
export * from "./types";
export * from "./schemas";
export * from "./rules";
export * from "./score-causes";
export * from "./select-question";
export * from "./stop";
export * from "./score-solutions";
export * from "./explain";

import { applyRules, evaluateCondition } from "./rules";
import { scoreCauses } from "./score-causes";
import { getNextQuestion } from "./select-question";
import { shouldStop } from "./stop";
import { scoreSolutions } from "./score-solutions";

/**
 * Create the initial engine state for a given content bundle.
 * No symptom or profile set yet — the UI sets them.
 */
export function createInitialState(content: ContentBundle): EngineState {
  return {
    content,
    symptomId: null,
    profile: null,
    answers: [],
    flags: [],
    excludedCauses: [],
    extraEvidence: {},
    forcedNext: null,
    skippedQuestions: [],
    setFitValues: {},
    rulesFired: [],
    messages: [],
  };
}

/**
 * Record an answer to a question. Pure: returns a new state (cloned).
 * - Appends the answer to answers.
 * - Sets flags from the chosen option (if any).
 * - Clears forcedNext (it has been used).
 * - Returns the new state (rule application happens elsewhere, typically via applyRulesAfter).
 */
export function recordAnswer(
  state: EngineState,
  qid: string,
  optionId: string,
): EngineState {
  const q = state.content.questions.find((x) => x.id === qid);
  const chosen = q?.options.find((o) => o.id === optionId);

  const newFlags = [...state.flags];
  if (chosen?.flags) {
    for (const f of chosen.flags) {
      if (!newFlags.includes(f)) newFlags.push(f);
    }
  }

  const answer: Answer = { qid, optionId };

  return {
    ...state,
    answers: [...state.answers, answer],
    flags: newFlags,
    forcedNext: null,
    // Note: rules are applied separately via applyRulesAfter.
  };
}

/**
 * Apply rules after recording an answer. Recomputes cause scores after rule actions.
 * Returns the new state with rulesFired + extras applied.
 *
 * Single-pass deterministic pipeline:
 *   state -> scoreCauses -> applyRules -> scoreCauses (final)
 * Rules that already fired (in state.rulesFired) are not re-fired; this prevents
 * duplicate firings and keeps the engine deterministic and bounded.
 */
export function applyRulesAfter(state: EngineState): {
  newState: EngineState;
  causeScores: Record<string, CauseScore>;
} {
  const initialScores = scoreCauses(state);
  const { newState, fired } = applyRules(state, initialScores);
  const finalScores = scoreCauses(newState);
  return { newState, causeScores: finalScores };
}

/**
 * Return the top-N causes sorted by score desc, excluded causes removed first.
 */
export function getTopCauses(
  causeScores: Record<string, CauseScore>,
  n = 3,
): CauseScore[] {
  return Object.values(causeScores)
    .filter((cs) => !cs.excluded)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.causeId.localeCompare(b.causeId);
    })
    .slice(0, n);
}

/**
 * Confidence bucket from a score (0-100).
 */
export function getConfidence(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/**
 * Top-3 non-excluded causes for display ranking.
 */
export function getRankingForDisplay(
  causeScores: Record<string, CauseScore>,
): CauseScore[] {
  return getTopCauses(causeScores, 3);
}

// Convenience re-exports for the high-level helpers used by UI
export { evaluateCondition, applyRules, scoreCauses, getNextQuestion, shouldStop, scoreSolutions };

/**
 * Convenience: get the next question + updated scores + fired rules + messages
 * in a single call (used by UI step).
 */
export function step(
  state: EngineState,
): {
  nextQuestion: Question | null;
  causeScores: Record<string, CauseScore>;
  rulesFired: EngineState["rulesFired"];
  messages: string[];
} {
  const { newState, causeScores } = applyRulesAfter(state);
  const nextQuestion = getNextQuestion(newState, causeScores);
  return {
    nextQuestion,
    causeScores,
    rulesFired: newState.rulesFired,
    messages: [...newState.messages],
  };
}

/**
 * Set the symptom id and profile on a fresh state. Pure: returns new state.
 */
export function setSymptomAndProfile(
  state: EngineState,
  symptomId: string,
  profile: Profile,
): EngineState {
  return {
    ...state,
    symptomId,
    profile,
  };
}
