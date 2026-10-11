"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  Trash2,
  RotateCcw,
  Route,
  HelpCircle,
  ListChecks,
  ListTodo,
  Calendar,
  MessageSquareReply,
  Repeat,
  type LucideIcon,
} from "lucide-react";
import { useJuzoor } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CelebrationBurst } from "./celebration-burst";
import { AnimatedNumber } from "./animated-number";

export function DoneScreen() {
  const resetAll = useJuzoor((s) => s.resetAll);
  const wipeData = useJuzoor((s) => s.wipeData);
  const go = useJuzoor((s) => s.go);
  const init = useJuzoor((s) => s.init);
  const domain = useJuzoor((s) => s.domain);

  // Journey data — drawn from the persisted store so the summary
  // survives a reload and reflects everything the user did.
  const content = useJuzoor((s) => s.content);
  const symptomId = useJuzoor((s) => s.engine.symptomId);
  const answers = useJuzoor((s) => s.engine.answers);
  const causeScores = useJuzoor((s) => s.causeScores);
  const selectedSolutionIds = useJuzoor((s) => s.selectedSolutionIds);
  const planId = useJuzoor((s) => s.planId);
  const planReviewDate = useJuzoor((s) => s.planReviewDate);
  const followUp = useJuzoor((s) => s.followUp);

  // Gentle celebration burst on mount — fires once from the viewport center.
  // We compute the anchor lazily inside the effect (window isn't available
  // during SSR), and gate it on prefers-reduced-motion.
  const prefersReducedMotion = useReducedMotion();
  const [celebrationToken, setCelebrationToken] = React.useState(0);
  const [celebrationAnchor, setCelebrationAnchor] = React.useState<{
    x: number;
    y: number;
  } | null>(null);

  React.useEffect(() => {
    // Re-check matchMedia at effect time — useReducedMotion may be stale
    // on the first render before framer-motion's subscription kicks in.
    const reduced =
      prefersReducedMotion ||
      (typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (reduced) return;
    if (typeof window === "undefined") return;
    // Center-top of the viewport (the spec says "viewport center").
    setCelebrationAnchor({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    setCelebrationToken(1);
  }, [prefersReducedMotion]);

  const handleNew = () => {
    resetAll();
    go("welcome");
  };
  const handleQuickRestart = () => {
    // Preserve the domain and jump straight to the symptom screen
    const d = domain;
    resetAll();
    init(d);
    go("symptom");
  };
  const handleWipe = () => {
    wipeData();
    go("welcome");
  };

  // ---- Derive journey data ----
  const symptomLabel = React.useMemo(() => {
    if (!content || !symptomId) return null;
    const sym = content.symptoms.find((s) => s.id === symptomId);
    return sym?.label_ar ?? null;
  }, [content, symptomId]);

  const topCauses = React.useMemo(() => {
    return Object.values(causeScores)
      .filter((cs) => !cs.excluded && cs.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((cs) => {
        const cause = content?.causes.find((c) => c.id === cs.causeId);
        return {
          id: cs.causeId,
          label: cause?.label_ar ?? cs.causeId,
          score: cs.score,
        };
      });
  }, [causeScores, content]);

  const selectedSolutions = React.useMemo(() => {
    if (!content) return [];
    return selectedSolutionIds
      .map((id) => content.solutions.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [selectedSolutionIds, content]);

  const hasFollowUp = Boolean(
    followUp && (followUp.executed || followUp.improved),
  );

  const topCausePct = topCauses[0]?.score ?? 0;

  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-12 flex flex-col gap-5">
      {/* Gentle celebration burst on mount */}
      <CelebrationBurst
        token={celebrationToken}
        anchor={celebrationAnchor}
        count={18}
      />

      {/* Journey summary card — subtle vertical timeline */}
      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        aria-label="ملخص رحلتك"
        className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-4"
      >
        <div className="flex items-center gap-2">
          <span className="shrink-0 size-8 rounded-full bg-app-primary/15 text-app-primary flex items-center justify-center">
            <Route className="size-4" aria-hidden="true" />
          </span>
          <div className="flex-1 flex flex-col">
            <h2 className="text-sm font-bold text-app-text leading-tight">
              ملخص رحلتك
            </h2>
            <p className="text-xs text-app-secondary leading-relaxed mt-0.5">
              كل خطوة وصلت بيها لهون
            </p>
          </div>
        </div>

        <JourneyTimeline
          milestones={[
            {
              icon: HelpCircle,
              label: "العرض",
              value: symptomLabel ?? "—",
              show: Boolean(symptomLabel),
            },
            {
              icon: ListChecks,
              label: "الأسئلة",
              value: `${answers.length} إجابة`,
              show: answers.length > 0,
            },
            {
              icon: Sparkles,
              label: "الأسباب",
              value: topCauses.length ? (
                <div className="flex flex-col gap-1">
                  {topCauses.map((c, i) => (
                    <span
                      key={c.id}
                      className="flex items-center gap-1.5 text-xs text-app-text leading-relaxed tabular-nums"
                    >
                      <span className="text-app-secondary tabular-nums">{i + 1}.</span>
                      <span className="font-medium">{c.label}</span>
                      <span className="text-app-primary font-bold">({c.score}%)</span>
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              ),
              show: topCauses.length > 0,
            },
            {
              icon: ListTodo,
              label: "الحلول",
              value: selectedSolutions.length ? (
                <div className="flex flex-col gap-1">
                  {selectedSolutions.map((s, i) => (
                    <span
                      key={s.id}
                      className="flex items-start gap-1.5 text-xs text-app-text leading-relaxed"
                    >
                      <span className="text-app-secondary tabular-nums shrink-0">{i + 1}.</span>
                      <span className="font-medium">{s.label_ar}</span>
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              ),
              show: selectedSolutions.length > 0,
            },
            {
              icon: Calendar,
              label: "الخطة",
              value: planId ? (
                <span className="text-xs text-app-text leading-relaxed">
                  <span className="font-mono font-bold text-app-primary">{planId}</span>
                  {planReviewDate && (
                    <>
                      {" "}
                      — راجعها في{" "}
                      <span className="font-mono">{planReviewDate}</span>
                    </>
                  )}
                </span>
              ) : (
                "الخطة لسه مش محفوظة"
              ),
              show: Boolean(planId),
            },
            {
              icon: MessageSquareReply,
              label: "المتابعة",
              value: hasFollowUp && followUp ? (
                <span className="text-xs text-app-text leading-relaxed">
                  نفّذت: {executedLabel(followUp.executed)}
                  {" — "}
                  تحسّن: {improvedLabel(followUp.improved)}
                </span>
              ) : (
                "لم تُسجَّل"
              ),
              show: hasFollowUp,
            },
          ].filter((m) => m.show)}
          prefersReducedMotion={prefersReducedMotion}
        />
      </motion.section>

      {/* Stats grid — small quick numbers (with count-up animation) */}
      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-3 gap-2"
        aria-label="إحصائيات الرحلة"
      >
        <StatCell
          label="عدد الأسئلة"
          ariaLabel={`عدد الأسئلة ${answers.length}`}
          value={
            <AnimatedNumber
              value={answers.length}
              duration={1}
              delay={0}
              className="text-lg font-bold text-app-primary leading-none"
            />
          }
        />
        <StatCell
          label="أعلى سبب"
          ariaLabel={`أعلى سبب ${topCausePct} بالمئة`}
          value={
            <AnimatedNumber
              value={topCausePct}
              duration={1}
              delay={0.15}
              suffix="%"
              className="text-lg font-bold text-app-primary leading-none"
            />
          }
        />
        <StatCell
          label="عدد الحلول"
          ariaLabel={`عدد الحلول ${selectedSolutions.length}`}
          value={
            <AnimatedNumber
              value={selectedSolutions.length}
              duration={1}
              delay={0.3}
              className="text-lg font-bold text-app-primary leading-none"
            />
          }
        />
      </motion.section>

      {/* Thank-you card — the main focus */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-card rounded-2xl border border-app-accent/40 p-6 flex flex-col gap-5 items-center text-center"
      >
        <div className="size-20 rounded-full bg-app-accent/30 flex items-center justify-center">
          <Sparkles className="size-10 text-app-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-app-text">رحلتك خلصت — لحد دلوقتي</h1>
        <p className="text-sm text-app-secondary leading-relaxed">
          شكراً إنك وثقت في جذور. كل خطوة أخدتها بتفيدك في المرّة الجاية.
        </p>

        <div className="flex flex-col gap-3 w-full mt-2">
          <Button
            type="button"
            className="touch-target h-12 bg-app-primary text-white hover:bg-app-primary/90"
            onClick={handleNew}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            ابدأ رحلة جديدة
          </Button>
          <Button
            type="button"
            variant="outline"
            className="touch-target h-11 border-app-primary/30 text-app-primary hover:bg-app-primary/5"
            onClick={handleQuickRestart}
          >
            <Repeat className="size-4" aria-hidden="true" />
            جرّب تاني بنفس المجال
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="touch-target text-app-secondary hover:text-destructive"
            onClick={handleWipe}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            امسح بياناتي واخرج
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// JourneyTimeline — vertical rail with icons + connecting line
// ============================================================

interface JourneyMilestone {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  show: boolean;
}

function JourneyTimeline({
  milestones,
  prefersReducedMotion,
}: {
  milestones: JourneyMilestone[];
  prefersReducedMotion: boolean | null;
}) {
  if (milestones.length === 0) {
    return (
      <p className="text-xs text-app-secondary text-center py-3">
        مفيش بيانات كافية لعرض ملخص الرحلة
      </p>
    );
  }

  return (
    <ol className="relative flex flex-col gap-0">
      {/* Vertical rail — sits behind the icon circles, in the start gutter */}
      <span
        aria-hidden="true"
        className="absolute top-3 bottom-3 w-px bg-app-primary/15"
        style={{ insetInlineStart: "13px" }}
      />
      {milestones.map((m, i) => {
        const Icon = m.icon;
        const isLast = i === milestones.length - 1;
        return (
          <motion.li
            key={m.label}
            initial={prefersReducedMotion ? false : { opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.22,
              delay: prefersReducedMotion ? 0 : Math.min(i * 0.05, 0.25),
            }}
            className={`relative flex items-start gap-3 ${isLast ? "pb-0" : "pb-3.5"}`}
          >
            <span className="relative z-10 shrink-0 size-7 rounded-full bg-app-primary/15 text-app-primary flex items-center justify-center">
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <div className="flex-1 flex flex-col gap-0.5 pt-0.5 min-w-0">
              <span className="text-[11px] text-app-secondary leading-tight">
                {m.label}
              </span>
              <div className="text-xs text-app-text leading-relaxed">
                {m.value}
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

// ============================================================
// StatCell — single stat in the small grid
// ============================================================

function StatCell({
  label,
  value,
  ariaLabel,
}: {
  label: string;
  value: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Card
      className="p-3 flex flex-col gap-1 items-center text-center bg-card"
      aria-label={ariaLabel}
    >
      <span className="leading-none">{value}</span>
      <span className="text-[11px] text-app-secondary leading-tight">
        {label}
      </span>
    </Card>
  );
}

// ============================================================
// Follow-up label helpers
// ============================================================

function executedLabel(v: "yes" | "partial" | "no" | null): string {
  if (v === "yes") return "تمام";
  if (v === "partial") return "جزئي";
  if (v === "no") return "أصلًا لأ";
  return "—";
}

function improvedLabel(v: "yes" | "partial" | "no" | null): string {
  if (v === "yes") return "تحسّن واضح";
  if (v === "partial") return "تحسّن جزئي";
  if (v === "no") return "ما تحسّنش";
  return "—";
}
