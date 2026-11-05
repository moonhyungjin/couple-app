-- Supabase SQL Editor에서 한 번 실행. 부부 연결은 서버에서만 변경한다.
create table if not exists public.couple_pair (
  id text primary key check (id = 'home'),
  husband_id uuid not null references auth.users(id),
  wife_id uuid not null references auth.users(id),
  inviter_id uuid not null references auth.users(id),
  invite_hash text,
  invite_expires_at timestamptz,
  linked_at timestamptz,
  check (husband_id <> wife_id),
  check (inviter_id in (husband_id, wife_id))
);
alter table public.couple_pair enable row level security;
revoke all on public.couple_pair from public, anon, authenticated;
grant all on public.couple_pair to service_role;

create or replace function public.manage_couple_pair(
  p_action text, p_actor uuid, p_husband uuid, p_wife uuid, p_hash text
) returns text language plpgsql security definer set search_path = '' as $$
declare
  pair public.couple_pair%rowtype;
begin
  if p_actor is null or p_husband is null or p_wife is null or p_husband = p_wife
    or p_actor not in (p_husband, p_wife) or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then
    return 'invalid';
  end if;
  -- 초대 생성·수락을 한 트랜잭션으로 처리한다. 동시에 요청해도 한 연결만 성립한다.
  perform pg_catalog.pg_advisory_xact_lock(712413025);
  select * into pair from public.couple_pair where id = 'home' for update;
  if found and pair.linked_at is not null then
    if pair.husband_id = p_husband and pair.wife_id = p_wife then return 'linked'; end if;
    return 'invalid';
  end if;
  if p_action = 'invite' then
    insert into public.couple_pair (id, husband_id, wife_id, inviter_id, invite_hash, invite_expires_at)
    values ('home', p_husband, p_wife, p_actor, p_hash, now() + interval '15 minutes')
    on conflict (id) do update set husband_id = excluded.husband_id, wife_id = excluded.wife_id,
      inviter_id = excluded.inviter_id, invite_hash = excluded.invite_hash,
      invite_expires_at = excluded.invite_expires_at;
    return 'invited';
  end if;
  if p_action = 'accept' and pair.husband_id = p_husband and pair.wife_id = p_wife
    and pair.inviter_id <> p_actor and pair.invite_hash = p_hash and pair.invite_expires_at > now() then
    update public.couple_pair set linked_at = now(), invite_hash = null, invite_expires_at = null where id = 'home';
    return 'linked';
  end if;
  return 'invalid';
end;
$$;
revoke all on function public.manage_couple_pair(text, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.manage_couple_pair(text, uuid, uuid, uuid, text) to service_role;
