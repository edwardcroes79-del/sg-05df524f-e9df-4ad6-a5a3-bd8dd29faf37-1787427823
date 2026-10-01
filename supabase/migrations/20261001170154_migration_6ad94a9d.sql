alter table public.customers
add column if not exists email_receipts_enabled boolean not null default true;

comment on column public.customers.email_receipts_enabled is 'Customer preference controlling whether stamp receipt emails are sent after successful stamp transactions.';