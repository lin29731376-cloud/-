-- 화면 기록을 서버(Supabase Storage)에 보관: 학생 폰이 올리고, 관리자만 보고 지울 수 있음. SQL Editor에 붙여넣고 Run.
insert into storage.buckets (id, name, public) values ('rec', 'rec', false)
on conflict (id) do nothing;

drop policy if exists "rec upload own" on storage.objects;
create policy "rec upload own" on storage.objects for insert to authenticated
with check (bucket_id = 'rec' and (storage.foldername(name))[1] = auth.uid()::text and public.my_role() in ('student', 'admin'));

drop policy if exists "rec admin read" on storage.objects;
create policy "rec admin read" on storage.objects for select to authenticated
using (bucket_id = 'rec' and public.my_role() = 'admin');

drop policy if exists "rec admin delete" on storage.objects;
create policy "rec admin delete" on storage.objects for delete to authenticated
using (bucket_id = 'rec' and public.my_role() = 'admin');

-- 서버에 며칠치 남길지 (관리자 앱이 열릴 때 지난 것을 지움)
alter table public.settings add column if not exists rec_keep_days int not null default 3;
create or replace function public.set_rec_keep(days int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'admin' then raise exception '관리자만 가능합니다'; end if;
  update public.settings set rec_keep_days = greatest(1, least(days, 30)) where id = 1;
end $$;
revoke execute on function public.set_rec_keep(int) from public, anon;
grant execute on function public.set_rec_keep(int) to authenticated;
