const home = {query:'', folderId:null, type:'all', status:'all', view:'grid', sort:'recent', folderSort:'manual', selected:new Set(), collapsed:false, treeOpen:true};
const typeName = paper => paper.type === '내문제지' ? '문제지' : paper.type || '문제지';
const normalize = value => String(value || '').replace(/\s/g,'').toLowerCase();
const dateText = value => new Date(Number(value) || Date.now()).toLocaleDateString('sv-SE').replaceAll('-','.');
const iconPaths = {
  folder:'<path d="M2 6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" fill="currentColor" stroke="none"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor"/>',
  list:'<path d="M5 6h14M5 12h14M5 18h14" stroke-width="3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  edit:'<path d="m15 3 6 6-12 12H3v-6zM12 6l6 6"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  report:'<rect x="3" y="3" width="18" height="15" rx="2"/><path d="M8 21h8m-4-3v3M7 13v-3m5 3V7m5 6V9"/>',
  more:'<circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/>',
};
const smallIcon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;

export function paperStatus(paper, store, state=store.getState()) {
  const expired = paper.questionIds.some(id => {
    const source = paper.questionSources?.[id] || 'db';
    return state.subscriptions[source]?.status === 'expired' && !store.canUseQuestion(id, source);
  });
  return expired || paper.reviewRequired ? 'review' : paper.issued ? 'issued' : 'editing';
}

export function filterWorkspacePapers(papers, state, statusOf) {
  const query = normalize(state.query);
  return papers.filter(p => (!state.folderId || p.folderId === state.folderId)
    && (state.type === 'all' || typeName(p) === state.type)
    && (state.status === 'all' || statusOf(p) === state.status)
    && (!query || normalize(`${p.title} ${p.memo || ''}`).includes(query)))
    .sort((a,b) => state.sort === 'name' ? a.title.localeCompare(b.title,'ko')
      : state.sort === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);
}

function folderDialog(ctx, current) {
  const {esc,openModal,closeModal,toast} = ctx.ui;
  openModal({title:current ? '폴더 이름 변경' : '폴더추가', body:`<form id="ph-folder-form"><label class="ph-dialog-label" for="ph-folder-name">폴더 이름</label><input id="ph-folder-name" name="name" value="${esc(current?.name || '')}" placeholder="폴더 이름을 입력하세요" maxlength="60" required autocomplete="off"><p class="ph-error" role="alert"></p></form>`, footer:`<button class="btn" data-ph-cancel>취소</button><button class="btn primary" type="submit" form="ph-folder-form">${current ? '저장' : '추가'}</button>`, onMount:dialog=>{
    const form = dialog.querySelector('form');
    form.elements.name.focus();
    dialog.querySelector('[data-ph-cancel]').onclick = closeModal;
    form.onsubmit = event => {
      event.preventDefault();
      const name = form.elements.name.value.trim();
      const result = current ? ctx.store.renameFolder(current.id,name) : ctx.store.createFolder(name);
      if (!result.ok) {dialog.querySelector('.ph-error').textContent=result.error; return;}
      closeModal(); toast(current ? '폴더 이름을 변경했습니다.' : '폴더를 추가했습니다.');
    };
  }});
}

function paperInfoDialog(ctx,paper) {
  const {esc,openModal,closeModal,toast} = ctx.ui;
  openModal({title:'문제지 정보 수정',body:`<form id="ph-info-form"><label class="ph-dialog-label" for="ph-info-title">문제지 제목</label><input id="ph-info-title" name="title" value="${esc(paper.title)}" maxlength="80" required><label class="ph-dialog-label" for="ph-info-memo">메모</label><textarea id="ph-info-memo" name="memo" rows="4" placeholder="수업이나 문항에 관한 메모를 남겨 보세요." maxlength="1000">${esc(paper.memo || '')}</textarea><p class="ph-error" role="alert"></p></form>`,footer:'<button class="btn" data-ph-cancel>취소</button><button class="btn primary" form="ph-info-form">저장</button>',onMount:dialog=>{
    const form=dialog.querySelector('form'); form.elements.title.focus();
    dialog.querySelector('[data-ph-cancel]').onclick=closeModal;
    form.onsubmit=event=>{event.preventDefault();const result=ctx.store.updatePaper(paper.id,{title:form.elements.title.value.trim(),memo:form.elements.memo.value.trim()});if(!result.ok){dialog.querySelector('.ph-error').textContent=result.error;return;}closeModal();toast('문제지 정보를 저장했습니다.');};
  }});
}

