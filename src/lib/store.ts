"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ContentBundle,
  EngineState,
  Profile,
  CauseScore,
  SolutionScore,
  Question,
  Answer,
} from "@/lib/engine/types";
import {
  createInitialState,
  recordAnswer,
  applyRulesAfter,
  setSymptomAndProfile,
  getNextQuestion,
  shouldStop,
  scoreSolutions,
  getRankingForDisplay,
  getTopCauses,
} from "@/lib/engine";
import { loadContent, loadMessages, ENGINE_VERSION, CONTENT_VERSION } from "@/lib/content";

// ============================================================
// UI view-state types
// ============================================================

export type Screen =
  | "welcome" // screen 1
  | "symptom" // screen 2
  | "profile" // screen 3
  | "questions" // screen 4
  | "causes" // screen 5
  | "why" // screen 6 (five whys)
  | "solutions" // screen 7 (matrix)
  | "scenarios" // screen 7b (per-solution scenarios)
  | "plan" // screen 8
  | "followup" // screen 9
  | "plan_exported" // after export
  | "done";

export interface WhyAnswer {
  causeId: string;
  steps: { stepIndex: number; optionIndex: number }[];
}

export interface FollowUpState {
  executed: "yes" | "partial" | "no" | null;
  improved: "yes" | "partial" | "no" | null;
  metricValue?: number;
  notes?: string;
}

export interface JuzoorEvent {
  event: string;
  payload: Record<string, unknown>;
  ts: number;
}

// A snapshot of all cause scores at a single point in time (after an answer).
// Used by the mini cause-trajectory sparkline on the question screen.
export interface ScoreSnapshot {
  answerIndex: number;        // 0-based index into engine.answers
  qid: string;                // the question that was just answered
  scores: Record<string, number>; // causeId -> score (0..100), excluded/hidden causes omitted
}

// ============================================================
// Store
// ============================================================

interface JuzoorStore {
  // Session meta
  participantCode: string | null;
  consent: boolean | null;
  contentVersion: string;
  engineVersion: string;
  startedAt: number | null;

  // Active content bundle (study or project)
  domain: "study" | "project";
  content: ContentBundle | null;

  // Engine state (kept here for persistence)
  engine: EngineState;

  // UI navigation
  screen: Screen;
  previousScreen: Screen | null;

  // Question flow
  currentQuestion: Question | null;
  causeScores: Record<string, CauseScore>;
  solutionScores: SolutionScore[];
  selectedSolutionIds: string[];

  // Why-chain (five whys)
  whyAnswers: Record<string, WhyAnswer>;
  whyCurrentCauseId: string | null;
  whyStepIndex: number;

  // Weights for solution comparison
  weights: { wE: number; wA: number; wS: number; wF: number };

  // Plan
  planId: string | null;
  planSavedAt: number | null;
  planReviewDate: string | null; // ISO date

  // Follow-up
  followUp: FollowUpState;

  // Events (local log)
  events: JuzoorEvent[];

  // Score history (snapshots after each answer) — for the sparkline chart
  scoreHistory: ScoreSnapshot[];

  // ============================================================
  // Actions
  // ============================================================

  // Boot
  init: (domain?: "study" | "project") => void;
  resetAll: () => void;
  setConsent: (v: boolean) => void;
  generateParticipantCode: () => void;
  wipeData: () => void;
  setDomain: (d: "study" | "project") => void;

  // Research data export
  exportResearchData: () => string;

  // Navigation
  go: (screen: Screen) => void;
  back: () => void;

  // Setup
  pickSymptom: (symptomId: string) => void;
  setProfile: (profile: Profile) => void;
  startQuestions: () => void;

  // Q&A
  answerQuestion: (qid: string, optionId: string, durationMs?: number) => void;
  goToPreviousQuestion: () => void;
  recomputeFromAnswers: () => void;

  // Causes / Why
  openWhyForCause: (causeId: string) => void;
  recordWhyAnswer: (causeId: string, stepIndex: number, optionIndex: number) => void;
  finishWhy: () => void;
  goToSolutions: () => void;

  // Solutions
  setWeights: (w: { wE: number; wA: number; wS: number; wF: number }) => void;
  toggleSolution: (solutionId: string) => void;
  goToScenarios: () => void;
  goToPlan: () => void;

  // Plan
  savePlan: () => void;
  exportPlan: (format: "text" | "image" | "pdf") => void;

  // Follow-up
  submitFollowUp: (f: FollowUpState) => void;

  // Events
  logEvent: (event: string, payload?: Record<string, unknown>) => void;
}

