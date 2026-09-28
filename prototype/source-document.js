// PDF.js 5.4.624, Apache-2.0. All document bytes stay in this browser.
const vendor=new URL('./assets/vendor/pdfjs/',import.meta.url);
export const SOURCE_DOCUMENT_LIMITS=Object.freeze({bytes:20*1024*1024,pages:200,pixels:16000000,analysisPixels:1500000,regions:100});
const abort=()=>new DOMException('문서 처리를 취소했습니다.','AbortError');
export function clampSourceRect(rect,width,height){
 const x=Math.max(0,Math.min(width,Number(rect?.x))),y=Math.max(0,Math.min(height,Number(rect?.y)));
 const right=Math.max(x,Math.min(width,Number(rect?.x)+Number(rect?.width))),bottom=Math.max(y,Math.min(height,Number(rect?.y)+Number(rect?.height)));
 if(![x,y,right,bottom].every(Number.isFinite)||right-x<2||bottom-y<2)throw new Error('문항 영역을 조금 더 크게 선택해 주세요.');
 return {x,y,width:right-x,height:bottom-y};
}
export function detectTextRegions(items,width,height,pageNumber=1){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return [];
 const runs=items.filter(t=>typeof t.text==='string'&&Number.isFinite(t.x)&&Number.isFinite(t.y));
 const baseline=(a,b)=>Math.abs(a.y-b.y)<=Math.max(4,Math.min(a.height||12,b.height||12)*.65);
 const anchors=runs.flatMap(item=>{
  const text=item.text.trim(),match=/^(0?[1-9]|[1-9]\d)([.．)]|$)/.exec(text);
  if(!match||item.y<=height*.025||item.y>=height*.92||item.x<0||item.x>width*.66)return [];
  const columnStart=item.x>=width*.43?width*.43:0;
  const columnEnd=columnStart?width:width*.5;
  if(item.x<width*.43&&item.x>width*.24)return [];
  // A decimal, equation result, or a number following other text is not a heading.
  if(match[2]&&/^\d/.test(text.slice(match[0].length)))return [];
  if(runs.some(t=>t!==item&&t.x>=columnStart&&t.x<item.x-2&&baseline(t,item)&&t.text.trim()))return [];
  if(runs.some(t=>t!==item&&t.x>item.x+width*.08&&t.x<columnEnd&&baseline(t,item)&&/^(?:[1-9]\d?[.)]|[①-⑳])/.test(t.text.trim())))return [];
  const right=item.x+(Number(item.width)||text.length*6),next=runs.filter(t=>t!==item&&baseline(t,item)&&t.x>=right-1).sort((a,b)=>a.x-b.x)[0];
  const split=next&&/^[.．)](?:\s|$|[^\d])/.test(next.text.trim())&&next.x-right<=Math.max(10,(item.height||12));
  const explicit=!!match[2]||!!split;
  // Bare numerals are accepted only with a following prose run and aligned peers.
  if(!explicit&&(!next||next.x-right>35||!/[가-힣A-Za-z]{2}/.test(next.text)))return [];
  return [{...item,number:Number(match[1]),explicit}];
 });
 if(!anchors.length)return [];
 const twoColumns=anchors.some(a=>a.x<width*.43)&&anchors.some(a=>a.x>=width*.43);
 const columns=twoColumns?[anchors.filter(a=>a.x<width*.43),anchors.filter(a=>a.x>=width*.43)]:[anchors];
 return columns.flatMap((col,index)=>{
  if(!col.length)return [];
  const margin=Math.min(...col.map(a=>a.x));col=col.filter(a=>a.x-margin<=Math.max(12,width*.022)&&(a.explicit||col.filter(b=>Math.abs(b.x-a.x)<12).length>=2));
  if(!col.length)return [];
  col.sort((a,b)=>a.y-b.y);const x=Math.max(0,margin-8),right=twoColumns&&index===0?width*.5-5:width-12;
  return col.filter((a,i)=>!i||a.y-col[i-1].y>12).map((a,i,kept)=>{const y=Math.max(0,a.y-5),end=kept[i+1]?kept[i+1].y-6:height-18;
   const rect={x,y,width:Math.max(2,right-x),height:Math.max(2,end-y)};
   return {id:`page-${pageNumber}-region-${index}-${i}`,pageNumber,rect,label:`${a.number}번 추정 영역`,questionId:null,confidence:'suggested',detection:'text',text:runs.filter(t=>t.x>=x&&t.x<right&&t.y>=y&&t.y<end).sort((a,b)=>a.y-b.y||a.x-b.x).map(t=>t.text).join(' ')};
  });
 }).slice(0,SOURCE_DOCUMENT_LIMITS.regions);
}

