-- ==============================================================================
-- Quote Match AI — Complete Supabase Database Schema
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create Tables
-- ------------------------------------------------------------------------------

-- Profiles table (mirrors auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default 'User',
  role text check (role in ('buyer', 'seller')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RFQs table
create table if not exists public.rfqs (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  raw_text text,
  items jsonb not null default '[]'::jsonb,
  delivery_date date not null,
  location text not null,
  status text not null default 'open' check (status in ('open', 'awarded', 'closed')),
  winner_bid_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bids table
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  price numeric not null check (price > 0),
  lead_time_days integer not null check (lead_time_days >= 0 and lead_time_days <= 365),
  notes text,
  status text not null default 'pending' check (status in ('pending', 'won', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bids_rfq_seller_unique unique (rfq_id, seller_id)
);

-- Foreign key from rfqs.winner_bid_id to bids.id
alter table public.rfqs
  drop constraint if exists rfqs_winner_bid_id_fkey;

alter table public.rfqs
  add constraint rfqs_winner_bid_id_fkey
  foreign key (winner_bid_id) references public.bids(id)
  on delete set null;

-- 2. Create Views
-- ------------------------------------------------------------------------------

-- Buyer RFQ Overview View
create or replace view public.buyer_rfq_overview as
select
  r.id,
  r.buyer_id,
  r.raw_text,
  r.items,
  r.delivery_date,
  r.location,
  r.status,
  r.winner_bid_id,
  w_prof.display_name as winning_seller_name,
  w_bid.price as winning_price,
  count(b.id)::int as bid_count,
  min(b.price) as lowest_price,
  r.created_at
from public.rfqs r
left join public.bids b on b.rfq_id = r.id
left join public.bids w_bid on w_bid.id = r.winner_bid_id
left join public.profiles w_prof on w_prof.id = w_bid.seller_id
group by
  r.id,
  r.buyer_id,
  r.raw_text,
  r.items,
  r.delivery_date,
  r.location,
  r.status,
  r.winner_bid_id,
  w_prof.display_name,
  w_bid.price,
  r.created_at;

-- Seller Inbox View
create or replace view public.seller_inbox as
select
  r.id,
  r.buyer_id,
  r.raw_text,
  r.items,
  r.delivery_date,
  r.location,
  r.status,
  my_bid.id as my_bid_id,
  my_bid.status as my_bid_status,
  count(all_bids.id)::int as bid_count,
  r.created_at
from public.rfqs r
left join public.bids my_bid on my_bid.rfq_id = r.id and my_bid.seller_id = auth.uid()
left join public.bids all_bids on all_bids.rfq_id = r.id
where r.status = 'open' or my_bid.id is not null
group by
  r.id,
  r.buyer_id,
  r.raw_text,
  r.items,
  r.delivery_date,
  r.location,
  r.status,
  my_bid.id,
  my_bid.status,
  r.created_at;

-- 3. Triggers & Automation
-- ------------------------------------------------------------------------------

-- Automatically insert a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    null
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger to guard bid submissions: seller role and open RFQ
create or replace function public.guard_bid_write()
returns trigger
language plpgsql
security definer
as $$
declare
  v_role text;
  v_rfq_status text;
begin
  -- Check caller is seller
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role != 'seller' then
    raise exception 'WRONG_ROLE';
  end if;

  -- Check RFQ is open
  select status into v_rfq_status from public.rfqs where id = new.rfq_id;
  if v_rfq_status is null or v_rfq_status != 'open' then
    raise exception 'RFQ_CLOSED';
  end if;

  return new;
end;
$$;

drop trigger if exists on_bid_write on public.bids;
create trigger on_bid_write
  before insert or update on public.bids
  for each row execute function public.guard_bid_write();

-- 4. RPC Functions (Contracts called by Backend API Routes)
-- ------------------------------------------------------------------------------

-- set_my_role: One-time permanent role assignment
create or replace function public.set_my_role(p_role text)
returns public.profiles
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if p_role not in ('buyer', 'seller') then
    raise exception 'VALIDATION_ERROR';
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  if v_profile.role is not null then
    raise exception 'ROLE_ALREADY_SET';
  end if;

  update public.profiles
  set role = p_role, updated_at = now()
  where id = v_uid
  returning * into v_profile;

  return v_profile;
end;
$$;

-- get_bids_for_rfq: Returns sorted bids for buyer view
create or replace function public.get_bids_for_rfq(p_rfq_id uuid)
returns table (
  id uuid,
  rfq_id uuid,
  seller_id uuid,
  seller_name text,
  price numeric,
  lead_time_days integer,
  notes text,
  status text,
  created_at timestamptz,
  is_lowest_price boolean,
  is_fastest boolean
)
language plpgsql
security definer
as $$
declare
  v_buyer_id uuid;
  v_min_price numeric;
  v_min_lead integer;
begin
  -- Check caller ownership
  select r.buyer_id into v_buyer_id from public.rfqs r where r.id = p_rfq_id;
  if v_buyer_id is null then
    raise exception 'RFQ_NOT_FOUND';
  end if;
  if v_buyer_id != auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  -- Compute lowest price and fastest delivery
  select min(b.price), min(b.lead_time_days)
  into v_min_price, v_min_lead
  from public.bids b
  where b.rfq_id = p_rfq_id;

  return query
  select
    b.id,
    b.rfq_id,
    b.seller_id,
    p.display_name as seller_name,
    b.price,
    b.lead_time_days,
    b.notes,
    b.status,
    b.created_at,
    (b.price = v_min_price) as is_lowest_price,
    (b.lead_time_days = v_min_lead) as is_fastest
  from public.bids b
  join public.profiles p on p.id = b.seller_id
  where b.rfq_id = p_rfq_id
  order by b.price asc, b.lead_time_days asc, b.created_at asc;
end;
$$;

-- select_winner: Idempotent winner award with row-level locking
create or replace function public.select_winner(p_rfq_id uuid, p_bid_id uuid)
returns public.rfqs
language plpgsql
security definer
as $$
declare
  v_rfq public.rfqs;
  v_bid public.bids;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  -- Lock the RFQ row to prevent concurrent award races
  select * into v_rfq
  from public.rfqs
  where id = p_rfq_id
  for update;

  if v_rfq.id is null then
    raise exception 'RFQ_NOT_FOUND';
  end if;

  if v_rfq.buyer_id != auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  -- Idempotency check: selecting the same winner again succeeds cleanly
  if v_rfq.status = 'awarded' and v_rfq.winner_bid_id = p_bid_id then
    return v_rfq;
  end if;

  -- Already awarded to another bid or closed
  if v_rfq.status != 'open' then
    raise exception 'RFQ_CLOSED';
  end if;

  -- Verify bid exists and belongs to this RFQ
  select * into v_bid
  from public.bids
  where id = p_bid_id and rfq_id = p_rfq_id;

  if v_bid.id is null then
    raise exception 'BID_NOT_FOUND';
  end if;

  -- Mark winning bid as 'won', all others as 'lost'
  update public.bids
  set status = 'won', updated_at = now()
  where id = p_bid_id;

  update public.bids
  set status = 'lost', updated_at = now()
  where rfq_id = p_rfq_id and id != p_bid_id;

  -- Mark RFQ as awarded
  update public.rfqs
  set status = 'awarded', winner_bid_id = p_bid_id, updated_at = now()
  where id = p_rfq_id
  returning * into v_rfq;

  return v_rfq;
end;
$$;

-- close_rfq: Closes an open RFQ without awarding a winner
create or replace function public.close_rfq(p_rfq_id uuid)
returns public.rfqs
language plpgsql
security definer
as $$
declare
  v_rfq public.rfqs;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select * into v_rfq
  from public.rfqs
  where id = p_rfq_id
  for update;

  if v_rfq.id is null then
    raise exception 'RFQ_NOT_FOUND';
  end if;

  if v_rfq.buyer_id != auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  if v_rfq.status != 'open' then
    raise exception 'RFQ_CLOSED';
  end if;

  update public.rfqs
  set status = 'closed', updated_at = now()
  where id = p_rfq_id
  returning * into v_rfq;

  return v_rfq;
end;
$$;

-- 5. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.rfqs enable row level security;
alter table public.bids enable row level security;

-- Profiles: Authenticated users can view profiles (for supplier/contractor names)
create policy "Allow read access to profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Allow users to update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- RFQs: Buyers can insert their own RFQs
create policy "Buyers can insert RFQs"
  on public.rfqs for insert
  to authenticated
  with check (buyer_id = auth.uid());

-- RFQs: Buyers can view their own, sellers can view open or ones they bid on
create policy "Buyers see own RFQs, sellers see open/bid RFQs"
  on public.rfqs for select
  to authenticated
  using (
    buyer_id = auth.uid()
    or status = 'open'
    or exists (
      select 1 from public.bids
      where bids.rfq_id = rfqs.id and bids.seller_id = auth.uid()
    )
  );

-- Bids: Sellers can insert/update their own bids
create policy "Sellers can manage own bids"
  on public.bids for all
  to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

-- Bids: Buyers can view bids for their own RFQs
create policy "Buyers can view bids on their RFQs"
  on public.bids for select
  to authenticated
  using (
    exists (
      select 1 from public.rfqs
      where rfqs.id = bids.rfq_id and rfqs.buyer_id = auth.uid()
    )
  );

-- 6. Table Privileges (Required by PostgreSQL alongside RLS)
-- ------------------------------------------------------------------------------
grant usage on schema public to authenticated, anon;
grant select, insert, update on public.rfqs to authenticated;
grant select, insert, update on public.bids to authenticated;
grant select, insert, update on public.profiles to authenticated;

