# Task ID 9 — Polish UI + add features

Agent: main (UI polish pass)

## Context
- Read worklog.md, app-shell.tsx, plan-screen.tsx, store.ts, globals.css, layout.tsx,
  causes-screen.tsx, question-screen.tsx, solutions-screen.tsx, why-chain-screen.tsx,
  welcome-screen.tsx, content/ui/{messages,explain}.json, study causes/symptoms/questions
- Confirmed dark mode tokens already exist in globals.css (.dark class)
- Confirmed ThemeProvider (next-themes) is wired in layout.tsx
- Confirmed shadcn Sheet, Collapsible, Table, Progress, Badge, Slider, etc. all available

## Work Log

### 1. Theme toggle (dark mode) in footer — `app-shell.tsx`
- Imported `useTheme` from `next-themes` + `Moon`/`Sun` from `lucide-react`
- Added `ThemeToggle` component in footer; small ghost button, aria-label="تبديل الوضع الليلي"
- Uses `mounted` flag to avoid hydration mismatch (renders `Moon` until mounted, then switches based on `resolvedTheme`)
- Verified via agent-browser: `document.documentElement.classList.contains('dark')` toggles correctly

### 2. About info sheet — `app-shell.tsx`
- Added `AboutButton` in footer (next to wipe link) with `CircleHelp` icon and `عن جذور` label
- Sheet (side="bottom", rounded-t-2xl, max-h-85vh, overflow-y-auto) opens with:
  - Intro paragraph (from `messages.welcome_intro`)
  - Four principles (حتمي، قابل للتفسير، أنت اللي تقرر، مش تشخيص) — each with Lucide icon (Cpu, Eye, Hand, Scale)
  - Privacy note (no accounts, no names, on-device only)
  - `explainText.notDiagnosis` paragraph
  - Version info: `contentVersion` + `engineVersion` from store (displayed as `1.0.0`)
  - "تمام، فهمت" close button
- Verified via agent-browser: all sections render, sheet opens/closes correctly

### 3. Ishikawa fishbone diagram — new file `ishikawa-diagram.tsx` + wired into `causes-screen.tsx`
- New component: responsive SVG (`viewBox="0 0 720 280"`, `max-w-2xl mx-auto`) that:
  - Draws horizontal spine with arrow head pointing to symptom box (right side)
  - Renders 7 (or N) branches alternating top/bottom from the spine
  - Each branch shows Arabic cause name (cause.branch) + small intensity bar (fill = score/100)
  - Top 3 ranked causes use `--app-accent` color; others use `--app-primary`
  - Spine uses `--app-primary` with arrow marker
  - Symptom box shows "العرض" + symptom label (truncated to 14 chars)
- In causes-screen, added `Collapsible` section with `Map` icon, chevron-down (rotates 180° when open), defaults collapsed (`useState(false)`)
- Helper paragraph explains color meaning
- Verified via agent-browser: diagram shows 7 branches with correct scores (TIME=90, DIST=67, MOT=55, etc.), expands/collapses

### 4. Print-friendly plan layout — `plan-screen.tsx` + `globals.css`
- Plan content wrapped with `print:block` and `no-print print:hidden` toggles
- Print-only header shows: "خطتي على جذور" + 3-col grid (participant code | plan ID | review date) + save timestamp
- Each `<PlanTimeline>` card has `print:break-inside-avoid`, `print:border-black`, `print:bg-white`, larger print font sizes
- Day rows print with black borders + white bg
- Added print-only footer note (finalDecisionNote + brand line)
- Fixed typo in print button: "اطلبع" → "اطبع" / "احفظ PDF"
- Added `no-print` class to AppShell header and footer (in addition to `print:hidden`)
- Updated globals.css print rules:
  - `@page { margin: 1.5cm 1cm }` for nicer print
  - `.no-print, [class*="print:hidden"]` → `display: none !important`
  - `h1` 18pt, `h2` 14pt, `p, li` 11pt — larger for readability
  - `print-color-adjust: exact` to preserve colors when supported
  - Various bg-app-* overrides forced to white/black

### 5. Done check animation on plan timeline — `plan-screen.tsx`
- `PlanTimeline` now tracks `justChecked` state (per-day index)
- When a checkbox is checked, `justChecked` is set to the day index, then cleared after 700ms
- `AnimatePresence` renders a `motion.span` overlay (initial scale 0 → animate 1.4, spring stiffness 500 damping 18) showing a `Check` icon in a green circle
- Respects `prefers-reduced-motion` (skips the overlay if reduced motion)
- Verified via agent-browser: clicking first checkbox toggles state successfully (animation fires briefly)

### 6. Keyboard navigation on question screen — `question-screen.tsx`
- New `useKeyboardNav` hook:
  - `1`-`9` selects corresponding known option
  - `?` (Shift+/) or `Escape` selects the unknown option
  - `Backspace` goes to previous question (with `preventDefault`)
  - `enabled` flag (false when no currentQuestion) keeps hook order stable across renders
  - Ignores key events when INPUT/TEXTAREA/contentEditable is focused (defensive)
- Added `Kbd` component (small `<kbd>` pill) showing hotkey hints:
  - Each known option shows its number (1, 2, 3…)
  - Unknown option shows `؟`
  - Back button shows `⌫`
- Keyboard hint at bottom: "اضغط 1-9 للاختيار، ؟ للمش عارف" with `Keyboard` icon
  - Auto-fades after 3 seconds OR after first key press (whichever is sooner)
- Refactored hook order: moved all hooks (useMemo for options, useRef for callback, useKeyboardNav) BEFORE the early return for `!currentQuestion` to satisfy `rules-of-hooks`
- Verified via agent-browser: pressed 1, 2, 4 keys to navigate the entire Q1→Q9 flow successfully

