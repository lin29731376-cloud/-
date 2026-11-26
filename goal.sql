-- 목표 공부 시간을 관리자가 정함: 전체 기본값 + 학생별 따로 정하기. SQL Editor에 붙여넣고 Run.
alter table public.settings add column if not exists goal_hours numeric not null default 4;
alter table public.profiles add column if not exists goal_hours numeric; -- 비어 있으면 전체 기본값을 따름

-- target이 비어 있으면 전체 기본값, 있으면 그 학생 것. hours가 비어 있으면 학생별 설정을 지우고 기본값으로 되돌림
create or replace function public.set_goal(target uuid, hours numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'admin' then raise exception '관리자만 가능합니다'; end if;
  if target is null then
    update public.settings set goal_hours = greatest(0.5, least(coalesce(hours, 4), 16)) where id = 1;
  else
    update public.profiles set goal_hours = case when hours is null then null else greatest(0.5, least(hours, 16)) end
    where id = target;
  end if;
end $$;
revoke execute on function public.set_goal(uuid, numeric) from public, anon;
grant execute on function public.set_goal(uuid, numeric) to authenticated;