/** Local layout segmentation, not OCR. Only ruled two-column exam pages qualify. */
export function detectImageRegions(imageData,pageWidth,pageHeight,pageNumber=1){
 const {data,width,height}=imageData||{};
 if(!data||!Number.isInteger(width)||!Number.isInteger(height)||width<100||height<100||width*height>SOURCE_DOCUMENT_LIMITS.analysisPixels||data.length<width*height*4||!Number.isFinite(pageWidth)||!Number.isFinite(pageHeight)||!(pageWidth>0&&pageHeight>0))return [];
 const ink=new Uint8Array(width*height);
 for(let i=0;i<ink.length;i++){const p=i*4;ink[i]=data[p+3]>128&&(data[p]*.299+data[p+1]*.587+data[p+2]*.114)<195?1:0;}
 const top=Math.floor(height*.1),bottom=Math.floor(height*.84);let divider=0,best=0;
 for(let x=Math.floor(width*.43);x<width*.57;x++){
  let count=0;for(let y=top;y<bottom;y++){const o=y*width+x;count+=ink[o-1]||ink[o]||ink[o+1];}
  if(count>best){best=count;divider=x;}
 }
 // Covers, blank scans and ordinary images must not become invented questions.
 if(best<height*.25)return [];
 let header=0,headerInk=0;
 for(let y=Math.floor(height*.04);y<height*.19;y++){
  let count=0;for(let x=Math.floor(width*.07);x<width*.94;x++)count+=ink[y*width+x];
  if(count>headerInk){headerInk=count;header=y;}
 }
 if(headerInk<width*.22)return [];
 const ranges=[[Math.floor(width*.065),divider-Math.max(5,Math.ceil(width*.012))],[divider+Math.max(5,Math.ceil(width*.012)),Math.floor(width*.94)]];
 const regions=[];
 for(let column=0;column<ranges.length;column++){
  const [left,right]=ranges[column],rows=[];
  for(let y=header+Math.ceil(height*.008);y<bottom;y++){
   let count=0;for(let x=left;x<right;x++)count+=ink[y*width+x];
   if(count>=Math.max(4,(right-left)*.012))rows.push(y);
  }
  if(!rows.length)continue;
  const groups=[];let start=rows[0],end=start,inkRows=1;
  for(const y of rows.slice(1)){if(y-end>height*.055){groups.push({start,end,inkRows});start=y;inkRows=0;}end=y;inkRows++;}groups.push({start,end,inkRows});
  for(const group of groups){
   // Small isolated marks and the low-page checking notice are not questions.
   if(group.inkRows<8||group.end-group.start<height*.022||group.start>height*.735)continue;
   const pad=Math.ceil(height*.007),x=left,y=Math.max(header+2,group.start-pad),endY=Math.min(bottom,group.end+pad);
   regions.push({id:`page-${pageNumber}-layout-${column}-${regions.length}`,pageNumber,rect:{x:x/width*pageWidth,y:y/height*pageHeight,width:(right-x)/width*pageWidth,height:(endY-y)/height*pageHeight},label:`${pageNumber}쪽 영역 ${regions.length+1}`,questionId:null,confidence:'suggested',detection:'layout',text:''});
  }
 }
 return regions.slice(0,12);
}
let libraryPromise;
const pdfLibrary=()=>libraryPromise||=(import(new URL('legacy/build/pdf.mjs',vendor).href).then(lib=>{lib.GlobalWorkerOptions.workerSrc=new URL('legacy/build/pdf.worker.mjs',vendor).href;return lib;}));
let metadataPromise;
const sampleMetadata=()=>metadataPromise||=(fetch(new URL('./assets/source/sample-regions.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('표본 정보를 불러오지 못했습니다.');return r.json();}).catch(error=>{metadataPromise=null;throw error;}));
export async function openSourceDocument(file,{signal}={}){
 if(!file?.size)throw new Error('비어 있는 파일입니다. 다른 파일을 선택해 주세요.');
 if(file.size>SOURCE_DOCUMENT_LIMITS.bytes)throw new Error('20MB 이하의 파일을 선택해 주세요.');
 if(signal?.aborted)throw abort();
 const image=/\.(png|jpe?g|webp)$/i.test(file.name||'')||/^image\/(png|jpeg|webp)$/.test(file.type||'');
 const pdf=/\.pdf$/i.test(file.name||'')||file.type==='application/pdf';
 if(!image&&!pdf)throw new Error('PDF, JPG, PNG 또는 WEBP 파일을 선택해 주세요.');
 let destroyed=false,loading=null,documentPDF=null,bitmap=null,cropCache=null,cropQueue=Promise.resolve(),regionCount=0,detectionLimitReached=false;const tasks=new Set(),urls=new Set(),pages=new Map(),detections=new Map(),canvasTasks=new WeakMap();
 const ensure=s=>{if(destroyed||signal?.aborted||s?.aborted)throw abort();};
 const destroy=async()=>{if(destroyed)return;destroyed=true;signal?.removeEventListener('abort',onAbort);for(const task of tasks)task.cancel();tasks.clear();for(const url of urls)URL.revokeObjectURL(url);urls.clear();bitmap?.close();pages.clear();detections.clear();if(cropCache){cropCache.canvas.width=cropCache.canvas.height=0;cropCache=null;}await loading?.destroy();};
 const onAbort=()=>{void destroy().catch(()=>{});};signal?.addEventListener('abort',onAbort,{once:true});
 try{
  let metadata=null,known=false;
  if(image){bitmap=await createImageBitmap(file);if(destroyed||signal?.aborted)bitmap.close();ensure();}
  else{
   const bytes=new Uint8Array(await file.arrayBuffer());ensure();
   const digest=await crypto.subtle.digest('SHA-256',bytes);ensure();
   metadata=await sampleMetadata();ensure();known=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')===metadata.sha256;
   const lib=await pdfLibrary();ensure();
   loading=lib.getDocument({data:bytes,isEvalSupported:false,enableXfa:false,useSystemFonts:true,cMapUrl:new URL('cmaps/',vendor).href,cMapPacked:true,standardFontDataUrl:new URL('standard_fonts/',vendor).href,wasmUrl:new URL('wasm/',vendor).href});
   loading.onPassword=()=>{void loading.destroy();};
   documentPDF=await loading.promise;ensure();
   if(documentPDF.numPages>SOURCE_DOCUMENT_LIMITS.pages)throw new Error('200쪽 이하의 PDF를 선택해 주세요.');
  }
  const pageCount=image?1:documentPDF.numPages;
  const page=async number=>{ensure();if(!Number.isInteger(number)||number<1||number>pageCount)throw new Error('페이지 번호를 확인해 주세요.');if(image)return null;if(!pages.has(number))pages.set(number,documentPDF.getPage(number));const result=await pages.get(number);ensure();return result;};
  const geometry=async number=>{const p=await page(number),viewport=p?.getViewport({scale:1});return {p,viewport,width:viewport?.width||bitmap.width,height:viewport?.height||bitmap.height};};
  const renderPage=async(number,canvas,{scale=1.5,signal:localSignal}={})=>{
   ensure(localSignal);const g=await geometry(number);ensure(localSignal);if(!canvas?.getContext)throw new Error('PDF를 표시할 캔버스가 없습니다.');
   scale=Math.min(Math.max(Number(scale)||1,.1),4,Math.sqrt(SOURCE_DOCUMENT_LIMITS.pixels/(g.width*g.height)));
   const previous=canvasTasks.get(canvas);if(previous){previous.cancel();try{await previous.promise;}catch{}}ensure(localSignal);
   canvas.width=Math.ceil(g.width*scale);canvas.height=Math.ceil(g.height*scale);const context=canvas.getContext('2d');
   if(image){context.drawImage(bitmap,0,0,canvas.width,canvas.height);return {pageNumber:number,width:g.width,height:g.height,scale};}
   const task=g.p.render({canvasContext:context,viewport:g.p.getViewport({scale}),annotationMode:0});tasks.add(task);canvasTasks.set(canvas,task);
   const cancel=()=>task.cancel();localSignal?.addEventListener('abort',cancel,{once:true});
   try{await task.promise;ensure(localSignal);return {pageNumber:number,width:g.width,height:g.height,scale};}
   finally{tasks.delete(task);if(canvasTasks.get(canvas)===task)canvasTasks.delete(canvas);localSignal?.removeEventListener('abort',cancel);}
  };
  const textItems=async number=>{const g=await geometry(number);if(image)return {items:[],...g};const content=await g.p.getTextContent();ensure();const items=content.items.filter(t=>typeof t.str==='string').map(t=>{const [x,y]=g.viewport.convertToViewportPoint(t.transform[4],t.transform[5]);return {text:t.str,x,y:y-Math.abs(t.height||t.transform[3]||10),width:t.width,height:t.height};});return {...g,items};};
  const detectRegions=async number=>{
   ensure();if(detections.has(number))return structuredClone(await detections.get(number));
   const pending=(async()=>{
    const g=await textItems(number);ensure();
    if(regionCount>=SOURCE_DOCUMENT_LIMITS.regions){detectionLimitReached=true;return [];}
    let regions=known?structuredClone(metadata.regions.filter(r=>r.pageNumber===number)):detectTextRegions(g.items,g.width,g.height,number);
    if(!known&&!regions.length&&g.items.filter(t=>t.text.trim()).length<5){
     const canvas=document.createElement('canvas'),scale=Math.min(1.5,900/g.width,Math.sqrt((SOURCE_DOCUMENT_LIMITS.analysisPixels-10000)/(g.width*g.height)));
     try{await renderPage(number,canvas,{scale});ensure();regions=detectImageRegions(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),g.width,g.height,number);}
     finally{canvas.width=canvas.height=0;}
    }
    ensure();const remaining=SOURCE_DOCUMENT_LIMITS.regions-regionCount;if(regions.length>remaining)detectionLimitReached=true;
    regions=regions.slice(0,remaining);regionCount+=regions.length;return regions;
   })();
   detections.set(number,pending);
   try{return structuredClone(await pending);}catch(error){detections.delete(number);throw error;}
  };
  const getRegionText=async(number,rect)=>{const {items,width,height}=await textItems(number),r=clampSourceRect(rect,width,height);return items.filter(t=>t.x>=r.x&&t.x<r.x+r.width&&t.y>=r.y&&t.y<r.y+r.height).map(t=>t.text).join(' ');};
  const cropRegionTask=async(number,rect,{scale=2,signal:localSignal}={})=>{
   ensure(localSignal);const g=await geometry(number),r=clampSourceRect(rect,g.width,g.height);
   scale=Math.min(Math.max(Number(scale)||1,.1),4,Math.sqrt(SOURCE_DOCUMENT_LIMITS.pixels/(g.width*g.height)));
   if(!cropCache||cropCache.number!==number||cropCache.scale!==scale){
    const previous=cropCache;if(previous){try{await previous.promise;}catch{}ensure(localSignal);previous.canvas.width=previous.canvas.height=0;}
    const canvas=document.createElement('canvas'),entry={number,scale,canvas,promise:null};cropCache=entry;
    entry.promise=renderPage(number,canvas,{scale,signal:localSignal}).catch(error=>{if(cropCache===entry)cropCache=null;canvas.width=canvas.height=0;throw error;});
   }
   const cached=cropCache,rendered=await cached.promise;ensure(localSignal);const out=document.createElement('canvas'),s=rendered.scale;
   out.width=Math.max(1,Math.ceil(r.width*s));out.height=Math.max(1,Math.ceil(r.height*s));
   try{out.getContext('2d').drawImage(cached.canvas,r.x*s,r.y*s,r.width*s,r.height*s,0,0,out.width,out.height);
    const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));ensure(localSignal);if(!blob)throw new Error('선택한 문항 영역을 만들지 못했습니다.');const url=URL.createObjectURL(blob);urls.add(url);return {blob,url,width:out.width,height:out.height};
   }finally{out.width=out.height=0;}
  };
  // Crops share one page canvas; serialize draws so page changes cannot clear it mid-crop.
  const cropRegion=(number,rect,options)=>{const pending=cropQueue.then(()=>cropRegionTask(number,rect,options));cropQueue=pending.catch(()=>{});return pending;};
  return {name:file.name,pageCount,isKnownSample:known,type:image?'image':'pdf',get detectionLimitReached(){return detectionLimitReached;},renderPage,detectRegions,getRegionText,cropRegion,destroy};
 }catch(error){await destroy().catch(()=>{});if(signal?.aborted||error?.name==='AbortError')throw abort();if(error?.name==='PasswordException'||/password|passwords|Worker was destroyed/i.test(error?.message||''))throw new Error('암호가 걸린 PDF는 열 수 없습니다. 암호를 해제한 파일을 선택해 주세요.');if(/InvalidPDF|MissingPDF/.test(error?.name||''))throw new Error('PDF를 읽지 못했습니다. 파일이 손상됐는지 확인해 주세요.');throw error;}
}
