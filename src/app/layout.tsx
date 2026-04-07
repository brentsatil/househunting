import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NestTogether — Find Your Home Together",
  description:
    "A shared property search coordination app for couples navigating the Australian rental or buying market.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