// Deterministic participant code generator (no Math.random in the diagnostic flow,
// but participant codes are not part of the deterministic engine — they're just IDs).
function makeParticipantCode(): string {
  // Use a simple deterministic-ish code from timestamp + base36
  const ts = Date.now().toString(36).toUpperCase();
  return `JZ-${ts.slice(-6)}`;
}

const defaultWeights = { wE: 0.35, wA: 0.25, wS: 0.15, wF: 0.25 };

const initialState = () => ({
  participantCode: null as string | null,
  consent: null as boolean | null,
  contentVersion: CONTENT_VERSION,
  engineVersion: ENGINE_VERSION,
  startedAt: null as number | null,
  domain: "study" as "study" | "project",
  content: null as ContentBundle | null,
  engine: createInitialState({ version: "", symptoms: [], causes: [], questions: [], rules: [], solutions: [] }),
  screen: "welcome" as Screen,
  previousScreen: null as Screen | null,
  currentQuestion: null as Question | null,
  causeScores: {} as Record<string, CauseScore>,
  solutionScores: [] as SolutionScore[],
  selectedSolutionIds: [] as string[],
  whyAnswers: {} as Record<string, WhyAnswer>,
  whyCurrentCauseId: null as string | null,
  whyStepIndex: 0,
  weights: defaultWeights,
  planId: null as string | null,
  planSavedAt: null as number | null,
  planReviewDate: null as string | null,
  followUp: { executed: null, improved: null } as FollowUpState,
  events: [] as JuzoorEvent[],
  scoreHistory: [] as ScoreSnapshot[],
});

