// ============================================================
// Juzoor Engine — Rules
// Pure functions: evaluate conditions and apply rule actions.
// ============================================================

import type {
  Action,
  Condition,
  CauseScore,
  EngineState,
  RuleFired,
  Profile,
} from "./types";

/**
 * Evaluate a condition against current state and cause scores.
 * Recursive for all/any/not. Pure.
 */
export function evaluateCondition(
  cond: Condition,
  state: EngineState,
  causeScores: Record<string, CauseScore>,
): boolean {
  if ("all" in cond) {
    return cond.all.every((c) => evaluateCondition(c, state, causeScores));
  }
  if ("any" in cond) {
    return cond.any.some((c) => evaluateCondition(c, state, causeScores));
  }
  if ("not" in cond) {
    return !evaluateCondition(cond.not, state, causeScores);
  }
  if ("answered" in cond) {
    const { q, option } = cond.answered;
    return state.answers.some((a) => a.qid === q && a.optionId === option);
  }
  if ("profile" in cond) {
    const profile: Profile | null = state.profile;
    if (!profile) return false;
    const { field, op, value } = cond.profile;
    const actual: unknown = (profile as unknown as Record<string, unknown>)[field];
    if (actual === undefined) return false;
    switch (op) {
      case "==":
        return actual === value;
      case "<":
        return typeof actual === "number" && typeof value === "number" && actual < value;
      case ">":
        return typeof actual === "number" && typeof value === "number" && actual > value;
      case ">=":
        return typeof actual === "number" && typeof value === "number" && actual >= value;
      default:
        return false;
    }
  }
  if ("flag" in cond) {
    return state.flags.includes(cond.flag);
  }
  if ("causeScore" in cond) {
    const { id, op, value } = cond.causeScore;
    const score = causeScores[id]?.score ?? 0;
    switch (op) {
      case "<":
        return score < value;
      case ">":
        return score > value;
      case ">=":
        return score >= value;
      default:
        return false;
    }
  }
  return false;
}

/**
 * Apply a single action to a state mutation. Mutates the given draft object.
 * Pure-ish: takes draft and mutates it (the caller passes a fresh draft).
 */
function applyAction(action: Action, draft: EngineState, ruleId: string): void {
  if ("addEvidence" in action) {
    const { cause, weight } = action.addEvidence;
    draft.extraEvidence[cause] = (draft.extraEvidence[cause] ?? 0) + weight;
    return;
  }
  if ("excludeCause" in action) {
    const id = action.excludeCause;
    if (!draft.excludedCauses.includes(id)) {
      draft.excludedCauses.push(id);
    }
    return;
  }
  if ("skipQuestion" in action) {
    const id = action.skipQuestion;
    if (!draft.skippedQuestions.includes(id)) {
      draft.skippedQuestions.push(id);
    }
    return;
  }
  if ("forceQuestion" in action) {
    draft.forcedNext = action.forceQuestion;
    return;
  }
  if ("setFit" in action) {
    draft.setFitValues[action.setFit.solution] = action.setFit.value;
    return;
  }
  if ("showMessage" in action) {
    const key = action.showMessage;
    if (!draft.messages.includes(key)) {
      draft.messages.push(key);
    }
    return;
  }
  // Exhaustive check; if a new action type is added, this will error.
  void ruleId;
}

/**
 * Apply all rules in file order. Returns new state (clone) and the list of fired rules.
 * Pure: does not mutate input state.
 */
export function applyRules(
  state: EngineState,
  causeScores: Record<string, CauseScore>,
): { newState: EngineState; fired: RuleFired[] } {
  const draft: EngineState = {
    ...state,
    flags: [...state.flags],
    excludedCauses: [...state.excludedCauses],
    skippedQuestions: [...state.skippedQuestions],
    extraEvidence: { ...state.extraEvidence },
    setFitValues: { ...state.setFitValues },
    messages: [...state.messages],
    rulesFired: [...state.rulesFired],
    // answers and forcedNext are not modified by rules
    answers: state.answers,
    forcedNext: state.forcedNext,
  };

  const fired: RuleFired[] = [];
  const alreadyFired = new Set(state.rulesFired.map((r) => r.ruleId));

  for (const rule of state.content.rules) {
    // Skip rules that already fired earlier in the session (idempotent semantics).
    if (alreadyFired.has(rule.id)) continue;
    const ok = evaluateCondition(rule.if, draft, causeScores);
    const actions = ok ? rule.then : rule.else ?? [];
    if (actions.length === 0) continue;
    const branch: "then" | "else" = ok ? "then" : "else";
    for (const a of actions) {
      applyAction(a, draft, rule.id);
    }
    fired.push({ ruleId: rule.id, branch, explain_ar: rule.explain_ar });
    alreadyFired.add(rule.id);
  }

  draft.rulesFired = [...state.rulesFired, ...fired];
  return { newState: draft, fired };
}
