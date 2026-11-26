-- 엄격 감지(카메라 가림, 고개 숙임, 화면 멈춤) 기준을 관리자가 정함. SQL Editor에 붙여넣고 Run.
alter table public.settings
  add column if not exists dark_sec int not null default 10,      -- 카메라 가림: 화면이 어두운 시간(초)
  add column if not exists head_deg int not null default 35,      -- 고개 숙임: 평소 자세보다 더 숙인 각도(도)
  add column if not exists head_sec int not null default 20,      -- 고개 숙임: 숙인 채 있는 시간(초)
  add column if not exists frozen_sec int not null default 60;    -- 화면 멈춤: 움직임·깜빡임이 없는 시간(초)

create or replace function public.set_strict(dark int, head_deg int, head int, frozen int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'admin' then raise exception '관리자만 가능합니다'; end if;
  update public.settings set
    dark_sec = greatest(3, least(dark, 120)),
    head_deg = greatest(15, least(set_strict.head_deg, 70)),
    head_sec = greatest(5, least(head, 300)),
    frozen_sec = greatest(20, least(frozen, 600))
  where id = 1;
end $$;
revoke execute on function public.set_strict(int, int, int, int) from public, anon;
grant execute on function public.set_strict(int, int, int, int) to authenticated;
