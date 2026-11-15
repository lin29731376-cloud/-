-- 오늘 공부시간 순위 (학생 화면에 표시). SQL Editor에 붙여넣고 Run.
create or replace function public.day_ranking(d date)
returns table(name text, study_ms bigint, me boolean)
language sql stable security definer set search_path = public as $$
  select p.name, s.study_ms, s.user_id = auth.uid()
  from public.study_days s join public.profiles p on p.id = s.user_id
  where s.day = d
    and public.my_role() in ('student','admin')
    and p.role in ('student','admin')
  order by s.study_ms desc
  limit 50
$$;
revoke execute on function public.day_ranking(date) from public, anon;
grant execute on function public.day_ranking(date) to authenticated;
