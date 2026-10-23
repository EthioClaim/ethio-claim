import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s | EthioClaim", default: "EthioClaim — AI-Powered Claims Intelligence" },
  description: "EthioClaim: Motor claims intelligence platform for Ethiopian insurers. AI-powered damage detection, fraud triage, and evidence analysis.",
  keywords: ["insurance", "claims", "AI", "Ethiopia", "motor claims", "fraud detection"],
  authors: [{ name: "EthioClaim Team" }],
  openGraph: {
    title: "EthioClaim — AI-Powered Claims Intelligence",
    description: "Motor claims intelligence for Ethiopian insurers",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