function moveDialog(ctx,ids) {
  const {esc,openModal,closeModal,toast}=ctx.ui;
  const folders=ctx.store.getState().paperFolders || [];
  openModal({title:'폴더로 이동',body:`<p class="ph-dialog-copy">선택한 문제지 ${ids.length}개를 이동할 폴더를 선택하세요.</p><form id="ph-move-form"><label class="ph-folder-choice"><input type="radio" name="folder" value="" checked>${smallIcon('folder')}작업공간</label>${folders.map(f=>`<label class="ph-folder-choice"><input type="radio" name="folder" value="${esc(f.id)}">${smallIcon('folder')}${esc(f.name)}</label>`).join('')}<p class="ph-error" role="alert"></p></form>`,footer:'<button class="btn" data-ph-cancel>취소</button><button class="btn primary" form="ph-move-form">이동</button>',onMount:dialog=>{
    dialog.querySelector('[data-ph-cancel]').onclick=closeModal;
    dialog.querySelector('form').onsubmit=event=>{event.preventDefault();const folder=dialog.querySelector('[name=folder]:checked').value;home.selected.clear();const result=ctx.store.movePapers(ids,folder || null);if(!result.ok){dialog.querySelector('.ph-error').textContent=result.error;return;}closeModal();toast('문제지를 이동했습니다.');};
  }});
}

