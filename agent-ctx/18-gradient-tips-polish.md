# Task 18 — Apply gradient card styles to remaining screens + add study tips section

**Agent:** zai-coder
**Task ID:** 18
**Date:** 2026-10-11

## Scope
Task 17 added `bg-app-gradient`, `bg-card-gradient`, `bg-card-gradient-accent`, `bg-card-gradient-success`, `shadow-card-soft`, and `shadow-card-hover` utility classes to `globals.css`, but only applied them to the welcome screen, app shell, and follow-up screen. Task 18 propagates them to **every remaining screen** and adds a new collapsible "Study Tips & Resources" section on the plan screen.

## Work log

### 1. UI strings (`content/ui/messages.json`)
Added 13 new keys for the tips section header + 6 tips (titles + descriptions). Schema is `Record<string, string>` so no schema change was needed.

### 2. Cause cards (`src/components/juzoor/cause-card.tsx`)
- Replaced `bg-card` + `shadow-sm` with `bg-card-gradient shadow-card-soft` on the main container.
- For rank #1 (`isTop`), swapped the amber-tinted glow for `bg-card-gradient-accent shadow-card-hover` (kept the amber border for the existing "الأقرب" badge treatment).

### 3. Causes screen (`src/components/juzoor/causes-screen.tsx`)
- Ishikawa collapsible container → `bg-card-gradient shadow-card-soft`.
- Trajectory recap `Card` → `bg-card-gradient shadow-card-soft`.
- Close-causes banner → `bg-card-gradient-accent` (kept amber border).
- Low-confidence card → `bg-card-gradient shadow-card-soft`.
- Review-answers collapsible → `bg-card-gradient shadow-card-soft` (consistency).

