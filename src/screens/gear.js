// 자산 › 실물 › 명품: 착용 6칸, 카드, 보관함, 업적, 명품 가게.
import { h, won } from '../ui.js';
import * as gear from '../gear.js';
import { featList } from '../feats.js';

const line = (k, v) => h('div', { className: 'inv-line' }, h('span', { text: k }), h('b', { className: 'num', text: v }));
const TIER_CLS = { 노멀: 't-n', 유니크: 't-u', 전설: 't-l', 레전드: 't-g' };
const tierOfItem = (it) => (it.src === 'card' ? it.tier : '명품');

export function gearBody(ctx, s) {
  gear.gearOf(s);
  const done = (r) => { if (!r.ok) return ctx.toast(r.why); ctx.save(); ctx.toast(r.text); ctx.refresh(); };
  const items = gear.itemsOf(s);

  // 아이템 하나: 입기·벗기·팔기·버리기
  const itemSheet = (it) => ctx.sheet((close) => h('div', { className: 'stack' },
    h('h2', { text: `${gear.SLOT_ICON[it.slot]} ${it.name}` }),
    h('p', { className: `sub gear-tier ${TIER_CLS[it.tier] ?? ''}`, text: it.src === 'card' ? `${gear.TIER_ICON[it.tier]} ${it.tier} 카드 아이템 · ${it.slot}` : `명품 · ${it.slot} · ${it.year}년 ${it.month}월 구입` }),
    line('효과', it.text),
    it.src === 'shop' ? line('지금 팔면', won(it.resale)) : h('p', { className: 'sub small', text: '카드에서 나온 물건은 팔 수 없습니다. 버릴 수는 있습니다.' }),
    it.worn
      ? h('button', { className: 'btn main', text: '벗는다', on: { click: () => { close(); done(gear.takeOff(s, it.slot)); } } })
      : h('button', { className: 'btn main', text: '착용한다', on: { click: () => { close(); done(gear.wear(s, it.uid)); } } }),
    it.src === 'shop' ? h('button', { className: 'btn', text: `판다 · ${won(it.resale)}`, on: { click: () => { close(); done(gear.sellLuxury(s, it.uid)); } } }) : null,
    h('button', { className: 'btn', text: '버린다', on: { click: () => { close(); confirmDiscard(it); } } }),
    h('button', { className: 'btn', text: '닫기', on: { click: close } })));
  const confirmDiscard = (it) => ctx.sheet((close) => h('div', { className: 'stack' }, h('h2', { text: `${it.name}을(를) 버릴까요?` }),
    h('p', { className: 'sub', text: '버리면 되돌릴 수 없고 돈도 받지 못합니다.' }),
    h('button', { className: 'btn main', text: '버린다', on: { click: () => { close(); done(gear.discard(s, it.uid)); } } }),
    h('button', { className: 'btn', text: '그만둔다', on: { click: close } })));
  // 칸을 누르면 그 칸에 입을 수 있는 것
  const slotSheet = (slot) => ctx.sheet((close) => {
    const list = items.filter((x) => x.slot === slot);
    return h('div', { className: 'stack' }, h('h2', { text: `${gear.SLOT_ICON[slot]} ${slot}` }),
      list.length ? list.map((it) => h('button', { className: `inv-dev ${it.worn ? 'gear-on' : ''}`, on: { click: () => { close(); itemSheet(it); } } },
        h('b', { text: `${it.worn ? '✓ ' : ''}${it.name}` }), h('span', { text: `${tierOfItem(it)} · ${it.text}` })))
        : h('p', { className: 'sub', text: '이 칸에 입을 것이 없습니다. 아래 가게에서 사거나 카드를 까 보세요.' }),
      h('button', { className: 'btn', text: '닫기', on: { click: close } }));
  });

  // 1. 착용 효과 요약과 6칸
  const st = ['매력', '인맥', '지능', '체력'].filter((k) => gear.bonusOf(s, k));
  const g = s.gear, sp = [g.talk > 1 ? `대화 호감 ×${g.talk.toFixed(2).replace(/0$/, '')}` : null, g.cap ? `활동 칸 +${g.cap}` : null, g.fatigue < 1 ? `피곤함 ${Math.round((1 - g.fatigue) * 100)}% 덜` : null, g.dateSafe < 1 ? `데이트 실패 ${Math.round((1 - g.dateSafe) * 100)}% 덜` : null].filter(Boolean);
  const summary = h('p', { className: 'sub num', text: st.length || sp.length ? `명품·기기·탈것 효과 · ${[...st.map((k) => `${k} ${Math.floor(gear.baseStat(s, k))}→${Math.floor(s.stats[k])}`), ...sp].join(' · ')}` : '아직 착용한 것이 없습니다. 칸을 눌러 입을 것을 고릅니다.' });
  const slots = h('div', { className: 'gear-grid' }, gear.wornList(s).map(({ slot, item }) => {
    const it = item && items.find((x) => x.uid === item.uid);
    return h('button', { className: `gear-slot ${it ? TIER_CLS[it.tier] ?? 't-shop' : 'empty'}`, 'aria-label': `${slot} 칸`, on: { click: () => slotSheet(slot) } },
      h('span', { className: 'gear-ico', text: gear.SLOT_ICON[slot] }), h('small', { text: slot }), h('b', { text: it ? it.name : '비어 있음' }), it ? h('span', { text: it.text }) : null);
  }));

  // 2. 카드
  const openSheet = (tier) => {
    const r = gear.openCard(s, tier); if (!r.ok) return ctx.toast(r.why);
    ctx.save();
    ctx.sheet((close) => h('div', { className: 'stack gear-reveal' },
      h('div', { className: `gear-card flip ${TIER_CLS[tier]}` }, h('span', { className: 'gear-ico', text: gear.SLOT_ICON[r.item.slot] }), h('b', { text: r.item.name }), h('small', { text: `${tier} · ${r.item.slot}` })),
      line('효과', r.item.text),
      h('p', { className: 'sub small', text: r.worn ? '비어 있던 칸이라 바로 착용했습니다.' : '보관함에 넣었습니다. 칸을 눌러 바꿔 입을 수 있습니다.' }),
      h('button', { className: 'btn main', text: '확인', on: { click: () => { close(); ctx.refresh(); } } })), { onClose: () => ctx.refresh() });
  };
  const cards = h('div', { className: 'gear-cards' }, gear.TIERS.map((tier, i) => {
    const n = s.cards[tier], last = i === gear.TIERS.length - 1;
    return h('div', { className: `gear-card ${TIER_CLS[tier]}` }, h('small', { text: `${gear.TIER_ICON[tier]} ${tier}` }), h('b', { className: 'num', text: `${n}장` }),
      h('button', { className: 'btn small', disabled: !n, text: '까기', on: { click: () => openSheet(tier) } }),
      last ? null : h('button', { className: 'btn small', disabled: n < gear.UPGRADE_N, text: `${gear.UPGRADE_N}장 → ${gear.TIERS[i + 1]}`, on: { click: () => done(gear.upgrade(s, tier)) } }));
  }));
  const ach = gear.achievementList(s), got = ach.filter((a) => a.done).length;
  const achBox = h('details', { className: 'gear-ach' }, h('summary', { text: `업적 ${got}/${ach.length} · 이루면 카드를 더 받습니다` }),
    h('ul', {}, ach.map((a) => h('li', { className: a.done ? 'done' : '', text: `${a.done ? '✓' : '·'} ${a.label} — ${a.tier} ${a.n}장` }))));
  const ft = featList(s), ftGot = ft.filter((a) => a.done).length;
  const featBox = h('details', { className: 'gear-ach' }, h('summary', { text: `평생 업적 ${ftGot}/${ft.length} · 능력치가 200 위로 오릅니다` }),
    h('p', { className: 'small sub', text: '공부·운동 같은 활동은 200까지만 올립니다. 그 위는 착용 효과와 평생 업적으로만 오르고, 최대 300입니다.' }),
    h('ul', {}, ft.map((a) => h('li', { className: a.done ? 'done' : '', text: `${a.done ? '✓' : '·'} ${a.label} — ${Object.entries(a.add).map(([k, v]) => `${k} +${v}`).join(' · ')}` }))));

  // 3. 보관함
  const bag = items.length ? items.map((it) => h('button', { className: `inv-dev ${it.worn ? 'gear-on' : ''}`, on: { click: () => itemSheet(it) } },
    h('b', { text: `${gear.SLOT_ICON[it.slot]} ${it.worn ? '✓ ' : ''}${it.name}` }),
    h('span', { className: 'num', text: `${tierOfItem(it)} · ${it.text}${it.src === 'shop' ? ` · 팔면 ${won(it.resale)}` : ''}` }))) : [h('p', { className: 'sub', text: '가진 것이 없습니다.' })];

  // 4. 명품 가게
  const buy = (x) => ctx.sheet((close) => h('div', { className: 'stack' }, h('h2', { text: `${gear.SLOT_ICON[x.slot]} ${x.name}` }),
    h('p', { className: 'sub', text: `${x.year}년에 나온 제품입니다. 입으면 ${x.stat} +${x.bonus}.` }),
    line('가격', won(x.price)), line('산 뒤 현금', won(s.cash - x.price)),
    h('button', { className: 'btn main', text: '산다', on: { click: () => { close(); done(gear.buyLuxury(s, x.slot, x.name)); } } }),
    h('button', { className: 'btn', text: '그만둔다', on: { click: close } })));
  const shop = gear.shopOpen(s)
    ? gear.SLOTS.map((slot) => h('section', { className: 'stack' }, h('h3', { text: `${gear.SLOT_ICON[slot]} ${slot}` }),
      gear.shopList(s, slot).map((x) => h('button', { className: 'inv-dev', disabled: !x.ok, on: { click: () => buy(x) } },
        h('b', { text: x.name }), h('span', { className: 'num', text: `${x.year}년 · ${won(x.price)} · ${x.stat} +${x.bonus}${x.ok ? '' : ` · ${x.why}`}` })))))
    : [h('p', { className: 'sub', text: '부모님이 내 돈을 알고 이사까지 마치면 명품 가게가 열립니다.' })];

  return h('div', { className: 'stack' },
    h('section', { className: 'stack' }, h('h3', { text: '착용' }), summary, slots),
    h('section', { className: 'stack' }, h('h3', { text: '카드' }),
      h('p', { className: 'sub small', text: `매달 노멀 카드 ${gear.monthlyCards(s)}장 (매력 3구간, 인맥 4구간과 6구간이면 1장씩 더). 같은 등급 ${gear.UPGRADE_N}장은 다음 등급 1장으로 바꿉니다. 까면 그 등급의 물건이 나옵니다.` }),
      cards, achBox, featBox),
    h('section', { className: 'stack' }, h('h3', { text: `보관함 ${items.length}개` }), bag),
    h('section', { className: 'stack' }, h('h3', { text: '명품 가게' }), h('p', { className: 'sub small', text: '가게 명품은 매력·인맥만 올리고, 같은 능력치끼리 합쳐 +30까지입니다. 산 것은 가게에서 빠지고 중고로 팔 수 있습니다.' }), shop));
}
