import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const LOCALES = ["et", "ru", "en"] as const;
const DEFAULT_LOCALE = "et";
export const LOCALE_COOKIE = "NEXT_LOCALE";

function pickLocale(request: NextRequest): string {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (saved && (LOCALES as readonly string[]).includes(saved)) return saved;
  const header = request.headers.get("accept-language") ?? "";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().slice(0, 2), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.find((r) => (LOCALES as readonly string[]).includes(r.lang))?.lang ?? DEFAULT_LOCALE;
}

/** Refresh the Supabase session cookie and gate /admin pages. */
async function adminProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicAdminPage = pathname === "/admin/login" || pathname.startsWith("/admin/a/");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicAdminPage) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return adminProxy(request);

  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals and files with an extension.
    "/((?!api|_next|.*\\..*).*)",
  ],
};
