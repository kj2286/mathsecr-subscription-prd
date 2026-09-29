import { MYDB_DEMO_FILE } from './mydb-ui.js';
import { openSourceDocument } from './source-document.js';
const DEFAULTS_KEY = 'mathsecr-prototype:source-search:v1';
const views = new WeakMap();

export const SOURCE_TABS = [
  ['all', '전체'], ['PC', '거의 같은 문제'], ['NC', '숫자변형 문제'],
  ['5depth', '유사 문제'], ['4depth', '같은 유형 문제'], ['MT', '다른 단원 유사문제'],
];
export const SOURCE_RESULT_TABS = [...SOURCE_TABS, ['unitCandidates', '같은 단원 후보']];

export function defaultSourceSettings() {
  return {
    source: 'all', includedDBIds: [], excludedDBIds: [], yearMin: 2002, yearMax: 2026,
    min: 1, max: 9, searchMethod: 'chapter', unit: '',
    excludeMissingAnswer: false, excludeMissingSolution: false, saveDefaults: false,
  };
}

const norm = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
const unitParts = q => String(q.unit || '').split(' > ').map(norm);
const stripNumber = value => norm(value).replace(/\d+(?:\.\d+)?/g, '#');
const hasValue = value => value !== null && value !== undefined && String(value).trim() !== '';
const terms = value => new Set(String(value || '').normalize('NFKC').toLowerCase().match(/[가-힣]{2,}|[a-z]+|\d+/g) || []);

// These are literal comparisons of the small local sample, not a model score.
export function sourceCategory(q, base) {
  if (!q || !base || q.sourceSearchEligible === false || base.sourceSearchEligible === false) return '';
  if (q.id === base.id || (norm(q.text) && norm(q.text) === norm(base.text))) return 'PC';
  if (q.text && base.text && /\d/.test(q.text) && stripNumber(q.text) === stripNumber(base.text)) return 'NC';
  const a = unitParts(q), b = unitParts(base);
  if (a.length > 1 && a.join('>') === b.join('>')) return '5depth';
  if (a.length >= 4 && b.length >= 4 && a.slice(0, 4).join('>') === b.slice(0, 4).join('>')) return '4depth';
  const tags = new Set((base.tags || []).map(norm));
  if (q.grade === base.grade && a[1] !== b[1] && (q.tags || []).some(tag => tags.has(norm(tag)))) return 'MT';
  if (q.grade === base.grade && q.curriculum === base.curriculum && a.length > 1 && b.length > 1 && a[0] && a[1] && a[0] === b[0] && a[1] === b[1]) return 'unitCandidates';
  return '';
}

export function filterSourceQuestions(questions, base, filters = {}, scope = {}) {
  if (!base || base.sourceSearchEligible === false) return [];
  const f = { ...defaultSourceSettings(), grade: '', answerType: 'all', tab: 'all', include: '', exclude: '', ...filters };
  const owned = new Set(scope.ownedDBIds || []);
  const inPapers = new Set(scope.paperQuestionIds || []);
  const included = new Set(f.includedDBIds || []), excluded = new Set(f.excludedDBIds || []);
  const sourceTerms = terms(base.text);
  return questions.filter(q => {
    if (q.sourceSearchEligible === false) return false;
    if ((f.grade || base.grade) !== q.grade && f.grade !== 'all') return false;
    if (f.answerType !== 'all' && q.answerType !== f.answerType && !(f.answerType === '주관식' && q.answerType === '단답형')) return false;
    if (f.source === 'owned' && !owned.has(q.dbId)) return false;
    if (f.source === 'papers' && !inPapers.has(q.id)) return false;
    if (included.size && !included.has(q.dbId) || excluded.has(q.dbId)) return false;
    if (q.year == null || q.year < Number(f.yearMin) || q.year > Number(f.yearMax)) return false;
    if (q.difficulty == null || q.difficulty < Number(f.min) || q.difficulty > Number(f.max)) return false;
    if (f.excludeMissingAnswer && !hasValue(q.answer)) return false;
    if (f.excludeMissingSolution && !hasValue(q.solution)) return false;
    const text = norm([q.text, q.formula, q.title, q.unit, ...(q.tags || [])].join(' '));
    if (f.include && !text.includes(norm(f.include))) return false;
    if (f.exclude && text.includes(norm(f.exclude))) return false;
    if (f.searchMethod === 'textSimilarity') {
      if (f.unit && !norm(q.unit).includes(norm(f.unit))) return false;
      if (q.id !== base.id && ![...terms(q.text)].some(term => sourceTerms.has(term))) return false;
    }
    return f.tab === 'all' || sourceCategory(q, base) === f.tab;
  }).sort((a, b) => Number(b.id === base.id) - Number(a.id === base.id) || a.number - b.number);
}

export function serializeSourceDefaults(settings) {
  return JSON.stringify({ ...settings, unit: '' });
}

export function readSourceDefaults(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    const saved = JSON.parse(target?.getItem(DEFAULTS_KEY) || 'null');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return null;
    const defaults = defaultSourceSettings();
    const number = (name, min, max) => Number.isInteger(saved[name]) && saved[name] >= min && saved[name] <= max ? saved[name] : defaults[name];
    const result = { ...defaults,
      source: ['all', 'owned', 'papers'].includes(saved.source) ? saved.source : defaults.source,
      searchMethod: ['chapter', 'textSimilarity'].includes(saved.searchMethod) ? saved.searchMethod : defaults.searchMethod,
      yearMin: number('yearMin', 2002, 2026), yearMax: number('yearMax', 2002, 2026),
      min: number('min', 1, 9), max: number('max', 1, 9),
      excludeMissingAnswer: saved.excludeMissingAnswer === true,
      excludeMissingSolution: saved.excludeMissingSolution === true,
      saveDefaults: saved.saveDefaults === true,
      includedDBIds: Array.isArray(saved.includedDBIds) ? saved.includedDBIds.filter(id => typeof id === 'string') : [],
      excludedDBIds: Array.isArray(saved.excludedDBIds) ? saved.excludedDBIds.filter(id => typeof id === 'string') : [],
    };
    if (result.yearMin > result.yearMax) [result.yearMin, result.yearMax] = [defaults.yearMin, defaults.yearMax];
    if (result.min > result.max) [result.min, result.max] = [defaults.min, defaults.max];
    return result;
  } catch { return null; }
}

