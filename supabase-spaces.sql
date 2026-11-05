-- 직접 회원가입 + 부부별 공간. 기존 couple_pair 테이블과 이전 데이터는 삭제하지 않는다.
-- Vercel Query에서도 한 명령으로 실행한다. Read-only를 끄고 파일 전체를 실행한다.
DO $migration$
BEGIN
create table if not exists public.couple_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  owner_id uuid not null unique references auth.users(id),
  invite_hash text unique,
  invite_expires_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.couple_members (
  user_id uuid primary key references auth.users(id),
  space_id uuid not null references public.couple_spaces(id),
  role text not null check (role in ('husband', 'wife')),
  joined_at timestamptz not null default now(),
  unique (space_id, role)
);
alter table public.couple_spaces enable row level security;
alter table public.couple_members enable row level security;
revoke all on public.couple_spaces, public.couple_members from public, anon, authenticated;
grant all on public.couple_spaces, public.couple_members to service_role;

create or replace function public.manage_couple_space(
  p_action text, p_actor uuid, p_name text, p_role text, p_hash text
) returns text language plpgsql security definer set search_path = '' as $$
declare
  membership public.couple_members%rowtype;
  space public.couple_spaces%rowtype;
begin
  if p_actor is null or p_hash is null or p_hash !~ '^[0-9a-f]{64}$'
    or not exists (select 1 from auth.users where id = p_actor and email_confirmed_at is not null) then
    return 'invalid';
  end if;
  -- 가입/생성/수락을 직렬화하여 한 계정이 두 공간에 가입하거나 세 명이 되는 것을 막는다.
  perform pg_catalog.pg_advisory_xact_lock(712413026);
  select * into membership from public.couple_members where user_id = p_actor;
  if p_action = 'create' then
    if membership.user_id is not null then return 'already_member'; end if;
    if p_name is null or char_length(btrim(p_name)) not between 1 and 40
      or p_role is null or p_role not in ('husband', 'wife') then return 'invalid'; end if;
    insert into public.couple_spaces(name, owner_id, invite_hash, invite_expires_at)
      values (btrim(p_name), p_actor, p_hash, now() + interval '15 minutes') returning * into space;
    insert into public.couple_members(user_id, space_id, role) values (p_actor, space.id, p_role);
    return 'invited';
  elsif p_action = 'invite' then
    if membership.user_id is null then return 'forbidden'; end if;
    select * into space from public.couple_spaces where id = membership.space_id for update;
    if space.owner_id <> p_actor then return 'forbidden'; end if;
    if (select count(*) from public.couple_members where space_id = space.id) >= 2 then return 'full'; end if;
    update public.couple_spaces set invite_hash = p_hash, invite_expires_at = now() + interval '15 minutes' where id = space.id;
    return 'invited';
  elsif p_action = 'accept' then
    select * into space from public.couple_spaces where invite_hash = p_hash and invite_expires_at > now() for update;
    if space.id is null then return 'invalid'; end if;
    if space.owner_id = p_actor then return 'self_invite'; end if;
    if membership.user_id is not null then return 'already_member'; end if;
    if (select count(*) from public.couple_members where space_id = space.id) >= 2 then return 'full'; end if;
    insert into public.couple_members(user_id, space_id, role)
      select p_actor, space.id, case role when 'husband' then 'wife' else 'husband' end
      from public.couple_members where space_id = space.id and user_id = space.owner_id;
    if not found then return 'invalid'; end if;
    update public.couple_spaces set invite_hash = null, invite_expires_at = null where id = space.id;
    return 'linked';
  end if;
  return 'invalid';
end;
$$;
revoke all on function public.manage_couple_space(text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.manage_couple_space(text, uuid, text, text, text) to service_role;
END;
$migration$;
