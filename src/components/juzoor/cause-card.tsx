"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Info } from "lucide-react";
import type { Cause, CauseScore } from "@/lib/engine/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CauseCardProps {
  cause: Cause | undefined;
  score: CauseScore;
  rank: number;
  onOpenWhy: (causeId: string) => void;
}

function confidenceLabel(c: "high" | "medium" | "low"): string {
  switch (c) {
    case "high":
      return "عالية";
    case "medium":
      return "متوسطة";
    case "low":
      return "منخفضة";
  }
}

function rankBadgeClass(rank: number): string {
  if (rank === 1) return "bg-app-primary text-white";
  if (rank === 2) return "bg-app-primary/70 text-white";
  return "bg-app-primary/40 text-white";
}

export function CauseCard({ cause, score, rank, onOpenWhy }: CauseCardProps) {
  if (!cause || score.excluded || score.score === 0) return null;

  const conf = score.confidence;
  const confClass =
    conf === "high" ? "confidence-high" : conf === "medium" ? "confidence-medium" : "confidence-low";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: rank * 0.05 }}
      className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-4"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "shrink-0 size-9 rounded-full flex items-center justify-center font-bold text-sm",
            rankBadgeClass(rank),
          )}
          aria-label={`الترتيب ${rank}`}
        >
          {rank}
        </span>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-app-text leading-snug">
            {cause.label_ar}
          </h3>
          <p className="text-sm text-app-secondary mt-0.5">{cause.branch}</p>
        </div>
        <Badge
          className={cn("text-xs font-semibold", confClass)}
          aria-label={`الثقة: ${confidenceLabel(conf)}`}
        >
          {confidenceLabel(conf)}
        </Badge>
      </div>

      <div className="flex items-center gap-3" aria-label={`الدرجة ${score.score} من 100`}>
        <Progress
          value={score.score}
          className="bg-app-muted h-2.5"
        />
        <span className="shrink-0 text-sm font-bold text-app-primary tabular-nums">
          {score.score}%
        </span>
      </div>

      <p className="text-sm text-app-secondary leading-relaxed">{cause.description_ar}</p>

      <Button
        type="button"
        variant="outline"
        className="touch-target w-full text-app-primary border-app-primary/30 hover:bg-app-primary/5"
        onClick={() => onOpenWhy(score.causeId)}
        aria-label={`ليه ظهر ${cause.label_ar}`}
      >
        <Info className="size-4" aria-hidden="true" />
        ليه ظهر ده؟
        <ChevronLeft className="size-4 ms-auto" aria-hidden="true" />
      </Button>
    </motion.div>
  );
}