export const useJuzoor = create<JuzoorStore>()(
  persist(
    (set, get) => ({
      ...initialState(),

      // ============================================================
      // Boot
      // ============================================================
      init: (domain = "study") => {
        const content = loadContent(domain);
        const engine = createInitialState(content);
        set({
          domain,
          content,
          engine,
          screen: "welcome",
          previousScreen: null,
          currentQuestion: null,
          causeScores: {},
          solutionScores: [],
          selectedSolutionIds: [],
          whyAnswers: {},
          whyCurrentCauseId: null,
          whyStepIndex: 0,
          weights: defaultWeights,
          planId: null,
          planSavedAt: null,
          planReviewDate: null,
          followUp: { executed: null, improved: null },
          events: [],
          scoreHistory: [],
          startedAt: Date.now(),
        });
        get().logEvent("session_start", {
          contentVersion: CONTENT_VERSION,
          engineVersion: ENGINE_VERSION,
        });
      },

      resetAll: () => {
        set({ ...initialState() });
      },

      setConsent: (v) => {
        set({ consent: v });
        get().logEvent("consent_set", { consent: v });
      },

      generateParticipantCode: () => {
        if (!get().participantCode) {
          set({ participantCode: makeParticipantCode() });
        }
      },

      wipeData: () => {
        const code = get().participantCode;
        get().resetAll();
        if (code) set({ participantCode: code });
        try {
          localStorage.removeItem("juzoor.session.v1");
        } catch {}
      },

      setDomain: (d) => {
        set({ domain: d });
      },

      exportResearchData: () => {
        const state = get();
        const payload = {
          schema: "juzoor.research.v1",
          exportedAt: new Date().toISOString(),
          participantCode: state.participantCode,
          consent: state.consent,
          contentVersion: state.contentVersion,
          engineVersion: state.engineVersion,
          domain: state.domain,
          symptomId: state.engine.symptomId,
          profile: state.engine.profile,
          answers: state.engine.answers,
          causeScores: state.causeScores,
          whyAnswers: state.whyAnswers,
          weights: state.weights,
          selectedSolutionIds: state.selectedSolutionIds,
          planId: state.planId,
          planSavedAt: state.planSavedAt,
          planReviewDate: state.planReviewDate,
          followUp: state.followUp,
          events: state.events,
        };
        return JSON.stringify(payload, null, 2);
      },

      // ============================================================
      // Navigation
      // ============================================================
      go: (screen) => {
        set((s) => ({ previousScreen: s.screen, screen }));
      },
      back: () => {
        const prev = get().previousScreen;
        if (prev) {
          set((s) => ({ screen: prev, previousScreen: null }));
        }
      },

      // ============================================================
      // Setup
      // ============================================================
      pickSymptom: (symptomId) => {
        const state = get();
        if (!state.content) return;
        const engine = setSymptomAndProfile(state.engine, symptomId, state.engine.profile ?? { minutesPerDay: 30, urgent: false });
        set({ engine });
        get().logEvent("symptom_selected", { symptomId });
        get().go("profile");
      },

      setProfile: (profile) => {
        const state = get();
        const engine = setSymptomAndProfile(state.engine, state.engine.symptomId ?? "", profile);
        set({ engine });
        get().logEvent("profile_set", {
          minutesPerDay: profile.minutesPerDay,
          urgent: profile.urgent,
          alone: profile.alone,
        });
      },

      startQuestions: () => {
        const state = get();
        const { newState, causeScores } = applyRulesAfter(state.engine);
        const nextQuestion = getNextQuestion(newState, causeScores);
        set({
          engine: newState,
          currentQuestion: nextQuestion,
          causeScores,
          screen: "questions",
          previousScreen: "profile",
        });
      },

      // ============================================================
      // Q&A
      // ============================================================
      answerQuestion: (qid, optionId, durationMs) => {
        const state = get();
        const engine = recordAnswer(state.engine, qid, optionId);
        const { newState, causeScores } = applyRulesAfter(engine);
        const nextQuestion = getNextQuestion(newState, causeScores);
        const stop = shouldStop(newState, causeScores);
        get().logEvent("question_answered", { qid, optionId, ms: durationMs ?? 0 });

        // Snapshot the scores for the trajectory sparkline
        const snapshot: ScoreSnapshot = {
          answerIndex: newState.answers.length - 1,
          qid,
          scores: Object.fromEntries(
            Object.entries(causeScores)
              .filter(([, cs]) => !cs.excluded && cs.score > 0)
              .map(([id, cs]) => [id, cs.score]),
          ),
        };
        const scoreHistory = [...state.scoreHistory, snapshot];

        if (stop.stop) {
          // Move to causes screen with top 3
          const top = getRankingForDisplay(causeScores);
          get().logEvent("results_shown", {
            topCauses: top.map((t) => ({ id: t.causeId, score: t.score })),
            questionCount: newState.answers.length,
            unknownCount: newState.answers.filter(
              (a) => {
                const q = newState.content.questions.find((x) => x.id === a.qid);
                return q?.options.find((o) => o.id === a.optionId)?.isUnknown;
              },
            ).length,
          });
          set({
            engine: newState,
            causeScores,
            scoreHistory,
            currentQuestion: null,
            screen: "causes",
            previousScreen: "questions",
          });
        } else {
          set({
            engine: newState,
            causeScores,
            scoreHistory,
            currentQuestion: nextQuestion,
          });
        }
      },

      goToPreviousQuestion: () => {
        const state = get();
        if (state.engine.answers.length === 0) return;
        // Remove the last answer and recompute
        const newAnswers = state.engine.answers.slice(0, -1);
        const engine: EngineState = {
          ...state.engine,
          answers: newAnswers,
          // We don't roll back rules fired / extras for simplicity (user is notified)
          forcedNext: null,
        };
        const { newState, causeScores } = applyRulesAfter(engine);
        const nextQuestion = getNextQuestion(newState, causeScores);
        // Pop the last score snapshot
        const scoreHistory = state.scoreHistory.slice(0, -1);
        set({
          engine: newState,
          causeScores,
          scoreHistory,
          currentQuestion: nextQuestion,
        });
        get().logEvent("back_pressed", { remainingAnswers: newAnswers.length });
      },

      recomputeFromAnswers: () => {
        const state = get();
        const { newState, causeScores } = applyRulesAfter(state.engine);
        set({ engine: newState, causeScores });
      },

      // ============================================================
      // Causes / Why
      // ============================================================
      openWhyForCause: (causeId) => {
        set({ whyCurrentCauseId: causeId, whyStepIndex: 0, screen: "why", previousScreen: "causes" });
        get().logEvent("why_opened", { targetId: causeId });
      },

      recordWhyAnswer: (causeId, stepIndex, optionIndex) => {
        const state = get();
        const existing = state.whyAnswers[causeId] ?? { causeId, steps: [] };
        const steps = [...existing.steps];
        const idx = steps.findIndex((s) => s.stepIndex === stepIndex);
        if (idx >= 0) steps[idx] = { stepIndex, optionIndex };
        else steps.push({ stepIndex, optionIndex });
        const whyAnswers = { ...state.whyAnswers, [causeId]: { causeId, steps } };

        // Apply the option's evidence to engine (extraEvidence)
        const cause = state.content?.causes.find((c) => c.id === causeId);
        const whyStep = cause?.whyChain?.[stepIndex];
        const opt = whyStep?.options[optionIndex];
        let engine = state.engine;
        if (opt?.evidence) {
          const extraEvidence = { ...engine.extraEvidence };
          for (const [cid, w] of Object.entries(opt.evidence)) {
            extraEvidence[cid] = (extraEvidence[cid] ?? 0) + w;
          }
          engine = { ...engine, extraEvidence };
        }
        const { newState, causeScores } = applyRulesAfter(engine);
        set({ whyAnswers, engine: newState, causeScores, whyStepIndex: stepIndex + 1 });
      },

      finishWhy: () => {
        get().logEvent("why_chain_done", {
          steps: get().whyAnswers[get().whyCurrentCauseId ?? ""]?.steps.length ?? 0,
        });
        set({ screen: "causes", previousScreen: "why", whyCurrentCauseId: null });
      },

      goToSolutions: () => {
        const state = get();
        const solScores = scoreSolutions(state.engine, state.causeScores, state.weights);
        const top3 = solScores.slice(0, 3);
        set({
          solutionScores: solScores,
          selectedSolutionIds: top3.map((s) => s.solutionId),
          screen: "solutions",
          previousScreen: "causes",
        });
        get().logEvent("solutions_viewed", {
          top3: top3.map((s) => ({ id: s.solutionId, score: s.score, priority: s.priority })),
        });
      },

      // ============================================================
      // Solutions
      // ============================================================
      setWeights: (w) => {
        const sum = w.wE + w.wA + w.wS + w.wF;
        const norm = { wE: w.wE / sum, wA: w.wA / sum, wS: w.wS / sum, wF: w.wF / sum };
        const state = get();
        const solScores = scoreSolutions(state.engine, state.causeScores, norm);
        set({ weights: norm, solutionScores: solScores });
        get().logEvent("weights_changed", norm);
      },

      toggleSolution: (solutionId) => {
        const state = get();
        const ids = state.selectedSolutionIds.includes(solutionId)
          ? state.selectedSolutionIds.filter((id) => id !== solutionId)
          : [...state.selectedSolutionIds, solutionId];
        set({ selectedSolutionIds: ids });
      },

      goToScenarios: () => {
        set({ screen: "scenarios", previousScreen: "solutions" });
      },

      goToPlan: () => {
        const state = get();
        const reviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        set({
          screen: "plan",
          previousScreen: "scenarios",
          planReviewDate: reviewDate,
        });
      },

      // ============================================================
      // Plan
      // ============================================================
      savePlan: () => {
        const id = `PLAN-${Date.now().toString(36).toUpperCase().slice(-6)}`;
        set({ planId: id, planSavedAt: Date.now() });
        get().logEvent("plan_saved", { planId: id });
      },

      exportPlan: (format) => {
        get().logEvent("plan_exported", { format });
      },

      // ============================================================
      // Follow-up
      // ============================================================
      submitFollowUp: (f) => {
        set({ followUp: f, screen: "done", previousScreen: "followup" });
        get().logEvent("followup_submitted", {
          stepsDone: 0,
          stepsTotal: 0,
          improved: f.improved,
          metricValue: f.metricValue,
        });
      },

      // ============================================================
      // Events
      // ============================================================
      logEvent: (event, payload = {}) => {
        const ev: JuzoorEvent = { event, payload, ts: Date.now() };
        set((s) => ({ events: [...s.events, ev].slice(-200) }));
      },
    }),
    {
      name: "juzoor.session.v1",
      storage: createJSONStorage(() => localStorage),
      // Persist only the parts that should survive reload
      partialize: (s) => ({
        participantCode: s.participantCode,
        consent: s.consent,
        contentVersion: s.contentVersion,
        engineVersion: s.engineVersion,
        startedAt: s.startedAt,
        domain: s.domain,
        engine: s.engine,
        screen: s.screen,
        previousScreen: s.previousScreen,
        currentQuestion: s.currentQuestion,
        causeScores: s.causeScores,
        solutionScores: s.solutionScores,
        selectedSolutionIds: s.selectedSolutionIds,
        whyAnswers: s.whyAnswers,
        whyCurrentCauseId: s.whyCurrentCauseId,
        whyStepIndex: s.whyStepIndex,
        weights: s.weights,
        planId: s.planId,
        planSavedAt: s.planSavedAt,
        planReviewDate: s.planReviewDate,
        followUp: s.followUp,
        events: s.events,
        scoreHistory: s.scoreHistory,
      }),
      // On rehydrate, re-load the content bundle (it's not serializable cleanly)
      onRehydrateStorage: () => (state) => {
        if (state) {
          try {
            state.content = loadContent(state.domain);
          } catch {
            // ignore
          }
        }
      },
    },
  ),
);

// Re-export for convenience
export { loadMessages };
