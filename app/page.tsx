"use client";

// Presage landing — full-bleed marketing home. Adapted from a portfolio design
// system: loading screen, HLS video hero, feature bento, stats, footer marquee.
// GSAP for entrance + marquee, hls.js for video, IntersectionObserver for reveals.

import { useEffect, useRef, useState } from "react";
import { Socials } from "./socials.tsx";

// The app lives on its own subdomain; landing CTAs cross over to it.
const APP = "https://app.presagemarkets.org";

const HLS_SRC = "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";
const LOAD_WORDS = ["Foresee", "Wager", "Settle"];
const ROLES = ["market", "duel", "round", "verdict"];

/** Attach an HLS stream to a <video>, with native-HLS fallback. */
function useHls(ref: React.RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: { destroy: () => void } | null = null;
    void import("hls.js").then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        const h = new Hls({ enableWorker: true });
        h.loadSource(HLS_SRC);
        h.attachMedia(video);
        hls = h;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = HLS_SRC;
      }
    });
    return () => hls?.destroy();
  }, [ref]);
}

function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);
  const [word, setWord] = useState(0);
  const [done, setDone] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const start = performance.now();
    const DUR = 2700;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DUR);
      const c = Math.round(p * 100);
      setCount(c);
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setDone(true), 400);
    };
    raf = requestAnimationFrame(tick);
    const w = setInterval(() => setWord((n) => (n + 1) % LOAD_WORDS.length), 900);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(w);
    };
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onDone, 480);
    return () => clearTimeout(t);
  }, [done, onDone]);

  return (
    <div className={`load-screen ${done ? "done" : ""}`}>
      <span className="eyebrow">Presage</span>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span key={word} className="load-word serif" style={{ fontSize: "clamp(40px,8vw,88px)", color: "rgba(244,244,244,0.85)" }}>
          {LOAD_WORDS[word]}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 22 }}>
        <span className="serif num" style={{ fontSize: "clamp(72px,16vw,150px)", lineHeight: 1 }}>
          {String(count).padStart(3, "0")}
        </span>
      </div>
      <div className="load-bar">
        <div ref={barRef} className="accent-gradient" style={{ transform: "scaleX(0)" }} />
      </div>
    </div>
  );
}

