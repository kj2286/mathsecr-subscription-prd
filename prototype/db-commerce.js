import {librarySidebar,subscriptionBanner,bindLibraryBanners} from './library-hub.js';

export function dbCartShortcut(ctx) {
  const count=ctx.commerce?.ids().length??0;
  return `<a class="db-cart-shortcut" href="#library/cart" aria-label="자료 DB 장바구니, ${count}개 상품"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 3h2l3 12h10l3-9H6M9 20h.01M18 20h.01" stroke-linecap="round" stroke-linejoin="round"/></svg><span>장바구니</span><strong>${count}</strong></a>`;
}

export function dbPurchaseSummary(dbs,ids) {
  const selected=new Set(ids);
  const items=dbs.filter(db=>selected.has(db.id));
  const known=items.every(db=>db.price!=null&&Number.isFinite(Number(db.price)));
  const total=known?items.reduce((sum,db)=>sum+Number(db.price),0):null;
  const original=known&&items.every(db=>db.originalPrice!=null&&Number.isFinite(Number(db.originalPrice)))?items.reduce((sum,db)=>sum+Number(db.originalPrice),0):null;
  return {items,total,original,discount:original!=null?original-total:null};
}

export function createDBCommerce(ctx,{storage=globalThis.localStorage,onChange=()=>{}}={}) {
  const key='mathsecr-prototype:db-cart-v1';
  let ids=[];
  try { const saved=JSON.parse(storage?.getItem(key)||'[]'); if(Array.isArray(saved))ids=[...new Set(saved)].filter(id=>ctx.dbs.some(db=>db.id===id)); } catch {}
  const owned=id=>ctx.store.ownedDBs().find(db=>db.id===id)?.remainingPurchaseCount===0;
  const persist=()=>{try{storage?.setItem(key,JSON.stringify(ids));}catch{}onChange();};
  const api={
    ids:()=>ids.filter(id=>!owned(id)),
    has:id=>api.ids().includes(id),
    add(id){if(!ctx.dbs.some(db=>db.id===id))return false;if(owned(id)){ctx.ui.toast('이미 구매한 DB입니다.');return false;}if(!ids.includes(id)){ids.push(id);persist();}return true;},
    remove(id){ids=ids.filter(value=>value!==id);persist();},
    purchase(id,action='buy'){
      if(action==='cart'){if(api.add(id))ctx.ui.toast('장바구니에 담았습니다.');return;}
      api.checkout([id]);
    },
    checkout(selected=api.ids()){
      const {esc,money,openModal,closeModal,toast}=ctx.ui;
      const summary=dbPurchaseSummary(ctx.dbs,selected.filter(id=>!owned(id)));
      if(!summary.items.length)return toast('구매할 DB를 선택해 주세요.');
      openModal({title:'DB 구매',wide:true,body:`<div class="db-checkout-list">${summary.items.map(db=>`<div><span>${esc(db.title)}</span><strong>${db.price==null?'가격 확인 전':money(db.price)}</strong></div>`).join('')}</div><div class="db-checkout-total"><span>총 결제 금액</span><strong>${summary.total==null?'가격 확인 전':money(summary.total)}</strong></div><p>구매한 DB는 구독이 끝나도 계속 이용할 수 있습니다.</p><p class="sample-note">구매 흐름을 확인하는 프로토타입입니다. 실제 결제는 발생하지 않습니다.${summary.total==null?' 가격을 수집하지 않은 자료는 금액 없이 구매 권한만 체험합니다.':''}</p>`,footer:'<button class="btn" data-purchase-cancel>취소</button><button class="btn primary" data-purchase-confirm>DB 구매하기</button>',onMount:modal=>{
        modal.querySelector('[data-purchase-cancel]').onclick=closeModal;
        modal.querySelector('[data-purchase-confirm]').onclick=()=>{
          for(const db of summary.items){const result=ctx.store.acquireRemaining(db.id,'permanent');if(!result.ok)return toast(result.error);ids=ids.filter(id=>id!==db.id);}
          persist();closeModal();toast('구매한 DB를 나만의 DB에 추가했습니다.');
        };
      }});
    },
    render(container){
      const {esc,icon,money}=ctx.ui,summary=dbPurchaseSummary(ctx.dbs,api.ids());
      container.innerHTML=`<div class="split-view">${librarySidebar(ctx,{section:'materials'})}<section class="workspace db-cart-workspace"><div class="breadcrumb"><a href="#library">수학비서 DB</a> ${icon('chevron')} 장바구니</div><div class="heading-row"><h1>장바구니</h1><a class="btn" href="#library/school">자료 더 보기</a></div>${subscriptionBanner(ctx,{focus:'db'})}${summary.items.length?['school','book'].map(kind=>{const rows=summary.items.filter(db=>db.kind===kind);return rows.length?`<section class="db-cart-group"><h2>${kind==='school'?'내신시험지 DB':'교재 DB'}</h2><p class="db-cart-count">${rows.length}개 선택</p><div class="db-checkout-list">${rows.map(db=>`<div>${db.preview?`<img src="${esc(db.preview)}" alt="">`:''}<span><strong>${esc(db.title)}</strong><small>문제 ${db.count} · 평균 ${db.avg??'미확인'}</small></span><span class="db-cart-price">${db.originalPrice?`<del>${money(db.originalPrice)}</del>`:''}<strong>${db.price==null?'가격 확인 전':money(db.price)}</strong></span><button type="button" class="icon-btn" data-remove-cart="${esc(db.id)}" aria-label="${esc(db.title)} 장바구니에서 삭제">${icon('trash')}</button></div>`).join('')}</div></section>`:'';}).join(''):'<div class="empty"><h3>장바구니가 비어 있습니다.</h3></div>'}${summary.items.length?`<div class="db-cart-total"><div><strong>총 결제 금액</strong><span>${summary.total==null?'가격 확인 전':`${summary.original!=null?`총 상품 가격 ${money(summary.original)} − 할인 금액 ${money(summary.discount)} = `:''}<b>${money(summary.total)}</b>`}</span></div><button class="btn primary" data-checkout-cart>DB ${summary.items.length}개 구매하기</button></div>`:''}</section></div>`;
      bindLibraryBanners(container,ctx);
      container.querySelectorAll('[data-remove-cart]').forEach(button=>button.onclick=()=>ctx.ui.confirm({title:'장바구니에서 삭제할까요?',body:'이 상품을 장바구니에서 뺍니다.',button:'삭제',onConfirm:()=>api.remove(button.dataset.removeCart)}));
      container.querySelector('[data-checkout-cart]')?.addEventListener('click',()=>api.checkout());
    }
  };
  return api;
}
