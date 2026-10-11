"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Clock, AlertTriangle, UserCircle2 } from "lucide-react";
import { useJuzoor } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import type { Profile } from "@/lib/engine/types";

const minutesOptions: Array<15 | 30 | 60 | 90> = [15, 30, 60, 90];

export function ProfileScreen() {
  const domain = useJuzoor((s) => s.domain);
  const symptomId = useJuzoor((s) => s.engine.symptomId);
  const content = useJuzoor((s) => s.content);
  const setProfile = useJuzoor((s) => s.setProfile);
  const startQuestions = useJuzoor((s) => s.startQuestions);
  const go = useJuzoor((s) => s.go);

  // Local state for the form
  const [minutes, setMinutes] = React.useState<15 | 30 | 60 | 90 | null>(null);
  const [urgent, setUrgent] = React.useState<boolean | null>(null);
  const [alone, setAlone] = React.useState<boolean | null>(null);

  // Show "alone" question only for project domain (or when symptom implies team)
  const showAlone = domain === "project";

  const symptomLabel = React.useMemo(() => {
    if (!content || !symptomId) return "";
    return content.symptoms.find((s) => s.id === symptomId)?.label_ar ?? "";
  }, [content, symptomId]);

  const canStart = minutes !== null && urgent !== null && (!showAlone || alone !== null);

  const handleStart = () => {
    if (!canStart || minutes === null || urgent === null) return;
    const profile: Profile = {
      minutesPerDay: minutes,
      urgent,
      ...(showAlone && alone !== null ? { alone } : {}),
    };
    setProfile(profile);
    startQuestions();
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">
      <header className="flex flex-col gap-1.5 pt-2">
        <h1 className="text-2xl font-bold text-app-text leading-snug">خطوة سريعة عنك</h1>
        <p className="text-sm text-app-secondary leading-relaxed">
          عشان نقترح الحلول الأنسب لك
        </p>
        {symptomLabel && (
          <p className="text-xs text-app-primary bg-app-primary/5 border border-app-primary/20 rounded-lg px-3 py-1.5 mt-1 w-fit">
            المشكلة: {symptomLabel}
          </p>
        )}
      </header>

      {/* Minutes per day */}
      <section className="flex flex-col gap-3" aria-labelledby="minutes-label">
        <div className="flex items-center gap-2" id="minutes-label">
          <Clock className="size-5 text-app-primary" aria-hidden="true" />
          <h2 className="text-base font-semibold text-app-text">
            كم دقيقة تقدر تخصصها يومياً؟ <span className="text-app-secondary font-normal">(15 ضروري)</span>
          </h2>
        </div>
        <RadioGroup
          value={minutes ? String(minutes) : ""}
          onValueChange={(v) => setMinutes(Number(v) as 15 | 30 | 60 | 90)}
          className="grid grid-cols-4 gap-2"
        >
          {minutesOptions.map((m) => {
            const id = `min-${m}`;
            const checked = minutes === m;
            return (
              <div key={id} className="contents">
                <Label
                  htmlFor={id}
                  className={`cursor-pointer rounded-xl border-2 p-3 flex flex-col items-center justify-center gap-1 touch-target transition-all ${
                    checked
                      ? "border-app-primary bg-app-primary/5 text-app-primary"
                      : "border-border bg-card text-app-text hover:border-app-primary/40"
                  }`}
                >
                  <span className="text-2xl font-bold tabular-nums">{m}</span>
                  <span className="text-xs">دقيقة</span>
                </Label>
                <RadioGroupItem id={id} value={String(m)} className="sr-only" />
              </div>
            );
          })}
        </RadioGroup>
      </section>

      {/* Urgent */}
      <section className="flex flex-col gap-3" aria-labelledby="urgent-label">
        <div className="flex items-center gap-2" id="urgent-label">
          <AlertTriangle className="size-5 text-app-primary" aria-hidden="true" />
          <h2 className="text-base font-semibold text-app-text">
            عندك امتحان أو تسليم خلال أسبوعين؟
          </h2>
        </div>
        <RadioGroup
          value={urgent === null ? "" : urgent ? "yes" : "no"}
          onValueChange={(v) => setUrgent(v === "yes")}
          className="grid grid-cols-2 gap-2"
        >
          {[
            { v: "no", label: "لأ، عندي وقت" },
            { v: "yes", label: "أيوه، قريب" },
          ].map((opt) => {
            const id = `urgent-${opt.v}`;
            const checked = (opt.v === "yes") === urgent && urgent !== null;
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

      {/* Alone (project only) */}
      {showAlone && (
        <section className="flex flex-col gap-3" aria-labelledby="alone-label">
          <div className="flex items-center gap-2" id="alone-label">
            <UserCircle2 className="size-5 text-app-primary" aria-hidden="true" />
            <h2 className="text-base font-semibold text-app-text">
              المشروع فردي ولا في فريق؟
            </h2>
          </div>
          <RadioGroup
            value={alone === null ? "" : alone ? "alone" : "team"}
            onValueChange={(v) => setAlone(v === "alone")}
            className="grid grid-cols-2 gap-2"
          >
            {[
              { v: "alone", label: "فردي" },
              { v: "team", label: "في فريق" },
            ].map((opt) => {
              const id = `alone-${opt.v}`;
              const checked = alone !== null && (opt.v === "alone") === alone;
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
      )}

      <Card className="mt-2 p-4 bg-app-muted border-app-accent/30">
        <p className="text-xs text-app-secondary leading-relaxed">
          إجاباتك بتساعدنا نفلتر الحلول اللي تناسب وقتك. تقدر ترجع تعدّلها بعدين.
        </p>
      </Card>

      <Button
        type="button"
        disabled={!canStart}
        className="touch-target h-12 text-base bg-app-primary text-white hover:bg-app-primary/90"
        onClick={handleStart}
      >
        ابدأ الأسئلة
        <ChevronRight className="size-5" aria-hidden="true" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="touch-target text-app-secondary hover:text-app-primary"
        onClick={() => go("symptom")}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
        رجوع لاختيار المشكلة
      </Button>
    </div>
  );
}
