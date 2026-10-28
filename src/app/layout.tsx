import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Для тебя ♥",
  description: "Мне нужно тебе кое-что сказать",
};

export const viewport: Viewport = {
  themeColor: "#120914",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${serif.variable} ${sans.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
