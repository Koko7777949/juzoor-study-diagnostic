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
  GitCompare,
  Star,
  Lightbulb,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Solution, SolutionScore, Profile } from "@/lib/engine/types";

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
  const profile = useJuzoor((s) => s.engine.profile);

  // Expansion state — multiple solutions can be open simultaneously so the
  // user can compare details side-by-side. Set<id> for O(1) lookup.
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => new Set<string>(),
  );

  // Side-by-side comparison dialog state
  const [compareOpen, setCompareOpen] = React.useState(false);

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

      {/* Side-by-side comparison trigger */}
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          className="touch-target h-11 border-app-primary/40 text-app-primary hover:bg-app-primary/5 hover:text-app-primary px-5 gap-2"
          onClick={() => setCompareOpen(true)}
          disabled={solutionScores.length < 2}
        >
          <GitCompare className="size-4" aria-hidden="true" />
          قارن حلوين
        </Button>
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

      {/* Side-by-side comparison dialog */}
      <SolutionComparisonDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        scores={solutionScores}
        solutions={content.solutions}
        causes={content.causes}
        profile={profile}
        onGoToScenarios={goToScenarios}
      />
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

// ============================================================
// Side-by-side comparison dialog
// Lets the user pick exactly 2 solutions and see them compared
// across all criteria with star ratings, winner highlights, and
// a profile-based "which is better for me?" insight.
// ============================================================

