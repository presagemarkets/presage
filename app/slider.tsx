"use client";

// Horizontal card slider: swipe on touch, arrow buttons on desktop,
// scroll-snap alignment, and gentle auto-advance that yields to the user.

import { useEffect, useRef } from "react";

const STEP_MS = 4000;
const TOUCH_RESUME_MS = 6000;

export function Slider({ title, note, children }: { title: React.ReactNode; note?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const by = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  // Auto-run: one card every few seconds, wrap back to the start at the end.
  // Pauses on hover/touch and for reduced-motion users.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el || paused.current || document.hidden) return;
      if (el.scrollWidth <= el.clientWidth) return; // nothing to slide
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 24) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 356, behavior: "smooth" });
      }
    }, STEP_MS);
    return () => clearInterval(t);
  }, []);

  const pause = () => {
    paused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  };
  const resumeSoon = (delay = 0) => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => (paused.current = false), delay);
  };

  return (
    <div style={{ marginBottom: 34 }}>
      <div className="sec-head">
        {title}
        <span className="sec-line" />
        {note && <span className="label">{note}</span>}
        <button className="btn ghost slide-btn" onClick={() => { pause(); by(-1); resumeSoon(TOUCH_RESUME_MS); }} aria-label="Scroll left">‹</button>
        <button className="btn ghost slide-btn" onClick={() => { pause(); by(1); resumeSoon(TOUCH_RESUME_MS); }} aria-label="Scroll right">›</button>
      </div>
      <div
        className="h-scroll-wrap"
        onMouseEnter={pause}
        onMouseLeave={() => resumeSoon(0)}
        onTouchStart={pause}
        onTouchEnd={() => resumeSoon(TOUCH_RESUME_MS)}
      >
        <div className="h-scroll" ref={ref}>
          {children}
        </div>
      </div>
    </div>
  );
}
