/**
 * Vercel Serverless Function — /api/state
 * Vercel Storage(Supabase 연동) 환경변수를 자동으로 감지해
 * 별도 SQL 설정 없이도 부부 앱 상태(state.json)를 클라우드에 영구 저장·조회합니다.
 */

const BUCKET_ID = "couple-app-state";

const { resolveSupabaseCredentials, authHeaders } = require("./_supabase");
const { requireCouple } = require("./_pair");

// 프로필은 사람별 별도 파일로 저장하여 동시에 저장해도 상대 프로필을 덮어쓰지 않는다.
async function readProfile(url, key, spaceId, role) {
  const response = await fetch(`${url}/storage/v1/object/${BUCKET_ID}/spaces/${spaceId}/profile-${role}.json?t=${Date.now()}`, {
    headers: authHeaders(key, { 'Cache-Control': 'no-store' })
  });
  if (response.ok) return response.json();
  const message = await response.text();
  if (response.status === 404 || (response.status === 400 && /not.?found|404/i.test(message))) return null;
  throw new Error('Profile read failed');
}

async function withProfiles(url, key, spaceId, state) {
  const profiles = await Promise.all(['husband', 'wife'].map(role => readProfile(url, key, spaceId, role)));
  profiles.forEach((profile, index) => {
    if (!profile) return;
    const role = index === 0 ? 'husband' : 'wife';
    state.couple = state.couple || {};
    state.couple[role + 'Name'] = profile.name;
    state.couple[role + 'Photo'] = profile.photo;
  });
  return state;
}

async function readStateFromSupabase(url, key, spaceId) {
  let lastError = null;

  // A. Storage 버킷에서 먼저 조회
  try {
    const storageRes = await fetch(
      `${url}/storage/v1/object/${BUCKET_ID}/spaces/${spaceId}/state.json?t=${Date.now()}`,
      {
        method: "GET",
        headers: authHeaders(key, { "Cache-Control": "no-store" })
      }
    );
    if (storageRes.ok) {
      const data = await storageRes.json();
      if (data && typeof data === "object") return data;
    } else {
      const text = await storageRes.text().catch(() => "");
      const notFound =
        storageRes.status === 404 ||
        (storageRes.status === 400 && /not.?found|404/i.test(text));
      if (!notFound) lastError = new Error(`storage read ${storageRes.status}: ${text}`);
    }
  } catch (err) {
    lastError = err;
  }

  // B. couple_room 테이블에서 조회 (폴백)
  try {
    const restRes = await fetch(
      `${url}/rest/v1/couple_room?room_code=eq.${encodeURIComponent(spaceId)}&select=state`,
      {
        method: "GET",
        headers: authHeaders(key, { Accept: "application/json" })
      }
    );
    if (restRes.ok) {
      const rows = await restRes.json();
      if (Array.isArray(rows) && rows[0] && rows[0].state && rows[0].state.updatedAt) {
        return rows[0].state;
      }
    }
  } catch (_) {}

  if (lastError) throw lastError;
  return {};
}

async function writeStateToSupabase(url, key, spaceId, stateObj) {
  const payload = JSON.stringify(stateObj);

  // 버킷이 없으면 자동 생성 시도 (이미 있으면 무시)
  try {
    await fetch(`${url}/storage/v1/bucket`, {
      method: "POST",
      headers: authHeaders(key, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        id: BUCKET_ID,
        name: BUCKET_ID,
        public: false
      })
    });
  } catch (_) {}

  // Storage 버킷에 state.json 업서트(덮어쓰기)
  const upRes = await fetch(`${url}/storage/v1/object/${BUCKET_ID}/spaces/${spaceId}/state.json`, {
    method: "POST",
    headers: authHeaders(key, {
      "Content-Type": "application/json",
      "x-upsert": "true",
      // CDN에 캐시되면 배우자 폰이 옛날 데이터를 받아갈 수 있으므로 캐시 끔
      "Cache-Control": "no-cache"
    }),
    body: payload
  });

  if (upRes.ok) {
    return { ok: true, mode: "supabase-storage" };
  }

  // 만약 Storage 권한이 없는 Anon Key만 있다면 couple_room 테이블에 업서트 시도
  const tableRes = await fetch(`${url}/rest/v1/couple_room`, {
    method: "POST",
    headers: authHeaders(key, {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates"
    }),
    body: JSON.stringify({
      room_code: spaceId,
      state: stateObj,
      updated_at: new Date().toISOString()
    })
  });

  if (tableRes.ok) {
    return { ok: true, mode: "supabase-table" };
  }

  const errText = await upRes.text().catch(() => "Storage write failed");
  throw new Error(errText);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const { url, key } = resolveSupabaseCredentials();
  if (!url || !key) {
    res.statusCode = 503;
    res.end(
      JSON.stringify({
        ok: false,
        error: "Supabase environment variables not connected yet"
      })
    );
    return;
  }

  try {
    const user = await requireCouple(req);
    if (req.method === "GET") {
      const state = await withProfiles(url, key, user.spaceId, await readStateFromSupabase(url, key, user.spaceId));
      res.statusCode = 200;
      res.end(JSON.stringify(state || {}));
      return;
    }

    if (req.method === "POST") {
      const bodyObj =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};
      const previous = await readStateFromSupabase(url, key, user.spaceId);
      const current = await withProfiles(url, key, user.spaceId, JSON.parse(JSON.stringify(previous)));
      const partner = user.role === 'husband' ? 'wife' : 'husband';
      if (!bodyObj || typeof bodyObj !== 'object' || Array.isArray(bodyObj) || !bodyObj.couple) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid state' }));
        return;
      }
      if (current.couple && ['Name', 'Photo'].some(field => (bodyObj.couple[partner + field] || '') !== (current.couple[partner + field] || ''))) {
        res.statusCode = 403;
        res.end(JSON.stringify({ error: '배우자의 프로필은 수정할 수 없습니다.' }));
        return;
      }
      const profile = { name: bodyObj.couple[user.role + 'Name'], photo: bodyObj.couple[user.role + 'Photo'] || '' };
      if (typeof profile.name !== 'string' || typeof profile.photo !== 'string') {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid profile' }));
        return;
      }
      // 기존 프로필은 마이그레이션용으로 보존하고, 새 프로필은 본인 전용 파일에만 쓴다.
      for (const role of ['husband', 'wife']) {
        for (const field of ['Name', 'Photo']) {
          bodyObj.couple[role + field] = previous.couple?.[role + field] || (field === 'Photo' ? '' : role === 'husband' ? '남편' : '아내');
        }
      }
      const result = await writeStateToSupabase(url, key, user.spaceId, bodyObj);
      const profileRes = await fetch(`${url}/storage/v1/object/${BUCKET_ID}/spaces/${user.spaceId}/profile-${user.role}.json`, {
        method: 'POST', headers: authHeaders(key, { 'Content-Type': 'application/json', 'x-upsert': 'true', 'Cache-Control': 'no-cache' }),
        body: JSON.stringify(profile)
      });
      if (!profileRes.ok) throw new Error('Profile save failed');
      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method Not Allowed" }));
  } catch (err) {
    res.statusCode = err.status || 500;
    res.end(
      JSON.stringify({
        ok: false,
        error: err && err.message ? err.message : "Internal Server Error"
      })
    );
  }
};
