"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft } from "lucide-react";
import { useJuzoor } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function WhyChainScreen() {
  const content = useJuzoor((s) => s.content);
  const whyCurrentCauseId = useJuzoor((s) => s.whyCurrentCauseId);
  const whyAnswers = useJuzoor((s) => s.whyAnswers);
  const whyStepIndex = useJuzoor((s) => s.whyStepIndex);
  const recordWhyAnswer = useJuzoor((s) => s.recordWhyAnswer);
  const finishWhy = useJuzoor((s) => s.finishWhy);

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

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">
      <header className="flex flex-col gap-1.5 pt-2">
        <h1 className="text-2xl font-bold text-app-text leading-snug">نتعمق بـ ليه؟</h1>
        <p className="text-sm text-app-secondary leading-relaxed">
          خمس خطوات لنفهم السبب أكتر
        </p>
        <div className="mt-1 text-xs bg-app-primary/5 text-app-primary border border-app-primary/20 rounded-lg px-3 py-1.5 w-fit">
          السبب: {cause.label_ar}
        </div>
      </header>

      {/* Timeline */}
      <ol className="flex flex-col gap-4">
        {chain.map((step, stepIdx) => {
          const answeredOptIndex = answers.find((a) => a.stepIndex === stepIdx)?.optionIndex;
          const isAnswered = answeredOptIndex !== undefined;
          // Active = this step is the next-to-answer (not yet answered) AND not completed
          const isActive = !isAnswered && stepIdx === activeStep && !completed;

          return (
            <li key={stepIdx} className="relative flex flex-col gap-2 ps-9 md:ps-11">
              {/* Vertical connector */}
              {stepIdx < chain.length - 1 && (
                <span
                  className="absolute top-9 md:top-11 start-4 md:start-5 w-px h-full bg-app-primary/20"
                  aria-hidden="true"
                />
              )}
              {/* Numbered circle */}
              <span
                className={`absolute start-0 top-0 size-8 md:size-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold ${
                  isAnswered
                    ? "bg-app-success text-white"
                    : isActive
                      ? "bg-app-primary text-white"
                      : "bg-app-muted text-app-secondary border border-border"
                }`}
                aria-label={`الخطوة ${stepIdx + 1}`}
              >
                {isAnswered ? <Check className="size-4 md:size-5" aria-hidden="true" /> : stepIdx + 1}
              </span>

              <AnimatePresence mode="wait">
                <motion.div
                  key={stepIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex flex-col gap-3 ${isActive ? "" : "opacity-90"}`}
                >
                  <p className="text-base font-semibold text-app-text leading-snug pt-0.5">
                    {step.prompt_ar}
                  </p>

                  {isActive && (
                    <div className="flex flex-col gap-2">
                      {step.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() =>
                            recordWhyAnswer(whyCurrentCauseId, stepIdx, optIdx)
                          }
                          className="touch-target min-h-[52px] text-start rounded-xl border-2 border-border bg-card p-3 text-sm font-medium text-app-text hover:border-app-primary hover:bg-app-primary/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/40"
                        >
                          {opt.label_ar}
                        </button>
                      ))}
                    </div>
                  )}

                  {isAnswered && (
                    <div className="bg-app-success/10 border border-app-success/30 rounded-xl px-3 py-2 text-sm text-app-text">
                      <span className="text-app-secondary">إجابتك: </span>
                      <span className="font-semibold">{step.options[answeredOptIndex!].label_ar}</span>
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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-app-success/10 border border-app-success/30 rounded-2xl p-4 flex flex-col gap-3"
        >
          <p className="text-sm text-app-text leading-relaxed">
            خلّصت الـ 5 ليه. الرسالة السابقة اتحدّثت بالأدلة الجديدة — تقدر ترجع تشوف الأسباب تاني.
          </p>
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
