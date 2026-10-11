"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, HelpCircle, Flag, Keyboard, TrendingUp, TrendingDown } from "lucide-react";
import { useJuzoor } from "@/lib/store";
import { loadMessages } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { Question, Option, CauseScore } from "@/lib/engine/types";
import { SupportNote } from "./support-note";

const MAX_QUESTIONS = 10;

export function QuestionScreen() {
  const messages = React.useMemo(() => loadMessages(), []);
  const currentQuestion = useJuzoor((s) => s.currentQuestion);
  const answers = useJuzoor((s) => s.engine.answers);
  const content = useJuzoor((s) => s.content);
  const causeScores = useJuzoor((s) => s.causeScores);
  const answerQuestion = useJuzoor((s) => s.answerQuestion);
  const goToPreviousQuestion = useJuzoor((s) => s.goToPreviousQuestion);

  const startTimeRef = React.useRef<number>(Date.now());
  const [hintVisible, setHintVisible] = React.useState(true);

  // Track previous scores for the live-update indicator
  const prevScoresRef = React.useRef<Record<string, CauseScore> | null>(null);
  const [scoreDeltas, setScoreDeltas] = React.useState<
    { causeId: string; from: number; to: number; delta: number }[]
  >([]);

  // Lookup cause labels for the live score indicator (must run before any
  // early return so the hooks order is stable across renders).
  const causeLabelMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    content?.causes.forEach((c) => {
      map[c.id] = c.branch || c.label_ar;
    });
    return map;
  }, [content]);

  // Reset start time when the current question id changes
  React.useEffect(() => {
    startTimeRef.current = Date.now();
    setHintVisible(true);
  }, [currentQuestion?.id]);

  // Hide the keyboard hint after 3 seconds
  React.useEffect(() => {
    if (!hintVisible) return;
    const timer = window.setTimeout(() => setHintVisible(false), 3000);
    return () => window.clearTimeout(timer);
  }, [hintVisible, currentQuestion?.id]);

  // Live score-update indicator: detect when causeScores change and show
  // the top movers as a toast-like overlay at the top.
  React.useEffect(() => {
    const prev = prevScoresRef.current;
    if (prev === null) {
      // First render — store current scores and bail (no diff to show)
      prevScoresRef.current = causeScores;
      return;
    }
    // Compute deltas (only consider causes present in current scores)
    const movers: { causeId: string; from: number; to: number; delta: number }[] = [];
    for (const [id, cs] of Object.entries(causeScores)) {
      const from = prev[id]?.score ?? 0;
      const to = cs.score;
      const delta = to - from;
      if (Math.abs(delta) >= 1 && !cs.excluded) {
        movers.push({ causeId: id, from, to, delta });
      }
    }
    if (movers.length > 0) {
      // Sort by absolute delta desc, take top 3
      movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      setScoreDeltas(movers.slice(0, 3));
      const timer = window.setTimeout(() => setScoreDeltas([]), 2000);
      prevScoresRef.current = causeScores;
      return () => window.clearTimeout(timer);
    }
    prevScoresRef.current = causeScores;
  }, [causeScores]);

  // Pre-compute options up-front (safe to compute on null question)
  const q: Question | null = currentQuestion;
  const knownOptions = React.useMemo(
    () => (q ? q.options.filter((o) => !o.isUnknown) : []),
    [q],
  );
  const unknownOption = React.useMemo(
    () => (q ? q.options.find((o) => o.isUnknown) ?? null : null),
    [q],
  );

  // Stable callbacks for the keyboard nav hook
  const onAnswerRef = React.useRef<(opt: Option) => void>(() => {});
  onAnswerRef.current = (opt: Option) => {
    if (!q) return;
    const durationMs = Date.now() - startTimeRef.current;
    answerQuestion(q.id, opt.id, durationMs);
  };

  // Keyboard navigation handler
  useKeyboardNav({
    knownOptions,
    unknownOption,
    onAnswer: (opt) => onAnswerRef.current(opt),
    onBack: () => {
      setHintVisible(false);
      goToPreviousQuestion();
    },
    onAnyKey: () => setHintVisible(false),
    enabled: q !== null,
  });

  if (!currentQuestion || !q) {
    return (
      <div className="max-w-md mx-auto px-4 pt-12 pb-12 text-center text-app-secondary">
        <p>جارٍ تجهيز السؤال…</p>
      </div>
    );
  }

  const answeredCount = answers.length;
  const progressValue = Math.min(100, (answeredCount / MAX_QUESTIONS) * 100);

  const handleAnswer = (opt: Option) => {
    onAnswerRef.current(opt);
  };

  // Determine if the most recent answer triggered support_note
  const lastAnswer = answers[answers.length - 1];
  const lastQuestion = lastAnswer
    ? content?.questions.find((qq) => qq.id === lastAnswer.qid)
    : null;
  const lastOption = lastQuestion
    ? lastQuestion.options.find((o) => o.id === lastAnswer?.optionId)
    : null;
  const showSupportNote =
    lastOption?.flags?.includes("support_note") && lastAnswer?.qid !== q.id;

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-12 flex flex-col gap-5 relative">
      {/* Live score-update toast overlay (top of screen) */}
      <AnimatePresence>
        {scoreDeltas.length > 0 && (
          <motion.div
            key={`score-toast-${answers.length}`}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-card border border-app-primary/30 shadow-lg rounded-2xl px-3 py-2 flex items-center gap-2 max-w-[90vw]"
            role="status"
            aria-live="polite"
          >
            <TrendingUp className="size-4 text-app-primary shrink-0" aria-hidden="true" />
            <ul className="flex items-center gap-2 text-xs">
              {scoreDeltas.map((m) => {
                const up = m.delta > 0;
                const TrendIcon = up ? TrendingUp : TrendingDown;
                return (
                  <li
                    key={m.causeId}
                    className={`flex items-center gap-1 font-bold tabular-nums ${
                      up ? "text-app-success" : "text-app-secondary"
                    }`}
                  >
                    <span className="text-app-text">{causeLabelMap[m.causeId] ?? m.causeId}</span>
                    <TrendIcon className="size-3" aria-hidden="true" />
                    <span>
                      {m.from}→{m.to}
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-app-secondary">
            السؤال <span className="font-bold text-app-text tabular-nums">{answeredCount + 1}</span> من{" "}
            <span className="font-bold text-app-text tabular-nums">{MAX_QUESTIONS}</span>
          </span>
          {answeredCount >= MAX_QUESTIONS - 1 && (
            <Badge variant="outline" className="text-app-primary border-app-primary/40 bg-app-primary/5">
              <Flag className="size-3" aria-hidden="true" />
              آخر الأسئلة
            </Badge>
          )}
        </div>
        <Progress value={progressValue} className="bg-app-muted h-2" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.22 }}
          className="flex flex-col gap-5"
        >
          <header className="flex flex-col gap-2 pt-2">
            <h1 className="text-2xl font-bold text-app-text leading-snug">{q.text_ar}</h1>
            {q.help_ar && <p className="text-sm text-app-secondary leading-relaxed">{q.help_ar}</p>}
          </header>

          <div className="flex flex-col gap-2.5">
            {knownOptions.map((opt, idx) => (
              <OptionButton
                key={opt.id}
                label={opt.label_ar}
                hotkey={idx + 1}
                onClick={() => handleAnswer(opt)}
              />
            ))}
          </div>

          {unknownOption && (
            <button
              type="button"
              onClick={() => handleAnswer(unknownOption)}
              className="touch-target text-sm text-app-secondary hover:text-app-text border border-dashed border-border rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 transition-colors"
              aria-label={messages.unknown_label}
            >
              <HelpCircle className="size-4" aria-hidden="true" />
              {messages.unknown_label}
              <Kbd>؟</Kbd>
            </button>
          )}

          {showSupportNote && (
            <div className="mt-2">
              <SupportNote />
            </div>
          )}

          {answeredCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              className="touch-target text-app-secondary hover:text-app-primary self-start"
              onClick={goToPreviousQuestion}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
              السؤال السابق
              <Kbd>⌫</Kbd>
            </Button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Keyboard hint */}
      <AnimatePresence>
        {hintVisible && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2 text-xs text-app-secondary bg-app-muted/70 rounded-full px-3 py-1.5 self-center mt-2"
            aria-hidden="true"
          >
            <Keyboard className="size-3.5" aria-hidden="true" />
            اضغط 1-9 للاختيار، ؟ للمش عارف
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Keyboard navigation:
 * - 1-9 → select the corresponding known option
 * - ? or Escape → select the "مش عارف" option
 * - Backspace → go to previous question
 *
 * Calls onAnyKey for any key press (used to hide the hint faster).
 * When `enabled` is false (e.g., no current question) the handler is not
 * attached — keeping hook order stable across renders.
 */
function useKeyboardNav({
  knownOptions,
  unknownOption,
  onAnswer,
  onBack,
  onAnyKey,
  enabled = true,
}: {
  knownOptions: Option[];
  unknownOption: Option | null;
  onAnswer: (opt: Option) => void;
  onBack: () => void;
  onAnyKey: () => void;
  enabled?: boolean;
}) {
  React.useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      // Ignore key events when a text input/textarea is focused (defensive — there shouldn't be any)
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Number keys 1-9
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const opt = knownOptions[idx];
        if (opt) {
          e.preventDefault();
          onAnyKey();
          onAnswer(opt);
        }
        return;
      }

      // Unknown option: ? (Shift+/) or Escape
      if (e.key === "?" || (e.shiftKey && e.key === "/") || e.key === "Escape") {
        if (unknownOption) {
          e.preventDefault();
          onAnyKey();
          onAnswer(unknownOption);
        }
        return;
      }

      // Backspace: go to previous question
      if (e.key === "Backspace") {
        e.preventDefault();
        onAnyKey();
        onBack();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [knownOptions, unknownOption, onAnswer, onBack, onAnyKey, enabled]);
}

function OptionButton({
  label,
  hotkey,
  onClick,
}: {
  label: string;
  hotkey: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="touch-target min-h-[56px] text-start rounded-xl border-2 border-border bg-card p-4 flex items-center justify-between gap-3 hover:border-app-primary hover:bg-app-primary/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/40"
    >
      <span className="text-base font-medium text-app-text leading-relaxed flex-1">{label}</span>
      <span className="shrink-0 flex items-center gap-2">
        <Kbd>{hotkey}</Kbd>
        <span className="size-5 rounded-full border-2 border-app-primary/30 flex items-center justify-center text-app-primary">
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </span>
      </span>
    </motion.button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-bold rounded border border-app-primary/30 bg-app-muted text-app-primary tabular-nums leading-none"
      aria-hidden="true"
    >
      {children}
    </kbd>
  );
}
