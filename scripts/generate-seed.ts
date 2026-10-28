/**
 * Regenerates supabase/seed.sql from src/config/site.ts.
 *   npm run db:seed
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { siteConfig } from "../src/config/site";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const json = (o: unknown) => `${q(JSON.stringify(o))}::jsonb`;

const services = siteConfig.services
  .map(
    (s, i) =>
      `  (${q(s.id)}, ${json(s.name)}, ${json(s.description)}, ${q(s.icon)}, ${s.durationMin}, ${s.priceFrom}, ${(i + 1) * 10})`,
  )
  .join(",\n");

const sql = `-- ═══════════════════════════════════════════════════════════════════════════
--  Seed data — GENERATED from src/config/site.ts by \`npm run db:seed\`.
--  Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════

-- Services
insert into public.services (id, name, description, icon, duration_min, price_from, sort) values
${services}
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  duration_min = excluded.duration_min,
  price_from = excluded.price_from,
  sort = excluded.sort;

-- Settings (notification language)
insert into public.settings (id, notify_lang) values (1, ${q(siteConfig.adminLang)})
on conflict (id) do nothing;

-- Example slots for the next 2 weeks (shop local time):
--   Mon–Fri 09:00–17:00, 60 min, lunch 12:00–13:00, 2 parallel bays
--   Sat     09:00–13:00, 60 min, 1 bay
with days as (
  select d::date as date
  from generate_series(
    (now() at time zone ${q(siteConfig.timezone)})::date + 1,
    (now() at time zone ${q(siteConfig.timezone)})::date + 14,
    interval '1 day'
  ) d
),
weekday_slots as (
  select days.date, (time '09:00' + make_interval(hours => h)) as start_time, bay
  from days
  cross join generate_series(0, 7) h
  cross join generate_series(1, 2) bay
  where extract(isodow from days.date) between 1 and 5
    and h <> 3 -- lunch break 12:00–13:00
),
saturday_slots as (
  select days.date, (time '09:00' + make_interval(hours => h)) as start_time, 1 as bay
  from days
  cross join generate_series(0, 3) h
  where extract(isodow from days.date) = 6
)
insert into public.slots (date, start_time, end_time, bay)
select date, start_time, start_time + interval '60 minutes', bay
from (select * from weekday_slots union all select * from saturday_slots) s
on conflict do nothing;

-- Admin access: after creating the owner in Supabase → Authentication → Users, run:
--   insert into public.admins (email) values ('owner@example.ee');
`;

const out = join(process.cwd(), "supabase", "seed.sql");
writeFileSync(out, sql);
console.log(`Wrote ${out}`);
