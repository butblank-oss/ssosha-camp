-- 캠핑수첩 공유 기록 표 (Supabase SQL Editor에서 한 번만 실행)
-- 바로가기: https://supabase.com/dashboard/project/lcynjpiclpedxflfvhns/sql/new
-- 누구나 읽기, 쓰기는 지쏘·시아 이메일만 (RLS: Row Level Security, 줄 단위 권한)

create table if not exists public.camp_note (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.camp_note enable row level security;

drop policy if exists "camp_note 누구나 읽기" on public.camp_note;
create policy "camp_note 누구나 읽기" on public.camp_note
  for select using (true);

drop policy if exists "camp_note 지쏘·시아만 추가" on public.camp_note;
create policy "camp_note 지쏘·시아만 추가" on public.camp_note
  for insert to authenticated
  with check (lower(auth.jwt() ->> 'email') in ('but.blank@gmail.com', 'cjdthf7726@naver.com'));

drop policy if exists "camp_note 지쏘·시아만 고치기" on public.camp_note;
create policy "camp_note 지쏘·시아만 고치기" on public.camp_note
  for update to authenticated
  using (lower(auth.jwt() ->> 'email') in ('but.blank@gmail.com', 'cjdthf7726@naver.com'))
  with check (lower(auth.jwt() ->> 'email') in ('but.blank@gmail.com', 'cjdthf7726@naver.com'));

grant select on public.camp_note to anon, authenticated;
grant insert, update on public.camp_note to authenticated;

-- 다른 기기에서 고친 내용이 바로 보이게 (Realtime: 실시간 알림)
do $$ begin
  alter publication supabase_realtime add table public.camp_note;
exception when duplicate_object then null; end $$;
