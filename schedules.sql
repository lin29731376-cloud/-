-- 출석 체크: 회원별 출석 요일과 시간. SQL Editor에 붙여넣고 Run.
create table if not exists public.schedules (
  user_id uuid primary key references auth.users(id) on delete cascade,
  days int[] not null default '{}',      -- 0=일, 1=월 … 6=토
  start_time time not null,
  end_time time not null,
  updated_at timestamptz not null default now()
);
alter table public.schedules enable row level security;

drop policy if exists "schedules read" on public.schedules;
create policy "schedules read" on public.schedules for select to authenticated
using (user_id = auth.uid() or public.my_role() = 'admin');
drop policy if exists "schedules admin insert" on public.schedules;
create policy "schedules admin insert" on public.schedules for insert to authenticated
with check (public.my_role() = 'admin');
drop policy if exists "schedules admin update" on public.schedules;
create policy "schedules admin update" on public.schedules for update to authenticated
using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
drop policy if exists "schedules admin delete" on public.schedules;
create policy "schedules admin delete" on public.schedules for delete to authenticated
using (public.my_role() = 'admin');

revoke all on public.schedules from anon;
grant select, insert, update, delete on public.schedules to authenticated;
