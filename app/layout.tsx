import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://urlsy.co"),
  title: {
    default: "urlsy.co | Shorten, Share, Track",
    template: "%s | urlsy.co",
  },
  description:
    "urlsy.co helps you create short links fast with clean analytics and premium features when you grow.",
  alternates: {
    canonical: "https://urlsy.co",
  },
  openGraph: {
    title: "urlsy.co | Shorten, Share, Track",
    description:
      "urlsy.co helps you create short links fast with clean analytics and premium features when you grow.",
    url: "https://urlsy.co",
    siteName: "urlsy.co",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "urlsy.co — Shorten, Share, Track",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "urlsy.co | Shorten, Share, Track",
    description:
      "urlsy.co helps you create short links fast with clean analytics and premium features when you grow.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
