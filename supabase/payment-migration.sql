-- Run once in Supabase SQL Editor before deploying the payment-enabled app.
-- Existing orders and their statuses are preserved.
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_currency text;
alter table public.orders drop constraint if exists orders_payment_currency_check;
alter table public.orders add constraint orders_payment_currency_check check (payment_currency in ('NGN', 'USD'));
-- Preserve compatibility with naira-only checkouts started with the earlier ZIP.
update public.orders set payment_currency = 'NGN'
where payment_currency is null and payment_reference like '%-P1';
alter table public.orders add column if not exists payment_url text;
alter table public.orders add column if not exists paid_at timestamptz;
-- The NGN quote is saved per approved order. Already-started payments keep their original price.
alter table public.orders add column if not exists quote_expires_at timestamptz;
alter table public.orders add column if not exists fx_rate_ngn_per_usd numeric;
alter table public.orders add column if not exists fx_rate_updated_at timestamptz;
alter table public.orders add column if not exists fx_margin_percent numeric;
create unique index if not exists orders_payment_reference_unique
  on public.orders (payment_reference) where payment_reference is not null;

-- Optional: after you have independently checked a specific requested domain,
-- replace the example reference below, uncomment, and run this single update.
-- update public.orders set status = 'approved', updated_at = now()
-- where reference = 'EMT-YOUR-ORDER-REFERENCE' and status = 'awaiting_review';
