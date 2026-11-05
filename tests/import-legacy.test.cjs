const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { importLegacy } = require('../scripts/import-legacy.cjs');
const realFetch = global.fetch;
const space = '10000000-0000-4000-8000-000000000001';
const owner = '20000000-0000-4000-8000-000000000002';
let files, writes;
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
beforeEach(() => {
  const state = { updatedAt: 1, couple: { husbandName: 'H', husbandPhoto: '/api/photo?id=avatar-husband-old' }, memories: [{ photoDataUrl: '/api/photo?id=memory-old' }] };
  files = new Map([
    ['couple-app-state/state.json', Buffer.from(JSON.stringify(state))],
    ['couple-app-state/profile-wife.json', Buffer.from(JSON.stringify({ name: 'W', photo: '/api/photo?id=avatar-wife-old' }))],
    ...['avatar-husband-old', 'avatar-wife-old', 'memory-old'].map(id => ['couple-app-photos/' + id + '.jpg', Buffer.from(id)])
  ]);
  writes = [];
  global.fetch = async (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.pathname === '/rest/v1/couple_spaces') return Response.json(parsed.searchParams.get('owner_id') === 'eq.' + owner ? [{ id: space }] : []);
    const key = parsed.pathname.split('/').slice(4).join('/');
    if (options.method === 'POST') {
      assert.equal(options.headers['x-upsert'], 'false');
      if (files.has(key)) return new Response('exists', { status: 409 });
      writes.push(key); files.set(key, Buffer.from(options.body)); return Response.json({});
    }
    return files.has(key) ? new Response(files.get(key)) : new Response('not found', { status: 404 });
  };
});
after(() => { global.fetch = realFetch; });
test('explicit import copies state, profiles and referenced photos, retaining source and allowing safe rerun', async () => {
  const original = files.get('couple-app-state/state.json');
  const result = await importLegacy(space, owner);
  assert.equal(result.copiedPhotos, 3);
  assert.ok(files.get(`couple-app-state/spaces/${space}/state.json`).equals(original));
  assert.ok(files.get('couple-app-state/state.json').equals(original));
  assert.equal(writes.length, 5);
  await importLegacy(space, owner);
  assert.equal(writes.length, 5);
});
test('import refuses a different owner before copying anything', async () => {
  await assert.rejects(importLegacy(space, space), /소유한 공간/);
  assert.equal(writes.length, 0);
});
test('import refuses to overwrite existing room records', async () => {
  files.set(`couple-app-state/spaces/${space}/state.json`, Buffer.from('{"new":"private"}'));
  await assert.rejects(importLegacy(space, owner), /이미 기록/);
  assert.equal(writes.length, 0);
});
