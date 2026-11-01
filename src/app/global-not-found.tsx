import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "404", robots: { index: false } };

// Unmatched URLs outside /et, /ru, /en (the proxy redirects most of those).
export default function GlobalNotFound() {
  return (
    <html lang="et">
      <body className="grid min-h-dvh place-items-center p-6 font-sans">
        <div>
          <p className="font-mono text-6xl text-accent">404</p>
          <p className="mt-4 text-xl">Lehte ei leitud · Страница не найдена · Page not found</p>
          <a href="/et" className="btn btn-primary mt-8">
            Avalehele
          </a>
        </div>
      </body>
    </html>
  );
}
