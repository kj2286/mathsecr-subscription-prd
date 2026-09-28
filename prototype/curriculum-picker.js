// Labels observed in curriculum-{new,old}-open.html; deeper branches come only from actual question.unit paths.
export const CURRICULUM_ROOTS={new:['중1-1','중1-2','중2-1','중2-2','중3-1','중3-2','공통수학1','공통수학2','대수','미적분1','확률과 통계','미적분2','기하','이산수학','경제수학','실용수학','심화수학','고급수학','인공지능수학','수학과제탐구'],old:['중1-1','중1-2','중2-1','중2-2','중3-1','중3-2','수상','수하','수1','수2','확통','미적','기하','22년 개정(행렬)','이산수학','경제수학','실용수학'],contest:['경시']};
const clean=value=>String(value||'').trim().replace(/^\d+\s+/,'');
export const curriculumPath=value=>String(value||'').split(' > ').map(clean).filter(Boolean).join(' > ');
const contains=(parent,child)=>child===parent||child.startsWith(parent+' > ');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createCurriculumState(){return {curriculum:'new',selectedPaths:[]};}
export function resetCurriculumSelection(state){state.selectedPaths=[];return state;}
export function questionMatchesCurriculum(q,state=createCurriculumState()){
 const paths=state.selectedPaths||[];if(!paths.length)return true;
 if((q.curriculum||'new')!==(state.curriculum||'new'))return false;
 const path=curriculumPath(q.unit);return paths.some(p=>contains(curriculumPath(p),path));
}
export function curriculumTree(questions=[],curriculum='new'){
 const roots=[];const add=(path)=>{let children=roots,prefix=[];for(const label of path){prefix.push(clean(label));let node=children.find(n=>n.label===clean(label));if(!node){node={label:clean(label),code:prefix.length>1?(String(label).match(/^\d+\s+/)?.[0].trim()||''):'',path:prefix.join(' > '),children:[]};children.push(node);}if(!node.code&&prefix.length>1)node.code=String(label).match(/^\d+\s+/)?.[0].trim()||'';children=node.children;}};
 (CURRICULUM_ROOTS[curriculum]||[]).forEach(root=>add([root]));
 if(curriculum!=='contest'){
  ['소인수분해','최대공약수와 최소공배수','정수와 유리수','정수와 유리수의 계산','문자와 식','일차방정식','일차방정식의 활용','좌표평면과 그래프','정비례와 반비례'].forEach((label,i)=>add(['중1-1',String(i+1).padStart(2,'0')+' '+label]));
  if(curriculum==='new'){
   ['소수와 합성수','거듭제곱','소인수의 뜻과 소인수분해','약수의 개수','추론 및 활용'].forEach((label,i)=>add(['중1-1','소인수분해',String(i+1).padStart(2,'0')+' '+label]));
   ['소수와 합성수1 (약수)','소수와 합성수2 (배수)','소수와 합성수3 (소수와 합성수의 뜻과 해석)','소수와 합성수4 (성질)'].forEach((label,i)=>add(['중1-1','소인수분해','소수와 합성수',String(i+1).padStart(2,'0')+' '+label]));
  }
 }
 questions.filter(q=>(q.curriculum||'new')===curriculum).forEach(q=>add(String(q.unit||'').split(' > ').filter(Boolean)));
 return roots;
}
function flatten(nodes){return nodes.flatMap(n=>[n,...flatten(n.children)]);}
function leaves(node){return node.children.length?node.children.flatMap(leaves):[node.path];}
export function toggleCurriculumPath(state,path,checked,tree){
 path=curriculumPath(path);let selected=[...(state.selectedPaths||[])].map(curriculumPath);
 if(checked){selected=selected.filter(p=>!contains(path,p));if(!selected.some(p=>contains(p,path)))selected.push(path);}
 else{
  // Removing a child of a selected parent retains the parent's other known leaves.
  const nodes=flatten(tree);selected=selected.flatMap(p=>contains(p,path)&&p!==path?leaves(nodes.find(n=>n.path===p)||{path:p,children:[]}).filter(leaf=>!contains(path,leaf)):contains(path,p)?[]:[p]);
 }
 state.selectedPaths=[...new Set(selected)];return state;
}
function summary(state){const label={new:'신교육',old:'구교육',contest:'경시'}[state.curriculum]||'신교육';return `단원 및 유형 선택(${label})${state.selectedPaths?.length?' · '+state.selectedPaths.length+'개':''}`;}
export function pickerMarkup(id,state=createCurriculumState()){return `<button type="button" class="curriculum-trigger" data-curriculum-picker="${esc(id)}" aria-haspopup="dialog" aria-expanded="false"><span>${esc(summary(state))}</span><span aria-hidden="true">⌄</span></button>`;}
const pickerViews=new WeakMap();
export function bindCurriculumPicker(root,id,{questions=[],state=createCurriculumState(),onChange=()=>{}}={}){
 const trigger=[...root.querySelectorAll('[data-curriculum-picker]')].find(el=>el.dataset.curriculumPicker===id);if(!trigger)return ()=>{};
 const doc=trigger.ownerDocument,win=doc.defaultView;let saved=pickerViews.get(state);if(!saved){saved={query:'',expanded:new Set(),open:false,cleanup:null};pickerViews.set(state,saved);}saved.cleanup?.();let popup=null,query=saved.query,expanded=saved.expanded,tree=[];const controller=new win.AbortController();const opts={signal:controller.signal};
 const close=(preserve=false)=>{if(!preserve)saved.open=false;popup?.remove();popup=null;trigger.setAttribute('aria-expanded','false');};
 const position=()=>{if(!popup)return;const r=trigger.getBoundingClientRect(),width=Math.min(350,win.innerWidth-16),below=win.innerHeight-r.bottom-8,above=r.top-8;const down=below>=Math.min(500,above);const height=Math.max(80,Math.min(500,down?below:above));popup.style.width=width+'px';popup.style.maxHeight=height+'px';popup.style.left=Math.max(8,Math.min(r.left,win.innerWidth-width-8))+'px';popup.style.top=down?r.bottom+4+'px':'auto';popup.style.bottom=down?'auto':win.innerHeight-r.top+4+'px';};
 const changed=()=>{trigger.querySelector('span').textContent=summary(state);draw();onChange(state);if(!trigger.isConnected)close(true);};
 const draw=()=>{
  if(!popup)return;tree=curriculumTree(questions,state.curriculum);const needle=query.trim().toLocaleLowerCase();const selected=state.selectedPaths||[];
  const matches=node=>node.label.toLocaleLowerCase().includes(needle)||node.children.some(matches);
  const rows=(nodes,depth=0)=>nodes.filter(n=>!needle||matches(n)).map(n=>{const checked=leaves(n).every(leaf=>selected.some(p=>contains(p,leaf))),partial=!checked&&selected.some(p=>contains(n.path,p)),open=needle||expanded.has(n.path);return `<div class="curriculum-row" style="--depth:${depth}"><input type="checkbox" aria-label="${esc(n.label)} 선택" data-cp-check="${esc(n.path)}" ${checked?'checked':''} ${partial?'data-partial="true"':''}><button type="button" data-cp-expand="${esc(n.path)}" ${n.children.length?`aria-expanded="${Boolean(open)}"`:''}><span class="curriculum-arrow" aria-hidden="true">${n.children.length?(open?'⌄':'›'):''}</span>${n.code?`<span class="curriculum-code">${esc(n.code)}</span>`:''}<span>${esc(n.label)}</span></button></div>${n.children.length&&open?rows(n.children,depth+1):''}`;}).join('');
  const scroll=popup.querySelector('.curriculum-scroll')?.scrollTop||0;
  popup.innerHTML=`<button type="button" class="curriculum-header" data-cp-close><span>단원 및 유형 선택</span><span aria-hidden="true">⌃</span></button><div class="curriculum-search"><input type="search" aria-label="유형 검색" placeholder="유형 검색" value="${esc(query)}"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/></svg></div><div class="curriculum-scroll"><div class="curriculum-tabs">${[['old','구 교육과정'],['new','신 교육과정'],['contest','경시']].map(([value,label])=>`<button type="button" data-cp-tab="${value}" aria-pressed="${state.curriculum===value}">${label}</button>`).join('')}</div><div>${rows(tree)||'<p class="curriculum-note">확인된 유형이 없습니다.</p>'}</div><p class="curriculum-note">확인된 교육과정과 표본 문항의 단원만 펼쳐 볼 수 있습니다.</p></div>`;
  popup.querySelector('.curriculum-scroll').scrollTop=scroll;
  popup.querySelectorAll('[data-partial]').forEach(el=>el.indeterminate=true);
  popup.querySelector('[data-cp-close]').onclick=()=>{close();trigger.focus();};
  popup.querySelector('input[type=search]').oninput=e=>{const cursor=e.target.selectionStart;query=e.target.value;saved.query=query;draw();const input=popup.querySelector('input[type=search]');input.focus();try{input.setSelectionRange(cursor,cursor);}catch{}};
  popup.querySelectorAll('[data-cp-tab]').forEach(el=>el.onclick=()=>{state.curriculum=el.dataset.cpTab;resetCurriculumSelection(state);expanded.clear();query='';saved.query='';changed();});
  popup.querySelectorAll('[data-cp-check]').forEach(el=>el.onchange=()=>{toggleCurriculumPath(state,el.dataset.cpCheck,el.checked,tree);changed();});
  popup.querySelectorAll('[data-cp-expand]').forEach(el=>el.onclick=()=>{const path=el.dataset.cpExpand;expanded.has(path)?expanded.delete(path):expanded.add(path);draw();});position();
 };
 const open=()=>{popup=doc.createElement('div');popup.className='curriculum-popup';popup.setAttribute('role','dialog');popup.setAttribute('aria-label','단원 및 유형 선택');(trigger.closest('dialog[open]')||doc.body).append(popup);saved.open=true;trigger.setAttribute('aria-expanded','true');draw();popup.querySelector('input').focus();};
 trigger.addEventListener('click',()=>popup?close():open(),opts);
 doc.addEventListener('pointerdown',e=>{if(popup&&!popup.contains(e.target)&&!trigger.contains(e.target))close();},opts);
 doc.addEventListener('keydown',e=>{if(popup&&e.key==='Escape'){e.preventDefault();close();trigger.focus();}},opts);
 win.addEventListener('resize',position,opts);win.addEventListener('scroll',position,{...opts,capture:true});
 const observer=new win.MutationObserver(()=>{if(!trigger.isConnected){const replacement=[...doc.querySelectorAll('[data-curriculum-picker]')].some(el=>el.dataset.curriculumPicker===id);close(replacement);controller.abort();observer.disconnect();}});observer.observe(doc.body,{childList:true,subtree:true});
 const cleanup=()=>{close(true);controller.abort();observer.disconnect();};saved.cleanup=cleanup;if(saved.open)open();return cleanup;
}
