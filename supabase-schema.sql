-- ============================================
-- Family Shifts — Supabase Database Schema
-- ============================================

-- 1. Users table (family members)
create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  phone text unique not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  notification_preferences jsonb default '{"sms": false, "whatsapp": false, "email": false}'::jsonb,
  created_at timestamptz default now()
);

-- 2. Shifts table
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  user_id uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 3. Notification log (future use)
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete cascade,
  channel text not null check (channel in ('sms', 'whatsapp', 'email')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index idx_shifts_date on public.shifts(date);
create index idx_shifts_user on public.shifts(user_id);
create index idx_users_phone on public.users(phone);
create index idx_users_auth on public.users(auth_id);

-- ============================================
-- Row Level Security
-- ============================================

alter table public.users enable row level security;
alter table public.shifts enable row level security;
alter table public.notification_log enable row level security;

-- Helper: check if current auth user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users
    where auth_id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Helper: get current user's public id
create or replace function public.current_user_id()
returns uuid as $$
  select id from public.users where auth_id = auth.uid() limit 1;
$$ language sql security definer stable;

-- USERS policies
create policy "Users can view all members"
  on public.users for select
  to authenticated
  using (true);

create policy "Only admin can insert users"
  on public.users for insert
  to authenticated
  with check (public.is_admin());

create policy "Only admin can update users"
  on public.users for update
  to authenticated
  using (public.is_admin());

create policy "Only admin can delete users"
  on public.users for delete
  to authenticated
  using (public.is_admin());

-- SHIFTS policies
create policy "Anyone can view shifts"
  on public.shifts for select
  to authenticated
  using (true);

create policy "Admin can insert shifts"
  on public.shifts for insert
  to authenticated
  with check (public.is_admin());

create policy "User can claim empty shift or admin can update any"
  on public.shifts for update
  to authenticated
  using (
    public.is_admin()
    or user_id is null
    or user_id = public.current_user_id()
  );

create policy "Admin can delete shifts"
  on public.shifts for delete
  to authenticated
  using (public.is_admin());

-- NOTIFICATION LOG policies
create policy "Admin can manage notifications"
  on public.notification_log for all
  to authenticated
  using (public.is_admin());

create policy "Users can view own notifications"
  on public.notification_log for select
  to authenticated
  using (user_id = public.current_user_id());
