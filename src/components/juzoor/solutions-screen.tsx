"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowUp,
  ChevronDown,
  Crown,
  SearchX,
  ListTree,
} from "lucide-react";
import { toast } from "sonner";
import { useJuzoor } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { Solution, SolutionScore } from "@/lib/engine/types";

const DEFAULT_WEIGHTS = { wE: 35, wA: 25, wS: 15, wF: 25 };

const MAX_SELECTED = 3;

/** Returns the CSS variable name for a score bucket. */
function scoreBucket(score: number): { colorVar: string; label: string } {
  if (score >= 80) return { colorVar: "var(--app-success)", label: "ممتاز" };
  if (score >= 60) return { colorVar: "var(--app-primary)", label: "جيد" };
  if (score >= 40) return { colorVar: "var(--confidence-medium)", label: "متوسط" };
  return { colorVar: "var(--confidence-low)", label: "منخفض" };
}

export function SolutionsScreen() {
  const content = useJuzoor((s) => s.content);
  const solutionScores = useJuzoor((s) => s.solutionScores);
  const selectedSolutionIds = useJuzoor((s) => s.selectedSolutionIds);
  const weights = useJuzoor((s) => s.weights);
  const setWeights = useJuzoor((s) => s.setWeights);
  const toggleSolution = useJuzoor((s) => s.toggleSolution);
  const goToScenarios = useJuzoor((s) => s.goToScenarios);

  // Expansion state — multiple solutions can be open simultaneously so the
  // user can compare details side-by-side. Set<id> for O(1) lookup.
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => new Set<string>(),
  );

  const toggleExpand = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (!content) return null;

  // ============================================================
  // Empty state (defensive — engine always emits 3+ solutions when
  // reaching this screen, but if data is missing we don't want to crash)
  // ============================================================
  if (solutionScores.length === 0) {
    return <EmptySolutionsState />;
  }

  const weightValues = {
    wE: Math.round(weights.wE * 100),
    wA: Math.round(weights.wA * 100),
    wS: Math.round(weights.wS * 100),
    wF: Math.round(weights.wF * 100),
  };

  const handleSliderChange = (key: "wE" | "wA" | "wS" | "wF", val: number) => {
    const next = { ...weightValues, [key]: val };
    setWeights({
      wE: next.wE / 100,
      wA: next.wA / 100,
      wS: next.wS / 100,
      wF: next.wF / 100,
    });
  };

  const resetWeights = () => {
    setWeights({
      ...DEFAULT_WEIGHTS,
      wE: DEFAULT_WEIGHTS.wE / 100,
      wA: DEFAULT_WEIGHTS.wA / 100,
      wS: DEFAULT_WEIGHTS.wS / 100,
      wF: DEFAULT_WEIGHTS.wF / 100,
    });
    toast.success("تمت إعادة ضبط الأوزان للقيم الافتراضية");
  };

  const handleRowToggle = (id: string) => {
    const isSelected = selectedSolutionIds.includes(id);
    if (!isSelected && selectedSolutionIds.length >= MAX_SELECTED) return;
    toggleSolution(id);
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-12 flex flex-col gap-6">
      <header className="flex flex-col gap-1.5 pt-2">
        <h1 className="text-2xl font-bold text-app-text leading-snug">مقارنة الحلول</h1>
        <p className="text-sm text-app-secondary leading-relaxed">
          نصيحتك بالحلول الأنسب حسب أسبابك ووقتك
        </p>
      </header>

      {/* Weight sliders — inline (not sticky to avoid overlapping table content) */}
      <div className="bg-app-muted/40 rounded-xl p-3 border border-app-primary/10">
        <WeightSliders
          values={weightValues}
          onChange={handleSliderChange}
          onReset={resetWeights}
        />
        <p className="text-xs text-app-secondary mt-2 flex items-center gap-1.5 px-1">
          <SlidersHorizontal className="size-3 shrink-0 text-app-primary" aria-hidden="true" />
          حرّك الأوزان وشوف الترتيب بيتغير فوراً
        </p>
      </div>

      <Separator label="جدول المقارنة" />

      {/* Solution count summary */}
      <div className="flex items-center justify-between text-xs text-app-secondary px-1">
        <span className="flex items-center gap-1.5">
          <ListTree className="size-3.5 shrink-0 text-app-primary" aria-hidden="true" />
          عدد الحلول:{" "}
          <span className="font-bold text-app-text tabular-nums">
            {solutionScores.length}
          </span>
          <span className="text-app-secondary/60" aria-hidden="true">—</span>
          المختار:{" "}
          <span className="font-bold text-app-primary tabular-nums">
            {selectedSolutionIds.length}
          </span>{" "}
          من <span className="tabular-nums">{MAX_SELECTED}</span>
        </span>
      </div>

      {/* Comparison matrix - desktop table / mobile cards */}
      <div className="md:block hidden">
        <ComparisonTable
          scores={solutionScores}
          solutions={content.solutions}
          selectedIds={selectedSolutionIds}
          onToggle={handleRowToggle}
          expandedIds={expandedIds}
          onToggleExpand={toggleExpand}
          causes={content.causes}
        />
      </div>
      <div className="md:hidden flex flex-col gap-3">
        {solutionScores.map((sc, idx) => {
          const sol = content.solutions.find((s) => s.id === sc.solutionId);
          if (!sol) return null;
          const selected = selectedSolutionIds.includes(sc.solutionId);
          const maxSelected = selectedSolutionIds.length >= MAX_SELECTED && !selected;
          const isTop = idx === 0; // first in sorted list = #1 priority
          return (
            <SolutionCard
              key={sc.solutionId}
              solution={sol}
              score={sc}
              selected={selected}
              maxSelected={maxSelected}
              isTop={isTop}
              onToggle={() => handleRowToggle(sc.solutionId)}
              causes={content.causes}
              expanded={expandedIds.has(sc.solutionId)}
              onToggleExpand={() => toggleExpand(sc.solutionId)}
            />
          );
        })}
      </div>

      {/* Color legend */}
      <ScoreLegend />

      <Button
        type="button"
        className="touch-target h-12 text-base bg-app-primary text-white hover:bg-app-primary/90 mt-2"
        onClick={goToScenarios}
        disabled={selectedSolutionIds.length === 0}
      >
        اعرض السيناريوهات
        <ChevronLeft className="size-5" aria-hidden="true" />
      </Button>
    </div>
  );
}

