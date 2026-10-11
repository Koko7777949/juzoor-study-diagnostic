// ============================================================
// Juzoor Engine — Cause Scoring
// Pure function: computes CauseScore for every cause in the content bundle.
//
// Formula (verified against worked example §9):
//   For each reachable question Q containing cause c (in any option):
//     n(c) += 1
//     If Q answered:
//       raw(c) += chosen option's weight for c (skip if chosen is `unk`)
//       max(c) += maxPositiveWeight(Q, c)
//       If chosen option's weight for c is negative:
//         max(c) += |weight|   (negative-chosen bonus)
//     If Q unanswered:
//       Let k = number of options in Q with c evidence (positive or negative)
//       If k >= 3: max(c) += maxPositiveWeight(Q, c)
//       If k == 2: max(c) += 1
//       If k <= 1: max(c) += 0
//   Plus priors (raw += p, max += max(p,0), n += 1)
//   Plus fired rules with addEvidence (raw += w, max += max(w,0), n += 1)
//   score(c) = max>0 ? clamp(raw/max, 0, 1) × 100 × min(1, n/3) : 0
//   Excluded cause → score 0
// ============================================================

import type {
  CauseScore,
  Contribution,
  EngineState,
  Question,
  Symptom,
} from "./types";

/**
 * Check if a question contains the given cause in any of its options.
 */
function questionHasCause(q: Question, causeId: string): boolean {
  return q.options.some((o) => Object.prototype.hasOwnProperty.call(o.evidence, causeId));
}

/**
 * Maximum positive weight for a cause across all options of a question.
 * Returns 0 if no option has positive evidence for the cause.
 */
function maxPositiveWeightForCauseInQuestion(q: Question, causeId: string): number {
  let max = 0;
  for (const o of q.options) {
    const w = o.evidence[causeId];
    if (typeof w === "number" && w > max) max = w;
  }
  return max;
}

/**
 * Number of options in Q that have c evidence (positive or negative, excluding `unk`).
 */
function countOptionsWithCauseEvidence(q: Question, causeId: string): number {
  let count = 0;
  for (const o of q.options) {
    if (o.isUnknown) continue;
    if (Object.prototype.hasOwnProperty.call(o.evidence, causeId)) count += 1;
  }
  return count;
}

/**
 * Determine which questions are reachable from the user's current path.
 * Reachable = entry questions on the user's path (via next-pointers) + all loop questions.
 */
function reachableQuestionIds(state: EngineState): Set<string> {
  const content = state.content;
  const reachable = new Set<string>();
  const questionsById = new Map(content.questions.map((q) => [q.id, q] as const));

  const symptom = state.symptomId
    ? content.symptoms.find((s) => s.id === state.symptomId)
    : undefined;
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

  // All loop questions are always reachable once the user has any answer
  for (const q of content.questions) {
    if (q.kind === "loop") reachable.add(q.id);
  }

  return reachable;
}

/**
 * Score every cause based on the current engine state.
 */
