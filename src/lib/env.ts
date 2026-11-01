import "server-only";

/** Server-side environment. Public values are read directly via process.env.NEXT_PUBLIC_*. */
export const serverEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Booking <onboarding@resend.dev>",
  emailReplyTo: process.env.EMAIL_REPLY_TO ?? "",
  notifyEmails: (process.env.NOTIFY_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // Dev only: write emails as HTML files to ./.outbox instead of sending them.
  emailOutbox: process.env.EMAIL_DEV_OUTBOX === "1",
};
