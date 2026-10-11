# Task ID 3 — Juzoor UI Builder

Agent: juzoor-ui
Task: Build all Juzoor UI screens (welcome, symptom, profile, questions, causes, why, solutions, scenarios, plan, followup, done) wired into a single-page Next.js app at `/`.

## Files read (context)
- `/home/z/my-project/worklog.md` — engine + content already complete (Task 1 & 2)
- `/home/z/my-project/src/lib/engine/types.ts` — full TS interfaces
- `/home/z/my-project/src/lib/engine/index.ts` — engine public API
- `/home/z/my-project/src/lib/store.ts` — Zustand store with `screen`, actions; persisted under `juzoor.session.v1`
- `/home/z/my-project/src/app/layout.tsx` — RTL layout with Cairo font, Toaster, ThemeProvider
- `/home/z/my-project/src/app/globals.css` — Juzoor theme tokens (`--app-primary`, `--app-accent`, etc.) + utilities (`bg-app-*`, `text-app-*`, `font-cairo`, `pb-safe`, `pt-safe`, `touch-target`, `scroll-area-juzoor`, `confidence-*`)
- `/home/z/my-project/content/ui/messages.json` + `explain.json` — Arabic strings
- `/home/z/my-project/content/study/{symptoms,causes,questions,solutions}.json` — actual content
- `/home/z/my-project/src/components/ui/` — full shadcn set incl. Button, Card, Input, Label, RadioGroup, Progress, Sheet, Slider, Tabs, Checkbox, Textarea, Badge, Separator, ScrollArea, Table, Sonner Toaster (already mounted in layout)
- `/home/z/my-project/package.json` — framer-motion, lucide-react, sonner, recharts available

## Architecture
- Single-page app at `/` only. `useJuzoor(s => s.screen)` selects the active screen component.
- All state via Zustand; UI just renders + dispatches actions.
- Helper components: `support-note.tsx`, `cause-card.tsx`.
- `app-shell.tsx` is the router with sticky header + footer, framer-motion AnimatePresence (subtle slide-left for forward nav in RTL), respects prefers-reduced-motion.
- Print styles added to globals.css for plan export via `window.print()`.

## Plan
Build each screen as its own file under `src/components/juzoor/`. Use shadcn primitives. RTL-aware Tailwind classes (`ps-`/`pe-`/`ms-`/`me-`). Touch targets ≥ 44px. Mobile-first `max-w-md mx-auto`.

## Files produced
- src/components/juzoor/support-note.tsx
- src/components/juzoor/cause-card.tsx
- src/components/juzoor/welcome-screen.tsx
- src/components/juzoor/symptom-screen.tsx
- src/components/juzoor/profile-screen.tsx
- src/components/juzoor/question-screen.tsx
- src/components/juzoor/causes-screen.tsx
- src/components/juzoor/why-chain-screen.tsx
- src/components/juzoor/solutions-screen.tsx
- src/components/juzoor/scenarios-screen.tsx
- src/components/juzoor/plan-screen.tsx
- src/components/juzoor/followup-screen.tsx
- src/components/juzoor/done-screen.tsx
- src/components/juzoor/app-shell.tsx

## Files modified
- src/app/page.tsx (now mounts AppShell)
- src/app/globals.css (added @media print rules for plan export)
- src/lib/store.ts (removed bad WhyAnswer import that was a pre-existing TS error; widened FollowUpState.executed/improved from `boolean | null` to `"yes"|"partial"|"no" | null` to match the 3-option spec)

## Verification
- `bun run lint` → exit 0
- `npx tsc --noEmit --skipLibCheck` → no errors in src/ (only pre-existing errors in examples/ and skills/)
- Dev server compiles successfully and serves `/` with HTTP 200 and rendered Arabic welcome screen (header + hero + intro + consent section + footer visible)

