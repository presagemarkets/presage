"use client";

// Personal profile page — reached by clicking your wallet in the header.
// Photo and username live in this browser's storage for now (v1); the public
// pseudonym still represents you everywhere else until a backend syncs it.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { encodeFunctionData, formatEther, parseEther } from "viem";
import { robinhoodChain, USDG } from "../../src/chain.ts";
import { erc20Abi } from "../../src/presage.ts";
import { browser, fmtUSDG, parseUSDG } from "../../src/markets.ts";
import { Avatar, nameOf } from "../avatar.tsx";
import { useWallet, friendly } from "../wallet.ts";
import { loadProfile, saveProfile, fileToAvatar, type LocalProfile } from "../idstore.ts";
import { PROFILE_REGISTRY_ADDRESS, profileRegistryAbi } from "../../src/registry.ts";

export default function ProfilePage() {
  const w = useWallet();
  const [profile, setProfile] = useState<LocalProfile>({});
  const [nameDraft, setNameDraft] = useState("");
  const [balances, setBalances] = useState<{ eth: bigint; usdg: bigint } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sendToken, setSendToken] = useState<"USDG" | "ETH">("USDG");
  const [sendTo, setSendTo] = useState("");
  const [sendAmt, setSendAmt] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);

  useEffect(() => {
    if (!w.address) return;
    const p = loadProfile(w.address);
    setProfile(p);
    setNameDraft(p.name ?? "");
  }, [w.address]);

  const refreshBalances = useCallback(() => {
    if (!w.address) return;
    const client = browser();
    void Promise.all([
      client.getBalance({ address: w.address }),
      client.readContract({ address: USDG, abi: erc20Abi, functionName: "balanceOf", args: [w.address] }),
    ])
      .then(([eth, usdg]) => setBalances({ eth, usdg }))
      .catch(() => {});
  }, [w.address]);

  useEffect(() => refreshBalances(), [refreshBalances]);

  const doSend = useCallback(async () => {
    setSendErr(null);
    if (!/^0x[a-fA-F0-9]{40}$/.test(sendTo)) {
      setSendErr("Enter a valid 0x address.");
      return;
    }
    setSending(true);
    try {
      if (sendToken === "ETH") {
        const value = parseEther(sendAmt.replace(",", "."));
        if (value <= 0n) throw new Error("Enter an amount greater than zero");
        await w.send({ to: sendTo as `0x${string}`, data: "0x", value });
      } else {
        const amt = parseUSDG(sendAmt);
        if (!amt) throw new Error("Enter an amount greater than zero");
        await w.send({
          to: USDG,
          data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [sendTo as `0x${string}`, amt] }),
        });
      }
      setNote(`Sent ${sendAmt} ${sendToken}.`);
      setSendAmt("");
      setSendTo("");
      setTimeout(refreshBalances, 2500);
    } catch (e) {
      setSendErr(friendly(e));
    } finally {
      setSending(false);
    }
  }, [sendTo, sendAmt, sendToken, w, refreshBalances]);

  const onPhoto = useCallback(
    async (file: File | undefined) => {
      if (!file || !w.address) return;
      try {
        const photo = await fileToAvatar(file);
        setProfile(saveProfile(w.address, { photo }));
        setNote("Photo saved on this device.");
      } catch {
        setNote("That file couldn't be read as an image.");
      }
    },
    [w.address]
  );

  if (!w.address) {
    return (
      <main style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", paddingTop: 60 }}>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Your profile</h1>
        <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>Sign in to see and customize your profile.</p>
        <button className="btn" onClick={() => void w.connect()} disabled={w.busy}>Sign in</button>
      </main>
    );
  }

  const addr = w.address;
  const displayName = profile.name || nameOf(addr);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, marginBottom: 24 }}>Your profile</h1>

      <div className="glow-card" style={{ display: "grid", gap: 22 }}>
        {/* ---- photo ---- */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {profile.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo} alt="" width={84} height={84} style={{ borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-strong)" }} />
          ) : (
            <Avatar address={addr} size={84} />
          )}
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn ghost" onClick={() => fileRef.current?.click()}>
                {profile.photo ? "Change photo" : "Upload photo"}
              </button>
              {profile.photo && (
                <button
                  className="btn ghost"
                  onClick={() => {
                    setProfile(saveProfile(addr, { photo: undefined }));
                    setNote("Photo removed — back to your generated avatar.");
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            <p className="muted" style={{ fontSize: 12 }}>Stored in this browser only, for now.</p>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
          </div>
        </div>

        {/* ---- name ---- */}
        <div>
          <p className="label" style={{ marginBottom: 8 }}>Display name</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              value={nameDraft}
              maxLength={24}
              placeholder={nameOf(addr)}
              onChange={(e) => setNameDraft(e.target.value)}
            />
            <button
              className="btn green"
              onClick={() => {
                setProfile(saveProfile(addr, { name: nameDraft.trim() || undefined }));
                setNote("Name saved.");
              }}
            >
              Save
            </button>
          </div>
          {PROFILE_REGISTRY_ADDRESS ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
              <button
                className="btn ghost"
                style={{ padding: "6px 12px", fontSize: 12 }}
                onClick={() =>
                  void (async () => {
                    try {
                      await w.send({
                        to: PROFILE_REGISTRY_ADDRESS,
                        data: encodeFunctionData({
                          abi: profileRegistryAbi,
                          functionName: "setProfile",
                          args: [nameDraft.trim().slice(0, 32), ""],
                        }),
                      });
                      setNote("Name published on-chain — everyone will see it.");
                    } catch {
                      setNote("On-chain publish failed — try again.");
                    }
                  })()
                }
              >
                Publish on-chain
              </button>
              <span className="muted" style={{ fontSize: 11 }}>makes this name visible to everyone</span>
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Public pseudonym: <strong>{nameOf(addr)}</strong> — on-chain names unlock once the ProfileRegistry deploys.
            </p>
          )}
        </div>

        {/* ---- wallet ---- */}
        <div>
          <p className="label" style={{ marginBottom: 8 }}>Wallet</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="num" style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, wordBreak: "break-all" }}>{addr}</span>
            <button
              className="btn ghost"
              style={{ padding: "5px 10px", fontSize: 12 }}
              onClick={() => {
                void navigator.clipboard?.writeText(addr).then(() => setNote("Address copied."));
              }}
            >
              Copy
            </button>
          </div>
        </div>

        {/* ---- balances ---- */}
        <div style={{ display: "flex", gap: 34 }}>
          <span>
            <span className="label" style={{ display: "block", marginBottom: 6 }}>USDG</span>
            <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>
              {balances ? `$${fmtUSDG(balances.usdg)}` : "…"}
            </span>
          </span>
          <span>
            <span className="label" style={{ display: "block", marginBottom: 6 }}>ETH (gas)</span>
            <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>
              {balances ? Number(formatEther(balances.eth)).toFixed(5) : "…"}
            </span>
          </span>
        </div>

        {/* ---- actions ---- */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/u/${addr}`} className="btn ghost">View public profile</Link>
          <Link href="/swap" className="btn ghost">Get USDG</Link>
          <a href={`${robinhoodChain.blockExplorers!.default.url}/address/${addr}`} target="_blank" rel="noopener noreferrer" className="btn ghost">
            Blockscout ↗
          </a>
          <span style={{ flex: 1 }} />
          <button className="btn ghost" style={{ borderColor: "rgba(248,113,113,0.4)", color: "#f87171" }} onClick={w.disconnect}>
            Sign out
          </button>
        </div>

        {note && <p className="ok">{note}</p>}
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", marginTop: 16 }}>
        {/* ---- deposit / receive ---- */}
        <div className="glow-card" style={{ display: "grid", gap: 14, justifyItems: "center", textAlign: "center" }}>
          <p className="label">Deposit · Receive</p>
          <span style={{ background: "#ffffff", padding: 12, borderRadius: 14, display: "inline-flex" }}>
            <QRCodeSVG value={addr} size={148} level="M" />
          </span>
          <p className="num muted" style={{ fontSize: 12, fontFamily: "ui-monospace, monospace", wordBreak: "break-all" }}>{addr}</p>
          <button
            className="btn ghost"
            onClick={() => void navigator.clipboard?.writeText(addr).then(() => setNote("Address copied."))}
          >
            Copy address
          </button>
          <p className="muted" style={{ fontSize: 11, lineHeight: 1.5 }}>
            Send only {robinhoodChain.name} assets here — USDG, ETH, or tokenized stocks. Assets from other networks won&apos;t arrive.
          </p>
        </div>

        {/* ---- send / withdraw ---- */}
        <div className="glow-card" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <p className="label">Send · Withdraw</p>
          <div style={{ display: "flex", gap: 8 }}>
            {(["USDG", "ETH"] as const).map((tk) => (
              <button key={tk} className={`btn ${sendToken === tk ? "green" : "ghost"}`} style={{ flex: 1 }} onClick={() => setSendToken(tk)}>
                {tk}
              </button>
            ))}
          </div>
          <input className="input" placeholder="Recipient 0x…" value={sendTo} onChange={(e) => setSendTo(e.target.value.trim())} />
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" inputMode="decimal" placeholder="Amount" value={sendAmt} onChange={(e) => setSendAmt(e.target.value)} />
            <button
              className="btn ghost"
              onClick={() => {
                if (!balances) return;
                setSendAmt(
                  sendToken === "USDG"
                    ? (Number(balances.usdg) / 1e6).toString()
                    : // Leave a little ETH behind for gas.
                      Math.max(0, Number(formatEther(balances.eth)) - 0.0003).toFixed(6)
                );
              }}
            >
              Max
            </button>
          </div>
          <p className="muted num" style={{ fontSize: 12 }}>
            Balance: {balances ? (sendToken === "USDG" ? `$${fmtUSDG(balances.usdg)}` : `${Number(formatEther(balances.eth)).toFixed(5)} ETH`) : "…"}
          </p>
          <button className="btn green" disabled={sending} onClick={() => void doSend()}>
            {sending ? "Sending…" : `Send ${sendToken}`}
          </button>
          {sendErr && <p className="err">{sendErr}</p>}
        </div>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 14, lineHeight: 1.6 }}>
        Signed in as <strong>{displayName}</strong>. Your bets, wins and P&L live on the{" "}
        <Link href={`/u/${addr}`} style={{ textDecoration: "underline" }}>public profile</Link> — always computed from the chain.
      </p>
    </main>
  );
}

