const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const avatarFunctions = source.slice(source.indexOf('  function avatarHtml('), source.indexOf('  function compressAvatarFile('));
const heroFunction = source.slice(source.indexOf('  function renderHero('), source.indexOf('  function renderAlertSlot('));
function render(role, settings = false) {
  const hero = { innerHTML: '' };
  const context = {
    currentRole: role, showCoupleSettings: settings,
    state: { couple: { husbandName: '남편', wifeName: '아내', husbandPhoto: '/h.jpg', wifePhoto: '/w.jpg', startDate: '2021-05-22', anniversaryTitle: '기념일' }, status: { husband: { mood: '좋아요', message: '안녕', updatedAt: '방금' }, wife: { mood: '좋아요', message: '안녕', updatedAt: '방금' } } },
    escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;'),
    roleLabel: value => value === 'husband' ? '남편' : '아내',
    partnerRole: () => role === 'husband' ? 'wife' : 'husband',
    calcDaysTogether: () => ({ days: 1, nextLabel: '기념일' }),
    document: { getElementById: () => hero }
  };
  vm.runInNewContext(avatarFunctions + heroFunction + '\nrenderHero();', context);
  return hero.innerHTML;
}
for (const role of ['husband', 'wife']) {
  test(`${role}: only own avatar is editable, partner avatar opens full-size view`, () => {
    const partner = role === 'husband' ? 'wife' : 'husband';
    for (const settings of [false, true]) {
      const html = render(role, settings);
      assert.ok(html.includes(`data-avatar-input="${role}"`));
      assert.ok(!html.includes(`data-avatar-input="${partner}"`));
      assert.ok(html.includes(`data-avatar-view="${partner}"`));
      assert.ok(!html.includes(`data-avatar-edit="${partner}"`));
      assert.ok(html.includes('width:72px;height:72px;'));
      assert.ok(html.includes('width:92px;height:92px;'));
      if (settings) assert.match(html, new RegExp(`name="${partner}Name"[^>]+disabled`));
    }
  });
}
