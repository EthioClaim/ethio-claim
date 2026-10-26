import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#090B0E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    template: "%s | EthioClaim Pro",
    default: "EthioClaim Pro — AI-Powered Motor Claims Intelligence",
  },
  description:
    "EthioClaim Pro: Next-generation motor claims intelligence platform for Ethiopian insurers. AI-driven damage localization, cross-claim fraud triage, policy verification, and examiner adjudication.",
  keywords: [
    "insurance",
    "claims",
    "AI",
    "Ethiopia",
    "motor claims",
    "fraud detection",
    "computer vision",
    "damage assessment",
  ],
  authors: [{ name: "EthioClaim Engineering" }],
  openGraph: {
    title: "EthioClaim Pro — AI-Powered Claims Intelligence",
    description: "Next-generation motor claims intelligence for Ethiopian insurers",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-[#0A84FF]/25 selection:text-[#64D2FF]">
        {children}
      </body>
    </html>
  );
}
