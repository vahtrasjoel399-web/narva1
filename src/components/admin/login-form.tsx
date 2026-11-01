"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { AdminDictionary } from "@/i18n/admin";

export function LoginForm({ t, next }: { t: AdminDictionary["login"]; next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    if (error) {
      setError(t.error);
      setBusy(false);
      return;
    }
    // Full navigation so the server sees the new session cookie.
    window.location.assign(next);
  };

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="field-label">
          {t.email}
        </label>
        <input id="email" type="email" autoComplete="username" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          {t.password}
        </label>
        <input id="password" type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {t.submit}
      </button>
    </form>
  );
}
