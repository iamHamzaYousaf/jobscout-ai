import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobScout AI",
  description: "Autonomous career agent for CV-driven job discovery",
};

/**
 * Root layout wrapping all App Router pages.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
