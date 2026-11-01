/**
 * Creates (or promotes) an admin user.
 *   npm run admin:create -- owner@example.ee 'a-long-password'
 */
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: npm run admin:create -- <email> <password>");
  process.exit(1);
}
if (password.length < 10) {
  console.error("Use a password with at least 10 characters.");
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function main() {
  let userId: string | undefined;
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.data.user) {
    userId = created.data.user.id;
    console.log(`user created: ${email}`);
  } else {
    // Already exists: find it and reset the password.
    for (let page = 1; !userId && page < 50; page++) {
      const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
      userId = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
      if (!data.users.length) break;
    }
    if (!userId) throw created.error ?? new Error("Could not create or find user");
    await db.auth.admin.updateUserById(userId, { password });
    console.log(`user exists, password updated: ${email}`);
  }
  const { error } = await db.from("admin_users").upsert({ user_id: userId });
  if (error) throw error;
  console.log("admin access granted");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
