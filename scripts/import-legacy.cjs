/** Explicit administrator import; never called by signup or the public API. */
const { resolveSupabaseCredentials, authHeaders } = require('../api/_supabase');
const { timingSafeEqual } = require('node:crypto');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function importLegacy(spaceId, ownerId) {
  if (!UUID.test(spaceId || '') || !UUID.test(ownerId || '')) throw new Error('공간 UUID와 소유자 UUID를 명시해 주세요.');
  const { url, key } = resolveSupabaseCredentials();
  if (!url || !key) throw new Error('Supabase 서버 환경변수가 필요합니다.');
  const headers = authHeaders(key);
  const target = await fetch(`${url}/rest/v1/couple_spaces?id=eq.${spaceId}&owner_id=eq.${ownerId}&select=id`, { headers });
  if (!target.ok || (await target.json()).length !== 1) throw new Error('해당 계정이 소유한 공간을 찾지 못했습니다.');
  async function read(bucket, name) {
    const response = await fetch(`${url}/storage/v1/object/${bucket}/${name}`, { headers });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    const message = await response.text();
    if (response.status === 404 || response.status === 400 && /not.?found|404/i.test(message)) return null;
    throw new Error('Storage 읽기 실패: ' + response.status);
  }
  let state = await read('couple-app-state', 'state.json');
  if (!state) {
    const response = await fetch(`${url}/rest/v1/couple_room?room_code=eq.our-secret-home-2026&select=state`, { headers });
    if (!response.ok) throw new Error('기존 상태를 확인할 수 없습니다.');
    const previous = (await response.json())[0]?.state;
    if (previous?.updatedAt) state = Buffer.from(JSON.stringify(previous));
  }
  if (!state) throw new Error('이전 공용 데이터를 찾지 못했습니다.');
  const data = JSON.parse(state.toString('utf8'));
  if (!data || typeof data !== 'object' || !data.couple) throw new Error('이전 데이터 형식을 확인해 주세요.');
  const profiles = await Promise.all(['husband', 'wife'].map(role => read('couple-app-state', `profile-${role}.json`)));
  const photoIds = new Set();
  function collect(value) {
    if (typeof value === 'string' && value.startsWith('/api/photo?')) {
      const id = new URL(value, 'https://local.test').searchParams.get('id');
      if (id && /^[a-zA-Z0-9_-]{4,80}$/.test(id)) photoIds.add(id);
    } else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  }
  collect(data);
  profiles.forEach(profile => { if (profile) collect(JSON.parse(profile.toString('utf8'))); });
  async function copy(bucket, name, bytes, type) {
    const destination = `spaces/${spaceId}/${name}`;
    const existing = await read(bucket, destination);
    if (existing) {
      if (existing.length === bytes.length && timingSafeEqual(existing, bytes)) return;
      throw new Error('대상 공간에 다른 데이터가 있어 덮어쓰기를 중단합니다: ' + name);
    }
    const response = await fetch(`${url}/storage/v1/object/${bucket}/${destination}`, {
      method: 'POST', headers: authHeaders(key, { 'Content-Type': type, 'x-upsert': 'false', 'Cache-Control': 'no-cache' }), body: bytes
    });
    if (!response.ok) throw new Error('복사 실패: ' + name + ' (' + response.status + ')');
  }
  // 빈 공간에서만 실행한다. 원본은 보존하고 동일한 복사본은 재사용한다.
  const current = await read('couple-app-state', `spaces/${spaceId}/state.json`);
  if (current && !current.equals(state)) throw new Error('대상 공간에 이미 기록이 있습니다. 자동으로 덮어쓰지 않습니다.');
  for (const id of photoIds) {
    const bytes = await read('couple-app-photos', id + '.jpg');
    if (!bytes) throw new Error('원본 사진을 찾을 수 없습니다: ' + id);
    await copy('couple-app-photos', id + '.jpg', bytes, 'image/jpeg');
  }
  for (let index = 0; index < profiles.length; index++) {
    if (profiles[index]) await copy('couple-app-state', `profile-${index === 0 ? 'husband' : 'wife'}.json`, profiles[index], 'application/json');
  }
  await copy('couple-app-state', 'state.json', state, 'application/json');
  return { copiedPhotos: photoIds.size, spaceId };
}
if (require.main === module) {
  importLegacy(process.argv[2], process.argv[3]).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { importLegacy };
