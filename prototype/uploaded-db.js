const DATABASE = 'mathsecr-prototype:uploaded-db:v1';
const MAX_BYTES = 40 * 1024 * 1024;
let connection;

function openStorage() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('이 브라우저에서 업로드 DB를 저장할 수 없습니다.'));
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('metadata', {keyPath:'id'});
      request.result.createObjectStore('contents', {keyPath:'id'});
    };
    request.onsuccess = () => { request.result.onversionchange = () => {request.result.close();connection=null;}; resolve(request.result); };
    request.onerror = () => {connection=null;reject(request.error);};
    request.onblocked = () => {connection=null;reject(new Error('다른 탭을 닫고 저장을 다시 시도해 주세요.'));};
  });
  return connection;
}

async function readStored(store, id) {
  const db=await openStorage();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,'readonly'),request=id?tx.objectStore(store).get(id):tx.objectStore(store).getAll();
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
}

// Uploaded images never enter the paid catalog or its entitlement store.
export async function prepareUploadedDB({title,fileName,items}, {readBlob=async url=>{
  if(typeof url!=='string'||!url.startsWith('blob:'))throw new Error('업로드한 문항 이미지를 다시 확인해 주세요.');
  const response=await fetch(url);if(!response.ok)throw new Error('문항 이미지를 읽지 못했습니다.');return response.blob();
},digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join(''),makeId=()=>crypto.randomUUID(),now=()=>new Date().toISOString()}={}) {
  title=String(title||'').trim();if(!title||title.length>200)throw new Error('DB 이름을 200자 이내로 입력해 주세요.');
  if(!Array.isArray(items)||!items.length||items.length>100)throw new Error('DB로 저장할 문항을 1~100개 선택해 주세요.');
  const unique=[...new Map(items.map(item=>[item.id,item])).values()],saved=[],hashes=[];let bytes=0;
  for(const item of unique){
    if(!item.id||!item.imageUrl)throw new Error('아직 불러오지 못한 문항이 있습니다. 잠시 후 다시 저장해 주세요.');
    const image=await readBlob(item.imageUrl);
    if(!(image instanceof Blob)||!image.size||!/^image\/(png|jpeg|webp)$/.test(image.type))throw new Error('저장할 문항 이미지 형식을 확인해 주세요.');
    bytes+=image.size;if(bytes>MAX_BYTES)throw new Error('선택한 문항이 40MB를 넘었습니다. 나눠서 저장해 주세요.');
    hashes.push(await digest(await image.arrayBuffer()));
    saved.push({id:String(item.id),label:String(item.label||`${saved.length+1}번 문항`),pageNumber:Number(item.pageNumber)||1,text:String(item.text||''),image,width:Number(item.imageWidth)||0,height:Number(item.imageHeight)||0});
  }
  const createdAt=now(),id='upload-db-'+makeId(),signature=await digest(new TextEncoder().encode(hashes.join(':')));
  const metadata={id,title,fileName:String(fileName||'업로드 문항'),count:saved.length,kind:'uploaded',format:'업로드 DB',status:'DB화 완료',range:'업로드 문항',explanation:'',year:new Date(createdAt).getFullYear(),createdAt,signature,bytes};
  return {metadata,contents:{id,items:saved}};
}

export const listUploadedDBs=()=>readStored('metadata');
export async function saveUploadedDB(payload) {
  const prepared=await prepareUploadedDB(payload),db=await openStorage();let result;
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(['metadata','contents'],'readwrite');
    const metadata=tx.objectStore('metadata'),lookup=metadata.getAll();
    lookup.onsuccess=()=>{
      const existing=lookup.result.find(d=>d.signature===prepared.metadata.signature);
      if(existing){result={metadata:existing,duplicate:true};return;}
      metadata.put(prepared.metadata);tx.objectStore('contents').put(prepared.contents);result={metadata:prepared.metadata,duplicate:false};
    };
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('저장을 마치지 못했습니다.'));
  });
  return result;
}

