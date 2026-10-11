'use client'

import { useEffect } from "react";
import { useJuzoor } from "@/lib/store";
import { AppShell } from "@/components/juzoor/app-shell";
import { JuzoorErrorBoundary } from "@/components/juzoor/error-boundary";

export default function Home() {
  const content = useJuzoor((s) => s.content);
  const init = useJuzoor((s) => s.init);
  const screen = useJuzoor((s) => s.screen);

  // On first mount: if no content loaded yet (fresh client or persisted but missing), init study.
  useEffect(() => {
    if (!content) init("study");
    // If a persisted session exists, leave it alone — content will be rehydrated by the store.
    // We re-load content here only when truly missing (rehydration sets content via onRehydrateStorage).
  }, [content, init]);

  // Safety: if persisted screen exists but no content (edge case), re-init.
  useEffect(() => {
    if (!content && screen !== "welcome") init("study");
  }, [content, screen, init]);

  return (
    <JuzoorErrorBoundary>
      <AppShell />
    </JuzoorErrorBoundary>
  );
}