export function createSourceView(settings = defaultSourceSettings()) {
  return { document:null, showOriginal:false, uploadScroll:0, uploadScrollLeft:0, uploadSelected:new Set(), uploadSaving:false, controller:null, items:[], activeRegion:'', page:1, pageCanvases:new Map(), manual:false, manualSequence:0, selectionVersion:0, cropBusy:false, reading:false, readPages:0, error:'', phase:'start', baseId:'', sourceDBId:'', file:null, objectURL:'', matched:false, tab:'all', grade:'', answerType:'all', include:'', exclude:'', selected:new Set(), settings:structuredClone(settings) };
}
export function clearSourceFilters(view, settings = defaultSourceSettings()) {
  view.tab='all';view.grade='';view.answerType='all';view.include='';view.exclude='';view.selected.clear();view.settings=structuredClone(settings);
}
export function selectSourceQuestion(view, id, settings = readSourceDefaults() || defaultSourceSettings()) {
  view.baseId=id;clearSourceFilters(view,settings);view.phase='select';
}
export function resetSourceView(view, revoke = url => globalThis.URL.revokeObjectURL(url)) {
  view.controller?.abort();view.document?.destroy()?.catch?.(()=>{});
  if(view.objectURL)revoke(view.objectURL);
  Object.assign(view,createSourceView(readSourceDefaults()||defaultSourceSettings()));
}
function getView(store) {
  if(!views.has(store))views.set(store,createSourceView(readSourceDefaults()||defaultSourceSettings()));
  return views.get(store);
}
function ensureSourceCSS() {
  if(document.querySelector('link[data-source-css]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href='source.css';link.dataset.sourceCss='';document.head.append(link);
}

const styles = `<style>
.source-settings .source-setting-section{border-top:1px solid #e5e5e8;padding-top:18px;margin-top:18px}
.source-settings h3{font-size:14px;margin-bottom:10px}.source-settings .source-options{display:flex;gap:12px;flex-wrap:wrap}
.source-settings input[type=radio]{accent-color:#2d34ff;margin:0}.source-settings .source-db-choices{max-height:180px;overflow:auto;border:1px solid #e5e5e8;border-radius:10px;padding:8px;margin-top:10px}
.source-settings .source-db-choice{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f0f0f2;font-size:12px}
.source-settings .source-db-choice:last-child{border:0}.source-settings .source-db-choice span{flex:1;min-width:0;line-height:1.5}
.source-settings .source-db-choice select{width:77px;flex-shrink:0;padding:6px;font-size:12px}.source-settings .range input{flex:1;width:100%;min-width:0}
.source-settings .source-setting-tools{display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px}
.source-settings .source-setting-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:580px){.source-settings .source-setting-grid{grid-template-columns:1fr}}
</style>`;

function settingsModal(container, ctx, view) {
  const { esc, openModal, closeModal, toast } = ctx.ui;
  let draft = structuredClone(view.settings);
  const draw = () => {
    const units = [...new Set(ctx.questions.map(q => q.unit?.split(' > ')[1]).filter(Boolean))];
    const radio = (name, value, label, checked) => `<label class="checkbox"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}>${label}</label>`;
    openModal({
      title: '유사문제 검색 설정',
      body: `<form id="source-settings-form" class="source-settings">
        <div class="source-setting-tools"><button type="button" class="text-btn" data-source-reset>초기화</button><button type="button" class="text-btn" data-source-load>기존 설정 불러오기</button></div>
        <p class="small-note">출처와 검색 범위를 정하세요. 기본 설정값을 저장하면 다음에도 같은 조건으로 찾을 수 있어요.</p>
        <section class="source-setting-section"><h3>출처</h3><div class="source-options">${[['all','전체 DB'],['owned','나만의 DB'],['papers','내 문제지']].map(([v,l])=>radio('source',v,l,draft.source===v)).join('')}</div>
        <details style="margin-top:12px"><summary class="small-note" style="cursor:pointer">DB별 포함·제외 선택 (${draft.includedDBIds.length}개 포함 · ${draft.excludedDBIds.length}개 제외)</summary><p class="small-note" style="margin-top:8px">포함을 선택하면 해당 DB에서만 검색합니다. 제외 조건을 먼저 적용합니다.</p><div class="source-db-choices">${ctx.dbs.map(d=>`<label class="source-db-choice"><span>${esc(d.title)}</span><select data-source-db="${esc(d.id)}" aria-label="${esc(d.title)} 포함·제외"><option value="">기본</option><option value="include" ${draft.includedDBIds.includes(d.id)?'selected':''}>포함</option><option value="exclude" ${draft.excludedDBIds.includes(d.id)?'selected':''}>제외</option></select></label>`).join('')}</div></details></section>
        <section class="source-setting-section"><h3>검색 연도 및 난이도</h3><div class="source-setting-grid"><div class="field"><span>연도</span><div class="range"><input name="yearMin" type="number" min="2002" max="2026" value="${esc(draft.yearMin)}" aria-label="검색 시작 연도" required><span>~</span><input name="yearMax" type="number" min="2002" max="2026" value="${esc(draft.yearMax)}" aria-label="검색 종료 연도" required></div></div><div class="field"><span>난이도</span><div class="range"><input name="min" type="number" min="1" max="9" value="${esc(draft.min)}" aria-label="검색 최소 난이도" required><span>~</span><input name="max" type="number" min="1" max="9" value="${esc(draft.max)}" aria-label="검색 최대 난이도" required></div></div></div></section>
        <section class="source-setting-section"><h3>유사문제 검색 방식</h3><p class="small-note" style="margin-bottom:10px">라이트 DB 문제는 텍스트 유사성으로만 검색됩니다.</p><div class="source-options">${radio('searchMethod','chapter','문제 유형 검색',draft.searchMethod==='chapter')}${radio('searchMethod','textSimilarity','텍스트 유사성 검색',draft.searchMethod==='textSimilarity')}</div><label class="field" id="source-setting-unit" ${draft.searchMethod==='textSimilarity'?'':'hidden'}><span>단원 및 유형</span><select name="unit"><option value="">단원 및 유형 선택</option>${units.map(u=>`<option value="${esc(u)}" ${draft.unit===u?'selected':''}>${esc(u)}</option>`).join('')}</select><small class="small-note">단원·유형 선택은 기본 설정값에 저장하지 않습니다.</small></label></section>
        <section class="source-setting-section"><h3>해설 유무</h3><div class="source-options">${radio('solution','include','해설 없는 문제 포함',!draft.excludeMissingSolution)}${radio('solution','exclude','해설 없는 문제 제외',draft.excludeMissingSolution)}</div></section>
        <section class="source-setting-section"><h3>정답 유무</h3><div class="source-options">${radio('answer','include','정답 없는 문제 포함',!draft.excludeMissingAnswer)}${radio('answer','exclude','정답 없는 문제 제외',draft.excludeMissingAnswer)}</div><p class="small-note" style="margin-top:10px">현재 표본은 정답·해설을 수집하지 않아, 없는 문제를 제외하면 결과가 없습니다.</p></section>
        <section class="source-setting-section"><label class="checkbox"><input type="checkbox" name="saveDefaults" ${draft.saveDefaults?'checked':''}>기본 설정값 저장</label></section>
      </form>`,
      footer: '<button class="btn" data-source-close>닫기</button><button class="btn primary" data-source-save>저장하기</button>',
      onMount: modal => {
        modal.style.width = 'min(500px, calc(100vw - 32px))';
        modal.style.maxHeight = '90dvh';
        modal.addEventListener('click', event => {
          if (event.target !== modal) return;
          const r = modal.getBoundingClientRect();
          if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.stopImmediatePropagation();
        }, true);
        const form = modal.querySelector('form');
        const read = () => {
          const fd = new FormData(form);
          return { ...draft, source: fd.get('source'), searchMethod: fd.get('searchMethod'), unit: fd.get('searchMethod')==='textSimilarity'?fd.get('unit'):'',
            yearMin: Number(fd.get('yearMin')), yearMax: Number(fd.get('yearMax')), min: Number(fd.get('min')), max: Number(fd.get('max')),
            excludeMissingAnswer: fd.get('answer') === 'exclude', excludeMissingSolution: fd.get('solution') === 'exclude', saveDefaults: fd.has('saveDefaults'),
            includedDBIds: [...form.querySelectorAll('[data-source-db]')].filter(s=>s.value==='include').map(s=>s.dataset.sourceDb),
            excludedDBIds: [...form.querySelectorAll('[data-source-db]')].filter(s=>s.value==='exclude').map(s=>s.dataset.sourceDb),
          };
        };
        form.querySelectorAll('[name="searchMethod"]').forEach(input => input.onchange = () => {
          const unit = form.querySelector('#source-setting-unit');
          unit.hidden = form.elements.searchMethod.value !== 'textSimilarity';
          unit.style.display = unit.hidden ? 'none' : '';
        });
        if (draft.searchMethod !== 'textSimilarity') form.querySelector('#source-setting-unit').style.display = 'none';
        modal.querySelector('[data-source-reset]').onclick = () => { draft = defaultSourceSettings(); draw(); };
        modal.querySelector('[data-source-load]').onclick = () => {
          const saved = readSourceDefaults();
          if (!saved) return toast('저장한 기본 설정이 없습니다.');
          draft = saved; draw();
        };
        modal.querySelector('[data-source-close]').onclick = closeModal;
        const save = event => {
          event?.preventDefault();
          if (!form.reportValidity()) return;
          const next = read();
          if (next.yearMin > next.yearMax || next.min > next.max) return toast('시작 값이 끝 값보다 크지 않도록 확인해 주세요.');
          view.settings = next;
          if (next.saveDefaults) {
            try { globalThis.localStorage?.setItem(DEFAULTS_KEY, serializeSourceDefaults(next)); }
            catch { toast('기본 설정을 저장하지 못했습니다. 현재 화면에만 적용합니다.'); }
          }
          closeModal(); renderSource(container, ctx); toast('검색 설정을 적용했습니다.');
        };
        form.onsubmit = save;
        modal.querySelector('[data-source-save]').onclick = save;
      },
    });
  };
  draw();
}

export const sourceSelectionKey=(id,source)=>`${source}:${id}`;
export function sourceQuestionProducts(q,dbs=[]) {
  if(!q)return [];
  const explicit=q.sourceKind||q.product,db=dbs.find(d=>d.id===q.dbId);
  if(explicit==='bank')return ['bank'];
  if(explicit&&!['db','school','book'].includes(explicit))return [];
  const products=db&&(explicit||['school','book'].includes(db.kind))?['db']:[];
  if(q.availableInBank===true)products.push('bank');
  return products;
}
export function sourceResultRoutes(ctx,questions) {
  return questions.flatMap(q=>{
    const products=sourceQuestionProducts(q,ctx.dbs),db=ctx.dbs.find(d=>d.id===q.dbId);
    return (products.length?products:['']).map(source=>({q,id:q.id,db,source,key:sourceSelectionKey(q.id,source||'unknown'),label:source==='bank'?(q.bankSample?'문제은행 표본':'문제은행'):source==='db'?(db?.kind==='book'?'교재 DB':'내신시험지 DB'):'출처 상품 미확인'}));
  });
}
export function resolveSourceSelection(ctx,values) {
  const routes=sourceResultRoutes(ctx,ctx.questions),byKey=new Map(routes.filter(r=>r.source).map(r=>[r.key,r])),selected=new Map();
  for(const value of values){
    const key=typeof value==='object'?sourceSelectionKey(value.id,value.source):String(value);
    const route=byKey.get(key)||routes.find(r=>r.id===key&&r.source);
    if(route)selected.set(route.key,route);
  }
  return [...selected.values()];
}
export function sourcePurchaseEntries(entries) {
  const unique=new Map();
  for(const entry of entries)if(!unique.has(entry.id)||entry.source==='bank')unique.set(entry.id,entry);
  return [...unique.values()];
}
const sourcePermanentlyOwned=(ctx,entry)=>{
  const state=ctx.store.getState();
  if(entry.source==='bank')return state.bankPermanentQuestionIds?.includes(entry.id)===true;
  const r=state.dbRights[entry.q.dbId];
  return !!(r?.permanentQuestionIds?.includes(entry.id)||r?.mode==='permanent'&&(r.all||r.questionIds?.includes(entry.id)));
};
const sourceDBSaved=(ctx,entry)=>{
  if(entry.source==='bank')return true;
  const r=ctx.store.getState().dbRights[entry.q.dbId];
  return !!(r&&(r.all||r.questionIds?.includes(entry.id)||r.permanentQuestionIds?.includes(entry.id)));
};
export function acquireSourceSelection(ctx,view,ids,redraw) {
  const entries=resolveSourceSelection(ctx,ids),{esc,openModal,closeModal,toast}=ctx.ui;
  if(!entries.length)return toast('구매할 수 있는 출처 문항이 없습니다.');
  const dbEntries=entries.filter(r=>r.source==='db'),bankEntries=entries.filter(r=>r.source==='bank');
  const groups=[...new Set(entries.map(r=>`${r.source}:${r.q.dbId}`))].map(key=>({key,entries:entries.filter(r=>`${r.source}:${r.q.dbId}`===key)}));
  const reopen=()=>acquireSourceSelection(ctx,view,entries,redraw);
  const acquire=mode=>{
    if(mode==='rental'&&!ctx.store.isActive('db'))return ctx.subscribe('db',reopen);
    let count=0;
    for(const entry of mode==='rental'?dbEntries:sourcePurchaseEntries(entries)){
      if(mode==='rental'?sourceDBSaved(ctx,entry):sourcePermanentlyOwned(ctx,entry))continue;
      const result=entry.source==='bank'?ctx.store.acquireBankQuestion(entry.id):ctx.store.acquireQuestion(entry.id,mode);
      if(!result.ok){closeModal();redraw();toast(result.error||'문항을 추가하지 못했습니다.');return;}
      count++;
    }
    for(const entry of mode==='rental'?dbEntries:entries){view.selected.delete(entry.key);view.selected.delete(entry.id);}
    closeModal();redraw();toast(count?`${count}문항의 출처 DB를 나만의 DB에 추가했습니다.`:'이미 나만의 DB에 보관한 문항입니다.');
    openModal({title:'나만의 DB에 보관했습니다',body:'<p>선택 문항의 출처 DB를 보관했습니다. 구매하지 않은 나머지 문항은 해당 DB에서 추가할 수 있습니다.</p>',footer:'<button class="btn" data-stay>계속 찾기</button><button class="btn primary" data-mydb>나만의 DB 보기</button>',onMount:m=>{m.querySelector('[data-stay]').onclick=closeModal;m.querySelector('[data-mydb]').onclick=()=>{closeModal();ctx.go('mydb');};}});
  };
  const dbUsable=dbEntries.length&&dbEntries.every(r=>ctx.store.canUseQuestion(r.id,'db')),bankUsable=bankEntries.length&&bankEntries.every(r=>ctx.store.canUseQuestion(r.id,'bank'));
  const allDBSaved=dbEntries.every(r=>sourceDBSaved(ctx,r));
  const canRent=dbEntries.length&&dbEntries.every(r=>r.db?.rentalEligible!==false||ctx.store.canUseQuestion(r.id,'db'));
  const needsDB=dbEntries.some(r=>r.db?.rentalEligible!==false&&!ctx.store.canUseQuestion(r.id,'db'));
  const needsBank=bankEntries.some(r=>!ctx.store.canUseQuestion(r.id,'bank'));
  const canBuy=entries.some(r=>!sourcePermanentlyOwned(ctx,r));
  const questionCount=new Set(entries.map(r=>r.id)).size;
  openModal({title:'선택 문항 이용하기',body:`<p>선택한 ${questionCount}문항의 구매·구독 범위를 확인하세요.</p><div class="source-acquire-list">${groups.map(({entries:items})=>`<div><strong>${esc(items[0].label)} · ${esc(items[0].db?.title||items[0].q.sourceTitle||'출처 DB')}</strong><small>선택 ${items.length}문항 / 원본 ${items[0].db?.count??'미확인'}문항</small></div>`).join('')}</div>${dbEntries.length&&bankEntries.length?'<p class="small-note">자료 DB와 문제은행은 별도 상품입니다. 각 구독은 해당 상품의 문항만 이용할 수 있습니다.</p>':''}<p class="small-note">한 문항만 구매해도 원출처 DB가 나만의 DB에 추가됩니다. 구매·구독 정보는 이 브라우저에 저장합니다. 실제 결제는 진행되지 않습니다.</p>`,footer:`${canBuy?'<button class="btn" data-buy>문항 구매하기</button>':''}${needsDB?'<button class="btn primary" data-rent>월 49,000원 DB 구독</button>':''}${needsBank?'<button class="btn primary" data-source-bank-subscribe>월 39,000원 문제은행 구독</button>':''}${dbUsable?`${allDBSaved?'<button class="btn" data-source-mydb>나만의 DB 보기</button>':canRent?'<button class="btn" data-rent>나만의 DB에 보관</button>':''}<button class="btn primary" data-source-paper>${bankEntries.length?`자료 DB ${dbEntries.length}문항 담기`:'문제지에 담기'}</button>`:''}${bankUsable?`<button class="btn primary" data-source-bank-paper>${dbEntries.length?`문제은행 ${bankEntries.length}문항 담기`:'문제지에 담기'}</button>`:''}`,onMount:m=>{
    m.querySelector('[data-buy]')?.addEventListener('click',()=>acquire('permanent'));
    m.querySelector('[data-rent]')?.addEventListener('click',()=>acquire('rental'));
    m.querySelector('[data-source-bank-subscribe]')?.addEventListener('click',()=>ctx.subscribe('bank',reopen));
    m.querySelector('[data-source-paper]')?.addEventListener('click',()=>ctx.addQuestions(dbEntries.map(r=>r.id),'db'));
    m.querySelector('[data-source-bank-paper]')?.addEventListener('click',()=>ctx.addQuestions(bankEntries.map(r=>r.id),'bank'));
    m.querySelector('[data-source-mydb]')?.addEventListener('click',()=>{closeModal();ctx.go('mydb');});
  }});
}
// A known document supplies verified IDs. Other files can only produce literal-text candidates.
export function sourceRegionCandidates(region,questions) {
  questions=questions.filter(q=>q.sourceSearchEligible!==false);
  const verified=region?.confidence==='verified'&&questions.find(q=>q.id===region.questionId);
  if(verified)return {base:verified,verified:true,exactId:region.fingerprintVerified===true?verified.id:'',questions:questions.filter(q=>sourceCategory(q,verified))};
  const text=norm(region?.text),matches=text?questions.filter(q=>{const expected=norm(q.text);return expected.length>=16&&text.includes(expected);}):[];
  return {base:matches[0]||null,verified:false,exactId:'',questions:matches};
}
export function selectDocumentRegion(view,id) {
  const item=view.items.find(region=>region.id===id);if(!item)return false;
  view.selectionVersion=(view.selectionVersion||0)+1;view.activeRegion=id;view.page=item.pageNumber;view.baseId=item.questionId||'';view.tab='all';view.grade='';view.answerType='all';view.include='';view.exclude='';view.manual=false;return true;
}
export function selectInitialDocumentRegion(view) {
  if(view.activeRegion||view.selectionVersion||!view.items.length)return false;
  return selectDocumentRegion(view,view.items[0].id);
}
export function normalizedSourceRect(start,end,width,height) {
  const clamp=(v,max)=>Math.max(0,Math.min(max,v));
  const x1=clamp(start.x,width),x2=clamp(end.x,width),y1=clamp(start.y,height),y2=clamp(end.y,height);
  return {x:Math.min(x1,x2),y:Math.min(y1,y2),width:Math.abs(x2-x1),height:Math.abs(y2-y1)};
}
function resultScope(ctx) {
  return {ownedDBIds:ctx.store.ownedDBs().map(d=>d.id),paperQuestionIds:ctx.store.getState().papers.flatMap(p=>p.questionIds||[])};
}
function regionResults(ctx,view,item,tab=view.tab) {
  const evidence=sourceRegionCandidates(item,ctx.questions);if(!evidence.base)return {...evidence,list:[]};
  const filters={...view.settings,grade:view.grade,answerType:view.answerType,include:view.include,exclude:view.exclude,tab};
  return {...evidence,list:filterSourceQuestions(evidence.questions,evidence.base,filters,resultScope(ctx))};
}
export function setSourceUploadSelection(view,id,checked) {
  if(!view.items.some(item=>item.id===id&&item.imageUrl))return false;
  checked?view.uploadSelected.add(id):view.uploadSelected.delete(id);return true;
}
export async function saveSourceUploads(ctx,view,ids,redraw=()=>{}) {
  if(view.uploadSaving)return;
  const selected=new Set(ids),items=view.items.filter(item=>selected.has(item.id));
  if(!items.length||items.some(item=>!item.imageUrl))return ctx.ui.toast('DB화할 업로드 문항을 선택해 주세요.');
  if(typeof ctx.saveUploadedQuestions!=='function')return ctx.ui.toast('업로드 문항 저장 기능을 불러오지 못했습니다.');
  const doc=view.document,file=view.file;
  view.uploadSaving=true;redraw();
  try {
    const result=await ctx.saveUploadedQuestions({fileName:file?.name||'업로드 문항',items:items.map(item=>({...item,rect:item.rect?{...item.rect}:undefined}))});
    if(view.document!==doc||view.file!==file)return;
    if(result?.ok)items.forEach(item=>view.uploadSelected.delete(item.id));
    return result;
  } catch(error) {
    if(view.document===doc&&view.file===file)ctx.ui.toast(error.message||'업로드 문항을 저장하지 못했습니다.');
  } finally {
    if(view.document===doc&&view.file===file){view.uploadSaving=false;redraw();}
  }
}
export function sourceUploadCards(ctx,view) {
  const {esc}=ctx.ui;
  return view.items.map(item=>{
    const evidence=sourceRegionCandidates(item,ctx.questions);
    return `<article class="sf-upload-card ${item.id===view.activeRegion?'active':''}" data-upload-card="${esc(item.id)}"><header><label class="checkbox"><input type="checkbox" data-source-upload-check="${esc(item.id)}" aria-label="${esc(item.label)} 원본 DB화 선택" ${view.uploadSelected?.has(item.id)?'checked':''} ${!item.imageUrl||view.uploadSaving?'disabled':''}><span>${esc(item.label)}</span></label><small>${item.pageNumber}페이지</small></header><button type="button" class="sf-upload-focus" data-source-item="${esc(item.id)}" aria-label="${esc(item.label)} 출처 보기" aria-pressed="${item.id===view.activeRegion}">${item.imageUrl?`<img src="${esc(item.imageUrl)}" alt="${esc(item.label)} · 업로드 원본" ${item.imageWidth&&item.imageHeight?`width="${Number(item.imageWidth)}" height="${Number(item.imageHeight)}"`:''} loading="lazy">`:'<span>문항 이미지를 불러오고 있습니다.</span>'}</button><footer><span>${evidence.exactId?'완전 동일한 문항 있음':evidence.base?'텍스트 일치 후보':item.confidence==='manual'?'직접 선택한 영역':'자동 분리 · 영역 확인 필요'}</span><button type="button" class="text-btn" data-source-save-upload="${esc(item.id)}" ${!item.imageUrl||view.uploadSaving?'disabled':''}>이 문항 DB화</button></footer></article>`;
  }).join('');
}
const sourceDBFullyPurchased=(ctx,id)=>ctx.store.ownedDBs().some(db=>db.id===id&&db.remainingPurchaseCount===0);
export function sourceResultCard(ctx,view,entry,evidence) {
  const {q,source,key,label,db}=entry,{esc,icon,questionCard}=ctx.ui;
  const usable=!!source&&ctx.store.canUseQuestion(q.id,source),owned=!!source&&sourcePermanentlyOwned(ctx,entry);
  const subscribed=!!source&&ctx.store.isActive(source),excluded=source==='db'&&db?.rentalEligible===false;
  const canBuyDB=!!source&&db&&!sourceDBFullyPurchased(ctx,db.id);
  const match=q.id===evidence.exactId?'완전 동일한 문항':q.id===evidence.base?.id?'텍스트 일치 후보':sourceCategory(q,evidence.base)==='unitCandidates'?'같은 단원 후보':'';
  return `<article class="sf-result-card" data-source-route="${esc(key)}">${match?`<span class="sf-match-label ${q.id===evidence.exactId?'is-exact':''}">${match}</span>`:''}<div class="sf-product-route"><strong>${esc(label)}</strong><span>${source==='bank'?'문제은행 구독 · 개별 구매':source==='db'?(excluded?'개별 구매':'DB 구독 · 개별 구매'):'구매할 수 없는 출처'}</span></div>${questionCard(q,{store:ctx.store,source:source||'db',selectable:!!source,selected:view.selected.has(key)})}${db?`<button class="text-btn sf-db-info" data-source-file="${esc(db.id)}">${source==='bank'?'원출처 · ':''}${esc(db.title)} ${icon('chevron')}</button>`:''}${source?`<div class="sf-card-access">${owned?'<span>문항 구매 완료</span>':subscribed&&!excluded?`<span>${source==='bank'?'문제은행':'DB'} 구독 중</span>`:excluded?'<span>DB 구독 제외 자료</span>':''}${db&&!canBuyDB?'<span>원출처 DB 구매 완료</span>':''}</div><div class="sf-result-actions">${!owned?`<button class="btn" data-source-buy="${esc(key)}">문항 구매하기</button>`:''}${canBuyDB?`<button class="btn" data-source-buy-db="${esc(key)}" aria-label="${esc(db.title)} DB 전체 구매">DB 전체 구매</button>`:''}${!subscribed&&!excluded?`<button class="btn primary" data-source-subscribe="${esc(key)}">${source==='bank'?'문제은행 구독':'DB 구독'}</button>`:''}${usable?`<button class="btn primary" data-source-add="${esc(key)}">문제지에 담기</button>`:''}</div>${source==='bank'&&canBuyDB?'<small class="sf-card-purchase-note">DB 전체 구매는 원출처 자료 DB에 적용됩니다.</small>':''}`:''}</article>`;
}
export function bindSourceResultPurchases(root,ctx,view,redraw) {
  const entry=key=>resolveSourceSelection(ctx,[key]).at(0);
  root.querySelectorAll('[data-source-buy]').forEach(button=>button.onclick=()=>{const route=entry(button.dataset.sourceBuy);if(route)acquireSourceSelection(ctx,view,[route],redraw);});
  root.querySelectorAll('[data-source-buy-db]').forEach(button=>button.onclick=()=>{
    const route=entry(button.dataset.sourceBuyDb);if(!route?.db||sourceDBFullyPurchased(ctx,route.db.id))return;
    if(typeof ctx.commerce?.purchase!=='function')return ctx.ui.toast('DB 구매 정보를 불러오지 못했습니다.');
    ctx.commerce.purchase(route.db.id,'direct');
  });
  root.querySelectorAll('[data-source-subscribe]').forEach(button=>button.onclick=()=>{
    const route=entry(button.dataset.sourceSubscribe);if(!route||route.source==='db'&&route.db?.rentalEligible===false)return;
    ctx.subscribe(route.source,redraw);
  });
  root.querySelectorAll('[data-source-add]').forEach(button=>button.onclick=()=>{
    const route=entry(button.dataset.sourceAdd);if(!route)return;
    if(!ctx.store.canUseQuestion(route.id,route.source))return acquireSourceSelection(ctx,view,[route],redraw);
    ctx.addQuestions([route.id],route.source);
  });
}
function bindResultActions(root,container,ctx,view,redraw,routes) {
  root.querySelectorAll('[data-source-settings]').forEach(b=>b.onclick=()=>settingsModal(container,ctx,view));
  root.querySelectorAll('[data-source-file]').forEach(b=>b.onclick=()=>ctx.openDB(b.dataset.sourceFile));
  root.querySelectorAll('[data-source-tab]').forEach(b=>{
    const select=id=>{view.tab=id;redraw();container.querySelector(`[data-source-tab="${id}"]`)?.focus();};b.onclick=()=>select(b.dataset.sourceTab);
    b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=SOURCE_RESULT_TABS.findIndex(([id])=>id===view.tab),length=SOURCE_RESULT_TABS.length,next=e.key==='Home'?0:e.key==='End'?length-1:(n+(e.key==='ArrowRight'?1:-1)+length)%length;select(SOURCE_RESULT_TABS[next][0]);};
  });
  root.querySelector('#source-text-form')?.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.target);view.include=String(fd.get('include')||'').trim();view.exclude=String(fd.get('exclude')||'').trim();view.grade=String(fd.get('grade')||'');view.answerType=String(fd.get('answerType')||'all');redraw();});
  root.querySelectorAll('[data-source-clear]').forEach(button=>button.onclick=()=>{const selected=new Set(view.selected);clearSourceFilters(view);view.selected=selected;redraw();});
  root.querySelector('[data-source-all]')?.addEventListener('change',e=>{for(const r of routes.filter(r=>r.source))e.target.checked?view.selected.add(r.key):view.selected.delete(r.key);redraw();});
  root.querySelectorAll('[data-qcheck]').forEach(b=>b.onchange=()=>{const key=b.closest('[data-source-route]')?.dataset.sourceRoute;if(!key)return;b.checked?view.selected.add(key):view.selected.delete(key);redraw();});
  root.querySelectorAll('[data-source-upload-check]').forEach(b=>b.onchange=()=>{if(b.disabled)return;setSourceUploadSelection(view,b.dataset.sourceUploadCheck,b.checked);redraw();});
  root.querySelector('[data-source-upload-all]')?.addEventListener('change',e=>{view.items.forEach(item=>setSourceUploadSelection(view,item.id,e.target.checked));redraw();});
  root.querySelector('[data-source-save-uploads]')?.addEventListener('click',()=>saveSourceUploads(ctx,view,[...view.uploadSelected],redraw));
  root.querySelectorAll('[data-source-save-upload]').forEach(button=>button.onclick=()=>saveSourceUploads(ctx,view,[button.dataset.sourceSaveUpload],redraw));
  bindSourceResultPurchases(root,ctx,view,redraw);
  root.querySelectorAll('[data-source-dbize]').forEach(b=>b.onclick=()=>acquireSourceSelection(ctx,view,[b.dataset.sourceDbize],redraw));
  root.querySelectorAll('[data-source-acquire]').forEach(b=>b.onclick=()=>acquireSourceSelection(ctx,view,[...view.selected],redraw));
  root.querySelectorAll('[data-source-selection-clear]').forEach(b=>b.onclick=()=>{view.selected.clear();redraw();});
  root.querySelectorAll('[data-qopen],[data-qaction]').forEach(b=>b.onclick=()=>{
    const entry=resolveSourceSelection(ctx,[b.closest('[data-source-route]')?.dataset.sourceRoute]).at(0);if(!entry)return;
    if(!ctx.store.canUseQuestion(entry.id,entry.source))return acquireSourceSelection(ctx,view,[entry],redraw);
    if(b.hasAttribute('data-qaction'))ctx.addQuestions([entry.id],entry.source);else ctx.requestQuestion(entry.id,entry.source);
  });
}
async function showDocumentPage(container,ctx,view,redraw) {
  const doc=view.document,page=view.page,host=container.querySelector('[data-source-page-host]');if(!doc||!host)return;
  const signal=view.controller?.signal;
  if(!view.pageCanvases.has(page)) {
    const canvas=document.createElement('canvas');
    view.pageCanvases.set(page,doc.renderPage(page,canvas,{scale:1.6,signal}).then(info=>({canvas,info})).catch(error=>{view.pageCanvases.delete(page);throw error;}));
  }
  try {
    const {canvas,info}=await view.pageCanvases.get(page);
    if(view.document!==doc||view.page!==page||container.querySelector('[data-source-page-host]')!==host)return;
    host.innerHTML='';host.style.aspectRatio=`${info.width} / ${info.height}`;host.append(canvas);canvas.setAttribute('aria-label',`${page}페이지 원본`);canvas.setAttribute('role','img');
    const overlay=document.createElement('div');overlay.className='sf-page-regions';host.append(overlay);
    const {esc}=ctx.ui;const regions=view.items.filter(item=>item.pageNumber===page);
    overlay.innerHTML=regions.map(item=>`<button type="button" class="sf-region ${item.id===view.activeRegion?'active':''}" data-page-region="${esc(item.id)}" aria-label="${esc(item.label)} 선택" aria-pressed="${item.id===view.activeRegion}" style="left:${item.rect.x/info.width*100}%;top:${item.rect.y/info.height*100}%;width:${item.rect.width/info.width*100}%;height:${item.rect.height/info.height*100}%"><span>${esc(item.label)}</span></button>`).join('');
    overlay.querySelectorAll('[data-page-region]').forEach(b=>b.onclick=()=>{if(view.manual)return;selectDocumentRegion(view,b.dataset.pageRegion);redraw();});
    if(!view.manual)return;
    let start=null,box=null;
    const point=e=>{const r=host.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*info.width,y:(e.clientY-r.top)/r.height*info.height};};
    overlay.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();start=point(e);overlay.setPointerCapture(e.pointerId);box=document.createElement('div');box.className='sf-manual-region';overlay.append(box);};
    overlay.onpointermove=e=>{if(!start)return;const r=normalizedSourceRect(start,point(e),info.width,info.height);Object.assign(box.style,{left:`${r.x/info.width*100}%`,top:`${r.y/info.height*100}%`,width:`${r.width/info.width*100}%`,height:`${r.height/info.height*100}%`});};
    overlay.onpointercancel=()=>{start=null;box?.remove();};
    overlay.onpointerup=async e=>{
      if(!start)return;const rect=normalizedSourceRect(start,point(e),info.width,info.height);start=null;box?.remove();
      if(rect.width<12||rect.height<12)return ctx.ui.toast('문항 전체가 들어오도록 영역을 조금 더 크게 선택해 주세요.');
      const selectionVersion=view.selectionVersion;view.manual=false;view.cropBusy=true;redraw();
      try{const crop=await doc.cropRegion(page,rect,{scale:2,signal}),text=await doc.getRegionText(page,rect);if(view.document!==doc)return;const item={id:`manual-${++view.manualSequence}`,pageNumber:page,rect,label:`직접 선택 ${view.manualSequence}`,confidence:'manual',questionId:null,text,imageUrl:crop.url,imageWidth:crop.width,imageHeight:crop.height};view.items.push(item);if(view.selectionVersion===selectionVersion&&view.page===page){selectDocumentRegion(view,item.id);view.showOriginal=false;}}
      catch(error){if(view.document===doc&&!signal?.aborted)ctx.ui.toast(error.message||'선택한 영역을 읽지 못했습니다.');}
      finally{if(view.document===doc){view.cropBusy=false;redraw();}}
    };
  } catch(error) {
    if(view.document!==doc||signal?.aborted||container.querySelector('[data-source-page-host]')!==host)return;
    host.innerHTML=`<p class="sf-panel-empty" role="alert">${ctx.ui.esc(error.message||'페이지를 불러오지 못했습니다.')}</p>`;
  }
}
export function renderSource(container,ctx) {
  ensureSourceCSS();const {store,questions,grades,ui}=ctx,{esc,icon,questionCard,toast}=ui,view=getView(store),redraw=()=>{if(container.querySelector('#source-finder'))renderSource(container,ctx);};
  const reset=()=>{resetSourceView(view);redraw();};
  const load=async file=>{
    if(!file)return;
    if(file.size>20*1024*1024||!(/\.(pdf|png|jpe?g|webp)$/i.test(file.name)))return toast('20MB 이하의 PDF 또는 이미지 파일을 선택해 주세요.');
    resetSourceView(view);view.file=file;view.phase='loading';view.controller=new AbortController();const controller=view.controller;redraw();
    try {
      const doc=await openSourceDocument(file,{signal:controller.signal});
      if(view.controller!==controller){doc.destroy()?.catch?.(()=>{});return;}
      view.document=doc;view.matched=doc.isKnownSample;view.phase='workspace';view.reading=true;view.page=1;redraw();
      for(let n=1;n<=doc.pageCount;n++) {
        const regions=await doc.detectRegions(n);if(view.document!==doc||controller.signal.aborted)return;
        for(const region of regions){const crop=await doc.cropRegion(n,region.rect,{scale:1.6,signal:controller.signal});if(view.document!==doc)return;const question=region.confidence==='verified'?questions.find(q=>q.id===region.questionId):null;view.items.push({...region,fingerprintVerified:doc.isKnownSample===true,label:question?`${question.number}번 문항`:region.label,imageUrl:crop.url,imageWidth:crop.width,imageHeight:crop.height});}
        selectInitialDocumentRegion(view);
        view.readPages=n;redraw();
      }
      view.reading=false;redraw();
    } catch(error){if(view.controller!==controller||controller.signal.aborted)return;view.document?.destroy()?.catch?.(()=>{});view.document=null;view.phase='start';view.error=error.message||'파일을 읽지 못했습니다. 다른 파일로 다시 시도해 주세요.';redraw();}
  };
  const sample=async()=>{
    resetSourceView(view);view.phase='loading';view.controller=new AbortController();const controller=view.controller;redraw();
    try{const response=await fetch(MYDB_DEMO_FILE.url,{signal:controller.signal});if(!response.ok)throw new Error('표본 PDF를 불러오지 못했습니다.');const blob=await response.blob();if(view.controller===controller)await load(new File([blob],MYDB_DEMO_FILE.name,{type:'application/pdf'}));}
    catch(error){if(controller.signal.aborted||view.controller!==controller)return;view.phase='start';view.error=error.message||'표본 PDF를 불러오지 못했습니다.';redraw();}
  };
  const header=`<header class="sf-header"><div><h1>출처찾기 &amp; DB화</h1>${view.file?`<p title="${esc(view.file.name)}">${esc(view.file.name)}</p>`:'<p>파일의 문항을 보면서 출처를 찾으세요.</p>'}</div><div class="sf-header-actions">${view.document?`<button class="btn" data-source-original aria-pressed="${view.showOriginal}">${view.showOriginal?'업로드 문항 보기':'PDF 원본 / 영역 수정'}</button>`:''}${view.phase!=='start'?'<button class="btn" data-source-start>처음으로</button><label class="btn sf-file-button">다른 파일<input type="file" data-source-file-input accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp" hidden></label>':''}<a class="btn" href="#mydb">나만의 DB</a></div></header>`;
  if(view.phase==='start'||!view.document&&view.phase!=='loading') {
    container.innerHTML=`${styles}<section id="source-finder" class="sf-workspace">${header}<div class="sf-start"><div class="sf-start-heading">${icon('source')}<h2>출처를 찾을 파일을 올려 주세요.</h2><p>업로드한 시험지를 문항별로 나눠 보고, 선택한 문항의 출처를 확인하세요.</p></div>${view.error?`<p class="sf-error" role="alert">${esc(view.error)}</p>`:''}<label class="sf-drop" data-source-drop><input type="file" data-source-file-input accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp" hidden>${icon('file')}<strong>파일을 끌어 놓거나 클릭해 주세요.</strong><span>PDF, JPG, PNG, WEBP · 최대 20MB</span></label><div class="sf-sample-choice"><div><strong>표본 PDF로 체험</strong><p>서울여중 중1 9문항의 원본과 출처를 확인하세요.</p><a class="sf-download" href="${MYDB_DEMO_FILE.url}" download="${MYDB_DEMO_FILE.name}">표본 PDF 내려받기</a></div><button class="btn primary" data-source-sample>표본 PDF 열기 ${icon('chevron')}</button></div><p class="small-note">파일은 이 브라우저에서 읽습니다. 수집한 DB 표본에서 출처를 찾으며, 이미지 검색·OCR 서버는 연결하지 않았습니다.</p></div></section>`;
    container.querySelector('[data-source-sample]').onclick=sample;
    const drop=container.querySelector('[data-source-drop]');drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();load(e.dataTransfer.files[0]);};
  } else if(view.phase==='loading') {
    container.innerHTML=`${styles}<section id="source-finder" class="sf-workspace">${header}<div class="sf-loading" role="status">파일을 읽고 있습니다.</div></section>`;
  } else {
    const item=view.items.find(r=>r.id===view.activeRegion),evidence=regionResults(ctx,view,item),routes=sourceResultRoutes(ctx,evidence.list);
    view.selected=new Set(resolveSourceSelection(ctx,[...view.selected]).map(r=>r.key));
    const selected=resolveSourceSelection(ctx,[...view.selected]),selectedCount=new Set(selected.map(r=>r.id)).size;
    const counts=new Map(SOURCE_RESULT_TABS.map(([tab])=>[tab,regionResults(ctx,view,item,tab).list.length]));
    const selectable=routes.filter(r=>r.source),uploadable=view.items.filter(item=>item.imageUrl);
    view.uploadSelected=new Set([...view.uploadSelected].filter(id=>view.items.some(item=>item.id===id)));
    const uploadCount=view.uploadSelected.size;
    const resultBody=!item?`<div class="sf-panel-empty"><p>${view.reading?'파일에서 문항 영역을 찾고 있습니다.':'업로드 문항을 선택하거나 원본에서 문항 영역을 지정해 주세요.'}</p></div>`:`<div class="sf-result-evidence"><strong>${esc(item.label)} · ${evidence.exactId?'완전 동일한 문항':evidence.base?'텍스트가 일치하는 검색 후보':'일치하는 출처 없음'}</strong><p>${evidence.exactId?'업로드한 원본과 동일한 문항을 찾았습니다.':evidence.base?'추출한 텍스트가 표본과 일치합니다. 원본을 비교해 확인해 주세요.':item.text?'수집한 DB 표본에서 같은 텍스트를 찾지 못했습니다.':'이 영역에서 비교할 텍스트를 추출하지 못했습니다. 업로드한 문항은 왼쪽에서 볼 수 있습니다.'}</p></div><div class="source-tabs" role="tablist" aria-label="유사문제 검색 조건">${SOURCE_RESULT_TABS.map(([id,label])=>`<button type="button" role="tab" id="source-tab-${id}" aria-controls="source-results" aria-selected="${view.tab===id}" tabindex="${view.tab===id?'0':'-1'}" class="${view.tab===id?'active':''}" data-source-tab="${id}">${label}<small>${counts.get(id)}</small></button>`).join('')}</div><details class="sf-filter-details"><summary>검색 조건</summary><form id="source-text-form" class="source-search"><label class="field"><span>학년</span><select name="grade"><option value="">${evidence.base?`기준 문항 (${esc(evidence.base.grade)})`:'전체'}</option><option value="all" ${view.grade==='all'?'selected':''}>전체 학년</option>${grades.map(g=>`<option value="${esc(g)}" ${view.grade===g?'selected':''}>${esc(g)}</option>`).join('')}</select></label><label class="field"><span>정답 종류</span><select name="answerType">${['all','객관식','주관식','증명','O/X'].map(t=>`<option value="${t}" ${view.answerType===t?'selected':''}>${t==='all'?'전체':t}</option>`).join('')}</select></label><label class="field"><span>텍스트 및 수식 포함</span><input name="include" value="${esc(view.include)}" placeholder="포함할 내용"></label><label class="field"><span>텍스트 및 수식 제외</span><input name="exclude" value="${esc(view.exclude)}" placeholder="제외할 내용"></label><button type="button" class="text-btn" data-source-clear>초기화</button><button class="btn" type="submit">검색</button></form><button type="button" class="text-btn sf-settings-link" data-source-settings>유사문제 검색 설정</button></details><div class="sf-result-toolbar"><label class="checkbox"><input type="checkbox" data-source-all ${selectable.length&&selectable.every(r=>view.selected.has(r.key))?'checked':''} ${!selectable.length?'disabled':''}>현재 출처 결과 선택</label></div><div id="source-results" role="tabpanel" aria-labelledby="source-tab-${view.tab}">${routes.length?routes.map(entry=>sourceResultCard(ctx,view,entry,evidence)).join(''):`<div class="sf-panel-empty"><p>${evidence.base?'현재 조건에 맞는 출처 문항이 없습니다.':'일치하는 출처를 찾지 못했습니다.'}</p>${evidence.base?'<button class="text-btn" data-source-clear>검색 조건 초기화</button>':''}</div>`}</div>`;
    const originalPanel=`<section class="sf-document-panel"><div class="sf-panel-header"><h2>${/\.pdf$/i.test(view.file.name)?'PDF 원본':'업로드 원본'}</h2><div class="sf-page-controls"><button class="sf-icon-button" data-source-page-prev aria-label="이전 페이지" ${view.page<=1?'disabled':''}>${icon('chevron-left')}</button><label><input type="number" min="1" max="${view.document.pageCount}" value="${view.page}" data-source-page-number aria-label="페이지 번호"><span>/ ${view.document.pageCount}</span></label><button class="sf-icon-button" data-source-page-next aria-label="다음 페이지" ${view.page>=view.document.pageCount?'disabled':''}>${icon('chevron')}</button></div></div><div class="sf-document-tools"><button class="btn ${view.manual?'primary':''}" data-source-manual aria-pressed="${view.manual}" ${view.cropBusy?'disabled':''}>${view.manual?'영역 선택 취소':'문항 영역 직접 선택'}</button><span>${view.manual?'원본 위에서 문항 영역을 드래그하세요.':'문항 영역을 수정한 뒤 문항 목록으로 돌아갈 수 있어요.'}</span></div><div class="sf-page-scroll ${view.manual?'is-selecting':''}"><div class="sf-page-sheet" data-source-page-host><p class="sf-panel-empty">페이지를 불러오고 있습니다.</p></div></div></section>`;
    const bulk=selectedCount?`<div class="sf-bulk"><strong>${selectedCount}문항 선택</strong><button class="text-btn" data-source-selection-clear>선택 해제</button><button class="btn primary" data-source-acquire>선택 문항 구매 · 이용</button></div>`:'';
    const uploadedPanel=`<section class="sf-upload-panel"><div class="sf-panel-header"><h2>업로드 문항 <span>${view.items.length}</span></h2>${view.reading?'<small role="status">읽는 중…</small>':'<small>현재 문항은 파란색으로 표시</small>'}</div><div class="sf-upload-toolbar"><label class="checkbox"><input type="checkbox" data-source-upload-all ${uploadable.length&&uploadable.every(item=>view.uploadSelected.has(item.id))?'checked':''} ${!uploadable.length||view.uploadSaving?'disabled':''}>전체 선택</label><button type="button" class="btn primary" data-source-save-uploads ${!uploadCount||view.uploadSaving?'disabled':''}>${view.uploadSaving?'저장 중…':'선택 문항 DB화'}${uploadCount?` (${uploadCount})`:''}</button></div><div class="sf-upload-list" data-source-items aria-label="분리한 업로드 문항 목록">${view.items.length?sourceUploadCards(ctx,view):`<div class="sf-panel-empty"><p>${view.reading?'문항 영역을 찾고 있습니다.':'자동으로 분리한 문항이 없습니다.'}</p>${!view.reading?'<button class="btn" data-source-edit-region>문항 영역 직접 선택</button>':''}</div>`}</div>${view.document.detectionLimitReached?'<p class="sf-detection-note">자동 분리는 100개까지 표시합니다. 필요한 영역은 직접 선택해 주세요.</p>':''}</section>`;
    const previousItems=container.querySelector('[data-source-items]');
    const previousScroll=previousItems?.scrollTop??view.uploadScroll??0;
    const previousScrollLeft=previousItems?.scrollLeft??view.uploadScrollLeft??0;
    view.uploadScroll=previousScroll;view.uploadScrollLeft=previousScrollLeft;
    const resultScroll=view.renderedRegion===view.activeRegion?container.querySelector('.sf-result-content')?.scrollTop||0:0;
    container.innerHTML=`${styles}<section id="source-finder" class="sf-workspace sf-document-workspace">${header}<div class="sf-workbench-grid ${view.showOriginal?'is-original':''}">${view.showOriginal?originalPanel:uploadedPanel}<section class="sf-document-results"><div class="sf-panel-header"><h2>선택 문항의 출처</h2></div><div class="sf-result-content">${resultBody}<p class="sf-results-note">출처 문항은 상품별 이용 권한에 따라 숫자를 흐리게 표시합니다. 문제은행 표본은 같은 원출처 문항으로 구성한 체험 목록입니다.</p></div></section></div>${bulk?`<div class="sf-workbench-selection">${bulk}</div>`:''}</section>`;
    const changePage=n=>{view.selectionVersion=(view.selectionVersion||0)+1;view.page=Math.max(1,Math.min(view.document.pageCount,Math.trunc(Number(n)||1)));view.manual=false;const first=view.items.find(r=>r.pageNumber===view.page);if(first)selectDocumentRegion(view,first.id);else{view.activeRegion='';view.baseId='';}redraw();};
    container.querySelector('[data-source-page-prev]')?.addEventListener('click',()=>changePage(view.page-1));container.querySelector('[data-source-page-next]')?.addEventListener('click',()=>changePage(view.page+1));container.querySelector('[data-source-page-number]')?.addEventListener('change',e=>changePage(e.target.value));
    container.querySelector('[data-source-manual]')?.addEventListener('click',()=>{view.manual=!view.manual;redraw();});
    container.querySelector('[data-source-edit-region]')?.addEventListener('click',()=>{view.showOriginal=true;view.manual=true;redraw();});
    container.querySelectorAll('[data-source-item]').forEach(b=>b.onclick=()=>{selectDocumentRegion(view,b.dataset.sourceItem);redraw();});
    bindResultActions(container,container,ctx,view,redraw,routes);const uploadAll=container.querySelector('[data-source-upload-all]');if(uploadAll)uploadAll.indeterminate=uploadCount>0&&uploadCount<uploadable.length;if(view.showOriginal)void showDocumentPage(container,ctx,view,redraw);
    const itemList=container.querySelector('[data-source-items]');
    if(itemList){
      itemList.scrollTop=previousScroll;itemList.scrollLeft=previousScrollLeft;
      const active=itemList.querySelector('.sf-upload-card.active');
      if(view.renderedRegion!==view.activeRegion&&active){
        if(active.offsetTop<itemList.offsetTop+previousScroll||active.offsetTop+active.offsetHeight>itemList.offsetTop+previousScroll+itemList.clientHeight)itemList.scrollTop=Math.max(0,active.offsetTop-itemList.offsetTop-10);
        if(itemList.scrollWidth>itemList.clientWidth){
          const bounds=itemList.getBoundingClientRect(),card=active.getBoundingClientRect();
          if(card.left<bounds.left)itemList.scrollLeft=Math.max(0,itemList.scrollLeft+card.left-bounds.left-10);
          else if(card.right>bounds.right)itemList.scrollLeft+=card.right-bounds.right+10;
        }
      }
      view.uploadScroll=itemList.scrollTop;view.uploadScrollLeft=itemList.scrollLeft;
    }
    const resultContent=container.querySelector('.sf-result-content');if(resultContent)resultContent.scrollTop=resultScroll;view.renderedRegion=view.activeRegion;
  }
  container.querySelector('[data-source-original]')?.addEventListener('click',()=>{view.showOriginal=!view.showOriginal;view.manual=false;redraw();});
  container.querySelectorAll('[data-source-start]').forEach(b=>b.onclick=reset);
  container.querySelectorAll('[data-source-file-input]').forEach(input=>input.onchange=e=>load(e.target.files[0]));
}
