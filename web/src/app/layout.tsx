import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { MeProvider } from "@/components/MeProvider";

// next/font downloads the fonts at build time and serves them from this site,
// so visitors' browsers never contact Google (no IP transfer to Google Fonts).
const serif = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"], weight: ["500", "600"], display: "swap", variable: "--font-serif",
});
const sans = Inter({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://cosmictriad.com"),
  title: { default: "Cosmic Triad · your reading, in one step", template: "%s · Cosmic Triad" },
  description: "Cosmic Triad: a personal daily reading from three systems, the Western zodiac, the Chinese horoscope and numerology, in Romanian and English.",
  applicationName: "Cosmic Triad",
  openGraph: { siteName: "Cosmic Triad", type: "website" },
};

export const viewport: Viewport = { themeColor: "#0F1424", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <MeProvider>{children}</MeProvider>
      </body>
    </html>
  );
}
