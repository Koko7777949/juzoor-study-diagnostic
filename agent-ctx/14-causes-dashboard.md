# Task 14 — Causes screen: review answers + score trajectory recap

Agent: causes-dashboard
Task: Add review answers capability + progress trajectory recap on causes screen

## Work Log

- Read context files: worklog.md (Tasks 11-13), src/components/juzoor/causes-screen.tsx,
  src/lib/store.ts, src/components/juzoor/cause-trajectory-chart.tsx, src/lib/engine/index.ts,
  src/components/juzoor/question-screen.tsx, src/app/globals.css.
- Added `restartFromQuestion(qid: string)` action to the Zustand store
  (`src/lib/store.ts`):
  - Finds the index of `qid` in `engine.answers`.
  - Truncates `engine.answers` to keep only answers BEFORE that question (drops the
    answer to `qid` itself and all subsequent answers).
  - Truncates `scoreHistory` with `filter(s => s.answerIndex < idx)` for robustness.
  - Clears `forcedNext` and `skippedQuestions` so the engine recomputes fresh from
    the remaining answers.
  - Calls `applyRulesAfter` to recompute cause scores, then `getNextQuestion` to
    pick the next question to show.
  - If a next question is returned: sets `screen: "questions"`,
    `currentQuestion: nextQuestion`, `previousScreen: "causes"`.
  - Defensive: if no next question (shouldn't happen), stays on causes.
  - Logs the event `restart_from_question` with `{ qid, remainingAnswers }`.
- Enhanced `src/components/juzoor/causes-screen.tsx`:
  - New imports: `useReducedMotion` from framer-motion; `ListChecks`, `Pencil`,
    `TrendingUp` from lucide-react; `Answer` type from engine/types;
    `CauseTrajectoryChart` from the existing component file.
  - Added `scoreHistory` and `restartFromQuestion` store selectors.
  - Added `reviewOpen` local state (defaults collapsed, matching the Ishikawa
    pattern).
  - Built `causeLabels` memo (causeId → branch) reused as the chart's
    `causeLabels` prop.
  - Inserted a new "Score trajectory recap" section between the Ishikawa
    diagram and the close-causes banner:
    - Card with header "إزاي وصلت للنتيجة دي" + TrendingUp icon in a circular
      accent badge + subtitle "شوف إجاباتك أثّرت على درجات الأسباب إزاي على
      مدار الأسئلة".
    - If `scoreHistory.length >= 2`: renders the existing
      `CauseTrajectoryChart` (transparent styling — border/shadow/bg/p-0 — so it
      sits cleanly inside the Card).
    - If less than 2 snapshots: shows a muted message "مفيش بيانات كافية لعرض
      التطور".
    - Wrapper motion.div respects `prefers-reduced-motion` (no initial offset).
  - Inserted a new "Review Answers" collapsible section between the cause cards
    and the "تمام، خليني أشوف الحلول" button:
    - Collapsible header (mirrors Ishikawa pattern): ListChecks icon in a
      circular accent badge, title "مراجعة إجاباتك", subtitle "عدّل أي إجابة
      وهنحسب الأسباب من جديد", animated ChevronDown that rotates 180° when
      open.
    - `ReviewAnswersList` component renders inside `CollapsibleContent`:
      - Empty-state branch returns "مفيش إجابات للمراجعة بعد" (defensive).
      - Shows a count line "عندك N إجابة. اضغط \"تعديل\" على أي سؤال عشان
        ترجعله وتغيّره."
      - Wraps the list in a `scroll-area-juzoor max-h-72 overflow-y-auto pe-1`
        container when there are 6+ answers (works for 7+ rows).
      - Footer hint card: "لما تعدّل إجابة، كل الإجابات اللي بعدها هتتمسح وهنبدأ
        من نقطة التعديل".
    - `AnswerReviewRow` component (one per answer):
      - Numbered circle (1-based index) in app-primary tint.
      - Question text (truncated to ~60 chars with "…" via the new `truncate`
        helper).
      - Chosen option label as a Badge: secondary variant, app-primary tint,
        border + bg, for known answers; dashed muted pill for "مش عارف"
        answers (using `option.isUnknown`).
      - "تعديل" button (Pencil icon + label) with `aria-label="تعديل إجابة
        السؤال N"`; onClick calls `restartFromQuestion(answer.qid)`.
      - motion.li entrance: opacity 0→1, x 8→0, staggered delay
        `Math.min(index * 0.03, 0.18)`; static when `prefers-reduced-motion`.
- Lint: `bun run lint` exit 0 after the store change and again after the screen
  change. Dev log clean throughout (all HTTP 200, no warnings).
- Verified via agent-browser (wiped session, walked the worked example):
  - Welcome → consent → study domain → symptom "درجاتي قلت" → profile
    (30 min, urgent) → Q1=b "تدريجي على شهور" → Q2B=b "أغلب المواد" →
    Q3=a "أقل من ساعة" → Q4=d "مش بذاكر بشكل منتظم" → Q5=b "مرة أو مرتين"
    → Q6=b "أيوه بس مش بلتزم" → Q9=b "واضح" → causes screen.
  - Causes screen snapshot showed:
    - Score trajectory recap Card with header "إزاي وصلت للنتيجة دي" and the
      chart ("رسم بياني لتطور درجات الأسباب على 7 أسئلة") with legend
      الوقت 90%, التشتت 67%, الدافعية 55%. ✓
    - Cause cards: TIME rank 1 (90%, "عالية", "الأقرب" badge), DIST rank 2
      (67%, "متوسطة"), MOT rank 3 (55%, "متوسطة"). ✓ (Worked example §9
      preserved exactly.)
    - Review Answers collapsible (collapsed by default) with the correct
      title + subtitle.
  - Expanded the Review section:
    - Header shows "عندك 7 إجابة. اضغط \"تعديل\" على أي سؤال عشان ترجعله
      وتغيّره."
    - All 7 rows present with the expected question text + chosen option:
      Q1 "تدريجي على شهور", Q2B "أغلب المواد", Q3 "أقل من ساعة",
      Q4 "مش بذاكر بشكل منتظم", Q5 "مرة أو مرتين", Q6 "أيوه بس مش
      بلتزم", Q9 "واضح".
    - Footer hint visible: "لما تعدّل إجابة، كل الإجابات اللي بعدها هتتمسح
      وهنبدأ من نقطة التعديل".
    - Verified scroll container applies: `cls = "scroll-area-juzoor
      max-h-72 overflow-y-auto pe-1"`, `scrollHeight = 538, clientHeight =
      384` (scrolling active).
  - Clicked "تعديل إجابة السؤال 4":
    - Transitioned back to the questions screen, header "السؤال 4 من 10",
      current question "غالباً بذاكر إزاي؟" (the Q4 entry).
    - Trajectory chart on the questions screen now shows "3 إجابات" with
      recomputed scores (الدافعية 75%, الوقت 63%, التشتت 50%) — confirming
      subsequent answers were dropped and the engine recomputed from the 3
      remaining answers.
    - localStorage `engine.answers` was `[Q1=b, Q2B=b, Q3=a]` — exactly the
      truncation we expect (Q4 and onward dropped).
    - Events log shows a `restart_from_question` event with
      `{ qid: "Q4", remainingAnswers: 3 }`. ✓
  - Re-answered Q4=d → Q5=b → Q6=b → Q9=b to return to the causes screen:
    - Final scores: TIME=90 (high, rank 1, "الأقرب"), DIST=67 (medium, rank 2),
      MOT=55 (medium, rank 3) — worked example §9 reproduced exactly. ✓
    - Trajectory chart shows "7 أسئلة" with the same 90/67/55 legend. ✓
    - Review Answers section is back, collapsed. ✓
- All edits use logical properties (`ps-/pe-/ms-/me-`, `start/end`) for RTL.
- Did NOT touch engine files or content JSON — engine determinism preserved.

## Stage Summary

- 2 files modified: `src/lib/store.ts` (new `restartFromQuestion` action),
  `src/components/juzoor/causes-screen.tsx` (new trajectory recap section +
  review answers collapsible + helper components `ReviewAnswersList`,
  `AnswerReviewRow`, `truncate`).
- Causes screen now feels like a complete diagnostic dashboard: cause map
  (Ishikawa), how-you-got-here (trajectory recap chart), current results
  (cause cards), and how-to-change (review answers) all in one scrollable
  view.
- The new "Review Answers" capability lets the user jump back to any past
  question and re-answer it; subsequent answers are dropped and the engine
  recomputes fresh from the remaining answers, returning the user to the
  questions screen at the chosen question.
- The trajectory recap reuses the existing `CauseTrajectoryChart` (already
  maintained on every answer/back); no new data plumbing required.
- Worked example §9 still produces TIME=90, DIST=67, MOT=55 (verified
  end-to-end after a round-trip edit). `bun run lint` exit 0.
