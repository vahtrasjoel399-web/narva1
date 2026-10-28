-- ═══════════════════════════════════════════════════════════════════════════
--  Auto shop booking — initial schema
--  Run with `supabase db push` or paste into Supabase → SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists extensions;
-- btree_gist lets us forbid overlapping slots in the same bay.
create extension if not exists btree_gist with schema extensions;

-- ─── Types ──────────────────────────────────────────────────────────────────
do $$ begin
  create type public.slot_status as enum ('free', 'booked', 'blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status as enum ('new', 'confirmed', 'done', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

-- ─── Tables ─────────────────────────────────────────────────────────────────
create table if not exists public.services (
  id           text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  name         jsonb not null,                    -- {"et": "...", "ru": "...", "en": "..."}
  description  jsonb not null default '{}'::jsonb,
  icon         text not null default 'wrench',
  duration_min int not null check (duration_min between 5 and 1440),
  price_from   numeric(10, 2) not null default 0 check (price_from >= 0),
  sort         int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create sequence if not exists public.booking_number_seq start 1001;

create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  number         bigint not null unique default nextval('public.booking_number_seq'),
  service_ids    text[] not null check (cardinality(service_ids) > 0),
  slot_ids       uuid[] not null default '{}',
  -- Denormalised visit time, kept even after slots are released.
  date           date not null,
  start_time     time not null,
  end_time       time not null,
  duration_min   int not null,
  status         public.booking_status not null default 'new',
  customer_name  text not null check (char_length(customer_name) between 1 and 120),
  phone          text not null check (char_length(phone) between 5 and 40),
  email          text check (email is null or char_length(email) <= 200),
  car_make       text not null check (char_length(car_make) <= 60),
  car_model      text not null check (char_length(car_model) <= 60),
  car_year       int check (car_year is null or car_year between 1900 and 2100),
  plate          text check (plate is null or char_length(plate) <= 20),
  comment        text check (comment is null or char_length(comment) <= 2000),
  lang           text not null default 'et' check (lang in ('et', 'ru', 'en')),
  manage_token   text not null unique,
  seen_by_admin  boolean not null default false,
  source         text not null default 'web' check (source in ('web', 'admin')),
  admin_notes    text,
  cancelled_by   text check (cancelled_by in ('client', 'admin')),
  cancelled_at   timestamptz,
  confirmed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.slots (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  start_time  time not null,
  end_time    time not null,
  bay         smallint not null default 1 check (bay between 1 and 20),
  status      public.slot_status not null default 'free',
  booking_id  uuid references public.bookings (id) on delete restrict,
  created_at  timestamptz not null default now(),
  constraint slots_time_order check (end_time > start_time),
  constraint slots_booking_consistency check ((status = 'booked') = (booking_id is not null)),
  -- Two slots in the same bay can never overlap.
  constraint slots_no_overlap exclude using gist (
    bay with =,
    tsrange(date + start_time, date + end_time) with &&
  )
);

create table if not exists public.callback_requests (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 1 and 120),
  phone          text not null check (char_length(phone) between 5 and 40),
  comment        text check (comment is null or char_length(comment) <= 2000),
  lang           text not null default 'et' check (lang in ('et', 'ru', 'en')),
  status         text not null default 'new' check (status in ('new', 'done')),
  seen_by_admin  boolean not null default false,
  created_at     timestamptz not null default now()
);

create table if not exists public.notification_log (
  id            bigint generated always as identity primary key,
  event         text not null,      -- booking_created, booking_cancelled, callback_created, client_*, test
  booking_id    uuid references public.bookings (id) on delete set null,
  callback_id   uuid references public.callback_requests (id) on delete set null,
  recipient     text,
  subject       text,
  status        text not null check (status in ('sent', 'failed', 'skipped')),
  error         text,
  attempts      int not null default 1,
  acknowledged  boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.settings (
  id             int primary key default 1 check (id = 1),
  notify_emails  text[] not null default '{}',
  notify_lang    text not null default 'ru' check (notify_lang in ('et', 'ru', 'en')),
  updated_at     timestamptz not null default now()
);

-- Who may use /admin. Add the owner's email after creating the user in Supabase Auth.
create table if not exists public.admins (
  email       text primary key,
  created_at  timestamptz not null default now()
);

-- One-time Confirm / Decline links from admin emails. Only a SHA-256 hash is stored.
create table if not exists public.action_tokens (
  token_hash  text primary key,
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  action      text not null check (action in ('confirm', 'decline')),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  count         int not null default 0,
  primary key (key, window_start)
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists slots_date_status_idx on public.slots (date, status);
create index if not exists slots_booking_idx on public.slots (booking_id);
create index if not exists bookings_date_idx on public.bookings (date);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_created_idx on public.bookings (created_at desc);
create index if not exists bookings_unseen_idx on public.bookings (seen_by_admin) where not seen_by_admin;
create index if not exists notification_log_failed_idx on public.notification_log (created_at desc)
  where status = 'failed' and not acknowledged;
create index if not exists action_tokens_booking_idx on public.action_tokens (booking_id);

-- ─── updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists services_touch on public.services;
create trigger services_touch before update on public.services
  for each row execute function public.touch_updated_at();
drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- ─── Admin check (used by RLS) ──────────────────────────────────────────────
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  Booking logic — every write that touches slots is a single transaction.
-- ═══════════════════════════════════════════════════════════════════════════

-- Lock a chain of consecutive free slots in one bay. Returns null if impossible.
-- Rows are always locked in (bay, start_time) order, so concurrent callers
-- cannot deadlock; a second caller waits on the row lock and then sees the
-- slot as 'booked'.
create or replace function public._lock_slot_chain(p_date date, p_start time, p_duration int)
returns uuid[]
language plpgsql set search_path = public as $$
declare
  v_bay    smallint;
  v_slot   public.slots;
  v_ids    uuid[];
  v_total  int;
  v_cursor time;
begin
  for v_bay in
    select distinct s.bay from public.slots s
    where s.date = p_date and s.start_time = p_start and s.status = 'free'
    order by s.bay
  loop
    v_ids := '{}';
    v_total := 0;
    v_cursor := p_start;
    loop
      select * into v_slot from public.slots
      where date = p_date and bay = v_bay and start_time = v_cursor
      for update;
      exit when not found or v_slot.status <> 'free';
      v_ids := v_ids || v_slot.id;
      v_total := v_total + (extract(epoch from (v_slot.end_time - v_slot.start_time)) / 60)::int;
      v_cursor := v_slot.end_time;
      exit when v_total >= p_duration;
    end loop;
    if v_total >= p_duration then
      return v_ids;
    end if;
  end loop;
  return null;
end $$;

-- Create a booking atomically.
-- p: { date, start_time, service_ids[], customer_name, phone, email, car_make, car_model,
--      car_year, plate, comment, lang, manage_token, source, timezone, min_lead_minutes, allow_past }
create or replace function public.create_booking(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_date        date := (p ->> 'date')::date;
  v_start       time := (p ->> 'start_time')::time;
  v_service_ids text[] := array(select distinct jsonb_array_elements_text(p -> 'service_ids'));
  v_tz          text := coalesce(nullif(p ->> 'timezone', ''), 'Europe/Tallinn');
  v_lead        int := coalesce((p ->> 'min_lead_minutes')::int, 0);
  v_allow_past  boolean := coalesce((p ->> 'allow_past')::boolean, false);
  v_duration    int;
  v_found       int;
  v_ids         uuid[];
  v_end         time;
  v_booking     public.bookings;
begin
  select coalesce(sum(duration_min), 0), count(*) into v_duration, v_found
  from public.services where id = any (v_service_ids) and active;

  if v_found = 0 or v_found <> cardinality(v_service_ids) then
    return jsonb_build_object('ok', false, 'error', 'invalid_service');
  end if;

  if not v_allow_past
     and (v_date + v_start) < (now() at time zone v_tz) + make_interval(mins => v_lead) then
    return jsonb_build_object('ok', false, 'error', 'too_soon');
  end if;

  v_ids := public._lock_slot_chain(v_date, v_start, v_duration);
  if v_ids is null or cardinality(v_ids) = 0 then
    return jsonb_build_object('ok', false, 'error', 'slot_taken');
  end if;

  select max(end_time) into v_end from public.slots where id = any (v_ids);

  insert into public.bookings (
    service_ids, slot_ids, date, start_time, end_time, duration_min,
    customer_name, phone, email, car_make, car_model, car_year, plate, comment,
    lang, manage_token, source, seen_by_admin
  ) values (
    v_service_ids, v_ids, v_date, v_start, v_end, v_duration,
    trim(p ->> 'customer_name'), trim(p ->> 'phone'), nullif(trim(p ->> 'email'), ''),
    trim(p ->> 'car_make'), trim(p ->> 'car_model'), nullif(p ->> 'car_year', '')::int,
    nullif(upper(trim(p ->> 'plate')), ''), nullif(trim(p ->> 'comment'), ''),
    coalesce(p ->> 'lang', 'et'), p ->> 'manage_token', coalesce(p ->> 'source', 'web'),
    coalesce(p ->> 'source', 'web') = 'admin'
  ) returning * into v_booking;

  update public.slots set status = 'booked', booking_id = v_booking.id where id = any (v_ids);

  return jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
end $$;

-- Release a booking's slots (internal).
create or replace function public._release_slots(p_booking_id uuid) returns void
language sql set search_path = public as $$
  update public.slots set status = 'free', booking_id = null where booking_id = p_booking_id;
$$;

-- Customer cancellation through the secure manage link.
create or replace function public.cancel_booking_by_token(p_token text, p_min_hours int, p_timezone text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings;
begin
  if p_token is null or char_length(p_token) < 20 then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_booking from public.bookings where manage_token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_booking.status not in ('new', 'confirmed') then
    return jsonb_build_object('ok', false, 'error', 'not_cancellable', 'booking', to_jsonb(v_booking));
  end if;

  if (v_booking.date + v_booking.start_time)
       < (now() at time zone coalesce(p_timezone, 'Europe/Tallinn')) + make_interval(hours => p_min_hours) then
    return jsonb_build_object('ok', false, 'error', 'too_late', 'booking', to_jsonb(v_booking));
  end if;

  perform public._release_slots(v_booking.id);

  update public.bookings
     set status = 'cancelled', cancelled_by = 'client', cancelled_at = now(), seen_by_admin = false
   where id = v_booking.id
  returning * into v_booking;

  update public.action_tokens set used_at = now() where booking_id = v_booking.id and used_at is null;

  return jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
end $$;

-- Admin status change (from the panel). Cancelling frees future slots.
create or replace function public.admin_set_booking_status(p_id uuid, p_status public.booking_status)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings;
  v_prev    public.booking_status;
begin
  select * into v_booking from public.bookings where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  v_prev := v_booking.status;

  if v_prev = p_status then
    return jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking), 'previous', v_prev);
  end if;
  if v_prev = 'cancelled' then
    -- Its slots may already be re-booked by someone else.
    return jsonb_build_object('ok', false, 'error', 'already_cancelled');
  end if;

  if p_status = 'cancelled' then
    perform public._release_slots(v_booking.id);
    update public.action_tokens set used_at = now() where booking_id = v_booking.id and used_at is null;
  end if;

  update public.bookings
     set status = p_status,
         confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
         cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
         cancelled_by = case when p_status = 'cancelled' then 'admin' else cancelled_by end,
         seen_by_admin = true
   where id = v_booking.id
  returning * into v_booking;

  return jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking), 'previous', v_prev);
end $$;

-- Store a pair of one-time action tokens (hashes) for the admin email.
create or replace function public.create_action_tokens(p_booking_id uuid, p_confirm_hash text, p_decline_hash text, p_ttl_hours int)
returns void
language sql security definer set search_path = public as $$
  insert into public.action_tokens (token_hash, booking_id, action, expires_at) values
    (p_confirm_hash, p_booking_id, 'confirm', now() + make_interval(hours => p_ttl_hours)),
    (p_decline_hash, p_booking_id, 'decline', now() + make_interval(hours => p_ttl_hours));
$$;

-- Look up an action token without using it (for the confirmation page).
create or replace function public.get_action_token(p_token_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_token   public.action_tokens;
  v_booking public.bookings;
begin
  select * into v_token from public.action_tokens where token_hash = p_token_hash;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select * into v_booking from public.bookings where id = v_token.booking_id;
  return jsonb_build_object(
    'ok', true,
    'action', v_token.action,
    'used', v_token.used_at is not null,
    'expired', v_token.expires_at < now(),
    'booking', to_jsonb(v_booking)
  );
end $$;

-- Use a one-time action token: confirm or decline the booking.
create or replace function public.use_action_token(p_token_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_token   public.action_tokens;
  v_booking public.bookings;
begin
  select * into v_token from public.action_tokens where token_hash = p_token_hash for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_token.used_at is not null then
    return jsonb_build_object('ok', false, 'error', 'used');
  end if;
  if v_token.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select * into v_booking from public.bookings where id = v_token.booking_id for update;

  -- Both links of the pair stop working once one is used.
  update public.action_tokens set used_at = now() where booking_id = v_booking.id and used_at is null;

  if v_token.action = 'confirm' then
    if v_booking.status <> 'new' then
      return jsonb_build_object('ok', false, 'error', 'not_applicable', 'booking', to_jsonb(v_booking));
    end if;
    update public.bookings set status = 'confirmed', confirmed_at = now(), seen_by_admin = true
     where id = v_booking.id returning * into v_booking;
  else
    if v_booking.status not in ('new', 'confirmed') then
      return jsonb_build_object('ok', false, 'error', 'not_applicable', 'booking', to_jsonb(v_booking));
    end if;
    perform public._release_slots(v_booking.id);
    update public.bookings
       set status = 'cancelled', cancelled_by = 'admin', cancelled_at = now(), seen_by_admin = true
     where id = v_booking.id returning * into v_booking;
  end if;

  return jsonb_build_object('ok', true, 'action', v_token.action, 'booking', to_jsonb(v_booking));
end $$;

-- Admin: create many slots at once. Slots that would overlap an existing slot
-- in the same bay are skipped. p_slots: [{date, start_time, end_time, bay}]
create or replace function public.admin_create_slots(p_slots jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_item    jsonb;
  v_created int := 0;
  v_skipped int := 0;
  v_rows    int;
begin
  for v_item in select * from jsonb_array_elements(p_slots) loop
    insert into public.slots (date, start_time, end_time, bay)
    values ((v_item ->> 'date')::date, (v_item ->> 'start_time')::time, (v_item ->> 'end_time')::time,
            coalesce((v_item ->> 'bay')::smallint, 1))
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then v_created := v_created + 1; else v_skipped := v_skipped + 1; end if;
  end loop;
  return jsonb_build_object('created', v_created, 'skipped', v_skipped);
end $$;

-- Fixed-window rate limiter. Returns true when the call is allowed.
create or replace function public.hit_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count  int;
begin
  insert into public.rate_limits (key, window_start, count) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;

  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_limit;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
--  Row Level Security
--  Public (anon): read active services and FREE slots (date/time only).
--  Bookings are created only through the server route (service role).
--  Everything else: admins only.
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.services          enable row level security;
alter table public.slots             enable row level security;
alter table public.bookings          enable row level security;
alter table public.callback_requests enable row level security;
alter table public.notification_log  enable row level security;
alter table public.settings          enable row level security;
alter table public.admins            enable row level security;
alter table public.action_tokens     enable row level security;
alter table public.rate_limits       enable row level security;

-- services
drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  for select to anon, authenticated using (active or public.is_admin());
drop policy if exists services_admin_write on public.services;
create policy services_admin_write on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- slots: public sees free slots only, and only date/time columns.
revoke all on public.slots from anon;
grant select (date, start_time, end_time, bay, status) on public.slots to anon;
drop policy if exists slots_public_free on public.slots;
create policy slots_public_free on public.slots
  for select to anon using (status = 'free');
drop policy if exists slots_admin_all on public.slots;
create policy slots_admin_all on public.slots
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- admin-only tables
do $$
declare t text;
begin
  foreach t in array array['bookings', 'callback_requests', 'notification_log', 'settings', 'admins'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_all', t);
  end loop;
end $$;

-- internal tables: service role only (no policies at all)
revoke all on public.action_tokens from anon, authenticated;
revoke all on public.rate_limits from anon, authenticated;
revoke all on sequence public.booking_number_seq from anon;

-- Functions: only the server (service role) may call the booking functions.
revoke execute on function public.create_booking(jsonb) from public, anon, authenticated;
revoke execute on function public.cancel_booking_by_token(text, int, text) from public, anon, authenticated;
revoke execute on function public.admin_set_booking_status(uuid, public.booking_status) from public, anon, authenticated;
revoke execute on function public.create_action_tokens(uuid, text, text, int) from public, anon, authenticated;
revoke execute on function public.get_action_token(text) from public, anon, authenticated;
revoke execute on function public.use_action_token(text) from public, anon, authenticated;
revoke execute on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
revoke execute on function public.admin_create_slots(jsonb) from public, anon, authenticated;
revoke execute on function public._lock_slot_chain(date, time, int) from public, anon, authenticated;
revoke execute on function public._release_slots(uuid) from public, anon, authenticated;

grant execute on function public.create_booking(jsonb) to service_role;
grant execute on function public.cancel_booking_by_token(text, int, text) to service_role;
grant execute on function public.admin_set_booking_status(uuid, public.booking_status) to service_role;
grant execute on function public.create_action_tokens(uuid, text, text, int) to service_role;
grant execute on function public.get_action_token(text) to service_role;
grant execute on function public.use_action_token(text) to service_role;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
grant execute on function public.admin_create_slots(jsonb) to service_role;
grant execute on function public._lock_slot_chain(date, time, int) to service_role;
grant execute on function public._release_slots(uuid) to service_role;

insert into public.settings (id) values (1) on conflict (id) do nothing;
