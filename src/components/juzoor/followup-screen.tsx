"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Send,
  ChevronRight,
  ClipboardList,
  TrendingUp,
  Target,
  Calendar,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useJuzoor } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type { FollowUpState } from "@/lib/store";
import type { CauseScore } from "@/lib/engine/types";

export function FollowUpScreen() {
  const [executed, setExecuted] = React.useState<FollowUpState["executed"]>(null);
  const [improved, setImproved] = React.useState<FollowUpState["improved"]>(null);
  const [metricValue, setMetricValue] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const submitFollowUp = useJuzoor((s) => s.submitFollowUp);
  const go = useJuzoor((s) => s.go);
  const content = useJuzoor((s) => s.content);
  const causeScores = useJuzoor((s) => s.causeScores);
  const selectedSolutionIds = useJuzoor((s) => s.selectedSolutionIds);
  const symptomId = useJuzoor((s) => s.engine.symptomId);
  const planId = useJuzoor((s) => s.planId);
  const planReviewDate = useJuzoor((s) => s.planReviewDate);
  const answerCount = useJuzoor((s) => s.engine.answers.length);

  const canSubmit = executed !== null && improved !== null;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const numericMetric = metricValue.trim() === "" ? undefined : Number(metricValue);
    submitFollowUp({
      executed,
      improved,
      metricValue: typeof numericMetric === "number" && !Number.isNaN(numericMetric) ? numericMetric : undefined,
      notes: notes.trim() || undefined,
    });
    setSubmitted(true);
  };

  // Build diagnosis recap data
  const symptom = content?.symptoms.find((s) => s.id === symptomId);
  const topCauses: CauseScore[] = React.useMemo(() => {
    return Object.values(causeScores)
      .filter((cs) => !cs.excluded && cs.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [causeScores]);

  const selectedSolutions = React.useMemo(() => {
    if (!content) return [];
    return selectedSolutionIds
      .map((id) => content.solutions.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [content, selectedSolutionIds]);

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 pt-12 pb-12 flex flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-app-accent/20 to-app-primary/10 rounded-2xl border border-app-accent/40 p-6 flex flex-col gap-4 items-center text-center shadow-sm"
        >
          <div className="size-16 rounded-full bg-app-accent/30 flex items-center justify-center">
            <Send className="size-8 text-app-primary" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-app-text">شكراً لتقييمك!</h1>
          <p className="text-sm text-app-secondary leading-relaxed">
            بياناتك تساعدنا نطوّر الأداة. تقدر تبدأ رحلة جديدة أو تخرج من التطبيق.
          </p>

          {/* Quick summary of their follow-up */}
          <div className="w-full bg-card/70 rounded-xl p-3 flex flex-col gap-2 text-start mt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-app-secondary">نفّذت الخطّة:</span>
              <span className="font-bold text-app-text">
                {executed === "yes" ? "أيوه معظمها" : executed === "partial" ? "جزء منها" : "لأ"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-app-secondary">تحسّن الأداء:</span>
              <span className="font-bold text-app-text">
                {improved === "yes" ? "أيوه" : improved === "partial" ? "جزئيًا" : "لأ"}
              </span>
            </div>
            {metricValue.trim() && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-app-secondary">مقياس النجاح:</span>
                <span className="font-bold text-app-primary tabular-nums">{metricValue}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full mt-2">
            <Button
              type="button"
              className="touch-target h-11 bg-app-primary text-white hover:bg-app-primary/90"
              onClick={() => go("done")}
            >
              تمام
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">
      <header className="flex flex-col gap-1.5 pt-2">
        <h1 className="text-2xl font-bold text-app-text leading-snug">
          بعد أسبوع: فحص المتابعة
        </h1>
        <p className="text-sm text-app-secondary leading-relaxed">
          راجع نفسك بصراحة — البيانات لك وحدك
        </p>
      </header>

      {/* Diagnosis recap card — shows what the user started with */}
      {symptom && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden border-app-primary/20 shadow-sm">
            <div className="bg-gradient-to-l from-app-primary/10 to-transparent px-4 py-3 border-b border-app-primary/10">
              <h2 className="text-sm font-bold text-app-text flex items-center gap-2">
                <ClipboardList className="size-4 text-app-primary" aria-hidden="true" />
                ملخص تشخيصك
              </h2>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {/* Symptom */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-app-secondary shrink-0">المشكلة:</span>
                <span className="font-bold text-app-text">{symptom.label_ar}</span>
              </div>

              {/* Top causes with mini score bars */}
              {topCauses.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-app-secondary font-medium">الأسباب الأقرب:</span>
                  {topCauses.map((cs, idx) => {
                    const cause = content?.causes.find((c) => c.id === cs.causeId);
                    return (
                      <div key={cs.causeId} className="flex items-center gap-2">
                        <span className="size-5 rounded-full bg-app-primary/15 text-app-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-medium text-app-text flex-1 truncate">
                          {cause?.label_ar ?? cs.causeId}
                        </span>
                        <div className="w-16 h-1.5 bg-app-muted rounded-full overflow-hidden shrink-0">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${cs.score}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className="h-full bg-gradient-to-l from-app-primary to-app-accent rounded-full"
                          />
                        </div>
                        <span className="text-xs font-bold text-app-primary tabular-nums shrink-0 w-8 text-end">
                          {cs.score}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selected solutions */}
              {selectedSolutions.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-app-secondary font-medium">الحلول المختارة:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedSolutions.map((sol) => (
                      <span
                        key={sol.id}
                        className="text-[10px] bg-app-primary/10 text-app-primary rounded-full px-2 py-0.5 font-medium"
                      >
                        {sol.label_ar.length > 30 ? sol.label_ar.slice(0, 30) + "…" : sol.label_ar}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Plan info */}
              {planId && (
                <div className="flex items-center gap-3 text-xs text-app-secondary pt-1 border-t border-app-primary/10">
                  <span className="flex items-center gap-1">
                    <Target className="size-3" aria-hidden="true" />
                    <span className="font-mono">{planId}</span>
                  </span>
                  {planReviewDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" aria-hidden="true" />
                      {planReviewDate}
                    </span>
                  )}
                  <span className="flex items-center gap-1 ms-auto">
                    <CheckCircle2 className="size-3 text-app-success" aria-hidden="true" />
                    {answerCount} إجابة
                  </span>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Q1: executed */}
      <section className="flex flex-col gap-3" aria-labelledby="executed-label">
        <h2 id="executed-label" className="text-base font-semibold text-app-text">
          1. نفّذت الخطّة؟
        </h2>
        <RadioGroup
          value={executed ?? ""}
          onValueChange={(v) =>
            setExecuted(v === "yes" || v === "partial" || v === "no" ? v : null)
          }
          className="grid grid-cols-1 gap-2"
        >
          {[
            { v: "yes", label: "أيوه معظمها" },
            { v: "partial", label: "جزء منها" },
            { v: "no", label: "لأ" },
          ].map((opt) => {
            const id = `executed-${opt.v}`;
            const checked = executed === opt.v;
            return (
              <div key={id} className="contents">
                <Label
                  htmlFor={id}
                  className={`cursor-pointer rounded-xl border-2 p-4 flex items-center justify-center gap-2 touch-target font-medium transition-all ${
                    checked
                      ? "border-app-primary bg-app-primary/5 text-app-primary shadow-sm"
                      : "border-border bg-card text-app-text hover:border-app-primary/40"
                  }`}
                >
                  {opt.label}
                </Label>
                <RadioGroupItem id={id} value={opt.v} className="sr-only" />
              </div>
            );
          })}
        </RadioGroup>
      </section>

      {/* Q2: improved */}
      <section className="flex flex-col gap-3" aria-labelledby="improved-label">
        <h2 id="improved-label" className="text-base font-semibold text-app-text">
          2. تحسّن الأداء؟
        </h2>
        <RadioGroup
          value={improved ?? ""}
          onValueChange={(v) =>
            setImproved(v === "yes" || v === "partial" || v === "no" ? v : null)
          }
          className="grid grid-cols-3 gap-2"
        >
          {[
            { v: "yes", label: "أيوه" },
            { v: "partial", label: "جزئيًا" },
            { v: "no", label: "لأ" },
          ].map((opt) => {
            const id = `improved-${opt.v}`;
            const checked = improved === opt.v;
            return (
              <div key={id} className="contents">
                <Label
                  htmlFor={id}
                  className={`cursor-pointer rounded-xl border-2 p-3 flex items-center justify-center gap-2 touch-target font-medium text-sm transition-all ${
                    checked
                      ? "border-app-primary bg-app-primary/5 text-app-primary shadow-sm"
                      : "border-border bg-card text-app-text hover:border-app-primary/40"
                  }`}
                >
                  {opt.label}
                </Label>
                <RadioGroupItem id={id} value={opt.v} className="sr-only" />
              </div>
            );
          })}
        </RadioGroup>
      </section>

      {/* Optional metric */}
      <section className="flex flex-col gap-2" aria-labelledby="metric-label">
        <Label htmlFor="metric-value" id="metric-label" className="text-sm text-app-secondary">
          قيمة مقياس النجاح (اختياري)
        </Label>
        <Input
          id="metric-value"
          type="number"
          inputMode="decimal"
          placeholder="مثال: 75"
          value={metricValue}
          onChange={(e) => setMetricValue(e.target.value)}
          className="touch-target h-11"
        />
      </section>

      {/* Optional notes */}
      <section className="flex flex-col gap-2" aria-labelledby="notes-label">
        <Label htmlFor="notes" id="notes-label" className="text-sm text-app-secondary">
          ملاحظات (اختياري)
        </Label>
        <Textarea
          id="notes"
          placeholder="إيه اللي زاد/قلّ، وعايز نضيف إيه للخطوة الجاية"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-20"
        />
      </section>

      <Button
        type="button"
        disabled={!canSubmit}
        className="touch-target h-12 text-base bg-app-primary text-white hover:bg-app-primary/90"
        onClick={handleSubmit}
      >
        <Send className="size-4" aria-hidden="true" />
        ابعت التقييم
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
