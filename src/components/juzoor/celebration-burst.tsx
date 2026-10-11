"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

// ============================================================
// CelebrationBurst
// Renders a burst of small colored particles that fly outward
// from an anchor point and fall with gravity, then fade out.
//
// Pure visual — not part of the deterministic engine.
// Respects prefers-reduced-motion: returns null in that case.
// ============================================================

interface Particle {
  id: number;
  dx: number; // end x offset (px)
  dy: number; // end y offset (px) — positive = downward
  rot: number; // end rotation (deg)
  delay: number; // 0..0.1 seconds
  duration: number; // 1.2..1.8 seconds
  color: string; // CSS color (var() or literal)
  size: number; // 6..12 px
  shape: "circle" | "square";
}

// Juzoor brand palette — colors picked to read well on both light & dark
const CONFETTI_COLORS = [
  "var(--app-primary)",
  "var(--app-accent)",
  "var(--app-success)",
  "var(--confidence-medium)",
  "var(--app-secondary)",
];

function makeParticles(n: number): Particle[] {
  const arr: Particle[] = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      id: i,
      dx: Math.random() * 200 - 100, // -100..100
      dy: Math.random() * 150 + 50, // 50..200 (falls down)
      rot: Math.random() * 720 - 360, // -360..360
      delay: Math.random() * 0.1, // 0..100ms
      duration: 1.2 + Math.random() * 0.6, // 1.2..1.8s
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
      size: 6 + Math.random() * 6, // 6..12px
      shape: Math.random() > 0.5 ? "circle" : "square",
    });
  }
  return arr;
}

export interface CelebrationBurstProps {
  /** Increment to trigger a new burst. 0 = idle. */
  token: number;
  /** Anchor point in viewport coords. If null, no burst renders. */
  anchor: { x: number; y: number } | null;
  /** Particle count. Defaults to 24. */
  count?: number;
}

export function CelebrationBurst({
  token,
  anchor,
  count = 24,
}: CelebrationBurstProps) {
  const prefersReducedMotion = useReducedMotion();
  const [particles, setParticles] = React.useState<Particle[]>([]);

  React.useEffect(() => {
    if (!token || prefersReducedMotion || !anchor) return;
    setParticles(makeParticles(count));
    const t = window.setTimeout(() => setParticles([]), 2200);
    return () => window.clearTimeout(t);
  }, [token, prefersReducedMotion, anchor, count]);

  if (!particles.length || !anchor) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: anchor.x,
        top: anchor.y,
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{
            x: p.dx,
            y: p.dy,
            opacity: 0,
            scale: 0.3,
            rotate: p.rot,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut",
          }}
          style={{
            position: "absolute",
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.shape === "circle" ? "9999px" : "2px",
          }}
        />
      ))}
    </div>
  );
}
