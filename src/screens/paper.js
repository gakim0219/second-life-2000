// 이달의 신문과 연말 결산.
import { h, won } from '../ui.js';
import { monthlyPaper } from '../paper.js';
import { celebNews } from '../network.js';
import { reportYears } from '../review.js';
import { yearReview } from '../review.js';
import { advance, spark, pct } from './common.js';

const src = (url) => (url && /^https?:/.test(url) ? h('a', { className: 'pp-src', href: url, target: '_blank', rel: 'noopener', text: '출처' }) : null);
const sect = (title, ...kids) => h('section', { className: 'pp-sec' }, h('h3', { text: title }), ...kids);
const signed = (n) => `${n > 0 ? '+' : ''}${won(n)}`;
function paper(ctx, params) {
  const s = ctx.s, p = monthlyPaper(s), [top, ...rest] = p.headlines, world = celebNews(s).slice(0, 3);
  const done = () => (params.peek ? ctx.back() : advance(ctx));
  return h('div', { className: 'pp stack' },
    h('article', { className: 'panel pp-sheet' },
      h('header', { className: 'pp-mast' }, h('h1', { text: '이달의 신문' }), h('p', { className: 'small num', text: `${p.year}년 ${p.month}월호` })),
      p.endedCard ? sect(p.endedCard.title, h('p', { text: p.endedCard.text }), h('p', { className: 'small sub', text: p.endedCard.priceNote })) : null,
      top ? h('section', { className: 'pp-top' }, top.section ? h('span', { className: 'pp-tag', text: top.section }) : null, h('h2', { text: top.text }), h('p', { className: 'small sub' }, top.date ?? '', ' ', src(top.source))) : null,
      rest.length ? h('ul', { className: 'pp-list' }, rest.map((n) => h('li', {}, n.section ? h('span', { className: 'pp-tag', text: n.section }) : null, ' ', n.text, ' ', src(n.source)))) : null,
      p.market ? h('p', { className: 'pp-market num', text: p.market.text }) : null,
      p.daily ? h('p', { className: 'pp-daily', text: p.daily }) : null,
      p.era.length ? sect('그때 그 일', h('ul', { className: 'pp-list' }, p.era.map((n) => h('li', {}, n.text, ' ', src(n.url))))) : null,
      world.length ? sect('연예·세상 소식', h('ul', { className: 'pp-list' }, world.map((n) => h('li', { text: n.text })))) : null,
      p.society ? sect('사회', h('p', {}, p.society.text, ' ', src(p.society.source))) : null,
      p.contest.length ? sect('대회 소식', p.contest.map((c) => h('div', { className: 'pp-item' }, h('b', { text: c.title }), h('p', { text: c.text })))) : null,
      p.memory ? h('section', { className: 'pp-sec pp-mem' }, h('h3', { text: `기억 한 조각 · ${p.memory.clarity}` }), h('p', { text: p.memory.text })) : null,
      p.alerts.length ? sect('내 보유 알림', h('ul', { className: 'pp-list' }, p.alerts.map((a) => h('li', {}, a.id ? h('button', { className: 'pp-link', text: a.text, on: { click: () => ctx.go('asset', { id: a.id }) } }) : a.text)))) : null,
      p.money.length ? sect('돈 소식', h('ul', { className: 'pp-list pp-money' }, p.money.map((m) => h('li', {}, h('span', { text: m.label }), h('b', { className: `num ${m.amount >= 0 ? 'pp-plus' : 'pp-minus'}`, text: signed(m.amount) }))))) : null,
      params.changes?.length ? sect('나의 변화', h('ul', { className: 'pp-list' }, params.changes.map((t) => h('li', { text: t })))) : null,
      params.log?.length ? sect('우리 집 소식', h('ul', { className: 'pp-list' }, params.log.map((t) => h('li', { text: t })))) : null),
    h('div', { className: 'bar' }, h('div', {}, h('button', { className: 'btn main', text: params.peek ? '신문 접기' : '신문을 접는다', on: { click: done } }))));
}
const EARN = (e) => Object.entries(e).filter(([, v]) => v);
function yearend(ctx, params) {
  const r = yearReview(ctx.s, params.year);
  if (!r) { setTimeout(() => advance(ctx)); return h('div'); }
  const mix = Object.entries(r.mix).filter(([, v]) => v > 0), total = mix.reduce((a, [, v]) => a + v, 0);
  const bar = h('div', { className: 'ye-mix', 'aria-hidden': 'true' }, mix.map(([k, v], i) => { const e = h('i', { className: `m${i % 5}`, title: k }); e.style.flexGrow = String(v); return e; }));
  const taxLine = [r.bill?.total ? [`${r.year + 1}년 5월 청구 세금`, r.bill.total] : null, r.taxes ? ['올해 낸 세금', r.taxes] : null, r.fees ? ['거래 수수료', r.fees] : null, r.loanInterest ? ['대출 이자', r.loanInterest] : null].filter(Boolean);
  return h('div', { className: 'ye stack' },
    h('div', { className: 'panel ye-sheet stack' },
      h('p', { className: 'small sub', text: '연말 결산' }), h('h1', { text: `${r.year}년이 지났다` }),
      params.pick && reportYears(ctx.s).length > 1 ? h('div', { className: 'tabs', role: 'group', 'aria-label': '결산 연도' }, reportYears(ctx.s).map((y) => h('button', { 'aria-pressed': String(y === r.year), text: `${y}`, on: { click: () => ctx.go('yearend', { year: y, pick: true }, { replace: true }) } }))) : null,
      r.headline ? h('p', { className: 'pp-daily', text: `그해 신문: ${r.headline}` }) : null,
      h('div', {}, h('p', { className: 'small sub', text: '순자산' }), h('p', { className: 'ye-net num', text: won(r.netWorth) }),
        h('p', { className: `num ${r.change >= 0 ? 'pp-plus' : 'pp-minus'}`, text: `지난해보다 ${signed(r.change)}${r.changePct != null ? ` (${r.changePct > 0 ? '+' : ''}${r.changePct}%)` : ''}` })),
      spark(r.track, `${r.year}년 순자산 추이`),
      mix.length > 1 ? h('div', { className: 'stack' }, bar, h('p', { className: 'small sub', text: mix.map(([k, v]) => `${k} ${Math.round(v / total * 100)}%`).join(' · ') })) : null,
      r.highlights.length ? sect('올해의 일', h('ul', { className: 'pp-list' }, r.highlights.map((t) => h('li', { text: t })))) : null,
      EARN(r.earned).length ? sect('들어온 돈', h('ul', { className: 'pp-list pp-money' }, EARN(r.earned).map(([k, v]) => h('li', {}, h('span', { text: k }), h('b', { className: `num ${v >= 0 ? 'pp-plus' : 'pp-minus'}`, text: signed(v) }))))) : null,
      taxLine.length ? sect('나간 돈', h('ul', { className: 'pp-list pp-money' }, taxLine.map(([k, v]) => h('li', {}, h('span', { text: k }), h('b', { className: 'num', text: won(v) }))))) : null,
      r.best ? sect('들고 있는 것', h('p', {}, `가장 좋은 것: ${r.best.name} ${pct(r.best.ret)}`), r.worst ? h('p', {}, `가장 나쁜 것: ${r.worst.name} ${pct(r.worst.ret)}`) : null) : null,
      r.memories.length ? sect('기억과 맞춰 보기', h('ul', { className: 'pp-list' }, r.memories.map((m) => h('li', {}, m.text, h('span', { className: 'small sub', text: ` → ${m.result}` }))))) : null),
    h('div', { className: 'bar' }, h('div', {}, h('button', { className: 'btn main', text: params.pick ? '닫기' : '새해로', on: { click: () => (params.pick ? ctx.back() : advance(ctx)) } }))));
}
export const screens = { paper, yearend };
