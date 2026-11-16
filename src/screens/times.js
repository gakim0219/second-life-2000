// 한 번 누를 때 몇 번 할지(사용자 지시 2026-11-16). 고른 값은 이 기기에 남는다. 0은 남은 칸 모두.
import { h } from '../ui.js';
import { doAction } from '../activities.js';
import { STATS, statGains, stepsCrossed } from '../rules.js';
const KEY = 'sl2000.times', OPTS = [[1, '1번'], [3, '3번'], [5, '5번'], [0, '모두']];
const store = (fn) => { try { return fn(globalThis.localStorage); } catch { return null; } };
let n = Number(store((ls) => ls.getItem(KEY)) ?? 1);
if (!OPTS.some(([v]) => v === n)) n = 1;
export function timesBar() {
  const bar = h('div', { className: 'times', role: 'group', 'aria-label': '한 번 누를 때 하는 횟수' }, h('small', { text: '한 번에' }),
    OPTS.map(([v, label]) => h('button', { 'data-n': String(v), 'aria-pressed': String(v === n), text: label, on: { click: () => {
      n = v; store((ls) => ls.setItem(KEY, String(v)));
      for (const b of bar.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.n === String(v)));
    } } })));
  return bar;
}
// 고른 횟수만큼 되풀이한다. 돈이 들거나, 칸을 쓰지 않거나, 사람을 만나거나, 시험이 나오면 한 번에서 멈춘다.
export function doMany(s, id) {
  const stats = { ...s.stats }, stress = s.stress;
  let cash = s.cash, used = s.used, r = doAction(s, id);
  if (!r.ok || r.route) return r;
  let times = 1, slots = r.effects?.slots ?? 0;
  const stop = (x) => x.met || x.exam || s.cash < cash || s.used === used;
  while (!stop(r) && (n === 0 || times < n)) {
    cash = s.cash; used = s.used;
    const x = doAction(s, id);
    if (!x.ok) break;
    r = x; times += 1; slots += x.effects?.slots ?? 0;
  }
  if (times === 1) return r;
  const effects = { stats: STATS.filter((k) => s.stats[k] > stats[k]), gains: statGains(stats, s.stats), stress: Math.round((s.stress - stress) * 10) / 10, slots, marks: stepsCrossed(stats, s.stats) };
  return { ...r, times, effects, text: `${r.label} ${times}번. ${r.text}` };
}
