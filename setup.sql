-- 독서실 모니터: Supabase 초기 설정 (SQL Editor에 전체를 붙여넣고 Run)

-- 1) 회원 정보 (가입하면 '승인 대기'로 시작)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null default '',
  role text not null default 'pending' check (role in ('pending','student','admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- 이미 가입한 계정이 있으면 회원 정보 채우기
insert into public.profiles (id, email, name)
select id, email, coalesce(raw_user_meta_data->>'name', '') from auth.users
on conflict (id) do nothing;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
using (id = auth.uid() or public.my_role() = 'admin');

-- 관리자만 학생 승인/정지 가능 (관리자 계정은 바꿀 수 없음)
create or replace function public.set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'admin' then raise exception '관리자만 가능합니다'; end if;
  if new_role not in ('pending','student') then raise exception '허용되지 않는 값입니다'; end if;
  update public.profiles set role = new_role where id = target and role <> 'admin';
end $$;

-- 2) 공용 설정 (승인된 회원만 읽기 가능)
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  room_code text not null,
  ntfy_topic text not null default ''
);
alter table public.settings enable row level security;
insert into public.settings (id, room_code, ntfy_topic)
values (1, 'room' || replace(gen_random_uuid()::text, '-', ''), 'dokseosil-f5b498bf03')
on conflict (id) do nothing;

drop policy if exists "settings read" on public.settings;
create policy "settings read" on public.settings for select to authenticated
using (public.my_role() in ('student','admin'));

-- 3) 하루 누적 시간
create table if not exists public.study_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  study_ms bigint not null default 0,
  away_ms bigint not null default 0,
  drowsy_ms bigint not null default 0,
  break_ms bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.study_days enable row level security;

drop policy if exists "days read" on public.study_days;
create policy "days read" on public.study_days for select to authenticated
using (user_id = auth.uid() or public.my_role() = 'admin');
drop policy if exists "days insert" on public.study_days;
create policy "days insert" on public.study_days for insert to authenticated
with check (user_id = auth.uid() and public.my_role() in ('student','admin'));
drop policy if exists "days update" on public.study_days;
create policy "days update" on public.study_days for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid() and public.my_role() in ('student','admin'));

-- 4) 상태 변화 기록 (자리비움, 졸음 등)
create table if not exists public.study_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,
  at timestamptz not null default now()
);
alter table public.study_events enable row level security;

drop policy if exists "events read" on public.study_events;
create policy "events read" on public.study_events for select to authenticated
using (user_id = auth.uid() or public.my_role() = 'admin');
drop policy if exists "events insert" on public.study_events;
create policy "events insert" on public.study_events for insert to authenticated
with check (user_id = auth.uid() and public.my_role() in ('student','admin'));

-- 5) 접근 권한 (로그인한 사용자만, 로그인 안 한 사용자는 전부 차단)
revoke all on public.profiles, public.settings, public.study_days, public.study_events from anon;
grant select on public.profiles, public.settings to authenticated;
grant select, insert, update on public.study_days to authenticated;
grant select, insert on public.study_events to authenticated;
revoke execute on function public.set_role(uuid, text) from public, anon;
grant execute on function public.set_role(uuid, text) to authenticated;
grant execute on function public.my_role() to authenticated;
