// ============================================================
// Juzoor Content Loader
// Loads JSON content files per domain, validates with Zod.
// All loading is synchronous (Next.js JSON imports).
// ============================================================

import type { ContentBundle, Domain, ExplainText, Profile, Symptom, Cause, Question, Rule, Solution } from "./engine/types";
import { parseContent, ExplainTextSchema, MessagesSchema } from "./engine/schemas";

export const ENGINE_VERSION = "1.0.0";
export const CONTENT_VERSION = "1.0.0";

// --- JSON imports ---
// study domain
import studySymptoms from "../../content/study/symptoms.json";
import studyCauses from "../../content/study/causes.json";
import studyQuestions from "../../content/study/questions.json";
import studyRules from "../../content/study/rules.json";
import studySolutions from "../../content/study/solutions.json";

// project domain
import projectSymptoms from "../../content/project/symptoms.json";
import projectCauses from "../../content/project/causes.json";
import projectQuestions from "../../content/project/questions.json";
import projectRules from "../../content/project/rules.json";
import projectSolutions from "../../content/project/solutions.json";

// ui
import explainJson from "../../content/ui/explain.json";
import messagesJson from "../../content/ui/messages.json";

function wrapError(domain: Domain, file: string, err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  return new Error(`[juzoor] Failed to load content for domain "${domain}" (${file}): ${msg}`);
}

/**
 * Load and validate the full content bundle for a domain.
 * Throws a clear error if any file is missing or invalid.
 */
export function loadContent(domain: Domain): ContentBundle {
  try {
    let symptoms: Symptom[];
    let causes: Cause[];
    let questions: Question[];
    let rules: Rule[];
    let solutions: Solution[];

    if (domain === "study") {
      symptoms = studySymptoms as unknown as Symptom[];
      causes = studyCauses as unknown as Cause[];
      questions = studyQuestions as unknown as Question[];
      rules = studyRules as unknown as Rule[];
      solutions = studySolutions as unknown as Solution[];
    } else if (domain === "project") {
      symptoms = projectSymptoms as unknown as Symptom[];
      causes = projectCauses as unknown as Cause[];
      questions = projectQuestions as unknown as Question[];
      rules = projectRules as unknown as Rule[];
      solutions = projectSolutions as unknown as Solution[];
    } else {
      throw new Error(`Unknown domain: ${domain as string}`);
    }

    const bundle: ContentBundle = {
      version: CONTENT_VERSION,
      symptoms,
      causes,
      questions,
      rules,
      solutions,
    };

    try {
      return parseContent(bundle);
    } catch (e) {
      throw wrapError(domain, "schema validation", e);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("[juzoor]")) throw e;
    throw wrapError(domain, "loadContent", e);
  }
}

/**
 * Load the UI "why" explanation text bundle.
 */
export function loadExplainText(): ExplainText {
  const result = ExplainTextSchema.safeParse(explainJson);
  if (!result.success) {
    throw new Error(
      `[juzoor] Invalid explain.json: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
  return result.data as ExplainText;
}

/**
 * Load the UI messages map.
 */
export function loadMessages(): Record<string, string> {
  const result = MessagesSchema.safeParse(messagesJson);
  if (!result.success) {
    throw new Error(
      `[juzoor] Invalid messages.json: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
  return result.data as Record<string, string>;
}
