// ============================================================
// Juzoor Engine — Zod v4 Schemas
// Mirrors /src/lib/engine/types.ts. All content JSON is validated
// against these schemas before use at runtime.
// ============================================================

import { z } from "zod/v4";

// --- Domain ---
export const DomainSchema = z.enum(["study", "project"]);
export type DomainT = z.infer<typeof DomainSchema>;

// --- Profile ---
export const ProfileSchema = z.object({
  minutesPerDay: z.enum(["15", "30", "60", "90"]).transform((v) => Number(v) as 15 | 30 | 60 | 90),
  urgent: z.boolean(),
  alone: z.boolean().optional(),
});

// --- Why-step (inside Cause) ---
const WhyStepOptionSchema = z.object({
  label_ar: z.string().min(1),
  evidence: z.record(z.string(), z.number()),
});

export const WhyStepSchema = z.object({
  prompt_ar: z.string().min(1),
  options: z.array(WhyStepOptionSchema).min(1),
});

// --- Symptom ---
export const SymptomSchema = z.object({
  id: z.string().min(1),
  domain: DomainSchema,
  label_ar: z.string().min(1),
  description_ar: z.string().optional(),
  entryQuestionId: z.string().optional(),
  priors: z.record(z.string(), z.number()).optional(),
  icon: z.string().optional(),
});

// --- Cause ---
export const CauseSchema = z.object({
  id: z.string().min(1),
  domain: DomainSchema,
  label_ar: z.string().min(1),
  branch: z.string().min(1),
  description_ar: z.string().min(1),
  whyChain: z.array(WhyStepSchema).optional(),
});

// --- Option (inside Question) ---
export const OptionSchema = z.object({
  id: z.string().min(1),
  label_ar: z.string().min(1),
  evidence: z.record(z.string(), z.number()),
  next: z.string().optional(),
  isUnknown: z.boolean().optional(),
  flags: z.array(z.string()).optional(),
});

// --- Condition (recursive) ---
// z.lazy() is required because Condition references itself.
export const ConditionSchema: z.ZodType<
  | { all: unknown[] }
  | { any: unknown[] }
  | { not: unknown }
  | { answered: { q: string; option: string } }
  | { profile: { field: string; op: "==" | "<" | ">" | ">="; value: number | boolean | string } }
  | { flag: string }
  | { causeScore: { id: string; op: "<" | ">" | ">="; value: number } }
> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(ConditionSchema) }),
    z.object({ any: z.array(ConditionSchema) }),
    z.object({ not: ConditionSchema }),
    z.object({
      answered: z.object({
        q: z.string().min(1),
        option: z.string().min(1),
      }),
    }),
    z.object({
      profile: z.object({
        field: z.string().min(1),
        op: z.enum(["==", "<", ">", ">="]),
        value: z.union([z.number(), z.boolean(), z.string()]),
      }),
    }),
    z.object({ flag: z.string().min(1) }),
    z.object({
      causeScore: z.object({
        id: z.string().min(1),
        op: z.enum(["<", ">", ">="]),
        value: z.number(),
      }),
    }),
  ]),
);

// --- Action ---
export const ActionSchema = z.union([
  z.object({ addEvidence: z.object({ cause: z.string().min(1), weight: z.number() }) }),
  z.object({ excludeCause: z.string().min(1) }),
  z.object({ skipQuestion: z.string().min(1) }),
  z.object({ forceQuestion: z.string().min(1) }),
  z.object({ setFit: z.object({ solution: z.string().min(1), value: z.number() }) }),
  z.object({ showMessage: z.string().min(1) }),
]);

// --- Rule ---
export const RuleSchema = z.object({
  id: z.string().min(1),
  if: ConditionSchema,
  then: z.array(ActionSchema),
  else: z.array(ActionSchema).optional(),
  explain_ar: z.string().min(1),
});

// --- Question ---
export const QuestionSchema = z.object({
  id: z.string().min(1),
  domain: DomainSchema,
  kind: z.enum(["entry", "loop"]),
  text_ar: z.string().min(1),
  help_ar: z.string().optional(),
  askIf: ConditionSchema.optional(),
  priority: z.number().int().nonnegative(),
  options: z.array(OptionSchema).min(1),
});

// --- Solution ---
const RatingSchema = z.number().int().min(1).max(5);

export const SolutionSchema = z.object({
  id: z.string().min(1),
  label_ar: z.string().min(1),
  causeIds: z.array(z.string().min(1)).min(1),
  ratings: z.object({
    effectiveness: RatingSchema,
    ease: RatingSchema,
    speed: RatingSchema,
  }),
  dailyMinutes: z.number().nonnegative(),
  needsTeam: z.boolean().optional(),
  scenarios: z.object({
    best_ar: z.string().min(1),
    expected_ar: z.string().min(1),
    worst_ar: z.string().min(1),
    successConditions_ar: z.array(z.string().min(1)).min(1),
  }),
  steps_ar: z.array(z.string().min(1)).min(1),
  successMetric_ar: z.string().min(1),
  reviewStatus: z.enum(["draft", "reviewed"]),
});

// --- ContentBundle ---
export const ContentBundleSchema = z.object({
  version: z.string().min(1),
  symptoms: z.array(SymptomSchema),
  causes: z.array(CauseSchema),
  questions: z.array(QuestionSchema),
  rules: z.array(RuleSchema),
  solutions: z.array(SolutionSchema),
});

// --- UI text bundles ---
export const ExplainTextSchema = z.object({
  causeHeader: z.string(),
  causeTemplate: z.string(),
  solutionHeader: z.string(),
  solutionTemplate: z.string(),
  lowConfidence: z.string(),
  notDiagnosis: z.string(),
  finalDecisionNote: z.string(),
});

export const MessagesSchema = z.record(z.string(), z.string());

// --- Helpers ---
import type { ContentBundle } from "./types";

/**
 * Validate an unknown object as a ContentBundle. Returns true/false.
 * Does not throw.
 */
export function validateContent(input: unknown): boolean {
  return ContentBundleSchema.safeParse(input).success;
}

/**
 * Strictly parse an unknown object as a ContentBundle. Throws on invalid.
 */
export function parseContent(input: unknown): ContentBundle {
  const result = ContentBundleSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid content bundle:\n${issues}`);
  }
  return result.data as ContentBundle;
}
