# Task ID 10 — Polish cause cards + plan save celebration

Agent: juzoor-polish (visual polish pass on top of engine + UI)

## Context files read
- `/home/z/my-project/worklog.md` — full project context (worked example §9,
  polish history from Tasks 3, 5b, 7, 9, 8)
- `/home/z/my-project/src/components/juzoor/cause-card.tsx` — the card to enhance
- `/home/z/my-project/src/components/juzoor/causes-screen.tsx` — parent screen
- `/home/z/my-project/src/components/juzoor/plan-screen.tsx` — needs celebration
- `/home/z/my-project/src/app/globals.css` — theme tokens
  (`--app-primary`, `--app-accent`, `--app-success`, `--app-secondary`,
  `--confidence-high/medium/low`, `--app-muted`, `--app-text`)
- `/home/z/my-project/src/lib/store.ts` — Zustand store
- `/home/z/my-project/src/lib/content.ts` + `content/ui/messages.json`
  (verified `plan_saved_celebrate` key already exists)
- `/home/z/my-project/src/lib/engine/types.ts` — confirmed `Cause.branch` field
- `/home/z/my-project/content/study/causes.json` — confirmed branch names
  (الوقت / الفهم / التشتت / الطريقة / النوم / التوتر / الدافعية)
- `/home/z/my-project/content/project/causes.json` — project branches
  (التقسيم / الأدوار / التواصل / التقدير / الوضوح / المماطلة) → fallback ListTree

## Work Log

### 1. New file `src/components/juzoor/celebration-burst.tsx`
- `CelebrationBurst` component takes `token: number`, `anchor: {x,y}|null`,
  optional `count` (default 24).
- When `token` changes (and `>0`, anchor present, motion NOT reduced),
  generates N particles with random `dx` (-100..100), `dy` (50..200, falls
  down), `rot` (-360..360), `delay` (0..100ms), `duration` (1.2..1.8s),
  random color from Juzoor palette
  (`--app-primary`, `--app-accent`, `--app-success`, `--confidence-medium`,
  `--app-secondary`), random size (6..12px), random shape (circle/square).
- Each particle is a `motion.span` with `position: absolute` inside a
  `position: fixed` parent at the anchor point, `pointerEvents: none`,
  `zIndex: 60`.
- Auto-cleans particles after 2.2s via `setTimeout`.
- Uses `useReducedMotion` from framer-motion — returns `null` (no confetti)
  when user prefers reduced motion. Message card is unaffected.

### 2. Rewrote `src/components/juzoor/cause-card.tsx`
- Added local `usePrefersReducedMotion` hook (same pattern as plan-screen)
  to keep SSR/hydration safe.
- All hooks (`usePrefersReducedMotion`, `useState(0)` for displayedScore,
  `useEffect` for the count-up) declared BEFORE the early return — keeps
  rules-of-hooks stable across renders where `cause` is undefined.
- **Hover lift**: `whileHover={{ y: -2, transition: { duration: 0.15 } }}`
  (skipped when reduced motion).
- **Animated score bar**: replaced shadcn `Progress` with a custom
  `motion.div` track (h-2.5 bg-app-muted rounded-full) + inner motion.div
  fill that animates `width: 0 → score%` over 0.8s with `delay: rank*0.1`
  and `ease: "easeOut"`. Fill uses a gradient
  `linear-gradient(90deg, var(--app-primary), var(--app-accent))`.
