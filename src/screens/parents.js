// 아버지와 이사 갈 서울 집을 고른다.
import { h, won } from '../ui.js';
import { seoulHomes, canChoose, buyForParents, giftDeduct } from '../parents.js';

const row = (t, v) => h('div', { className: 'row between' }, h('span', { text: t }), h('b', { className: 'num', text: won(v) }));
export function render(ctx) {
  const s = ctx.s;
  if (!canChoose(s)) { setTimeout(() => ctx.go('home', {}, { replace: true })); return h('div'); }
  const list = seoulHomes(s), done = () => { ctx.stack.length = 0; ctx.go('home', {}, { replace: true }); };
  const confirm = (x) => ctx.sheet((close) => h('div', { className: 'stack' },
    h('h2', { text: x.name }), h('p', { className: 'sub', text: `${x.region} · ${x.size}. 집은 부모님 명의가 되고 내 자산에는 잡히지 않습니다.` }),
    h('div', { className: 'stack' }, row('매매가', x.price), row('취득세', x.acq), row('증여세', x.gift), row('내 돈에서 나가는 돈', x.total), row('낸 뒤 현금', s.cash - x.total)),
    h('button', { className: 'btn main', text: '이 집으로 이사한다', on: { click: () => { const r = buyForParents(s, x.id); close(); if (!r.ok) return ctx.toast(r.why); ctx.save(); ctx.toast(`${x.name}로 이사했습니다.`); done(); } } }),
    h('button', { className: 'btn', text: '다시 고른다', on: { click: close } })));
  return h('div', { className: 'mv stack' },
    h('div', { className: 'panel stack' }, h('h1', { text: '이사 갈 집' }),
      h('p', { className: 'sub', text: `아버지가 서울 아파트 매물을 모아 왔습니다. 번 돈으로 사서 부모님께 드리면 증여세가 함께 나옵니다(공제 ${won(giftDeduct(s.year * 100 + s.month))}).` }),
      row('지금 현금', s.cash),
      h('button', { className: 'btn', text: '주식을 팔아 현금을 마련한다', on: { click: () => ctx.go('invest') } }),
      h('button', { className: 'btn', text: '나중에 정한다', on: { click: () => { ctx.toast('일상 화면의 이사 갈 집 고르기에서 다시 고를 수 있습니다.'); done(); } } })),
    list.map((x) => h('button', { className: 'mv-item', disabled: !x.can, on: { click: () => confirm(x) } },
      h('b', { text: x.name }), h('small', { text: `${x.region} · ${x.size}` }),
      h('span', { className: 'num', text: `매매가 ${won(x.price)}` }),
      h('span', { className: 'num', text: `세금 포함 ${won(x.total)}${x.can ? '' : ' · 현금 부족'}` }))));
}
