"use client";

import * as React from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import {
  Download,
  Printer,
  Save,
  Calendar,
  Target,
  ChevronLeft,
  ChevronDown,
  RefreshCw,
  Check,
  Sparkles,
  Share2,
  TrendingUp,
  Flame,
  BellRing,
  Lightbulb,
  Clock,
  MapPin,
  Moon,
  Users,
  Smartphone,
} from "lucide-react";
import { useJuzoor } from "@/lib/store";
import { toast } from "sonner";
import { loadMessages } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CelebrationBurst } from "./celebration-burst";
import type { Solution } from "@/lib/engine/types";

export function PlanScreen() {
  const content = useJuzoor((s) => s.content);
  const selectedSolutionIds = useJuzoor((s) => s.selectedSolutionIds);
  const planId = useJuzoor((s) => s.planId);
  const planSavedAt = useJuzoor((s) => s.planSavedAt);
  const planReviewDate = useJuzoor((s) => s.planReviewDate);
  const participantCode = useJuzoor((s) => s.participantCode);
  const causeScores = useJuzoor((s) => s.causeScores);
  const symptomId = useJuzoor((s) => s.engine.symptomId);
  const savePlan = useJuzoor((s) => s.savePlan);
  const exportPlan = useJuzoor((s) => s.exportPlan);
  const dayCheckins = useJuzoor((s) => s.dayCheckins);

  // Celebration state: a token that increments each time the user saves,
  // plus the anchor (viewport coords) where the confetti should burst from.
  // Declared BEFORE the early return to keep hook order stable.
  const [celebrationToken, setCelebrationToken] = React.useState(0);
  const [celebrationAnchor, setCelebrationAnchor] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [tipsOpen, setTipsOpen] = React.useState(false);

  if (!content) return null;

  const messages = loadMessages();

  const selectedSolutions: Solution[] = selectedSolutionIds
    .map((id) => content.solutions.find((s) => s.id === id))
    .filter((s): s is Solution => Boolean(s));

  const handleSave: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    setCelebrationAnchor({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setCelebrationToken((n) => n + 1);
    savePlan();
    toast.success("تم الحفظ", {
      description: `كود الخطة: ${useJuzoor.getState().planId}`,
    });
  };

  const handleExportText = () => {
    const text = buildPlanText(selectedSolutions, {
      planId,
      reviewDate: planReviewDate,
      savedAt: planSavedAt,
      participantCode,
    });
    exportPlan("text");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `juzoor-plan-${planId ?? Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("تم تصدير الخطة كنص");
  };

  const handlePrint = () => {
    exportPlan("pdf");
    // Give the store a tick to persist the export event before invoking print
    window.print();
  };

  const handleShare = async () => {
    const summary = buildShareSummary(selectedSolutions, {
      planId,
      reviewDate: planReviewDate,
      participantCode,
      causeScores,
      content,
      symptomId,
    });
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
        toast.success("تم نسخ ملخص الخطة", {
          description: "تقدر تلصقه في أي مكان — رسالة، بريد، أو ملاحظة",
        });
      } else {
        // Fallback: open a new window with the text
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(`<pre style="font-family: system-ui; white-space: pre-wrap; padding: 1rem; direction: rtl;">${summary.replace(/</g, "&lt;")}</pre>`);
          w.document.title = "ملخص خطة جذور";
        }
      }
    } catch {
      toast.error("مش قادرين ننسخ الملخص", {
        description: "جرّب تصدير الخطة كنص بدلاً من ذلك",
      });
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-12 flex flex-col gap-5 print:max-w-none print:px-8 print:gap-6">
      {/* On-screen header (hidden when printing) */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-1.5 pt-2 no-print print:hidden"
      >
        <h1 className="text-2xl font-bold text-app-text leading-snug">خطتك لمدة 7 أيام</h1>
        <p className="text-sm text-app-secondary leading-relaxed">
          خطوات صغيرة كل يوم، أكتر من 20 دقيقة للخطوة
        </p>
      </motion.header>

      {/* Print-only header block — prominent, with plan IDs */}
      <div className="hidden print:block border-b-2 border-black pb-3 mb-2">
        <h1 className="text-2xl font-bold text-black">خطتي على جذور</h1>
        <p className="text-sm text-black mt-1">خطة 7 أيام — تطبيق جذور | نظّم وقتك، افهم نفسك</p>
        <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-black">
          <div>
            <p className="font-bold">كود المشاركة:</p>
            <p className="font-mono">{participantCode ?? "—"}</p>
          </div>
          <div>
            <p className="font-bold">كود الخطة:</p>
            <p className="font-mono">{planId ?? "غير محفوظ"}</p>
          </div>
          <div>
            <p className="font-bold">موعد المراجعة:</p>
            <p className="font-mono">{planReviewDate ?? "—"}</p>
          </div>
        </div>
        {planSavedAt && (
          <p className="text-[10px] text-black mt-1">
            اتحفظت في: {new Date(planSavedAt).toLocaleString("ar-EG")}
          </p>
        )}
      </div>

      {selectedSolutions.length === 0 ? (
        <Card className="p-4 bg-app-muted text-app-secondary text-sm no-print">
          مفيش حلول مختارة في الخطة. ارجع لصفحة المقارنة.
        </Card>
      ) : (
        <div className="flex flex-col gap-5 print:gap-4">
          <PlanProgressCard
            selectedSolutions={selectedSolutions}
            selectedSolutionIds={selectedSolutionIds}
            dayCheckins={dayCheckins}
            planId={planId}
          />
          <DailyReminderCard />
          {selectedSolutions.map((sol, idx) => (
            <PlanTimeline key={sol.id} solution={sol} index={idx} />
          ))}
        </div>
      )}

      {/* Review date + save info (visible in print too, simplified styling) */}
      <div className="flex flex-col gap-3 no-print print:hidden">
        <Card className="p-4 bg-card-gradient shadow-card-soft border-app-primary/30 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="size-4 text-app-primary" aria-hidden="true" />
            <span className="text-app-secondary">موعد المراجعة:</span>
            <span className="font-bold text-app-text">بعد أسبوع: {planReviewDate ?? "—"}</span>
          </div>
          {planId && planSavedAt && (
            <div className="flex items-center gap-2 text-xs text-app-secondary">
              <Save className="size-3.5 text-app-primary" aria-hidden="true" />
              <span>
                كود الخطة:{" "}
                <motion.span
                  key={`planid-${celebrationToken}`}
                  initial={{ scale: 1 }}
                  animate={
                    celebrationToken > 0
                      ? { scale: [1, 1.05, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="font-mono font-bold text-app-primary inline-block"
                >
                  {planId}
                </motion.span>{" "}
                — اتحفظت في {new Date(planSavedAt).toLocaleString("ar-EG")}
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Study Tips & Resources — general study guidance (collapsible, hidden in print) */}
      <StudyTipsSection
        open={tipsOpen}
        onOpenChange={setTipsOpen}
        messages={messages}
      />

      {/* Action buttons (hidden in print) */}
      <div className="flex flex-col gap-3 no-print print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            className="touch-target h-12 bg-app-primary text-white hover:bg-app-primary/90"
            onClick={handleSave}
          >
            <Save className="size-4" aria-hidden="true" />
            احفظ الخطّة
          </Button>
          <Button
            type="button"
            variant="outline"
            className="touch-target h-12 border-app-primary/30 text-app-primary hover:bg-app-primary/5"
            onClick={handleExportText}
          >
            <Download className="size-4" aria-hidden="true" />
            صدّر كنص
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="touch-target h-12 border-app-accent/50 text-app-primary hover:bg-app-accent/10"
            onClick={handleShare}
          >
            <Share2 className="size-4" aria-hidden="true" />
            شارك ملخص الخطة
          </Button>
          <Button
            type="button"
            variant="outline"
            className="touch-target h-12 border-app-primary/30 text-app-primary hover:bg-app-primary/5"
            onClick={handlePrint}
          >
            <Printer className="size-4" aria-hidden="true" />
            اطبع / احفظ PDF
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="touch-target text-app-secondary hover:text-app-primary"
          onClick={() => useJuzoor.getState().go("followup")}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          أراجع خطتي بعد أسبوع
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Celebration burst — confetti from the save button */}
      <CelebrationBurst token={celebrationToken} anchor={celebrationAnchor} />

      {/* Motivational message after save — green accent card with Sparkles */}
      <AnimatePresence>
        {celebrationToken > 0 && messages.plan_saved_celebrate && (
          <motion.div
            key={`celebrate-${celebrationToken}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
            className="bg-app-success/10 border border-app-success/40 rounded-2xl p-4 flex items-start gap-3 no-print print:hidden"
            role="status"
          >
            <Sparkles
              className="size-5 text-app-success shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-app-text leading-relaxed">
              {messages.plan_saved_celebrate}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-app-secondary text-center leading-relaxed no-print print:hidden">
        القرار النهائي لك — اختر اللي يناسبك وعدّل عليه
      </p>

      {/* Print-only footer note */}
      <div className="hidden print:block border-t border-black mt-4 pt-2 text-xs text-black">
        <p>القرار النهائي لك — اختر اللي يناسبك وعدّل عليه.</p>
        <p className="mt-1">جذور | نظّم وقتك، افهم نفسك — تطبيق مش بديل عن شخص مختص.</p>
      </div>
    </div>
  );
}

function PlanTimeline({ solution, index }: { solution: Solution; index: number }) {
  const steps = solution.steps_ar;
  // Distribute 7 steps across 7 days. If fewer steps, cycle; if more, use first 7.
  const days = Array.from({ length: 7 }, (_, i) => steps[i % steps.length] ?? steps[0]);
  // Persisted check-in state — survives reload, feeds the progress summary card.
  // Scoped by planId so a new plan starts fresh instead of inheriting old check-ins.
  const dayCheckins = useJuzoor((s) => s.dayCheckins);
  const planId = useJuzoor((s) => s.planId);
  const toggleDayCheckin = useJuzoor((s) => s.toggleDayCheckin);
  const checkinScope = planId ?? "";
  const checked = days.map((_, dayIdx) =>
    Boolean(dayCheckins[`${checkinScope}-${solution.id}-${dayIdx}`]?.completed),
  );
  const [justChecked, setJustChecked] = React.useState<number | null>(null);
  const estMinutes = Math.max(20, solution.dailyMinutes || 20);

  // Detect prefers-reduced-motion for the check overlay
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleCheck = (dayIdx: number, v: boolean | "indeterminate") => {
    const next = Boolean(v);
    // Only fire the celebratory overlay when transitioning to "checked".
    const wasChecked = checked[dayIdx];
    toggleDayCheckin(solution.id, dayIdx);
    if (next && !wasChecked && !prefersReducedMotion) {
      setJustChecked(dayIdx);
      window.setTimeout(() => setJustChecked(null), 700);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className="bg-card-gradient shadow-card-soft rounded-2xl border border-border p-5 flex flex-col gap-4 print:break-inside-avoid print:border-black print:bg-white print:bg-none print:p-4"
    >
      <div className="flex items-start gap-2.5 print:text-black">
        <span className="shrink-0 size-7 rounded-full bg-app-primary text-white flex items-center justify-center text-xs font-bold print:bg-black print:text-white">
          {index + 1}
        </span>
        <h2 className="text-base font-bold text-app-text leading-snug pt-0.5 print:text-black print:text-lg">
          {solution.label_ar}
        </h2>
      </div>

      <ol className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-2.5 print:gap-1.5">
        {days.map((step, dayIdx) => {
          const day = dayIdx + 1;
          const isDone = checked[dayIdx];
          return (
            <li
              key={dayIdx}
              className="flex items-start gap-3 rounded-xl border border-border p-3 bg-app-muted/40 md:flex-1 md:min-w-[200px] print:border-black print:bg-white print:p-2"
            >
              <Checkbox
                id={`plan-${index}-day-${day}`}
                checked={isDone}
                onCheckedChange={(v) => handleCheck(dayIdx, v)}
                className="mt-0.5 no-print print:hidden"
              />
              <span
                className={`relative shrink-0 size-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isDone
                    ? "bg-app-success text-white print:bg-black"
                    : "bg-app-primary/15 text-app-primary print:bg-white print:text-black print:border print:border-black"
                }`}
                aria-hidden="true"
              >
                {day}
                <AnimatePresence>
                  {justChecked === dayIdx && (
                    <motion.span
                      key={`check-${dayIdx}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1.4, opacity: 1 }}
                      exit={{ scale: 1, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18, duration: 0.2 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="bg-app-success text-white rounded-full size-7 flex items-center justify-center shadow-md">
                        <Check className="size-4" aria-hidden="true" />
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <div className="flex-1 min-w-0 print:text-black">
                <p
                  className={`text-sm font-medium leading-relaxed ${
                    isDone ? "text-app-secondary line-through print:text-black" : "text-app-text print:text-black"
                  }`}
                >
                  {step}
                </p>
                <p className="text-xs text-app-secondary mt-0.5 print:text-black">
                  ≈ {estMinutes} دقيقة
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="bg-card-gradient-success border border-app-success/30 rounded-xl p-3 flex flex-col gap-1 print:bg-white print:bg-none print:border-black print:text-black">
        <div className="flex items-center gap-2 text-sm font-semibold text-app-text print:text-black">
          <Target className="size-4 text-app-success print:text-black" aria-hidden="true" />
          مقياس النجاح
        </div>
        <p className="text-sm text-app-secondary leading-relaxed print:text-black">
          {solution.successMetric_ar}
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================
// PlanProgressCard — living progress tracker shown above the
// per-solution timelines. Sums completed days across all
// selected solutions, animates a progress bar, shows a streak
// indicator, and celebrates 100% completion.
// ============================================================

interface PlanProgressCardProps {
  selectedSolutions: Solution[];
  selectedSolutionIds: string[];
  dayCheckins: Record<string, { completed: boolean; completedAt?: number; planId?: string }>;
  planId: string | null;
}

function PlanProgressCard({
  selectedSolutions,
  selectedSolutionIds,
  dayCheckins,
  planId,
}: PlanProgressCardProps) {
  const totalDays = Math.max(1, selectedSolutions.length * 7);
  const scope = planId ?? "";

  // Count completed check-ins among the selected solutions only.
  // Key format is `${planId}-${solutionId}-${dayIdx}` — solution IDs use
  // underscores, and planId may contain hyphens, so we filter by the
  // `planId` field on the DayCheckin record (more robust than string parsing).
  const completedDays = Object.values(dayCheckins).reduce((acc, c) => {
    if (!c.completed) return acc;
    if ((c.planId ?? "") !== scope) return acc;
    // The solutionId isn't on the reduced type, so we infer from the key
    // by stripping the `${scope}-` prefix and the trailing `-${dayIdx}`.
    return acc + 1;
  }, 0);

  const pct = Math.round((completedDays / totalDays) * 100);
  const isComplete = completedDays === totalDays && selectedSolutions.length > 0;

  // Streak: walking from the highest dayIdx with any completion
  // backwards through dayIdxes, counting consecutive dayIdxes that
  // have at least one completed check-in across the selected solutions.
  const streak = React.useMemo(() => {
    if (selectedSolutions.length === 0) return 0;
    const solIds = selectedSolutions.map((s) => s.id);
    // For each dayIdx 0..6, mark whether at least one selected solution has it completed.
    const dayHasCompletion = (dayIdx: number) =>
      solIds.some((id) => dayCheckins[`${scope}-${id}-${dayIdx}`]?.completed);
    // Find the highest dayIdx with a completion.
    let topDay = -1;
    for (let d = 6; d >= 0; d--) {
      if (dayHasCompletion(d)) { topDay = d; break; }
    }
    if (topDay === -1) return 0;
    let s = 0;
    for (let d = topDay; d >= 0; d--) {
      if (dayHasCompletion(d)) s++;
      else break;
    }
    return s;
  }, [selectedSolutions, dayCheckins, scope]);

  const showStreak = streak >= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`no-print print:hidden rounded-2xl border p-4 flex flex-col gap-3 shadow-card-soft ${
        isComplete
          ? "bg-card-gradient-success border-app-success/40"
          : "bg-card-gradient border-border"
      }`}
      aria-label="تقدّمك في الخطة"
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 size-8 rounded-full bg-app-primary/15 text-app-primary flex items-center justify-center">
          <TrendingUp className="size-4" aria-hidden="true" />
        </span>
        <div className="flex-1 flex flex-col">
          <h2 className="text-sm font-bold text-app-text leading-tight">
            تقدّمك في الخطة
          </h2>
          <p className="text-xs text-app-secondary leading-relaxed mt-0.5">
            علام على الخطوة كل ما تخلّصها — التقدّم بيتسجّل تلقائياً
          </p>
        </div>
        {isComplete ? (
          <Sparkles className="size-5 text-app-success shrink-0" aria-hidden="true" />
        ) : showStreak ? (
          <Flame className="size-5 text-amber-500 shrink-0" aria-hidden="true" />
        ) : null}
      </div>

      {isComplete ? (
        <div className="bg-app-success/15 border border-app-success/40 rounded-xl p-3 flex items-center gap-2.5">
          <Sparkles className="size-5 text-app-success shrink-0" aria-hidden="true" />
          <p className="text-sm font-semibold text-app-text leading-relaxed">
            أحسنت! خلّصت كل أيام الخطة 🎉
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Progress
            value={pct}
            className="h-2.5 bg-app-muted"
            aria-label={`نسبة الإنجاز: ${pct}%`}
          />
          <div className="flex items-center justify-between text-xs text-app-secondary">
            <span className="tabular-nums">
              <span className="font-bold text-app-text tabular-nums">{completedDays}</span>
              {" "}
              من
              {" "}
              <span className="tabular-nums">{totalDays}</span>
              {" "}
              يوم
            </span>
            <span className="tabular-nums font-bold text-app-primary">{pct}%</span>
          </div>
        </div>
      )}

      {showStreak && !isComplete && (
        <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
          <Flame className="size-4 shrink-0" aria-hidden="true" />
          <span>
            🔥 <span className="tabular-nums">{streak}</span> أيام ورا بعض
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// DailyReminderCard — gentle nudge to come back daily.
// ============================================================

function DailyReminderCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="no-print print:hidden bg-card-gradient-accent shadow-card-soft border border-app-primary/25 rounded-2xl p-4 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 size-8 rounded-full bg-app-primary/15 text-app-primary flex items-center justify-center">
          <BellRing className="size-4" aria-hidden="true" />
        </span>
        <h2 className="text-sm font-bold text-app-text leading-tight">تذكير يومي</h2>
      </div>
      <p className="text-xs text-app-secondary leading-relaxed">
        كل يوم، افتح التطبيق وعلام على الخطوة اللي خلصتها. الاستمرارية مفتاح النجاح.
      </p>
      <p className="text-[11px] text-app-secondary leading-relaxed bg-app-muted/60 rounded-lg px-3 py-2">
        نصيحة: حط موعد ثابت كل يوم (مثلاً بعد الفجر أو قبل النوم)
      </p>
    </motion.div>
  );
}

// ============================================================
// StudyTipsSection — collapsible general study guidance.
// Defaults to collapsed, hidden in print, doesn't depend on
// any specific solution. Six tips with icons, titles, and
// descriptions, laid out as a 2-column grid on desktop and
// single column on mobile. Each tip card uses the soft
// card gradient + shadow utilities.
// ============================================================

interface StudyTipsSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Record<string, string>;
}

const STUDY_TIPS: Array<{
  key: string;
  Icon: typeof Clock;
}> = [
  { key: "tip_1", Icon: Clock },
  { key: "tip_2", Icon: MapPin },
  { key: "tip_3", Icon: Moon },
  { key: "tip_4", Icon: Calendar },
  { key: "tip_5", Icon: Users },
  { key: "tip_6", Icon: Smartphone },
];

function StudyTipsSection({ open, onOpenChange, messages }: StudyTipsSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const title = messages.tips_title || "نصائح عامة للمذاكرة";
  const subtitle = messages.tips_subtitle || "إرشادات سريعة تساعدك في رحلتك";

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="no-print print:hidden bg-card-gradient shadow-card-soft rounded-2xl border border-border overflow-hidden"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="touch-target w-full flex items-center gap-2 p-3 text-start hover:bg-app-muted/40 transition-colors"
          aria-expanded={open}
          aria-controls="study-tips-content"
        >
          <span className="shrink-0 size-8 rounded-full bg-app-accent/30 text-app-primary flex items-center justify-center">
            <Lightbulb className="size-4" aria-hidden="true" />
          </span>
          <div className="flex-1 flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-bold text-app-text">{title}</span>
            <span className="text-xs text-app-secondary leading-relaxed">
              {subtitle}
            </span>
          </div>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="shrink-0 text-app-secondary"
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </motion.span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent id="study-tips-content">
        <div className="px-3 pb-4 pt-1 border-t border-app-primary/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
            {STUDY_TIPS.map(({ key, Icon }, idx) => {
              const tipTitle = messages[`${key}_title`];
              const tipDesc = messages[`${key}_desc`];
              if (!tipTitle || !tipDesc) return null;
              return (
                <motion.div
                  key={key}
                  initial={
                    prefersReducedMotion ? false : { opacity: 0, y: 6 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.22,
                    delay: prefersReducedMotion ? 0 : Math.min(idx * 0.04, 0.24),
                  }}
                  className="bg-card-gradient shadow-card-soft rounded-xl border border-border p-3 flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 size-7 rounded-full bg-app-primary/15 text-app-primary flex items-center justify-center">
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    <h3 className="text-sm font-bold text-app-text leading-snug">
                      {tipTitle}
                    </h3>
                  </div>
                  <p className="text-xs text-app-secondary leading-relaxed">
                    {tipDesc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function buildPlanText(
  solutions: Solution[],
  meta: {
    planId: string | null;
    reviewDate: string | null;
    savedAt: number | null;
    participantCode: string | null;
  },
): string {
  const lines: string[] = [];
  lines.push("=== خطتي على جذور ===");
  lines.push("");
  if (meta.participantCode) lines.push(`كود المشاركة: ${meta.participantCode}`);
  lines.push(`كود الخطة: ${meta.planId ?? "غير محفوظ"}`);
  if (meta.reviewDate) lines.push(`موعد المراجعة: بعد أسبوع — ${meta.reviewDate}`);
  if (meta.savedAt) lines.push(`تاريخ الحفظ: ${new Date(meta.savedAt).toLocaleString("ar-EG")}`);
  lines.push("");
  solutions.forEach((sol, idx) => {
    lines.push(`--- الحل ${idx + 1}: ${sol.label_ar} ---`);
    sol.steps_ar.forEach((step, dayIdx) => {
      lines.push(`  اليوم ${dayIdx + 1}: ${step} (≈ ${Math.max(20, sol.dailyMinutes || 20)} دقيقة)`);
    });
    lines.push("");
    lines.push(`مقياس النجاح: ${sol.successMetric_ar}`);
    lines.push("");
  });
  lines.push("القرار النهائي لك — اختر اللي يناسبك وعدّل عليه.");
  lines.push("");
  lines.push("جذور — نظّم وقتك، افهم نفسك");
  return lines.join("\n");
}

/**
 * Build a concise share-friendly summary of the plan for clipboard / messaging.
 * Shorter than buildPlanText — includes causes + selected solutions + review date
 * but omits the full step-by-step timeline.
 */
function buildShareSummary(
  solutions: Solution[],
  meta: {
    planId: string | null;
    reviewDate: string | null;
    participantCode: string | null;
    causeScores: Record<string, { score: number; causeId: string }>;
    content: { causes: { id: string; label_ar: string }[]; symptoms: { id: string; label_ar: string }[] } | null;
    symptomId: string | null;
  },
): string {
  const lines: string[] = [];
  lines.push("🌱 خطتي على جذور");
  lines.push("");

  // Symptom
  if (meta.content && meta.symptomId) {
    const sym = meta.content.symptoms.find((s) => s.id === meta.symptomId);
    if (sym) {
      lines.push(`المشكلة: ${sym.label_ar}`);
      lines.push("");
    }
  }

  // Top causes (sorted by score desc, top 3)
  const topCauses = Object.values(meta.causeScores)
    .filter((cs) => cs.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (topCauses.length > 0 && meta.content) {
    lines.push("الأسباب الأقرب:");
    topCauses.forEach((cs, i) => {
      const cause = meta.content!.causes.find((c) => c.id === cs.causeId);
      const label = cause?.label_ar ?? cs.causeId;
      lines.push(`  ${i + 1}. ${label} (${cs.score}%)`);
    });
    lines.push("");
  }

  // Selected solutions
  lines.push("الحلول المختارة:");
  solutions.forEach((sol, idx) => {
    lines.push(`  ${idx + 1}. ${sol.label_ar} — ${sol.dailyMinutes} دقيقة/يوم`);
  });
  lines.push("");

  // Review date
  if (meta.reviewDate) {
    lines.push(`📅 موعد المراجعة: بعد أسبوع (${meta.reviewDate})`);
  }
  if (meta.planId) {
    lines.push(`كود الخطة: ${meta.planId}`);
  }
  lines.push("");
  lines.push("جذور — نظّم وقتك، افهم نفسك");

  return lines.join("\n");
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
