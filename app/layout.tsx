import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Providers } from "./providers.tsx";
import { Header } from "./header.tsx";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  variable: "--font-body",
});

const DESC =
  "Foresee the market — parimutuel prediction markets on Robinhood Chain. Bet real USDG on stock prices, settled on-chain by the market itself. No judges, no disputes.";

export const metadata: Metadata = {
  metadataBase: new URL("https://presagemarkets.org"),
  title: {
    default: "Presage — Foresee the market",
    template: "%s · Presage",
  },
  description: DESC,
  applicationName: "Presage",
  openGraph: {
    type: "website",
    siteName: "PresageMarkets",
    title: "Presage — Foresee the market",
    description: DESC,
    url: "https://presagemarkets.org",
  },
  twitter: {
    card: "summary_large_image",
    title: "Presage — Foresee the market",
    description: DESC,
  },
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <Providers>
          <div className="wrap">
            <Header />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
