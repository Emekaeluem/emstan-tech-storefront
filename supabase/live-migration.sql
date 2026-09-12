-- Run once in Supabase SQL Editor BEFORE uploading/deploying live-ready code.
-- Existing orders are preserved as test orders, including historical receipts.
begin;
alter table public.orders add column if not exists payment_mode text not null default 'test';
update public.orders set payment_mode = 'test' where payment_mode is null;
alter table public.orders add constraint orders_payment_mode_check check (payment_mode in ('test', 'live'));
drop index if exists public.orders_email_domain_unique;
create unique index if not exists orders_email_domain_mode_unique on public.orders (email, domain, payment_mode);
commit;
