"use client";

// Custom dropdown — we own the options list, not the system UI.
// Long lists (>8) automatically get a search box on top.

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  render?: (v: string) => React.ReactNode;
}

export function Select({ value, options, onChange, render }: Props) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const searchable = options.length > 8;
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options;

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQ("");
      setHi(Math.max(0, options.indexOf(value)));
      setTimeout(() => listRef.current?.querySelector('[data-hi="true"]')?.scrollIntoView({ block: "nearest" }), 0);
    }
  }, [open, options, value]);

  // Typing = filter; highlight resets to the top result.
  useEffect(() => {
    if (q) setHi(0);
  }, [q]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const nav = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[hi]) pick(filtered[hi]);
    }
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (open && !searchable) nav(e);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="input"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={onTriggerKey}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>{render ? render(value) : value}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2" aria-hidden
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms var(--ease-out)", flexShrink: 0 }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="pop-in"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 30,
            // Never narrower than a comfortable list, even when the trigger is a small chip
            minWidth: "max(100%, 260px)",
            background: "#0a0a0a",
            border: "1px solid var(--border-strong)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          {searchable && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={nav}
                placeholder="Search stocks…"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text)",
                  font: "inherit",
                  fontSize: 14,
                }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", font: "inherit", fontSize: 12 }}
                >
                  clear
                </button>
              )}
            </div>
          )}

          <div ref={listRef} role="listbox" className="no-scrollbar" style={{ maxHeight: 264, overflowY: "auto", padding: 6 }}>
            {filtered.length === 0 && (
              <p className="muted" style={{ fontSize: 13, padding: "10px 10px" }}>No stock matches “{q}”.</p>
            )}
            {filtered.map((o, i) => (
              <div
                key={o}
                role="option"
                aria-selected={o === value}
                data-hi={i === hi}
                onMouseEnter={() => setHi(i)}
                onClick={() => pick(o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 10px",
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: "pointer",
                  background: i === hi ? "rgba(255,255,255,0.06)" : "transparent",
                }}
              >
                {render ? render(o) : o}
                {o === value && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" aria-hidden style={{ marginLeft: "auto", flexShrink: 0 }}>
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
