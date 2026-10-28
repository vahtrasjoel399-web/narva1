"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { siteConfig, type Lang } from "@/config/site";
import { localeShort, locales } from "@/i18n/config";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { LogoMark } from "@/components/icons";
import { getAdminSession } from "@/app/admin/actions";
import { useAdmin } from "./AdminI18n";
import { Spinner } from "./ui";

export function LoginForm() {
  const { d, lang, setLang } = useAdmin();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createBrowserSupabase();
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      setError(d.login.error);
      setBusy(false);
      return;
    }
    const session = await getAdminSession();
    if (!session.ok) {
      await supabase.auth.signOut();
      setError(session.error === "forbidden" ? d.login.notAdmin : d.login.error);
      setBusy(false);
      return;
    }
    const next = params.get("next");
    router.replace(next && next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="card w-full max-w-sm p-6 animate-fade-up" noValidate>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2.5 font-display text-lg font-extrabold text-white">
          <LogoMark /> {siteConfig.name}
        </span>
        <div className="flex rounded-xl border border-ink-700 p-0.5">
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l as Lang)}
              aria-pressed={l === lang}
              className={`rounded-[10px] px-2 py-1 text-xs font-bold ${l === lang ? "bg-ink-700 text-white" : "text-ink-400"}`}
            >
              {localeShort[l]}
            </button>
          ))}
        </div>
      </div>
      <h1 className="mt-6 text-2xl font-extrabold text-white">{d.login.title}</h1>
      <label className="mt-5 block">
        <span className="field-label">{d.login.email}</span>
        <input
          className="input"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="mt-4 block">
        <span className="field-label">{d.login.password}</span>
        <input
          className="input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p className="field-error mt-3" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy || !email || !password}>
        {busy ? <Spinner /> : <LogIn size={18} aria-hidden="true" />} {d.login.submit}
      </button>
    </form>
  );
}
