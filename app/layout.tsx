// Server Component (no directive) — the root layout. It runs only on the
// server: it loads fonts, reads the session cookie (so the header can show
// sign-out state), and renders the static chrome. Reading cookies() here
// makes every route dynamic, which this app accepts deliberately: the pages
// are role-dependent anyway, and the county data itself is still served
// from Next's data cache with a 1-hour revalidate window.

import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import Header from "@components/Header";
import { hasAnalystSession } from "@lib/auth";

// Neither IBM Plex face is a variable font, so explicit weights are required.
const plexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-sans",
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
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
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