### 7. Live cause score indicator on question screen — `question-screen.tsx`
- `prevScoresRef` tracks previous causeScores
- `useEffect([causeScores])`:
  - First render: stores initial causeScores, bails (no diff)
  - Subsequent: computes deltas (from/to/delta) for each cause where `Math.abs(delta) >= 1` and not excluded
  - Sorts by absolute delta, takes top 3
  - Sets `scoreDeltas` state for 2 seconds, then clears
  - Returns cleanup that clears the timer
- Toast UI: `motion.div` fixed at top-16 with `TrendingUp` icon, lists movers as `<li>` with cause label + arrow + "from→to"
  - Up arrow uses `--app-success` color; down arrow uses `--app-secondary`
  - AnimatePresence for fade in/out
- Verified via agent-browser: after answering Q2B=b, the toast showed "الدافعية 0→50، النوم 0→33، الوقت 25→50"

### 8. Color-coded solutions matrix — `solutions-screen.tsx`
- New `scoreBucket(score)` helper returns `{ colorVar, label }`:
  - ≥80: `--app-success` (ممتاز)
  - 60-79: `--app-primary` (جيد)
  - 40-59: `--confidence-medium` (متوسط)
  - <40: `--confidence-low` (منخفض)
- In ComparisonTable: score column uses inline-style backgroundColor on the bar fill + colored text for the score number (no longer all app-primary)
- In SolutionCard: replaced `Progress` with custom bar using inline-style backgroundColor matching the bucket
- Score pill in card uses `${bucket.colorVar}22` for subtle background tint
- Priority column: shows `ArrowUp` icon next to priority number for SELECTED solutions (top 3)
- New `ScoreLegend` component (below matrix) explains color coding with colored dots + ranges, plus the "مختار" arrow note
- Removed unused `Progress` import and unused `bgClass` field

### 9. Reset weights toast — `solutions-screen.tsx`
- Imported `toast` from `sonner`
- `resetWeights()` now calls `setWeights(...)` then `toast.success("تمت إعادة ضبط الأوزان للقيم الافتراضية")`
- **CRITICAL FIX**: layout.tsx was importing `Toaster` from `@/components/ui/toaster` (the shadcn radix-based Toaster) instead of `@/components/ui/sonner` (the sonner Toaster that the codebase's `toast.success()` calls expect)
  - Switched the import in `layout.tsx` to use `@/components/ui/sonner`
  - Without this fix, every `toast.success(...)` call across the app (including the existing handleSave in plan-screen) was silently swallowed because sonner's container was never mounted
- Verified via agent-browser: clicking "إعادة الضبط" shows the toast "تمت إعادة ضبط الأوزان للقيم الافتراضية"; clicking "احفظ الخطّة" shows "تم الحفظ" with plan code

### 10. Mobile responsive improvements — `why-chain-screen.tsx`, `plan-screen.tsx`
- Why-chain timeline circles: `size-7` (28px) → `size-8 md:size-10` (32px mobile, 40px desktop)
- Connector line: `top-7 start-4` → `top-9 md:top-11 start-4 md:start-5`
- Check icon: `size-3.5` → `size-4 md:size-5`
- Why-chain container: added `md:ps-11` to give room for larger circles
- Plan timeline `<ol>`: `flex flex-col` → `flex flex-col md:flex-row md:flex-wrap` so days flow horizontally on desktop
- Day `<li>`: added `md:flex-1 md:min-w-[200px]` so 7 days wrap into 2-3 rows of horizontal tiles on desktop, stay vertical on mobile
- Why-chain container max-width unchanged (mobile-first 360px)

## Verification

- `bun run lint` → exit 0 (clean)
- Dev server compiles successfully (no errors in dev.log)
- Used agent-browser to walk the full flow end-to-end with keyboard nav:
  1. Welcome → consent yes → start ✓
  2. Symptom: "درجاتي قلت" ✓
  3. Profile: 30 min, not urgent → ابدأ الأسئلة ✓
  4. Questions Q1-Q9 answered entirely via keyboard (press 1, 2, 4, 2, 2, 2, 2) ✓
  5. Causes: TIME=90, DIST=67, MOT=55 (matches worked example §9) ✓
  6. Ishikawa diagram expands with 7 labeled branches + scores ✓
  7. Solutions: weight sliders, comparison table, S_TIME_2/1, S_DIST_1 selected by default ✓
  8. Reset weights → toast "تمت إعادة ضبط الأوزان للقيم الافتراضية" ✓
  9. Score color coding: 83%/88%/86% green, 77%/78%/70%/77%/79%/77%/74%/72%/71% teal ✓
  10. Scenarios → Plan ✓
  11. Plan: print button text "اطبع / احفظ PDF" (typo fixed) ✓
  12. Save plan → toast "تم الحفظ" with code PLAN-XXXXXX ✓
  13. Click first day checkbox → state toggles, animation fires ✓
  14. Toggle dark mode → `document.documentElement.classList` includes 'dark' ✓
  15. About sheet → shows intro + 4 principles + privacy + version (1.0.0/1.0.0) ✓

## Key Bug Fixed

The sonner Toaster was never actually mounted in the app — layout.tsx was importing the wrong Toaster (the radix-based shadcn one) while all `toast.success()` calls were going to sonner's internal queue. Switched the import to `@/components/ui/sonner` so sonner now renders its `<section aria-label="Notifications alt+T">` container, and all `toast.success(...)` calls (existing handleSave + new resetWeights) now appear as expected.
