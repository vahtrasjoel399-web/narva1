/**
 * Copies services from src/config/site.ts into the database and creates
 * example slots for the next 2 weeks (Mon–Fri 09–17 with lunch, Sat 10–14).
 *   npm run db:seed            # services + example slots
 *   npm run db:seed -- --services-only
 */
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "../src/config/site";
import { datesForWeekdays, generateSlots } from "../src/lib/slots";
import { addDays, todayInTz } from "../src/lib/time";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
const db = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const services = siteConfig.services.map((s, i) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    duration_min: s.durationMin,
    price_from: s.priceFrom,
    sort: i * 10,
    active: true,
  }));
  const { error } = await db.from("services").upsert(services);
  if (error) throw error;
  console.log(`services: ${services.length} upserted`);

  if (process.argv.includes("--services-only")) return;

  const tomorrow = addDays(todayInTz(siteConfig.booking.timezone), 1);
  const weekdays = generateSlots({ dates: datesForWeekdays(tomorrow, 2, [1, 2, 3, 4, 5]), start: "09:00", end: "17:00", length: 60, parallel: 2, lunchStart: "12:00", lunchEnd: "13:00" });
  const saturdays = generateSlots({ dates: datesForWeekdays(tomorrow, 2, [6]), start: "10:00", end: "14:00", length: 60, parallel: 1 });
  const { data, error: e2 } = await db.rpc("admin_add_slots", { p_slots: [...weekdays, ...saturdays] });
  if (e2) throw e2;
  console.log(`slots: ${data} created (${weekdays.length + saturdays.length - Number(data)} already existed)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
