const { resolveSupabaseCredentials } = require('./_supabase');

function fail(status, message) { return Object.assign(new Error(message), { status }); }
function config() {
  const credentials = resolveSupabaseCredentials();
  if (!credentials.url || !credentials.key) {
    throw fail(503, '로그인 계정 설정이 필요합니다.');
  }
  const env = process.env;
  const authKey = env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.STORAGE_SUPABASE_ANON_KEY || env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY || env.STORAGE_ANON_KEY || '';
  return { ...credentials, authKey };
}
function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(v => {
    const i = v.indexOf('=');
    return i < 0 ? ['', ''] : [v.slice(0, i).trim(), v.slice(i + 1)];
  }));
}
function checkOrigin(req) {
  if (['GET', 'HEAD'].includes(req.method)) return;
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || new URL(origin).host !== host) throw fail(403, '허용되지 않은 요청입니다.');
}
function setSession(req, res, session) {
  const secure = req.headers['x-forwarded-proto'] === 'https' || !!req.socket?.encrypted;
  const suffix = `; HttpOnly; SameSite=Strict; Path=/api${secure ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', [
    `couple_access=${session?.access_token || ''}; Max-Age=${session ? session.expires_in || 3600 : 0}${suffix}`,
    `couple_refresh=${session?.refresh_token || ''}; Max-Age=${session ? 2592000 : 0}${suffix}`
  ]);
}
async function requireUser(req) {
  checkOrigin(req);
  const { url, key } = config();
  const token = cookies(req).couple_access;
  if (!token) throw fail(401, '로그인이 필요합니다.');
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw fail(response.status >= 500 ? 503 : 401, '로그인을 확인할 수 없습니다.');
  const user = await response.json();
  if (!user.id) throw fail(401, '로그인이 필요합니다.');
  return { id: user.id };
}
module.exports = { config, cookies, checkOrigin, setSession, requireUser, fail };
