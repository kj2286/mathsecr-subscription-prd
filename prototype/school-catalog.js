import {librarySidebar} from './library-hub.js';

const schoolName=db=>db.schoolFullName||db.school;
export function schoolDBTable(ctx,list,{showRange=true,curriculumLabel='신교육'}={}) {
  const {esc,icon,money}=ctx.ui,alerts=ctx.store.getState().schoolAlerts;
  const own=new Map(ctx.store.ownedDBs().map(db=>[db.id,db]));
  return `<div class="school-table-wrap"><table class="school-db-table ${showRange?'with-range':'without-range'}"><thead><tr>${showRange?`<th class="school-range">시험범위 (${esc(curriculumLabel)})</th>`:''}<th>제목</th><th class="school-price">구매</th><th class="school-explanation">해설</th><th class="school-alert">새 시험지 알림</th></tr></thead><tbody>${list.map(db=>{
    const permanent=own.get(db.id)?.remainingPurchaseCount===0,checked=ctx.commerce?.has(db.id),school=schoolName(db),alert=alerts.includes(school);
    return `<tr data-db="${esc(db.id)}" class="${checked?'is-selected':''}">${showRange?`<td class="school-range">${esc(db.range||db.subject)}</td>`:''}<td><button class="db-title" data-school-detail="${esc(db.id)}">${esc(db.title)} ${icon('chevron')}</button><div class="db-meta"><span>${db.count} 문제</span><span>평균 ${db.avg??'미확인'}</span>${db.bins?.length?`<span class="distribution">${db.bins.map((count,i)=>`<span style="--c:${['#dd8500','#00764b','#ff4f4f','#494952'][i]}">${count}</span>`).join('')}</span>`:''}${permanent?'<span class="badge blue">구매 완료</span>':''}</div></td><td class="school-price">${permanent?'<span class="muted">구매 완료</span>':`<label class="school-price-choice"><input type="checkbox" data-db-cart="${esc(db.id)}" aria-label="${esc(db.title)} 구매 선택" ${checked?'checked':''}><span>${db.originalPrice?`<del>${money(db.originalPrice)}</del>`:''}<strong>${db.price==null?'가격 확인 전':money(db.price)}</strong></span></label>`}</td><td class="school-explanation">${esc(db.explanation||'미확인')}</td><td class="school-alert">${school?`<button class="icon-btn ${alert?'on':''}" data-school-alert="${esc(school)}" aria-label="${esc(school)}${alert?' 새 시험지 알림 해제':'에 새로운 시험지가 등록되면 알림받기'}" title="${esc(school)}${alert?' 새 시험지 알림 해제':'에 새로운 시험지가 등록되면 알림받기'}" aria-pressed="${alert}">${icon('bell')}</button>`:''}</td></tr>`;
  }).join('')}</tbody></table>${list.length?'':'<div class="empty"><h3>검색 결과가 없습니다.</h3></div>'}</div>`;
}

export function renderSchoolDetail(container,ctx,id) {
  const db=ctx.dbs.find(item=>item.id===id&&item.kind==='school');
  const {esc,icon,money,questionCard}=ctx.ui;
  if(!db){container.innerHTML='<section class="workspace"><div class="empty">시험지를 찾을 수 없습니다.</div><a class="btn" href="#library/school">목록으로</a></section>';return;}
  const questions=ctx.questions.filter(q=>q.dbId===id),own=ctx.store.ownedDBs().find(item=>item.id===id),permanent=own?.remainingPurchaseCount===0,subscribed=ctx.store.isActive('db'),school=schoolName(db),alert=ctx.store.getState().schoolAlerts.includes(school);
  const usable=permanent||(subscribed&&db.rentalEligible!==false);
  container.innerHTML=`<div class="split-view">${librarySidebar(ctx,{section:'materials',kind:'school'})}<section class="workspace school-detail"><div class="breadcrumb"><a href="#library">수학비서 DB</a> ${icon('chevron')} <a href="#library/school">내신시험지 DB</a> ${icon('chevron')} 시험지 미리보기</div><a class="text-btn" href="#library/school">${icon('arrow')} 목록으로</a><div class="heading-row"><div><h1>${esc(db.title)}</h1><p>${db.count}문항 · 평균 난이도 ${db.avg??'미확인'} · ${esc(db.explanation||'해설 미확인')}</p></div><button class="icon-btn ${alert?'on':''}" data-school-alert="${esc(school)}" aria-label="${esc(school)}${alert?' 새 시험지 알림 해제':'에 새로운 시험지가 등록되면 알림받기'}" title="${esc(school)}${alert?' 새 시험지 알림 해제':'에 새로운 시험지가 등록되면 알림받기'}" aria-pressed="${alert}">${icon('bell')}</button></div><div class="school-detail-access"><div><strong>${usable?(permanent?'구매한 시험지입니다.':'수학비서 DB 구독으로 이용 중입니다.'):'수학비서 DB를 구독하면 모든 문항을 보고 문제지로 사용할 수 있습니다.'}</strong><p>${usable?'필요한 문항을 골라 내 문제지에 담아 보세요.':'이 시험지만 별도로 구매할 수도 있습니다. 구독하거나 구매하기 전에는 문항 속 숫자와 수식을 흐리게 표시합니다.'}</p></div><div class="actions">${!permanent?`<button class="btn" data-detail-buy>개별 구매${db.price!=null?' · '+money(db.price):''}</button>`:''}${subscribed?'<span class="subscription-status">DB 구독 중</span><a class="text-btn" href="#account">구독 관리</a>':!permanent?'<button class="btn primary" data-detail-subscribe>DB 구독하기</button>':''}</div></div><div class="section-heading"><h2>시험지 미리보기</h2><span class="muted">${questions.length}문항</span></div>${questions.some(q=>q.sample)?'<p class="small-note school-sample-note">‘예시 문항’으로 표시한 문항은 해당 시험지의 실제 문항이 아닙니다.</p>':''}${questions.length?`<div class="question-grid">${questions.map(q=>questionCard(q,{store:ctx.store,source:'db',selectable:true})).join('')}</div><div class="school-detail-selection" aria-live="polite"></div>`:'<div class="empty"><h3>미리보기 문항이 없습니다.</h3></div>'}</section></div>`;
  container.querySelector('[data-detail-buy]')?.addEventListener('click',()=>ctx.purchaseDB(id));
  container.querySelector('[data-detail-subscribe]')?.addEventListener('click',()=>ctx.subscribe('db'));
  const selected=new Set();
  container.querySelectorAll('[data-qcheck]').forEach(input=>input.onchange=()=>{
    input.checked?selected.add(input.dataset.qcheck):selected.delete(input.dataset.qcheck);
    const bar=container.querySelector('.school-detail-selection');
    bar.innerHTML=selected.size?`<div class="sticky-selection"><strong>${selected.size}문항 선택</strong><button class="btn primary" data-add-school-questions>문제지에 담기</button></div>`:'';
    bar.querySelector('button')?.addEventListener('click',()=>ctx.addQuestions([...selected],'db'));
  });
}
