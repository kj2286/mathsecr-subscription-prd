const tiers = {'등급없음':1, '씨앗':1, '새싹':2, '가지':2, '나무':2, '숲':3, '지구':4};
const plans = {bank:{name:'문제은행 구독',price:39000}, db:{name:'DB 구독',price:49000}};
const statuses = {none:'미구독',active:'구독 중',canceling:'해지 예약',expired:'구독 종료'};

function dateText(value) {
  if (!value || !Number.isFinite(Number(value))) return '이용 기간 없음';
  return new Date(Number(value)).toLocaleDateString('ko-KR', {year:'numeric',month:'long',day:'numeric'});
}

function run(ctx, action, message) {
  const result = action();
  if (!result.ok) {ctx.ui.toast(result.error || '요청을 처리하지 못했습니다.'); return false;}
  if (message) ctx.ui.toast(message);
  return true;
}

function confirmAction(ctx, title, body, button, onConfirm) {
  ctx.ui.confirm({title,body,button,onConfirm});
}

function subscriptionPanel(ctx, kind, state) {
  const {esc,money} = ctx.ui;
  const plan = plans[kind];
  const sub = state.subscriptions[kind];
  const active = ctx.store.isActive(kind);
  return `<section class="panel" aria-labelledby="account-plan-${kind}">
    <div class="row"><h2 id="account-plan-${kind}" style="font-size:18px">${plan.name}</h2><span class="grow"></span><span class="badge ${active ? 'blue' : sub.status === 'expired' ? 'orange' : ''}">${statuses[sub.status] || '미구독'}</span></div>
    <div class="price-big">${money(plan.price)}<small> / 월</small></div>
    <p>${kind === 'bank' ? '전체 학년의 문제은행 문항을 골라 문제지에 담습니다. 학년은 검색 조건입니다.' : '전체 학년의 구독 대상 자료 DB를 이용합니다. 학년은 검색 조건이며 구독 제외 자료는 별도입니다.'}</p>
    <dl class="details"><dt>이용 상태</dt><dd>${statuses[sub.status] || '미구독'}</dd><dt>${sub.status === 'expired' ? '종료일' : '이용 기간'}</dt><dd>${sub.expiresAt ? `${dateText(sub.expiresAt)}${active ? '까지' : ''}` : '구독 후 이용할 수 있습니다.'}</dd><dt>이용 범위</dt><dd>${kind === 'bank' ? '전체 학년 문제은행' : '전체 학년의 구독 대상 자료 DB · 제외 자료 별도'}</dd></dl>
    ${sub.status === 'canceling' ? '<div class="notice" style="margin:12px 0;font-size:12px">해지를 예약했습니다. 이용 기간이 끝날 때까지 사용할 수 있습니다.</div>' : sub.status === 'expired' ? '<div class="notice" style="margin:12px 0;font-size:12px">구독이 종료되었습니다. 구매한 문항은 계속 이용할 수 있고, 나머지 문항은 재구독하면 다시 사용할 수 있습니다.</div>' : ''}
    <div class="row" style="flex-wrap:wrap">${active ? `<button class="btn" data-plan-manage="${kind}" data-plan-action="${sub.status === 'canceling' ? 'undo' : 'cancel'}">${sub.status === 'canceling' ? '해지 예약 취소' : '구독 해지 예약'}</button>${kind === 'db' ? '<a class="btn primary" href="#library">자료 DB 찾아보기</a>' : '<a class="btn primary" href="#bank/중1">문항 찾아보기</a>'}` : `<button class="btn primary" data-plan-subscribe="${kind}">${sub.status === 'expired' ? '다시 구독하기' : '구독하기'}</button>`}</div>
  </section>`;
}

