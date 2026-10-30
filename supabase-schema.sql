-- 우리 둘만의 집 (Couple App MVP) — Supabase 무료 플랜용 단일 상태 동기화 테이블
-- 밖에서도 LTE/5G로 남편(Android)과 아내(iPhone)가 실시간 동기화하고 싶을 때
-- Supabase SQL Editor에 그대로 붙여넣고 실행하면 됩니다.

create table if not exists public.couple_room (
  room_code text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 실시간(Realtime) 브로드캐스트 활성화
alter publication supabase_realtime add table public.couple_room;

-- 우리 부부만의 비밀 방 코드 초기 행 생성 (원하는 비밀 코드로 변경 가능)
insert into public.couple_room (room_code, state)
values ('our-secret-home-2026', '{}'::jsonb)
on conflict (room_code) do nothing;

