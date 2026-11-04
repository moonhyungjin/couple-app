/**
 * Vercel Serverless Function — /api/state
 * Vercel Storage(Supabase 연동) 환경변수를 자동으로 감지해
 * 별도 SQL 설정 없이도 부부 앱 상태(state.json)를 클라우드에 영구 저장·조회합니다.
 */

const BUCKET_ID = "couple-app-state";
const OBJECT_PATH = "state.json";
const ROOM_CODE = "our-secret-home-2026";

function resolveSupabaseCredentials() {
  const env = process.env || {};
  const keys = Object.keys(env);

  // 1) Supabase URL 찾기 (명시적 변수명 -> 값에 .supabase.co 포함된 변수 -> POSTGRES_URL에서 추출)
  let url =
    env.SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.STORAGE_SUPABASE_URL ||
    env.STORAGE_NEXT_PUBLIC_SUPABASE_URL ||
    env.STORAGE_URL ||
    "";

  if (!url) {
    for (const k of keys) {
      const val = String(env[k] || "").trim();
      if (/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(val)) {
        url = val;
        break;
      }
    }
  }

  if (!url) {
    // POSTGRES_URL 등에서 project ref 추출 (예: postgres.xxxx:password@... 또는 db.xxxx.supabase.co)
    for (const k of keys) {
      const val = String(env[k] || "");
      const m1 = val.match(/postgres\.([a-z0-9]{15,25}):/i);
      const m2 = val.match(/db\.([a-z0-9]{15,25})\.supabase\.co/i);
      const ref = (m1 && m1[1]) || (m2 && m2[1]);
      if (ref) {
        url = `https://${ref}.supabase.co`;
        break;
      }
    }
  }

  // 2) Service Role Key 우선, 없으면 Anon Key 찾기
  let key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    env.STORAGE_SERVICE_ROLE_KEY ||
    "";

  if (!key) {
    for (const k of keys) {
      if (
        (k.endsWith("SERVICE_ROLE_KEY") || k.endsWith("SECRET_KEY")) &&
        env[k]
      ) {
        key = env[k];
        break;
      }
    }
  }

  if (!key) {
    key =
      env.SUPABASE_ANON_KEY ||
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      env.STORAGE_SUPABASE_ANON_KEY ||
      env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      env.STORAGE_ANON_KEY ||
      "";
  }

  if (!key) {
    for (const k of keys) {
      if (
        (k.endsWith("ANON_KEY") || k.endsWith("PUBLISHABLE_KEY")) &&
        env[k]
      ) {
        key = env[k];
        break;
      }
    }
  }

  return {
    url: String(url || "").replace(/\/+$/, ""),
    key: String(key || "").trim()
  };
}

function authHeaders(key, extra) {
  return Object.assign(
    {
      apikey: key,
      Authorization: `Bearer ${key}`
    },
    extra || {}
  );
}

async function readStateFromSupabase(url, key) {
  // A. Storage 버킷에서 먼저 조회
  try {
    const storageRes = await fetch(
      `${url}/storage/v1/object/${BUCKET_ID}/${OBJECT_PATH}?t=${Date.now()}`,
      {
        method: "GET",
        headers: authHeaders(key, { "Cache-Control": "no-store" })
      }
    );
    if (storageRes.ok) {
      const data = await storageRes.json();
      if (data && typeof data === "object") return data;
    }
  } catch (_) {}

  // B. couple_room 테이블에서 조회 (폴백)
  try {
    const restRes = await fetch(
      `${url}/rest/v1/couple_room?room_code=eq.${encodeURIComponent(ROOM_CODE)}&select=state`,
      {
        method: "GET",
        headers: authHeaders(key, { Accept: "application/json" })
      }
    );
    if (restRes.ok) {
      const rows = await restRes.json();
      if (Array.isArray(rows) && rows[0] && rows[0].state) {
        return rows[0].state;
      }
    }
  } catch (_) {}

  return {};
}

async function writeStateToSupabase(url, key, stateObj) {
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
  const upRes = await fetch(`${url}/storage/v1/object/${BUCKET_ID}/${OBJECT_PATH}`, {
    method: "POST",
    headers: authHeaders(key, {
      "Content-Type": "application/json",
      "x-upsert": "true"
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
      room_code: ROOM_CODE,
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
    if (req.method === "GET") {
      const state = await readStateFromSupabase(url, key);
      res.statusCode = 200;
      res.end(JSON.stringify(state || {}));
      return;
    }

    if (req.method === "POST") {
      const bodyObj =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};
      const result = await writeStateToSupabase(url, key, bodyObj);
      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method Not Allowed" }));
  } catch (err) {
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        ok: false,
        error: err && err.message ? err.message : "Internal Server Error"
      })
    );
  }
};
