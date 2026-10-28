"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { siteConfig, type Lang } from "@/config/site";
import { getAdminDictionary, type AdminDictionary } from "@/i18n/admin";
import { t } from "@/i18n/config";

type Ctx = { lang: Lang; d: AdminDictionary; setLang: (l: Lang) => void; t: typeof t };

const AdminI18nContext = createContext<Ctx | null>(null);
const KEY = "admin_lang";

export function AdminI18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(siteConfig.adminLang);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      // Restores a browser-only preference after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "et" || saved === "ru" || saved === "en") setLangState(saved);
    } catch {
      // storage unavailable — keep default
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, d: getAdminDictionary(lang), setLang, t }), [lang, setLang]);
  return <AdminI18nContext value={value}>{children}</AdminI18nContext>;
}

export function useAdmin(): Ctx {
  const ctx = useContext(AdminI18nContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminI18nProvider");
  return ctx;
}
