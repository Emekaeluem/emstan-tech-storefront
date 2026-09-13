create table if not exists public.processing_fee_payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  full_name text not null,
  email text not null,
  amount_ngn_kobo integer not null default 100000
    check (amount_ngn_kobo = 100000),
  payment_mode text not null check (payment_mode in ('test', 'live')),
  status text not null default 'pending'
    check (status in ('pending', 'paid')),
  payment_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists processing_fee_email_idx
  on public.processing_fee_payments (email);

create index if not exists processing_fee_status_idx
  on public.processing_fee_payments (status);

alter table public.processing_fee_payments enable row level security;
revoke all on table public.processing_fee_payments from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update on table public.processing_fee_payments to service_role;

comment on table public.processing_fee_payments is
  'Private standalone NGN 1,000 processing-fee payments.';