export function renderPaperHome(container,ctx,{createDialog,confirmDelete}) {
  const {esc,icon,toast,openModal,closeModal}=ctx.ui;
  const state=ctx.store.getState();
  const papers=state.papers;
  const folders=[...(state.paperFolders || [])];
  if(home.folderId && !folders.some(f=>f.id===home.folderId)) home.folderId=null;
  const folder=folders.find(f=>f.id===home.folderId);
  if(home.folderSort==='name') folders.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  if(home.folderSort==='recent') folders.sort((a,b)=>b.createdAt-a.createdAt);
  const statuses=new Map(papers.map(p=>[p.id,paperStatus(p,ctx.store,state)]));
  const statusOf=paper=>statuses.get(paper.id);
  const visible=filterWorkspacePapers(papers,home,statusOf);
  const visibleIds=new Set(visible.map(p=>p.id));
  home.selected=new Set([...home.selected].filter(id=>visibleIds.has(id)));
  const labels={issued:'출제 완료',editing:'편집 중',review:'확인 필요'};
  const count=id=>papers.filter(p=>statusOf(p)===id).length;
  const folderPapers=id=>papers.filter(p=>p.folderId===id);
  const currentFolderIds=home.folderId ? new Set([home.folderId]) : new Set(folders.map(f=>f.id));
  const folderCards=folders.filter(f=>currentFolderIds.has(f.id));
  const menuMarkup=(id,kind)=>`<div class="ph-menu-wrap"><button class="ph-icon-button" data-ph-menu aria-haspopup="true" aria-expanded="false" aria-label="${kind==='folder'?'폴더':'문제지'} 메뉴">${smallIcon('more')}</button><div class="ph-context-menu" hidden>${kind==='folder'?`<button data-rename-folder="${esc(id)}">이름 변경</button><button data-delete-folder="${esc(id)}">${icon('trash')}폴더 삭제</button>`:`<button data-edit-paper="${esc(id)}">제목·메모 수정</button><button data-copy-paper="${esc(id)}">복사본 만들기</button><button data-move-paper="${esc(id)}">폴더로 이동</button>`}</div></div>`;
  const card=paper=>{
    const qs=paper.questionIds.map(id=>ctx.questions.find(q=>q.id===id)).filter(Boolean);
    const avg=qs.length?(qs.reduce((sum,q)=>sum+Number(q.difficulty),0)/qs.length).toFixed(1):null;
    const type=typeName(paper), status=statusOf(paper), selected=home.selected.has(paper.id);
    const bins=[qs.filter(q=>q.difficulty<=2).length,qs.filter(q=>q.difficulty>=3&&q.difficulty<=4).length,qs.filter(q=>q.difficulty>=5&&q.difficulty<=6).length,qs.filter(q=>q.difficulty>=7).length];
    return `<article class="ph-paper-card ${selected?'is-selected':''}" data-paper-id="${esc(paper.id)}" draggable="true"><label class="ph-card-check"><input type="checkbox" data-ph-select="${esc(paper.id)}" ${selected?'checked':''} aria-label="${esc(paper.title)} 선택"></label><button class="ph-paper-open" data-open-paper="${esc(paper.id)}"><span class="ph-cover ${type==='학습지'?'is-worksheet':type==='시험지'?'is-test':'is-paper'} ${paper.issued?'is-issued':''}" aria-hidden="true"><i></i></span><span class="ph-paper-copy"><span class="ph-paper-type">${esc(type)}${paper.example?'<small>예시</small>':''}</span><strong>${esc(paper.title)} ${icon('chevron')}</strong>${avg?`<span class="ph-difficulty">평균 ${avg}<span>난이도</span>${bins.map((n,i)=>`<span class="ph-level level-${i}">${n}</span>`).join('')}</span>`:''}${paper.memo?`<span class="ph-memo">${esc(paper.memo)}</span>`:''}</span></button>${menuMarkup(paper.id,'paper')}<button class="ph-icon-button ph-delete" data-delete-paper="${esc(paper.id)}" aria-label="${esc(paper.title)} 삭제" title="문제지 삭제">${icon('trash')}</button><div class="ph-card-footer"><span class="ph-status ${status}">${labels[status]}${status==='editing'?` (${dateText(paper.updatedAt||paper.createdAt)})`:''}</span><small>문제${qs.length}/해설${qs.filter(q=>q.hasSolution===true||q.solution).length}</small></div></article>`;
  };
  container.innerHTML=`<section class="ph-layout ${home.collapsed?'is-collapsed':''}"><aside class="ph-sidebar"><header><h1>내 문제지</h1><button class="ph-icon-button" data-ph-collapse aria-label="문제지 사이드바 접기">${icon('chevron-left')}</button></header><label class="ph-search"><input id="ph-query" value="${esc(home.query)}" placeholder="문제지 및 메모 검색" aria-label="문제지 및 메모 검색" autocomplete="off">${icon('search')}</label><button class="ph-create" data-new-paper>문제지 만들기</button><div class="ph-stats">${[['issued','clock'],['editing','edit'],['review','check']].map(([id,symbol])=>`<button data-home-status="${id}" class="${home.status===id?'is-active':''}">${smallIcon(symbol)}<span>${labels[id]}</span><small>${count(id)}</small></button>`).join('')}<button class="ph-unavailable" disabled title="강사용 분석리포트는 아직 제공하지 않습니다.">${smallIcon('report')}<span>강사용 분석리포트</span><small>0</small></button></div><button class="ph-workspace-root ${!home.folderId?'is-active':''}" data-home-root data-folder-target="">${icon(home.treeOpen?'chevron-down':'chevron')}${smallIcon('folder')}작업공간</button>${home.treeOpen?`<div class="ph-folder-tree">${folders.map(f=>`<button class="ph-tree-row ${f.id===home.folderId?'is-active':''}" data-home-folder="${esc(f.id)}" data-folder-target="${esc(f.id)}">${icon(f.id===home.folderId?'chevron-down':'chevron')}${smallIcon('folder')}<span>${esc(f.name)}</span></button>${f.id===home.folderId?folderPapers(f.id).map(p=>`<button class="ph-tree-paper" data-open-paper="${esc(p.id)}">${icon('file')}<span>${esc(p.title)}</span></button>`).join(''):''}`).join('')}</div>`:''}</aside><div class="ph-main"><button class="ph-reopen" data-ph-collapse aria-label="문제지 사이드바 펼치기">${icon('chevron')}<span>내 문제지</span></button><section class="ph-banners" aria-label="수학비서 소식"><img src="assets/papers/banner-sync.png" alt="스터디 안내 · SYNC X 봉쌤스쿨 X 김나영T"><img src="assets/papers/banner-basic.png" alt="수비프레스 · 교과서 대비 B2베이직 미적분2 신규 DB 출시"><img src="assets/papers/banner-calculus.png" alt="교과서 DB 오픈 · 2025년 교과서 미적분2 DB OPEN"></section><div class="ph-banner-dots" aria-hidden="true">${Array.from({length:11},(_,i)=>`<i${i===5?' class="active"':''}></i>`).join('')}</div><section class="ph-folders"><header class="ph-section-heading"><h2>${folder?`<button data-home-root>작업공간</button>${icon('chevron')}${esc(folder.name)}`:'작업공간'}</h2><div><select id="ph-folder-sort" aria-label="폴더 정렬"><option value="manual" ${home.folderSort==='manual'?'selected':''}>사용자 지정</option><option value="name" ${home.folderSort==='name'?'selected':''}>이름순</option><option value="recent" ${home.folderSort==='recent'?'selected':''}>최근 생성순</option></select><button class="ph-soft-button" id="ph-add-folder">폴더추가</button></div></header><div class="ph-folder-grid">${folderCards.map(f=>{const items=folderPapers(f.id);return `<article class="ph-folder-card" data-folder-target="${esc(f.id)}"><button data-home-folder="${esc(f.id)}">${smallIcon('folder')}<span><strong>${esc(f.name)} ${icon('chevron')}</strong><small>파일수 ${items.filter(p=>p.issued).length}/${items.length}</small></span></button>${menuMarkup(f.id,'folder')}<time>${dateText(f.createdAt).slice(2)}</time></article>`;}).join('')||'<button class="ph-empty-folder" id="ph-first-folder">폴더를 추가해 문제지를 정리해 보세요.</button>'}</div></section><section class="ph-papers-section"><div class="ph-type-row"><div class="ph-type-tabs" role="tablist" aria-label="문제지 종류">${[['all','전체'],['문제지','문제지'],['학습지','학습지'],['시험지','시험지']].map(([value,label])=>`<button role="tab" aria-selected="${home.type===value}" data-home-type="${value}">${label}</button>`).join('')}</div><div class="ph-type-actions"><div class="ph-view-switch"><button class="${home.view==='grid'?'is-active':''}" data-home-view="grid" aria-label="격자 보기" aria-pressed="${home.view==='grid'}">${smallIcon('grid')}</button><button class="${home.view==='list'?'is-active':''}" data-home-view="list" aria-label="목록 보기" aria-pressed="${home.view==='list'}">${smallIcon('list')}</button></div><button class="ph-dark-button" data-new-paper>문제지 만들기</button></div></div><div class="ph-status-tabs" role="group" aria-label="문제지 상태">${[['all','전체'],...Object.entries(labels)].map(([id,label])=>`<button data-home-status="${id}" aria-pressed="${home.status===id}">${label}</button>`).join('')}</div><div class="ph-list-toolbar"><label class="ph-select-all"><input id="ph-select-all" type="checkbox" ${visible.length&&home.selected.size===visible.length?'checked':''} ${!visible.length?'disabled':''}><span>${home.selected.size?`${home.selected.size}개 선택`:`전체 선택 (${visible.length})`}</span></label><div class="ph-bulk-actions">${home.selected.size?`<button class="ph-soft-button" id="ph-move-selected">폴더로 이동</button><button class="ph-soft-button ph-danger" id="ph-delete-selected">${icon('trash')}선택 삭제</button>`:'<button class="ph-soft-button" disabled title="강사용 분석리포트는 아직 제공하지 않습니다.">강사용 분석리포트 만들기</button>'}<select id="ph-sort" aria-label="문제지 정렬"><option value="recent" ${home.sort==='recent'?'selected':''}>최근 생성순</option><option value="oldest" ${home.sort==='oldest'?'selected':''}>오래된 순</option><option value="name" ${home.sort==='name'?'selected':''}>이름순</option></select></div></div><div class="ph-paper-grid ${home.view==='list'?'is-list':''}">${visible.map(card).join('')}</div>${!visible.length?`<div class="ph-empty"><div class="ph-cover is-paper" aria-hidden="true"><i></i></div><h3>${papers.length?'조건에 맞는 문제지가 없습니다.':'아직 만든 문제지가 없습니다.'}</h3><p>${papers.length?'다른 폴더나 검색 조건을 선택해 보세요.':'문제지를 만들고 필요한 문항을 담아 보세요.'}</p><button class="ph-create" ${papers.length?'id="ph-clear-filters"':'data-new-paper'}>${papers.length?'전체 문제지 보기':'문제지 만들기'}</button></div>`:''}</section></div></section>`;
  const redraw=()=>renderPaperHome(container,ctx,{createDialog,confirmDelete});
  const perform=result=>{if(!result.ok)toast(result.error || '다시 확인해 주세요.');return result.ok;};
  const removePapers=ids=>confirmDelete(ctx,{title:ids.length===1?'문제지를 삭제할까요?':'선택한 문제지를 삭제할까요?',description:`문제지 ${ids.length}개와 담은 문항 목록을 삭제합니다. 원본 DB의 문항은 유지됩니다.`,confirm:()=>{home.selected.clear();ids.forEach(id=>ctx.store.deletePaper(id));redraw();toast('문제지를 삭제했습니다.');}});
  container.querySelectorAll('[data-new-paper]').forEach(b=>b.onclick=()=>createDialog(ctx,undefined,{folderId:home.folderId}));
  container.querySelectorAll('[data-open-paper]').forEach(b=>b.onclick=()=>ctx.go(`#papers/${b.dataset.openPaper}`));
  container.querySelectorAll('[data-home-folder]').forEach(b=>b.onclick=()=>{home.folderId=b.dataset.homeFolder;home.selected.clear();redraw();});
  container.querySelectorAll('[data-home-root]').forEach(b=>b.onclick=()=>{if(b.classList.contains('ph-workspace-root')&&!home.folderId)home.treeOpen=!home.treeOpen;home.folderId=null;home.selected.clear();redraw();});
  container.querySelectorAll('[data-ph-collapse]').forEach(b=>b.onclick=()=>{home.collapsed=!home.collapsed;redraw();});
  container.querySelectorAll('[data-home-type]').forEach(b=>b.onclick=()=>{home.type=b.dataset.homeType;home.selected.clear();redraw();});
  container.querySelectorAll('[data-home-status]').forEach(b=>b.onclick=()=>{home.status=b.dataset.homeStatus;home.selected.clear();redraw();});
  container.querySelectorAll('[data-home-view]').forEach(b=>b.onclick=()=>{home.view=b.dataset.homeView;redraw();});
  container.querySelector('#ph-folder-sort').onchange=e=>{home.folderSort=e.target.value;redraw();};
  container.querySelector('#ph-sort').onchange=e=>{home.sort=e.target.value;redraw();};
  const applyQuery=e=>{if(e.isComposing)return;home.query=e.target.value;const start=e.target.selectionStart;redraw();const input=container.querySelector('#ph-query');input.focus();input.setSelectionRange(start,start);};
  container.querySelector('#ph-query').oninput=applyQuery;
  container.querySelector('#ph-query').oncompositionend=applyQuery;
  container.querySelector('#ph-add-folder').onclick=()=>folderDialog(ctx);
  container.querySelector('#ph-first-folder')?.addEventListener('click',()=>folderDialog(ctx));
  container.querySelector('#ph-clear-filters')?.addEventListener('click',()=>{home.query='';home.type='all';home.status='all';home.folderId=null;redraw();});
  container.querySelector('#ph-select-all').onchange=e=>{home.selected=e.target.checked?new Set(visible.map(p=>p.id)):new Set();redraw();};
  container.querySelector('#ph-select-all').indeterminate=home.selected.size>0&&home.selected.size<visible.length;
  container.querySelectorAll('[data-ph-select]').forEach(input=>input.onchange=()=>{input.checked?home.selected.add(input.dataset.phSelect):home.selected.delete(input.dataset.phSelect);redraw();});
  container.querySelectorAll('[data-delete-paper]').forEach(b=>b.onclick=()=>removePapers([b.dataset.deletePaper]));
  container.querySelector('#ph-delete-selected')?.addEventListener('click',()=>removePapers([...home.selected]));
  container.querySelector('#ph-move-selected')?.addEventListener('click',()=>moveDialog(ctx,[...home.selected]));
  container.querySelectorAll('[data-ph-menu]').forEach(b=>b.onclick=()=>{
    const menu=b.nextElementSibling, opening=menu.hidden;
    container.querySelectorAll('.ph-context-menu').forEach(m=>m.hidden=true);
    container.querySelectorAll('[data-ph-menu]').forEach(el=>el.setAttribute('aria-expanded','false'));
    menu.hidden=!opening;b.setAttribute('aria-expanded',String(opening));
  });
  container.querySelectorAll('[data-rename-folder]').forEach(b=>b.onclick=()=>folderDialog(ctx,folders.find(f=>f.id===b.dataset.renameFolder)));
  container.querySelectorAll('[data-delete-folder]').forEach(b=>b.onclick=()=>{const f=folders.find(f=>f.id===b.dataset.deleteFolder);confirmDelete(ctx,{title:'폴더를 삭제할까요?',description:`‘${f.name}’ 폴더만 삭제합니다. 안에 있는 문제지는 작업공간에 보관합니다.`,confirm:()=>{if(home.folderId===f.id)home.folderId=null;if(perform(ctx.store.deleteFolder(f.id))){redraw();toast('폴더를 삭제했습니다. 문제지는 작업공간에 보관했습니다.');}}});});
  container.querySelectorAll('[data-edit-paper]').forEach(b=>b.onclick=()=>paperInfoDialog(ctx,papers.find(p=>p.id===b.dataset.editPaper)));
  container.querySelectorAll('[data-copy-paper]').forEach(b=>b.onclick=()=>{if(perform(ctx.store.duplicatePaper(b.dataset.copyPaper)))toast('복사본을 만들었습니다.');});
  container.querySelectorAll('[data-move-paper]').forEach(b=>b.onclick=()=>moveDialog(ctx,[b.dataset.movePaper]));
  container.onkeydown=event=>{if(event.key==='Escape')container.querySelectorAll('.ph-context-menu').forEach(menu=>{menu.hidden=true;menu.previousElementSibling.setAttribute('aria-expanded','false');});};
  container.onclick=event=>{if(!event.target.closest('.ph-menu-wrap'))container.querySelectorAll('.ph-context-menu').forEach(menu=>{menu.hidden=true;menu.previousElementSibling.setAttribute('aria-expanded','false');});};
  container.ondragstart=event=>{const card=event.target.closest('[data-paper-id]');if(!card)return;const ids=home.selected.has(card.dataset.paperId)?[...home.selected]:[card.dataset.paperId];event.dataTransfer.setData('application/x-mathsecr-papers',JSON.stringify(ids));event.dataTransfer.effectAllowed='move';};
  container.ondragover=event=>{const target=event.target.closest('[data-folder-target]');if(target&&event.dataTransfer.types.includes('application/x-mathsecr-papers')){event.preventDefault();event.dataTransfer.dropEffect='move';target.classList.add('is-drop-target');}};
  container.ondragleave=event=>event.target.closest('[data-folder-target]')?.classList.remove('is-drop-target');
  container.ondrop=event=>{const target=event.target.closest('[data-folder-target]');if(!target)return;event.preventDefault();target.classList.remove('is-drop-target');try{const ids=JSON.parse(event.dataTransfer.getData('application/x-mathsecr-papers'));home.selected.clear();if(perform(ctx.store.movePapers(ids,target.dataset.folderTarget||null)))toast('문제지를 폴더로 이동했습니다.');}catch{toast('이동할 문제지를 다시 선택해 주세요.');}};
}
