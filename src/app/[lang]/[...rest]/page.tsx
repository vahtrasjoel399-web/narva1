import { notFound } from "next/navigation";

/** Any unknown path under a language renders the localized 404 inside the site layout. */
export default function CatchAll() {
  notFound();
}
