// 세금 고지서: 직접 낼지 세무사에게 맡길지 고른다.
import { h, won } from '../ui.js';
import { billOf, quote, settle, PENALTY } from '../tax.js';
import { advance } from './common.js';

const row = (t, v, c = '') => h('div', { className: `row between ${c}` }, h('span', { text: t }), h('b', { className: 'num', text: v }));
const range = (a, b) => (a === b ? won(a) : `${won(a)} ~ ${won(b)}`);
function result(ctx, r) {
  return h('div', { className: 'tx stack' }, h('div', { className: 'panel stack' },
    h('h1', { text: r.mode === 'agent' ? '세무사가 처리했습니다' : '세금을 냈습니다' }),
    row('고지 금액', won(r.total)),
    r.mode === 'agent' ? row('줄어든 세금', `-${won(r.saved)}`) : null,
    r.mode === 'agent' ? row('세무사 수수료', won(r.fee)) : null,
    row('실제로 나간 돈', won(r.paid)),
    r.mode === 'agent' ? h('p', { className: 'sub', text: r.net >= 0 ? `수수료를 빼고 ${won(r.net)} 아꼈습니다.` : `이번에는 수수료가 ${won(-r.net)} 더 들었습니다.` }) : null,
    r.unpaid ? h('p', { className: 'tx-warn', text: `${won(r.unpaid)}을 내지 못해 체납되었습니다. 매달 가산세가 붙고, 돈이 들어오면 먼저 빠져나갑니다.` }) : null,
    h('button', { className: 'btn main', text: '확인', on: { click: () => advance(ctx) } })));
}
export function render(ctx) {
  const s = ctx.s, bill = billOf(s);
  if (!bill) { setTimeout(() => advance(ctx)); return h('div'); }
  const q = quote(s, bill), box = h('div', { className: 'tx stack' });
  const pay = (mode) => { const r = settle(s, mode); ctx.save(); box.replaceWith(result(ctx, r)); };
  const worth = q.saveHi > q.fee;
  box.append(
    h('div', { className: 'panel stack' },
      h('p', { className: 'small sub', text: bill.month === 5 ? `${bill.taxYear}년 거래분` : `${bill.taxYear}년 6월 1일 보유분` }),
      h('h1', { text: bill.title }),
      h('p', { className: 'tx-total num', text: won(bill.total) }),
      h('div', { className: 'stack tx-items' }, bill.items.map((x) => row(x.label, won(x.amount)))),
      row('현금과 예금', won(q.liquid)),
      q.short ? h('p', { className: 'tx-warn', text: `${won(q.short)} 모자랍니다. 그대로 내면 모자란 만큼 체납되어 매달 ${(PENALTY * 100).toFixed(2)}%씩 가산세가 붙습니다.` }) : null),
    h('button', { className: 'tx-opt', on: { click: () => pay('direct') } },
      h('b', { text: '직접 신고하고 낸다' }), h('span', { className: 'num', text: `나가는 돈 ${won(q.direct)}` })),
    h('button', { className: 'tx-opt', on: { click: () => pay('agent') } },
      h('b', { text: '세무사에게 맡긴다' }),
      h('span', { className: 'num', text: `수수료 ${won(q.fee)} · 줄어드는 세금 ${range(q.saveLo, q.saveHi)}` }),
      h('span', { className: 'num', text: `나가는 돈 ${range(q.costLo, q.costHi)}` }),
      h('small', { text: `${[...new Set(bill.items.map((x) => x.why))].join(', ')}. 법이 허용한 공제와 감면만 찾습니다.${worth ? '' : ' 이번 금액은 수수료가 더 큽니다.'}` })),
    q.short ? h('button', { className: 'btn', text: '먼저 돈을 마련한다', on: { click: () => ctx.go('invest') } }) : null);
  return box;
}
