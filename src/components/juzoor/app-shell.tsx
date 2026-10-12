"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sprout,
  ChevronRight,
  Trash2,
  Moon,
  Sun,
  CircleHelp,
  ShieldCheck,
  Lock,
  Cpu,
  Eye,
  Hand,
  Scale,
  Download,
  Database,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useJuzoor } from "@/lib/store";
import { loadMessages, loadExplainText } from "@/lib/content";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import type { Screen } from "@/lib/store";
import { WelcomeScreen } from "./welcome-screen";
import { SymptomScreen } from "./symptom-screen";
import { ProfileScreen } from "./profile-screen";
import { QuestionScreen } from "./question-screen";
import { CausesScreen } from "./causes-screen";
import { WhyChainScreen } from "./why-chain-screen";
import { SolutionsScreen } from "./solutions-screen";
import { ScenariosScreen } from "./scenarios-screen";
import { PlanScreen } from "./plan-screen";
import { FollowUpScreen } from "./followup-screen";
import { DoneScreen } from "./done-screen";
import { InstallPrompt } from "./install-prompt";

const SCREEN_ORDER: Screen[] = [
  "welcome",
  "symptom",
  "profile",
  "questions",
  "causes",
  "why",
  "solutions",
  "scenarios",
  "plan",
  "followup",
  "done",
];

// Screens that should NOT show the global progress bar (welcome, why sub-screen)
const NO_PROGRESS: Set<Screen> = new Set<Screen>(["welcome", "why", "plan_exported"]);

// Screens where the back button should be visible
const BACK_SCREEN: Partial<Record<Screen, Screen>> = {
  symptom: "welcome",
  profile: "symptom",
  questions: "profile",
  causes: "questions",
  solutions: "causes",
  scenarios: "solutions",
  plan: "scenarios",
  followup: "plan",
};

export function AppShell() {
  const screen = useJuzoor((s) => s.screen);
  const go = useJuzoor((s) => s.go);
  const wipeData = useJuzoor((s) => s.wipeData);

  const prefersReducedMotion = usePrefersReducedMotion();

  const stepIndex = SCREEN_ORDER.indexOf(screen);
  const showProgress = !NO_PROGRESS.has(screen);
  // For why sub-screen, back goes to causes
  const backTarget: Screen | null = screen === "why" ? "causes" : BACK_SCREEN[screen] ?? null;

  const handleBack = () => {
    if (backTarget) go(backTarget);
  };

  const handleWipe = () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("متأكد؟ كل بياناتك هتتمسح من الجهاز.");
      if (!ok) return;
    }
    wipeData();
    go("welcome");
  };

  const variants = prefersReducedMotion
    ? { initial: { opacity: 1, x: 0 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 1, x: 0 } }
    : {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 },
      };

  return (
    <main className="relative min-h-screen flex flex-col bg-app-gradient">
      {/* Subtle dot pattern overlay — barely visible, adds texture.
          Fixed so it covers the viewport even when content scrolls;
          pointer-events-none so it never blocks clicks/taps. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none opacity-30 bg-app-pattern print:hidden"
      />

      {/* Skip-to-content link for keyboard / screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:end-2 focus:z-50 focus:bg-app-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-semibold"
      >
        تخطّى للمحتوى
      </a>

      {/* Header */}
      <header className="pt-safe sticky top-0 z-30 bg-app-bg/95 backdrop-blur-sm border-b border-app-primary/10 no-print print:hidden">
        <div className="max-w-md mx-auto px-4 pt-3 pb-3 flex items-center gap-3">
          {backTarget ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="touch-target size-9 text-app-secondary hover:text-app-primary shrink-0"
              onClick={handleBack}
              aria-label="رجوع"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </Button>
          ) : (
            <span className="size-9 shrink-0" aria-hidden="true" />
          )}
          <div className="flex items-center gap-2 flex-1 justify-center">
            <span className="size-6 rounded-full bg-app-primary/10 text-app-primary flex items-center justify-center">
              <Sprout className="size-3.5" aria-hidden="true" />
            </span>
            <span className="font-bold text-app-primary text-lg">جذور</span>
          </div>
          <span className="size-9 shrink-0" aria-hidden="true" />
        </div>
        {showProgress && (
          <div className="max-w-md mx-auto px-4 pb-2">
            <Progress
              value={Math.max(0, Math.min(100, ((stepIndex + 1) / SCREEN_ORDER.length) * 100))}
              className="bg-app-muted h-1"
            />
          </div>
        )}
      </header>

      {/* Screen content */}
      <div
        id="main-content"
        className="relative z-10 flex-1 flex flex-col"
        tabIndex={-1}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={screen}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.22 }}
            className="flex-1 flex flex-col"
          >
            {renderScreen(screen)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* PWA install prompt (mobile only, appears when installable) */}
      <InstallPrompt />

      {/* Sticky footer */}
      <footer className="relative z-10 mt-auto pt-3 pb-safe px-4 bg-app-bg border-t border-app-primary/10 no-print print:hidden">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2 py-1">
          <p className="text-xs text-app-secondary leading-relaxed">
            نظّم وقتك، افهم نفسك
          </p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <AboutButton />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="touch-target text-xs text-app-secondary hover:text-destructive h-7 px-2"
              onClick={handleWipe}
            >
              <Trash2 className="size-3" aria-hidden="true" />
              امسح بياناتي
            </Button>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch: render a placeholder until mounted
  const current = mounted ? (resolvedTheme ?? theme) : undefined;
  const isDark = current === "dark";
  const toggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="touch-target text-app-secondary hover:text-app-primary h-7 w-7 p-0"
      onClick={toggle}
      aria-label="تبديل الوضع الليلي"
      title="تبديل الوضع الليلي"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-4" aria-hidden="true" />
        ) : (
          <Moon className="size-4" aria-hidden="true" />
        )
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </Button>
  );
}

