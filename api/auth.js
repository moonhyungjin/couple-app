const { config, cookies, checkOrigin, setSession, requireUser, fail } = require('./_auth');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    checkOrigin(req);
    const { url, key, authKey } = config();
    if (req.method === 'DELETE') {
      const token = cookies(req).couple_access;
      if (token) await fetch(`${url}/auth/v1/logout`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}` } });
      setSession(req, res, null);
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method === 'GET') {
      const user = await requireUser(req);
      res.end(JSON.stringify(user));
      return;
    }
    if (req.method !== 'POST') throw fail(405, 'Method Not Allowed');
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (body.action === 'signup') {
      if (!authKey) throw fail(503, '회원가입 설정을 확인해 주세요.');
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) {
        throw fail(400, '이메일과 비밀번호(8~128자)를 확인해 주세요.');
      }
      const response = await fetch(`${url}/auth/v1/signup`, {
        method: 'POST', headers: { apikey: authKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: body.password })
      });
      if (!response.ok) throw fail(response.status === 429 ? 429 : 400, response.status === 429 ? '요청이 많습니다. 잠시 후 다시 시도해 주세요.' : '회원가입을 완료하지 못했어요. 이메일과 비밀번호를 확인하거나 기존 계정으로 로그인해 주세요.');
      const result = await response.json();
      if (result.access_token && result.user?.id) {
        setSession(req, res, result);
        res.end(JSON.stringify({ id: result.user.id, confirmationRequired: false }));
      } else {
        res.end(JSON.stringify({ confirmationRequired: true }));
      }
      return;
    }
    if (body.action && !['login', 'refresh'].includes(body.action)) throw fail(400, '잘못된 요청입니다.');
    const refresh = body.action === 'refresh';
    const payload = refresh ? { refresh_token: cookies(req).couple_refresh } : { email: body.email, password: body.password };
    if (refresh ? !payload.refresh_token : typeof payload.email !== 'string' || typeof payload.password !== 'string') throw fail(401, '이메일과 비밀번호를 확인해 주세요.');
    const response = await fetch(`${url}/auth/v1/token?grant_type=${refresh ? 'refresh_token' : 'password'}`, {
      method: 'POST', headers: { apikey: authKey || key, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (!response.ok) throw fail(response.status === 429 ? 429 : 401, response.status === 429 ? '잠시 후 다시 로그인해 주세요.' : '이메일과 비밀번호를 확인해 주세요.');
    const session = await response.json();
    if (!session.user?.id || !session.access_token) throw fail(401, '로그인을 확인할 수 없습니다.');
    setSession(req, res, session);
    res.end(JSON.stringify({ id: session.user.id }));
  } catch (err) {
    res.statusCode = err.status || 500;
    res.end(JSON.stringify({ error: err.status ? err.message : '로그인 처리에 실패했습니다.' }));
  }
};
