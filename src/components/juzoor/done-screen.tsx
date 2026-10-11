"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, Trash2, RotateCcw } from "lucide-react";
import { useJuzoor } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function DoneScreen() {
  const resetAll = useJuzoor((s) => s.resetAll);
  const wipeData = useJuzoor((s) => s.wipeData);
  const go = useJuzoor((s) => s.go);

  const handleNew = () => {
    resetAll();
    go("welcome");
  };
  const handleWipe = () => {
    wipeData();
    go("welcome");
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-12 pb-12 flex flex-col gap-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-card rounded-2xl border border-app-accent/40 p-6 flex flex-col gap-5 items-center text-center"
      >
        <div className="size-20 rounded-full bg-app-accent/30 flex items-center justify-center">
          <Sparkles className="size-10 text-app-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-app-text">رحلتك خلصت — لحد دلوقتي</h1>
        <p className="text-sm text-app-secondary leading-relaxed">
          شكراً إنك وثقت في جذور. كل خطوة أخدتها بتفيدك في المرّة الجاية.
        </p>

        <div className="flex flex-col gap-3 w-full mt-2">
          <Button
            type="button"
            className="touch-target h-12 bg-app-primary text-white hover:bg-app-primary/90"
            onClick={handleNew}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            ابدأ رحلة جديدة
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="touch-target text-app-secondary hover:text-destructive"
            onClick={handleWipe}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            امسح بياناتي واخرج
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
