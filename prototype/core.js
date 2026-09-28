export const STORAGE_KEY = 'subscription-question-bank:v2';
const TIERS = {'등급없음':1,'씨앗':1,'새싹':2,'가지':2,'나무':2,'숲':3,'지구':4};
const fresh = () => ({subscriptions:{bank:{status:'none',expiresAt:null},db:{status:'none',expiresAt:null}},gradeRentals:[],gradeRentalsMigrated:true,dbRights:{},bankPermanentQuestionIds:[],bankPreviewStart:null,papers:[],paperFolders:[],paperWorkspaceInitialized:false,regionFavorites:[],schoolAlerts:[],notifications:[],device:{tier:'씨앗',extra:0,sessions:[{id:'demo-current',name:'현재 브라우저 (체험)',current:true,ip:'예시 기기 · 실제 접속 정보 아님'}]},purchases:[]});
const clone = x => JSON.parse(JSON.stringify(x));
const FAVORITE_REGIONS=['서울시','경기','인천','강원','충북','충남','대전','세종','전북','전남','광주','경북','경남','대구','울산','부산','제주'];
const regionKey=value=>value.replace(/특별자치|특별|광역|[시도]/g,'');
export function regionFavoriteLocation(value){
  let region,district;
  if(typeof value==='string'){
    const parts=value.trim().split(/\s+/);region=parts.shift();district=parts.join(' ');
  }else if(value&&typeof value==='object'&&!Array.isArray(value)){
    if(typeof value.region!=='string'||(value.district!==undefined&&typeof value.district!=='string'))return null;
    region=value.region.trim();district=(value.district||'').trim().replace(/\s+/g,' ');
  }else return null;
  const canonical=FAVORITE_REGIONS.find(item=>regionKey(item)===regionKey(region));
  if(!canonical||(district&&!/^[가-힣0-9·-]+[시군구](?:\s+[가-힣0-9·-]+[시군구])?$/.test(district)))return null;
  return {region:canonical,district,school:''};
}
const favoriteLabel=location=>`${location.region}${location.district?' '+location.district:''}`;
const favoriteKey=value=>{const location=regionFavoriteLocation(value);return location?favoriteLabel(location):null;};
function paperSourceContext(value){
  if(value==null)return null;
  if(typeof value!=='object'||Array.isArray(value)||!value.filters||typeof value.filters!=='object'||Array.isArray(value.filters))throw new Error('source context');
  if(value.originLabel!==undefined&&typeof value.originLabel!=='string')throw new Error('source label');
  const filters={},textKeys=['source','grade','dbId','paperId','unit','include','exclude'],rangeKeys=['yearMin','yearMax','min','max'];
  for(const key of [...textKeys,...rangeKeys])if(value.filters[key]!==undefined){const item=value.filters[key];if(typeof item!=='string'&&!(rangeKeys.includes(key)&&typeof item==='number'&&Number.isFinite(item)))throw new Error('source filter');filters[key]=String(item);}
  if(filters.source!==undefined&&!['all','library','bank','mydb','papers'].includes(filters.source))throw new Error('source kind');
  if(value.filters.dbIds!==undefined){if(!Array.isArray(value.filters.dbIds)||value.filters.dbIds.some(id=>typeof id!=='string'||!id.trim()))throw new Error('DB filter');filters.dbIds=[...new Set(value.filters.dbIds)];if(filters.dbIds.length&&!(filters.dbIds.length===1&&filters.dbIds[0]===filters.dbId))filters.dbId='';}
  else if(filters.dbId)filters.dbIds=[filters.dbId];
  if(value.filters.answers!==undefined){if(!Array.isArray(value.filters.answers)||value.filters.answers.some(a=>typeof a!=='string'))throw new Error('answer filter');filters.answers=[...new Set(value.filters.answers)];}
  for(const key of ['excludeMissingAnswer','excludeMissingSolution'])if(value.filters[key]!==undefined){if(typeof value.filters[key]!=='boolean')throw new Error('source flag');filters[key]=value.filters[key];}
  return {filters,originLabel:value.originLabel||''};
}
function loadedPaperSourceContext(value){try{return paperSourceContext(value);}catch{return null;}}
export function createStore({dbs=[],questions=[],storage=globalThis.localStorage,now=()=>Date.now(),previewUnsubscribedBank=false}={}) {
  const clock=()=>Number(typeof now==='function'?now():now), qmap=new Map(questions.map(q=>[q.id,q])), dmap=new Map(dbs.map(d=>[d.id,d]));
  const listeners=new Set(); let seq=0, state=fresh();
  const uid=()=>`${clock()}-${++seq}-${Math.random().toString(36).slice(2,7)}`;
  const active=k=>['active','canceling'].includes(state.subscriptions[k]?.status)&&Number(state.subscriptions[k].expiresAt)>clock();
  const qids=d=>questions.filter(q=>q.dbId===d).map(q=>q.id);
  try { const raw=JSON.parse(storage?.getItem(STORAGE_KEY)||'null'); if(raw&&typeof raw==='object'&&!Array.isArray(raw)) {
    for(const k of ['bank','db']) {const s=raw.subscriptions?.[k];if(s&&['none','active','canceling','expired'].includes(s.status))state.subscriptions[k]={status:s.status,expiresAt:Number.isFinite(Number(s.expiresAt))?Number(s.expiresAt):null};}
    for(const k of ['gradeRentals','regionFavorites','schoolAlerts'])if(Array.isArray(raw[k]))state[k]=[...new Set(raw[k].filter(x=>typeof x==='string'))];
    for(const [id,r] of Object.entries(raw.dbRights||{}))if(dmap.has(id)&&r&&['rental','permanent'].includes(r.mode)){
      const questionIds=Array.isArray(r.questionIds)?[...new Set(r.questionIds.filter(q=>qmap.get(q)?.dbId===id))]:[];
      const permanentIds=Array.isArray(r.permanentQuestionIds)?r.permanentQuestionIds.filter(q=>qmap.get(q)?.dbId===id):[];
      const permanentQuestionIds=[...new Set([...permanentIds,...(r.mode==='permanent'?questionIds:[])])];
      state.dbRights[id]={mode:r.mode,all:r.all===true,questionIds,permanentQuestionIds};
    }
    // Preserve the DBs shown by old grade registrations once, without making grades an access rule.
    if(raw.gradeRentalsMigrated!==true)for(const db of dbs){
      if(db.rentalEligible===false||!state.gradeRentals.includes(db.grade))continue;
      const r=state.dbRights[db.id];
      if(!r)state.dbRights[db.id]={mode:'rental',all:true,questionIds:[],permanentQuestionIds:[]};
      else if(!(r.mode==='permanent'&&r.all)){
        if(r.mode==='permanent')r.permanentQuestionIds=[...new Set([...r.permanentQuestionIds,...r.questionIds])];
        r.mode='rental';r.all=true;
      }
    }
    if(Array.isArray(raw.bankPermanentQuestionIds))state.bankPermanentQuestionIds=[...new Set(raw.bankPermanentQuestionIds.filter(id=>qmap.has(id)))];
    if(raw.bankPreviewStart?.version===1)state.bankPreviewStart=clone(raw.bankPreviewStart);
    state.paperWorkspaceInitialized=raw.paperWorkspaceInitialized===true;
    if(Array.isArray(raw.paperFolders)){const seen=new Set();state.paperFolders=raw.paperFolders.filter(f=>f&&typeof f.id==='string'&&typeof f.name==='string'&&f.name.trim()&&!seen.has(f.id)&&seen.add(f.id)).map(f=>({id:f.id,name:f.name.trim(),createdAt:Number(f.createdAt)||clock()}));}
    if(Array.isArray(raw.papers))state.papers=raw.papers.filter(p=>p&&typeof p.id==='string'&&typeof p.title==='string').map(p=>({...p,folderId:state.paperFolders.some(f=>f.id===p.folderId)?p.folderId:null,memo:typeof p.memo==='string'?p.memo:'',sourceContext:loadedPaperSourceContext(p.sourceContext),updatedAt:Number(p.updatedAt)||Number(p.createdAt)||clock(),example:p.example===true,questionIds:Array.isArray(p.questionIds)?[...new Set(p.questionIds.filter(id=>qmap.has(id)))]:[],questionSources:Object.fromEntries(Object.entries(p.questionSources||{}).filter(([id,s])=>qmap.has(id)&&['bank','db'].includes(s)))}));
    for(const k of ['notifications','purchases'])if(Array.isArray(raw[k]))state[k]=raw[k].filter(x=>x&&typeof x==='object'&&typeof x.id==='string');
    if(raw.device&&TIERS[raw.device.tier])state.device={tier:raw.device.tier,extra:Math.max(0,Math.min(10-TIERS[raw.device.tier],Math.floor(Number(raw.device.extra)||0))),sessions:Array.isArray(raw.device.sessions)?raw.device.sessions.filter(x=>x&&typeof x.id==='string'):[]};
  }}catch{}
  // Start this review once without a bank subscription; retain all other work and the previous demo status.
  if(previewUnsubscribedBank&&state.bankPreviewStart?.version!==1){
    state.bankPreviewStart={version:1,previousSubscription:clone(state.subscriptions.bank)};
    state.subscriptions.bank={status:'none',expiresAt:null};
  }
  function reconcile(){for(const k of ['bank','db'])if(['active','canceling'].includes(state.subscriptions[k].status)&&!active(k))state.subscriptions[k].status='expired';}
  function persist(){try{storage?.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}}
  function result(fn){reconcile();const r=fn();if(r.ok){reconcile();persist();for(const fn of listeners)fn(clone(state));}return r;}
  const fail=error=>({ok:false,error});
  function canUseQuestion(id,source='db'){
    const q=qmap.get(id);if(!q)return false;
    if(source==='bank')return active('bank')||state.bankPermanentQuestionIds.includes(id);
    if(source!=='db')return false;
    const db=dmap.get(q.dbId),r=state.dbRights[q.dbId],has=r&&(r.all||r.questionIds.includes(id));
    return !!(r?.permanentQuestionIds?.includes(id)||(has&&r.mode==='permanent')||(db&&db.rentalEligible!==false&&active('db')));
  }
  function accessReason(id,source='db'){
    if(canUseQuestion(id,source))return '';
    const q=qmap.get(id);if(!q)return '문항을 찾을 수 없습니다.';
    if(source==='bank')return '문항을 개별 구매하거나 문제은행을 구독해 주세요.';
    if(source!=='db')return '문항 출처를 확인해 주세요.';
    if(dmap.get(q.dbId)?.rentalEligible===false)return '구독 대상에서 제외된 DB입니다. 영구 구매 후 이용할 수 있습니다.';
    const sub=state.subscriptions.db;
    return sub.status==='expired'||(['active','canceling'].includes(sub.status)&&!active('db'))||state.dbRights[q.dbId]?.mode==='rental'
      ?'DB구독이 종료되어 이용할 수 없습니다. 재구독하면 복구됩니다.':'DB를 구독하거나 구매해 주세요.';
  }
  function acquire(ids,mode){if(!['rental','permanent'].includes(mode))return fail('이용 방식을 확인해 주세요.');if(mode==='rental'&&ids.some(id=>dmap.get(qmap.get(id)?.dbId)?.rentalEligible===false))return fail('영구 구매만 가능한 DB입니다.');if(mode==='rental'&&!active('db'))return fail('DB구독이 필요합니다.');if(!ids.length||ids.some(id=>!qmap.has(id)))return fail('문항을 찾을 수 없습니다.');for(const id of ids){const dbId=qmap.get(id).dbId;let r=state.dbRights[dbId];if(!r)r=state.dbRights[dbId]={mode,questionIds:[],all:false,permanentQuestionIds:[]};if(!r.questionIds.includes(id))r.questionIds.push(id);if(mode==='permanent'){if(!r.permanentQuestionIds)r.permanentQuestionIds=[];if(!r.permanentQuestionIds.includes(id))r.permanentQuestionIds.push(id);}else if(r.mode==='permanent'&&!r.permanentQuestionIds?.includes(id)){r.mode='rental';}if(!r.all&&r.questionIds.every(x=>r.permanentQuestionIds?.includes(x)))r.mode='permanent';}state.purchases.unshift({id:uid(),kind:'questions',mode,questionIds:ids,date:clock()});return {ok:true};}
  function normalizeSelection(ids,sources={},source='db'){return [...new Set(ids)].map(id=>({id,source:sources[id]||source}));}
  function checkSelection(items){return items.find(x=>!canUseQuestion(x.id,x.source));}
  function rememberDBQuestions(items){
    const ids=items.filter(x=>{
      if(x.source!=='db')return false;
      const r=state.dbRights[qmap.get(x.id)?.dbId];
      return !(r&&(r.all||r.questionIds.includes(x.id)||r.permanentQuestionIds.includes(x.id)));
    }).map(x=>x.id);
    return ids.length?acquire(ids,'rental'):{ok:true};
  }
  reconcile();persist();
  return {
    getState(){reconcile();persist();return clone(state);},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},isActive:active,canUseQuestion,accessReason,
    subscribePlan(kind){return result(()=>{if(!['bank','db'].includes(kind))return fail('구독을 확인해 주세요.');if(active(kind))return fail('이미 이용 중인 구독입니다.');state.subscriptions[kind]={status:'active',expiresAt:clock()+30*86400000};state.purchases.unshift({id:uid(),kind,price:kind==='bank'?39000:49000,date:clock()});return {ok:true};});},
    cancelPlan(kind){return result(()=>{if(!active(kind))return fail('이용 중인 구독이 없습니다.');state.subscriptions[kind].status='canceling';return {ok:true};});},
    undoCancel(kind){return result(()=>{if(!active(kind)||state.subscriptions[kind].status!=='canceling')return fail('취소할 해지 예약이 없습니다.');state.subscriptions[kind].status='active';return {ok:true};});},
    expirePlan(kind){return result(()=>{if(!['bank','db'].includes(kind))return fail('구독을 확인해 주세요.');state.subscriptions[kind]={status:'expired',expiresAt:clock()};return {ok:true};});},
    // Compatibility for previously loaded UI; grade selection no longer changes rights or saved DBs.
    rentGrade(){return active('db')?{ok:true}:fail('DB구독이 필요합니다.');},
    acquireBankQuestion(id){return result(()=>{
      if(!qmap.has(id))return fail('문항을 찾을 수 없습니다.');
      if(state.bankPermanentQuestionIds.includes(id))return fail('이미 구매한 문항입니다.');
      const r=acquire([id],'permanent');
      if(r.ok){state.bankPermanentQuestionIds.push(id);state.purchases[0].source='bank';}
      return r;
    });},
    acquireQuestion(id,mode='rental'){return result(()=>acquire([id],mode));},acquireRemaining(id,mode='rental'){return result(()=>{const db=dmap.get(id);if(!db)return fail('DB를 찾을 수 없습니다.');if(!['rental','permanent'].includes(mode))return fail('이용 방식을 확인해 주세요.');if(mode==='rental'&&(db.rentalEligible===false||!active('db')))return fail(db.rentalEligible===false?'영구 구매만 가능한 DB입니다.':'DB구독이 필요합니다.');const ids=qids(id);const r=ids.length?acquire(ids,mode):{ok:true};if(r.ok){if(!state.dbRights[id])state.dbRights[id]={mode,questionIds:[],permanentQuestionIds:[],all:false};const alreadyPermanent=state.dbRights[id].all&&state.dbRights[id].mode==='permanent';state.dbRights[id].all=true;state.dbRights[id].mode=alreadyPermanent?'permanent':mode;if(!ids.length)state.purchases.unshift({id:uid(),kind:'db',dbId:id,mode,date:clock()});}return r;});},
    ownedDBs(){return dbs.filter(d=>state.dbRights[d.id]).map(d=>{
      const r=state.dbRights[d.id],ids=qids(d.id),owned=ids.filter(id=>r.all||r.questionIds.includes(id)),total=Number(d.count)||ids.length,count=r.all?total:owned.length;
      const permanentCount=r.mode==='permanent'&&r.all?total:Math.min(total,ids.filter(id=>r.permanentQuestionIds.includes(id)||(r.mode==='permanent'&&r.questionIds.includes(id))).length);
      const rentalAvailable=d.rentalEligible!==false&&active('db'),availableCount=rentalAvailable?total:permanentCount;
      const endedLabel=d.rentalEligible===false?'구독 제외':'구독 종료';
      const label=r.mode==='permanent'?'영구 소유':rentalAvailable?'구독 중':`${endedLabel}${permanentCount?' · 일부 이용 가능':''}`;
      return {...d,mode:r.mode,label,questionIds:owned,all:r.all,ownedCount:count,remainingCount:Math.max(0,total-count),permanentCount,remainingPurchaseCount:Math.max(0,total-permanentCount),availableCount,sampleCount:ids.length,ownedSampleCount:owned.length,active:availableCount>0};
    });},
    regionFavoriteLocation,
    saveRegionFavorite(value){return result(()=>{
      const location=regionFavoriteLocation(value);if(!location?.district)return fail('시도와 시·군·구를 선택해 주세요.');
      const label=favoriteLabel(location);state.regionFavorites=[label,...state.regionFavorites.filter(item=>favoriteKey(item)!==label)];return {ok:true,value:label,location};
    });},
    removeRegionFavorite(value){return result(()=>{
      if(typeof value!=='string'||!value.trim())return fail('지역을 확인해 주세요.');
      const key=favoriteKey(value);state.regionFavorites=state.regionFavorites.filter(item=>item!==value&&(!key||favoriteKey(item)!==key));return {ok:true};
    });},
    toggleRegion(value){return result(()=>{
      if(typeof value!=='string'||!value.trim())return fail('지역을 확인해 주세요.');
      const key=favoriteKey(value),exists=state.regionFavorites.some(item=>item===value||(key&&favoriteKey(item)===key));
      if(exists){state.regionFavorites=state.regionFavorites.filter(item=>item!==value&&(!key||favoriteKey(item)!==key));return {ok:true};}
      if(!key)return fail('시도와 시·군·구를 확인해 주세요.');
      state.regionFavorites=[key,...state.regionFavorites];return {ok:true};
    });},
    toggleSchool(school){return result(()=>{if(typeof school!=='string'||!school.trim())return fail('학교를 확인해 주세요.');const exists=state.schoolAlerts.includes(school);state.schoolAlerts=exists?state.schoolAlerts.filter(x=>x!==school):[...state.schoolAlerts,school];if(!exists)state.notifications.unshift({id:uid(),school,title:`${school} 새 시험지 알림을 등록했습니다.`,read:false,date:clock()});return {ok:true};});},
    dismissNotification(id){return result(()=>{state.notifications=state.notifications.filter(n=>n.id!==id);return {ok:true};});},
    createFolder(name){return result(()=>{if(typeof name!=='string'||!name.trim())return fail('폴더 이름을 입력해 주세요.');const id=uid();state.paperFolders.push({id,name:name.trim(),createdAt:clock()});return {ok:true,id};});},
    renameFolder(id,name){return result(()=>{const f=state.paperFolders.find(f=>f.id===id);if(!f)return fail('폴더를 찾을 수 없습니다.');if(typeof name!=='string'||!name.trim())return fail('폴더 이름을 입력해 주세요.');f.name=name.trim();return {ok:true,id};});},
    deleteFolder(id){return result(()=>{if(!state.paperFolders.some(f=>f.id===id))return fail('폴더를 찾을 수 없습니다.');state.paperFolders=state.paperFolders.filter(f=>f.id!==id);for(const p of state.papers)if(p.folderId===id){p.folderId=null;p.updatedAt=clock();}return {ok:true};});},
    movePapers(ids,folderId=null){return result(()=>{if(!Array.isArray(ids)||ids.some(id=>!state.papers.some(p=>p.id===id)))return fail('문제지를 찾을 수 없습니다.');if(folderId!==null&&!state.paperFolders.some(f=>f.id===folderId))return fail('폴더를 찾을 수 없습니다.');for(const p of state.papers)if(ids.includes(p.id)){p.folderId=folderId;p.updatedAt=clock();}return {ok:true};});},
    duplicatePaper(id,{title}={}){return result(()=>{const p=state.papers.find(p=>p.id===id);if(!p)return fail('문제지를 찾을 수 없습니다.');if(title!==undefined&&(typeof title!=='string'||!title.trim()))return fail('문제지 제목을 입력해 주세요.');const copy={...clone(p),id:uid(),title:title?.trim()||p.title+' (복사본)',issued:false,createdAt:clock(),updatedAt:clock()};state.papers.unshift(copy);return {ok:true,id:copy.id};});},
    initializePaperWorkspace({folders=[],papers=[]}={}){return result(()=>{
      if(state.paperWorkspaceInitialized)return {ok:true};
      if(state.papers.length||state.paperFolders.length){state.paperWorkspaceInitialized=true;return {ok:true};}
      if(!Array.isArray(folders)||!Array.isArray(papers))return fail('예시 작업공간 형식을 확인해 주세요.');
      const ids=new Set(),preparedFolders=[];
      for(const f of folders){if(!f||typeof f.name!=='string'||!f.name.trim())return fail('예시 폴더 이름을 확인해 주세요.');const id=f.id||uid();if(typeof id!=='string'||ids.has(id))return fail('예시 폴더 ID를 확인해 주세요.');ids.add(id);preparedFolders.push({id,name:f.name.trim(),createdAt:clock()});}
      const preparedPapers=[],paperIds=new Set();
      for(const p of papers){if(!p||typeof p.title!=='string'||!p.title.trim()||!Array.isArray(p.questionIds)||p.questionIds.some(id=>!qmap.has(id))||(p.folderId!=null&&!ids.has(p.folderId)))return fail('예시 문제지 정보를 확인해 주세요.');const selected=normalizeSelection(p.questionIds,p.questionSources||{},p.source||'db');if(selected.some(x=>!['bank','db'].includes(x.source)))return fail('문항 출처를 확인해 주세요.');const id=p.id||uid();if(typeof id!=='string'||paperIds.has(id))return fail('예시 문제지 ID를 확인해 주세요.');paperIds.add(id);preparedPapers.push({id,title:p.title.trim(),type:typeof p.type==='string'?p.type:'문제지',mode:typeof p.mode==='string'?p.mode:'basic',folderId:p.folderId||null,memo:typeof p.memo==='string'?p.memo:'',questionIds:selected.map(x=>x.id),questionSources:Object.fromEntries(selected.map(x=>[x.id,x.source])),issued:false,example:true,createdAt:clock(),updatedAt:clock()});}
      state.paperFolders=preparedFolders;state.papers=preparedPapers;state.paperWorkspaceInitialized=true;return {ok:true};
    });},
    createPaper({title,type='문제지',mode='basic',questionIds=[],questionSources={},source='db',folderId=null,memo='',sourceContext=null}={}){return result(()=>{if(typeof title!=='string'||!title.trim())return fail('문제지 제목을 입력해 주세요.');if(folderId!==null&&!state.paperFolders.some(f=>f.id===folderId))return fail('폴더를 찾을 수 없습니다.');if(!Array.isArray(questionIds)||typeof memo!=='string')return fail('문제지 정보를 확인해 주세요.');let savedContext;try{savedContext=paperSourceContext(sourceContext);}catch{return fail('문항 출처와 검색 조건을 확인해 주세요.');}const selected=normalizeSelection(questionIds,questionSources,source);if(selected.some(x=>!['bank','db'].includes(x.source)))return fail('문항 출처를 확인해 주세요.');const bad=checkSelection(selected);if(bad)return fail(accessReason(bad.id,bad.source));const remembered=rememberDBQuestions(selected);if(!remembered.ok)return remembered;const id=uid();state.papers.unshift({id,title:title.trim(),type,mode,folderId,memo,sourceContext:savedContext,example:false,questionIds:selected.map(x=>x.id),questionSources:Object.fromEntries(selected.map(x=>[x.id,x.source])),issued:false,createdAt:clock(),updatedAt:clock()});return {ok:true,id};});},
    updatePaper(id,patch){return result(()=>{
      const p=state.papers.find(p=>p.id===id);if(!p)return fail('문제지를 찾을 수 없습니다.');if(!patch||typeof patch!=='object'||Array.isArray(patch))return fail('문제지 정보를 확인해 주세요.');
      if(patch.folderId!==undefined&&patch.folderId!==null&&!state.paperFolders.some(f=>f.id===patch.folderId))return fail('폴더를 찾을 수 없습니다.');
      for(const key of ['title','type','mode','memo'])if(patch[key]!==undefined&&typeof patch[key]!=='string')return fail('문제지 정보를 확인해 주세요.');
      if(patch.title!==undefined&&!patch.title.trim())return fail('문제지 제목을 입력해 주세요.');if(patch.issued!==undefined&&typeof patch.issued!=='boolean')return fail('출제 상태를 확인해 주세요.');
      const metadata={};try{if(patch.sourceContext!==undefined)metadata.sourceContext=paperSourceContext(patch.sourceContext);for(const key of ['issueSettings','points'])if(patch[key]!==undefined){const value=patch[key];if(value===null||typeof value!=='object')return fail('편집 설정을 확인해 주세요.');metadata[key]=JSON.parse(JSON.stringify(value,(k,v)=>{if(['__proto__','constructor','prototype'].includes(k)||typeof v==='function'||typeof v==='symbol'||typeof v==='bigint'||(typeof v==='number'&&!Number.isFinite(v)))throw new Error();return v;}));}}catch{return fail('편집 설정을 확인해 주세요.');}
      const ids=patch.questionIds??p.questionIds;if(!Array.isArray(ids))return fail('문항 목록을 확인해 주세요.');const sources={...p.questionSources,...patch.questionSources},selected=normalizeSelection(ids,sources,patch.source||'db');if(selected.some(x=>!['bank','db'].includes(x.source)))return fail('문항 출처를 확인해 주세요.');
      if(patch.issued||patch.questionIds||patch.questionSources){const toCheck=patch.issued?selected:selected.filter(x=>!p.questionIds.includes(x.id)||x.source!==(p.questionSources?.[x.id]||'db'));const bad=checkSelection(toCheck);if(bad)return fail(accessReason(bad.id,bad.source));}if(patch.issued&&!ids.length)return fail('문항을 담아 주세요.');
      if(patch.questionIds||patch.questionSources){const added=selected.filter(x=>!p.questionIds.includes(x.id)||x.source!==(p.questionSources?.[x.id]||'db'));const remembered=rememberDBQuestions(added);if(!remembered.ok)return remembered;}
      for(const k of ['title','type','mode','issued','folderId','memo'])if(patch[k]!==undefined)p[k]=k==='title'?patch[k].trim():patch[k];Object.assign(p,metadata);p.questionIds=selected.map(x=>x.id);p.questionSources=Object.fromEntries(selected.map(x=>[x.id,x.source]));if(patch.questionIds&&!patch.issued)p.issued=false;p.updatedAt=clock();return {ok:true,id};
    });},
    addToPaper(id,ids,source='db'){return result(()=>{const p=state.papers.find(p=>p.id===id);if(!p)return fail('문제지를 찾을 수 없습니다.');const selected=normalizeSelection(ids,{},source),bad=checkSelection(selected);if(bad)return fail(accessReason(bad.id,bad.source));const remembered=rememberDBQuestions(selected.filter(x=>!p.questionIds.includes(x.id)));if(!remembered.ok)return remembered;for(const x of selected){if(!p.questionIds.includes(x.id)){p.questionIds.push(x.id);p.questionSources[x.id]=x.source;}}p.issued=false;p.updatedAt=clock();return {ok:true,id};});},
    deletePaper(id){return result(()=>{state.papers=state.papers.filter(p=>p.id!==id);return {ok:true};});},
    setDeviceTier(tier){return result(()=>{if(!TIERS[tier])return fail('회원 등급을 확인해 주세요.');if(state.device.sessions.length>TIERS[tier]+state.device.extra)return fail('접속 기기를 먼저 해제해 주세요.');state.device.tier=tier;state.device.extra=Math.min(state.device.extra,10-TIERS[tier]);return {ok:true};});},
    addDevices(qty){return result(()=>{if(!Number.isInteger(qty)||qty<1||state.device.extra+qty>9||TIERS[state.device.tier]+state.device.extra+qty>10)return fail('기기는 총 10대까지 등록할 수 있습니다.');state.device.extra+=qty;state.purchases.unshift({id:uid(),kind:'device',quantity:qty,price:qty*15000,method:'card',date:clock()});return {ok:true};});},
    loginDevice(name='새 체험 기기'){return result(()=>{if(state.device.sessions.length>=Math.min(10,TIERS[state.device.tier]+state.device.extra))return fail('등록 가능한 기기 수를 초과했습니다.');const id=uid();state.device.sessions.push({id,name:typeof name==='string'?name:'새 체험 기기',current:false,loggedInAt:clock(),ip:'예시 기기 · 실제 접속 정보 아님'});return {ok:true,id};});},
    logoutDevice(id){return result(()=>{state.device.sessions=state.device.sessions.filter(d=>d.id!==id);return {ok:true};});},reset(){return result(()=>{state=fresh();return {ok:true};});}
  };
}
