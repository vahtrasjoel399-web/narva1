import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { siteConfig } from "@/config/site";
import { AdminI18nProvider } from "@/components/admin/AdminI18n";
import { ToastProvider } from "@/components/admin/ui";

const body = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: `Admin · ${siteConfig.name}`, template: `%s · Admin · ${siteConfig.name}` },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b0d10", colorScheme: "dark" };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang={siteConfig.adminLang} className={body.variable}>
      <body className="min-h-dvh antialiased">
        <AdminI18nProvider>
          <ToastProvider>{children}</ToastProvider>
        </AdminI18nProvider>
      </body>
    </html>
  );
}
