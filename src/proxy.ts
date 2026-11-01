import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const locales = ["et", "ru", "en"];
const defaultLocale = "et";

function preferredLocale(req: NextRequest): string {
  const saved = req.cookies.get("lang")?.value;
  if (saved && locales.includes(saved)) return saved;
  // Default is Estonian; Russian/English only when the browser clearly prefers them.
  const header = req.headers.get("accept-language") ?? "";
  const first = header.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  return first && locales.includes(first) ? first : defaultLocale;
}

async function refreshAdminSession(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => res.headers.set(k, v));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const path = req.nextUrl.pathname;
  const isPublicAdminPath = path === "/admin/login" || path.startsWith("/admin/action/");
  if (!data?.claims && !isPublicAdminPath) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = path === "/admin" ? "" : `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return refreshAdminSession(req);
  }

  const first = pathname.split("/")[1];
  if (locales.includes(first)) return NextResponse.next();

  // No locale in the URL: redirect to /et/..., /ru/..., /en/...
  const url = req.nextUrl.clone();
  url.pathname = `/${preferredLocale(req)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, Next internals and files with an extension (images, robots.txt, sitemap.xml...).
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[\\w]+$).*)"],
};
