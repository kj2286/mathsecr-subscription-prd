import {esc} from './ui.js';

// Keep this order aligned with the user's original navigation reference.
const groups = [
  {label: '', items: [
    ['검색', 'search', '#search'], ['홈', 'home', '#home'], ['알림', 'bell', '#notifications'],
  ]},
  {label: 'DB구축', items: [
    ['수학비서 DB', 'db', '#library'], ['나만의 DB', 'folder', '#mydb'],
    ['한글 DB화', 'document'], ['출처찾기&DB화', 'search', '#source'],
  ]},
  {label: '문제지', items: [['내 문제지', 'book', '#papers'], ['내 분석지', 'chart']]},
  {label: '관리', items: [['내 콘텐츠 관리', 'grid'], ['내 학생관리', 'users']]},
  {label: '상점', items: [['SYNK 모의고사', 'clock'], ['수학B서점', 'store', '#shop']]},
  {label: '특별한 기능', items: [['포스트지오', 'shapes'], ['수학비서INDEX', 'index']]},
];
// Operating nav assets; the prototype's existing menu order and widths stay unchanged.
const navAssets = {
  search:'icon_search.svg', home:'icon_home.svg', bell:'icon_notification.svg',
  db:'icon_db.svg', folder:'icon_db.svg', document:'icon_text.svg', book:'icon_book.svg',
  chart:'icon_inspect.svg', grid:'icon_shape.svg', users:'icon_users.svg', clock:'icon_sync.svg',
  store:'icon_store.svg', shapes:'icon_postgeo.svg', index:'icon_index.svg',
};
const icon = (name, active=false) => {
  if (navAssets[name]) return `<img class="gn-nav-icon${name==='store'&&active?' is-colored-active':''}" src="assets/icons/${name==='store'&&active?'icon_store_white.svg':navAssets[name]}" alt="" aria-hidden="true">`;
  return name==='close' ? '<img class="gn-nav-icon" src="assets/icons/icon_close_dark.svg" alt="" aria-hidden="true">' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
};
const brand = '<img class="gn-logo" src="assets/logo.svg" alt="수학비서"><img class="gn-beta" src="assets/icons/beta-badge.svg" alt="Beta">';

function setMenuOpen(open) {
  const nav = document.querySelector('#gnb');
  nav.classList.toggle('is-open', open);
  document.body.classList.toggle('gnb-open', open);
  document.querySelector('#gnb-toggle').setAttribute('aria-expanded', String(open));
  document.querySelector('#page').inert = open;
  document.querySelector('#gnb-backdrop').hidden = !open;
  if (open) nav.querySelector('.gn-close').focus();
}

export function renderNavigation({route, notifications = 0}) {
  const nav = document.querySelector('#gnb');
  const scrollTop = nav.querySelector('.gn-menu')?.scrollTop || 0;
  const activeRoute = route === 'bank' ? 'library' : route;
  const item = ([label, name, href]) => {
    const active = href === `#${activeRoute}`;
    const content = `${icon(name,active)}<span>${esc(label)}</span>${href === '#notifications' && notifications ? '<i class="gn-unread" aria-label="새 알림"></i>' : ''}`;
    if (!href) return `<button class="gn-item is-disabled" type="button" disabled title="아직 제공하지 않는 기능입니다.">${content}</button>`;
    const external = !href.startsWith('#');
    return `<a class="gn-item${active ? ' active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}${external ? ' target="_blank" rel="noopener" aria-label="수학B서점 (원본 화면, 새 탭)" title="원본 수학B서점 · 새 탭에서 열기"' : ''}>${content}</a>`;
  };
  nav.innerHTML = `<div class="gn-brand-row"><a href="#home" class="gn-brand" aria-label="수학비서 홈">${brand}</a><button class="gn-close" type="button" aria-label="전체 메뉴 닫기">${icon('close')}</button></div>
    <div class="gn-menu">${groups.map(group => `<section class="gn-group" aria-label="${group.label || '바로가기'}">${group.label ? `<h2>${group.label}</h2>` : ''}${group.items.map(item).join('')}</section>`).join('')}</div>
    <div class="gn-account">${item(['마이페이지', 'users', '#account'])}<a class="gn-guide" href="guide.html" target="_blank" rel="noopener" aria-label="기능 안내 (새 탭)">?</a></div>`;
  nav.querySelector('.gn-menu').scrollTop = scrollTop;
  nav.onclick = event => {
    if (event.target.closest('a, .gn-close') && nav.classList.contains('is-open')) {
      setMenuOpen(false);
      document.querySelector('#gnb-toggle').focus();
    }
  };
  if (!document.querySelector('#gnb-mobile-bar')) {
    const bar = document.createElement('header');
    bar.id = 'gnb-mobile-bar';
    bar.innerHTML = `<a href="#home" class="gn-brand" aria-label="수학비서 홈">${brand}</a><button id="gnb-toggle" type="button" aria-label="전체 메뉴 열기" aria-expanded="false" aria-controls="gnb">${icon('menu')}<span>전체 메뉴</span></button>`;
    document.querySelector('#app').before(bar);
    const backdrop = document.createElement('button');
    backdrop.id = 'gnb-backdrop';
    backdrop.hidden = true;
    backdrop.tabIndex = -1;
    backdrop.setAttribute('aria-label', '전체 메뉴 닫기');
    document.body.append(backdrop);
    bar.querySelector('button').onclick = () => setMenuOpen(true);
    backdrop.onclick = () => { setMenuOpen(false); document.querySelector('#gnb-toggle').focus(); };
    document.addEventListener('keydown', event => {
      if (!nav.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        setMenuOpen(false);
        document.querySelector('#gnb-toggle').focus();
      } else if (event.key === 'Tab') {
        const links = [...nav.querySelectorAll('a, button:not(:disabled)')];
        const first = links[0], last = links.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    matchMedia('(max-width: 800px)').addEventListener('change', () => setMenuOpen(false));
    window.addEventListener('hashchange', () => {
      if (nav.classList.contains('is-open')) {
        setMenuOpen(false);
        document.querySelector('#gnb-toggle').focus();
      }
    });
  }
}
