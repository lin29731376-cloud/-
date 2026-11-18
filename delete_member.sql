-- 그만둔 학생의 기록·계정 삭제 (관리자만). SQL Editor에 붙여넣고 Run.

-- 1) 공부 기록만 삭제 (계정과 출석 시간은 남김)
create or replace function public.admin_delete_records(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'admin' then raise exception '관리자만 가능합니다'; end if;
  if exists (select 1 from public.profiles where id = target and role = 'admin') then
    raise exception '관리자 계정은 지울 수 없습니다';
  end if;
  delete from public.study_events where user_id = target;
  delete from public.study_days where user_id = target;
end $$;
revoke execute on function public.admin_delete_records(uuid) from public, anon;
grant execute on function public.admin_delete_records(uuid) to authenticated;

-- 2) 계정 삭제: 계정을 지우면 연결된 모든 기록(공부 기록, 출석 시간, 동의 기록, 회원 정보)이 함께 지워짐
create or replace function public.admin_delete_member(target uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if public.my_role() is distinct from 'admin' then raise exception '관리자만 가능합니다'; end if;
  if exists (select 1 from public.profiles where id = target and role = 'admin') then
    raise exception '관리자 계정은 지울 수 없습니다';
  end if;
  delete from public.study_events where user_id = target;
  delete from public.study_days where user_id = target;
  delete from auth.users where id = target;
  if not found then raise exception '해당 회원을 찾을 수 없습니다'; end if;
end $$;
revoke execute on function public.admin_delete_member(uuid) from public, anon;
grant execute on function public.admin_delete_member(uuid) to authenticated;
