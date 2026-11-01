-- Auto shop booking schema.
-- Slots are published by the admin. Customers can only book free slots.
-- Every write that matters goes through a SECURITY DEFINER function that
-- only the service role (our server) may call.

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.slot_status as enum ('free', 'booked', 'blocked');
create type public.booking_status as enum ('new', 'confirmed', 'done', 'cancelled', 'no_show');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.services (
  id           text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name         jsonb not null,                       -- {"et": "...", "ru": "...", "en": "..."}
  description  jsonb not null default '{}'::jsonb,
  duration_min int not null check (duration_min between 15 and 600),
  price_from   numeric(10, 2) check (price_from >= 0),
  sort         int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create sequence public.booking_number_seq start 1001;

create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  number         bigint not null unique default nextval('public.booking_number_seq'),
  service_ids    text[] not null check (cardinality(service_ids) between 1 and 10),
  slot_ids       uuid[] not null default '{}',
  date           date not null,
  start_time     time not null,
  end_time       time not null,
  bay            smallint not null default 1,
  status         public.booking_status not null default 'new',
  customer_name  text not null check (char_length(customer_name) between 2 and 100),
  phone          text not null check (char_length(phone) between 5 and 30),
  email          text check (email is null or char_length(email) <= 200),
  car_make       text not null check (char_length(car_make) between 1 and 60),
  car_model      text not null check (char_length(car_model) between 1 and 60),
  car_year       int check (car_year is null or car_year between 1950 and 2100),
  plate          text check (plate is null or char_length(plate) <= 15),
  comment        text check (comment is null or char_length(comment) <= 2000),
  lang           text not null default 'et' check (lang in ('et', 'ru', 'en')),
  manage_token   text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  seen_by_admin  boolean not null default false,
  admin_notes    text,
  source         text not null default 'web' check (source in ('web', 'phone')),
  cancelled_at   timestamptz,
  cancelled_by   text check (cancelled_by in ('client', 'admin')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index bookings_date_idx on public.bookings (date, start_time);
create index bookings_status_idx on public.bookings (status, created_at desc);

create table public.slots (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  start_time  time not null,
  end_time    time not null,
  bay         smallint not null default 1 check (bay between 1 and 20),
  status      public.slot_status not null default 'free',
  booking_id  uuid references public.bookings (id),
  created_at  timestamptz not null default now(),
  constraint slots_time_order check (end_time > start_time),
  constraint slots_booked_has_booking check ((status = 'booked') = (booking_id is not null)),
  -- Two slots in the same bay can never overlap.
  constraint slots_no_overlap exclude using gist (
    bay with =,
    tsrange(date + start_time, date + end_time) with &&
  )
);
create index slots_date_idx on public.slots (date, bay, start_time);
create index slots_booking_idx on public.slots (booking_id);

create table public.callback_requests (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 100),
  phone         text not null check (char_length(phone) between 5 and 30),
  comment       text check (comment is null or char_length(comment) <= 1000),
  lang          text not null default 'et' check (lang in ('et', 'ru', 'en')),
  status        text not null default 'new' check (status in ('new', 'done')),
  seen_by_admin boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.notification_log (
  id          uuid primary key default gen_random_uuid(),
  event       text not null,      -- booking_created, booking_cancelled, callback_created, booking_confirmed, booking_declined, test
  audience    text not null check (audience in ('admin', 'customer')),
  recipient   text,
  subject     text,
  status      text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts    int not null default 0,
  error       text,
  booking_id  uuid references public.bookings (id),
  callback_id uuid references public.callback_requests (id),
  dismissed   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index notification_log_status_idx on public.notification_log (status, created_at desc);

-- One-time links in admin emails (Confirm / Decline). Only the hash is stored.
create table public.email_actions (
  id          uuid primary key default gen_random_uuid(),
  token_hash  text not null unique,
  booking_id  uuid not null references public.bookings (id),
  action      text not null check (action in ('confirm', 'decline')),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index email_actions_booking_idx on public.email_actions (booking_id);

create table public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  hits         int not null
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Public: read active services, read free slots via get_free_slots().
-- Everything else: admins only. The server uses the service role.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

alter table public.services          enable row level security;
alter table public.slots             enable row level security;
alter table public.bookings          enable row level security;
alter table public.callback_requests enable row level security;
alter table public.notification_log  enable row level security;
alter table public.email_actions     enable row level security;
alter table public.settings          enable row level security;
alter table public.admin_users       enable row level security;
alter table public.rate_limits       enable row level security;

create policy "public reads active services" on public.services
  for select to anon, authenticated using (active or (select public.is_admin()));

create policy "admin all services"          on public.services          for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all slots"             on public.slots             for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all bookings"          on public.bookings          for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all callbacks"         on public.callback_requests for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all notification_log"  on public.notification_log  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all settings"          on public.settings          for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin reads admin_users"     on public.admin_users       for select to authenticated using (user_id = (select auth.uid()));
-- email_actions and rate_limits: no policies, service role only.

-- ---------------------------------------------------------------------------
-- Public read: free slots, date and time only (no booking ids).
-- ---------------------------------------------------------------------------

create or replace function public.get_free_slots(p_from date, p_to date, p_tz text default 'Europe/Tallinn')
returns table (date date, start_time time, end_time time, bay smallint)
language sql stable security definer
set search_path = ''
as $$
  select s.date, s.start_time, s.end_time, s.bay
  from public.slots s
  where s.status = 'free'
    and s.date between p_from and p_to
    and (s.date + s.start_time) > (now() at time zone p_tz)
  order by s.date, s.start_time, s.bay;
$$;

-- ---------------------------------------------------------------------------
-- Booking creation: one transaction.
-- Locks the slot chain (FOR UPDATE, always in bay/time order so concurrent
-- calls cannot deadlock), checks every slot is still free, creates the
-- booking and marks the slots booked. A second caller waiting on the same
-- row lock re-reads it after the first commits, sees "booked", and gets
-- 'slot_taken'.
-- ---------------------------------------------------------------------------

create or replace function public.create_booking(
  p_date        date,
  p_start       time,
  p_service_ids text[],
  p_customer    jsonb,
  p_lang        text default 'et',
  p_source      text default 'web',
  p_bay         smallint default null,
  p_tz          text default 'Europe/Tallinn'
)
returns table (id uuid, number bigint, manage_token text, end_time time, bay smallint)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_services  text[];
  v_required  int;
  v_found     int;
  v_bay       smallint;
  v_chosen    smallint;
  v_slot      record;
  v_ids       uuid[];
  v_cur_end   time;
  v_ok        boolean := false;
  v_booking   public.bookings;
begin
  select array_agg(distinct x) into v_services from unnest(p_service_ids) as x;
  if v_services is null or cardinality(v_services) = 0 then
    raise exception 'no_services' using errcode = 'P0001';
  end if;

  select coalesce(sum(s.duration_min), 0), count(*)
    into v_required, v_found
    from public.services s
   where s.id = any (v_services) and s.active;
  if v_found <> cardinality(v_services) then
    raise exception 'unknown_service' using errcode = 'P0001';
  end if;

  if (p_date + p_start) <= (now() at time zone p_tz) then
    raise exception 'slot_past' using errcode = 'P0001';
  end if;

  for v_bay in
    select s.bay from public.slots s
     where s.date = p_date and s.start_time = p_start
       and (p_bay is null or s.bay = p_bay)
     order by s.bay
  loop
    v_ids := '{}';
    v_cur_end := p_start;
    loop
      select s.* into v_slot
        from public.slots s
       where s.date = p_date and s.bay = v_bay and s.start_time = v_cur_end
         for update;
      exit when not found or v_slot.status <> 'free';
      v_ids := v_ids || v_slot.id;
      v_cur_end := v_slot.end_time;
      if v_cur_end - p_start >= make_interval(mins => v_required) then
        v_ok := true;
        exit;
      end if;
    end loop;
    if v_ok then
      v_chosen := v_bay;
      exit;
    end if;
  end loop;

  if not v_ok then
    raise exception 'slot_taken' using errcode = 'P0001';
  end if;

  insert into public.bookings (
    service_ids, slot_ids, date, start_time, end_time, bay, status,
    customer_name, phone, email, car_make, car_model, car_year, plate, comment,
    lang, source, seen_by_admin
  ) values (
    v_services, v_ids, p_date, p_start, v_cur_end, v_chosen,
    case when p_source = 'phone' then 'confirmed'::public.booking_status else 'new'::public.booking_status end,
    trim(p_customer ->> 'name'),
    trim(p_customer ->> 'phone'),
    nullif(trim(p_customer ->> 'email'), ''),
    trim(p_customer ->> 'car_make'),
    trim(p_customer ->> 'car_model'),
    nullif(p_customer ->> 'car_year', '')::int,
    nullif(upper(trim(p_customer ->> 'plate')), ''),
    nullif(trim(p_customer ->> 'comment'), ''),
    coalesce(p_lang, 'et'),
    coalesce(p_source, 'web'),
    p_source = 'phone'
  )
  returning * into v_booking;

  update public.slots s
     set status = 'booked', booking_id = v_booking.id
   where s.id = any (v_ids);

  return query select v_booking.id, v_booking.number, v_booking.manage_token, v_booking.end_time, v_booking.bay;
end;
$$;

-- Frees the booking's slots and marks it cancelled. Used by every cancel path.
create or replace function public._cancel_booking(p_booking_id uuid, p_by text)
returns public.bookings
language plpgsql security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  update public.bookings b
     set status = 'cancelled', cancelled_at = now(), cancelled_by = p_by,
         seen_by_admin = (p_by = 'admin'), updated_at = now()
   where b.id = p_booking_id
  returning * into v_booking;

  update public.slots s
     set status = 'free', booking_id = null
   where s.booking_id = p_booking_id;

  update public.email_actions e
     set used_at = now()
   where e.booking_id = p_booking_id and e.used_at is null;

  return v_booking;
end;
$$;

-- Customer cancels with the secret link, up to p_min_hours before the visit.
create or replace function public.cancel_booking_by_token(
  p_token text, p_min_hours int default 3, p_tz text default 'Europe/Tallinn'
)
returns public.bookings
language plpgsql security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings b where b.manage_token = p_token for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_booking.status not in ('new', 'confirmed') then
    raise exception 'not_cancellable' using errcode = 'P0001';
  end if;
  if (v_booking.date + v_booking.start_time) - make_interval(hours => p_min_hours) <= (now() at time zone p_tz) then
    raise exception 'too_late' using errcode = 'P0001';
  end if;
  return public._cancel_booking(v_booking.id, 'client');
end;
$$;

-- Admin cancel / decline (server checks the admin session before calling).
create or replace function public.admin_cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings b where b.id = p_booking_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_booking.status = 'cancelled' then
    return v_booking;
  end if;
  return public._cancel_booking(p_booking_id, 'admin');
end;
$$;

-- One-time email link. Consumes every open link of that booking, then acts.
create or replace function public.use_email_action(p_token_hash text)
returns table (booking_id uuid, action text, result text)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_action  public.email_actions;
  v_booking public.bookings;
begin
  select * into v_action from public.email_actions e where e.token_hash = p_token_hash for update;
  if not found then
    raise exception 'invalid_link' using errcode = 'P0001';
  end if;
  if v_action.used_at is not null then
    raise exception 'link_used' using errcode = 'P0001';
  end if;
  if v_action.expires_at <= now() then
    raise exception 'link_expired' using errcode = 'P0001';
  end if;

  select * into v_booking from public.bookings b where b.id = v_action.booking_id for update;
  if v_booking.status not in ('new', 'confirmed') then
    update public.email_actions e set used_at = now() where e.booking_id = v_action.booking_id and e.used_at is null;
    raise exception 'booking_closed' using errcode = 'P0001';
  end if;

  update public.email_actions e set used_at = now() where e.booking_id = v_action.booking_id and e.used_at is null;

  if v_action.action = 'confirm' then
    update public.bookings b set status = 'confirmed', seen_by_admin = true, updated_at = now() where b.id = v_booking.id;
    return query select v_booking.id, v_action.action, 'confirmed'::text;
  else
    perform public._cancel_booking(v_booking.id, 'admin');
    return query select v_booking.id, v_action.action, 'declined'::text;
  end if;
end;
$$;

-- Bulk slot insert. Overlapping slots are skipped (exclusion constraint),
-- so the admin can re-run a bulk add safely. Returns how many were created.
create or replace function public.admin_add_slots(p_slots jsonb)
returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  insert into public.slots (date, start_time, end_time, bay)
  select x.date, x.start_time, x.end_time, coalesce(x.bay, 1)
    from jsonb_to_recordset(p_slots) as x(date date, start_time time, end_time time, bay smallint)
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Fixed-window rate limiter (works across serverless instances).
create or replace function public.rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_hits int;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning r.hits into v_hits;

  -- Cheap housekeeping.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_max;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges. Supabase grants EXECUTE to anon/authenticated by
-- default, so revoke it: only the server (service role) may write.
-- ---------------------------------------------------------------------------

revoke execute on function public.create_booking(date, time, text[], jsonb, text, text, smallint, text) from public, anon, authenticated;
revoke execute on function public._cancel_booking(uuid, text) from public, anon, authenticated;
revoke execute on function public.cancel_booking_by_token(text, int, text) from public, anon, authenticated;
revoke execute on function public.admin_cancel_booking(uuid) from public, anon, authenticated;
revoke execute on function public.use_email_action(text) from public, anon, authenticated;
revoke execute on function public.admin_add_slots(jsonb) from public, anon, authenticated;
revoke execute on function public.rate_limit(text, int, int) from public, anon, authenticated;

grant execute on function public.create_booking(date, time, text[], jsonb, text, text, smallint, text) to service_role;
grant execute on function public._cancel_booking(uuid, text) to service_role;
grant execute on function public.cancel_booking_by_token(text, int, text) to service_role;
grant execute on function public.admin_cancel_booking(uuid) to service_role;
grant execute on function public.use_email_action(text) to service_role;
grant execute on function public.admin_add_slots(jsonb) to service_role;
grant execute on function public.rate_limit(text, int, int) to service_role;

grant execute on function public.get_free_slots(date, date, text) to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