function Nav({ scrolled }: { scrolled: boolean }) {
  return (
    <nav className="lnav">
      <div className={`lnav-pill ${scrolled ? "scrolled" : ""}`}>
        <a href={APP} className="lnav-logo" aria-label="Presage" style={{ background: "#0a0f0c", border: "1px solid var(--border-strong)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={22} height={22} />
        </a>
        <span className="lnav-div" />
        <a href={`${APP}/markets`} className="lnav-link">Markets</a>
        <a href={`${APP}/showdown`} className="lnav-link">Showdown</a>
        <a href="/roadmap" className="lnav-link">Roadmap</a>
        <a href={`${APP}/stats`} className="lnav-link">Stats</a>
        <span className="lnav-div" />
        <a href={APP} className="lnav-cta">Enter app ↗</a>
      </div>
    </nav>
  );
}

// Token contract address — click to copy.
const CA = "0x17447b96fca558003634b838484299b5aa9bc6d6";
function CaPill() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="ca-pill blur-in"
      title="Copy contract address"
      onClick={() => {
        void navigator.clipboard?.writeText(CA);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      <span className="ca-tag">CA</span>
      <span className="ca-addr">{CA}</span>
      <span className="ca-act">{copied ? "Copied ✓" : "Copy"}</span>
    </button>
  );
}

function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [role, setRole] = useState(0);
  useHls(videoRef);

  useEffect(() => {
    const t = setInterval(() => setRole((n) => (n + 1) % ROLES.length), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    void import("gsap").then(({ gsap }) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set([".name-reveal", ".blur-in"], { opacity: 1, filter: "none", y: 0 });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(".name-reveal", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.2, delay: 0.1 });
      tl.fromTo(".blur-in", { opacity: 0, filter: "blur(10px)", y: 20 }, { opacity: 1, filter: "blur(0px)", y: 0, duration: 1, stagger: 0.1 }, 0.3);
    });
  }, []);

  return (
    <section className="hero">
      <video ref={videoRef} className="hero-video" autoPlay muted loop playsInline />
      <div className="hero-veil" />
      <div className="hero-fade" />
      <div className="hero-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={72} height={72} className="blur-in" style={{ display: "block", margin: "0 auto 14px" }} />
        <p className="eyebrow blur-in" style={{ marginBottom: 26 }}>Collection &apos;26 · on RH Chain</p>
        <h1 className="hero-title serif name-reveal">Presage</h1>
        <p className="blur-in" style={{ fontSize: "clamp(16px,2.4vw,22px)", color: "var(--text)", marginBottom: 22 }}>
          Foresee the{" "}
          <span key={role} className="role-word serif" style={{ color: "#4ade80" }}>{ROLES[role]}</span>.
        </p>
        <p className="blur-in muted" style={{ fontSize: 15, maxWidth: 460, margin: "0 auto 40px", lineHeight: 1.7 }}>
          Parimutuel prediction markets on stock prices — settled on-chain by the market itself. No judges, no oracle disputes. Just you and the tape.
        </p>
        <div className="blur-in" style={{ display: "inline-flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <a href={APP} className="lnav-cta" style={{ padding: "14px 26px", fontSize: 14 }}>Enter app ↗</a>
          <a href="#features" className="lnav-link" style={{ border: "1px solid var(--border-strong)", padding: "13px 26px", fontSize: 14, color: "var(--text)" }}>
            How it works
          </a>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <CaPill />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 34, left: "50%", transform: "translateX(-50%)", zIndex: 2, display: "grid", justifyItems: "center", gap: 10 }}>
        <span className="eyebrow" style={{ letterSpacing: "0.2em" }}>Scroll</span>
        <span style={{ width: 1, height: 40, background: "var(--border-strong)", overflow: "hidden", position: "relative" }}>
          <span className="accent-gradient" style={{ position: "absolute", inset: 0, animation: "scrollDown 1.5s ease-in-out infinite" }} />
        </span>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: "◆", title: "Prediction markets", body: "Bet YES/NO on stock prices. Up/down, over/under, or stock duels — all settled from the pool's own 30-minute TWAP.", href: `${APP}/markets`, span: 7 },
  { icon: "⚔", title: "Showdown 1v1", body: "Publish a challenge with your champion stock and stake. A rival answers with theirs — highest return takes the pot.", href: `${APP}/showdown`, span: 5 },
  { icon: "$", title: "Stock swap", body: "Trade USDG and tokenized stocks on the same pools that settle the markets — live mid-price, slippage-guarded.", href: `${APP}/swap`, span: 5 },
  { icon: "▲", title: "Live stats & leaderboard", body: "Every bet, win, and dollar of P&L read straight from the chain. Nothing self-reported.", href: `${APP}/stats`, span: 7 },
];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.15, rootMargin: "-60px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Features() {
  return (
    <section id="features" style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}>
      <div className="reveal" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ width: 32, height: 1, background: "var(--border-strong)" }} />
        <span className="eyebrow">What you can do</span>
      </div>
      <h2 className="reveal serif" style={{ fontSize: "clamp(34px,6vw,64px)", lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: 40 }}>
        One venue, four <span style={{ color: "#4ade80", fontWeight: 700 }}>ways to play</span>
      </h2>
      <div className="feat-grid">
        {FEATURES.map((f) => (
          <a key={f.title} href={f.href} className="feat-card reveal" style={{ gridColumn: `span ${f.span}` }}>
            <span className="feat-ico serif">{f.icon}</span>
            <div>
              <h3 className="serif" style={{ fontSize: 26, marginBottom: 8 }}>{f.title}</h3>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 420 }}>{f.body}</p>
              <span style={{ display: "inline-block", marginTop: 16, fontSize: 13, fontWeight: 600, color: "#4ade80" }}>Open →</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

// Animated placeholder icons (temporary loops — swap for final art later).
const S = 30;
const IcoCreate = () => (
  <svg className="ico-bob" width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" opacity="0.4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);
const IcoUpDown = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path className="ico-up" d="M8 10l0-5m0 0-2.5 2.5M8 5l2.5 2.5" stroke="#4ade80" />
    <path className="ico-down" d="M16 14l0 5m0 0 2.5-2.5M16 19l-2.5-2.5" stroke="#f87171" />
  </svg>
);
const IcoOverUnder = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 12h18" strokeDasharray="3 3" opacity="0.5" />
    <circle className="ico-dot" cx="12" cy="12" r="3" fill="#4ade80" stroke="none" />
  </svg>
);
const IcoDuel = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" fill="none">
    <rect className="ico-barA" x="7" y="4" width="4" height="16" rx="1.5" fill="#4ade80" style={{ transformOrigin: "9px 20px" }} />
    <rect className="ico-barB" x="14" y="4" width="4" height="16" rx="1.5" fill="#f87171" style={{ transformOrigin: "16px 20px" }} />
  </svg>
);
const IcoShowdown = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path className="ico-swordL" d="M5 5l10 10" style={{ transformOrigin: "12px 12px" }} />
    <path className="ico-swordR" d="M19 5L9 15" style={{ transformOrigin: "12px 12px" }} stroke="#f87171" />
  </svg>
);
const IcoRounds = () => (
  <svg className="ico-spin" width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 12a8 8 0 1 1-2.3-5.6" />
    <path d="M20 4v4h-4" />
  </svg>
);

