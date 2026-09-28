// Only adapts the rendered original. original.html remains byte-for-byte immutable.
let frame=null,host=null,context=null,requested='library',ready=false,observer=null,unsubscribeBank=null;
const normalizeTitle=value=>String(value||'').normalize('NFKC').replace(/\s+/g,'').toLocaleLowerCase();
export function useOriginalLibrary(variant,parts,search='') {return variant==='a'&&!search&&!['book','books'].includes(parts[1]);}
export function originalBookDestination(hash) {return /^#library\/books?(?:\/|$)/.test(hash)?'library/book':null;}
const navigation={'수학비서 DB':'library','나만의 DB':'mydb','내 문제지':'papers','상점':'shop','수학B서점':'shop','검색':'search','출처찾기':'source','출처찾기&DB화':'source','마이페이지':'account','홈':'home','알림':'notifications'};
const styles=`
body.grouped-navigation{--group-nav-width:0px!important}
body.a-library-only #database-main,body.a-library-only .db-sidebar{display:none!important}
.a-library-return{position:fixed;right:22px;top:14px;z-index:5;background:white;border:1px solid #dedde5;border-radius:8px;padding:8px 14px;font:inherit;cursor:pointer}body.a-library-only .a-library-return{display:none}
.global-nav,.mobile-header,.mobile-nav{display:none!important}
body.grouped-navigation .db-sidebar,body.grouped-navigation .catalog-side{left:0!important}
body.grouped-navigation #database-main,body.grouped-navigation #catalog-main{margin-left:var(--group-db-width,275px)!important}
body.grouped-navigation.catalog-side-hidden #catalog-main{margin-left:0!important}
.catalog-side-reopen{left:0!important}
body.a-bank-only #database-main .workspace>.banners,body.a-bank-only #database-main .banner-dots,body.a-bank-only #folders,body.a-bank-only .standalone-bank,body.a-bank-only #folder-tree,body.a-bank-only .standalone-bank-sidebar,body.a-bank-only .stats,body.a-bank-only #create-db{display:none!important}
body.a-bank-only #documents,body.a-bank-only #database-main .workspace{visibility:visible}
#a-bank-entry{display:none;position:fixed;inset:0;z-index:1;background:white;padding:48px;font-family:inherit}#a-bank-entry button{padding:12px 24px;border:0;border-radius:8px;background:#6655ed;color:white;font:inherit;cursor:pointer}body.a-bank-pending #a-bank-entry{display:block}body.a-bank-pending #database-main,body.a-bank-pending .db-sidebar{visibility:hidden!important}
@media(max-width:690px){body.grouped-navigation #database-main,body.grouped-navigation #catalog-main{margin-left:0!important}}
`;
// The original list keeps its rendering state, but never owns an entitlement.
export function syncOriginalBank(ctx,bridge,{open=false,prompt=false}={}) {
 const active=!!ctx.store.isActive('bank');
 bridge.setSubscribed(active);
 if(open&&active)bridge.open();
 else if(prompt&&!active)ctx.subscribe('bank');
 return active;
}
function bankAccess({prompt=false}={}) {
 if(!ready||!frame?.contentWindow?.__sharedBankBridge)return;
 const doc=frame.contentDocument;
 doc.querySelectorAll('#subscribe-dialog[open],#payment-dialog[open],#success-dialog[open]').forEach(dialog=>dialog.close());
 const active=syncOriginalBank(context,frame.contentWindow.__sharedBankBridge,{open:requested==='bank',prompt});
 doc.body.classList.toggle('a-bank-pending',requested==='bank'&&!active);
}
function routeOriginal(){if(!ready)return;const win=frame.contentWindow,doc=frame.contentDocument;if(requested==='bank'){
 doc.body.classList.remove('a-library-only');doc.body.classList.add('a-bank-only','a-bank-pending');win.location.hash='';
 const targetFrame=frame;const open=()=>{if(requested!=='bank'||frame!==targetFrame)return;bankAccess({prompt:true});};
 setTimeout(open,0);
 }else{doc.body.classList.remove('a-bank-only','a-bank-pending');doc.body.classList.add('a-library-only');win.location.hash='#library';}
}
function install(){const doc=frame.contentDocument,win=frame.contentWindow;if(!doc)return;const style=doc.createElement('style');style.textContent=styles;doc.head.append(style);
 const script=doc.createElement('script');script.textContent=`{
 const originalOpenBank=window.openBank;
 window.__sharedBankBridge={setSubscribed(value){state.subscribed=!!value;if(!value)state.bank=false;},open(){originalOpenBank();}};
 window.openBank=()=>window.parent.postMessage({type:'original-bank-request'},window.location.origin);
}`;doc.head.append(script);script.remove();
 const onBankRequest=event=>{if(event.source===win&&event.origin===win.location.origin&&event.data?.type==='original-bank-request')bankAccess({prompt:true});};
 window.addEventListener('message',onBankRequest);
 unsubscribeBank?.();const stopStore=context.store.subscribe(()=>bankAccess());
 unsubscribeBank=()=>{stopStore?.();window.removeEventListener('message',onBankRequest);};
 const entry=doc.createElement('section');entry.id='a-bank-entry';const title=doc.createElement('h1');title.textContent='문제은행';const button=doc.createElement('button');button.textContent='문제은행 열기';button.onclick=()=>win.openBank?.();entry.append(title,button);doc.body.append(entry);
 const bankLink=doc.createElement('button');bankLink.className='workspace-label';bankLink.textContent='문제은행';bankLink.onclick=()=>context.go('bank');doc.querySelector('#catalog-side .side-heading')?.after(bankLink);
 const back=doc.createElement('button');back.className='a-library-return';back.textContent='자료 DB로 돌아가기';back.onclick=()=>context.go('library');doc.body.append(back);
 // Never show the old personal DB while visiting the shared personal DB route.
 doc.addEventListener('click',event=>{const target=event.target.closest?.('[data-menu],#workspace-home,[data-library-file],[data-doc],#success-open,#start-bank');if(!target)return;
 if(target.matches('[data-menu],#workspace-home')){event.preventDefault();event.stopImmediatePropagation();context.go(target.id==='workspace-home'?'mydb':navigation[target.dataset.menu]||'library');return;}
 if(target.matches('[data-library-file],[data-doc]')){const title=target.querySelector('h3')?.textContent||target.querySelector('strong')?.textContent;const matches=(context.dbs||[]).filter(d=>normalizeTitle(d.title)===normalizeTitle(title));if(title&&matches.length===1&&context.openDB){event.preventDefault();event.stopImmediatePropagation();context.go('mydb/detail/'+matches[0].id);}else if(target.dataset.doc&&context.openOriginalDetail){event.preventDefault();event.stopImmediatePropagation();const card=target.closest('.doc-card');context.openOriginalDetail({id:'original-bank-'+target.dataset.doc,title:title||'문제은행 DB',source:'original',metadata:[{label:'문항 정보',value:card?.querySelector('.doc-footer>span:nth-child(2)')?.textContent.trim()||'원안 표본'},{label:'파일 정보',value:target.querySelector('.badges')?.textContent.trim()||'한글 문제은행'}],notice:'대표님 원안의 목록 정보입니다. 이 DB의 문항 이미지는 포함하지 않았습니다.'});}else if(target.dataset.libraryFile&&context.openOriginalDetail&&win.openLibraryFile){event.preventDefault();event.stopImmediatePropagation();win.openLibraryFile(target.dataset.libraryFile);const detail=doc.querySelector('#basic-body .catalog-file-detail');if(detail){const metadata=[...detail.querySelectorAll('dt')].map(el=>({label:el.textContent.trim(),value:el.nextElementSibling?.textContent.trim()||''}));const record={id:target.dataset.libraryFile,title:detail.querySelector(':scope > strong')?.textContent.trim()||title,source:'original',metadata,notice:detail.querySelector('.test-notice')?.textContent.trim()||'',summary:target.querySelector('.catalog-file-meta')?.textContent.trim()||''};doc.querySelector('#basic-dialog')?.close();context.openOriginalDetail(record);}}return;}
 },true);
 observer?.disconnect();observer=new MutationObserver(()=>{if(requested==='bank'){const active=context?.store.isActive('bank')&&doc.querySelector('#workspace-title')?.textContent==='문제은행';doc.body.classList.toggle('a-bank-pending',!active);}});const heading=doc.querySelector('#workspace-title');if(heading)observer.observe(heading,{childList:true,subtree:true});
 win.addEventListener('hashchange',()=>{const hash=win.location.hash,bookRoute=originalBookDestination(hash);if(bookRoute){context?.go(bookRoute);return;}if(hash.startsWith('#library'))return;if(requested==='bank'&&!hash)return;const route=hash.startsWith('#mypage')?'account':hash.startsWith('#papers')?'papers':hash.startsWith('#shop')?'shop':hash==='#source'?'source':null;if(route)context.go(route);else if(!hash&&requested!=='bank')context.go('mydb');});
 ready=true;routeOriginal();frame.style.visibility='visible';host?.querySelector('.original-variant-loading')?.remove();
}
export function renderOriginal(container,ctx,parts=['library']){context=ctx;const next=parts[0]==='bank'?'bank':'library';const changed=next!==requested;requested=next;
 if(frame&&host===container&&container.contains(frame)){if(changed)routeOriginal();else bankAccess();return;}
 ready=false;host=container;container.replaceChildren();const loading=document.createElement('p');loading.className='original-variant-loading';loading.setAttribute('role','status');loading.textContent='대표님 원안을 불러오는 중입니다.';container.append(loading);frame=document.createElement('iframe');frame.className='original-variant-frame';frame.style.visibility='hidden';frame.title='A 대표님 원안 · 수학비서 DB';frame.src='./original-view.html#library';frame.addEventListener('load',install);container.append(frame);
}
export function disposeOriginal(){unsubscribeBank?.();unsubscribeBank=null;observer?.disconnect();observer=null;frame?.remove();frame=null;host=null;ready=false;context=null;}
