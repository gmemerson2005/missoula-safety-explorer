// Server Component (no directive) — the root layout. It runs only on the
// server: it loads fonts, reads the session cookie (so the header can show
// sign-out state), and renders the static chrome. Reading cookies() here
// makes every route dynamic, which this app accepts deliberately: the pages
// are role-dependent anyway, and the county data itself is still served
// from Next's data cache with a 1-hour revalidate window.

import type { Metadata } from "next";
import { Big_Shoulders, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import "./globals.css";
import Header from "@components/Header";
import { hasAnalystSession } from "@lib/auth";

// Type per the design system (.claude/skills/safety-explorer-design):
// Big Shoulders (variable) for display, Public Sans (variable) for body,
// IBM Plex Mono (static — explicit weights required) for data values only.
const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-big-shoulders",
  // next/font has no metrics for this face to auto-derive a size-adjusted
  // fallback (build warns); a plain condensed fallback stack is close enough.
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Impact", "sans-serif"],
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Missoula Public Safety Explorer",
    template: "%s · Missoula Public Safety Explorer",
  },
  description:
    "Fire districts, county infrastructure, and flood hazard zones for Missoula County, Montana — public summaries for everyone, full records for analysts.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAuthenticated = await hasAnalystSession();
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${bigShoulders.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Header isAuthenticated={isAuthenticated} />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-line px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-faint">
          Data: Missoula County Open Data · basemap © OpenStreetMap contributors
          · demo project, not an emergency service
        </footer>
      </body>
    </html>
  );
}
