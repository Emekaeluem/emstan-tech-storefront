-- Run once in Supabase SQL Editor before deploying the payment-enabled app.
-- Existing orders and their statuses are preserved.
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_url text;
alter table public.orders add column if not exists paid_at timestamptz;
create unique index if not exists orders_payment_reference_unique
  on public.orders (payment_reference) where payment_reference is not null;

-- Optional: after you have independently checked a specific requested domain,
-- replace the example reference below, uncomment, and run this single update.
-- update public.orders set status = 'approved', updated_at = now()
-- where reference = 'EMT-YOUR-ORDER-REFERENCE' and status = 'awaiting_review';
