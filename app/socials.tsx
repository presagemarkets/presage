// Shared social links — used in the docs and landing footers.

export const SOCIALS = [
  { name: "X", href: "https://x.com/PresageMarket" },
  { name: "Telegram", href: "https://t.me/PresageMarket" },
  { name: "GitHub", href: "https://github.com/presagemarkets" },
] as const;

const ICON: Record<string, React.ReactNode> = {
  X: (
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  ),
  Telegram: (
    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
  ),
  GitHub: (
    <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.6 8.21 11.16.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.7-4.04-1.56-4.04-1.56-.55-1.36-1.33-1.72-1.33-1.72-1.09-.72.08-.71.08-.71 1.2.08 1.83 1.2 1.83 1.2 1.07 1.77 2.81 1.26 3.5.96.11-.75.42-1.26.76-1.55-2.67-.29-5.47-1.29-5.47-5.75 0-1.27.47-2.31 1.24-3.12-.12-.29-.54-1.46.12-3.05 0 0 1.01-.31 3.3 1.19a11.6 11.6 0 0 1 6 0c2.29-1.5 3.3-1.19 3.3-1.19.66 1.59.24 2.76.12 3.05.77.81 1.24 1.85 1.24 3.12 0 4.47-2.81 5.45-5.49 5.74.43.36.81 1.07.81 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.22.68.83.56A12.02 12.02 0 0 0 24 12.29C24 5.78 18.63.5 12 .5z" />
  ),
};

export function Socials({ size = 18 }: { size?: number }) {
  return (
    <span className="socials">
      {SOCIALS.map((s) => (
        <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name} title={s.name}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            {ICON[s.name]}
          </svg>
        </a>
      ))}
    </span>
  );
}
