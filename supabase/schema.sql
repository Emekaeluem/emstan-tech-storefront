create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  full_name text not null,
  email text not null,
  phone text not null,
  domain text not null,
  extension text not null check (extension in ('.com', '.org', '.net')),
  amount_usd_cents integer not null,
  amount_ngn_kobo integer,
  payment_currency text check (payment_currency in ('NGN', 'USD')),
  payment_reference text,
  payment_url text,
  paid_at timestamptz,
  status text not null default 'awaiting_review',
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_email_idx on public.orders (email);
create index if not exists orders_status_idx on public.orders (status);
create unique index if not exists orders_email_domain_unique
  on public.orders (email, domain);
create unique index if not exists orders_payment_reference_unique
  on public.orders (payment_reference) where payment_reference is not null;

alter table public.orders enable row level security;
revoke all on table public.orders from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update on table public.orders to service_role;

comment on table public.orders is
  'Private Emstan Tech domain requests. Browser users have no direct access.';
