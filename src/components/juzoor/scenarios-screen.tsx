"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, CheckCircle2, Sparkles, AlertTriangle } from "lucide-react";
import { useJuzoor } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import type { Solution } from "@/lib/engine/types";

export function ScenariosScreen() {
  const content = useJuzoor((s) => s.content);
  const selectedSolutionIds = useJuzoor((s) => s.selectedSolutionIds);
  const goToPlan = useJuzoor((s) => s.goToPlan);
  const go = useJuzoor((s) => s.go);

  if (!content) return null;

  const selectedSolutions: Solution[] = selectedSolutionIds
    .map((id) => content.solutions.find((s) => s.id === id))
    .filter((s): s is Solution => Boolean(s));

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">
      <header className="flex flex-col gap-1.5 pt-2">
        <h1 className="text-2xl font-bold text-app-text leading-snug">سيناريوهات الحلول</h1>
        <p className="text-sm text-app-secondary leading-relaxed">
          لكل حل شوف الأفضل والمتوقع والأسوأ قبل ما تختار
        </p>
      </header>

      {selectedSolutions.length === 0 && (
        <Card className="p-4 bg-app-muted border-app-accent/30 text-app-secondary text-sm">
          مفيش حلول مختارة. ارجع لصفحة المقارنة واختر أكتر من حل.
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="touch-target border-app-primary/30 text-app-primary"
              onClick={() => go("solutions")}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              رجوع للمقارنة
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-5">
        {selectedSolutions.map((sol, idx) => (
          <SolutionScenarioTabs key={sol.id} solution={sol} index={idx} />
        ))}
      </div>

      {selectedSolutions.length > 0 && (
        <Button
          type="button"
          className="touch-target h-12 text-base bg-app-primary text-white hover:bg-app-primary/90 mt-2"
          onClick={goToPlan}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
          ارسم لي خطة
        </Button>
      )}
    </div>
  );
}

function SolutionScenarioTabs({ solution, index }: { solution: Solution; index: number }) {
  const tabIcon = (label: string, Icon: typeof Sparkles) => (
    <span className="flex items-center gap-1.5">
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4"
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0 size-7 rounded-full bg-app-primary text-white flex items-center justify-center text-xs font-bold">
          {index + 1}
        </span>
        <h2 className="text-base font-bold text-app-text leading-snug pt-0.5">
          {solution.label_ar}
        </h2>
      </div>

      <Tabs defaultValue="best" className="w-full">
        <TabsList className="grid grid-cols-3 w-full h-10">
          <TabsTrigger value="best" className="text-xs gap-1">
            {tabIcon("الأفضل", Sparkles)}
          </TabsTrigger>
          <TabsTrigger value="expected" className="text-xs gap-1">
            {tabIcon("المتوقع", CheckCircle2)}
          </TabsTrigger>
          <TabsTrigger value="worst" className="text-xs gap-1">
            {tabIcon("الأسوأ", AlertTriangle)}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="best" className="pt-3">
          <p className="text-sm text-app-text leading-relaxed bg-app-success/10 rounded-xl p-3 border border-app-success/20">
            {solution.scenarios.best_ar}
          </p>
        </TabsContent>
        <TabsContent value="expected" className="pt-3">
          <p className="text-sm text-app-text leading-relaxed bg-app-primary/5 rounded-xl p-3 border border-app-primary/20">
            {solution.scenarios.expected_ar}
          </p>
        </TabsContent>
        <TabsContent value="worst" className="pt-3">
          <p className="text-sm text-app-text leading-relaxed bg-app-muted rounded-xl p-3 border border-border">
            {solution.scenarios.worst_ar}
          </p>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-2 pt-1">
        <h3 className="text-sm font-semibold text-app-text">شروط النجاح:</h3>
        <ul className="flex flex-col gap-1.5">
          {solution.scenarios.successConditions_ar.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-app-secondary">
              <CheckCircle2 className="size-4 text-app-success shrink-0 mt-0.5" aria-hidden="true" />
              <span className="leading-relaxed">{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