function devicePayment(ctx) {
  const state = ctx.store.getState();
  const base = tiers[state.device.tier] || 1;
  const remaining = Math.min(9-state.device.extra, 10-base-state.device.extra);
  if (remaining <= 0) {ctx.ui.toast('등록 가능한 기기는 최대 10대입니다.'); return;}
  ctx.ui.openModal({title:'디바이스 추가',body:`<p>추가 기기 1대당 월 15,000원이며 카드로 결제합니다.</p><dl class="details"><dt>기본 기기</dt><dd>${base}대</dd><dt>추가 이용 중</dt><dd>${state.device.extra}대</dd><dt>추가 가능</dt><dd>${remaining}대</dd></dl><label class="field">추가할 기기 수<select id="account-device-quantity" aria-label="추가할 기기 수">${Array.from({length:remaining},(_,i)=>`<option value="${i+1}">${i+1}대</option>`).join('')}</select></label><div class="price-big"><span id="account-device-price">15,000원</span><small> / 월</small></div><p class="small-note">결제 수단: 카드<br>실제 결제 없이 이 브라우저에서 추가 등록과 기기 제한을 체험합니다.</p><label class="checkbox" style="margin-top:16px"><input id="account-device-agree" type="checkbox">월 이용 금액과 체험 결제를 확인했습니다.</label>`,footer:'<button class="btn" id="account-device-cancel">취소</button><button class="btn primary" id="account-device-pay" disabled>추가하기 · 체험 결제</button>',onMount:dialog=>{
    const quantity = dialog.querySelector('#account-device-quantity');
    const agree = dialog.querySelector('#account-device-agree');
    const pay = dialog.querySelector('#account-device-pay');
    quantity.onchange = () => {dialog.querySelector('#account-device-price').textContent = ctx.ui.money(Number(quantity.value)*15000);};
    agree.onchange = () => {pay.disabled = !agree.checked;};
    dialog.querySelector('#account-device-cancel').onclick = ctx.ui.closeModal;
    pay.onclick = () => {
      if (!agree.checked) return;
      const count = Number(quantity.value);
      const result = ctx.store.addDevices(count);
      if (!result.ok) {ctx.ui.toast(result.error); return;}
      ctx.ui.closeModal(); ctx.ui.toast(`기기 ${count}대를 추가했습니다. 실제 결제는 발생하지 않았습니다.`);
    };
  }});
}

export function requiredDeviceLogouts(state) {
  const limit = Math.min(10, (tiers[state.device.tier] || 1) + state.device.extra);
  return Math.max(0, state.device.sessions.length + 1 - limit);
}

function deviceLoginTime(device) {
  const value = device.loggedInAt || device.loginAt || device.createdAt;
  if (!value || !Number.isFinite(new Date(value).getTime())) return '';
  return new Date(value).toLocaleString('ko-KR');
}

export function replaceDemoDevices(store, ids, name) {
  const state = store.getState();
  const current = new Set(state.device.sessions.map(d => d.id));
  const selected = [...new Set(ids)].filter(id => current.has(id));
  const required = requiredDeviceLogouts(state);
  if (selected.length < required) return {ok:false,error:`로그아웃할 기기를 ${required}대 이상 선택해 주세요.`};
  if (!name?.trim()) return {ok:false,error:'기기 이름을 입력해 주세요.'};
  for (const id of selected) {
    const result = store.logoutDevice(id);
    if (!result.ok) return result;
  }
  return store.loginDevice(name.trim());
}

function deviceLimitDialog(ctx, name) {
  const state = ctx.store.getState();
  const required = requiredDeviceLogouts(state);
  const {esc} = ctx.ui;
  ctx.ui.openModal({title:'등록 가능한 기기 수를 초과했습니다',body:`<p>‘${esc(name)}’ 기기를 등록하려면 기존 기기를 <strong>${required}대 이상</strong> 로그아웃해 주세요.</p><div class="notification-list">${state.device.sessions.map(device=>`<label class="notification"><input type="checkbox" data-replace-device value="${esc(device.id)}"><span><strong>${esc(device.name)}</strong>${device.current?' · 현재 기기':''}<small>${esc(device.ip || '체험 기기')}${deviceLoginTime(device)?` · ${esc(deviceLoginTime(device))}`:''}</small></span></label>`).join('')}</div><p id="account-replace-error" role="alert" style="color:#c43435"></p><p class="small-note">선택한 체험 기기만 목록에서 해제합니다. 실제 운영 계정이나 로그인에는 영향을 주지 않습니다.</p>`,footer:'<button class="btn" id="account-replace-cancel">취소</button><button class="btn primary" id="account-replace-confirm" disabled>선택 기기 로그아웃 후 등록</button>',onMount:dialog=>{
    const selected = () => [...dialog.querySelectorAll('[data-replace-device]:checked')].map(input=>input.value);
    const button = dialog.querySelector('#account-replace-confirm');
    dialog.querySelector('#account-replace-cancel').onclick=ctx.ui.closeModal;
    dialog.querySelectorAll('[data-replace-device]').forEach(input=>input.onchange=()=>{button.disabled=selected().length<required;});
    button.onclick=()=>{
      const result=replaceDemoDevices(ctx.store,selected(),name);
      if(!result.ok){dialog.querySelector('#account-replace-error').textContent=result.error;return;}
      ctx.ui.closeModal();ctx.ui.toast('선택한 기기를 로그아웃하고 새 체험 기기를 등록했습니다.');
    };
  }});
}

