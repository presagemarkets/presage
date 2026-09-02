"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useWallet } from "./wallet.ts";
import { Avatar, nameOf } from "./avatar.tsx";
import { loadProfile, type LocalProfile } from "./idstore.ts";

const NAV = [
  { href: "/markets", label: "Markets" },
  { href: "/swap", label: "Swap" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/stats", label: "Stats" },
];

// Looping animated icons for the mobile menu (CSS keyframes live in globals.css).
const IconMarkets = () => (
  <svg className="mm-ico" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect className="mmb mmb1" x="4" y="12" width="3.5" height="8" rx="1" />
    <rect className="mmb mmb2" x="10.25" y="7" width="3.5" height="13" rx="1" />
    <rect className="mmb mmb3" x="16.5" y="4" width="3.5" height="16" rx="1" />
  </svg>
);
const IconSwap = () => (
  <svg className="mm-ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path className="mm-swap-a" d="M7 4v14m0 0-3-3m3 3 3-3" />
    <path className="mm-swap-b" d="M17 20V6m0 0-3 3m3-3 3 3" />
  </svg>
);
const IconLeaderboard = () => (
  <svg className="mm-ico" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path className="mm-star" d="M12 2.4l1.5 3 3.3.3-2.5 2.2.8 3.2-3.1-1.7-3.1 1.7.8-3.2L7.2 5.7l3.3-.3z" />
    <rect x="4" y="14.5" width="4.4" height="5.5" rx="1" opacity="0.7" />
    <rect x="9.8" y="11.5" width="4.4" height="8.5" rx="1" />
    <rect x="15.6" y="15.5" width="4.4" height="4.5" rx="1" opacity="0.7" />
  </svg>
);
const IconStats = () => (
  <svg className="mm-ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path className="mm-line" d="M3 16l5-5 4 3 6-8" />
    <circle className="mm-line-dot" cx="18" cy="6" r="1.7" fill="currentColor" stroke="none" />
  </svg>
);
const IconShowdown = () => (
  <svg className="mm-ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path className="mm-sword-l" d="M5 5l9 9" />
    <path className="mm-sword-r" d="M19 5l-9 9" />
  </svg>
);
const IconPlus = () => (
  <svg className="mm-ico mm-plus" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const MOBILE_ITEMS = [
  { href: "/markets", label: "Markets", icon: <IconMarkets /> },
  { href: "/swap", label: "Swap", icon: <IconSwap /> },
  { href: "/leaderboard", label: "Leaderboard", icon: <IconLeaderboard /> },
  { href: "/stats", label: "Stats", icon: <IconStats /> },
  { href: "/showdown", label: "Showdown", icon: <IconShowdown /> },
];

export function Header() {
  const w = useWallet();
  const [profile, setProfile] = useState<LocalProfile>({});
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();

  // Close the mobile menu on navigation.
  useEffect(() => setMenu(false), [pathname]);

  // Follow local profile edits live (same-tab custom event + cross-tab storage).
  useEffect(() => {
    if (!w.address) return;
    const sync = () => setProfile(loadProfile(w.address!));
    sync();
    window.addEventListener("presage-profile", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("presage-profile", sync);
      window.removeEventListener("storage", sync);
    };
  }, [w.address]);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "22px 0",
        marginBottom: 26,
        borderBottom: "1px solid var(--border)",
        position: "relative",
      }}
    >
      <Link href="/markets" style={{ display: "flex", alignItems: "center", gap: 9 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={24} height={24} style={{ display: "block" }} />
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "0.22em" }}>PRESAGE</span>
      </Link>

      <nav className="nav-desktop muted">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}>{n.label}</Link>
        ))}
      </nav>

      <span style={{ flex: 1 }} />

      <Link href="/create" className="btn ghost create-desktop" style={{ padding: "8px 14px" }}>
        + Create market
      </Link>

      {w.address ? (
        <Link href="/profile" className="btn ghost" style={{ padding: "6px 14px 6px 8px", gap: 8 }} title="Your profile">
          {profile.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo} alt="" width={24} height={24} style={{ borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <Avatar address={w.address} size={24} />
          )}
          <span style={{ fontSize: 13, fontWeight: 600 }}>{profile.name || nameOf(w.address)}</span>
        </Link>
      ) : (
        <button className="btn" onClick={() => void w.connect()} disabled={w.busy}>
          Sign in
        </button>
      )}

      <button className="btn ghost hamburger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {menu ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      {menu && (
        <nav className="mobile-menu pop-in">
          {MOBILE_ITEMS.map((n) => (
            <Link key={n.href} href={n.href} className="mm-item">
              {n.icon}
              {n.label}
            </Link>
          ))}
          <Link href="/create" className="mm-create">
            <IconPlus />
            Create market
          </Link>
        </nav>
      )}
    </header>
  );
}