function AboutButton() {
  const [open, setOpen] = React.useState(false);
  const contentVersion = useJuzoor((s) => s.contentVersion);
  const engineVersion = useJuzoor((s) => s.engineVersion);
  const consent = useJuzoor((s) => s.consent);
  const exportResearchData = useJuzoor((s) => s.exportResearchData);
  const eventsCount = useJuzoor((s) => s.events.length);

  const messages = React.useMemo(() => loadMessages(), []);
  const explainText = React.useMemo(() => loadExplainText(), []);

  const principles = [
    {
      icon: Cpu,
      title: "حتمي",
      desc: "نفس الإجابات = نفس النتيجة. مفيش عشوائية ولا ذكاء اصطناعي بيغيّر النتيجة.",
    },
    {
      icon: Eye,
      title: "قابل للتفسير",
      desc: "كل سبب أو حل بيظهر معاه \"ليه\" — إجاباتك اللي وصلت للنتيجة دي.",
    },
    {
      icon: Hand,
      title: "أنت اللي تقرر",
      desc: "التطبيق بيقترح ويقارن، بس القرار النهائي في اختيار الحلول والخطوات لك.",
    },
    {
      icon: Scale,
      title: "مش تشخيص",
      desc: "مش بديل عن شخص مختص. لو الإجابات قالت إن المشكلة أكبر، نتكلم مع حد نثق فيه.",
    },
  ];

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="touch-target text-app-secondary hover:text-app-primary h-7 px-2"
        onClick={() => setOpen(true)}
        aria-label="عن جذور"
        title="عن جذور"
      >
        <CircleHelp className="size-3.5" aria-hidden="true" />
        عن جذور
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t border-app-primary/20 max-h-[85vh] overflow-y-auto"
          aria-label="عن تطبيق جذور"
        >
          <SheetHeader className="text-start">
            <SheetTitle className="text-app-text text-xl font-bold flex items-center gap-2">
              <Sprout className="size-5 text-app-primary" aria-hidden="true" />
              عن جذور
            </SheetTitle>
            <SheetDescription className="text-app-secondary text-sm">
              نظّم وقتك، افهم نفسك
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-6 flex flex-col gap-5">
            {/* Intro */}
            <section className="flex flex-col gap-2">
              <p className="text-sm text-app-text leading-relaxed">
                {messages.welcome_intro}
              </p>
            </section>

            {/* Four principles */}
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-app-text flex items-center gap-2">
                المبادئ الأربعة
              </h3>
              <ul className="flex flex-col gap-2.5">
                {principles.map((p) => {
                  const Icon = p.icon;
                  return (
                    <li
                      key={p.title}
                      className="bg-app-muted/60 border border-app-primary/15 rounded-xl p-3 flex items-start gap-3"
                    >
                      <span className="shrink-0 size-8 rounded-full bg-app-primary/15 text-app-primary flex items-center justify-center">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-app-text">{p.title}</p>
                        <p className="text-xs text-app-secondary leading-relaxed mt-0.5">
                          {p.desc}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Privacy note */}
            <section className="bg-app-accent/15 border border-app-accent/40 rounded-xl p-3 flex items-start gap-3">
              <ShieldCheck className="size-5 text-app-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-bold text-app-text flex items-center gap-1.5">
                  <Lock className="size-3.5" aria-hidden="true" />
                  الخصوصية
                </p>
                <p className="text-xs text-app-secondary leading-relaxed mt-1">
                  مفيش حسابات ولا أسماء ولا بريد إلكتروني. بياناتك بتتحفظ على جهازك فقط —
                  ومش بتطلع من جهازك إلا لو وافقت تشاركها مجهولة لأغراض البحث.
                </p>
              </div>
            </section>

            {/* Not diagnosis */}
            <p className="text-xs text-app-secondary leading-relaxed">
              {explainText.notDiagnosis}
            </p>

            {/* Version info */}
            <section className="pt-2 border-t border-app-primary/10 flex items-center justify-between text-xs text-app-secondary">
              <span>
                إصدار المحتوى: <span className="font-mono font-bold text-app-primary">{contentVersion}</span>
              </span>
              <span>
                إصدار المحرك: <span className="font-mono font-bold text-app-primary">{engineVersion}</span>
              </span>
            </section>

            {/* Research data export — only show if user has data and consented */}
            {consent && eventsCount > 0 && (
              <section className="bg-app-accent/10 border border-app-accent/40 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <Database className="size-4 text-app-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-app-text">{messages.export_data_btn}</p>
                    <p className="text-xs text-app-secondary leading-relaxed mt-0.5">
                      {messages.export_data_desc}
                    </p>
                    <p className="text-xs text-app-secondary mt-1">
                      عدد الأحداث المسجلة: <span className="font-bold tabular-nums text-app-primary">{eventsCount}</span>
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="touch-target h-10 text-sm border-app-primary/30 text-app-primary hover:bg-app-primary/5 self-start"
                  onClick={() => {
                    const json = exportResearchData();
                    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `juzoor-research-${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success(messages.export_data_success);
                  }}
                >
                  <Download className="size-4" aria-hidden="true" />
                  نزّل JSON
                </Button>
              </section>
            )}

            <SheetClose asChild>
              <Button
                type="button"
                className="touch-target h-11 bg-app-primary text-white hover:bg-app-primary/90"
              >
                تمام، فهمت
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function renderScreen(screen: Screen) {
  switch (screen) {
    case "welcome":
      return <WelcomeScreen />;
    case "symptom":
      return <SymptomScreen />;
    case "profile":
      return <ProfileScreen />;
    case "questions":
      return <QuestionScreen />;
    case "causes":
      return <CausesScreen />;
    case "why":
      return <WhyChainScreen />;
    case "solutions":
      return <SolutionsScreen />;
    case "scenarios":
      return <ScenariosScreen />;
    case "plan":
      return <PlanScreen />;
    case "followup":
      return <FollowUpScreen />;
    case "done":
    case "plan_exported":
      return <DoneScreen />;
    default:
      return <WelcomeScreen />;
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
