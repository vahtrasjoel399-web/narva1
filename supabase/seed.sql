-- ═══════════════════════════════════════════════════════════════════════════
--  Seed data — GENERATED from src/config/site.ts by `npm run db:seed`.
--  Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════

-- Services
insert into public.services (id, name, description, icon, duration_min, price_from, sort) values
  ('oil-change', '{"et":"Õlivahetus","ru":"Замена масла","en":"Oil change"}'::jsonb, '{"et":"Mootoriõli ja filtrite vahetus tootja nõuete järgi, hooldusvälbade nullimine ja kiire üldkontroll.","ru":"Замена моторного масла и фильтров по нормам производителя, сброс сервисного интервала и быстрая общая проверка.","en":"Engine oil and filter change to manufacturer spec, service interval reset and a quick overall check."}'::jsonb, 'oil', 45, 39, 10),
  ('diagnostics', '{"et":"Diagnostika","ru":"Диагностика","en":"Diagnostics"}'::jsonb, '{"et":"Arvutidiagnostika kõikidele süsteemidele, veakoodide lugemine ja selge selgitus, mida on vaja teha.","ru":"Компьютерная диагностика всех систем, чтение кодов ошибок и понятное объяснение, что нужно сделать.","en":"Computer diagnostics for all systems, fault code reading and a clear explanation of what needs to be done."}'::jsonb, 'diagnostics', 60, 35, 20),
  ('brakes', '{"et":"Pidurid","ru":"Тормоза","en":"Brakes"}'::jsonb, '{"et":"Piduriklotside, ketaste ja pidurivedeliku vahetus, pidurisüsteemi kontroll ja hooldus.","ru":"Замена колодок, дисков и тормозной жидкости, проверка и обслуживание тормозной системы.","en":"Pads, discs and brake fluid replacement, brake system inspection and service."}'::jsonb, 'brakes', 120, 59, 30),
  ('suspension', '{"et":"Veermik","ru":"Подвеска","en":"Suspension"}'::jsonb, '{"et":"Amortisaatorite, hoobade, otste ja laagrite kontroll ning vahetus. Kõrvaldame koputused ja vibratsiooni.","ru":"Проверка и замена амортизаторов, рычагов, наконечников и подшипников. Устраняем стуки и вибрации.","en":"Shock absorbers, control arms, tie rods and bearings checked and replaced. We fix knocks and vibrations."}'::jsonb, 'suspension', 120, 69, 40),
  ('tyres-alignment', '{"et":"Rehvid ja sillutus","ru":"Шины и развал-схождение","en":"Tyres & wheel alignment"}'::jsonb, '{"et":"Rehvivahetus, tasakaalustamine ja 3D-sillutus. Hoiame rehvid ka hooajaks.","ru":"Шиномонтаж, балансировка и 3D развал-схождение. Сезонное хранение шин.","en":"Tyre fitting, balancing and 3D wheel alignment. Seasonal tyre storage available."}'::jsonb, 'tyres', 60, 25, 50),
  ('air-conditioning', '{"et":"Kliimaseade","ru":"Кондиционер","en":"Air conditioning"}'::jsonb, '{"et":"Kliimaseadme täitmine, lekketest, desinfitseerimine ja salongifiltri vahetus.","ru":"Заправка кондиционера, проверка на утечки, дезинфекция и замена салонного фильтра.","en":"A/C recharge, leak test, disinfection and cabin filter replacement."}'::jsonb, 'aircon', 60, 49, 60),
  ('engine-repair', '{"et":"Mootoriremont","ru":"Ремонт двигателя","en":"Engine repair"}'::jsonb, '{"et":"Hammasrihmad, tihendid, sissepritse ja suuremad mootoritööd. Hind selgub pärast diagnostikat.","ru":"ГРМ, прокладки, впрыск и капитальные работы по двигателю. Точная цена после диагностики.","en":"Timing belts, gaskets, injection and major engine work. Exact price after diagnostics."}'::jsonb, 'engine', 240, 89, 70),
  ('pre-inspection', '{"et":"Ülevaatuse eelkontroll","ru":"Проверка перед техосмотром","en":"Pre-inspection check"}'::jsonb, '{"et":"Kontrollime kõik ülevaatusel kontrollitavad punktid ja parandame puudused enne ülevaatust.","ru":"Проверяем все пункты техосмотра (ülevaatus) и устраняем недостатки заранее.","en":"We check every item of the Estonian roadworthiness test (ülevaatus) and fix issues before you go."}'::jsonb, 'inspection', 60, 29, 80),
  ('electrical', '{"et":"Autoelekter","ru":"Автоэлектрика","en":"Electrical"}'::jsonb, '{"et":"Aku, generaator, starter, tuled ja juhtmestik. Leiame ka keerulised elektrivead.","ru":"Аккумулятор, генератор, стартер, свет и проводка. Находим даже сложные неисправности.","en":"Battery, alternator, starter, lights and wiring. We track down tricky electrical faults too."}'::jsonb, 'electrical', 60, 39, 90)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  duration_min = excluded.duration_min,
  price_from = excluded.price_from,
  sort = excluded.sort;

-- Settings (notification language)
insert into public.settings (id, notify_lang) values (1, 'ru')
on conflict (id) do nothing;

-- Example slots for the next 2 weeks (shop local time):
--   Mon–Fri 09:00–17:00, 60 min, lunch 12:00–13:00, 2 parallel bays
--   Sat     09:00–13:00, 60 min, 1 bay
with days as (
  select d::date as date
  from generate_series(
    (now() at time zone 'Europe/Tallinn')::date + 1,
    (now() at time zone 'Europe/Tallinn')::date + 14,
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