export function openUploadedDBSave(ctx,{fileName,items}) {
  const {esc,openModal,closeModal,toast}=ctx.ui;
  if(!items?.length){toast('DB로 저장할 업로드 문항을 선택해 주세요.');return Promise.resolve({ok:false});}
  return new Promise(resolve=>{
    let settled=false,busy=false;
    const finish=value=>{if(!settled){settled=true;resolve(value);}};
    openModal({title:'업로드 문항 DB화',body:`<p>선택한 업로드 원본 ${items.length}문항을 나만의 DB에 저장합니다.</p><form><label class="field"><span>DB 이름</span><input name="title" maxlength="200" value="${esc(String(fileName||'업로드 문항').replace(/\.[^.]+$/,''))}" required></label></form><p class="small-note">이 브라우저에 문항 이미지와 추출한 텍스트를 보관합니다. 검색된 상품의 구매·구독 권한은 별도입니다.</p><p role="alert" data-upload-error hidden></p>`,footer:'<button class="btn" data-upload-cancel>취소</button><button class="btn primary" data-upload-save>DB화하기</button>',onMount:modal=>{
      modal.addEventListener('close',()=>{if(!busy)finish({ok:false});},{once:true});
      modal.addEventListener('cancel',event=>{if(busy){event.preventDefault();event.stopImmediatePropagation();}},true);
      modal.addEventListener('click',event=>{if(busy&&event.target===modal){event.preventDefault();event.stopImmediatePropagation();}},true);
      modal.querySelector('[data-upload-cancel]').onclick=()=>{if(busy)return;finish({ok:false});closeModal();};
      const submit=async event=>{
        event?.preventDefault();if(busy)return;
        const form=modal.querySelector('form');if(!form.reportValidity())return;
        busy=true;const button=modal.querySelector('[data-upload-save]');button.disabled=true;button.textContent='저장 중…';
        modal.querySelectorAll('[data-upload-cancel],[data-close]').forEach(b=>b.disabled=true);
        try{
          const result=await saveUploadedDB({title:form.elements.title.value,fileName,items});
          ctx.uploadedDBs=await listUploadedDBs();finish({ok:true,id:result.metadata.id});
          if(modal.isConnected){closeModal();openModal({title:result.duplicate?'이미 저장한 업로드 DB입니다':'업로드 문항을 DB로 저장했습니다',body:`<p>${esc(result.metadata.title)} · ${result.metadata.count}문항</p><p class="small-note">나만의 DB에서 저장한 원본 문항을 다시 볼 수 있습니다.</p>`,footer:'<button class="btn" data-upload-stay>계속 찾기</button><button class="btn primary" data-upload-open>저장한 DB 보기</button>',onMount:m=>{m.querySelector('[data-upload-stay]').onclick=closeModal;m.querySelector('[data-upload-open]').onclick=()=>{closeModal();ctx.go('mydb/detail/'+encodeURIComponent(result.metadata.id));};}});}else toast('업로드 문항을 나만의 DB에 저장했습니다.');
        }catch(error){if(modal.isConnected){const status=modal.querySelector('[data-upload-error]');status.hidden=false;status.textContent=error?.name==='QuotaExceededError'?'브라우저 저장 공간이 부족합니다. 문항을 나눠서 저장해 주세요.':error.message||'저장하지 못했습니다. 다시 시도해 주세요.';button.disabled=false;button.textContent='DB화하기';modal.querySelectorAll('[data-upload-cancel],[data-close]').forEach(b=>b.disabled=false);}else{finish({ok:false});toast('업로드 DB를 저장하지 못했습니다.');}}
        finally{busy=false;}
      };
      formSubmit(modal,submit);
    }});
  });
}
function formSubmit(modal,submit){modal.querySelector('form').onsubmit=submit;modal.querySelector('[data-upload-save]').onclick=submit;}

export async function renderUploadedDB(container,ctx,id,displayTitle) {
  const {esc,icon}=ctx.ui,metadata=ctx.uploadedDBs?.find(d=>d.id===id);
  container.disposeUploadedView?.();
  const token={};container.uploadedView=token;
  container.innerHTML='<section class="workspace"><p role="status">저장한 업로드 문항을 불러오고 있습니다.</p></section>';
  try{
    const record=await readStored('contents',id);
    if(container.uploadedView!==token||!location.hash.includes(id))return;
    if(!record||!metadata)throw new Error('저장한 DB를 찾을 수 없습니다.');
    const urls=record.items.map(item=>URL.createObjectURL(item.image));
    const cleanup=()=>{urls.forEach(url=>URL.revokeObjectURL(url));window.removeEventListener('hashchange',cleanup);if(container.disposeUploadedView===cleanup)container.disposeUploadedView=null;};
    container.disposeUploadedView=cleanup;
    window.addEventListener('hashchange',cleanup,{once:true});
    container.innerHTML=`<section class="workspace"><div class="breadcrumb"><a href="#mydb">나만의 DB</a>${icon('chevron')}업로드 DB</div><div class="heading-row"><h1>${esc(displayTitle||metadata.title)}</h1><a class="btn" href="#mydb">작업공간</a></div><p class="small-note">${esc(metadata.fileName)} · 저장한 원본 ${record.items.length}문항 · 이 브라우저에 보관</p><div class="question-grid" style="margin-top:24px">${record.items.map((item,i)=>`<article class="question-card"><header><strong>${esc(item.label)}</strong><span class="grow"></span><span class="muted">${item.pageNumber}페이지 · 업로드 원본</span></header><div class="question-image"><img style="width:100%;height:auto" src="${esc(urls[i])}" alt="${esc(item.label)} 원본"></div></article>`).join('')}</div></section>`;
  }catch(error){if(container.uploadedView===token&&location.hash.includes(id))container.innerHTML=`<section class="workspace"><p role="alert">${esc(error.message||'저장한 문항을 불러오지 못했습니다.')}</p><a class="btn" href="#mydb">작업공간</a></section>`;}
}
