// ============================================================
// Juzoor Engine — Type Definitions
// Mirrors the data schema in the requirements doc §7
// All content in /content JSON files; types here are validated by Zod.
// ============================================================

export type Domain = "study" | "project";

// Profile (Screen 3)
export interface Profile {
  minutesPerDay: 15 | 30 | 60 | 90;
  urgent: boolean;
  alone?: boolean;
}

// Symptom (Screen 2) — what the user picks as their visible problem
export interface Symptom {
  id: string;
  domain: Domain;
  label_ar: string;
  description_ar?: string;
  entryQuestionId?: string;
  priors?: Record<string, number>;
  icon?: string;
}

// Cause (Screen 5) — a probable root cause
export interface Cause {
  id: string;
  domain: Domain;
  label_ar: string;
  branch: string; // thickness-branch name (Ishikawa)
  description_ar: string;
  whyChain?: WhyStep[];
}

// Five-Whys step
export interface WhyStep {
  prompt_ar: string;
  options: {
    label_ar: string;
    evidence: Record<string, number>;
  }[];
}

// Option inside a Question
export interface Option {
  id: string;
  label_ar: string;
  evidence: Record<string, number>; // causeId -> weight (range -3..+3)
  next?: string;
  isUnknown?: boolean;
  flags?: string[];
}

// Question
export interface Question {
  id: string;
  domain: Domain;
  kind: "entry" | "loop";
  text_ar: string;
  help_ar?: string;
  askIf?: Condition;
  priority: number;
  options: Option[];
}

// Solution (Screen 7-8)
export interface Solution {
  id: string;
  label_ar: string;
  causeIds: string[];
  ratings: {
    effectiveness: 1 | 2 | 3 | 4 | 5;
    ease: 1 | 2 | 3 | 4 | 5;
    speed: 1 | 2 | 3 | 4 | 5;
  };
  dailyMinutes: number;
  needsTeam?: boolean;
  scenarios: {
    best_ar: string;
    expected_ar: string;
    worst_ar: string;
    successConditions_ar: string[];
  };
  steps_ar: string[];
  successMetric_ar: string;
  reviewStatus: "draft" | "reviewed";
}

export interface Rule {
  id: string;
  if: Condition;
  then: Action[];
  else?: Action[];
  explain_ar: string;
}

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { answered: { q: string; option: string } }
  | { profile: { field: string; op: "==" | "<" | ">" | ">="; value: number | boolean | string } }
  | { flag: string }
  | { causeScore: { id: string; op: "<" | ">" | ">="; value: number } };

export type Action =
  | { addEvidence: { cause: string; weight: number } }
  | { excludeCause: string }
  | { skipQuestion: string }
  | { forceQuestion: string }
  | { setFit: { solution: string; value: number } }
  | { showMessage: string };

export interface ContentBundle {
  version: string;
  symptoms: Symptom[];
  causes: Cause[];
  questions: Question[];
  rules: Rule[];
  solutions: Solution[];
}

// ============================================================
// Engine runtime types
// ============================================================

export interface Answer {
  qid: string;
  optionId: string;
  timestampMs?: number;
}

export interface CauseScore {
  causeId: string;
  raw: number;
  max: number;
  n: number;
  score: number;
  confidence: "high" | "medium" | "low";
  excluded: boolean;
  contributions: Contribution[];
}

export interface Contribution {
  qid: string;
  optionId: string;
  weight: number;
  questionLabel_ar: string;
  optionLabel_ar: string;
  isPrior?: boolean;
  isRule?: boolean;
  ruleId?: string;
  ruleExplain_ar?: string;
}

export interface RuleFired {
  ruleId: string;
  branch: "then" | "else";
  explain_ar: string;
}

export interface SolutionScore {
  solutionId: string;
  score: number;
  priority: number;
  fit: number;
  E: number;
  A: number;
  S: number;
  causeIds: string[];
  fitReasons: string[];
}

export interface EngineState {
  content: ContentBundle;
  symptomId: string | null;
  profile: Profile | null;
  answers: Answer[];
  flags: string[];
  excludedCauses: string[];
  extraEvidence: Record<string, number>;
  forcedNext: string | null;
  skippedQuestions: string[];
  setFitValues: Record<string, number>;
  rulesFired: RuleFired[];
  messages: string[];
}

export type StopReason =
  | { kind: "clear_winner"; topScore: number; gap: number }
  | { kind: "max_questions"; count: number }
  | { kind: "no_eligible_question" }
  | { kind: "ambiguous_low"; topScore: number; secondScore: number; gap: number };

export interface StopResult {
  stop: boolean;
  reason?: StopReason;
}

export interface NextQuestionResult {
  nextQuestion: Question | null;
  causeScores: Record<string, CauseScore>;
  rulesFired: RuleFired[];
  messages: string[];
}

export interface ExplainText {
  causeHeader: string;
  causeTemplate: string;
  solutionHeader: string;
  solutionTemplate: string;
  lowConfidence: string;
  notDiagnosis: string;
  finalDecisionNote: string;
}
