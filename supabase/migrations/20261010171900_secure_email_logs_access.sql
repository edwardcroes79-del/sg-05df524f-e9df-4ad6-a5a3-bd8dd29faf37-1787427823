drop policy if exists "Super Admins can manage email logs" on public.email_logs;

revoke all privileges on table public.email_logs from anon;
revoke all privileges on table public.email_logs from authenticated;

grant select on table public.email_logs to authenticated;

create policy "Super Admins can read email logs"
on public.email_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and (
        profiles.is_super_admin is true
        or profiles.role = 'super_admin'
      )
  )
);