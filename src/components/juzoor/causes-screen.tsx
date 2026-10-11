"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Lightbulb, Info, ChevronDown, Map } from "lucide-react";
import { useJuzoor } from "@/lib/store";
import { loadExplainText } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getRankingForDisplay, explainCause } from "@/lib/engine";
import type { CauseScore, Contribution } from "@/lib/engine/types";
import { CauseCard } from "./cause-card";
import { IshikawaDiagram } from "./ishikawa-diagram";

export function CausesScreen() {
  const content = useJuzoor((s) => s.content);
  const causeScores = useJuzoor((s) => s.causeScores);
  const engine = useJuzoor((s) => s.engine);
  const goToSolutions = useJuzoor((s) => s.goToSolutions);
  const openWhyForCause = useJuzoor((s) => s.openWhyForCause);

  const explainText = React.useMemo(() => loadExplainText(), []);

  const [drawerCauseId, setDrawerCauseId] = React.useState<string | null>(null);
  const [diagramOpen, setDiagramOpen] = React.useState(false);

  if (!content) return null;

  const ranking: CauseScore[] = getRankingForDisplay(causeScores).filter(
    (cs) => !cs.excluded && cs.score > 0,
  );

  // Top two close causes
  const top1 = ranking[0];
  const top2 = ranking[1];
  const closeCauses =
    top1 && top2 && Math.abs(top1.score - top2.score) <= 15 && top1.score <= 40 && top2.score <= 40;

  const lowConfidence = ranking.length === 0 || (top1 && top1.score < 40);

  const drawerScore = drawerCauseId ? causeScores[drawerCauseId] : null;
  const drawerCause = drawerCauseId
    ? content.causes.find((c) => c.id === drawerCauseId)
    : null;
  const drawerExplanation = drawerCauseId
    ? explainCause(drawerCauseId, causeScores, engine, explainText)
    : "";

  // Symptom label for the Ishikawa diagram head
  const symptom = content.symptoms.find((sym) => sym.id === engine.symptomId);
  const symptomLabel = symptom?.label_ar ?? "العرض";

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">
      <header className="flex flex-col gap-1.5 pt-2">
        <h1 className="text-2xl font-bold text-app-text leading-snug">الأسباب المحتملة</h1>
        <p className="text-sm text-app-secondary leading-relaxed">
          بناءً على إجاباتك، أقرب 3 أسباب:
        </p>
      </header>

      {/* Ishikawa cause-map (collapsible, defaults to collapsed) */}
      <Collapsible
        open={diagramOpen}
        onOpenChange={setDiagramOpen}
        className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="touch-target w-full flex items-center gap-2 p-3 text-start hover:bg-app-muted/40 transition-colors"
            aria-expanded={diagramOpen}
            aria-controls="ishikawa-content"
          >
            <span className="shrink-0 size-8 rounded-full bg-app-primary/15 text-app-primary flex items-center justify-center">
              <Map className="size-4" aria-hidden="true" />
            </span>
            <div className="flex-1 flex flex-col gap-0.5">
              <span className="text-sm font-bold text-app-text">خريطة الأسباب</span>
              <span className="text-xs text-app-secondary leading-relaxed">
                شوف كل الأسباب اللي ممكن تكون ورا العرض
              </span>
            </div>
            <motion.span
              animate={{ rotate: diagramOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 text-app-secondary"
            >
              <ChevronDown className="size-4" aria-hidden="true" />
            </motion.span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent id="ishikawa-content">
          <div className="px-3 pb-4 pt-1 border-t border-app-primary/10">
            <p className="text-xs text-app-secondary leading-relaxed mt-2 mb-3">
              الخط الأخضر الزاهي = الأسباب الأعلى تقييمًا (أقرب 3)؛ باقي الخطوط بدرجات
              أفتح. الشريط الصغير جنب كل سبب = درجته من 100.
            </p>
            <IshikawaDiagram
              causes={content.causes}
              causeScores={causeScores}
              symptomLabel={symptomLabel}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Close causes banner */}
      {closeCauses && top1 && top2 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-app-accent/15 border border-app-accent/40 rounded-2xl p-4 flex flex-col gap-3"
        >
          <p className="text-sm font-medium text-app-text leading-relaxed">
            السببين متقاربين، نقدر نتعمق أكتر
          </p>
          <Button
            type="button"
            size="sm"
            className="touch-target bg-app-primary text-white hover:bg-app-primary/90 self-start"
            onClick={() => openWhyForCause(top1.causeId)}
          >
            <Lightbulb className="size-4" aria-hidden="true" />
            نتعمق بـ ليه؟
          </Button>
        </motion.div>
      )}

      {/* Low confidence */}
      {lowConfidence && (
        <Card className="p-4 bg-app-muted border-app-accent/30">
          <p className="text-sm text-app-secondary leading-relaxed">{explainText.lowConfidence}</p>
        </Card>
      )}

      {/* Cause cards */}
      <div className="flex flex-col gap-4">
        {ranking.map((cs, idx) => (
          <CauseCard
            key={cs.causeId}
            cause={content.causes.find((c) => c.id === cs.causeId)}
            score={cs}
            rank={idx + 1}
            onOpenWhy={(id) => setDrawerCauseId(id)}
          />
        ))}
        {ranking.length === 0 && (
          <p className="text-sm text-app-secondary text-center py-8">
            مفيش أسباب واضحة من إجاباتك. حاول تجاوب تاني على الأسئلة اللي مش متأكد منها.
          </p>
        )}
      </div>

      <Button
        type="button"
        className="touch-target h-12 text-base bg-app-primary text-white hover:bg-app-primary/90 mt-2"
        onClick={goToSolutions}
      >
        تمام، خليني أشوف الحلول
        <ChevronLeft className="size-5" aria-hidden="true" />
      </Button>

      <p className="text-xs text-app-secondary text-center leading-relaxed mt-1">
        {explainText.notDiagnosis}
      </p>

      {/* Explain Drawer */}
      <Sheet open={drawerCauseId !== null} onOpenChange={(open) => !open && setDrawerCauseId(null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t border-app-primary/20 max-h-[80vh] overflow-y-auto"
          aria-label="تفاصيل السبب"
        >
          <SheetHeader className="text-start">
            <SheetTitle className="text-app-text text-lg font-bold flex items-center gap-2">
              <Info className="size-5 text-app-primary" aria-hidden="true" />
              {explainText.causeHeader}
            </SheetTitle>
            <SheetDescription className="text-app-secondary">
              {drawerCause?.label_ar ?? ""}
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-6 flex flex-col gap-4">
            <p className="text-sm text-app-text leading-relaxed">{drawerExplanation}</p>

            {drawerScore && drawerScore.contributions.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <h3 className="text-sm font-semibold text-app-text">تفاصيل إجاباتك:</h3>
                <ul className="flex flex-col gap-1.5">
                  {drawerScore.contributions.map((c, i) => (
                    <ContributionRow key={`${c.qid}-${c.optionId}-${i}`} contribution={c} />
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              {drawerCauseId && (
                <Button
                  type="button"
                  variant="outline"
                  className="touch-target flex-1 border-app-primary/30 text-app-primary hover:bg-app-primary/5"
                  onClick={() => {
                    const id = drawerCauseId;
                    setDrawerCauseId(null);
                    if (id) openWhyForCause(id);
                  }}
                >
                  <Lightbulb className="size-4" aria-hidden="true" />
                  نتعمق بـ ليه؟
                </Button>
              )}
              <SheetClose asChild>
                <Button type="button" className="touch-target flex-1 bg-app-primary text-white hover:bg-app-primary/90">
                  تمام، فهمت
                </Button>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ContributionRow({ contribution }: { contribution: Contribution }) {
  const positive = contribution.weight >= 0;
  const sign = positive ? "+" : "";
  return (
    <li
      className={`text-xs rounded-lg px-3 py-2 border flex flex-col gap-0.5 ${
        positive
          ? "bg-app-success/10 border-app-success/30 text-app-text"
          : "bg-app-muted border-border text-app-secondary"
      }`}
    >
      <span className="font-medium">
        سؤال: {contribution.questionLabel_ar || contribution.qid}
      </span>
      <span className="text-app-secondary">
        إجابتك: {contribution.optionLabel_ar}
      </span>
      <span
        className={`font-bold tabular-nums ${
          positive ? "text-app-success" : "text-app-secondary"
        }`}
      >
        الوزن: {sign}
        {contribution.weight}
        {contribution.isRule ? " (قاعدة)" : contribution.isPrior ? " (سابق)" : ""}
      </span>
    </li>
  );
}
