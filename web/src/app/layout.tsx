import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import "./account.css";

// next/font downloads the fonts at build time and serves them from this site,
// so visitors' browsers never contact Google (no IP transfer to Google Fonts).
const serif = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], style: ["normal", "italic"],
  display: "swap", variable: "--font-serif",
});
const sans = Source_Sans_3({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Astro — is today a good day?",
  description: "Western astrology, the Chinese almanac and numerology, read together for your day.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
