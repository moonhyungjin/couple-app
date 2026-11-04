/**
 * Supabase 접속 정보 공용 모듈 (파일명이 _로 시작해서 Vercel API 경로로 노출되지 않음)
 */

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

// 읽기 실패를 "데이터 없음"으로 착각하면 폰이 빈 서버라고 판단해 자기 데이터로 덮어씁니다.
// 그래서 진짜 "없음"(404 등)일 때만 {}를 돌려주고, 그 외 오류는 throw 합니다.
module.exports = { resolveSupabaseCredentials, authHeaders };