// ============================================================
// Empty state — no solutions matched the top causes (defensive)
// ============================================================
function EmptySolutionsState() {
  const go = useJuzoor((s) => s.go);
  return (
    <div className="max-w-md mx-auto px-4 pt-12 pb-12 flex flex-col items-center gap-5 text-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="size-16 rounded-full bg-app-muted flex items-center justify-center"
        aria-hidden="true"
      >
        <SearchX className="size-8 text-app-secondary" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="flex flex-col gap-1.5"
      >
        <h2 className="text-lg font-bold text-app-text">مفيش حلول متاحة</h2>
        <p className="text-sm text-app-secondary leading-relaxed max-w-xs">
          مفيش حلول متاحة للأسباب اللي طلعت. جرّب تعيد الأسئلة بطريقة تانية.
        </p>
      </motion.div>

      <Button
        type="button"
        className="touch-target h-11 bg-app-primary text-white hover:bg-app-primary/90"
        onClick={() => go("causes")}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
        ارجع للأسئلة
      </Button>
    </div>
  );
}

function ScoreLegend() {
  const buckets = [
    { color: "var(--app-success)", label: "ممتاز", range: "≥ 80" },
    { color: "var(--app-primary)", label: "جيد", range: "60-79" },
    { color: "var(--confidence-medium)", label: "متوسط", range: "40-59" },
    { color: "var(--confidence-low)", label: "منخفض", range: "< 40" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-secondary">
      <span className="font-semibold">دلالة الدرجة:</span>
      {buckets.map((b) => (
        <span key={b.label} className="flex items-center gap-1.5">
          <span
            className="size-3 rounded-full inline-block"
            style={{ backgroundColor: b.color }}
            aria-hidden="true"
          />
          <span>{b.label}</span>
          <span className="text-app-secondary/70 tabular-nums">({b.range})</span>
        </span>
      ))}
      <span className="flex items-center gap-1 text-app-primary">
        <ArrowUp className="size-3" aria-hidden="true" />
        مختار (أعلى 3 أولويات)
      </span>
    </div>
  );
}

function Separator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-app-secondary uppercase tracking-wider">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}

function WeightSliders({
  values,
  onChange,
  onReset,
}: {
  values: { wE: number; wA: number; wS: number; wF: number };
  onChange: (key: "wE" | "wA" | "wS" | "wF", val: number) => void;
  onReset: () => void;
}) {
  const sliders = [
    { key: "wE" as const, label: "الفاعلية" },
    { key: "wA" as const, label: "السهولة" },
    { key: "wS" as const, label: "السرعة" },
    { key: "wF" as const, label: "الملاءمة" },
  ];

  const sum = values.wE + values.wA + values.wS + values.wF || 1;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-app-text flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-app-primary" aria-hidden="true" />
          اضبط أولوياتك
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="touch-target text-xs text-app-secondary hover:text-app-primary px-2"
          onClick={onReset}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          إعادة الضبط
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {sliders.map((s) => (
          <div key={s.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <Label htmlFor={`slider-${s.key}`} className="text-app-text font-medium">
                {s.label}
              </Label>
              <span className="font-bold text-app-primary tabular-nums">
                {Math.round((values[s.key] / sum) * 100)}%
              </span>
            </div>
            <Slider
              id={`slider-${s.key}`}
              value={[values[s.key]]}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => onChange(s.key, v[0])}
              aria-label={s.label}
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-app-secondary leading-relaxed">
        النسب بتتعدّل تلقائياً بحيث يكون مجموعها 100%.
      </p>
    </div>
  );
}

function causeLabelFor(
  score: SolutionScore,
  causes: { id: string; label_ar: string }[],
): string {
  const top = causes.find((c) => c.id === score.causeIds[0]);
  return top?.label_ar ?? score.causeIds[0];
}

// ============================================================
// Comparison table (desktop)
// Uses Radix Collapsible with `asChild` to render as <tbody> so each row
// group (data row + details row) is its own Collapsible unit.
// ============================================================
function ComparisonTable({
  scores,
  solutions,
  selectedIds,
  onToggle,
  expandedIds,
  onToggleExpand,
  causes,
}: {
  scores: SolutionScore[];
  solutions: Solution[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  causes: { id: string; label_ar: string }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-app-muted">
            <TableHead className="text-center text-app-secondary font-semibold text-xs w-10">اختيار</TableHead>
            <TableHead className="text-center text-app-secondary font-semibold text-xs w-12">تفاصيل</TableHead>
            <TableHead className="text-app-secondary font-semibold text-xs">الحل</TableHead>
            <TableHead className="text-center text-app-secondary font-semibold text-xs">الفاعلية</TableHead>
            <TableHead className="text-center text-app-secondary font-semibold text-xs">السهولة</TableHead>
            <TableHead className="text-center text-app-secondary font-semibold text-xs">السرعة</TableHead>
            <TableHead className="text-center text-app-secondary font-semibold text-xs">الملاءمة</TableHead>
            <TableHead className="text-center text-app-secondary font-semibold text-xs">الدرجة</TableHead>
            <TableHead className="text-center text-app-secondary font-semibold text-xs">الأولوية</TableHead>
            <TableHead className="text-center text-app-secondary font-semibold text-xs">دقيقة/يوم</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scores.map((sc, idx) => {
            const sol = solutions.find((s) => s.id === sc.solutionId);
            if (!sol) return null;
            const selected = selectedIds.includes(sc.solutionId);
            const disabled = !selected && selectedIds.length >= MAX_SELECTED;
            const bucket = scoreBucket(sc.score);
            const isExpanded = expandedIds.has(sc.solutionId);
            const isTop = idx === 0;

            return (
              <Collapsible
                key={sc.solutionId}
                asChild
                open={isExpanded}
                onOpenChange={() => onToggleExpand(sc.solutionId)}
              >
                <tbody
                  className={cn(
                    "group scroll-mt-40",
                    selected && "bg-app-primary/5",
                    isTop && "ring-1 ring-inset ring-amber-400/40",
                  )}
                >
                  <TableRow
                    className={cn(
                      "border-b",
                      isTop && "bg-amber-50/40",
                      isExpanded && "border-b-app-primary/30",
                    )}
                  >
                    {/* Checkbox cell */}
                    <TableCell className="text-center">
                      <Checkbox
                        checked={selected}
                        disabled={disabled}
                        onCheckedChange={() => onToggle(sc.solutionId)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`اختيار ${sol.label_ar}`}
                      />
                    </TableCell>

                    {/* "تفاصيل" trigger button cell */}
                    <TableCell className="text-center">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="size-8 rounded-md inline-flex items-center justify-center text-app-secondary hover:text-app-primary hover:bg-app-primary/10 transition-colors"
                          aria-label="تفاصيل الحل"
                          aria-expanded={isExpanded}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ChevronDown
                            className={cn(
                              "size-4 transition-transform duration-200",
                              isExpanded && "rotate-180",
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      </CollapsibleTrigger>
                    </TableCell>

                    {/* Solution name cell — also a trigger (per task a) */}
                    <TableCell className="text-app-text font-medium text-xs max-w-[180px]">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="text-start flex items-center gap-1.5 hover:text-app-primary transition-colors"
                          aria-label={`عرض تفاصيل ${sol.label_ar}`}
                          aria-expanded={isExpanded}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isTop && (
                            <span className="inline-flex items-center gap-0.5 shrink-0 bg-amber-400 text-amber-950 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                              <Crown className="size-2.5" aria-hidden="true" />
                              الأفضل لك
                            </span>
                          )}
                          <span className="line-clamp-2">{sol.label_ar}</span>
                        </button>
                      </CollapsibleTrigger>
                    </TableCell>

                    <TableCell className="text-center text-app-text tabular-nums">{sc.E}/5</TableCell>
                    <TableCell className="text-center text-app-text tabular-nums">{sc.A}/5</TableCell>
                    <TableCell className="text-center text-app-text tabular-nums">{sc.S}/5</TableCell>
                    <TableCell className="text-center text-app-text tabular-nums">{sc.fit}/5</TableCell>

                    {/* Score cell with color bar */}
                    <TableCell className="text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--app-muted)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${sc.score}%`, backgroundColor: bucket.colorVar }}
                          />
                        </div>
                        <span
                          className="font-bold text-xs tabular-nums"
                          style={{ color: bucket.colorVar }}
                        >
                          {sc.score}
                        </span>
                      </div>
                    </TableCell>

                    {/* Priority cell */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {selected && (
                          <ArrowUp
                            className="size-3 text-app-primary"
                            aria-label="مختار"
                            aria-hidden="true"
                          />
                        )}
                        <span className="font-bold text-app-primary tabular-nums">{sc.priority}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center text-app-text tabular-nums">{sol.dailyMinutes}</TableCell>
                  </TableRow>

                  {/* Details row — spans all 10 columns, hidden when collapsed */}
                  <CollapsibleContent asChild>
                    <TableRow className="data-[state=closed]:hidden">
                      <TableCell colSpan={10} className="bg-app-muted/30">
                        <SolutionDetailPanel
                          solution={sol}
                          score={sc}
                          causes={causes}
                        />
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </tbody>
              </Collapsible>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================
// Solution detail panel (reusable expansion content)
// Shown inside both the desktop table details row and the mobile card.
// ============================================================
function SolutionDetailPanel({
  solution,
  score,
  causes,
}: {
  solution: Solution;
  score: SolutionScore;
  causes: { id: string; label_ar: string }[];
}) {
  // Lookup cause labels from content.causes
  const causeLabels: string[] = score.causeIds.map((id) => {
    const c = causes.find((cc) => cc.id === id);
    return c?.label_ar ?? id;
  });

  // Scenarios preview — truncate expected_ar to ~80 chars
  const expected = solution.scenarios?.expected_ar ?? "";
  const truncated =
    expected.length > 80 ? `${expected.slice(0, 80).trimEnd()}…` : expected;

  // First step + remaining count
  const firstStep = solution.steps_ar?.[0] ?? "";
  const remainingSteps = Math.max(0, (solution.steps_ar?.length ?? 0) - 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 py-3"
    >
      {/* CauseIds row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold text-app-secondary uppercase tracking-wider">
          الأسباب:
        </span>
        {causeLabels.map((label, i) => (
          <Badge
            key={`${label}-${i}`}
            variant="outline"
            className="text-app-primary border-app-primary/30 bg-app-primary/5 gap-1"
          >
            <ListTree className="size-2.5" aria-hidden="true" />
            {label}
          </Badge>
        ))}
      </div>

      {/* Scenarios preview */}
      {truncated && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-app-secondary uppercase tracking-wider">
            السيناريو المتوقع:
          </span>
          <p className="text-xs text-app-text leading-relaxed">{truncated}</p>
          <p className="text-[10px] text-app-secondary/70 flex items-center gap-1">
            <ChevronLeft className="size-2.5" aria-hidden="true" />
            اعرض كل السيناريوهات في الصفحة التالية
          </p>
        </div>
      )}

      {/* First step */}
      {firstStep && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-app-secondary uppercase tracking-wider">
            أول خطوة:
          </span>
          <p className="text-xs text-app-text leading-relaxed ps-3 border-s-2 border-app-primary/40">
            {firstStep}
          </p>
          {remainingSteps > 0 && (
            <Badge
              variant="outline"
              className="self-start text-app-secondary border-app-secondary/30 bg-app-muted/40 mt-1"
            >
              + {remainingSteps} خطوات تانية
            </Badge>
          )}
        </div>
      )}

      {/* Success metric in a small green-accent card */}
      {solution.successMetric_ar && (
        <div className="bg-app-success/10 border border-app-success/30 rounded-lg p-2.5 flex items-start gap-2">
          <Check className="size-3.5 text-app-success shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-app-success uppercase tracking-wider">
              مؤشر النجاح:
            </span>
            <p className="text-xs text-app-text leading-relaxed">
              {solution.successMetric_ar}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// Mobile solution card (also used on narrow desktop viewports)
// ============================================================
function SolutionCard({
  solution,
  score,
  selected,
  maxSelected,
  isTop,
  onToggle,
  causes,
  expanded,
  onToggleExpand,
}: {
  solution: Solution;
  score: SolutionScore;
  selected: boolean;
  maxSelected: boolean;
  isTop: boolean;
  onToggle: () => void;
  causes: { id: string; label_ar: string }[];
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const bucket = scoreBucket(score.score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all",
        selected
          ? "border-app-primary bg-app-primary/5 shadow-sm"
          : "border-border bg-card hover:border-app-primary/40",
        isTop && "border-amber-400/70 ring-1 ring-amber-400/30 shadow-amber-400/10 shadow-md",
        maxSelected && "opacity-60",
      )}
    >
      {/* "الأفضل لك" corner badge for the top solution */}
      {isTop && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.2 }}
          className="absolute -top-2.5 -end-2 inline-flex items-center gap-0.5 bg-amber-400 text-amber-950 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm z-10"
        >
          <Crown className="size-2.5" aria-hidden="true" />
          الأفضل لك
        </motion.span>
      )}

      {/* Clickable header — toggles selection */}
      <motion.button
        type="button"
        onClick={onToggle}
        disabled={maxSelected}
        whileTap={{ scale: 0.99 }}
        className="text-start flex items-start gap-2.5 w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/40"
        aria-pressed={selected}
        aria-label={`اختيار ${solution.label_ar}`}
      >
        <span
          className={cn(
            "shrink-0 size-6 rounded-md flex items-center justify-center border-2 transition-colors mt-0.5",
            selected
              ? "bg-app-primary border-app-primary text-white"
              : "border-app-primary/40 text-transparent",
          )}
          aria-hidden="true"
        >
          {selected && <Check className="size-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-app-text leading-snug">
            {solution.label_ar}
          </h3>
          <p className="text-xs text-app-secondary mt-0.5">
            السبب: {causeLabelFor(score, causes)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            variant="outline"
            className="text-app-primary border-app-primary/40 bg-app-primary/5 font-bold"
          >
            {selected && <ArrowUp className="size-3" aria-hidden="true" />}
            {score.priority}
          </Badge>
          <span className="text-[10px] text-app-secondary">أولوية</span>
        </div>
      </motion.button>

      {/* Ratings grid */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <Rating label="الفاعلية" value={score.E} />
        <Rating label="السهولة" value={score.A} />
        <Rating label="السرعة" value={score.S} />
        <Rating label="الملاءمة" value={score.fit} />
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-2">
        <div
          className="flex-1 rounded-full overflow-hidden h-2"
          style={{ backgroundColor: "var(--app-muted)" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${score.score}%`, backgroundColor: bucket.colorVar }}
          />
        </div>
        <span
          className="text-xs font-bold tabular-nums shrink-0 px-1.5 py-0.5 rounded"
          style={{ color: bucket.colorVar, backgroundColor: `${bucket.colorVar}22` }}
        >
          {score.score}%
        </span>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-app-secondary">
        <span>يحتاج {solution.dailyMinutes} دقيقة/يوم</span>
        {selected && (
          <span className="text-app-primary font-semibold">مختار</span>
        )}
        {maxSelected && (
          <span className="text-app-secondary">وصلت للحد ({MAX_SELECTED})</span>
        )}
      </div>

      {/* Details expandable section */}
      <Collapsible open={expanded} onOpenChange={onToggleExpand}>
        <div className="flex items-center justify-between pt-1 border-t border-app-primary/10">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="touch-target text-xs text-app-primary hover:text-app-primary hover:bg-app-primary/5 self-start h-8 px-2"
              aria-label="تفاصيل الحل"
              aria-expanded={expanded}
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-200",
                  expanded && "rotate-180",
                )}
                aria-hidden="true"
              />
              تفاصيل
            </Button>
          </CollapsibleTrigger>
          {solution.dailyMinutes === 0 && (
            <span className="text-[10px] text-app-secondary">
              مفيش وقت يومي مطلوب
            </span>
          )}
        </div>

        <CollapsibleContent>
          <div className="pt-2">
            <SolutionDetailPanel solution={solution} score={score} causes={causes} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

function Rating({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-app-secondary">{label}</span>
      <span className="text-xs font-bold text-app-text tabular-nums">{value}/5</span>
    </div>
  );
}
