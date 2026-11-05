const { randomBytes, createHash } = require('node:crypto');
const { config, requireUser, fail } = require('./_auth');
const { authHeaders } = require('./_supabase');
const { pairStatus } = require('./_pair');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const user = await requireUser(req);
    if (req.method === 'GET') {
      const status = await pairStatus(user.id);
      res.end(JSON.stringify(status));
      return;
    }
    if (req.method !== 'POST') throw fail(405, 'Method Not Allowed');
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (!['create', 'invite', 'accept'].includes(body.action)) throw fail(400, '연결 요청을 확인해 주세요.');
    if (body.action === 'create' && (!['husband', 'wife'].includes(body.role) || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 40)) throw fail(400, '공간 이름(40자 이내)과 내 역할을 선택해 주세요.');
    const code = body.action !== 'accept' ? randomBytes(12).toString('hex').toUpperCase() : String(body.code || '').replace(/[\s-]/g, '').toUpperCase();
    if (!/^[0-9A-F]{24}$/.test(code)) throw fail(400, '초대 코드 24자리를 확인해 주세요.');
    const { url, key } = config();
    const response = await fetch(`${url}/rest/v1/rpc/manage_couple_space`, {
      method: 'POST', headers: authHeaders(key, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ p_action: body.action, p_actor: user.id, p_name: body.action === 'create' ? body.name.trim() : null, p_role: body.action === 'create' ? body.role : null, p_hash: createHash('sha256').update(code).digest('hex') })
    });
    if (!response.ok) throw fail(503, '부부 연결을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    const result = await response.json();
    const errors = { already_member: '이미 부부 공간이 있어요. 현재 공간에서 배우자를 초대해 주세요.', self_invite: '내가 만든 코드는 수락할 수 없어요. 배우자에게 전달해 주세요.', full: '이미 두 사람이 연결된 공간이에요.', invalid: '초대 코드가 만료되었거나 일치하지 않습니다. 배우자에게 새 코드를 받아 주세요.', forbidden: '공간을 만든 계정에서 초대 코드를 만들어 주세요.' };
    if (!['invited', 'linked'].includes(result)) throw fail(400, errors[result] || '부부 연결을 완료하지 못했어요.');
    res.end(JSON.stringify({ linked: result === 'linked', ...(result === 'invited' ? { code: code.match(/.{6}/g).join('-'), expiresIn: 900 } : {}) }));
  } catch (err) {
    res.statusCode = err.status || 500;
    res.end(JSON.stringify({ error: err.status ? err.message : '부부 연결 처리에 실패했습니다.' }));
  }
};
