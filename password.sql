-- 관리자가 학생 비밀번호를 재설정할 수 있게 함. SQL Editor에 붙여넣고 Run.
create or replace function public.admin_set_password(target uuid, new_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if public.my_role() is distinct from 'admin' then raise exception '관리자만 가능합니다'; end if;
  if length(new_password) < 6 then raise exception '비밀번호는 6자 이상이어야 합니다'; end if;
  if exists (select 1 from public.profiles where id = target and role = 'admin') then
    raise exception '관리자 계정은 여기서 바꿀 수 없습니다';
  end if;
  update auth.users
    set encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = now()
    where id = target;
  if not found then raise exception '해당 회원을 찾을 수 없습니다'; end if;
end $$;
revoke execute on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
