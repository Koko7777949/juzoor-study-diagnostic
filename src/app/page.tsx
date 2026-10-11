'use client'

import { useEffect, useSyncExternalStore } from "react";
import { useJuzoor } from "@/lib/store";
import { AppShell } from "@/components/juzoor/app-shell";
import { JuzoorErrorBoundary } from "@/components/juzoor/error-boundary";

export default function Home() {
  const init = useJuzoor((s) => s.init);

  // Subscribe to the persist middleware's hydration lifecycle. Without
  // this gate, the auto-init below would fire on every reload (before
  // hydration has merged in the persisted state) and wipe the persisted
  // session — including dayCheckins, planId, engine.answers, etc.
  const hydrated = useSyncExternalStore(
    (callback) => useJuzoor.persist.onFinishHydration(callback),
    () => useJuzoor.persist.hasHydrated(),
    () => true, // SSR: assume hydrated
  );

  // After hydration: if content is still missing, this is a truly fresh
  // client (no persisted session). Boot the study domain. If a session
  // was restored, onRehydrateStorage already loaded content — leave it
  // alone so the user lands back on the screen they were on.
  useEffect(() => {
    if (!hydrated) return;
    const { content, screen } = useJuzoor.getState();
    if (!content) {
      init("study");
    } else if (screen !== "welcome" && !useJuzoor.getState().content) {
      // Safety edge case: screen was persisted but content somehow missing.
      init("study");
    }
  }, [hydrated, init]);

  return (
    <JuzoorErrorBoundary>
      <AppShell />
    </JuzoorErrorBoundary>
  );
}
