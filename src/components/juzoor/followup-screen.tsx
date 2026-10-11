"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Send, ChevronRight } from "lucide-react";
import { useJuzoor } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FollowUpState } from "@/lib/store";

export function FollowUpScreen() {
  const [executed, setExecuted] = React.useState<FollowUpState["executed"]>(null);
  const [improved, setImproved] = React.useState<FollowUpState["improved"]>(null);
  const [metricValue, setMetricValue] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const submitFollowUp = useJuzoor((s) => s.submitFollowUp);
  const go = useJuzoor((s) => s.go);

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

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 pt-12 pb-12 flex flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-card rounded-2xl border border-app-accent/40 p-6 flex flex-col gap-4 items-center text-center"
        >
          <div className="size-16 rounded-full bg-app-accent/30 flex items-center justify-center">
            <Send className="size-8 text-app-primary" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-app-text">شكراً لتقييمك!</h1>
          <p className="text-sm text-app-secondary leading-relaxed">
            بياناتك تساعدنا نطوّر الأداة. تقدر تبدأ رحلة جديدة أو تخرج من التطبيق.
          </p>
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
                      ? "border-app-primary bg-app-primary/5 text-app-primary"
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
                      ? "border-app-primary bg-app-primary/5 text-app-primary"
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
