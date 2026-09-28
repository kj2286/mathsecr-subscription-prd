// Selection is independent of access. Only a successful purchase or subscription
// can release the entire saved selection to its original destination.
export function openQuestionSelectionAccess(ctx, selection, {source='bank',onComplete}={}) {
  const {esc,openModal,closeModal,toast}=ctx.ui;
  const catalog=new Map((ctx.questions||[]).map(q=>[q.id,q]));
  const selected=new Map();
  for(const item of selection||[]) {
    const id=typeof item==='string'?item:item?.id;
    const q=catalog.get(id)||(typeof item==='object'?item:null);
    if(!q?.id){toast('선택한 문항 정보를 확인할 수 없습니다. 다시 선택해 주세요.');return;}
    if(!selected.has(q.id))selected.set(q.id,q);
  }
  const items=[...selected.values()],ids=items.map(q=>q.id);
  if(!ids.length)return;
  if(source!=='bank'&&source!=='db'){toast('문항 출처를 확인해 주세요.');return;}
  const missing=()=>items.filter(q=>!ctx.store.canUseQuestion(q.id,source));
  const isBank=source==='bank';
  let completed=false,busy=false;
  const finish=()=>{
    if(completed||missing().length)return false;
    completed=true;closeModal();onComplete?.([...ids]);return true;
  };
  const show=()=>{
    const locked=missing();
    if(!locked.length){finish();return;}
    const dbs=new Map((ctx.dbs||[]).map(d=>[d.id,d]));
    const canSubscribe=isBank||locked.some(q=>dbs.get(q.dbId)?.rentalEligible!==false);
    const excluded=!isBank&&locked.some(q=>dbs.get(q.dbId)?.rentalEligible===false);
    openModal({
      title:isBank?'문항 구매 또는 문제은행 구독':'문항 구매 또는 DB 구독',
      body:`<p><strong>선택한 ${ids.length}문항</strong> · 이용 가능 ${ids.length-locked.length}문항 · 구매 필요 ${locked.length}문항</p><div class="notice"><span>${isBank?'선택한 문항을 구매하거나, 월 39,000원으로 전체 학년의 문제은행을 구독하세요.':canSubscribe?'선택한 문항을 구매하거나, 월 49,000원으로 전체 학년의 구독 대상 DB를 이용하세요.':'선택한 자료는 DB 구독에 포함되지 않습니다. 필요한 문항을 개별 구매해 이용하세요.'}</span></div><ul class="plan-list">${locked.map(q=>`<li>${esc(q.sourceTitle||q.title||q.grade||'문항')} · ${esc(q.number)}번</li>`).join('')}</ul><p>구매한 문항은 구독 없이 계속 사용할 수 있습니다. 원출처 DB에는 구매한 문항을 보관합니다.${onComplete?' 선택한 전체 문항을 유지한 채 문제지 만들기로 이어집니다.':''}</p>${excluded&&canSubscribe?'<p class="small-note">구독 제외 자료의 문항은 따로 구매해야 합니다.</p>':''}<p class="small-note">이미 이용할 수 있는 문항은 구매 대상에서 제외합니다. 문항 가격은 연동 전입니다. 실제 결제는 진행되지 않습니다.</p>`,
      footer:`<button class="btn" data-bank-purchase>문항 구매하기</button>${canSubscribe?`<button class="btn primary" data-bank-subscribe>월 ${isBank?'39,000':'49,000'}원 ${isBank?'구독하기':'DB 구독'}</button>`:''}`,
      onMount(dialog) {
        dialog.querySelector('[data-bank-purchase]').onclick=()=>{
          if(busy||completed)return;
          busy=true;
          let purchased=0;
          for(const q of missing()) {
            // A prior attempt or another view may already have acquired access.
            if(ctx.store.canUseQuestion(q.id,source))continue;
            const result=isBank?ctx.store.acquireBankQuestion(q.id):ctx.store.acquireQuestion(q.id,'permanent');
            if(!result.ok){busy=false;toast(result.error||'문항을 구매하지 못했습니다. 선택한 문항은 유지됩니다.');show();return;}
            purchased++;
          }
          busy=false;
          if(finish()&&purchased)toast(`문항 ${purchased}개를 구매했습니다.`);
        };
        dialog.querySelector('[data-bank-subscribe]')?.addEventListener('click',()=>{
          if(busy||completed)return;
          ctx.subscribe(source,()=>{if(!finish())show();});
        });
      }
    });
  };
  show();
}

export function openBankQuestionAccess(ctx,question,options={}) {
  if(question)return openQuestionSelectionAccess(ctx,[question],{...options,source:'bank'});
}
