const { config, requireUser, fail } = require('./_auth');
const { authHeaders } = require('./_supabase');

async function pairStatus(userId) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/couple_members?user_id=eq.${encodeURIComponent(userId)}&select=space_id,role`, {
    headers: authHeaders(key, { 'Cache-Control': 'no-store' })
  });
  if (!response.ok) throw fail(503, '부부 연결 설정을 확인해 주세요.');
  const rows = await response.json();
  const member = rows[0];
  if (!member) return { linked: false, hasSpace: false };
  const [spaceRes, membersRes] = await Promise.all([
    fetch(`${url}/rest/v1/couple_spaces?id=eq.${encodeURIComponent(member.space_id)}&select=id,name,owner_id,invite_expires_at`, { headers: authHeaders(key, { 'Cache-Control': 'no-store' }) }),
    fetch(`${url}/rest/v1/couple_members?space_id=eq.${encodeURIComponent(member.space_id)}&select=user_id,role`, { headers: authHeaders(key, { 'Cache-Control': 'no-store' }) })
  ]);
  if (!spaceRes.ok || !membersRes.ok) throw fail(503, '부부 공간을 확인할 수 없습니다.');
  const space = (await spaceRes.json())[0];
  const members = await membersRes.json();
  if (!space || !['husband', 'wife'].includes(member.role)) throw fail(403, '부부 공간을 확인할 수 없습니다.');
  return {
    hasSpace: true, spaceId: space.id, spaceName: space.name, role: member.role,
    linked: members.length === 2 && members.some(m => m.user_id === userId && m.role === member.role) && members.some(m => m.user_id !== userId && m.role !== member.role),
    pending: Date.parse(space.invite_expires_at) > Date.now(),
    invitedByMe: space.owner_id === userId
  };
}
async function requireCouple(req) {
  const user = await requireUser(req);
  const status = await pairStatus(user.id);
  if (!status.linked) throw fail(403, '배우자와 부부 연결을 먼저 완료해 주세요.');
  return { ...user, role: status.role, spaceId: status.spaceId };
}
module.exports = { pairStatus, requireCouple };