const PLAYBOOK = [
  { ico: <IcoCreate />, title: "Create a market", body: "Launch a bet from a template — pick a stock, a shape, and a deadline. Published on-chain in one click, no listing fee." },
  { ico: <IcoUpDown />, title: "Up / down", body: "The simplest call: will the stock close green or red over the window? No strike, no math — just direction." },
  { ico: <IcoOverUnder />, title: "Over / under", body: "Name a price. Bet whether the stock finishes above or below it, decided by its 30-minute on-chain average." },
  { ico: <IcoDuel />, title: "Stock duel", body: "Two stocks, one window. Back the one you think climbs higher — the market compares their returns and pays the winning side." },
  { ico: <IcoShowdown />, title: "Showdown 1v1", body: "Head-to-head for real stakes. Post your champion stock and wager; a rival answers with theirs, winner takes the pot." },
  { ico: <IcoRounds />, title: "Daily rounds", body: "Fresh markets appear every session, seeded on both sides so a pot is never empty, and settle at U.S. market close." },
];

function Journal() {
  return (
    <section style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 24px" }}>
      <div className="reveal" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ width: 32, height: 1, background: "var(--border-strong)" }} />
        <span className="eyebrow">How to play</span>
      </div>
      <h2 className="reveal serif" style={{ fontSize: "clamp(34px,6vw,64px)", lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: 36 }}>
        The <span style={{ color: "#4ade80", fontWeight: 700 }}>playbook</span>
      </h2>
      <div style={{ display: "grid", gap: 14 }}>
        {PLAYBOOK.map((p) => (
          <div key={p.title} className="jrnl-item reveal">
            <span className="jrnl-ico">{p.ico}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="serif" style={{ fontSize: 21, fontWeight: 500, display: "block", lineHeight: 1.3, marginBottom: 4 }}>{p.title}</span>
              <span className="muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{p.body}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Placeholder explorations gallery — swap images later.
const EXPLORE_A = ["ph-grad-1", "ph-grad-3", "ph-grad-5"];
const EXPLORE_B = ["ph-grad-2", "ph-grad-4", "ph-grad-6"];

function Explorations() {
  const secRef = useRef<HTMLElement>(null);
  const colA = useRef<HTMLDivElement>(null);
  const colB = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = document.querySelector(".landing") as HTMLElement | null;
    const sec = secRef.current;
    if (!scroller || !sec) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      const rect = sec.getBoundingClientRect();
      const vh = scroller.clientHeight;
      const progress = (vh - rect.top) / (vh + rect.height); // 0..1 passing through
      const p = Math.max(-0.5, Math.min(0.5, progress - 0.5));
      if (colA.current) colA.current.style.transform = `translateY(${p * -140}px)`;
      if (colB.current) colB.current.style.transform = `translateY(${p * 140}px)`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={secRef} className="explore">
      <div className="explore-head">
        <p className="eyebrow" style={{ marginBottom: 14 }}>Explorations</p>
        <h2 className="serif" style={{ fontSize: "clamp(40px,8vw,92px)", lineHeight: 1, letterSpacing: "-0.02em" }}>
          Visual <span style={{ color: "#4ade80", fontWeight: 700 }}>playground</span>
        </h2>
        <p className="muted" style={{ fontSize: 14, maxWidth: 380, margin: "18px auto 0", lineHeight: 1.6 }}>
          Concepts, charts, and market moments — a scrapbook of what we&apos;re building.
        </p>
      </div>
      <div className="explore-cols">
        <div className="explore-col" ref={colA}>
          {EXPLORE_A.map((g, i) => (
            <div key={i} className={`explore-card ${g}`} />
          ))}
        </div>
        <div className="explore-col b" ref={colB}>
          {EXPLORE_B.map((g, i) => (
            <div key={i} className={`explore-card ${g}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

const STATS = [
  { n: "34", l: "Tokenized stocks", s: "Deep-pool names, TWAP-verified" },
  { n: "3", l: "Market templates", s: "Up/down · over/under · duel" },
  { n: "2%", l: "House fee", s: "Only on the losing pot" },
];

function Stats() {
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 40, borderTop: "1px solid var(--border)", paddingTop: 50 }}>
        {STATS.map((s) => (
          <div key={s.l} className="reveal">
            <p className="lstat-num serif">{s.n}</p>
            <p style={{ fontWeight: 600, marginTop: 10 }}>{s.l}</p>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{s.s}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  useHls(videoRef);

  useEffect(() => {
    void import("gsap").then(({ gsap }) => {
      if (!marqueeRef.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.to(marqueeRef.current, { xPercent: -50, duration: 40, ease: "none", repeat: -1 });
    });
  }, []);

  const phrase = "FORESEE THE MARKET · ";
  return (
    <footer className="foot">
      <video ref={videoRef} className="foot-video" autoPlay muted loop playsInline />
      <div className="foot-veil" />
      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={{ overflow: "hidden", marginBottom: 60 }}>
          <div ref={marqueeRef} className="marquee serif">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i}>{phrase}</span>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <h2 className="serif" style={{ fontSize: "clamp(36px,6vw,72px)", lineHeight: 1, marginBottom: 24 }}>
            Ready to <b>call it</b>?
          </h2>
          <a href={APP} className="lnav-cta" style={{ padding: "15px 30px", fontSize: 15 }}>Enter Presage ↗</a>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 56, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }} className="muted">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", animation: "livePulse 2s ease-in-out infinite" }} />
              Live on Robinhood Chain
            </span>
            <span className="muted" style={{ fontSize: 13 }}>·</span>
            <span className="muted" style={{ fontSize: 13 }}>© 2026 PresageMarkets</span>
            <span className="muted" style={{ fontSize: 13 }}>·</span>
            <Socials />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  useReveal();

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 100);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [loading]);

  return (
    <>
      {loading && <LoadingScreen onDone={() => setLoading(false)} />}
      <div className="landing" ref={scrollerRef}>
        <Nav scrolled={scrolled} />
        <Hero />
        <Features />
        <Journal />
        <Stats />
        <Footer />
      </div>
    </>
  );
}
