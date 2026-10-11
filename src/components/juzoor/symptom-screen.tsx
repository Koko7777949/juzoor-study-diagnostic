"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  TrendingDown,
  ClipboardX,
  HelpCircle,
  Brain,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { useJuzoor } from "@/lib/store";
import { Card } from "@/components/ui/card";
import type { Symptom } from "@/lib/engine/types";

const iconMap: Record<string, LucideIcon> = {
  trending_down: TrendingDown,
  clipboard_x: ClipboardX,
  question: HelpCircle,
  brain: Brain,
  compass: Compass,
};

function iconFor(symptom: Symptom): LucideIcon {
  return iconMap[symptom.icon ?? ""] ?? HelpCircle;
}

export function SymptomScreen() {
  const content = useJuzoor((s) => s.content);
  const pickSymptom = useJuzoor((s) => s.pickSymptom);
  const selectedSymptomId = useJuzoor((s) => s.engine.symptomId);

  if (!content) return null;

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">
      <header className="flex flex-col gap-1.5 pt-2">
        <h1 className="text-2xl font-bold text-app-text leading-snug">
          إيه المشكلة اللي بتأثر فيك أكتر؟
        </h1>
        <p className="text-sm text-app-secondary leading-relaxed">
          اختر المشكلة الظاهرة وهنبدأ منها
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {content.symptoms.map((sym, idx) => {
          const Icon = iconFor(sym);
          const selected = selectedSymptomId === sym.id;
          return (
            <motion.button
              key={sym.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              type="button"
              onClick={() => pickSymptom(sym.id)}
              aria-pressed={selected}
              className={`text-start rounded-2xl border-2 p-4 min-h-[96px] flex flex-col gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/40 ${
                selected
                  ? "border-app-primary bg-card-gradient-accent shadow-card-hover"
                  : "border-border bg-card-gradient shadow-card-soft hover:border-app-primary/40 hover:bg-app-muted/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`size-10 rounded-full flex items-center justify-center ${
                    selected ? "bg-app-primary text-white" : "bg-app-accent/30 text-app-primary"
                  }`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h2 className="text-base font-bold text-app-text leading-tight">
                  {sym.label_ar}
                </h2>
              </div>
              {sym.description_ar && (
                <p className="text-xs text-app-secondary leading-relaxed">
                  {sym.description_ar}
                </p>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
