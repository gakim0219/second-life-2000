// 엔딩: 결산 5축 -> 주 엔딩 -> 숨은 엔딩 -> 에필로그 카드 -> 다시 시작.
import { h, won, pips } from '../ui.js';
import { resolveEnding } from '../ending.js';
import { netWorth } from '../invest.js';
import { companyValue } from '../company.js';
import { endingSeries } from '../review.js';
import { portrait, spark, whoName } from './common.js';

function ending(ctx) {
  const s = ctx.s;
  if (!s) { setTimeout(() => ctx.go('start', {}, { replace: true })); return h('div'); }
  const net = netWorth(s) + companyValue(s), r = resolveEnding(s, net); // 회사 지분까지 합친 값이 부 축이다
  if (s.ended !== r.main.id) { s.ended = r.main.id; ctx.save(); }
  const axes = r.axes, series = endingSeries(s);
  const axis = (name, text, extra) => h('div', { className: 'en-axis' }, h('h3', { text: name }), h('p', { text }), extra);
  const me = axes.나;
  const pages = [
    () => h('div', { className: 'panel stack' }, h('p', { className: 'small sub', text: '2026년 12월' }), h('h1', { text: `${s.name}의 27년` }),
      axis('부', `${won(axes.부.value)} · ${axes.부.tier}`, spark(series.map((x) => x.netWorth), '해마다의 순자산')),
      axis('회사', axes.회사.text), axis('가족', axes.가족.text), axis('사람', axes.사람.text),
      axis('나', me.칭호?.length ? `칭호 · ${me.칭호.join(' · ')}` : '', h('div', { className: 'en-me' }, ['지능', '체력', '매력', '인맥'].map((k) => h('span', {}, `${k} `, pips(me[k], 7)))))),
    () => h('div', { className: 'panel en-main stack' }, h('p', { className: 'small sub', text: '엔딩' }), h('h1', { text: r.main.name }), h('p', { className: 'en-big', text: r.main.text })),
    ...r.hidden.map((x) => () => h('div', { className: 'panel en-main en-hidden stack' }, h('p', { className: 'small sub', text: '숨은 엔딩' }), h('h1', { text: x.name }), h('p', { className: 'en-big', text: x.text }))),
    ...r.epilogue.map((c) => () => h('div', { className: 'panel en-card stack' },
      h('p', { className: 'small sub', text: c.kind }),
      c.id ? h('div', { className: 'en-pic' }, portrait(c.id, '사회인')) : null,
      c.who || c.label ? h('h2', { text: c.who ?? whoName(c.id) ?? c.label }) : null, h('p', { text: c.text }))),
  ];
  let i = 0;
  const holder = h('div', { className: 'en-holder' }), foot = h('div', {});
  const again = () => { ctx.wipe(); ctx.stack.length = 0; ctx.go('start', { form: true }, { replace: true }); };
  const draw = () => {
    holder.replaceChildren(pages[i]()); window.scrollTo?.(0, 0);
    const last = i === pages.length - 1, kids = [];
    if (i > 0) kids.push(h('button', { className: 'btn en-prev', text: '이전', on: { click: () => { i -= 1; draw(); } } }));
    kids.push(last ? h('button', { className: 'btn main', text: r.again, on: { click: again } }) : h('button', { className: 'btn main', text: `다음 (${i + 1}/${pages.length})`, on: { click: () => { i += 1; draw(); } } }));
    foot.replaceChildren(...kids);
  };
  draw();
  return h('div', { className: 'en' }, holder, h('div', { className: 'bar' }, foot));
}
export const screens = { ending };
