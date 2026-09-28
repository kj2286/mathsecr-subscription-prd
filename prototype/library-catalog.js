export {BOOK_BRANDS} from './library-hub.js';
import {librarySidebar,subscriptionBanner,bindLibraryBanners,bookBrandTree,brandTreeHTML} from './library-hub.js';
import {pickerMarkup,createCurriculumState} from './curriculum-picker.js';
import {dbCartShortcut} from './db-commerce.js';

const normal=value=>String(value||'').replace(/\s+/g,'').toLocaleLowerCase('ko');
export const SCHOOL_REGIONS=['서울시','경기','인천','강원','충북','충남','대전','세종','전북','전남','광주','경북','경남','대구','울산','부산','제주'];
// District labels from the operating service's public region-code table, captured 2026-09-23.
// Evidence: work/reference/store-20260923/school-files_files/9905-addd3e1421646243.js (geographic data only).
export const SCHOOL_DISTRICTS=Object.freeze({
  "서울시":Object.freeze(["종로구","중구","용산구","성동구","광진구","동대문구","중랑구","성북구","강북구","도봉구","노원구","은평구","서대문구","마포구","양천구","강서구","구로구","금천구","영등포구","동작구","관악구","서초구","강남구","송파구","강동구"]),
  "부산":Object.freeze(["중구","서구","동구","영도구","부산진구","동래구","남구","북구","해운대구","사하구","금정구","강서구","연제구","수영구","사상구","기장군"]),
  "대구":Object.freeze(["중구","동구","서구","남구","북구","수성구","달서구","달성군","군위군"]),
  "인천":Object.freeze(["중구","동구","미추홀구","연수구","남동구","부평구","계양구","서구","강화군","옹진군"]),
  "광주":Object.freeze(["동구","서구","남구","북구","광산구"]),
  "대전":Object.freeze(["동구","중구","서구","유성구","대덕구"]),
  "울산":Object.freeze(["중구","남구","동구","북구","울주군"]),
  // Keep the city-level entry; the source's additional 읍/면 entries are below this filter's scope.
  "세종":Object.freeze(["세종시"]),
  "경기":Object.freeze(["수원시","성남시","의정부시","안양시","부천시","광명시","평택시","동두천시","안산시","고양시","과천시","구리시","남양주시","오산시","시흥시","군포시","의왕시","하남시","용인시","파주시","이천시","안성시","김포시","화성시","광주시","양주시","포천시","여주시","연천군","가평군","양평군"]),
  "강원":Object.freeze(["춘천시","원주시","강릉시","동해시","태백시","속초시","삼척시","홍천군","횡성군","영월군","평창군","정선군","철원군","화천군","양구군","인제군","고성군","양양군"]),
  "충북":Object.freeze(["청주시","충주시","제천시","보은군","옥천군","영동군","증평군","진천군","괴산군","음성군","단양군"]),
  "충남":Object.freeze(["천안시","공주시","보령시","아산시","서산시","논산시","계룡시","당진시","금산군","부여군","서천군","청양군","홍성군","예산군","태안군"]),
  "전북":Object.freeze(["전주시","군산시","익산시","정읍시","남원시","김제시","완주군","진안군","무주군","장수군","임실군","순창군","고창군","부안군"]),
  "전남":Object.freeze(["목포시","여수시","순천시","나주시","광양시","담양군","곡성군","구례군","고흥군","보성군","화순군","장흥군","강진군","해남군","영암군","무안군","함평군","영광군","장성군","완도군","진도군","신안군"]),
  "경북":Object.freeze(["포항시","경주시","김천시","안동시","구미시","영주시","영천시","상주시","문경시","경산시","의성군","청송군","영양군","영덕군","청도군","고령군","성주군","칠곡군","예천군","봉화군","울진군","울릉군"]),
  "경남":Object.freeze(["창원시","진주시","통영시","사천시","김해시","밀양시","거제시","양산시","의령군","함안군","창녕군","고성군","남해군","하동군","산청군","함양군","거창군","합천군"]),
  "제주":Object.freeze(["제주시","서귀포시"]),
});
export const BOOK_SUBJECTS=['공통수학1','공통수학2','대수','미적분1','확률과통계','기하'];
const regionKey=value=>String(value||'').replace(/특별자치|특별|광역|[시도]/g,'');
const schoolLabel=db=>db.schoolFullName||db.school||'';
const unique=values=>[...new Set(values.filter(Boolean))];
export function schoolLocationOptions(dbs,filter={}) {
  const schools=dbs.filter(db=>db.kind==='school');
  const inRegion=filter.region?schools.filter(db=>regionKey(db.region)===regionKey(filter.region)):[];
  const inDistrict=filter.district?inRegion.filter(db=>db.district===filter.district):[];
  const region=SCHOOL_REGIONS.find(value=>regionKey(value)===regionKey(filter.region));
  return {regions:SCHOOL_REGIONS,districts:unique([...(SCHOOL_DISTRICTS[region]||[]),...inRegion.map(db=>db.district)]),schools:unique(inDistrict.map(schoolLabel))};
}
export function updateSchoolLocation(filter,key,value) {
  if(!['region','district','school'].includes(key))return filter;
  if(key==='region'&&value)value=SCHOOL_REGIONS.find(region=>regionKey(region)===regionKey(value))||value;
  if(filter[key]!==value){filter[key]=value;if(key==='region'){filter.district='';filter.school='';}else if(key==='district')filter.school='';}
  return filter;
}
export function resetCatalogScope(filter,previous,next) {
  if(!previous||previous===next)return filter;
  const sameSchool=previous.split('/')[1]==='school'&&next.split('/')[1]==='school';
  const location=sameSchool?{region:filter.region,district:filter.district,school:filter.school}:{};
  Object.assign(filter,{grade:'',query:'',subject:'',unit:'',curriculum:createCurriculumState(),sideSearch:'',year:'',region:'',district:'',school:'',semester:'',exam:'',sourceDb:'',brand:'',refs:[],similarity:'all',explanation:'',bookLevels:null,bookSubjects:null,bookBrands:null,bookPriceMin:'',bookPriceMax:''},location);
  return filter;
}
export function bookSubjectOptions(dbs) {return unique([...BOOK_SUBJECTS,...dbs.filter(db=>db.kind==='book').map(db=>db.subject)]);}
export function compareBookCatalog(a,b,sort='year') {
  return sort==='name'?a.title.localeCompare(b.title,'ko'):(Number(b.year)||0)-(Number(a.year)||0)||Number(a.rentalEligible===false)-Number(b.rentalEligible===false)||Number(!!a.sample)-Number(!!b.sample);
}
export function prepareBookScope(filter) {
  Object.assign(filter,{mode:'quick',special:'type',sideSearch:'',grade:'',year:'',region:'',district:'',school:'',semester:'',exam:'',subject:'',unit:'',curriculum:createCurriculumState(),explanation:'',refs:[],sourceDb:'',similarity:'all'});
  return filter;
}
export function libraryFormControls(container,expectedForm) {
  const form=container.querySelector('#library-form');
  if(!form||(expectedForm&&form!==expectedForm))return [];
  return [...new Set([...Array.from(form.elements||[]),...container.querySelectorAll('[form="library-form"]')])];
}
export function readBookFilters(container,filter,expectedForm) {
  const form=container.querySelector('#library-form');
  if(!form||(expectedForm&&form!==expectedForm))return false;
  const controls=libraryFormControls(container,form);
  for(const key of ['query','bookPriceMin','bookPriceMax']){
    const control=controls.find(input=>input.name===key);if(control)filter[key]=control.value;
  }
  // Missing or detached controls are not an intentional "select none" action.
  for(const key of ['bookLevels','bookSubjects','bookBrands']){
    const group=controls.filter(input=>input.name===key&&input.type==='checkbox');
    if(group.length)filter[key]=group.filter(input=>input.checked).map(input=>input.value);
  }
  return true;
}
export function hasBookExplanation(db) {return /해설\s*(?:있음|[1-9]\d*\s*개)/.test(db.explanation||'');}
export function bookAnswerCount(db) {
  if(db.answerCount!=null&&Number.isFinite(Number(db.answerCount)))return Number(db.answerCount);
  const count=String(db.explanation||'').match(/해설\s*([\d,]+)\s*개/);
  return count?Number(count[1].replace(/,/g,'')):null;
}
export function bookPriceError(filter) {
  const values=[filter.bookPriceMin,filter.bookPriceMax].map(v=>String(v??'').replace(/,/g,'').trim());
  if(values.some(v=>v!==''&&(!Number.isFinite(Number(v))||Number(v)<0)))return '가격은 0 이상의 숫자로 입력해 주세요.';
  return values.every(v=>v!=='')&&Number(values[0])>Number(values[1])?'최소 가격은 최대 가격보다 클 수 없습니다.':'';
}
export function filterBookOptions(dbs,filter,ctx) {
  const min=String(filter.bookPriceMin??'').replace(/,/g,'').trim(),max=String(filter.bookPriceMax??'').replace(/,/g,'').trim();
  if(bookPriceError(filter))return [];
  return filterBookCatalog(dbs,filter.brand,ctx).filter(db=>{
    if(db.kind!=='book'||!hasBookExplanation(db))return false;
    if(Array.isArray(filter.bookLevels)&&!filter.bookLevels.includes(db.grade.startsWith('중')?'middle':'high'))return false;
    if(Array.isArray(filter.bookSubjects)&&!filter.bookSubjects.some(subject=>normal(subject)===normal(db.subject)))return false;
    if(Array.isArray(filter.bookBrands)&&!filter.bookBrands.includes(db.publisher))return false;
    if((min!==''||max!=='')&&(db.price==null||!Number.isFinite(Number(db.price))))return false;
    return (min===''||Number(db.price)>=Number(min))&&(max===''||Number(db.price)<=Number(max));
  });
}
export function filterBookCatalog(dbs,brandId,ctx) {
  if(!brandId)return dbs;
  const find=items=>{for(const item of items){if(item.id===brandId)return item;const child=item.children&&find(item.children);if(child)return child;}return null;};
  const brand=find(bookBrandTree(ctx));if(!brand)return[];
  const matches=(db,item)=>{if(item.children?.length)return item.children.some(child=>matches(db,child));if(item.publisher&&db.publisher!==item.publisher)return false;const terms=item.matchText?(Array.isArray(item.matchText)?item.matchText:[item.matchText]):[];return terms.length?terms.every(term=>normal(db.title).includes(normal(term))):item.publisher?true:normal(db.publisher)===normal(item.label);};
  return dbs.filter(db=>matches(db,brand));
}
function specialFields(ctx,f) {
  const {esc,icon}=ctx.ui;
  const option=(value,label)=>`<option value="${esc(value)}" ${f.sourceDb===value?'selected':''}>${esc(label)}</option>`;
  const range=`<div class="field"><span>난이도</span><div class="range"><input name="min" value="${esc(f.min)}" type="number" min="1" max="9" aria-label="최소 난이도">~<input name="max" value="${esc(f.max)}" type="number" min="1" max="9" aria-label="최대 난이도"></div></div>`;
  return `<div class="tabs small lc-special-tabs">${[['type','유형 기준'],['specific','특정 문항 기준'],['source','출처 기준']].map(([id,label])=>`<button type="button" class="tab ${f.special===id?'active':''}" data-special="${id}">${label}</button>`).join('')}</div><div class="filters lc-special-fields">${f.special==='type'?`<div class="field wide-field"><span>단원 및 유형</span>${pickerMarkup('library',f.curriculum)}</div>${range}`:f.special==='specific'?`<button type="button" class="btn" id="choose-reference">${icon('plus')} 기준 문항 선택 (${f.refs.length}/20)</button>`:`<label class="field wide-field"><span>비교 기준 DB 선택</span><select name="sourceDb"><option value="">출처를 선택하세요</option>${ctx.dbs.map(d=>option(d.id,d.title)).join('')}</select></label>${range}`}${f.special!=='type'?`<label class="field"><span>유사도</span><select name="similarity">${[['all','전체'],['same','거의 같은 문제'],['number','숫자 변형 문제'],['similar','유사 문제']].map(([value,label])=>`<option value="${value}" ${f.similarity===value?'selected':''}>${label}</option>`).join('')}</select></label>`:''}</div>${f.special!=='type'?'<p class="small-note lc-similarity-note">현재 문항의 출처·학년·유형으로 비교합니다. 이미지 기반 유사도 검색은 연동 전입니다.</p>':''}`;
}
function bookPriceMarkup(ctx,db) {
  const {money}=ctx.ui,price=Number(db.price),original=Number(db.originalPrice),hasPrice=db.price!=null&&Number.isFinite(price),discount=hasPrice&&original>price?Math.round((1-price/original)*100):0;
  return `<div class="lc-book-price">${discount?`<del>${money(original)}</del>`:''}<strong>${hasPrice?money(price):'가격 미확인'}</strong>${discount?`<span>${discount}% 할인</span>`:''}</div>`;
}
function bookPurchaseActions(ctx,db,owned) {
  const {esc}=ctx.ui,complete=owned?.remainingPurchaseCount===0||owned?.mode==='permanent'&&owned?.all;
  return `<div class="lc-book-actions"><button class="btn lc-book-cart" type="button" data-purchase-db="${esc(db.id)}" data-purchase-action="cart" ${complete?'disabled':''}>담기</button>${complete?`<button class="btn primary" type="button" data-use-book="${esc(db.id)}">DB 열기</button>`:`<button class="btn primary" type="button" data-purchase-db="${esc(db.id)}" data-purchase-action="buy">바로 구매</button>`}</div>`;
}
function bookStats(ctx,db) {
  const {esc}=ctx.ui;
  return `<span class="lc-book-questions">문제${db.count}/해설${bookAnswerCount(db)??'미확인'}</span><div class="lc-book-stat"><span>평균 <b>${db.avg??'미확인'}</b></span><span class="lc-book-distribution-label">난이도</span>${db.bins?.length?`<span class="lc-book-distribution">${db.bins.map((count,index)=>`<span style="--lc-level:${['#dd8500','#00764b','#ff4f4f','#494952'][index]}">${count}</span>`).join('')}</span>`:''}</div><span class="lc-book-publisher">${esc(db.publisher)}</span>`;
}
function bookCards(ctx,list,f) {
  const {esc,icon}=ctx.ui;
  if(!list.length)return '<div class="empty"><h3>검색 결과가 없습니다.</h3><button class="btn" type="button" data-book-reset>전체 다시 보기</button></div>';
  const owned=new Map(ctx.store.ownedDBs().map(db=>[db.id,db]));
  const cover=db=>`<button class="lc-book-cover" type="button" data-preview="${esc(db.id)}" aria-label="${esc(db.title)} 미리보기">${db.preview?`<img src="${esc(db.preview)}" alt="${esc(db.title)} 표지" loading="lazy">`:icon('book')}</button>`;
  const title=db=>`<button class="lc-book-title" type="button" data-open-db="${esc(db.id)}">${esc(db.title)}</button>${db.sample?'<span class="badge lc-example-badge">예시 교재</span>':''}${db.rentalEligible===false?'<span class="badge orange">구독 제외</span>':''}`;
  if(f.bookLayout==='list')return `<div class="lc-book-list">${list.map(db=>`<article class="lc-book-row" data-db="${esc(db.id)}" tabindex="0" role="group" aria-label="${esc(db.title)}">${cover(db)}<div class="lc-book-row-copy"><div class="lc-book-row-heading">${title(db)}</div><div class="lc-book-row-meta">${bookStats(ctx,db)}</div>${bookPriceMarkup(ctx,db)}</div>${bookPurchaseActions(ctx,db,owned.get(db.id))}</article>`).join('')}</div>`;
  return `<div class="lc-book-grid">${list.map(db=>`<article class="lc-book-card" data-db="${esc(db.id)}" tabindex="0" role="group" aria-label="${esc(db.title)}">${cover(db)}<div class="lc-book-copy">${title(db)}<div class="lc-book-grid-meta">${bookStats(ctx,db)}</div>${bookPriceMarkup(ctx,db)}${bookPurchaseActions(ctx,db,owned.get(db.id))}</div></article>`).join('')}</div>`;
}
export function schoolLocationFields(ctx,filter) {
  const {esc,icon}=ctx.ui,options=schoolLocationOptions(ctx.dbs,filter),state=ctx.store.getState();
  const favoriteActive=value=>{const saved=ctx.store.regionFavoriteLocation?.(value);return saved?regionKey(saved.region)===regionKey(filter.region)&&saved.district===(filter.district||''):value===[filter.region,filter.district].filter(Boolean).join(' ');};
  const alertLabel=school=>state.schoolAlerts.includes(school)?`${school} 새 시험지 알림 해제`:`${school}에 새로운 시험지가 등록되면 알림받기`;
  const row=(key,label,values)=>`<div class="lc-location-row"><strong>${label}</strong><div class="lc-location-choices" role="group" aria-label="${label} 선택"><button type="button" data-location-key="${key}" data-location-value="" class="${!filter[key]?'active':''}" aria-pressed="${!filter[key]}">전체</button>${values.map(value=>key==='school'?`<span class="lc-school-choice"><button type="button" data-location-key="school" data-location-value="${esc(value)}" class="${filter.school===value?'active':''}" aria-pressed="${filter.school===value}">${esc(value)}</button><button type="button" class="lc-school-alert ${state.schoolAlerts.includes(value)?'is-active':''}" data-school-alert="${esc(value)}" aria-label="${esc(alertLabel(value))}" title="${esc(alertLabel(value))}" aria-pressed="${state.schoolAlerts.includes(value)}">${icon('bell')}</button></span>`:`<button type="button" data-location-key="${key}" data-location-value="${esc(value)}" class="${filter[key]===value?'active':''}" aria-pressed="${filter[key]===value}">${esc(value)}</button>`).join('')}${!values.length?'<span class="lc-location-empty">표시할 학교가 없습니다.</span>':''}</div></div>`;
  const alerts=`<div class="lc-location-row lc-school-subscriptions"><strong>새 시험지 알림</strong><div class="lc-location-choices" role="group" aria-label="새 시험지 알림을 받는 학교">${state.schoolAlerts.length?state.schoolAlerts.map(school=>`<span class="lc-school-alert-chip">${icon('bell')}<span>${esc(school)}</span><button type="button" data-school-alert="${esc(school)}" aria-label="${esc(school)} 새 시험지 알림 해제" title="알림 해제">${icon('close')}</button></span>`).join(''):'<span class="lc-location-empty">학교 옆 알림 버튼으로 새 시험지 알림을 설정하세요.</span>'}</div></div>`;
  return `<div class="lc-location-filter"><div class="lc-location-title"><h2>지역 · 학교</h2><button type="button" class="text-btn" id="favorite-region" ${filter.region&&filter.district?'':'disabled'}>${icon('star')} 관심 지역 저장</button></div><div class="lc-location-row lc-favorite-locations"><strong>관심 지역</strong><div class="lc-location-choices">${state.regionFavorites.map(value=>`<button type="button" data-favorite-region="${esc(value)}" class="${favoriteActive(value)?'active':''}" aria-pressed="${favoriteActive(value)}">${icon('star')}${esc(value)}</button>`).join('')||'<span class="lc-location-empty">시·군·구를 선택한 뒤 저장해 주세요.</span>'}</div></div>${alerts}<div class="lc-location-row"><strong>학년</strong><div class="lc-location-choices" role="group" aria-label="학년 선택">${['',...ctx.grades].map(grade=>`<button type="button" data-catalog-grade="${esc(grade)}" class="${(filter.grade||'')===grade?'active':''}" aria-pressed="${(filter.grade||'')===grade}">${grade||'전체'}</button>`).join('')}</div></div>${row('region','지역',options.regions)}${filter.region?row('district','시·군·구',options.districts):''}${filter.region&&filter.district?row('school','학교',options.schools):''}</div>`;
}
function bookProductFilters(ctx,f) {
  const {esc}=ctx.ui;
  const choices=(name,options,selected)=>options.map(([value,label])=>`<label class="lc-book-option"><input type="checkbox" form="library-form" name="${name}" value="${esc(value)}" ${!Array.isArray(selected)||selected.includes(value)?'checked':''}><span>${esc(label)}</span></label>`).join('');
  return `<aside class="lc-book-filters" aria-label="교재 상품 옵션"><fieldset><legend>학년</legend><div class="lc-book-levels">${choices('bookLevels',[['middle','중등'],['high','고등']],f.bookLevels)}</div></fieldset><fieldset><legend>과목</legend>${choices('bookSubjects',bookSubjectOptions(ctx.dbs).map(value=>[value,value]),f.bookSubjects)}</fieldset><fieldset><legend>브랜드</legend>${brandTreeHTML(ctx,f.brand)}</fieldset><fieldset><legend>가격</legend><label class="lc-price-input"><input form="library-form" name="bookPriceMin" inputmode="numeric" value="${esc(f.bookPriceMin||'')}" placeholder="1" aria-label="최소 가격"><span>이상</span></label><label class="lc-price-input"><input form="library-form" name="bookPriceMax" inputmode="numeric" value="${esc(f.bookPriceMax||'')}" placeholder="3,000,000" aria-label="최대 가격"><span>이하</span></label></fieldset><div class="lc-book-option-actions"><button type="button" class="text-btn" id="reset-filters">초기화</button><button type="submit" form="library-form" class="btn small">조건 적용</button></div></aside>`;
}
function catalogToolbar(ctx,f,count,book,list=[]) {
  const {icon}=ctx.ui;
  return `<div class="list-toolbar"><strong>전체 ${count}개</strong>${book?`<span class="lc-sample-count">실제 교재 ${list.filter(db=>!db.sample).length} · 예시 ${list.filter(db=>db.sample).length}</span>`:''}<span class="grow"></span>${book?`<div class="lc-book-view"><button type="button" data-book-layout="grid" aria-label="썸네일 보기" aria-pressed="${f.bookLayout!=='list'}"><span class="lc-book-view-icon" style="--view-icon:url('assets/store/icon-card-selected.svg')" aria-hidden="true"></span></button><button type="button" data-book-layout="list" aria-label="목록 보기" aria-pressed="${f.bookLayout==='list'}"><span class="lc-book-view-icon" style="--view-icon:url('assets/store/icon-list.svg')" aria-hidden="true"></span></button></div>`:''}<select id="db-sort" aria-label="정렬"><option value="year" ${f.sort==='year'?'selected':''}>출제 최신순</option><option value="name" ${f.sort==='name'?'selected':''}>이름순</option></select><label class="checkbox"><input type="checkbox" id="hide-owned" ${f.hideOwned?'checked':''}>구매내역 숨기기</label>${book?'':`<label class="checkbox"><input type="checkbox" id="show-range" ${f.showRange?'checked':''}>시험범위 보기</label><select id="explanation-filter" aria-label="해설 필터"><option value="">해설 전체</option><option value="yes" ${f.explanation==='yes'?'selected':''}>해설 있음</option><option value="no" ${f.explanation==='no'?'selected':''}>해설 없음</option></select>`}</div>`;
}
export function renderLibraryCatalog(container,ctx,{kind='root',grade='',filter:f,list=[],fieldsHTML='',tableHTML='',sampleHTML='',actionsHTML=''}={}) {
  const {esc,icon}=ctx.ui,book=kind==='book';
  const visible=book?filterBookOptions(list,f,ctx):list;
  const title=f.sideSearch?'DB 검색 결과':grade?`${grade.startsWith('중')?'중학교':'고등학교'} ${grade.slice(1)}학년`:book?'교재 DB':kind==='school'?'내신시험지 DB':'자료 DB';
  if(book){
    container.innerHTML=`<div class="split-view lc-shell">${librarySidebar(ctx,{section:'materials',kind,grade,query:f.sideSearch,brand:f.brand})}<section class="workspace lc-catalog lc-book-catalog"><div class="breadcrumb"><a href="#library">수학비서 DB</a> ${icon('chevron')} 교재 DB</div><div class="heading-row"><h1>교재 DB</h1></div>${dbCartShortcut(ctx)}${subscriptionBanner(ctx,{focus:'book'})}<div class="lc-book-layout">${bookProductFilters(ctx,f)}<section class="lc-book-results"><form id="library-form" class="lc-book-search"><div class="lc-integrated-search"><input name="query" value="${esc(f.query)}" placeholder="검색어 입력" aria-label="교재 DB 검색"><button type="submit" aria-label="검색">${icon('search')}</button></div></form>${catalogToolbar(ctx,f,visible.length,true,visible)}${bookCards(ctx,visible,f)}${sampleHTML}</section></div></section></div>`;
    bindLibraryBanners(container,ctx);return;
  }
  container.innerHTML=`<div class="split-view lc-shell">${librarySidebar(ctx,{section:'materials',kind,grade,query:f.sideSearch,brand:f.brand})}<section class="workspace lc-catalog"><div class="breadcrumb"><a href="#library">수학비서 DB</a> ${icon('chevron')} ${esc(title)}</div><div class="heading-row"><h1>${esc(title)}</h1><div class="actions">${actionsHTML}</div></div>${dbCartShortcut(ctx)}${subscriptionBanner(ctx,{focus:'db'})}
  <form id="library-form"><div class="lc-search-row"><div class="tabs"><button type="button" class="tab ${f.mode==='quick'?'active':''}" data-mode="quick">빠르게 검색</button><button type="button" class="tab ${f.mode==='special'?'active':''}" data-mode="special">특별한 검색</button></div><div class="lc-integrated-search"><input name="query" value="${esc(f.query)}" placeholder="연도, 지역, 학교, 학년, 학기, 과목 검색" aria-label="내신 DB 통합 검색"><button type="submit" aria-label="검색">${icon('search')}</button></div></div>${f.mode==='special'?specialFields(ctx,f):''}${schoolLocationFields(ctx,f)}<div class="filter-panel">${fieldsHTML}<div class="lc-filter-actions"><button type="button" class="text-btn" id="reset-filters">초기화</button><button class="btn small" type="submit">조건 적용</button></div></div></form>
  ${f.sideSearch?`<div class="alert-row">내신·교재 전체에서 “${esc(f.sideSearch)}” 검색 중 <button class="text-btn" id="clear-side">검색 해제</button></div>`:''}${f.region?`<div class="chips"><span class="chip active">${esc(f.region)} ${esc(f.district)}</span></div>`:''}
  ${catalogToolbar(ctx,f,visible.length,false)}${tableHTML}${sampleHTML}</section></div>`;
  bindLibraryBanners(container,ctx);
}
export function bindLibraryCatalog(container,ctx,{filter,onChange,beforeChange=()=>{},onReset=()=>{}}) {
  container.querySelectorAll('[data-book-brand]').forEach(button=>button.onclick=()=>{if(beforeChange()===false)return;filter.brand=button.dataset.bookBrand;filter.bookBrands=null;onChange();});
  container.querySelectorAll('[data-book-layout]').forEach(button=>button.onclick=()=>{filter.bookLayout=button.dataset.bookLayout;onChange();});
  container.querySelectorAll('[data-location-key]').forEach(button=>button.onclick=()=>{if(beforeChange()===false)return;updateSchoolLocation(filter,button.dataset.locationKey,button.dataset.locationValue);onChange();});
  container.querySelectorAll('[data-catalog-grade]').forEach(button=>button.onclick=()=>{if(beforeChange()===false)return;filter.grade=button.dataset.catalogGrade;onChange();});
  container.querySelectorAll('[data-purchase-db]').forEach(button=>button.onclick=()=>{if(button.disabled)return;const id=button.dataset.purchaseDb;if(!ctx.dbs.some(db=>db.id===id))return;ctx.purchaseDB?ctx.purchaseDB(id,button.dataset.purchaseAction):ctx.openDB(id);});
  container.querySelectorAll('[data-book-reset]').forEach(button=>button.onclick=onReset);
  container.querySelectorAll('[data-use-book]').forEach(button=>button.onclick=()=>{
    const id=button.dataset.useBook,db=ctx.dbs.find(item=>item.id===id);if(!db)return;
    ctx.openDB(id);
  });
}