- **Score number count-up**: `useState` displayedScore + `useEffect` that
  calls framer-motion's `animate(0, score.score, { duration: 0.8, delay:
  rank*0.1, ease: "easeOut", onUpdate: v => setDisplayedScore(Math.round(v)) })`
  and `controls.stop()` on cleanup. With `tabular-nums` to keep digit width
  stable during animation. Reduced motion → immediately sets final score.
- **Rank #1 styling**: card gets `border-amber-400/60 shadow-amber-400/20
  shadow-md` (amber glow). Rank badge for #1 switches to
  `bg-amber-400 text-amber-950 ring-2 ring-amber-300/50` (gold disc).
- **"الأقرب" corner badge**: `motion.span` absolutely positioned
  `top-2 end-2` (top-left in RTL, so it doesn't overlap the rank badge on
  the start/right side) with `bg-amber-400 text-amber-950 rounded-full px-2
  py-0.5 text-[10px] font-bold shadow-sm`, contains `<Sparkles className="size-3" />`
  and the label "الأقرب", `aria-label="الأقرب للعرض"`. Scales in with a spring
  (stiffness 400, damping 14, delay 0.3s).
- **Branch icon**: extracted `BranchIcon` as a top-level sub-component
  (avoiding the `react-hooks/static-components` ESLint rule — assigning a
  Lucide icon to a `const` then rendering `<Const />` triggers the rule).
  Switches on `cause.branch` to pick:
  - الوقت → `Clock`
  - الفهم → `Brain`
  - التشتت → `Smartphone`
  - الطريقة → `BookOpen`
  - النوم → `Moon`
  - التوتر → `AlertCircle`
  - الدافعية → `Target`
  - default (project branches) → `ListTree`
  Rendered inline next to the h3 cause name with `size-4 text-app-primary
  shrink-0`, `aria-hidden`.
- **Confidence badge spring scale-in**: wrapped the `Badge` in a
  `motion.div` with `initial={{ scale: 0, opacity: 0 }}`, `animate={{ scale:
  1, opacity: 1 }}`, `transition={{ type: "spring", stiffness: 500, damping:
  18, delay: rank*0.05 + 0.2 }}`.
- Kept all existing accessibility (`aria-label` on rank badge, confidence
  badge, score row, why button).

### 3. Updated `src/components/juzoor/plan-screen.tsx`
- Added `Sparkles` to Lucide imports.
- Imported `loadMessages` from `@/lib/content`.
- Imported `CelebrationBurst` from `./celebration-burst`.
- Added state `celebrationToken: number` (starts 0, incremented on each
  save click) and `celebrationAnchor: {x,y}|null`. Declared BEFORE the
  `if (!content) return null` early return to keep rules-of-hooks stable.
- Rewrote `handleSave` as a typed `React.MouseEventHandler<HTMLButtonElement>`
  that:
  1. Reads `event.currentTarget.getBoundingClientRect()`.
  2. Sets anchor to the button center.
  3. Increments `celebrationToken`.
  4. Calls `savePlan()` from store.
  5. Calls existing `toast.success("تم الحفظ", { description: planId })`.
- **Plan ID pulse**: wrapped the `{planId}` text in the review-date card
  with `motion.span key={`planid-${celebrationToken}`}` that animates
  `scale: [1, 1.05, 1]` over 0.3s. The `key` change forces remount so the
  pulse re-fires on every save.
- **Motivational message card**: when `celebrationToken > 0` and
  `messages.plan_saved_celebrate` is truthy, render a green-accent card
  (`bg-app-success/10 border-app-success/40 rounded-2xl p-4`) with
  `<Sparkles className="size-5 text-app-success" />` and the message text.
  Animated in via `<AnimatePresence>` + `motion.div` with
  `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}` over 0.4s
  with `delay: 0.2` so it follows the confetti burst. `role="status"` for
  screen readers. Hidden in print (`no-print print:hidden`).
- **Confetti burst**: rendered `<CelebrationBurst token={celebrationToken}
  anchor={celebrationAnchor} />` near the end of the root div. Particles
  burst from the save button center and fall with gravity.

### 4. Lint + ESLint errors fixed
- First pass had 3 errors:
  1. `react-hooks/static-components` on `cause-card.tsx` line 168 —
     "Cannot create components during render" because I assigned
     `const BranchIcon = getBranchIcon(...)` and rendered
     `<BranchIcon />` mid-render. Fixed by extracting `BranchIcon` to a
     top-level function component that takes `{ branch, className }` props
     and uses a `switch` to return the right `<Icon />`.
  2. + 3. `react-hooks/rules-of-hooks` on `plan-screen.tsx` lines 45 + 46
     — `React.useState` was called after the
     `if (!content) return null` early return. Fixed by moving the
     `celebrationToken` and `celebrationAnchor` `useState` declarations
     BEFORE the early return (after the existing `useJuzoor` selector
     hooks).
- Second pass: `bun run lint` exit 0 (clean).

### 5. Verification via agent-browser
- Cleared localStorage + reloaded, walked worked example flow end-to-end:
  - Welcome → consent yes → study domain → يلا نبدأ
  - Symptom: درجاتي قلت
  - Profile: 30 min/day + not urgent → ابدأ الأسئلة
  - Q1=b (تدريجي على شهور), Q2B=b (أغلب المواد), Q3=a (أقل من ساعة),
    Q4=d (مش بذاكر بشكل منتظم), Q5=b (مرة أو مرتين), Q6=b (أيوه بس مش بلتزم),
    Q9=b (واضح) — using keyboard 1-9 hotkeys
  - Causes screen shows EXACTLY 3 cards: تنظيم الوقت / التشتت / الدافعية
  - Scores via `document.body.innerText.match(/\d+%/g)`: "90%, 67%, 55%"
    → TIME=90, DIST=67, MOT=55 ✓ matches §9 exactly
- Confetti verified via JS:
  ```js
  fixedCount: 1, particleCount: 24, zIndex: "60",
  anchor: { x: "747px", y: "317.25px" }  // center of save button
  ```
- Motivational message visible via accessibility tree:
  ```
  status  // role="status"
    StaticText "أحسنت! خطتك جاهزة — ابدأ بخطوة صغيرة النهاردة"
  ```
- Cause card structure verified via JS:
  ```
  Card 1 (TIME, rank 1):
    svgCount: 4  // [Sparkles (الأقرب badge), Clock (branch), Info, ChevronLeft]
    confBadge: "عالية"
    hasClosestBadge: true
    border: "amber-glow"  // amber-400/60 ring + amber-400/20 shadow
  Card 2 (DIST, rank 2):
    svgCount: 3  // [Smartphone (branch), Info, ChevronLeft]
    confBadge: "متوسطة"
    border: "border-default"
  Card 3 (MOT, rank 3):
    svgCount: 3  // [Target (branch), Info, ChevronLeft]
    confBadge: "متوسطة"
    border: "border-default"
  ```
- Plan ID pulse verified via motion.span with `key={`planid-${token}`}` —
  each save remounts the span and triggers the keyframe scale [1, 1.05, 1].
- Toast "تم الحفظ" appears with description showing the new plan ID.
- No console errors; dev.log shows all HTTP 200; no Fast-Refresh runtime
  errors after the lint fixes.

## Stage Summary
- 1 new file (`celebration-burst.tsx`) + 2 rewritten files
  (`cause-card.tsx`, `plan-screen.tsx`).
- Cause cards now feel alive: bar fills, score counts up, rank-1 card
  glows gold with a Sparkles "الأقرب" badge in the corner, branch icon
  sits next to the cause name, confidence badge springs in, card lifts on
  hover.
- Plan save is now rewarding: confetti bursts from the save button,
  plan-ID display pulses, motivational message "أحسنت! خطتك جاهزة — ابدأ
  بخطوة صغيرة النهاردة" slides in below the action buttons in a green
  accent card with Sparkles, existing toast retained.
- All animations respect `prefers-reduced-motion` (CSS rule already in
  globals.css + explicit JS guards: hover-lift disabled, score bar/number
  jump to final value, confidence badge shows without spring, confetti
  skipped entirely, motivational message still appears).
- Worked example §9 still reproduces exactly: TIME=90 (high), DIST=67
  (medium), MOT=55 (medium). Lint passes (exit 0). Dev server compiles
  cleanly with all HTTP 200 responses.
- Did NOT touch engine files (`/src/lib/engine/*`) or content JSON
  (`/content/*`) — engine determinism preserved.