export function scoreCauses(state: EngineState): Record<string, CauseScore> {
  const content = state.content;
  const symptom: Symptom | undefined = state.symptomId
    ? content.symptoms.find((s) => s.id === state.symptomId)
    : undefined;
  const priors: Record<string, number> = symptom?.priors ?? {};

  const questionsById = new Map<string, Question>();
  for (const q of content.questions) questionsById.set(q.id, q);

  const answeredQids = new Set(state.answers.map((a) => a.qid));
  const reachable = reachableQuestionIds(state);

  // Track fired-rule evidence
  type RuleEvidence = { ruleId: string; causeId: string; weight: number; explain_ar: string };
  const ruleEvidence: RuleEvidence[] = [];
  for (const rf of state.rulesFired) {
    const rule = content.rules.find((r) => r.id === rf.ruleId);
    if (!rule) continue;
    const actions = rf.branch === "then" ? rule.then : rule.else ?? [];
    for (const a of actions) {
      if ("addEvidence" in a) {
        ruleEvidence.push({
          ruleId: rule.id,
          causeId: a.addEvidence.cause,
          weight: a.addEvidence.weight,
          explain_ar: rule.explain_ar,
        });
      }
    }
  }

  const scores: Record<string, CauseScore> = {};

  for (const cause of content.causes) {
    const c = cause.id;
    let raw = 0;
    let max = 0;
    let n = 0;
    const contributions: Contribution[] = [];

    // 1) Priors
    if (Object.prototype.hasOwnProperty.call(priors, c)) {
      const w = priors[c];
      raw += w;
      max += Math.max(w, 0);
      n += 1;
      if (symptom) {
        contributions.push({
          qid: "priors",
          optionId: symptom.id,
          weight: w,
          questionLabel_ar: "العرض الظاهر",
          optionLabel_ar: symptom.label_ar,
          isPrior: true,
        });
      }
    }

    // 2) Reachable questions containing c (answered OR unanswered)
    for (const q of content.questions) {
      if (!reachable.has(q.id)) continue;
      if (!questionHasCause(q, c)) continue;

      n += 1;
      const isAnswered = answeredQids.has(q.id);

      if (isAnswered) {
        const ans = state.answers.find((a) => a.qid === q.id);
        const chosen = ans ? q.options.find((o) => o.id === ans.optionId) : undefined;

        // max positive weight for c across all options of q
        const maxPos = maxPositiveWeightForCauseInQuestion(q, c);
        max += maxPos;

        if (chosen && !chosen.isUnknown) {
          const w = chosen.evidence[c];
          if (typeof w === "number") {
            raw += w;
            // Negative-chosen bonus: increase max by |negative chosen weight|
            if (w < 0) max += Math.abs(w);
            contributions.push({
              qid: q.id,
              optionId: chosen.id,
              weight: w,
              questionLabel_ar: q.text_ar,
              optionLabel_ar: chosen.label_ar,
            });
          } else {
            contributions.push({
              qid: q.id,
              optionId: chosen.id,
              weight: 0,
              questionLabel_ar: q.text_ar,
              optionLabel_ar: chosen.label_ar,
            });
          }
        } else if (chosen && chosen.isUnknown) {
          contributions.push({
            qid: q.id,
            optionId: chosen.id,
            weight: 0,
            questionLabel_ar: q.text_ar,
            optionLabel_ar: chosen.label_ar,
          });
        }
      } else {
        // Unanswered: contribute based on number of options with c evidence
        const k = countOptionsWithCauseEvidence(q, c);
        if (k >= 3) {
          max += maxPositiveWeightForCauseInQuestion(q, c);
        } else if (k === 2) {
          max += 1;
        }
        // k <= 1: contribute 0
      }
    }

    // 3) Fired rules adding evidence for c
    for (const re of ruleEvidence) {
      if (re.causeId !== c) continue;
      raw += re.weight;
      max += Math.max(re.weight, 0);
      n += 1;
      contributions.push({
        qid: re.ruleId,
        optionId: re.ruleId,
        weight: re.weight,
        questionLabel_ar: `قاعدة ${re.ruleId}`,
        optionLabel_ar: re.explain_ar,
        isRule: true,
        ruleId: re.ruleId,
        ruleExplain_ar: re.explain_ar,
      });
    }

    // Excluded → score 0
    const excluded = state.excludedCauses.includes(c);
    let score: number;
    if (excluded) {
      score = 0;
    } else if (max > 0) {
      const ratio = Math.max(0, Math.min(1, raw / max));
      const nf = Math.min(1, n / 3);
      score = Math.round(ratio * 100 * nf);
    } else {
      score = 0;
    }

    let confidence: "high" | "medium" | "low";
    if (excluded) {
      confidence = "low";
    } else if (score >= 70) {
      confidence = "high";
    } else if (score >= 40) {
      confidence = "medium";
    } else {
      confidence = "low";
    }

    scores[c] = {
      causeId: c,
      raw,
      max,
      n,
      score,
      confidence,
      excluded,
      contributions,
    };
  }

  return scores;
}

// Convenience: contributions sorted by absolute weight desc.
export function sortContributionsByAbsWeight(contribs: Contribution[]): Contribution[] {
  return [...contribs].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}
