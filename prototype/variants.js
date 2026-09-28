const variants = [
  {id:'a',label:'A 대표님 원안'},
  {id:'b',label:'B 수학비서 확장'},
  {id:'c',label:'C 단원 중심 문제은행'},
];
export function getVariant(){const value=new URLSearchParams(location.search).get('variant');return variants.some(v=>v.id===value)?value:'b';}
export function variantURL(id,hash=location.hash){const url=new URL(location.href);url.searchParams.set('variant',variants.some(v=>v.id===id)?id:'b');url.hash=hash;return url.href;}
export function renderVariantBar({onChange}={}){
  let bar=document.getElementById('variant-bar');if(!bar){bar=document.createElement('nav');bar.id='variant-bar';bar.setAttribute('aria-label','화면 비교안');document.body.prepend(bar);}
  document.body.classList.add('has-variant-bar');const current=getVariant();
  bar.replaceChildren(...variants.map(v=>{const button=document.createElement('button');button.type='button';button.textContent=v.label;button.dataset.variant=v.id;button.setAttribute('aria-pressed',String(v.id===current));button.onclick=()=>{if(v.id===getVariant())return;if(onChange)onChange(v.id);else location.assign(variantURL(v.id));};return button;}));return bar;
}
export function addVariantLinks(container=document.querySelector('.compare-toolbar')||document.querySelector('.compare-header')){if(!container||container.querySelector('[data-variant-links]'))return;const nav=document.createElement('nav');nav.dataset.variantLinks='';nav.setAttribute('aria-label','세 가지 화면 비교');for(const v of variants){const a=document.createElement('a');a.href=`./index.html?variant=${v.id}#library`;a.textContent=v.label;nav.append(a);}container.append(nav);return nav;}
