-- Initial schema: profiles table linked to auth.users
-- Source spec: docs/superpowers/specs/2026-05-10-vendora-saas-design.md § 5

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  icp_definition text,
  value_proposition text,
  plan text not null default 'free' check (plan in ('free','starter','growth','scale')),
  billing_customer_id text unique,
  billing_subscription_id text unique,
  emails_sent_this_month int not null default 0,
  trial_ends_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

create policy "own_profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create profile row on user signup
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
