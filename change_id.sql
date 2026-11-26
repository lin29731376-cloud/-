-- 관리자가 학생·관리자 계정의 로그인 아이디를 바꿀 수 있게 함. (이미 실행했어도 다시 실행하면 덮어씀) SQL Editor에 붙여넣고 Run.
create or replace function public.admin_set_login_id(target uuid, new_id text) returns void
language plpgsql security definer set search_path = public as $$
declare new_email text;
begin
  if public.my_role() is distinct from 'admin' then raise exception '관리자만 가능합니다'; end if;
  new_id := lower(trim(new_id));
  if new_id !~ '^[a-z0-9_]{4,20}$' then raise exception '아이디는 영어 소문자·숫자·밑줄(_)로 4~20자여야 합니다'; end if;
  new_email := new_id || '@id.invalid';
  if exists (select 1 from auth.users where lower(email) = new_email and id <> target) then
    raise exception '이미 사용 중인 아이디입니다';
  end if;
  update auth.users set email = new_email, updated_at = now() where id = target;
  if not found then raise exception '해당 회원을 찾을 수 없습니다'; end if;
  update auth.identities
    set identity_data = jsonb_set(coalesce(identity_data, '{}'::jsonb), '{email}', to_jsonb(new_email)), updated_at = now()
    where user_id = target and provider = 'email';
  update public.profiles set email = new_email where id = target;
end $$;
revoke execute on function public.admin_set_login_id(uuid, text) from public, anon;
grant execute on function public.admin_set_login_id(uuid, text) to authenticated;