function deviceLogin(ctx) {
  ctx.ui.openModal({title:'기기 등록 체험',body:'<p>새 기기를 등록해 허용 기기 수가 적용되는지 확인할 수 있습니다.</p><label class="field">기기 이름<input id="account-device-name" maxlength="40" placeholder="예: 학원 노트북" value="새 체험 기기"></label><p id="account-device-error" role="alert" style="color:#c43435"></p><p class="small-note">실제 로그인이나 접속 정보는 수집하지 않습니다.</p>',footer:'<button class="btn" id="account-login-cancel">취소</button><button class="btn primary" id="account-login-confirm">기기 등록 체험</button>',onMount:dialog=>{
    dialog.querySelector('#account-login-cancel').onclick = ctx.ui.closeModal;
    dialog.querySelector('#account-login-confirm').onclick = () => {
      const name = dialog.querySelector('#account-device-name').value.trim();
      if (!name) {dialog.querySelector('#account-device-error').textContent='기기 이름을 입력해 주세요.'; return;}
      const result = ctx.store.loginDevice(name);
      if (!result.ok) {if(requiredDeviceLogouts(ctx.store.getState())>0){deviceLimitDialog(ctx,name);return;}dialog.querySelector('#account-device-error').textContent=result.error; return;}
      ctx.ui.closeModal(); ctx.ui.toast('체험 기기를 등록했습니다.');
    };
  }});
}

