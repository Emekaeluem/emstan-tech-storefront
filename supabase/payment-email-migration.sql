-- Run once before deploying the payment-email code. Existing orders are preserved.
alter table public.orders
  add column if not exists payment_email_claimed_at timestamptz,
  add column if not exists payment_email_sent_at timestamptz;

comment on column public.orders.payment_email_sent_at is
  'When the payment confirmation was accepted by the mail provider; not proof of inbox delivery.';
