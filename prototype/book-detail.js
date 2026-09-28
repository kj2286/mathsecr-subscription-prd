import {bookAnswerCount} from './library-catalog.js';

export function bookAccessState(db, store) {
  const owned = store.ownedDBs().find(item => item.id === db.id);
  const subscribed = store.isActive('db');
  const excluded = db.rentalEligible === false;
  const active = Boolean(owned?.active || subscribed && !excluded);
  return {
    owned, subscribed, active, excluded,
    remainingPurchaseCount: owned?.remainingPurchaseCount ?? owned?.remainingCount ?? db.count,
    label: active ? (owned?.mode === 'permanent' ? (owned.remainingCount ? '부분 영구 구매' : '영구 소유') : subscribed && !excluded ? 'DB 구독으로 이용 가능' : '일부 영구 구매 · 구독 종료') : owned ? '구독 종료' : excluded ? '개별 구매 교재' : 'DB 구독 대상',
    action: active ? (owned ? '나만의 DB에서 열기' : '나만의 DB에 추가') : excluded ? '바로 구매' : '월 49,000원 DB 구독',
  };
}

export function bookInfoBody(ctx, db, state) {
  const {esc, money, icon} = ctx.ui;
  const available = ctx.questions.filter(q => q.dbId === db.id).length;
  const benefit = state.active
    ? state.owned ? '이 교재를 나만의 DB에 추가했어요.' : 'DB 구독으로 이 교재를 이용할 수 있어요.'
    : state.excluded ? '이 교재는 개별 구매로 이용할 수 있어요.' : '필요한 교재를 개별 구매하거나 DB 구독으로 이용하세요.';
  const description = state.active
    ? state.owned ? '보관한 교재는 나만의 DB에서 다시 찾을 수 있습니다.' : '학년을 따로 등록하지 않아도 이용할 수 있습니다. 자주 쓰는 교재는 나만의 DB에 보관하세요.'
    : state.excluded ? 'DB 월 구독에 포함되지 않는 교재입니다.' : '구독하면 전체 학년의 구독 대상 교재를 이용할 수 있습니다. 개별 구매한 교재는 구독이 끝나도 계속 이용할 수 있습니다.';
  const fields = [
    ['학년 · 과목', [db.grade, db.subject].filter(Boolean).join(' · ')],
    ['브랜드', db.publisher],
    ['문항 · 해설', `문제 ${db.count} / 해설 ${bookAnswerCount(db) ?? '미확인'}`],
    ['평균 난이도', db.avg ?? '미확인'],
    ['파일 형식', db.format || '교재 DB'],
    ...(db.range ? [['범위', db.range]] : []),
    [db.sample ? '개별 구매 예시 가격' : '상점 개별 구매 가격', db.price == null ? '미확인' : money(db.price)],
    ...(state.owned ? [['보관 문항', `${state.owned.ownedCount}/${db.count}문항`], ['현재 이용 가능', `${state.owned.availableCount ?? state.owned.ownedCount}/${db.count}문항`], ['영구 구매', `${state.owned.permanentCount ?? 0}/${db.count}문항`]] : []),
  ];
  return `<div class="book-info-benefit"><strong>${icon('book')}${benefit}</strong><p>${description}</p></div>
    <div class="book-info-layout"><div class="book-info-copy"><div class="book-info-badges"><span class="badge ${state.active ? 'blue' : ''}">${state.label}</span>${db.sample ? '<span class="badge">예시 교재</span>' : ''}</div><h3>${esc(db.title)}</h3><dl class="details">${fields.map(([label, value]) => `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')}</dl></div><figure class="book-info-cover">${db.preview ? `<img src="${esc(db.preview)}" alt="${esc(db.title)} 표지">` : icon('book')}<figcaption>표지 미리보기</figcaption></figure></div>
    <p class="book-info-sample">${db.sample ? '기능 설명용 예시 교재입니다. 실제 판매 상품이 아닙니다. ' : ''}${available ? `이 화면에서는 문항 표본 ${available}개를 확인할 수 있습니다.` : '이 교재는 표지·파일정보·구독·나만의 DB 추가까지 체험할 수 있습니다. 본문 문항은 포함하지 않았습니다.'}</p>
    ${!state.active && state.owned ? '<p class="book-info-expired">DB 구독이 끝났습니다. 다시 구독하면 보관한 이용권을 복구할 수 있어요.</p>' : ''}`;
}

export function openBookInfo(ctx, id, {acquireAll}) {
  const db = ctx.dbs.find(item => item.id === id);
  if (!db) return;
  const {openModal, closeModal, esc, icon} = ctx.ui;
  const state = bookAccessState(db, ctx.store);
  const reopen = () => openBookInfo(ctx, id, {acquireAll});
  const purchase = action => ctx.purchaseDB ? ctx.purchaseDB(id, action) : action === 'buy' && acquireAll(id, 'permanent');
  const canPurchase = state.remainingPurchaseCount > 0;
  const partialPurchase = (state.owned?.permanentCount ?? (state.owned?.mode === 'permanent' ? state.owned.ownedCount : 0)) > 0;
  const showPreview = () => openModal({
    title: '교재 표지 미리보기',
    body: `<div class="book-cover-preview">${db.preview ? `<img src="${esc(db.preview)}" alt="${esc(db.title)} 표지">` : icon('book')}<h3>${esc(db.title)}</h3><p>${db.sample ? '동작 확인용 예시 표지입니다.' : '운영 서비스에서 확인한 교재 표지입니다.'}</p></div>`,
    footer: '<button class="btn" data-book-back>파일정보로 돌아가기</button>',
    onMount: modal => { modal.querySelector('[data-book-back]').onclick = reopen; },
  });
  openModal({
    title: '교재 DB 파일정보', wide: true, body: bookInfoBody(ctx, db, state),
    footer: `<button class="btn" data-book-preview>표지 미리보기</button>${canPurchase ? '<button class="btn book-info-cart" data-book-cart>담기</button>' : ''}${canPurchase && !(state.excluded && !state.active) ? `<button class="btn" data-book-remaining>${partialPurchase ? `나머지 ${state.remainingPurchaseCount}문항 영구 구매` : '바로 구매'}</button>` : ''}${state.active && !state.subscribed && !state.excluded && canPurchase ? '<button class="btn" data-book-subscribe>월 49,000원 DB 구독</button>' : ''}<button class="btn primary" data-book-action>${state.action}</button>`,
    onMount: modal => {
      modal.querySelector('[data-book-preview]').onclick = showPreview;
      const cart = modal.querySelector('[data-book-cart]');
      if (cart) cart.onclick = () => purchase('cart');
      modal.querySelector('[data-book-subscribe]')?.addEventListener('click', () => ctx.subscribe('db', reopen));
      modal.querySelector('[data-book-remaining]')?.addEventListener('click', () => purchase('buy'));
      modal.querySelector('[data-book-action]').onclick = () => {
        if (state.active && state.owned) { closeModal(); ctx.go(`mydb/db/${id}`); return; }
        if (state.excluded) { purchase('buy'); return; }
        if (!state.subscribed) { ctx.subscribe('db', () => acquireAll(id, 'rental')); return; }
        acquireAll(id, 'rental');
      };
    },
  });
}
