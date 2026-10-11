"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { RotateCcw, SlidersHorizontal, ChevronLeft, Check, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { useJuzoor } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

  if (!content) return null;

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
    setWeights({ ...DEFAULT_WEIGHTS, wE: DEFAULT_WEIGHTS.wE / 100, wA: DEFAULT_WEIGHTS.wA / 100, wS: DEFAULT_WEIGHTS.wS / 100, wF: DEFAULT_WEIGHTS.wF / 100 });
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

      {/* Weight sliders */}
      <WeightSliders
        values={weightValues}
        onChange={handleSliderChange}
        onReset={resetWeights}
      />

      <Separator label="جدول المقارنة" />

      {/* Comparison matrix - desktop table / mobile cards */}
      <div className="md:block hidden">
        <ComparisonTable
          scores={solutionScores}
          solutions={content.solutions}
          selectedIds={selectedSolutionIds}
          onToggle={handleRowToggle}
        />
      </div>
      <div className="md:hidden flex flex-col gap-3">
        {solutionScores.map((sc) => {
          const sol = content.solutions.find((s) => s.id === sc.solutionId);
          if (!sol) return null;
          const selected = selectedSolutionIds.includes(sc.solutionId);
          const maxSelected = selectedSolutionIds.length >= MAX_SELECTED && !selected;
          return (
            <SolutionCard
              key={sc.solutionId}
              solution={sol}
              score={sc}
              selected={selected}
              maxSelected={maxSelected}
              onToggle={() => handleRowToggle(sc.solutionId)}
              causes={content.causes}
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

function ComparisonTable({
  scores,
  solutions,
  selectedIds,
  onToggle,
}: {
  scores: SolutionScore[];
  solutions: Solution[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-app-muted">
            <TableHead className="text-center text-app-secondary font-semibold text-xs w-10">اختيار</TableHead>
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
          {scores.map((sc) => {
            const sol = solutions.find((s) => s.id === sc.solutionId);
            if (!sol) return null;
            const selected = selectedIds.includes(sc.solutionId);
            const disabled = !selected && selectedIds.length >= MAX_SELECTED;
            const bucket = scoreBucket(sc.score);
            return (
              <TableRow
                key={sc.solutionId}
                className={selected ? "bg-app-primary/5" : ""}
                onClick={() => !disabled && onToggle(sc.solutionId)}
              >
                <TableCell className="text-center">
                  <Checkbox
                    checked={selected}
                    disabled={disabled}
                    onCheckedChange={() => onToggle(sc.solutionId)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`اختيار ${sol.label_ar}`}
                  />
                </TableCell>
                <TableCell className="text-app-text font-medium text-xs max-w-[140px]">
                  {sol.label_ar}
                </TableCell>
                <TableCell className="text-center text-app-text tabular-nums">{sc.E}/5</TableCell>
                <TableCell className="text-center text-app-text tabular-nums">{sc.A}/5</TableCell>
                <TableCell className="text-center text-app-text tabular-nums">{sc.S}/5</TableCell>
                <TableCell className="text-center text-app-text tabular-nums">{sc.fit}/5</TableCell>
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
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SolutionCard({
  solution,
  score,
  selected,
  maxSelected,
  onToggle,
  causes,
}: {
  solution: Solution;
  score: SolutionScore;
  selected: boolean;
  maxSelected: boolean;
  onToggle: () => void;
  causes: { id: string; label_ar: string }[];
}) {
  const bucket = scoreBucket(score.score);
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={maxSelected}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-start rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all disabled:opacity-50 ${
        selected
          ? "border-app-primary bg-app-primary/5 shadow-sm"
          : "border-border bg-card hover:border-app-primary/40"
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`shrink-0 size-6 rounded-md flex items-center justify-center border-2 transition-colors ${
            selected
              ? "bg-app-primary border-app-primary text-white"
              : "border-app-primary/40 text-transparent"
          }`}
          aria-hidden="true"
        >
          {selected && <Check className="size-4" />}
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-app-text leading-snug">
            {solution.label_ar}
          </h3>
          <p className="text-xs text-app-secondary mt-0.5">
            السبب: {causeLabelFor(score, causes)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className="text-app-primary border-app-primary/40 bg-app-primary/5 font-bold">
            {selected && <ArrowUp className="size-3" aria-hidden="true" />}
            {score.priority}
          </Badge>
          <span className="text-[10px] text-app-secondary">أولوية</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Rating label="الفاعلية" value={score.E} />
        <Rating label="السهولة" value={score.A} />
        <Rating label="السرعة" value={score.S} />
        <Rating label="الملاءمة" value={score.fit} />
      </div>

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

      <div className="flex items-center justify-between text-xs text-app-secondary">
        <span>يحتاج {solution.dailyMinutes} دقيقة/يوم</span>
        {selected && (
          <span className="text-app-primary font-semibold">مختار</span>
        )}
        {maxSelected && (
          <span className="text-app-secondary">وصلت للحد ({MAX_SELECTED})</span>
        )}
      </div>
    </motion.button>
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
