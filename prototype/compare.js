const views={
  original:{label:'최초 구독안',file:'./original.html',initial:'#mypage/subscription',routes:{screen:'#library',account:'#mypage/subscription',papers:'#papers'}},
  latest:{label:'최종 수정안',file:'./index.html',initial:'#library',routes:{screen:'#library',account:'#account',papers:'#papers'}},
};
const keys=['original','latest','changes'];
const frames=new Map();
const tabs=[...document.querySelectorAll('[data-view]')];
const shortcut=document.querySelector('#screen-shortcut');
const openCurrent=document.querySelector('#open-current');
const status=document.querySelector('#frame-status');
let active='original',comparisonPromise=null,comparisonData=null;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=value=>typeof value==='string'?value:Array.isArray(value)?value.map(text).filter(Boolean).join('\n'):value&&typeof value==='object'?Object.values(value).map(text).filter(Boolean).join(' · '):value==null?'':String(value);
const norm=value=>text(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'');
function safeURL(value){if(!value)return '';try{const url=new URL(value,location.href);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}}
function statusGroup(value){const s=norm(value);return !s||/미확인|확인필요|불명|unknown|unverified|unconfirmed/.test(s)?'unknown':/유지|same|unchanged/.test(s)?'same':'changed';}
function viewURL(key,hash=views[key].initial){return new URL(views[key].file+hash,location.href).href;}
function currentFrameURL(key){const entry=frames.get(key);if(!entry)return viewURL(key);try{const url=entry.frame.contentWindow.location.href;if(url!=='about:blank')entry.url=url;}catch{}return entry.url;}
function updateToolbar(){
  const isChanges=active==='changes';shortcut.disabled=isChanges;
  if(isChanges){shortcut.value='current';openCurrent.href=new URL('./compare.html#changes',location.href).href;status.textContent='';return;}
  const url=currentFrameURL(active);openCurrent.href=url;
  const hash=new URL(url).hash;shortcut.value=Object.entries(views[active].routes).find(([,route])=>route===hash)?.[0]||'current';
  status.textContent=frames.get(active)?.loaded?'':`${views[active].label} 불러오는 중`;
}
function ensureFrame(key){
  if(frames.has(key))return frames.get(key);
  const panel=document.querySelector(`#panel-${key}`),frame=document.createElement('iframe');
  const entry={frame,url:viewURL(key),loaded:false,hashListener:null};frames.set(key,entry);
  frame.title=`${views[key].label} · 수학비서 구독 문제은행`;frame.setAttribute('scrolling','auto');frame.src=entry.url;
  frame.addEventListener('load',()=>{
    entry.loaded=true;panel.classList.add('is-loaded');
    try{const win=frame.contentWindow;if(entry.hashListener)win.removeEventListener('hashchange',entry.hashListener);entry.hashListener=()=>{currentFrameURL(key);if(active===key)updateToolbar();};win.addEventListener('hashchange',entry.hashListener);}catch{}
    currentFrameURL(key);if(active===key)updateToolbar();
  });
  panel.append(frame);return entry;
}
function setView(key){
  const previousPanel=document.querySelector(`#panel-${active}`),restoreFocus=previousPanel.contains(document.activeElement)&&active!==key;
  active=keys.includes(key)?key:'original';
  tabs.forEach(tab=>{const selected=tab.dataset.view===active;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
  for(const item of keys)document.querySelector(`#panel-${item}`).hidden=item!==active;
  document.title=`${active==='changes'?'PRD 변경 비교':views[active].label} · 수학비서 구독안 비교`;
  document.querySelector('#view-note').textContent=active==='changes'?'원문 PRD와 화면 구현의 근거를 함께 확인하세요.':'탭을 바꿔도 각 화면의 스크롤과 입력 상태가 유지됩니다.';
  if(active==='changes')loadComparison();else ensureFrame(active);
  updateToolbar();
  if(restoreFocus)document.querySelector(`#tab-${active}`).focus();
}
function navigateView(key){if(location.hash===`#${key}`)setView(key);else location.hash=`#${key}`;}
tabs.forEach(tab=>{
  tab.addEventListener('click',()=>navigateView(tab.dataset.view));
  tab.addEventListener('keydown',event=>{
    const index=keys.indexOf(tab.dataset.view);let next;
    if(event.key==='ArrowRight')next=(index+1)%keys.length;
    else if(event.key==='ArrowLeft')next=(index+keys.length-1)%keys.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=keys.length-1;
    else return;
    event.preventDefault();tabs[next].focus();navigateView(keys[next]);
  });
});
shortcut.addEventListener('change',()=>{
  if(active==='changes'||!views[active].routes[shortcut.value])return;
  const entry=ensureFrame(active),url=viewURL(active,views[active].routes[shortcut.value]);
  if(currentFrameURL(active)===url)return;
  entry.url=url;
  try{const current=new URL(entry.frame.contentWindow.location.href),target=new URL(url);if(current.origin===target.origin&&current.pathname===target.pathname)entry.frame.contentWindow.location.hash=target.hash;else entry.frame.src=url;}catch{entry.frame.src=url;}
  updateToolbar();
});
for(const event of ['pointerenter','focus','click'])openCurrent.addEventListener(event,updateToolbar);
window.addEventListener('hashchange',()=>setView(location.hash.slice(1)));

function loadComparison(retry=false){
  if(comparisonData)return;
  if(comparisonPromise&&!retry)return;
  const container=document.querySelector('#changes-content');
  container.innerHTML='<p class="data-message" role="status">변경 비교 자료를 불러오는 중입니다.</p>';
  comparisonPromise=import(`./compare-data.js${retry?`?reload=${Date.now()}`:''}`).then(module=>{
    const data=module.comparison;if(!data||!Array.isArray(data.rows))throw new Error('Invalid comparison data');
    comparisonData=data;renderComparison(data);
  }).catch(()=>{
    container.innerHTML='<div class="data-message"><p>변경 비교 자료를 불러오지 못했습니다. 최초안과 최종안 탭은 계속 볼 수 있습니다.</p><button class="data-retry" id="retry-comparison">다시 불러오기</button></div>';
    container.querySelector('#retry-comparison').addEventListener('click',()=>loadComparison(true));
  });
}
function renderComparison(data){
  const container=document.querySelector('#changes-content'),rows=data.rows.filter(row=>row&&typeof row==='object'),sources=Array.isArray(data.sources)?data.sources:[],sourceMap=new Map(sources.map(s=>[s.id,s]));
  const categories=[...new Set(rows.map(row=>text(row.category)).filter(Boolean))];
  const summary=Array.isArray(data.summary)?data.summary:[],limitations=Array.isArray(data.limitations)?data.limitations:[];
  const basis=text(data.basis)||'보존한 최초 프로토타입과 최종 구현을 비교했습니다. 원문 PRD에서 확인하지 못한 내용은 구현 근거로 구분해서 읽어 주세요.';
  container.innerHTML=`<header class="changes-heading"><h1>${esc(data.title||'PRD 변경 비교')}</h1><p>${esc(data.subtitle||'최초 구독안과 최종 수정안의 정책·화면·이용 흐름을 비교합니다.')}</p></header><div class="changes-basis"><strong>비교 기준과 근거</strong>${esc(basis).replace(/\n/g,'<br>')}</div>${summary.length?`<ul class="changes-summary">${summary.map(item=>`<li><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></li>`).join('')}</ul>`:''}<div class="changes-filters"><label class="changes-search"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><span class="sr-only">변경 항목 검색</span><input id="comparison-query" type="search" placeholder="항목·정책·변경 내용 검색" autocomplete="off"></label><select id="comparison-category" aria-label="비교 항목 분류"><option value="">전체 분류</option>${categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select><select id="comparison-status" aria-label="변경 상태"><option value="">전체 상태</option><option value="changed">변경·반영</option><option value="same">유지</option><option value="unknown">미확인</option></select><span id="comparison-count" class="changes-count" role="status" aria-live="polite"></span></div><div class="comparison-table-wrap"><table class="comparison-table"><caption class="sr-only">최초 구독안과 최종 수정안의 항목별 비교</caption><thead><tr><th scope="col">항목</th><th scope="col">최초 구독안</th><th scope="col">최종 수정안</th><th scope="col">상태</th><th scope="col">비고 · 근거</th></tr></thead><tbody id="comparison-rows"></tbody></table><div id="comparison-empty" class="comparison-empty" hidden>조건에 맞는 비교 항목이 없습니다.</div></div>${limitations.length?`<section class="changes-notes"><h2>확인이 필요한 범위</h2><ul>${limitations.map(item=>`<li>${esc(text(item))}</li>`).join('')}</ul></section>`:''}<section class="changes-notes"><h2>근거 자료</h2><ol class="changes-sources">${sources.map(source=>{const url=safeURL(source.url);return `<li id="comparison-source-${esc(source.id)}" tabindex="-1"><strong>${url?`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(source.label)} ↗</a>`:esc(source.label)}</strong><p>${esc(text(source.note))}</p></li>`;}).join('')}</ol></section>`;
  const query=container.querySelector('#comparison-query'),category=container.querySelector('#comparison-category'),statusFilter=container.querySelector('#comparison-status');
  function filterRows(){
    const term=norm(query.value),selected=rows.filter(row=>(!category.value||text(row.category)===category.value)&&(!statusFilter.value||statusGroup(row.status)===statusFilter.value)&&(!term||norm([row.category,row.item,row.initial,row.latest,row.status,row.note,...(row.sources||[]).map(id=>sourceMap.get(id)?.label||id)]).includes(term)));
    container.querySelector('#comparison-count').textContent=`${selected.length}개 항목 / 전체 ${rows.length}개`;
    container.querySelector('#comparison-empty').hidden=selected.length>0;
    container.querySelector('#comparison-rows').innerHTML=selected.map(row=>`<tr><th scope="row"><small>${esc(row.category)}</small>${esc(row.item)}</th><td>${esc(text(row.initial))}</td><td>${esc(text(row.latest))}</td><td><span class="status-tag status-${statusGroup(row.status)}">${esc(row.status||'미확인')}</span></td><td>${row.note?`<p class="row-note">${esc(text(row.note))}</p>`:''}<div class="source-links">${(row.sources||[]).map(id=>sourceMap.has(id)?`<button type="button" data-source-id="${esc(id)}">${esc(sourceMap.get(id).label)}</button>`:'').join('')}</div></td></tr>`).join('');
  }
  query.addEventListener('input',filterRows);category.addEventListener('change',filterRows);statusFilter.addEventListener('change',filterRows);
  container.addEventListener('click',event=>{const button=event.target.closest('[data-source-id]');if(!button)return;const target=document.getElementById(`comparison-source-${button.dataset.sourceId}`);target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest'});});
  filterRows();
}
if(!keys.includes(location.hash.slice(1)))history.replaceState(null,'','#original');
setView(location.hash.slice(1));
