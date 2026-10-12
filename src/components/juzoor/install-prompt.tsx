"use client";

import * as React from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * InstallPrompt — shows a banner prompting the user to install the PWA
 * when the `beforeinstallprompt` event fires (Chrome/Edge/Android).
 *
 * Dismissed state is persisted in localStorage so it doesn't reappear
 * after the user closes it.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showBanner, setShowBanner] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem("juzoor.install-dismissed");
    if (dismissed === "true") return;

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("juzoor.install-dismissed", "true");
  };

  if (!showBanner || installed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card-gradient shadow-card-hover rounded-2xl border border-app-primary/30 p-4 flex items-start gap-3">
        <div className="shrink-0 size-10 rounded-xl bg-app-primary/15 text-app-primary flex items-center justify-center">
          <Download className="size-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-app-text leading-snug">
            نزّل جذور على موبايلك
          </h3>
          <p className="text-xs text-app-secondary leading-relaxed mt-0.5">
            افتح التطبيق مباشرة من شاشتك الرئيسية — يشتغل بدون إنترنت
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              size="sm"
              className="touch-target h-9 text-xs bg-app-primary text-white hover:bg-app-primary/90"
              onClick={handleInstall}
            >
              <Download className="size-3.5" aria-hidden="true" />
              نزّل التطبيق
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="touch-target h-9 px-2 text-app-secondary hover:text-app-text"
              aria-label="إغلاق"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
