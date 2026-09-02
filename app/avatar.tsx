// Deterministic identity from the wallet address: two-color avatar + pseudonym.
// No server, no uploads — the same address always produces the same look.

const ADJ = ["Silent", "Swift", "Golden", "Iron", "Lucky", "Midnight", "Crimson", "Frozen", "Wild", "Neon", "Phantom", "Solar", "Lunar", "Rapid", "Stoic", "Bold"];
const NOUN = ["Falcon", "Tiger", "Whale", "Fox", "Raven", "Bull", "Wolf", "Cobra", "Eagle", "Shark", "Panther", "Owl", "Bison", "Lynx", "Viper", "Hawk"];

function hash(addr: string): number {
  let h = 0;
  for (let i = 2; i < addr.length; i++) h = (h * 31 + addr.toLowerCase().charCodeAt(i)) >>> 0;
  return h;
}

export function nameOf(address: string): string {
  const h = hash(address);
  return `${ADJ[h % ADJ.length]} ${NOUN[(h >>> 4) % NOUN.length]}`;
}

// A unique, deterministic profile photo per address. DiceBear renders the same
// face for the same seed every time — so a wallet keeps its look across pages —
// while every distinct wallet gets a visibly different portrait. The gradient
// sits behind as a fallback if the image is slow or blocked.
const AVATAR_STYLE = "avataaars"; // people portraits — reads as real users

export function Avatar({ address, size = 36 }: { address: string; size?: number }) {
  const h = hash(address);
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + (h % 80)) % 360;
  const angle = h % 360;
  const src = `https://api.dicebear.com/9.x/${AVATAR_STYLE}/svg?seed=${address.toLowerCase()}`;
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "inline-block",
        overflow: "hidden",
        background: `linear-gradient(${angle}deg, hsl(${hue1} 65% 55%), hsl(${hue2} 70% 40%))`,
        border: "1px solid var(--border-strong)",
      }}
    >
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
      />
    </span>
  );
}
