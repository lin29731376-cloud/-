-- 감지 기준을 서버에 저장하고 관리자만 바꿀 수 있게 함. SQL Editor에 붙여넣고 Run.
alter table public.settings
  add column if not exists away_sec int not null default 30,
  add column if not exists drowsy_sec int not null default 8,
  add column if not exists eye_thr numeric not null default 0.6;

create or replace function public.set_thresholds(away int, drowsy int, thr numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'admin' then raise exception '관리자만 가능합니다'; end if;
  update public.settings set
    away_sec = greatest(3, least(away, 300)),
    drowsy_sec = greatest(2, least(drowsy, 60)),
    eye_thr = greatest(0.3, least(thr, 0.9))
  where id = 1;
end $$;
revoke execute on function public.set_thresholds(int, int, numeric) from public, anon;
grant execute on function public.set_thresholds(int, int, numeric) to authenticated;
