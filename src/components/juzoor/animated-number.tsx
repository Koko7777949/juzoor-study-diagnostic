"use client";

import * as React from "react";
import { animate, useReducedMotion } from "framer-motion";

export interface AnimatedNumberProps {
  /** Final value to count up to. */
  value: number;
  /** Animation duration in seconds. Defaults to 1s. */
  duration?: number;
  /** Delay before starting the count-up, in seconds. Defaults to 0s. */
  delay?: number;
  /** Optional suffix appended after the number (e.g. "%"). */
  suffix?: string;
  /** Optional className applied to the rendered <span>. */
  className?: string;
  /** Optional aria-label override. Defaults to `${value}${suffix ?? ""}`. */
  ariaLabel?: string;
}

/**
 * AnimatedNumber — counts up from 0 to `value` over `duration` seconds using
 * framer-motion's `animate` function (same approach as the count-up in
 * `cause-card.tsx`). Renders a <span role="status"> so screen readers
 * announce the final value. Respects `prefers-reduced-motion`: jumps straight
 * to the final value with no animation.
 */
export function AnimatedNumber({
  value,
  duration = 1,
  delay = 0,
  suffix = "",
  className,
  ariaLabel,
}: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const [displayed, setDisplayed] = React.useState(
    prefersReducedMotion ? value : 0,
  );

  React.useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayed(value);
      return;
    }
    // Reset to 0 before animating, so a new `value` re-runs the count-up.
    setDisplayed(0);
    const controls = animate(0, value, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (v) => setDisplayed(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, duration, delay, prefersReducedMotion]);

  const finalLabel = ariaLabel ?? `${value}${suffix}`;

  return (
    <span
      role="status"
      aria-label={finalLabel}
      className={className}
    >
      <span className="tabular-nums" aria-hidden="true">
        {displayed}
        {suffix}
      </span>
    </span>
  );
}
