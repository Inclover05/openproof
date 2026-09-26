import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenProof — Follow the evidence",
  description: "Check public promises against their sources and on-chain facts.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

