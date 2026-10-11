"use client";

import * as React from "react";
import { Heart, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { loadMessages } from "@/lib/content";

export function SupportNote() {
  const messages = React.useMemo(() => loadMessages(), []);
  const [dismissed, setDismissed] = React.useState(false);
  const text = messages.support_note;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-app-muted text-app-secondary rounded-xl border border-app-accent/30 p-4 flex gap-3 items-start"
          role="note"
          aria-live="polite"
        >
          <span className="shrink-0 size-9 rounded-full bg-app-accent/30 text-app-primary flex items-center justify-center">
            <Heart className="size-4" aria-hidden="true" />
          </span>
          <div className="flex-1 text-sm leading-relaxed">
            <p className="font-medium text-app-text mb-1">رسالة من جذور</p>
            <p>{text}</p>
            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="touch-target text-app-primary border-app-primary/40 hover:bg-app-primary/5"
                onClick={() => setDismissed(true)}
              >
                <X className="size-3.5" aria-hidden="true" />
                تمام، فهمت
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
