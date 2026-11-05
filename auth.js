(function () {
  'use strict';
  const callbackParams = new URLSearchParams(location.hash.slice(1));
  const emailConfirmed = callbackParams.has('access_token');
  const confirmationError = callbackParams.has('error_description');
  if (emailConfirmed || confirmationError) history.replaceState(null, '', location.pathname + location.search);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  if ('caches' in window) caches.delete('couple-app-photos-v1').catch(() => {});
  let refreshTask;
  const panel = document.getElementById('loginPanel');
  const message = document.getElementById('loginMessage');
  const pairPanel = document.getElementById('pairPanel');
  const pairMessage = document.getElementById('pairMessage');
  let signedInUser;
  let pairTimer;
  let appStarted = false;
  let inviteExpiresAt = 0;
  let authMode = 'login';
  async function refresh() {
    if (!refreshTask) refreshTask = fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'refresh' })
    }).finally(() => { refreshTask = null; });
    return refreshTask;
  }
  window.coupleFetch = async function (url, options) {
    let response = await fetch(url, options);
    if (response.status === 401) {
      const renewed = await refresh();
      if (renewed.ok) response = await fetch(url, options);
      else { location.reload(); throw new Error('로그인이 필요합니다.'); }
    }
    if (response.status === 403 && appStarted) {
      location.reload();
      throw new Error('계정 연결을 확인해 주세요.');
    }
    return response;
  };
  async function start(user) {
    if (!user.id) throw new Error('계정을 확인할 수 없습니다.');
    signedInUser = user;
    panel.hidden = true;
    pairPanel.hidden = false;
    await checkPair();
    if (!appStarted && !pairTimer) pairTimer = setInterval(() => {
      if (!document.hidden) checkPair().catch(() => { pairMessage.textContent = '연결 상태를 확인하지 못했어요. 잠시 후 다시 확인할게요.'; });
    }, 5000);
  }
  async function checkPair() {
    if (appStarted) return;
    const response = await window.coupleFetch('/api/pair', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '부부 연결을 확인하지 못했어요.');
    if (result.linked) {
      clearInterval(pairTimer);
      pairTimer = null;
      launch({ ...signedInUser, role: result.role, spaceId: result.spaceId });
    } else {
      document.getElementById('pairChoices').hidden = result.hasSpace;
      document.getElementById('pairWaiting').hidden = !result.hasSpace;
      if (result.hasSpace) {
        document.getElementById('pairSpaceName').textContent = result.spaceName;
        document.getElementById('pairRoleLabel').textContent = '내 역할: ' + (result.role === 'husband' ? '남편' : '아내') + ' · 배우자의 참여를 기다리고 있어요.';
      }
      pairMessage.textContent = result.hasSpace ? result.pending ? '배우자가 코드를 입력하면 자동으로 연결돼요.' : '새 초대 코드를 만들어 배우자에게 전달해 주세요.' : '새 공간을 만들거나, 배우자의 초대 코드를 입력해 주세요.';
      if (inviteExpiresAt && Date.now() >= inviteExpiresAt) {
        document.getElementById('pairInvite').hidden = true;
        inviteExpiresAt = 0;
        pairMessage.textContent = '초대 코드가 만료되었어요. 새 코드를 만들어 주세요.';
      }
    }
  }
  function launch(user) {
    if (appStarted) return;
    appStarted = true;
    const accountScope = user.id + ':' + user.spaceId;
    const owner = localStorage.getItem('couple_account_id');
    if (owner !== accountScope) {
      // 공간이 달라지면 이전 로컬 기록을 새 부부 공간에 업로드하지 않는다.
      const legacy = localStorage.getItem('couple_app_mvp_state_v2');
      if (legacy && !owner && !localStorage.getItem('couple_app_legacy_backup_v1')) localStorage.setItem('couple_app_legacy_backup_v1', legacy);
      localStorage.removeItem('couple_app_dirty_v1');
      localStorage.removeItem('couple_app_mvp_state_v2');
    }
    localStorage.setItem('couple_account_id', accountScope);
    window.coupleUser = Object.freeze(user);
    panel.hidden = true;
    pairPanel.hidden = true;
    document.querySelector('.app-shell').hidden = false;
    document.querySelector('.bottom-nav').hidden = false;
    const script = document.createElement('script');
    script.src = './app.js';
    document.body.appendChild(script);
  }
  function setAuthMode(mode) {
    authMode = mode;
    const signup = mode === 'signup';
    document.getElementById('showLogin').setAttribute('aria-pressed', String(!signup));
    document.getElementById('showSignup').setAttribute('aria-pressed', String(signup));
    document.getElementById('passwordConfirmLabel').hidden = !signup;
    const form = document.getElementById('loginForm');
    form.elements.passwordConfirm.required = signup;
    form.elements.password.minLength = signup ? 8 : 0;
    form.elements.password.autocomplete = signup ? 'new-password' : 'current-password';
    form.elements.password.value = '';
    form.elements.passwordConfirm.value = '';
    document.getElementById('loginSubmit').textContent = signup ? '회원가입' : '로그인';
    document.getElementById('authFormTitle').textContent = signup ? '우리의 이야기를 시작해요' : '우리의 하루를 이어볼까요?';
    message.textContent = signup ? '비밀번호는 8자 이상 입력해 주세요. 가입 후 이메일 인증을 진행해요.' : '내 계정으로 로그인해 주세요.';
  }
  document.getElementById('showLogin').addEventListener('click', () => setAuthMode('login'));
  document.getElementById('showSignup').addEventListener('click', () => setAuthMode('signup'));
  document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    const button = event.target.querySelector('button');
    button.disabled = true;
    const requestedMode = authMode;
    message.textContent = requestedMode === 'signup' ? '회원가입 중…' : '로그인 중…';
    try {
      const fields = new FormData(event.target);
      if (requestedMode === 'signup' && fields.get('password') !== fields.get('passwordConfirm')) throw new Error('비밀번호가 서로 일치하지 않아요.');
      const response = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: requestedMode, email: fields.get('email'), password: fields.get('password') })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      event.target.reset();
      if (data.confirmationRequired) {
        setAuthMode('login');
        event.target.elements.email.value = fields.get('email');
        message.textContent = '이메일의 인증 링크를 누른 뒤 로그인해 주세요. 이미 가입했다면 기존 계정으로 로그인해 주세요.';
        return;
      }
      await start(data);
    } catch (err) { message.textContent = err.message || '로그인에 실패했습니다.'; pairMessage.textContent = err.message; }
    finally { button.disabled = false; }
  });
  async function logout() {
    this.disabled = true;
    try {
      const response = await fetch('/api/auth', { method: 'DELETE' });
      if (!response.ok) throw new Error('로그아웃에 실패했습니다. 다시 시도해 주세요.');
      for (const key of ['couple_account_id', 'couple_app_mvp_state_v2', 'couple_app_dirty_v1', 'couple_app_role_v1']) localStorage.removeItem(key);
      location.reload();
    } catch (err) { alert(err.message); this.disabled = false; }
  }
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('pairLogoutBtn').addEventListener('click', logout);
  async function submitPair(body, button) {
    button.disabled = true;
    pairMessage.textContent = '부부 연결 확인 중…';
    try {
      const response = await window.coupleFetch('/api/pair', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.code) {
        document.getElementById('pairInvite').hidden = false;
        document.getElementById('pairInviteCode').textContent = result.code;
        inviteExpiresAt = Date.now() + result.expiresIn * 1000;
        document.getElementById('pairInviteExpiry').textContent = new Date(inviteExpiresAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) + '까지 유효해요.';
      }
      await checkPair();
    } catch (err) { pairMessage.textContent = err.message || '연결하지 못했어요. 다시 시도해 주세요.'; }
    finally { button.disabled = false; }
  }
  document.getElementById('createPairInvite').addEventListener('click', function () { submitPair({ action: 'invite' }, this); });
  document.getElementById('createSpaceForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const fields = new FormData(this);
    submitPair({ action: 'create', name: fields.get('name'), role: fields.get('role') }, this.querySelector('button'));
  });
  document.getElementById('pairAcceptForm').addEventListener('submit', function (event) {
    event.preventDefault();
    submitPair({ action: 'accept', code: new FormData(this).get('code') }, this.querySelector('button'));
  });
  document.getElementById('copyPairInvite').addEventListener('click', async function () {
    try { await navigator.clipboard.writeText(document.getElementById('pairInviteCode').textContent); pairMessage.textContent = '코드를 복사했어요. 배우자에게 전달해 주세요.'; }
    catch (_) { pairMessage.textContent = '위 코드를 길게 눌러 복사해 주세요.'; }
  });
  window.addEventListener('storage', event => {
    if (event.key === 'couple_account_id') location.reload();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) location.reload();
  });
  (async function () {
    try {
      let response = await fetch('/api/auth', { cache: 'no-store' });
      if (response.status === 401) response = await refresh();
      const data = await response.json();
      if (response.ok) await start(data);
      else message.textContent = response.status === 401 ? confirmationError ? '인증 링크가 만료되었거나 유효하지 않아요. 가입 이메일을 확인해 주세요.' : emailConfirmed ? '이메일 인증이 완료됐어요. 가입한 계정으로 로그인해 주세요.' : '각자의 계정으로 로그인하거나 회원가입해 주세요.' : data.error;
    } catch (err) { message.textContent = err.message || '서버에 연결할 수 없습니다. 새로고침해 주세요.'; pairMessage.textContent = message.textContent; }
  })();
})();
