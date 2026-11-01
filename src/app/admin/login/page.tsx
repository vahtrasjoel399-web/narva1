import { siteConfig } from "@/config/site";
import { adminDict } from "@/lib/auth";
import { LoginForm } from "@/components/admin/login-form";

export const metadata = { title: "Login" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { t } = await adminDict();
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/admin") ? sp.next : "/admin";
  return (
    <main className="grid min-h-dvh place-items-center p-5">
      <div className="w-full max-w-sm">
        <p className="eyebrow">{siteConfig.name}</p>
        <h1 className="mt-2 text-3xl font-bold">{t.login.title}</h1>
        <LoginForm t={t.login} next={next} />
      </div>
    </main>
  );
}
