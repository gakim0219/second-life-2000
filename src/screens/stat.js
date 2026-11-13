// 능력치 상세. 홈에서는 시트로, 다른 화면에서는 ctx.go('stat')로 연다. 스타일은 home.css에 있다.
import { h, pips } from '../ui.js';
import { statViews, UNLOCKS, TIER_MAX, STATS } from '../rules.js';
import { homeBrief } from '../activities.js';

const TIER_FROM = [0, 51, 101, 151, 176, 201, 251];
function section(s, v) {
  const lo = TIER_FROM[v.tier - 1], hi = TIER_MAX[v.tier - 1], fill = Math.max(0, Math.min(100, ((v.value - lo) / (hi - lo)) * 100));
  const bar = h('div', { className: 'st-bar' }, h('i')); bar.firstChild.style.width = `${fill}%`;
  return h('section', { className: 'panel st-sec', id: `st-${v.stat}` },
    h('div', { className: 'row between' }, h('h3', { text: v.stat }), h('span', { className: 'row st-now' }, h('b', { className: 'num', text: v.value }), pips(v.tier, 7), h('span', { className: 'small sub', text: `${v.tier}구간` }))),
    bar,
    h('p', { className: 'small st-next', text: v.next ? `다음 문턱 ${v.next.min} · ${v.next.remain} 남음` : '마지막 문턱까지 열었습니다.' }),
    v.capNext ? h('p', { className: 'small st-next', text: `체력 ${v.capNext}이 되면 활동 칸 하나가 더 늘어납니다.` }) : null,
    h('ul', { className: 'st-list' }, UNLOCKS[v.stat].map((u) => {
      const open = s.stats[v.stat] >= u.min;
      return h('li', { className: open ? 'open' : '' }, h('span', { className: open ? 'st-mark' : 'st-mark ico-lock', 'aria-label': open ? '열림' : '잠김', text: open ? '✓' : '' }), h('span', {}, h('b', { className: 'num', text: u.min }), ' ', u.text));
    })));
}
function tiredBar(v) { const bar = h('div', { className: 'st-bar' }, h('i')); bar.firstChild.style.width = `${v}%`; return bar; }
function content(s, focus) {
  const views = statViews(s), b = homeBrief(s);
  const order = focus && STATS.includes(focus) ? [views.find((v) => v.stat === focus), ...views.filter((v) => v.stat !== focus)] : views;
  return h('div', { className: 'stack' },
    h('div', { className: 'card stack' },
      h('div', { className: 'row between' }, h('span', {}, '피곤함 ', h('b', { className: 'num', text: `${b.tired} / 100` })), h('span', { className: 'sub', text: `한 달 활동 칸 ${b.capacity}개` })),
      tiredBar(b.tired),
      h('p', { className: 'small sub', text: b.tiredFull ? '다음 달 활동 칸이 절반으로 줄어듭니다.' : '100이 되면 다음 달 활동 칸이 절반으로 줄어듭니다.' })),
    order.map((v) => section(s, v)));
}
export function openStat(ctx, focus) {
  return ctx.sheet((close) => h('div', { className: 'stack' },
    h('div', { className: 'row between' }, h('h2', { text: '능력' }), h('button', { className: 'sheet-x', 'aria-label': '닫기', text: '✕', on: { click: close } })),
    content(ctx.s, focus)));
}
const stat = (ctx, params) => h('div', { className: 'stack' },
  h('div', { className: 'row between' }, h('h2', { text: '능력' }), h('button', { className: 'sheet-x', 'aria-label': '돌아가기', text: '✕', on: { click: () => ctx.back() } })),
  content(ctx.s, params?.focus));
export const screens = { stat };
