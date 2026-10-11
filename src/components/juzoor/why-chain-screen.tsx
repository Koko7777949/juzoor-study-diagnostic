"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Search,
} from "lucide-react";
import { useJuzoor } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { CauseScore } from "@/lib/engine/types";

export function WhyChainScreen() {
  const prefersReducedMotion = useReducedMotion();

  const content = useJuzoor((s) => s.content);
  const whyCurrentCauseId = useJuzoor((s) => s.whyCurrentCauseId);
  const whyAnswers = useJuzoor((s) => s.whyAnswers);
  const whyStepIndex = useJuzoor((s) => s.whyStepIndex);
  const causeScores = useJuzoor((s) => s.causeScores);
  const recordWhyAnswer = useJuzoor((s) => s.recordWhyAnswer);
  const finishWhy = useJuzoor((s) => s.finishWhy);

  // Capture the cause's score when the why-chain screen first opens, so we
  // can show a "before → after" delta in the completion card. The capture
  // resets whenever the active causeId changes (i.e. each new visit).
  const [initialScore, setInitialScore] = React.useState(0);
  const capturedForRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!whyCurrentCauseId) {
      capturedForRef.current = null;
      return;
    }
    if (capturedForRef.current !== whyCurrentCauseId) {
      const cs = causeScores[whyCurrentCauseId];
      setInitialScore(cs ? cs.score : 0);
      capturedForRef.current = whyCurrentCauseId;
    }
  }, [whyCurrentCauseId, causeScores]);

  if (!content || !whyCurrentCauseId) return null;

  const cause = content.causes.find((c) => c.id === whyCurrentCauseId);
  if (!cause || !cause.whyChain || cause.whyChain.length === 0) {
    return null;
  }

  const chain = cause.whyChain;
  const answers = whyAnswers[whyCurrentCauseId]?.steps ?? [];
  const completed = answers.length >= chain.length;

  // The active step is the first step without an answer.
  const firstUnanswered = chain.findIndex(
    (_, i) => !answers.some((a) => a.stepIndex === i),
  );
  // If the store's whyStepIndex is below firstUnanswered (e.g., user reopened a previously
  // explored cause), prefer firstUnanswered. Otherwise use whyStepIndex clamped.
  const activeStep = Math.min(
    chain.length - 1,
    firstUnanswered === -1 ? chain.length - 1 : Math.max(firstUnanswered, whyStepIndex),
  );

  // Current step counter (1-based) reflects the step the user is currently
  // answering, or the total when all are done.
  const currentStepNum = completed ? chain.length : activeStep + 1;
  const totalSteps = chain.length;
  const progressPct = (currentStepNum / totalSteps) * 100;

  const causeScore: CauseScore | undefined = causeScores[whyCurrentCauseId];
  const currentScore = causeScore ? causeScore.score : 0;
  const scoreDelta = currentScore - initialScore;

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">
      <header className="flex flex-col gap-1.5 pt-2">
        <h1 className="text-2xl font-bold text-app-text leading-snug">نتعمق بـ ليه؟</h1>
        <p className="text-sm text-app-secondary leading-relaxed">
          خمس خطوات لنفهم السبب أكتر
        </p>
      </header>

      {/* Cause info card — gradient background, prominent */}
      <section
        aria-label="السبب الحالي"
        className="bg-card-gradient shadow-card-soft border border-app-primary/15 rounded-2xl p-4 flex items-start gap-3"
      >
        <span className="shrink-0 size-10 rounded-xl bg-app-primary/15 text-app-primary flex items-center justify-center">
          <Search className="size-5" aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-app-text leading-snug">
              {cause.label_ar}
            </h2>
            {causeScore && !causeScore.excluded && (
              <Badge
                variant="outline"
                className="text-[11px] font-bold tabular-nums bg-app-primary/5 border-app-primary/30 text-app-primary"
                aria-label={`الدرجة الحالية ${currentScore} من 100`}
              >
                {currentScore}%
              </Badge>
            )}
          </div>
          <p className="text-xs text-app-secondary leading-relaxed">
            {cause.branch}
          </p>
        </div>
      </section>

      {/* Progress indicator */}
      <div className="flex flex-col gap-1.5">
        <Progress
          value={progressPct}
          className="bg-app-muted h-1.5"
          aria-label={`الخطوة ${currentStepNum} من ${totalSteps}`}
        />
        <p className="text-xs text-app-secondary leading-relaxed tabular-nums">
          الخطوة <span className="font-bold text-app-text tabular-nums">{currentStepNum}</span>{" "}
          من <span className="font-bold text-app-text tabular-nums">{totalSteps}</span>
        </p>
      </div>

      {/* Timeline */}
      <ol className="flex flex-col gap-4">
        {chain.map((step, stepIdx) => {
          const answeredOptIndex = answers.find(
            (a) => a.stepIndex === stepIdx,
          )?.optionIndex;
          const isAnswered = answeredOptIndex !== undefined;
          // Active = this step is the next-to-answer (not yet answered) AND not completed
          const isActive = !isAnswered && stepIdx === activeStep && !completed;
          const isFuture = !isAnswered && !isActive;

          return (
            <li
              key={stepIdx}
              className="relative flex flex-col gap-2 ps-10 md:ps-12"
            >
              {/* Vertical connector — primary tinted */}
              {stepIdx < chain.length - 1 && (
                <span
                  className="absolute top-10 md:top-12 start-5 md:start-6 w-px h-[calc(100%-1.5rem)] bg-app-primary/20"
                  aria-hidden="true"
                />
              )}
              {/* Numbered circle */}
              <StepCircle
                stepIdx={stepIdx}
                isAnswered={isAnswered}
                isActive={isActive}
                isFuture={isFuture}
                prefersReducedMotion={prefersReducedMotion}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={stepIdx}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex flex-col gap-3 ${isActive ? "" : "opacity-95"}`}
                >
                  {/* Prompt inside a gradient card */}
                  <div className="bg-card-gradient shadow-card-soft border border-border rounded-xl p-3">
                    <p className="text-base font-semibold text-app-text leading-snug">
                      {step.prompt_ar}
                    </p>
                  </div>

                  {isActive && (
                    <div className="flex flex-col gap-2">
                      {step.options.map((opt, optIdx) => (
                        <WhyOptionButton
                          key={optIdx}
                          label={opt.label_ar}
                          onClick={() =>
                            recordWhyAnswer(whyCurrentCauseId, stepIdx, optIdx)
                          }
                          prefersReducedMotion={prefersReducedMotion}
                        />
                      ))}
                    </div>
                  )}

                  {isAnswered && (
                    <div className="bg-app-success/10 border-2 border-app-success/40 rounded-xl px-3 py-2 text-sm text-app-text flex items-start gap-2">
                      <Check
                        className="size-4 text-app-success shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-app-secondary">إجابتك: </span>
                        <span className="font-semibold">
                          {step.options[answeredOptIndex!].label_ar}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </li>
          );
        })}
      </ol>

      {completed && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-card-gradient-success border border-app-success/40 rounded-2xl p-5 flex flex-col gap-3 shadow-card-soft"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2
              className="size-6 text-app-success shrink-0"
              aria-hidden="true"
            />
            <h3 className="text-lg font-bold text-app-text leading-snug">
              خلصت كل الخطوات!
            </h3>
          </div>
          <p className="text-sm text-app-secondary leading-relaxed">
            خلّصت الـ {totalSteps} ليه. الرسالة السابقة اتحدّثت بالأدلة الجديدة — تقدر
            ترجع تشوف الأسباب تاني.
          </p>
          {scoreDelta !== 0 && (
            <div
              className="bg-app-primary/5 border border-app-primary/20 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
              role="status"
            >
              <span className="text-xs text-app-secondary leading-relaxed">
                درجة السبب:
              </span>
              <span className="text-sm font-bold text-app-text tabular-nums">
                <span className="text-app-secondary">{initialScore}%</span>
                <span className="mx-1 text-app-secondary">←</span>
                <span className="text-app-primary">{currentScore}%</span>
                <span
                  className={`ms-2 inline-flex items-center gap-0.5 text-xs ${
                    scoreDelta > 0 ? "text-app-success" : "text-app-secondary"
                  }`}
                >
                  ({scoreDelta > 0 ? "+" : ""}
                  {scoreDelta})
                </span>
              </span>
            </div>
          )}
          <Button
            type="button"
            className="touch-target h-11 bg-app-primary text-white hover:bg-app-primary/90"
            onClick={finishWhy}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            ارجع للأسباب
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// StepCircle — the numbered/active/completed circle on the rail
// ============================================================

function StepCircle({
  stepIdx,
  isAnswered,
  isActive,
  isFuture,
  prefersReducedMotion,
}: {
  stepIdx: number;
  isAnswered: boolean;
  isActive: boolean;
  isFuture: boolean;
  prefersReducedMotion: boolean | null;
}) {
  const base =
    "absolute start-0 top-0 size-9 md:size-11 rounded-full flex items-center justify-center text-xs md:text-sm font-bold";

  if (isAnswered) {
    return (
      <span
        className={`${base} bg-app-success text-white shadow-sm`}
        aria-label={`الخطوة ${stepIdx + 1} مكتملة`}
      >
        <Check className="size-4 md:size-5" aria-hidden="true" />
      </span>
    );
  }

  if (isActive) {
    return (
      <motion.span
        className={`${base} bg-app-primary text-white`}
        aria-label={`الخطوة ${stepIdx + 1} الحالية`}
        animate={
          prefersReducedMotion
            ? undefined
            : { scale: [1, 1.05, 1] }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
      >
        {stepIdx + 1}
      </motion.span>
    );
  }

  // Future (or future-but-not-active) — muted, secondary text
  void isFuture;
  return (
    <span
      className={`${base} bg-app-muted text-app-secondary border border-border`}
      aria-label={`الخطوة ${stepIdx + 1} قادمة`}
    >
      {stepIdx + 1}
    </span>
  );
}

// ============================================================
// WhyOptionButton — matches the question screen OptionButton styling
// (bg-card-gradient + hover:shadow-card-soft), with a chevron affordance
// ============================================================

function WhyOptionButton({
  label,
  onClick,
  prefersReducedMotion,
}: {
  label: string;
  onClick: () => void;
  prefersReducedMotion: boolean | null;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      className="touch-target min-h-[52px] text-start rounded-xl border-2 border-border bg-card-gradient p-3 flex items-center justify-between gap-3 hover:border-app-primary hover:bg-app-primary/5 hover:shadow-card-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/40"
    >
      <span className="text-sm font-medium text-app-text leading-relaxed flex-1">
        {label}
      </span>
      <span className="shrink-0 size-5 rounded-full border-2 border-app-primary/30 flex items-center justify-center text-app-primary">
        <ChevronRight className="size-3.5" aria-hidden="true" />
      </span>
    </motion.button>
  );
}