function truncateLabel(s: string, max = 36): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}…`;
}

/** Picks the winner side based on which value is "better". Returns null on ties. */
function pickWinner(
  a: number,
  b: number,
  mode: "higher" | "lower",
): "left" | "right" | null {
  if (a === b) return null;
  if (mode === "higher") return a > b ? "left" : "right";
  return a < b ? "left" : "right";
}

/** Star rating row — filled stars for `value`, empty for the rest (out of `max`). */
function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`${value} من ${max} نجوم`}
      role="img"
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <Star
            key={i}
            className={cn(
              "size-3 sm:size-3.5 transition-colors",
              i < value
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-app-secondary/40",
            )}
          />
        ))}
      </span>
      <span className="text-xs font-bold text-app-text tabular-nums">
        {value}/{max}
      </span>
    </span>
  );
}

/** Dropdown picker for choosing one of the available solutions. */
function SolutionPicker({
  value,
  onChange,
  scores,
  solutions,
  excludeId,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  scores: SolutionScore[];
  solutions: Solution[];
  excludeId: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold text-app-secondary flex items-center gap-1">
        <span
          className="size-4 rounded-full bg-app-primary/10 text-app-primary inline-flex items-center justify-center text-[10px] font-bold"
          aria-hidden="true"
        >
          {label === "الحل الأول" ? "١" : "٢"}
        </span>
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full h-auto min-h-11 py-2 ps-3 pe-8 text-start">
          <SelectValue placeholder="اختار حل..." />
        </SelectTrigger>
        <SelectContent>
          {scores.map((sc) => {
            const sol = solutions.find((s) => s.id === sc.solutionId);
            if (!sol) return null;
            const disabled = sc.solutionId === excludeId;
            return (
              <SelectItem
                key={sc.solutionId}
                value={sc.solutionId}
                disabled={disabled}
              >
                <span className="line-clamp-1">{truncateLabel(sol.label_ar)}</span>
                <span className="text-app-secondary tabular-nums shrink-0">
                  — {sc.score}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

type Winner = "left" | "right" | null;

interface ComparisonRow {
  label: string;
  left: React.ReactNode;
  right: React.ReactNode;
  winner: Winner;
}

/** 3-column comparison table: criterion | solution A | solution B. */
function SideBySideComparisonTable({
  leftSol,
  rightSol,
  leftScore,
  rightScore,
  causes,
}: {
  leftSol: Solution;
  rightSol: Solution;
  leftScore: SolutionScore;
  rightScore: SolutionScore;
  causes: { id: string; label_ar: string }[];
}) {
  const rows: ComparisonRow[] = [
    {
      label: "الفاعلية",
      left: <StarRating value={leftScore.E} />,
      right: <StarRating value={rightScore.E} />,
      winner: pickWinner(leftScore.E, rightScore.E, "higher"),
    },
    {
      label: "السهولة",
      left: <StarRating value={leftScore.A} />,
      right: <StarRating value={rightScore.A} />,
      winner: pickWinner(leftScore.A, rightScore.A, "higher"),
    },
    {
      label: "السرعة",
      left: <StarRating value={leftScore.S} />,
      right: <StarRating value={rightScore.S} />,
      winner: pickWinner(leftScore.S, rightScore.S, "higher"),
    },
    {
      label: "الملاءمة",
      left: <StarRating value={leftScore.fit} />,
      right: <StarRating value={rightScore.fit} />,
      winner: pickWinner(leftScore.fit, rightScore.fit, "higher"),
    },
    {
      label: "الدرجة",
      left: (
        <span className="font-bold text-app-text tabular-nums text-sm">
          {leftScore.score}
        </span>
      ),
      right: (
        <span className="font-bold text-app-text tabular-nums text-sm">
          {rightScore.score}
        </span>
      ),
      winner: pickWinner(leftScore.score, rightScore.score, "higher"),
    },
    {
      label: "الأولوية",
      left: (
        <span className="font-bold text-app-primary tabular-nums text-sm">
          {leftScore.priority}
        </span>
      ),
      right: (
        <span className="font-bold text-app-primary tabular-nums text-sm">
          {rightScore.priority}
        </span>
      ),
      winner: pickWinner(leftScore.priority, rightScore.priority, "higher"),
    },
    {
      label: "دقيقة/يوم",
      left: (
        <span className="text-app-text tabular-nums text-sm">
          {leftSol.dailyMinutes === 0 ? "—" : leftSol.dailyMinutes}
        </span>
      ),
      right: (
        <span className="text-app-text tabular-nums text-sm">
          {rightSol.dailyMinutes === 0 ? "—" : rightSol.dailyMinutes}
        </span>
      ),
      winner: pickWinner(leftSol.dailyMinutes, rightSol.dailyMinutes, "lower"),
    },
    {
      label: "السبب",
      left: (
        <span className="text-xs text-app-text leading-snug">
          {causeLabelFor(leftScore, causes)}
        </span>
      ),
      right: (
        <span className="text-xs text-app-text leading-snug">
          {causeLabelFor(rightScore, causes)}
        </span>
      ),
      winner: null,
    },
    {
      label: "يحتاج فريق؟",
      left: (
        <span
          className={cn(
            "text-sm font-semibold",
            leftSol.needsTeam ? "text-app-secondary" : "text-app-success",
          )}
        >
          {leftSol.needsTeam ? "آه" : "لأ"}
        </span>
      ),
      right: (
        <span
          className={cn(
            "text-sm font-semibold",
            rightSol.needsTeam ? "text-app-secondary" : "text-app-success",
          )}
        >
          {rightSol.needsTeam ? "آه" : "لأ"}
        </span>
      ),
      winner: null,
    },
  ];

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-app-muted/60 hover:bg-app-muted/60">
            <TableHead className="text-xs font-semibold text-app-secondary py-2.5 w-1/3">
              المعيار
            </TableHead>
            <TableHead className="text-xs font-semibold text-app-secondary text-center py-2.5">
              الحل الأول
            </TableHead>
            <TableHead className="text-xs font-semibold text-app-secondary text-center py-2.5">
              الحل الثاني
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow
              key={i}
              className={cn(
                "border-border",
                i % 2 === 1 && "bg-app-muted/20",
              )}
            >
              <TableCell className="text-xs font-medium text-app-secondary py-2.5 align-middle">
                {row.label}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center py-2.5 align-middle",
                  row.winner === "left" &&
                    "bg-app-success/15 border-start-2 border-app-success",
                )}
              >
                {row.left}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center py-2.5 align-middle",
                  row.winner === "right" &&
                    "bg-app-success/15 border-start-2 border-app-success",
                )}
              >
                {row.right}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Compact scenario card showing the "expected" scenario for one solution. */
function ScenarioCard({
  sol,
  title,
}: {
  sol: Solution;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-app-secondary uppercase tracking-wider">
        {title}
      </span>
      <p className="text-xs text-app-text leading-relaxed line-clamp-4">
        {sol.scenarios?.expected_ar ?? "—"}
      </p>
    </div>
  );
}

/**
 * Analyzes the two solutions against the user's profile and produces
 * the most relevant "which is better for me?" insight.
 *
 * Priority:
 * 1. If scores within 5 points → "try both"
 * 2. If one has higher fit → "X أنسب لملاءمتك"
 * 3. If urgent + one is faster → "X أسرع ومناسب لقرب الامتحان"
 * 4. If limited time + one needs less daily time → "X يحتاج وقت أقل يومياً"
 * 5. Default: higher score wins
 */
function analyzeFit(
  leftSol: Solution,
  rightSol: Solution,
  leftScore: SolutionScore,
  rightScore: SolutionScore,
  profile: Profile | null,
): string {
  const scoreDiff = Math.abs(leftScore.score - rightScore.score);

  // 1. Very close scores → recommend trying both
  if (scoreDiff <= 5) {
    return "الحلين متقاربين جداً — جرّب الاتنين وشوف إيه اللي يناسبك أكتر.";
  }

  // 2. Higher fit → recommend that one
  if (leftScore.fit !== rightScore.fit) {
    const fitWinner = leftScore.fit > rightScore.fit ? "الحل الأول" : "الحل الثاني";
    return `${fitWinner} أنسب لملاءمتك (وقتك/فريقك).`;
  }

  // 3. Urgent + speed difference
  if (profile?.urgent && leftScore.S !== rightScore.S) {
    const faster = leftScore.S > rightScore.S ? "الحل الأول" : "الحل الثاني";
    return `${faster} أسرع ومناسب لقرب الامتحان.`;
  }

  // 4. Limited time + daily minutes difference
  if (
    profile &&
    profile.minutesPerDay <= 30 &&
    leftSol.dailyMinutes !== rightSol.dailyMinutes
  ) {
    const lessTime =
      leftSol.dailyMinutes < rightSol.dailyMinutes ? "الحل الأول" : "الحل الثاني";
    return `${lessTime} يحتاج وقت أقل يومياً.`;
  }

  // 5. Default: higher score
  const better = leftScore.score > rightScore.score ? "الحل الأول" : "الحل الثاني";
  const betterScore = leftScore.score > rightScore.score ? leftScore : rightScore;
  const worseScore = leftScore.score > rightScore.score ? rightScore : leftScore;
  return `${better} درجته أعلى (${betterScore.score} مقابل ${worseScore.score}).`;
}

function WhichIsBetterCard({
  leftSol,
  rightSol,
  leftScore,
  rightScore,
  profile,
}: {
  leftSol: Solution;
  rightSol: Solution;
  leftScore: SolutionScore;
  rightScore: SolutionScore;
  profile: Profile | null;
}) {
  const insight = analyzeFit(leftSol, rightSol, leftScore, rightScore, profile);

  return (
    <div className="bg-app-accent/15 border border-app-accent/40 rounded-xl p-4 flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-app-text flex items-center gap-2">
        <Lightbulb
          className="size-4 text-app-primary shrink-0"
          aria-hidden="true"
        />
        أيهما أنسب لي؟
      </h3>
      <p className="text-sm text-app-text leading-relaxed">{insight}</p>
    </div>
  );
}

function SolutionComparisonDialog({
  open,
  onOpenChange,
  scores,
  solutions,
  causes,
  profile,
  onGoToScenarios,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scores: SolutionScore[];
  solutions: Solution[];
  causes: { id: string; label_ar: string }[];
  profile: Profile | null;
  onGoToScenarios: () => void;
}) {
  // Picker state — defaults are set when the dialog opens
  const [leftId, setLeftId] = React.useState<string>("");
  const [rightId, setRightId] = React.useState<string>("");

  // Reset to the first two solutions each time the dialog opens
  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (open && !wasOpenRef.current && scores.length >= 2) {
      setLeftId(scores[0].solutionId);
      setRightId(scores[1].solutionId);
    }
    wasOpenRef.current = open;
  }, [open, scores]);

  // Defensive: ensure IDs are valid and different
  const safeLeftId = scores.find((s) => s.solutionId === leftId)
    ? leftId
    : (scores[0]?.solutionId ?? "");
  const safeRightId =
    scores.find((s) => s.solutionId === rightId) && rightId !== safeLeftId
      ? rightId
      : (scores.find((s) => s.solutionId !== safeLeftId)?.solutionId ?? "");

  const leftScore = scores.find((s) => s.solutionId === safeLeftId);
  const rightScore = scores.find((s) => s.solutionId === safeRightId);
  const leftSol = solutions.find((s) => s.id === safeLeftId);
  const rightSol = solutions.find((s) => s.id === safeRightId);

  // Defensive fallback when there aren't two solutions to compare
  if (!leftScore || !rightScore || !leftSol || !rightSol) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare
                className="size-5 text-app-primary"
                aria-hidden="true"
              />
              مقارنة حلوين
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-app-secondary">
            محتاج حلّين على الأقل عشان نقارنهم. خلّص الأسئلة الأول.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <GitCompare
              className="size-5 text-app-primary shrink-0"
              aria-hidden="true"
            />
            مقارنة حلوين
          </DialogTitle>
          <p className="text-xs text-app-secondary leading-relaxed">
            اختار حلّين وقارنهم على كل المعايير — الخلية الخضراء هي الأحسن في كل صف.
          </p>
        </DialogHeader>

        {/* Solution pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SolutionPicker
            value={safeLeftId}
            onChange={setLeftId}
            scores={scores}
            solutions={solutions}
            excludeId={safeRightId}
            label="الحل الأول"
          />
          <SolutionPicker
            value={safeRightId}
            onChange={setRightId}
            scores={scores}
            solutions={solutions}
            excludeId={safeLeftId}
            label="الحل الثاني"
          />
        </div>

        {/* Comparison table */}
        <SideBySideComparisonTable
          leftSol={leftSol}
          rightSol={rightSol}
          leftScore={leftScore}
          rightScore={rightScore}
          causes={causes}
        />

        {/* Scenarios section */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-app-text flex items-center gap-1.5">
            <ListTree
              className="size-4 text-app-primary shrink-0"
              aria-hidden="true"
            />
            السيناريوهات
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ScenarioCard sol={leftSol} title="الحل الأول" />
            <ScenarioCard sol={rightSol} title="الحل الثاني" />
          </div>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onGoToScenarios();
            }}
            className="text-xs text-app-primary hover:text-app-primary/80 hover:underline self-start flex items-center gap-1 mt-1 ps-1"
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            اعرض كل السيناريوهات
          </button>
        </div>

        {/* Which is better for me? */}
        <WhichIsBetterCard
          leftSol={leftSol}
          rightSol={rightSol}
          leftScore={leftScore}
          rightScore={rightScore}
          profile={profile}
        />

        {/* Close button */}
        <DialogFooter className="sm:justify-center pt-1">
          <Button
            type="button"
            className="bg-app-primary text-white hover:bg-app-primary/90 h-11 px-6 w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            تمام، فهمت
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
