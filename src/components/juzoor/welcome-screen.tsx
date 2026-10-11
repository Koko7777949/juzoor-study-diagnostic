"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sprout, ChevronLeft, KeyRound, ShieldCheck, EyeOff } from "lucide-react";
import { useJuzoor } from "@/lib/store";
import { loadMessages } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function WelcomeScreen() {
  const messages = React.useMemo(() => loadMessages(), []);
  const consent = useJuzoor((s) => s.consent);
  const participantCode = useJuzoor((s) => s.participantCode);
  const setConsent = useJuzoor((s) => s.setConsent);
  const generateParticipantCode = useJuzoor((s) => s.generateParticipantCode);
  const init = useJuzoor((s) => s.init);
  const go = useJuzoor((s) => s.go);

  const [codeInput, setCodeInput] = React.useState("");

  const handleConsentYes = () => {
    setConsent(true);
    generateParticipantCode();
  };

  const handleStart = () => {
    init("study");
    go("symptom");
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-12 flex flex-col gap-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center text-center pt-4"
      >
        <div className="size-24 rounded-full bg-app-accent/30 flex items-center justify-center mb-4 shadow-sm">
          <Sprout className="size-12 text-app-primary" aria-hidden="true" />
        </div>
        <h1 className="text-5xl font-bold text-app-primary font-cairo">جذور</h1>
        <p className="text-lg text-app-text mt-3 leading-relaxed">
          حلّل مشكلتك الدراسية خطوة بخطوة
        </p>
      </motion.div>

      {/* Intro paragraph */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="text-sm text-app-secondary text-center leading-relaxed px-2"
      >
        {messages.welcome_intro}
      </motion.p>

      <Separator />

      {/* Consent section */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex flex-col gap-4"
        aria-labelledby="consent-heading"
      >
        <h2 id="consent-heading" className="text-base font-semibold text-app-text flex items-center gap-2">
          <ShieldCheck className="size-5 text-app-primary" aria-hidden="true" />
          الموافقة على البيانات
        </h2>
        <p className="text-sm text-app-secondary leading-relaxed bg-app-muted rounded-xl p-4">
          {messages.consent_text}
        </p>

        {consent === null ? (
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              className="touch-target h-12 text-base bg-app-primary text-white hover:bg-app-primary/90"
              onClick={handleConsentYes}
            >
              {messages.consent_yes}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="touch-target h-12 text-base border-app-primary/30 text-app-primary hover:bg-app-primary/5"
              onClick={() => setConsent(false)}
            >
              <EyeOff className="size-4" aria-hidden="true" />
              {messages.consent_no}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div
              className={`text-sm font-medium flex items-center gap-2 ${
                consent ? "text-app-success" : "text-app-secondary"
              }`}
              role="status"
            >
              <span
                className={`size-2.5 rounded-full ${
                  consent ? "bg-app-success" : "bg-app-secondary/60"
                }`}
                aria-hidden="true"
              />
              {consent ? "وافقت على المشاركة ببيانات مجهولة" : "هتكمّل بدون مشاركة بيانات"}
            </div>

            {consent && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="participant-code" className="text-sm text-app-secondary">
                  <KeyRound className="size-4" aria-hidden="true" />
                  كود المشاركة (اختياري)
                </Label>
                <Input
                  id="participant-code"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  placeholder="JZ-XXXXXX"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  className="touch-target h-11"
                  aria-describedby="participant-code-hint"
                />
                {participantCode && (
                  <p id="participant-code-hint" className="text-xs text-app-secondary">
                    كودك الحالي: <span className="font-mono font-bold text-app-primary">{participantCode}</span> — احتفظ بيه لو حبيت ترجع.
                  </p>
                )}
              </div>
            )}

            <Button
              type="button"
              className="touch-target h-12 text-base bg-app-primary text-white hover:bg-app-primary/90 mt-2"
              onClick={handleStart}
            >
              {messages.start_btn}
              <ChevronLeft className="size-5" aria-hidden="true" />
            </Button>
          </div>
        )}
      </motion.section>

      <p className="text-xs text-app-secondary text-center mt-2 leading-relaxed">
        التطبيق مش تشخيص ولا بديل عن شخص مختص. لو حسّيت إن المشكلة أكبر، اتكلم مع حد تثق فيه.
      </p>
    </div>
  );
}
