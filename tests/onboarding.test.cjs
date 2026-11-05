const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../auth.js'), 'utf8');
const markup = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
async function setup({ loggedIn = false, hash = '', cached = null } = {}) {
  const elements = new Map([...markup.matchAll(/id="([^"]+)"/g)].map(match => [match[1], { hidden: /^(pairPanel|pairWaiting|pairInvite|passwordConfirmLabel)$/.test(match[1]), textContent: '', events: {}, disabled: false,
    addEventListener(type, handler) { this.events[type] = handler; }, setAttribute(name, value) { this[name] = value; }, querySelector() { return this.button || (this.button = { disabled: false }); } }]));
  const loginForm = elements.get('loginForm');
  loginForm.elements = Object.fromEntries(['email', 'password', 'passwordConfirm'].map(name => [name, { value: '', required: false }]));
  loginForm.reset = () => Object.values(loginForm.elements).forEach(field => { field.value = ''; });
  elements.get('createSpaceForm').elements = { name: { value: '우리집' }, role: { value: 'wife' } };
  elements.get('pairAcceptForm').elements = { code: { value: 'ABCDEF-123456-ABCDEF-123456' } };
  const storage = new Map(cached ? [['couple_app_mvp_state_v2', cached]] : []);
  const scripts = [], calls = [], timers = [];
  let status = { hasSpace: false, linked: false };
  const shell = { hidden: true }, nav = { hidden: true };
  const context = { URLSearchParams, Date, console, navigator: {}, location: { hash, pathname: '/', search: '', reload() {} }, history: { replaceState(...args) { context.cleanedUrl = args[2]; } },
    document: { hidden: false, getElementById(id) { assert.ok(elements.has(id), 'element exists: ' + id); return elements.get(id); }, querySelector: selector => selector === '.app-shell' ? shell : nav, createElement: () => ({}), body: { appendChild: script => scripts.push(script) } },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setInterval: handler => { timers.push(handler); return timers.length; }, clearInterval() {}, addEventListener() {},
    FormData: class { constructor(form) { this.fields = Object.fromEntries(Object.entries(form.elements).map(([key, field]) => [key, field.value])); } get(key) { return this.fields[key] || null; } },
    fetch: async (url, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ url, body });
      if (url === '/api/auth') {
        if (!options.method) return Response.json(loggedIn ? { id: 'new-id' } : {}, { status: loggedIn ? 200 : 401 });
        if (body.action === 'refresh') return Response.json({}, { status: 401 });
        if (body.action === 'signup') return Response.json({ confirmationRequired: true });
        if (body.action === 'login') return Response.json({ id: 'new-id' });
      }
      if (url === '/api/pair') {
        if (!options.method) return Response.json(status);
        status = { hasSpace: true, linked: false, role: 'wife', spaceId: 'room-id', spaceName: '우리집', pending: true, invitedByMe: true };
        return Response.json({ linked: false, code: 'ABCDEF-123456-ABCDEF-123456', expiresIn: 900 });
      }
      throw new Error('Unexpected request ' + url);
    }
  };
  context.window = context;
  vm.runInNewContext(source, context);
  await new Promise(setImmediate);
  async function fire(id, type = 'click') {
    const el = elements.get(id);
    await el.events[type].call(el, { target: el, preventDefault() {} });
    await new Promise(setImmediate);
  }
  return { elements, context, scripts, calls, storage, fire, shell, setStatus(value) { status = value; }, poll: async () => { await timers[0](); await new Promise(setImmediate); } };
}
test('signup validates matching passwords and switches to login after email confirmation instruction', async () => {
  const ui = await setup();
  await ui.fire('showSignup');
  const form = ui.elements.get('loginForm');
  form.elements.email.value = 'new@example.com'; form.elements.password.value = 'password'; form.elements.passwordConfirm.value = 'different';
  await ui.fire('loginForm', 'submit');
  assert.match(ui.elements.get('loginMessage').textContent, /일치하지/);
  assert.equal(ui.calls.filter(c => c.body?.action === 'signup').length, 0);
  form.elements.passwordConfirm.value = 'password';
  await ui.fire('loginForm', 'submit');
  assert.equal(ui.elements.get('passwordConfirmLabel').hidden, true);
  assert.match(ui.elements.get('loginMessage').textContent, /인증 링크/);
  assert.equal(form.elements.email.value, 'new@example.com');
  assert.equal(form.elements.password.value, '');
  assert.equal(ui.scripts.length, 0);
});
test('login opens create or accept choices and app loads only after spouse joins', async () => {
  const ui = await setup();
  const form = ui.elements.get('loginForm');
  form.elements.email.value = 'new@example.com'; form.elements.password.value = 'password';
  await ui.fire('loginForm', 'submit');
  assert.equal(ui.elements.get('pairPanel').hidden, false);
  assert.equal(ui.elements.get('pairChoices').hidden, false);
  assert.equal(ui.shell.hidden, true);
  await ui.fire('createSpaceForm', 'submit');
  assert.equal(ui.calls.find(c => c.body?.action === 'create').body.role, 'wife');
  assert.equal(ui.elements.get('pairChoices').hidden, true);
  assert.equal(ui.elements.get('pairWaiting').hidden, false);
  assert.equal(ui.elements.get('pairInviteCode').textContent, 'ABCDEF-123456-ABCDEF-123456');
  assert.equal(ui.scripts.length, 0);
  ui.setStatus({ hasSpace: true, linked: true, role: 'wife', spaceId: 'room-id' });
  await ui.poll();
  assert.equal(ui.scripts.length, 1);
  assert.equal(ui.context.coupleUser.role, 'wife');
  assert.equal(ui.context.coupleUser.spaceId, 'room-id');
  assert.equal(ui.shell.hidden, false);
});
test('email confirmation credentials are removed from browser URL before onboarding', async () => {
  const ui = await setup({ hash: '#access_token=private-token&type=signup' });
  assert.equal(ui.context.cleanedUrl, '/');
  assert.match(ui.elements.get('loginMessage').textContent, /인증이 완료/);
});
test('old local state is backed up and never uploaded into a newly joined room', async () => {
  const ui = await setup({ loggedIn: true, cached: '{"private":"old room"}' });
  ui.setStatus({ hasSpace: true, linked: true, role: 'husband', spaceId: 'new-room' });
  await ui.poll();
  assert.equal(ui.storage.get('couple_app_mvp_state_v2'), undefined);
  assert.equal(ui.storage.get('couple_app_legacy_backup_v1'), '{"private":"old room"}');
  assert.equal(ui.storage.get('couple_account_id'), 'new-id:new-room');
});
