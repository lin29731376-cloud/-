-- 가입 동의 기록 + 순위는 동의한 회원만 표시. SQL Editor에 붙여넣고 Run.
create table if not exists public.consents (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  version text not null,
  under14 boolean not null default false,
  rank_ok boolean not null default false,
  report_ok boolean not null default false,
  agreed_at timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.consents enable row level security;

drop policy if exists "consents read" on public.consents;
create policy "consents read" on public.consents for select to authenticated
using (user_id = auth.uid() or public.my_role() = 'admin');
drop policy if exists "consents insert" on public.consents;
create policy "consents insert" on public.consents for insert to authenticated
with check (user_id = auth.uid());

-- 동의 기록은 한 번 남기면 고치거나 지울 수 없고, 동의 시각은 서버가 기록함
revoke all on public.consents from anon, authenticated;
grant select on public.consents to authenticated;
grant insert (version, under14, rank_ok, report_ok) on public.consents to authenticated;

-- 순위: 순위 표시에 동의한 회원만 포함
create or replace function public.day_ranking(d date)
returns table(name text, study_ms bigint, me boolean)
language sql stable security definer set search_path = public as $$
  select p.name, s.study_ms, s.user_id = auth.uid()
  from public.study_days s join public.profiles p on p.id = s.user_id
  where s.day = d
    and public.my_role() in ('student','admin')
    and p.role in ('student','admin')
    and exists (select 1 from public.consents c where c.user_id = s.user_id and c.rank_ok)
  order by s.study_ms desc
  limit 50
$$;
revoke execute on function public.day_ranking(date) from public, anon;
grant execute on function public.day_ranking(date) to authenticated;
