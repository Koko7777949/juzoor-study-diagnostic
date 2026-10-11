"use client";

import * as React from "react";
import { motion, animate } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  Brain,
  ChevronLeft,
  Clock,
  Info,
  ListTree,
  Moon,
  Smartphone,
  Sparkles,
  Target,
} from "lucide-react";
import type { Cause, CauseScore } from "@/lib/engine/types";
import { Button } from "@/components/ui/button";
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
  if (rank === 1)
    // Gold/amber for the closest cause
    return "bg-amber-400 text-amber-950 shadow-md shadow-amber-400/30 ring-2 ring-amber-300/50";
  if (rank === 2) return "bg-app-primary/70 text-white";
  return "bg-app-primary/40 text-white";
}

// Map a cause's branch name to a representative Lucide icon.
// Study domain branches are explicitly mapped; project-domain branches
// (التقسيم، الأدوار، التواصل، التقدير، الوضوح، المماطلة) fall back to ListTree.
// Rendered as a dedicated sub-component to satisfy react-hooks/static-components
// (icons are chosen by switch, not by mid-render assignment).
function BranchIcon({
  branch,
  className,
}: {
  branch: string;
  className?: string;
}) {
  switch (branch) {
    case "الوقت":
      return <Clock className={className} aria-hidden="true" />;
    case "الفهم":
      return <Brain className={className} aria-hidden="true" />;
    case "التشتت":
      return <Smartphone className={className} aria-hidden="true" />;
    case "الطريقة":
      return <BookOpen className={className} aria-hidden="true" />;
    case "النوم":
      return <Moon className={className} aria-hidden="true" />;
    case "التوتر":
      return <AlertCircle className={className} aria-hidden="true" />;
    case "الدافعية":
      return <Target className={className} aria-hidden="true" />;
    default:
      return <ListTree className={className} aria-hidden="true" />;
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function CauseCard({ cause, score, rank, onOpenWhy }: CauseCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayedScore, setDisplayedScore] = React.useState(0);

  // Stable hook order: animate the score number from 0 to its final value
  // over 0.8s with a delay that scales with rank (so cards stagger in).
  React.useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayedScore(score.score);
      return;
    }
    setDisplayedScore(0);
    const controls = animate(0, score.score, {
      duration: 0.8,
      delay: rank * 0.1,
      ease: "easeOut",
      onUpdate: (v) => setDisplayedScore(Math.round(v)),
    });
    return () => controls.stop();
  }, [score.score, rank, prefersReducedMotion]);

  if (!cause || score.excluded || score.score === 0) return null;

  const conf = score.confidence;
  const confClass =
    conf === "high"
      ? "confidence-high"
      : conf === "medium"
        ? "confidence-medium"
        : "confidence-low";

  const isTop = rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: rank * 0.05 }}
      whileHover={
        prefersReducedMotion
          ? undefined
          : { y: -2, transition: { duration: 0.15, ease: "easeOut" } }
      }
      className={cn(
        "rounded-2xl border p-5 flex flex-col gap-4 relative",
        isTop
          ? "bg-card-gradient-accent border-amber-400/60 shadow-card-hover"
          : "bg-card-gradient border-border shadow-card-soft",
      )}
    >
      {isTop && (
        <motion.span
          initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 14,
            delay: 0.3,
          }}
          className="absolute top-2 end-2 inline-flex items-center gap-1 bg-amber-400 text-amber-950 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm"
          aria-label="الأقرب للعرض"
        >
          <Sparkles className="size-3" aria-hidden="true" />
          الأقرب
        </motion.span>
      )}

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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <BranchIcon
              branch={cause.branch}
              className="size-4 text-app-primary shrink-0"
            />
            <h3 className="text-xl font-bold text-app-text leading-snug">
              {cause.label_ar}
            </h3>
          </div>
          <p className="text-sm text-app-secondary mt-0.5">{cause.branch}</p>
        </div>
        <motion.div
          initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  type: "spring",
                  stiffness: 500,
                  damping: 18,
                  delay: rank * 0.05 + 0.2,
                }
          }
        >
          <Badge
            className={cn("text-xs font-semibold", confClass)}
            aria-label={`الثقة: ${confidenceLabel(conf)}`}
          >
            {confidenceLabel(conf)}
          </Badge>
        </motion.div>
      </div>

      <div
        className="flex items-center gap-3"
        aria-label={`الدرجة ${score.score} من 100`}
      >
        <div className="flex-1 h-2.5 bg-app-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--app-primary), var(--app-accent))",
            }}
            initial={{
              width: prefersReducedMotion ? `${score.score}%` : 0,
            }}
            animate={{ width: `${score.score}%` }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.8, delay: rank * 0.1, ease: "easeOut" }
            }
          />
        </div>
        <span className="shrink-0 text-sm font-bold text-app-primary tabular-nums">
          {displayedScore}%
        </span>
      </div>

      <p className="text-sm text-app-secondary leading-relaxed">
        {cause.description_ar}
      </p>

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
