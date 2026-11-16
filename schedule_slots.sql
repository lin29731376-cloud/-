-- 출석 시간을 회원당 여러 개(요일별로 다르게) 정할 수 있게 함. SQL Editor에 붙여넣고 Run.
create table if not exists public.schedule_slots (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  days int[] not null default '{}',      -- 0=일, 1=월 … 6=토
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);
alter table public.schedule_slots enable row level security;

drop policy if exists "slots read" on public.schedule_slots;
create policy "slots read" on public.schedule_slots for select to authenticated
using (user_id = auth.uid() or public.my_role() = 'admin');
drop policy if exists "slots admin insert" on public.schedule_slots;
create policy "slots admin insert" on public.schedule_slots for insert to authenticated
with check (public.my_role() = 'admin');
drop policy if exists "slots admin update" on public.schedule_slots;
create policy "slots admin update" on public.schedule_slots for update to authenticated
using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
drop policy if exists "slots admin delete" on public.schedule_slots;
create policy "slots admin delete" on public.schedule_slots for delete to authenticated
using (public.my_role() = 'admin');

revoke all on public.schedule_slots from anon;
grant select, insert, update, delete on public.schedule_slots to authenticated;

-- 전에 정해 둔 출석 시간이 있으면 새 표로 옮김
do $$ begin
  if to_regclass('public.schedules') is not null then
    insert into public.schedule_slots (user_id, name, days, start_time, end_time)
    select s.user_id, '', s.days, s.start_time, s.end_time from public.schedules s
    where not exists (select 1 from public.schedule_slots x where x.user_id = s.user_id);
  end if;
end $$;
