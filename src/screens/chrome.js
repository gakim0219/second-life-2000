// 위 머리글과 아래 탭. 화면 이름으로 어느 탭인지 정한다. 시작·장면·신문·결산·엔딩에서는 숨긴다.
import { h } from '../ui.js';
import { icon } from './icons.js';
const TABS = [['home', '일상', 'home'], ['map', '동네', 'map'], ['people', '사람들', 'heart'], ['album', '기억', 'memory'], ['invest', '자산', 'chart']];
const OWNER = { messenger: 'people', home: 'home', stat: 'home', company: 'home', settings: 'home', map: 'map', place: 'map', people: 'people', person: 'people', love: 'people', family: 'people', crush: 'people', album: 'album', invest: 'invest', asset: 'invest', account: 'invest' };
let hdr = null, nav = null, pill = null;
function mount(ctx) {
  const go = (name) => { ctx.stack.length = 0; return ctx.go(name, {}, { replace: true }); };
  pill = h('span', { className: 'ap-pill num', role: 'img' });
  hdr = h('header', { id: 'hdr', hidden: true },
    h('button', { className: 'brand', 'aria-label': '일상으로', on: { click: () => go('home') } }, '두 번째 인생', h('span', { text: 'RE : LIFE / 2000' })),
    h('div', { className: 'hdr-right' }, pill, h('button', { className: 'icon-btn', 'aria-label': '연락', on: { click: () => { if (ctx.cur?.name !== 'messenger') ctx.go('messenger'); } } }, icon('chat')), h('button', { className: 'icon-btn', 'aria-label': '설정', on: { click: () => { if (ctx.cur?.name !== 'settings') ctx.go('settings'); } } }, icon('settings'))));
  nav = h('nav', { id: 'nav', 'aria-label': '게임 메뉴', hidden: true }, TABS.map(([name, label, ic]) => h('button', { 'data-tab': name, on: { click: () => go(name) } }, icon(ic), label)));
  const app = document.getElementById('app');
  app.before(hdr); app.after(nav);
}
export function updateChrome(ctx) {
  if (!hdr) mount(ctx);
  const tab = ctx.s ? OWNER[ctx.cur?.name] : null, on = !!tab;
  hdr.hidden = !on; nav.hidden = !on;
  document.body.classList.toggle('has-nav', on);
  if (!on) return;
  const left = Math.max(0, ctx.s.capacity - ctx.s.used);
  pill.replaceChildren(icon('bolt'), `${left}/${ctx.s.capacity}`);
  pill.setAttribute('aria-label', `남은 활동 칸 ${left}개`);
  for (const b of nav.children) { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
}
