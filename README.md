# جذور (Juzoor) — Study Problem Diagnostic App

> **نظّم وقتك، افهم نفسك** — An Arabic RTL mobile-first web app that guides students from a visible study problem to ranked probable root causes, compared solutions with expected outcomes, and a small-steps 7-day action plan.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC.svg)](https://tailwindcss.com/)

---

## 📖 Overview

**Juzoor** (Arabic for "Roots") helps secondary-school students (ages 15–18) diagnose the root cause of study problems through a deterministic, branching question flow — no AI, no randomness, no accounts. Every result is explainable, and the user always makes the final decision.

### Hard Constraints (from the spec)
- ✅ **Deterministic rule engine** — no LLM/AI calls at runtime, no randomness
- ✅ **Every result is explainable** — "ليه ظهر ده؟" (Why did this appear?) buttons on every cause and solution
- ✅ **User always decides** — the app proposes and compares; the user makes the final choice
- ✅ **All content in JSON files** — validated by Zod, separate from code
- ✅ **Arabic RTL mobile-first** — Cairo font, 360px base width, WCAG AA contrast, 44px touch targets

---

## ✨ Features

### Core Diagnostic Flow
- **9 screens**: Welcome → Symptom → Profile → Questions → Causes → Solutions → Scenarios → Plan → Follow-up → Done
- **Branching questions**: Decision-tree entry questions + adaptive loop questions with discrimination-based selection
- **Ishikawa (fishbone) diagram**: Collapsible cause map showing all possible causes with intensity bars
- **Score trajectory chart**: Mini sparkline showing how cause scores evolved across answered questions
- **Review answers**: Jump back to any previously answered question to edit it; subsequent answers are dropped and the engine recomputes
- **Five Whys deep-dive**: Optional "نتعمق بـ ليه؟" chain (up to 5 steps) for disambiguating close causes

### Solution Comparison
- **Weighted comparison matrix**: Adjust importance of Effectiveness / Ease / Speed / Fit via sliders; ranking updates live
- **Expandable detail cards**: Click "تفاصيل" on any solution to see causes, scenarios preview, first step, and success metric
- **Side-by-side comparison dialog**: Pick any 2 solutions and compare them across all 9 criteria with star ratings, winner highlighting, and a profile-aware "أيهما أنسب لي؟" insight
- **Solution bookmarks**: Bookmark favorite solutions (persist across sessions)
- **Color-coded scores**: Green (≥80), teal (60–79), amber (40–59), gray (<40)

### Plan & Follow-up
- **7-day plan timeline**: Each selected solution gets 7 daily steps (each ≥20 min) with checkable day cards
- **Daily check-in streak**: Track consecutive completed days with 🔥 streak indicator
- **Progress summary card**: Completion percentage, streak count, 100% celebration
- **Daily reminder card**: Tips for consistency
- **Study tips section**: 6 collapsible study tips (Pomodoro, fixed location, sleep, spaced repetition, teach-to-learn, remove distractions)
- **Plan export**: Save, export as text, share to clipboard, print/PDF
- **Celebration**: Confetti burst + motivational message on plan save
- **Follow-up screen**: Diagnosis recap + executed/improved questions + optional metric + notes

### Polish & Accessibility
- **Dark mode toggle** in footer
- **About sheet** with 4 principles, privacy note, version info, and research data export
- **Research data export**: Download all session data as JSON (`juzoor-research.v1` schema)
- **Skip-to-content link** for keyboard/screen-reader users
- **Error boundary** wrapping the entire app with calm Arabic fallback
- **Keyboard navigation**: 1–9 keys select options, `?`/`Escape` for "مش عارف", `Backspace` goes back
- **`prefers-reduced-motion`** respected throughout
- **Gradient backgrounds** and soft shadows for visual depth
- **Animated counters** on the done screen stats
- **Background dot pattern** for subtle texture
- **Quick restart** button on done screen (preserves domain, skips onboarding)
- **Session persistence**: All state saved to localStorage via Zustand persist middleware

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── layout.tsx          # RTL layout (lang="ar" dir="rtl"), Cairo font
│   ├── page.tsx            # Single-page entry (renders AppShell)
│   └── globals.css         # Theme tokens, gradient utilities, print styles
├── components/
│   ├── juzoor/             # 19 screen + helper components
│   │   ├── app-shell.tsx          # Main router with header/footer
│   │   ├── welcome-screen.tsx     # Consent, domain selector, how-it-works
│   │   ├── symptom-screen.tsx     # Problem selection
│   │   ├── profile-screen.tsx     # Time/urgent/team questions
│   │   ├── question-screen.tsx    # Q&A with keyboard nav + trajectory chart
│   │   ├── causes-screen.tsx      # Results dashboard (Ishikawa + trajectory + cards + review)
│   │   ├── why-chain-screen.tsx   # Five Whys deep-dive
│   │   ├── solutions-screen.tsx   # Comparison matrix + comparison dialog + bookmarks
│   │   ├── scenarios-screen.tsx   # Best/Expected/Worst scenarios per solution
│   │   ├── plan-screen.tsx        # 7-day timeline + progress + tips + export
│   │   ├── followup-screen.tsx    # Diagnosis recap + follow-up questions
│   │   ├── done-screen.tsx        # Journey summary + animated stats
│   │   ├── cause-card.tsx         # Animated score bars + branch icons
│   │   ├── cause-trajectory-chart.tsx  # SVG sparkline
│   │   ├── ishikawa-diagram.tsx   # SVG fishbone
│   │   ├── celebration-burst.tsx   # Confetti component
│   │   ├── error-boundary.tsx     # React error boundary
│   │   ├── support-note.tsx       # Gentle support card
│   │   └── animated-number.tsx     # Count-up animation
│   └── ui/                  # shadcn/ui components (New York style)
└── lib/
    ├── engine/              # Deterministic rule engine (pure TS, no IO)
    │   ├── types.ts         # All TypeScript interfaces
    │   ├── schemas.ts       # Zod v4 validation schemas
    │   ├── rules.ts         # If/Else rule evaluation
    │   ├── score-causes.ts  # Cause scoring formula
    │   ├── select-question.ts  # Next question selection
    │   ├── stop.ts          # Stop conditions
    │   ├── score-solutions.ts  # Solution scoring + ranking
    │   ├── explain.ts       # Explanation templates
    │   └── index.ts         # Public API
    ├── content.ts           # JSON content loader
    └── store.ts            # Zustand store (persisted)

content/
├── study/    # Study domain: 5 symptoms, 7 causes, 11 questions, 3 rules, 13 solutions
├── project/  # Project domain: 3 symptoms, 6 causes, 7 questions, 1 rule, 6 solutions
└── ui/       # UI strings (messages.json, explain.json)
```

### Scoring Formula (§8 of the spec)
```
Cause score:
  raw(c) = priors + Σ chosen option weights + Σ rule addEvidence
  max(c) = Σ max positive weight per reachable question containing c
  n(c)   = number of reachable questions containing c
  score  = clamp(raw/max, 0, 1) × 100 × min(1, n/3)

Solution score:
  score(s) = 100 × (wE·E/5 + wA·A/5 + wS·S/5 + wF·fit/5)
  Default weights: wE=0.35, wA=0.25, wS=0.15, wF=0.25
  Fit adjustments from profile (daily minutes, urgency, team)

Stop conditions:
  (a) top score ≥ 70 AND gap ≥ 15 → clear_winner
  (b) 10 questions answered → max_questions
  (c) no eligible question → no_eligible_question
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- npm/bun package manager

### Installation
```bash
# Clone the repository
git clone https://github.com/Koko7777949/juzoor-study-diagnostic.git
cd juzoor-study-diagnostic

# Install dependencies
bun install
# or: npm install
```

### Development
```bash
# Start the dev server (runs on http://localhost:3000)
bun run dev
# or: npm run dev
```

### Build & Production
```bash
# Lint check
bun run lint

# Build for production
bun run build

# Start production server
bun run start
```

### Database (optional, for research data)
```bash
# Push Prisma schema to SQLite
bun run db:push
```

---

## 🧪 Worked Example (Acceptance Test)

The deterministic engine reproduces the spec's worked example §9 exactly:

| Input | Value |
|-------|-------|
| Symptom | `grades_dropped` (درجاتي قلت) |
| Profile | `{ minutesPerDay: 30, urgent: false }` |
| Q1 | b (تدريجي على شهور) |
| Q2B | b (أغلب المواد) |
| Q3 | a (أقل من ساعة) |
| Q4 | d (مش بذاكر بشكل منتظم) |
| Q5 | b (مرة أو مرتين) |
| Q6 | b (أيوه بس مش بلتزم) |
| Q9 | b (واضح) |

| Output | Expected | Verified |
|--------|----------|----------|
| TIME score | 90 (high) | ✅ |
| DIST score | 67 (medium) | ✅ |
| MOT score | 55 (medium) | ✅ |
| S_TIME_2 priority | 75 | ✅ |
| S_TIME_1 priority | 69 | ✅ |
| S_DIST_1 priority | 59 | ✅ |
| Stop reason | clear_winner (gap=23) | ✅ |

---

## 🎨 Design System

### Colors (from spec §13.2)
| Token | Value | Usage |
|-------|-------|-------|
| `--app-primary` | `#0F6766` (teal) | Primary buttons, headers, icons |
| `--app-accent` | `#5FE9B0` (mint) | Highlights, gradients, success |
| `--app-bg` | `#F8FAFC` (off-white) | Page background |
| `--app-text` | `#0F71A2` (deep blue) | Primary text |
| `--app-secondary` | `#4647B8` (purple) | Secondary text |
| `--app-success` | green | Success states, metrics |

### Typography
- **Font**: Cairo (Arabic + Latin, `font-display: swap`)
- **Base size**: 16px (mobile-first)
- **Touch targets**: ≥44px

### Confidence Traffic Lights
- 🟢 **High** (≥70): Green badge
- 🟡 **Medium** (40–69): Amber badge
- ⚪ **Low** (<40): Gray badge
- The confidence word is always visible next to the color (WCAG compliance)

---

## 🔒 Privacy

- **No accounts, no names, no email** — fully anonymous
- **Data stays on the user's device** — stored in localStorage via Zustand persist
- **Research data export is opt-in** — user must consent + click "صدّر بياناتي للبحث"
- **"امسح بياناتي" button** wipes all local data
- **No external analytics or tracking**

---

## 🌐 Domains

The app supports two diagnostic domains:

### Study (دراسة ومذاكرة)
- 5 symptoms: grades dropped, homework undone, don't understand, forget in exam, can't start
- 7 causes: understanding, time management, distraction, study method, sleep, exam anxiety, motivation
- 11 questions: 4 entry (branching) + 7 loop (adaptive)
- 3 rules: support note, sleep urgency, study method
- 13 solutions with 7-day Kaizen steps each

### Project (مشاريع وفرق)
- 3 symptoms: project late, unorganized team, don't know where to start
- 6 causes: task splitting, team roles, communication, time estimation, requirements clarity, procrastination
- 7 questions (all loop)
- 1 rule: alone flag (excludes team-related causes)
- 6 solutions

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| State | Zustand 5 (with persist middleware) |
| Validation | Zod 4 |
| Animations | Framer Motion 12 |
| Icons | Lucide React |
| Toasts | Sonner |
| Fonts | Cairo (Google Fonts) |

---

## 📁 Project Structure

See the [Architecture](#-architecture) section above for the full file tree.

---

## 🤝 Contributing

This project follows a structured development process documented in `worklog.md`. Each development phase is recorded as a "Task ID" entry with:
- Current project status assessment
- Completed modifications and verification results
- Unresolved issues and priority recommendations

### Development Workflow
1. Read `worklog.md` to understand the current state
2. Make changes (frontend first, then backend if needed)
3. Run `bun run lint` to verify code quality
4. Test via the dev server
5. Update `worklog.md` with the changes

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Built with [Z.ai Code](https://chat.z.ai) — AI-powered development
- UI components by [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- Font: [Cairo](https://fonts.google.com/specimen/Cairo) by Mohamed Gaber

---

## 📞 Support

For questions or issues, please [open an issue](https://github.com/Koko7777949/juzoor-study-diagnostic/issues) on GitHub.

---

> **Disclaimer**: This app is not a diagnosis and not a substitute for a professional. If you feel the problem is bigger than expected, talk to someone you trust: your family, a teacher, or your school counselor.