export function renderAccount(container, ctx) {
  const state = ctx.store.getState();
  const {esc,icon,money} = ctx.ui;
  const base = tiers[state.device.tier] || 1;
  const limit = Math.min(10,base+state.device.extra);
  container.innerHTML = `<main class="workspace account-wrap"><header class="heading-row"><div><h1>마이페이지</h1><p>구독과 등록 기기를 한곳에서 관리하세요.</p></div><a class="btn actions" href="#notifications">${icon('bell')}새 시험지 알림 관리</a></header><div class="two-cols">${subscriptionPanel(ctx,'bank',state)}${subscriptionPanel(ctx,'db',state)}</div>
    <div class="section-heading"><h2>디바이스 관리</h2><span class="grow"></span><button class="btn primary" id="account-add-device" ${limit >= 10 ? 'disabled' : ''}>${icon('plus')}디바이스 추가</button></div>
    <section class="panel"><div class="row" style="flex-wrap:wrap"><span class="badge blue">${esc(state.device.tier)}</span><strong>등록 기기 ${state.device.sessions.length} / ${limit}대</strong><span class="grow"></span><span class="small-note">기본 ${base}대 + 추가 ${state.device.extra}대</span></div><p>최대 10대까지 등록할 수 있습니다. 추가 기기는 1대당 월 15,000원이며 카드 결제만 지원합니다.</p><div class="notification-list">${state.device.sessions.length ? state.device.sessions.map(device=>`<div class="notification">${icon('monitor')}<div style="min-width:0;overflow-wrap:anywhere"><strong>${esc(device.name)}</strong>${device.current?' <span class="badge blue">현재 기기</span>':''}<small>${esc(device.ip || '체험 기기')}${deviceLoginTime(device)?` · ${esc(deviceLoginTime(device))}`:''}</small></div><button class="btn small" data-device-logout="${esc(device.id)}">로그아웃</button></div>`).join('') : '<div class="empty">등록한 기기가 없습니다.</div>'}</div><p class="small-note" style="margin-bottom:0">이 목록은 프로토타입의 체험 기기입니다. 실제 계정의 로그인 상태에는 영향을 주지 않습니다.</p></section>
    <details class="panel" style="margin-top:22px"><summary style="cursor:pointer;font-weight:600">이용 상태 체험</summary><p>구독 종료와 회원 등급별 기기 제한을 직접 확인할 수 있습니다. 변경 내용은 이 브라우저에만 저장됩니다.</p><div class="two-cols"><section><h3>구독 종료</h3><p>구독을 종료하면 렌트 문항의 일부가 흐려지고 출제·내려받기가 제한됩니다. 영구 구매한 문항은 계속 이용할 수 있습니다.</p><div class="row" style="flex-wrap:wrap">${Object.entries(plans).map(([kind,plan])=>`<button class="btn" data-expire-plan="${kind}" ${!ctx.store.isActive(kind)?'disabled':''}>${plan.name} 종료 체험</button>`).join('')}</div></section><section><h3>기기 등록 제한</h3><label class="field" style="margin:14px 0">회원 등급<select id="account-device-tier">${Object.entries(tiers).map(([tier,count])=>`<option value="${tier}" ${tier===state.device.tier?'selected':''}>${tier} · 기본 ${count}대</option>`).join('')}</select></label><button class="btn" id="account-login-device">${icon('plus')}기기 등록 체험</button><p class="small-note" style="margin-bottom:0">등급없음·씨앗 1대 / 새싹·가지·나무 2대 / 숲 3대 / 지구 4대</p></section></div></details>
    <div class="section-heading"><h2>이용 내역</h2><span class="badge">체험 내역</span></div><section class="panel">${state.purchases.length ? `<div class="notification-list">${state.purchases.slice(0,30).map(purchase=>`<div class="notification"><div><strong>${purchase.kind==='bank'?'문제은행 구독':purchase.kind==='db'?(purchase.dbId?'DB 이용권':'DB 구독'):purchase.kind==='device'?`추가 기기 ${Number(purchase.quantity)||0}대`:purchase.mode==='permanent'?'문항 영구 구매':'구독 문항 이용'}</strong><small>${dateText(purchase.date)}${purchase.mode?` · ${purchase.mode==='permanent'?'영구 소유':'구독 이용'}`:''}</small></div><span class="grow"></span><strong>${purchase.price==null?'금액 정보 없음':money(purchase.price)}</strong></div>`).join('')}</div>` : '<div class="empty">아직 이용 내역이 없습니다.</div>'}</section><p class="sample-note">구독·결제·기기 관리는 프로토타입 체험입니다. 실제 결제나 운영 계정 변경 없이 현재 브라우저에 저장됩니다.</p></main>`;
  container.querySelectorAll('[data-plan-subscribe]').forEach(button=>button.onclick=()=>ctx.subscribe(button.dataset.planSubscribe));
  container.querySelectorAll('[data-plan-manage]').forEach(button=>button.onclick=()=>{
    const kind = button.dataset.planManage;
    if (button.dataset.planAction==='undo') {
      confirmAction(ctx,'해지 예약을 취소할까요?',`${plans[kind].name}의 해지 예약을 취소하고 구독 중 상태로 되돌립니다.`,'예약 취소',()=>run(ctx,()=>ctx.store.undoCancel(kind),'해지 예약을 취소했습니다.'));
    } else {
      const expires = ctx.store.getState().subscriptions[kind].expiresAt;
      confirmAction(ctx,'구독 해지를 예약할까요?',`${dateText(expires)}까지 계속 이용할 수 있습니다. 이용 기간이 끝나면 구독 문항은 보관되며 출제·내려받기가 제한됩니다.`,'해지 예약',()=>run(ctx,()=>ctx.store.cancelPlan(kind),'구독 해지를 예약했습니다.'));
    }
  });
  container.querySelector('#account-add-device').onclick=()=>devicePayment(ctx);
  container.querySelector('#account-login-device').onclick=()=>deviceLogin(ctx);
  container.querySelectorAll('[data-device-logout]').forEach(button=>button.onclick=()=>{
    const device = ctx.store.getState().device.sessions.find(item=>item.id===button.dataset.deviceLogout);
    if (!device) return;
    confirmAction(ctx,'이 기기를 로그아웃할까요?',`‘${device.name}’ 기기를 체험 목록에서 해제합니다. 실제 운영 계정의 로그인 상태는 유지됩니다.`,'로그아웃',()=>run(ctx,()=>ctx.store.logoutDevice(device.id),'체험 기기를 로그아웃했습니다.'));
  });
  container.querySelector('#account-device-tier').onchange=event=>{
    const next = event.target.value;
    const result = ctx.store.setDeviceTier(next);
    if (!result.ok) {event.target.value=ctx.store.getState().device.tier;ctx.ui.toast(result.error);return;}
    ctx.ui.toast(`${next} 등급의 기기 제한을 적용했습니다.`);
  };
  container.querySelectorAll('[data-expire-plan]').forEach(button=>button.onclick=()=>{
    const kind = button.dataset.expirePlan;
    confirmAction(ctx,'구독 종료 상태를 체험할까요?',`${plans[kind].name}을 종료 상태로 바꿉니다. 담은 문항은 보관되며 재구독하면 복구됩니다.`,'종료 체험',()=>run(ctx,()=>ctx.store.expirePlan(kind),'구독 종료 상태로 변경했습니다.'));
  });
}

