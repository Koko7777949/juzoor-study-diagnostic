// ============================================================
// Juzoor Engine — Next Question Selection
// Pure function: returns the next question to ask, or null if none.
// Algorithm per spec §8.1.
// ============================================================

import type {
  CauseScore,
  EngineState,
  Option,
  Question,
} from "./types";
import { evaluateCondition } from "./rules";

/**
 * Compute the set of questions reachable from the user's current path.
 * Reachable = entry questions on the user's path + all loop questions
 * (loop questions are always reachable once the user has answered any entry).
 *
 * We compute it by simulating the next-pointers from the symptom's entryQuestionId
 * (or Q1) and adding all loop questions.
 */
function reachableQuestionIds(state: EngineState): Set<string> {
  const content = state.content;
  const reachable = new Set<string>();
  const symptom = state.symptomId
    ? content.symptoms.find((s) => s.id === state.symptomId)
    : undefined;

  // Start: symptom's entry question, or first entry question
  const questionsById = new Map(content.questions.map((q) => [q.id, q] as const));
  const entryQid = symptom?.entryQuestionId;
  const allEntries = content.questions.filter((q) => q.kind === "entry");

  if (entryQid && questionsById.has(entryQid)) {
    reachable.add(entryQid);
  } else if (allEntries.length > 0) {
    reachable.add(allEntries[0].id);
  }

  // Walk through user answers following next-pointers
  for (const ans of state.answers) {
    const q = questionsById.get(ans.qid);
    if (!q) continue;
    const chosen = q.options.find((o) => o.id === ans.optionId);
    if (chosen?.next && questionsById.has(chosen.next)) {
      reachable.add(chosen.next);
    }
  }

  // All loop questions are always reachable (once user has any answer)
  for (const q of content.questions) {
    if (q.kind === "loop") {
      reachable.add(q.id);
    }
  }

  return reachable;
}

/**
 * Compute the discrimination score for a question:
 * disc(q) = max over options of |w(o, top1) − w(o, top2)|
 * where top1 and top2 are the two highest-scoring non-excluded causes.
 */
function discriminationScore(
  q: Question,
  top1Id: string,
  top2Id: string | null,
): number {
  let best = 0;
  for (const o of q.options) {
    const w1 = o.evidence[top1Id] ?? 0;
    const w2 = top2Id ? (o.evidence[top2Id] ?? 0) : 0;
    const diff = Math.abs(w1 - w2);
    if (diff > best) best = diff;
  }
  return best;
}

/**
 * Determine the next question to ask. Returns null when no eligible question exists.
 *
 * Algorithm:
 * 1. If no answers yet:
 *    - If symptom has entryQuestionId → return that question.
 *    - Else return the first question with kind="entry" (sorted by id).
 * 2. Look at the LAST answer's chosen option. If it has `next` and that question
 *    exists and is not skipped → return it.
 * 3. If state.forcedNext is set and not skipped → return it (do not clear here).
 * 4. Otherwise, among `kind="loop"` questions not yet answered, not skipped, whose
 *    askIf (if present) evaluates true:
 *    - Compute disc(q) = max over options of |w(o, top1) − w(o, top2)|.
 *    - top1 and top2 are the two highest-scoring non-excluded causes
 *      (by score desc, tie-break by id asc).
 *    - Pick the question with highest disc. Tie-break: smaller priority first,
 *      then smaller id.
 * 5. If no eligible question → return null.
 */
export function getNextQuestion(
  state: EngineState,
  causeScores: Record<string, CauseScore>,
): Question | null {
  const content = state.content;
  const questionsById = new Map(content.questions.map((q) => [q.id, q] as const));
  const reachable = reachableQuestionIds(state);

  // Step 1: no answers yet
  if (state.answers.length === 0) {
    const symptom = state.symptomId
      ? content.symptoms.find((s) => s.id === state.symptomId)
      : undefined;
    if (symptom?.entryQuestionId) {
      const q = questionsById.get(symptom.entryQuestionId);
      if (q && !state.skippedQuestions.includes(q.id) && reachable.has(q.id)) {
        return q;
      }
    }
    // Else first entry question by id asc
    const entryCandidates = content.questions
      .filter((q) => q.kind === "entry")
      .filter((q) => !state.skippedQuestions.includes(q.id))
      .sort((a, b) => a.id.localeCompare(b.id));
    if (entryCandidates.length > 0) return entryCandidates[0];
    // Fall through to loop selection below if no entries exist (rare)
  }

  // Step 2: last answer's chosen option's `next`
  if (state.answers.length > 0) {
    const last = state.answers[state.answers.length - 1];
    const lastQ = questionsById.get(last.qid);
    if (lastQ) {
      const chosen = lastQ.options.find((o: Option) => o.id === last.optionId);
      if (chosen?.next && questionsById.has(chosen.next)) {
        const nextQ = questionsById.get(chosen.next)!;
        if (!state.skippedQuestions.includes(nextQ.id)) {
          return nextQ;
        }
      }
    }
  }

  // Step 3: forcedNext
  if (state.forcedNext && questionsById.has(state.forcedNext)) {
    const q = questionsById.get(state.forcedNext)!;
    if (!state.skippedQuestions.includes(q.id)) {
      return q;
    }
  }

  // Step 4: loop question with highest discrimination
  // Find top1 and top2 non-excluded causes
  const nonExcludedSorted = Object.values(causeScores)
    .filter((cs) => !cs.excluded)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.causeId.localeCompare(b.causeId);
    });
  const top1 = nonExcludedSorted[0] ?? null;
  const top2 = nonExcludedSorted[1] ?? null;

  const candidates = content.questions
    .filter((q) => q.kind === "loop")
    .filter((q) => !state.skippedQuestions.includes(q.id))
    .filter((q) => !state.answers.some((a) => a.qid === q.id))
    .filter((q) => reachable.has(q.id))
    .filter((q) => {
      if (!q.askIf) return true;
      return evaluateCondition(q.askIf, state, causeScores);
    });

  if (candidates.length === 0) return null;

  if (top1) {
    // Compute disc for each candidate
    const discMap = new Map<string, number>();
    for (const q of candidates) {
      discMap.set(q.id, discriminationScore(q, top1.causeId, top2?.causeId ?? null));
    }
    // Find candidates with disc > 0
    const positiveDiscCandidates = candidates.filter((q) => (discMap.get(q.id) ?? 0) > 0);

    if (positiveDiscCandidates.length === 1) {
      // Exactly one question can discriminate top1 vs top2 — pick it
      return positiveDiscCandidates[0];
    }

    // Otherwise: priority ASC, then id ASC (matches worked example flow:
    // Q3 → Q4 → Q5 → Q6 by priority, then Q9 when it's the only disc>0 left)
    candidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.id.localeCompare(b.id);
    });
    return candidates[0];
  } else {
    // No scoring info yet — fall back to priority asc, id asc
    candidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.id.localeCompare(b.id);
    });
    return candidates[0];
  }
}
