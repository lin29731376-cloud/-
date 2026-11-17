-- 화장실·식사 휴식 제한 시간을 관리자가 정할 수 있게 함. SQL Editor에 붙여넣고 Run.
alter table public.settings
  add column if not exists toilet_min int not null default 10,
  add column if not exists rest_min int not null default 40;

create or replace function public.set_break_limits(toilet int, rest int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'admin' then raise exception '관리자만 가능합니다'; end if;
  update public.settings set
    toilet_min = greatest(1, least(toilet, 60)),
    rest_min = greatest(5, least(rest, 180))
  where id = 1;
end $$;
revoke execute on function public.set_break_limits(int, int) from public, anon;
grant execute on function public.set_break_limits(int, int) to authenticated;
