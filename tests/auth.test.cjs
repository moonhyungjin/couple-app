const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const auth = require('../api/auth');
const state = require('../api/state');
const photo = require('../api/photo');
const pair = require('../api/pair');
const realFetch = global.fetch;
const SPACE = '10000000-0000-4000-8000-000000000001';
const OTHER = '20000000-0000-4000-8000-000000000002';
const initial = { updatedAt: 1, couple: { husbandName: 'H', wifeName: 'W', husbandPhoto: 'h.jpg', wifePhoto: 'w.jpg' }, todos: [] };
const scoped = (name, space = SPACE) => `spaces/${space}/${name}`;
let objects, writes, memberships, spaces, rpcResult, rpcRequests, signupResult, authRequests;
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.SUPABASE_ANON_KEY = 'public-test-key';
beforeEach(() => {
  objects = new Map([[scoped('state.json'), structuredClone(initial)], [scoped('state.json', OTHER), { updatedAt: 2, secret: 'other couple' }]]);
  writes = [];
  memberships = new Map([
    ['husband-id', { user_id: 'husband-id', space_id: SPACE, role: 'husband' }],
    ['wife-id', { user_id: 'wife-id', space_id: SPACE, role: 'wife' }],
    ['other-husband-id', { user_id: 'other-husband-id', space_id: OTHER, role: 'husband' }],
    ['other-wife-id', { user_id: 'other-wife-id', space_id: OTHER, role: 'wife' }]
  ]);
  spaces = new Map([
    [SPACE, { id: SPACE, name: 'Our home', owner_id: 'husband-id', invite_expires_at: new Date(Date.now() + 900000).toISOString() }],
    [OTHER, { id: OTHER, name: 'Other home', owner_id: 'other-husband-id' }]
  ]);
  rpcResult = 'invited'; rpcRequests = []; authRequests = [];
  signupResult = { id: 'new-id' };
  global.fetch = async (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.pathname === '/rest/v1/couple_members') {
      const user = parsed.searchParams.get('user_id')?.slice(3);
      const room = parsed.searchParams.get('space_id')?.slice(3);
      return Response.json(user ? (memberships.has(user) ? [memberships.get(user)] : []) : [...memberships.values()].filter(m => m.space_id === room));
    }
    if (parsed.pathname === '/rest/v1/couple_spaces') {
      const room = parsed.searchParams.get('id').slice(3);
      return Response.json(spaces.has(room) ? [spaces.get(room)] : []);
    }
    if (url.endsWith('/rest/v1/rpc/manage_couple_space')) {
      rpcRequests.push(JSON.parse(options.body));
      return Response.json(rpcResult);
    }
    if (url.endsWith('/auth/v1/user')) {
      const token = options.headers.Authorization.replace('Bearer ', '');
      return Response.json({ id: token + '-id' }, { status: token === 'expired' ? 401 : 200 });
    }
    if (url.includes('/auth/v1/token')) {
      const body = JSON.parse(options.body);
      if (body.password === 'wrong') return Response.json({}, { status: 400 });
      return Response.json({ user: { id: body.email === 'new@example.com' ? 'new-id' : 'wife-id' }, access_token: 'wife', refresh_token: 'refresh', expires_in: 3600 });
    }
    if (url.endsWith('/auth/v1/signup')) {
      authRequests.push({ body: JSON.parse(options.body), headers: options.headers });
      return Response.json(signupResult);
    }
    if (url.endsWith('/auth/v1/logout')) return new Response(null, { status: 204 });
    if (url.endsWith('/storage/v1/bucket')) return Response.json({});
    if (url.includes('/storage/v1/object/')) {
      const name = parsed.pathname.split('/').slice(5).join('/');
      if (options.method === 'POST') {
        writes.push({ name, options });
        if (options.headers['x-upsert'] === 'false' && objects.has(name)) return new Response('exists', { status: 409 });
        objects.set(name, typeof options.body === 'string' ? JSON.parse(options.body) : options.body);
        return Response.json({});
      }
      return objects.has(name) ? Response.json(objects.get(name)) : new Response('not found', { status: 404 });
    }
    if (url.includes('/rest/v1/couple_room?')) return Response.json([]);
    throw new Error('Unexpected fetch ' + url);
  };
});
after(() => { global.fetch = realFetch; });
async function call(handler, { method = 'GET', role = 'husband', body, origin = 'https://app.test', url = '/api/state' } = {}) {
  const req = { method, url, body, headers: { host: 'app.test', origin, 'x-forwarded-proto': 'https', cookie: role ? `couple_access=${role}` : '' } };
  req[Symbol.asyncIterator] = async function* () { yield Buffer.from('photo'); };
  const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(value) { this.body = value; } };
  await handler(req, res);
  return res;
}
test('anonymous and expired sessions cannot read or write state', async () => {
  for (const role of ['', 'expired']) for (const method of ['GET', 'POST']) assert.equal((await call(state, { role, method, body: initial })).statusCode, 401);
  assert.equal(writes.length, 0);
});
test('new accounts may log in but cannot read a couple space before joining', async () => {
  const login = await call(auth, { method: 'POST', body: { email: 'new@example.com', password: 'password', role: 'husband' } });
  assert.equal(login.statusCode, 200);
  assert.deepEqual(JSON.parse(login.body), { id: 'new-id' });
  assert.deepEqual(JSON.parse((await call(pair, { role: 'new' })).body), { linked: false, hasSpace: false });
  assert.equal((await call(state, { role: 'new' })).statusCode, 403);
});
test('cross-origin writes are denied', async () => {
  assert.equal((await call(state, { method: 'POST', body: initial, origin: 'https://evil.test' })).statusCode, 403);
  assert.equal(writes.length, 0);
});
test('both roles are forbidden from changing partner names and photos', async () => {
  for (const role of ['husband', 'wife']) for (const field of ['Name', 'Photo']) {
    const body = structuredClone(initial);
    body.couple[(role === 'husband' ? 'wife' : 'husband') + field] = 'tampered';
    assert.equal((await call(state, { role, method: 'POST', body })).statusCode, 403);
  }
  assert.equal(writes.length, 0);
});
test('own profile persists only in its room and GET overlays both profiles', async () => {
  const body = structuredClone(initial); body.couple.husbandName = 'New H'; body.couple.husbandPhoto = 'new-h.jpg';
  assert.equal((await call(state, { method: 'POST', body })).statusCode, 200);
  objects.set(scoped('profile-wife.json'), { name: 'New W', photo: 'new-w.jpg' });
  const result = JSON.parse((await call(state)).body);
  assert.deepEqual(result.couple, { husbandName: 'New H', husbandPhoto: 'new-h.jpg', wifeName: 'New W', wifePhoto: 'new-w.jpg' });
  assert.equal(objects.get(scoped('state.json')).couple.wifeName, 'W');
  assert.ok(writes.every(w => w.name.startsWith(`spaces/${SPACE}/`)));
});
test('login exposes no role override and tokens stay in HttpOnly cookies', async () => {
  const result = await call(auth, { method: 'POST', body: { email: 'wife@example.com', password: 'test', role: 'husband' } });
  assert.deepEqual(JSON.parse(result.body), { id: 'wife-id' });
  assert.ok(result.headers['Set-Cookie'].every(c => c.includes('HttpOnly') && c.includes('Secure') && c.includes('SameSite=Strict')));
});
test('signup uses the public key and returns email confirmation without exposing a session', async () => {
  const result = await call(auth, { method: 'POST', body: { action: 'signup', email: 'new@example.com', password: 'password', role: 'husband' } });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), { confirmationRequired: true });
  assert.equal(result.headers['Set-Cookie'], undefined);
  assert.deepEqual(authRequests[0].body, { email: 'new@example.com', password: 'password' });
  assert.equal(authRequests[0].headers.apikey, 'public-test-key');
});
test('signup handles projects with email confirmation disabled', async () => {
  signupResult = { user: { id: 'new-id' }, access_token: 'new', refresh_token: 'new-refresh', expires_in: 3600 };
  const result = await call(auth, { method: 'POST', body: { action: 'signup', email: 'new@example.com', password: 'password' } });
  assert.deepEqual(JSON.parse(result.body), { id: 'new-id', confirmationRequired: false });
  assert.equal(result.headers['Set-Cookie'].length, 2);
});
test('invalid signup is rejected without calling the provider', async () => {
  for (const body of [{ email: 'bad', password: 'password' }, { email: 'new@example.com', password: 'short' }]) assert.equal((await call(auth, { method: 'POST', body: { action: 'signup', ...body } })).statusCode, 400);
  assert.equal(authRequests.length, 0);
});
test('signup fails closed without the public Auth key', async () => {
  delete process.env.SUPABASE_ANON_KEY;
  try { assert.equal((await call(auth, { method: 'POST', body: { action: 'signup', email: 'new@example.com', password: 'password' } })).statusCode, 503); }
  finally { process.env.SUPABASE_ANON_KEY = 'public-test-key'; }
});
test('photo reads require linked login and partner avatar uploads are rejected', async () => {
  assert.equal((await call(photo, { role: '', url: '/api/photo?id=avatar-wife-test' })).statusCode, 401);
  assert.equal((await call(photo, { method: 'POST', url: '/api/photo?id=avatar-wife-test' })).statusCode, 403);
  assert.equal(writes.length, 0);
});
test('existing photo bytes cannot be overwritten', async () => {
  objects.set(scoped('old-photo.jpg'), 'original');
  assert.equal((await call(photo, { method: 'POST', url: '/api/photo?id=old-photo' })).statusCode, 502);
  assert.equal(objects.get(scoped('old-photo.jpg')), 'original');
});
test('other couples cannot read or overwrite this room through guessed room or photo IDs', async () => {
  objects.set(scoped('secret-photo.jpg'), { secret: true });
  const result = await call(state, { role: 'other-husband', url: `/api/state?spaceId=${SPACE}` });
  assert.equal(JSON.parse(result.body).secret, 'other couple');
  assert.equal((await call(photo, { role: 'other-husband', url: `/api/photo?id=secret-photo&spaceId=${SPACE}` })).statusCode, 404);
  const body = structuredClone(initial); body.spaceId = OTHER;
  assert.equal((await call(state, { method: 'POST', body })).statusCode, 200);
  assert.equal(objects.get(scoped('state.json', OTHER)).secret, 'other couple');
});
test('legacy global state is never assigned to a new room automatically', async () => {
  objects.delete(scoped('state.json'));
  objects.set('state.json', { updatedAt: 1, secret: 'legacy' });
  assert.deepEqual(JSON.parse((await call(state)).body), {});
});
test('incorrect passwords receive no session cookies', async () => {
  const result = await call(auth, { method: 'POST', body: { email: 'wife@example.com', password: 'wrong' } });
  assert.equal(result.statusCode, 401); assert.equal(result.headers['Set-Cookie'], undefined);
});
test('logout clears both session cookies', async () => {
  const result = await call(auth, { method: 'DELETE' });
  assert.equal(result.statusCode, 200); assert.ok(result.headers['Set-Cookie'].every(c => c.includes('Max-Age=0')));
});
test('local server protects APIs and does not expose source or stored data', async () => {
  const server = require('../server.cjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await realFetch(base + '/')).status, 200);
    assert.equal((await realFetch(base + '/api/state')).status, 401);
    for (const path of ['/server.cjs', '/api/_supabase.js', '/data/couple-state.json', '/.git/config', '/api/stream']) assert.equal((await realFetch(base + path)).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('space creators wait for their spouse before accessing data or photos', async () => {
  memberships.delete('wife-id');
  for (const role of ['husband', 'wife']) {
    assert.equal((await call(state, { role })).statusCode, 403);
    assert.equal((await call(photo, { role, url: '/api/photo?id=old-photo' })).statusCode, 403);
  }
  const status = JSON.parse((await call(pair)).body);
  assert.equal(status.hasSpace, true); assert.equal(status.linked, false); assert.equal(status.role, 'husband');
});
test('space creation uses verified actor and validates name and role', async () => {
  assert.equal((await call(pair, { method: 'POST', body: { action: 'create', name: 'home', role: 'invalid' } })).statusCode, 400);
  assert.equal(rpcRequests.length, 0);
  const result = await call(pair, { role: 'new', method: 'POST', body: { action: 'create', name: ' Our home ', role: 'wife', actor: 'husband-id' } });
  assert.equal(result.statusCode, 200); assert.equal(rpcRequests[0].p_actor, 'new-id');
  assert.equal(rpcRequests[0].p_name, 'Our home'); assert.equal(rpcRequests[0].p_role, 'wife');
});
test('invite requires login and stores a hash instead of the original code', async () => {
  assert.equal((await call(pair, { role: '', method: 'POST', body: { action: 'invite' } })).statusCode, 401);
  const result = await call(pair, { method: 'POST', body: { action: 'invite', actor: 'wife-id' } });
  const data = JSON.parse(result.body);
  assert.match(data.code, /^[A-F0-9]{6}(-[A-F0-9]{6}){3}$/); assert.equal(data.expiresIn, 900);
  assert.equal(rpcRequests[0].p_actor, 'husband-id');
  assert.equal(rpcRequests[0].p_hash, createHash('sha256').update(data.code.replaceAll('-', '')).digest('hex'));
});
test('invalid, expired, self, full and duplicate memberships never return success', async () => {
  assert.equal((await call(pair, { method: 'POST', body: { action: 'accept', code: 'bad' } })).statusCode, 400);
  assert.equal(rpcRequests.length, 0);
  for (const failure of ['invalid', 'self_invite', 'full', 'already_member', 'forbidden']) {
    rpcResult = failure;
    const result = await call(pair, { method: 'POST', body: { action: 'accept', code: 'ABCDEF-123456-ABCDEF-123456' } });
    assert.equal(result.statusCode, 400); assert.equal(JSON.parse(result.body).linked, undefined);
  }
});
test('accept forwards only signed-in identity and normalized code, never a requested role or room', async () => {
  rpcResult = 'linked';
  const result = await call(pair, { role: 'new', method: 'POST', body: { action: 'accept', code: 'abcdef-123456 abcdef-123456', actor: 'husband-id', role: 'husband', spaceId: OTHER } });
  assert.deepEqual(JSON.parse(result.body), { linked: true });
  assert.equal(rpcRequests[0].p_actor, 'new-id'); assert.equal(rpcRequests[0].p_role, null); assert.equal(rpcRequests[0].spaceId, undefined);
});
