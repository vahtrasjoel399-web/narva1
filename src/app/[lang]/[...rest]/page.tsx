import { notFound } from "next/navigation";

// Any unknown path under /et, /ru, /en renders the localized 404.
export default function CatchAll() {
  notFound();
}
