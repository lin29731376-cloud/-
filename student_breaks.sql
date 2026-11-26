-- 화장실·식사 휴식 제한 시간을 학생마다 따로 정함. SQL Editor에 붙여넣고 Run.
alter table public.profiles
  add column if not exists toilet_min int,  -- 비어 있으면 전체 기본값을 따름
  add column if not exists rest_min int;

-- toilet/rest가 비어 있으면 그 학생 설정을 지우고 전체 기본값으로 되돌림
create or replace function public.set_student_breaks(target uuid, toilet int, rest int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'admin' then raise exception '관리자만 가능합니다'; end if;
  update public.profiles set
    toilet_min = case when toilet is null then null else greatest(1, least(toilet, 60)) end,
    rest_min = case when rest is null then null else greatest(5, least(rest, 180)) end
  where id = target;
end $$;
revoke execute on function public.set_student_breaks(uuid, int, int) from public, anon;
grant execute on function public.set_student_breaks(uuid, int, int) to authenticated;