### 4. Solutions screen (`src/components/juzoor/solutions-screen.tsx`)
- Weight sliders container: removed the outer `bg-app-muted/40` (kept the inner `WeightSliders` div which is now `bg-card-gradient shadow-card-soft`).
- Mobile `SolutionCard`: default state uses `bg-card-gradient shadow-card-soft`; selected state keeps `bg-app-primary/5` but adds `shadow-card-soft`; top solution (#1) overrides with `bg-card-gradient-accent shadow-card-hover` (kept the amber border + ring for the "الأفضل لك" badge).
- `ScoreLegend` → `bg-card-gradient shadow-card-soft` (now a proper card with rounded border).
- `EmptySolutionsState` icon container → `bg-card-gradient shadow-card-soft`.

### 5. Plan screen (`src/components/juzoor/plan-screen.tsx`)
- `PlanProgressCard`: `bg-card-gradient shadow-card-soft` by default, `bg-card-gradient-success shadow-card-soft` when `isComplete`.
- `DailyReminderCard`: `bg-card-gradient-accent shadow-card-soft`.
- `PlanTimeline` cards: `bg-card-gradient shadow-card-soft`. Added `print:bg-none print:bg-white` so the gradient doesn't bleed into the PDF/print export.
- Success-metric card inside `PlanTimeline`: `bg-card-gradient-success` (with `print:bg-none print:bg-white`).
- Review-date card: `bg-card-gradient shadow-card-soft` (kept `no-print`).
- Imported `Collapsible`, `ChevronDown`, `Lightbulb`, `Clock`, `MapPin`, `Moon`, `Users`, `Smartphone`, and `useReducedMotion`.

### 6. New `StudyTipsSection` component (plan-screen.tsx)
- Collapsible section between the review-date card and the action buttons.
- Defaults to **collapsed** (`useState(false)`).
- `no-print print:hidden` so it's not exported with the printed plan.
- Header: amber-accent `Lightbulb` icon, title `tips_title`, subtitle `tips_subtitle`, animated `ChevronDown` (rotates 180° on open, respects `prefers-reduced-motion`).
- Body: grid of 6 tip cards (`grid-cols-1 sm:grid-cols-2`).
- Each tip card: small primary-tinted icon circle, bold title, secondary-text description; uses `bg-card-gradient shadow-card-soft`.
- Tip cards animate in with a staggered fade (skipped under reduced motion).
- Icons mapped: tip 1 `Clock`, tip 2 `MapPin`, tip 3 `Moon`, tip 4 `Calendar`, tip 5 `Users`, tip 6 `Smartphone`.

### 7. Profile screen (`src/components/juzoor/profile-screen.tsx`)
- Main "info" Card → `bg-card-gradient shadow-card-soft`.
- All 3 radio option labels (minutes, urgent, alone): when **selected**, add `shadow-card-soft`; when **not selected**, use `bg-card-gradient` instead of `bg-card`.

### 8. Symptom screen (`src/components/juzoor/symptom-screen.tsx`)
- Default state: `bg-card-gradient shadow-card-soft`.
- Selected state: `bg-card-gradient-accent shadow-card-hover` (kept `border-app-primary`).

### 9. Scenarios screen (`src/components/juzoor/scenarios-screen.tsx`)
- Each `SolutionScenarioTabs` card → `bg-card-gradient shadow-card-soft`.
- Success-conditions list (was an unstyled `<ul>` inside the card): now wrapped in its own container with `bg-card-gradient-success border border-app-success/30 rounded-xl p-3`.
- Empty state card → `bg-card-gradient shadow-card-soft`.

### 10. Question screen (`src/components/juzoor/question-screen.tsx`)
- `OptionButton`: replaced `bg-card` with `bg-card-gradient`, added `hover:shadow-card-soft`.
- `LoadingCard`: `bg-card` + `shadow-sm` → `bg-card-gradient shadow-card-soft`.

## Verification

### `bun run lint` → exit 0 ✓

### Dev log
Dev server hot-reloaded cleanly after each edit. One transient `ComparisonTable defined multiple times` error appeared during a partial save of `solutions-screen.tsx` (hot-reload artifact) but resolved immediately on the next save. Latest logs show all `GET / 200` responses.

### agent-browser walkthrough (fresh localStorage)
Walked the worked example: study domain → no consent → start → grades_dropped → 30min → not urgent → Q1=b → Q2B=b → Q3=a → Q4=d → Q5=b → Q6=b → Q9=b.

Verified final cause scores via `document.querySelector('main').innerText`:
```
7 إجابات
الوقت 90%       ← TIME = 90 ✓
التشتت 67%      ← DIST = 67 ✓
الدافعية 55%    ← MOT = 55 ✓
```

Verified gradient classes via `Array.from(document.querySelectorAll('main [class*="bg-card-gradient"]'))`:

**Causes screen** (5 gradient containers):
- Ishikawa collapsible: `bg-card-gradient shadow-card-soft` ✓
- Trajectory recap: `bg-card-gradient shadow-card-soft` ✓
- Rank #1 cause (TIME): `bg-card-gradient-accent shadow-card-hover` ✓
- Rank #2 cause (DIST): `bg-card-gradient shadow-card-soft` ✓
- Rank #3 cause (MOT): `bg-card-gradient shadow-card-soft` ✓

**Solutions screen**:
- Weight sliders container: `bg-card-gradient shadow-card-soft` ✓
- Top solution (#1): `bg-card-gradient-accent shadow-card-hover` ✓
- Other solution cards: `bg-card-gradient shadow-card-soft` ✓
- ScoreLegend: `bg-card-gradient shadow-card-soft` ✓

**Scenarios screen**:
- 3 scenario cards: `bg-card-gradient shadow-card-soft` ✓
- 3 success-conditions cards: `bg-card-gradient-success` ✓

**Plan screen**:
- PlanProgressCard: `bg-card-gradient shadow-card-soft` ✓
- DailyReminderCard: `bg-card-gradient-accent shadow-card-soft` ✓
- 3 PlanTimeline cards: `bg-card-gradient shadow-card-soft` ✓
- 3 success-metric cards inside timelines: `bg-card-gradient-success` ✓
- Review-date card: `bg-card-gradient shadow-card-soft` ✓
- New StudyTipsSection (collapsed by default, expands on click) ✓

**Study Tips section**:
- Found as a collapsible button with `expanded=false`, then `expanded=true` after click.
- After expansion, snapshot showed 6 new `<h3>` headings:
  1. قاعدة 25-5 (Clock icon)
  2. المكان الثابت (MapPin icon)
  3. النوم قبل المذاكرة (Moon icon)
  4. المراجعة المتباعدة (Calendar icon)
  5. علّم غيرك (Users icon)
  6. ابعد المشتتات (Smartphone icon)
- All 6 tip cards confirmed to use `bg-card-gradient shadow-card-soft` via DOM inspection.
- Collapsing again hides the 6 tip cards (verified by re-snapshot).

## Files modified
- `content/ui/messages.json` — added 13 tip-related string keys.
- `src/components/juzoor/cause-card.tsx` — gradient + shadow swap on rank-1 vs others.
- `src/components/juzoor/causes-screen.tsx` — 5 gradient applications (Ishikawa, trajectory, banner, low-conf, review-answers).
- `src/components/juzoor/solutions-screen.tsx` — gradients on WeightSliders, SolutionCard (incl. top #1), ScoreLegend, EmptySolutionsState icon.
- `src/components/juzoor/plan-screen.tsx` — gradients on PlanProgressCard, DailyReminderCard, PlanTimeline, success-metric card, review-date card; new `StudyTipsSection` component + `STUDY_TIPS` const + new state (`tipsOpen`).
- `src/components/juzoor/profile-screen.tsx` — gradients on main info card + 3 radio labels (minutes, urgent, alone) for both default + selected states.
- `src/components/juzoor/symptom-screen.tsx` — gradient swap on default vs selected states.
- `src/components/juzoor/scenarios-screen.tsx` — gradient on each scenario card; success-conditions list wrapped in `bg-card-gradient-success` card.
- `src/components/juzoor/question-screen.tsx` — `OptionButton` now uses `bg-card-gradient` + `hover:shadow-card-soft`; `LoadingCard` uses `bg-card-gradient shadow-card-soft`.

## Constraints honored
- No engine files touched (`/src/lib/engine/*`) — worked example scores unchanged.
- No content JSON in `/content/study/` or `/content/project/` touched.
- Only `content/ui/messages.json` was edited (added new keys).
- All text Arabic; RTL layout preserved (used `ms-/me-/ps-/pe-/start/end`).
- `prefers-reduced-motion` respected for the chevron rotation and tip-card stagger.
- `no-print print:hidden` on the tips section so it doesn't appear in printed plan export.
- `print:bg-none print:bg-white` added to gradient-bearing plan cards so gradients don't bleed into PDF export (the existing `print:bg-white` Tailwind utility only overrides `background-color`, not the `background-image` shorthand from the gradient utilities).
- No new CSS added to `globals.css` — used only the existing utility classes from Task 17.
