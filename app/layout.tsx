import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Linkme | Shorten, Share, Track",
  description:
    "Linkme helps you create short links fast with clean analytics and premium features when you grow.",
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