export function renderNotifications(container, ctx) {
  const state = ctx.store.getState();
  const {esc,icon} = ctx.ui;
  container.innerHTML = `<main class="workspace account-wrap"><header class="heading-row"><div><h1>알림</h1><p>새 시험지 알림과 관심지역을 관리하세요.</p></div><a class="btn actions" href="#library">수학비서 DB</a></header><div class="two-cols"><section class="panel"><div class="row"><h2 style="font-size:18px">새 시험지 알림 관리</h2><span class="badge blue">${state.schoolAlerts.length}개</span></div><p>구독 여부와 관계없이 새 시험지 알림을 확인하고 해제할 수 있습니다.</p>${state.schoolAlerts.length?state.schoolAlerts.map(school=>`<div class="stat">${icon('bell')}<div class="grow" style="overflow-wrap:anywhere"><strong>${esc(school)}</strong><div class="small-note">새 시험지 등록 알림 설정</div></div><button class="btn small" type="button" data-remove-school="${esc(school)}" aria-label="${esc(school)} 새 시험지 알림 해제">알림 해제</button></div>`).join(''):'<div class="empty"><h3>알림을 설정한 학교가 없습니다.</h3><p>학교 검색 결과에서 알림 버튼을 눌러 보세요.</p><a class="btn" href="#library/school/중1">학교 찾아보기</a></div>'}</section><section class="panel"><div class="row"><h2 style="font-size:18px">관심지역</h2><span class="badge">${state.regionFavorites.length}개</span></div><p>저장한 시도·시군구를 최근 저장 순서로 확인합니다. 새 시험지 알림과 별도로 관리합니다.</p>${state.regionFavorites.length?state.regionFavorites.map(region=>`<div class="stat">${icon('star')}<strong class="grow" style="overflow-wrap:anywhere">${esc(region)}</strong><button class="icon-btn" data-remove-region="${esc(region)}" aria-label="${esc(region)} 즐겨찾기 해제" title="즐겨찾기 해제">${icon('trash')}</button></div>`).join(''):'<div class="empty"><h3>저장한 관심지역이 없습니다.</h3><p>내신 DB 검색에서 시도와 시·군·구를 선택해 저장해 주세요.</p></div>'}</section></div><div class="section-heading"><h2>알림 내역</h2><span class="badge">${state.notifications.length}개</span></div><section class="panel"><div class="notification-list">${state.notifications.length?state.notifications.map(notification=>`<div class="notification">${icon('bell')}<div style="min-width:0;overflow-wrap:anywhere"><strong>${esc(notification.title)}</strong><small>${dateText(notification.date)}</small></div><button class="icon-btn" data-remove-notification="${esc(notification.id)}" aria-label="${esc(notification.title)} 알림 삭제" title="알림 삭제">${icon('trash')}</button></div>`).join(''):'<div class="empty">새로운 알림이 없습니다.</div>'}</div></section><p class="sample-note">알림 설정과 내역은 현재 브라우저에 저장됩니다. 실제 DB 등록 감지와 푸시 발송은 연결하지 않은 체험 화면입니다.</p></main>`;
  container.querySelectorAll('[data-remove-school]').forEach(button=>button.onclick=()=>{
    const school = button.dataset.removeSchool;
    confirmAction(ctx,'새 시험지 알림을 해제할까요?',`‘${school}’의 새 시험지 등록 알림 설정을 해제합니다.`,'해제',()=>{
      if (ctx.store.getState().schoolAlerts.includes(school)) run(ctx,()=>ctx.store.toggleSchool(school),'새 시험지 알림을 해제했습니다.');
    });
  });
  container.querySelectorAll('[data-remove-region]').forEach(button=>button.onclick=()=>{
    const region = button.dataset.removeRegion;
    confirmAction(ctx,'관심지역을 해제할까요?',`‘${region}’을 관심지역에서 삭제합니다.`,'해제',()=>{
      if (ctx.store.getState().regionFavorites.includes(region)) run(ctx,()=>ctx.store.removeRegionFavorite(region),'관심지역을 해제했습니다.');
    });
  });
  container.querySelectorAll('[data-remove-notification]').forEach(button=>button.onclick=()=>{
    confirmAction(ctx,'알림을 삭제할까요?','이 알림을 삭제합니다. 새 시험지 알림 설정은 유지됩니다.','삭제',()=>run(ctx,()=>ctx.store.dismissNotification(button.dataset.removeNotification),'알림을 삭제했습니다.'));
  });
}
