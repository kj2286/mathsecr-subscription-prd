export const BOOK_BRANDS = ['SYNC모의고사','아름다운샘','모킹버드','수비프레스','수심달 (NE능률)','씨에스엠17','봉샘스쿨','교과서 또는 교사용'].map(label=>({id:label,label,publisher:label}));
const folderIcon = () => '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M3 5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>';
const gradeName = grade => `${grade.startsWith('중')?'중학교':'고등학교'} ${grade.slice(1)}학년`;
const sectionLink = (href,label,icon,active) => `<a class="lh-section-link ${active?'is-active':''}" href="${href}" ${active?'aria-current="page"':''}>${icon}<span>${label}</span></a>`;

export function bookBrandTree(ctx) {
  if (Array.isArray(ctx.bookBrands) && ctx.bookBrands.length) return ctx.bookBrands;
  return BOOK_BRANDS;
}
export function brandTreeHTML(ctx,selected) {
  const {esc,icon}=ctx.ui;
  const rows=(items,depth=0)=>items.map(item=>`<div class="lh-brand-item" style="--lh-brand-depth:${depth}"><button type="button" data-book-brand="${esc(item.id)}" class="${selected===item.id?'is-active':''}" ${selected===item.id?'aria-current="true"':''}>${icon(item.children?.length?'folder':'book')}<span>${esc(item.label)}</span></button>${item.children?.length?`<div class="lh-brand-children">${rows(item.children,depth+1)}</div>`:''}</div>`).join('');
  return `<div class="lh-brand-tree" aria-label="교재 브랜드"><button type="button" data-book-brand="" class="${!selected?'is-active':''}">${icon('book')}<span>전체</span></button>${rows(bookBrandTree(ctx))}</div>`;
}
export function librarySidebar(ctx,{section='overview',kind='root',grade='',query='',brand=''}={}) {
  const {esc,icon}=ctx.ui,state=ctx.store.getState();
  const materials=section==='materials',bank=section==='bank',compact=ctx.getVariant?.()==='b';
  return `<aside class="context-sidebar lh-sidebar"><a class="lh-sidebar-title" href="#library">수학비서 DB ${icon('chevron-left')}</a>
    <form id="side-search-form" class="lh-side-search"><input class="sidebar-search" id="side-search" value="${esc(query)}" placeholder="수학비서 DB 전체 검색" aria-label="수학비서 DB 전체 검색"><button type="submit" aria-label="전체 검색">${icon('search')}</button></form>
    <nav class="lh-navigation" aria-label="수학비서 DB 탐색">
      ${sectionLink('#library','전체 보기',icon('db'),section==='overview')}
      <div class="lh-nav-section"><a class="lh-nav-parent ${materials?'is-open':''}" href="#library/materials">${folderIcon()}<span>자료 DB</span>${icon('chevron-down')}</a>
        ${sectionLink('#library/school','내신시험지 DB',icon('file'),materials&&kind==='school'&&(compact||!grade))}
        ${!compact&&materials&&kind==='school'?`<div class="lh-subgrades">${ctx.grades.map(g=>`<a href="#library/school/${g}" class="${g===grade?'is-active':''}" ${g===grade?'aria-current="page"':''}>${folderIcon()}<span>${g}</span></a>`).join('')}</div>`:''}
        ${sectionLink('#library/book','교재 DB',icon('book'),materials&&kind==='book')}
      </div>
      <div class="lh-nav-section"><a class="lh-nav-parent ${bank?'is-open':''}" href="#bank">${icon('bank')}<span>문제은행</span>${compact?'':icon('chevron-down')}</a>${compact?'':`<div class="lh-subgrades">${ctx.grades.map(g=>`<a href="#bank/${g}" class="${bank&&g===grade?'is-active':''}" ${bank&&g===grade?'aria-current="page"':''}>${folderIcon()}<span>${g}</span>${bank&&g===grade?'<i aria-hidden="true"></i>':''}</a>`).join('')}</div>`}</div>
    </nav>
    ${!compact&&materials&&kind!=='book'?`<div class="lh-side-block"><h3>관심 지역</h3>${state.regionFavorites.length?state.regionFavorites.map(r=>`<button class="chip" data-favorite-region="${esc(r)}">${icon('star')} ${esc(r)}</button>`).join(''):'<p>검색한 지역을 별표로 저장하세요.</p>'}</div>`:''}
  </aside>`;
}
export function subscriptionBanner(ctx,{focus='all'}={}) {
  const {icon}=ctx.ui;
  const planControl=(kind,label,price)=>ctx.store.isActive(kind)?`<div class="lh-plan-active"><span class="subscription-status">${label} 구독 중</span><a class="text-btn" href="#account">구독 관리 ${icon('chevron')}</a></div>`:`<button type="button" data-library-plan="${kind}"><span>${label}</span><strong>월 ${price}</strong>${icon('chevron')}</button>`;
  if(focus==='book'||focus==='db')return `<section class="lh-subscription-banner ${focus==='book'?'lh-book-banner':''}" aria-label="자료 DB 구독 안내"><div class="lh-subscription-copy">${icon('db')}<div><strong>내신·교재 DB를 하나의 구독으로</strong><p>자료 DB 월 49,000원으로 전체 학년의 구독 대상 내신·교재 DB를 이용하세요. 일부 자료는 구독에서 제외되며, 필요한 DB만 개별 구매할 수도 있습니다.</p></div></div><div class="lh-subscription-plans">${planControl('db','자료 DB','49,000원')}</div></section>`;
  const plans=focus==='bank'?[['bank','문제은행','39,000원']]:focus==='db'?[['db','자료 DB','49,000원']]:[['db','자료 DB','49,000원'],['bank','문제은행','39,000원']];
  return `<section class="lh-subscription-banner" aria-label="구독 안내"><div class="lh-subscription-copy">${icon('db')}<div><strong>수업에 필요한 자료와 문항을 구독하세요</strong><p>구독으로 전체 학년을 이용하거나 필요한 내신·교재 DB만 개별 구매하세요. 일부 자료는 구독에서 제외됩니다.</p></div></div><div class="lh-subscription-plans">${plans.map(([kind,label,price])=>planControl(kind,label,price)).join('')}</div></section>`;
}
function featurePlanControl(ctx,kind,label,price) {
  const active=ctx.store.isActive(kind),status=ctx.store.getState().subscriptions?.[kind]?.status;
  const stateLabel=active?(status==='canceling'?'해지 예약 · 이용 중':'구독 중'):status==='expired'?'구독 종료':'미구독';
  return `<div class="lh-feature-plan"><span class="lh-feature-plan-status">${label} ${stateLabel}</span>${active?`<a class="text-btn" href="#account">구독 관리 ${ctx.ui.icon('chevron')}</a>`:`<button type="button" class="btn primary" data-library-plan="${kind}">월 ${price} 구독하기</button>`}</div>`;
}
export function bankSubscriptionBanner(ctx) {
  return `<div class="lh-feature-banner lh-question-banner lh-product-banner" aria-label="문제은행 구독 안내"><span>${ctx.ui.icon('bank')}</span><div class="lh-feature-copy"><small>문제은행</small><h2>필요한 유형과 난이도의 문항만 골라서</h2><p>학년·단원·정답 종류로 찾고, 여러 문항을 골라 내 문제지에 담으세요. 필요한 한 문항만 개별 구매할 수도 있습니다.</p></div>${featurePlanControl(ctx,'bank','문제은행','39,000원')}</div>`;
}
export function bindLibraryBanners(container,ctx) {
  container.querySelectorAll('[data-library-plan]').forEach(button=>button.onclick=()=>ctx.subscribe(button.dataset.libraryPlan));
}
export function recentPurchasedDBs(ctx) {
  const {purchases=[],dbRights={}}=ctx.store.getState(),qmap=new Map(ctx.questions.map(q=>[q.id,q])),dbmap=new Map(ctx.dbs.map(d=>[d.id,d])),byDB=new Map();
  for(const purchase of purchases) {
    if(purchase.mode!=='permanent')continue;
    const ids=purchase.kind==='questions'?(Array.isArray(purchase.questionIds)?purchase.questionIds:[]):[];
    const entries=purchase.kind==='db'&&dbmap.has(purchase.dbId)?[[purchase.dbId,null]]:ids.flatMap(id=>{const q=qmap.get(id);return q&&dbmap.has(q.dbId)?[[q.dbId,id]]:[];});
    for(const [dbId,qId] of entries){let row=byDB.get(dbId);if(!row){row={db:dbmap.get(dbId),questionIds:new Set(),date:0,all:false};byDB.set(dbId,row);}row.date=Math.max(row.date,Number.isFinite(Number(purchase.date))?Number(purchase.date):0);if(qId)row.questionIds.add(qId);else row.all=true;}
  }
  for(const row of byDB.values()){const right=dbRights[row.db.id];if(right?.all&&right.mode==='permanent')row.all=true;}
  return [...byDB.values()].sort((a,b)=>b.date-a.date||a.db.title.localeCompare(b.db.title,'ko')).map(row=>({...row,questionIds:[...row.questionIds],count:row.all?row.db.count:row.questionIds.size}));
}
function purchasedRows(ctx,rows) {
  const {esc,icon}=ctx.ui;
  return `<div class="lh-purchased-list">${rows.map(({db,count,date})=>`<article><span class="lh-purchased-icon">${db.preview?`<img src="${esc(db.preview)}" alt="">`:icon(db.kind==='book'?'book':'file')}</span><div><span>${db.kind==='book'?'교재 DB':'내신시험지 DB'} · ${esc(db.grade)}</span><button type="button" data-purchased-db="${esc(db.id)}">${esc(db.title)}</button><small>구매한 문항 ${count}개${date?` · ${new Date(date).toLocaleDateString('ko-KR')}`:''}</small></div><span class="badge blue">영구 구매</span><button class="btn small" type="button" data-purchased-db="${esc(db.id)}">DB 보기 ${icon('chevron')}</button></article>`).join('')}</div>`;
}
function bindPurchasedRows(container,ctx) {
  container.querySelectorAll('[data-purchased-db]').forEach(button=>button.onclick=()=>ctx.openDB(button.dataset.purchasedDb));
}
export function renderLibraryHub(container,ctx,{focus='all'}={}) {
  const {icon}=ctx.ui,bank=focus==='bank',compact=ctx.getVariant?.()==='b';
  const purchased=recentPurchasedDBs(ctx);
  container.innerHTML=`<div class="split-view lh-shell">${librarySidebar(ctx,{section:bank?'bank':'overview'})}<section class="workspace lh-hub">
    <div class="lh-heading"><div><div class="lh-breadcrumb">${bank?'<a href="#library">수학비서 DB</a> › 문제은행':'DB구축 › 수학비서 DB'}</div><h1>${bank?'문제은행':'수학비서 DB'}</h1></div></div>
    ${compact?'':`${subscriptionBanner(ctx,{focus:bank?'bank':'all'})}<nav class="lh-mode-tabs" aria-label="자료 찾는 방식"><a href="#library" ${!bank?'aria-current="page"':''}>전체</a><a href="#library/materials">자료 DB</a><a href="#bank" ${bank?'aria-current="page"':''}>문제은행</a></nav>`}
    ${!bank?`<section class="lh-materials"><div class="lh-feature-banner lh-material-banner ${compact?'lh-product-banner':''}"><span>${icon('file')}</span><div class="lh-feature-copy"><small>자료 DB</small><h2>학교 시험지와 교재를 한곳에서</h2><p>지역·학교·시험별 내신 자료와 교재 DB에서 필요한 문항을 찾아보세요.</p></div>${compact?featurePlanControl(ctx,'db','자료 DB','49,000원'):''}</div><div class="lh-material-links"><a href="#library/school"><span class="lh-resource-icon">${icon('file')}</span><span><strong>내신시험지 DB</strong><small>학년 · 지역 · 학교 · 시험별 검색</small></span>${icon('chevron')}</a><a href="#library/book"><span class="lh-resource-icon book">${icon('book')}</span><span><strong>교재 DB</strong><small>브랜드 · 교재명 · 학년별 검색</small></span>${icon('chevron')}</a></div></section>`:''}
    <section class="lh-bank ${compact&&bank?'lh-bank-landing':''}">${compact?bankSubscriptionBanner(ctx):`<div class="lh-feature-banner lh-question-banner"><span>${icon('bank')}</span><div><small>문제은행</small><h2>필요한 유형과 난이도의 문항만 골라서</h2><p>학년·단원·정답 종류로 찾고, 여러 문항을 골라 내 문제지에 담으세요.</p></div></div>`}<div class="lh-grade-grid">${ctx.grades.map(g=>{const qs=ctx.questions.filter(q=>q.grade===g);return `<a href="#bank/${g}"><span class="lh-grade-icon ${g.startsWith('고')?'high':''}">${folderIcon()}</span><strong>${gradeName(g)}</strong><small>${qs.length?`문항 ${qs.length}개`:'문항 준비 중'}</small>${icon('chevron')}</a>`;}).join('')}</div></section>
    <section class="lh-purchased"><div class="lh-section-heading"><h2>최근 구매한 문항의 DB</h2><a href="#mydb/purchased">더보기 ${icon('chevron')}</a></div>${purchased.length?purchasedRows(ctx,purchased.slice(0,4)):'<div class="lh-purchased-empty">구매한 문항이 담긴 DB를 여기에 모아 보여드려요.</div>'}</section>
  </section></div>`;
  bindLibraryBanners(container,ctx);bindPurchasedRows(container,ctx);
}
