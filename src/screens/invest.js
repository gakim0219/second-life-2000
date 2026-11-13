// 투자 창: invest(요약·분류·목록), asset(상세·차트·주문), account(계좌 준비·올해 대회).
// 규칙은 invest.js, review.js, contest.js가 맡는다. 여기서는 부르고 보여 주기만 한다.
import { h, won } from '../ui.js';
import * as inv from '../invest.js';
import * as review from '../review.js';
import * as dc from '../disclose.js';
import { gearBody } from './gear.js';
import { devicesOpen, deviceList, buyDevice, hasLaptop, ownedDevices, sellDevice, licenseInfo, takeLicense, KINDS, KIND_LABEL, KIND_ICON as DEV_ICON, UPKEEP_NOTE, deviceUpkeep, effectOf, effectText, ownBonus } from '../devices.js';
import * as contest from '../contest.js';
import { recordTrade, setRecord } from '../ending.js';

const PAGE = 40;
const HOUSE = ['부동산', '해외부동산'];
const CHIPS = { 국내주식: ['전체', '코스피', '코스닥'], 해외주식: ['전체', '미국', '유럽', '일본', '기타'] };
const SHORT = { 국내주식: '국내', 해외주식: '해외', 해외부동산: '랜드마크' };
const REGION = { USD: '미국', JPY: '일본', EUR: '유럽', GBp: '유럽', CHF: '유럽', DKK: '유럽' };
const LABEL = Object.fromEntries(inv.CATEGORIES.map((c) => [c.id, c.label]));
// 탭과 검색어는 화면을 다시 그려도 남긴다.
const ui = { group: '금융', tab: '내자산', q: '', sort: '기본', chip: {}, shown: {}, scroll: null, range: {} };

// ---------- 표기 ----------
const ymOf = (s) => s.year * 100 + s.month;
const dateOf = (s) => `${s.year}년 ${s.month}월`;
const num = (n, d = 2) => Number(n).toLocaleString('ko-KR', { maximumFractionDigits: d });
const pw = (n) => (n == null ? '—' : n >= 100 ? `${inv.fmtWon(n)}원` : `${num(n)}원`);
const pct = (x) => (x == null ? '' : `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`);
const signWon = (n) => `${n >= 0 ? '+' : '−'}${won(Math.abs(n))}`;
const tone = (x) => (x == null || x === 0 ? '' : x > 0 ? 'up' : 'down');
const ymText = (t) => { const [y, m] = String(t).split('-'); return `${y}.${m}`; };
const parseWon = (t) => Number(String(t).replace(/[^\d]/g, '')) || 0;
const nameOf = (r) => r.name;
const marketOf = (m) => String(m ?? '');
const priceText = (r) => (r.cat === '선물' ? `지수 ${num(r.price)}` : r.cat === '토지' ? `${pw(r.price)}/㎡` : HOUSE.includes(r.cat) ? won(r.price ?? 0) : pw(r.price));
const unitOf = (cat) => (cat === '코인' ? '개' : cat === '토지' ? '㎡' : cat === '외화' ? '' : HOUSE.includes(cat) ? '채' : cat === '선물' ? '계약' : '주');
const qtyText = (q, cat) => `${num(q, 4)}${unitOf(cat)}`;
const watchOf = (s) => (s.watchlist ??= []);
const ready = (ctx) => { inv.init(ctx.s); contest.init(ctx.s); watchOf(ctx.s); return ctx.s; };

function rentNow(a, year) {
  const ys = Object.keys(a?.rent ?? {}).map(Number).filter((y) => y <= year).sort((x, y) => x - y);
  return ys.length ? Math.round(a.rent[ys.at(-1)]) * 10000 : 0; // 규칙 쪽 rentOf와 같이 만 원에서 끊는다.
}

// ---------- 공통 조각 ----------
const head = (ctx, title, sub) => h('header', { className: 'inv-head' },
  h('button', { className: 'inv-back', 'aria-label': '뒤로', on: { click: () => ctx.back() } }, '←'),
  h('h1', { text: title }),
  sub ? h('span', { className: 'chip num', text: sub }) : null);
const lockLine = (why) => h('p', { className: 'inv-lock' }, why);
function actBtn(label, can, cls, onClick) {
  return h('button', { className: `btn ${can.ok ? cls : ''}`, disabled: !can.ok, on: { click: onClick } }, label, can.ok ? null : h('span', { className: 'chip lock', text: can.why }));
}
const line = (k, v, cls = '') => h('div', { className: `inv-line ${cls}` }, h('span', { text: k }), h('b', { className: 'num', text: v }));
async function safeGo(ctx, name, params) {
  const cur = ctx.cur, depth = ctx.stack.length;
  try { await ctx.go(name, params); } catch { ctx.cur = cur; ctx.stack.length = depth; await ctx.draw(); ctx.toast('아직 열 수 없는 화면입니다.'); }
}
function moneyInput(onChange, placeholder = '금액(원)') {
  const el = h('input', { type: 'text', inputMode: 'numeric', autocomplete: 'off', placeholder, 'aria-label': placeholder, className: 'num inv-money', on: { input: () => { const v = parseWon(el.value); el.value = v ? v.toLocaleString('ko-KR') : ''; onChange(v); } } });
  return { el, get: () => parseWon(el.value), set: (v) => { el.value = v ? Math.round(v).toLocaleString('ko-KR') : ''; onChange(v); } };
}
const sheetHead = (title, close, sub) => h('div', { className: 'row between inv-sheet-head' },
  h('div', {}, h('h2', { text: title }), sub ? h('p', { className: 'sub', text: sub }) : null),
  h('button', { className: 'inv-x', 'aria-label': '닫기', on: { click: close } }, '✕'));
const done = (ctx, close, text) => { if (text) ctx.toast(text); close?.(); return ctx.refresh(); };
// 금액 하나만 받는 시트: 상환, 추가 대출.
function amountSheet(ctx, { title, note, max, maxLabel = '최대', label, run }) {
  ctx.sheet((close) => {
    const go = h('button', { className: 'btn main', text: label, disabled: true, on: { click: () => { const r = run(input.get()); if (!r.ok) ctx.toast(r.why); else done(ctx, close, r.text); } } });
    const input = moneyInput((v) => { go.disabled = !(v > 0); });
    return h('div', { className: 'stack' }, sheetHead(title, close, note), input.el,
      h('button', { className: 'btn', disabled: !(max > 0), on: { click: () => input.set(max) } }, `${maxLabel} ${max > 0 ? won(max) : ''}`), go);
  });
}

// ---------- invest 메인 ----------
function summary(ctx, s) {
  const p = inv.portfolio(s), change = p.change;
  return h('section', { className: 'panel inv-sum', 'aria-label': '총자산 요약' },
    h('div', { className: 'row between' }, h('span', { className: 'sub', text: '순자산' }), change == null ? null : h('span', { className: `num small inv-${tone(change)}`, text: `지난달보다 ${signWon(change)}` })),
    h('div', { className: 'inv-total num', text: won(p.netWorth) }),
    h('div', { className: 'grid3 inv-sum-grid' },
      h('div', {}, h('span', { className: 'sub', text: '현금' }), h('b', { className: 'num', text: won(p.cash) })),
      h('div', {}, h('span', { className: 'sub', text: '자산' }), h('b', { className: 'num', text: won(p.assets) })),
      h('div', {}, h('span', { className: 'sub', text: '부채' }), h('b', { className: 'num', text: won(p.debt) }))),
    inv.pendingYearTax(s).total > 0 ? h('p', { className: 'sub num inv-flow', text: `내년 5월 청구될 세금 ${won(inv.pendingYearTax(s).total)}` }) : null,
    p.taxDue > 0 ? h('p', { className: 'inv-warn-text', text: `밀린 세금 ${won(p.taxDue)} · 매달 가산세가 붙습니다` }) : null,
    p.monthlyRent || p.monthlyInterest ? h('p', { className: 'sub num inv-flow', text: `매달 월세 ${won(p.monthlyRent)} · 대출 이자 ${won(p.monthlyInterest)}` }) : null,
    p.warnings.length ? h('div', { className: 'row wrap inv-warns' }, p.warnings.map((w) => h('span', { className: 'chip inv-warn', text: `⚠ ${w}` }))) : null);
}
function accountBanner(ctx, s) {
  const a = contest.accountSteps(s);
  if (a.hasAccount) return null;
  const cur = a.steps.find((x) => !x.done);
  return h('section', { className: 'inv-road', 'aria-label': '계좌 준비' },
    h('h2', { text: '내 계좌를 여는 길' }),
    h('ol', { className: 'inv-road-steps' }, a.steps.map((x) => h('li', { className: x.done ? 'done' : x === cur ? 'now' : '' }, x.done ? `✓ ${x.label}` : x.label))),
    h('p', { text: a.text }),
    h('button', { className: 'btn sun', on: { click: () => ctx.go('account') } }, '계좌 준비 보기'));
}
// 시기별 핸드폰·노트북·차량. 산 것은 가게에서 빠지고 위 목록에서 중고로 판다. 자산에 잡히지 않는 소비다.
function deviceBody(ctx, s) {
  const done = (r) => { if (!r.ok) return ctx.toast(r.why); ctx.save(); ctx.toast(r.text); ctx.refresh(); };
  const buy = (x) => ctx.sheet((close) => h('div', { className: 'stack' }, h('h2', { text: `${DEV_ICON[x.kind]} ${x.name}` }),
    h('p', { className: 'sub', text: x.kind === '노트북' && !hasLaptop(s) ? '노트북이 있으면 공부에서 코딩 공부를 할 수 있습니다.' : `${x.year}년 ${x.month}월에 나온 제품입니다.` }),
    line('가격', won(x.price)), line('산 뒤 현금', won(s.cash - x.price)), line('가지면', effectText(effectOf(s, x))),
    x.upkeep ? line('매달 운영비', won(x.upkeep)) : null,
    x.upkeep ? h('p', { className: 'sub small', text: `${UPKEEP_NOTE[x.kind]}가 매달 현금에서 나갑니다. 낼 돈이 없으면 중고값에 팔립니다.` }) : null,
    h('button', { className: 'btn main', text: '산다', on: { click: () => { close(); done(buyDevice(s, x.kind, x.name)); } } }),
    h('button', { className: 'btn', text: '그만둔다', on: { click: close } })));
  const sell = (d) => ctx.sheet((close) => h('div', { className: 'stack' }, h('h2', { text: `${DEV_ICON[d.kind]} ${d.name}` }),
    h('p', { className: 'sub', text: `${d.year}년 ${d.month}월에 샀습니다. 중고로 팔면 아래 값을 받습니다.` }),
    line('산 값', won(d.price)), line('받는 값', won(d.resale)), line('효과', effectText(effectOf(s, d))), d.upkeep ? line('멈추는 운영비', `매달 ${won(d.upkeep)}`) : null,
    h('button', { className: 'btn main', text: '판다', on: { click: () => { close(); done(sellDevice(s, d.i)); } } }),
    h('button', { className: 'btn', text: '그만둔다', on: { click: close } })));
  const mine = ownedDevices(s);
  const up = deviceUpkeep(s), ob = ownBonus(s);
  const minePart = mine.length ? h('section', { className: 'stack' }, h('h3', { text: '가지고 있는 것' }),
    Object.keys(ob).length ? h('p', { className: 'sub small num', text: `가진 것 효과 · ${effectText(ob)}` }) : null,
    up ? h('p', { className: `sub small num ${s.cash < up * 12 ? 'inv-warn-text' : ''}`, text: `매달 운영비 ${won(up)}${s.cash < up * 12 ? ' · 현금이 1년치도 안 됩니다' : ''}` }) : null,
    mine.map((d) => h('button', { className: 'inv-dev', on: { click: () => sell(d) } },
    h('b', { text: `${DEV_ICON[d.kind]} ${d.name}` }), h('span', { className: 'num', text: `${effectText(effectOf(s, d))} · ${d.year}년 ${d.month}월 구입 · 지금 팔면 ${won(d.resale)}${d.upkeep ? ` · 매달 ${won(d.upkeep)}` : ''}` })))) : null;
  const shop = (kind) => deviceList(s, kind).map((x) => h('button', { className: 'inv-dev', disabled: !x.ok, on: { click: () => buy(x) } },
    h('b', { text: `${DEV_ICON[kind]} ${x.name}` }), h('span', { className: 'num', text: `${x.year}.${x.month} · ${won(x.price)} · ${effectText(effectOf(s, x))}${x.upkeep ? ` · 매달 ${won(x.upkeep)}` : ''}${x.ok ? '' : ` · ${x.why}`}` })));
  const L = licenseInfo(s);
  const test = () => ctx.sheet((close) => h('div', { className: 'stack' }, h('h2', { text: '🪪 운전면허 시험' }),
    h('p', { className: 'sub', text: L.note }),
    line(L.tries ? '재응시료' : '학원비·응시료', won(L.fee)), line('붙을 가능성', `약 ${Math.round(L.pass * 100)}%`), line('쓰는 칸', '1칸'),
    h('button', { className: 'btn main', text: '시험을 본다', on: { click: () => { close(); const r = takeLicense(s); if (r.ok) { ctx.save(); ctx.toast(r.text); ctx.refresh(); } else ctx.toast(r.why); } } }),
    h('button', { className: 'btn', text: '그만둔다', on: { click: close } })));
  const licensePart = L.has
    ? h('p', { className: 'sub small', text: `🪪 운전면허 있음 · ${Math.floor(s.license.ym / 12)}년 취득` })
    : h('button', { className: 'inv-dev', disabled: !L.ok, on: { click: test } }, h('b', { text: '🪪 운전면허 시험' }),
      h('span', { className: 'num', text: L.ok ? `${won(L.fee)} · 붙을 가능성 약 ${Math.round(L.pass * 100)}%${L.tries ? ` · ${L.tries}번 떨어짐` : ''}` : L.why }));
  return h('div', { className: 'stack' }, minePart,
    KINDS.map((kind) => h('section', { className: 'stack' }, h('h3', { text: KIND_LABEL[kind] }), kind === '차량' ? licensePart : null,
      UPKEEP_NOTE[kind] ? h('p', { className: 'sub small', text: `${UPKEEP_NOTE[kind]}가 매달 나갑니다.` }) : null, shop(kind))),
    h('p', { className: 'sub small', text: '기기는 지능을 올립니다(가장 좋은 핸드폰·노트북 하나씩, 나온 지 5년이 넘으면 1 덜). 탈것은 매력·인맥을 올립니다(가장 좋은 한 대 + 그 밖에 한 대마다 +1, 최대 +4). 값은 출시 때 기본 모델의 대략값입니다. 산 것은 가게에서 빠지고, 위에서 중고로 팔 수 있습니다. 자산에는 잡히지 않습니다.' }));
}
function tabsRow(ctx, s) {
  const cats = Object.fromEntries(inv.categories(s).map((c) => [c.id, c]));
  const pick = (tab) => { ui.tab = tab; ui.q = ''; ctx.refresh(); };
  const b = (tab, label, on, pressed, cls = '') => h('button', { className: cls, 'aria-pressed': String(pressed), on: { click: on } }, label);
  const row = h('div', { className: 'tabs', role: 'group', 'aria-label': '분류' },
    b('내자산', '내 자산', () => pick('내자산'), ui.tab === '내자산' && !ui.q),
    inv.MENU[ui.group].map((id) => b(id, SHORT[id] ?? LABEL[id], () => pick(id), ui.tab === id && !ui.q, cats[id].open ? '' : 'tab-lock')),
    ui.group === '실물' && devicesOpen(s) ? b('전자기기', '기기·차량', () => pick('전자기기'), ui.tab === '전자기기' && !ui.q) : null,
    ui.group === '실물' ? b('명품', '명품·카드', () => pick('명품'), ui.tab === '명품' && !ui.q) : null,
    b('결산', '결산', () => openReview(ctx), false),
    b('계좌', '계좌 준비', () => ctx.go('account'), false));
  requestAnimationFrame(() => { const on = row.querySelector('[aria-pressed=true]'); if (on) row.scrollLeft = on.offsetLeft - row.offsetLeft - 40; });
  return row;
}
function openReview(ctx) {
  const ys = review.reportYears(ctx.s);
  if (!ys.length) return ctx.toast('아직 지난 연말 결산이 없습니다.');
  return safeGo(ctx, 'yearend', { year: ys.at(-1), pick: true });
}
function rowEl(ctx, s, r, { showWhy }) {
  const watched = watchOf(s).includes(r.id), a = inv.assetOf(r.id);
  let sub;
  if (r.held > 0) sub = h('span', { className: 'inv-row-sub num' }, `보유 ${qtyText(r.held, r.cat)}`, r.ret == null ? null : h('b', { className: tone(r.ret), text: ` ${pct(r.ret)}` }));
  else if (r.locked) sub = h('span', { className: 'inv-row-sub inv-why', text: showWhy ? r.why : '잠김' });
  else if (r.cat === '부동산') sub = h('span', { className: 'inv-row-sub', text: `${a.region} · 월세 ${won(rentNow(a, s.year))}${inv.isRegulated(a.region, ymOf(s)) ? ' · 규제지역' : ''}` });
  else if (r.cat === '해외부동산') sub = h('span', { className: 'inv-row-sub', text: `${r.sector} · 월세 ${won(rentNow(a, s.year))}` });
  else sub = h('span', { className: 'inv-row-sub', text: r.cat === '토지' ? r.sector : r.cat === '외화' ? '은행 환전' : r.ticker || r.sector });
  const star = h('button', { className: `inv-star ${watched ? 'on' : ''}`, 'aria-pressed': String(watched), 'aria-label': `${r.name} 관심 종목`, text: watched ? '★' : '☆', on: { click: () => {
    const w = watchOf(s), i = w.indexOf(r.id); if (i >= 0) w.splice(i, 1); else w.push(r.id);
    const now = i < 0; star.textContent = now ? '★' : '☆'; star.classList.toggle('on', now); star.setAttribute('aria-pressed', String(now)); ctx.save();
  } } });
  return h('div', { className: `inv-row ${r.locked ? 'locked' : ''}` },
    h('button', { className: 'inv-row-main', on: { click: () => { ui.scroll = window.scrollY; ctx.go('asset', { id: r.id }); } } },
      h('span', { className: 'inv-row-l' }, h('span', { className: 'inv-row-name' }, r.star ? h('span', { className: 'inv-memstar', title: '기억에 남은 종목', text: '☆ ' }) : null, nameOf(r)), sub),
      h('span', { className: 'inv-row-r num' }, h('span', { text: priceText(r) }), h('span', { className: `small ${tone(r.change)}`, text: r.change == null ? r.status === '정상' ? '' : inv.statusLabel(r.status, inv.assetOf(r.id)?.cat) : pct(r.change) }))),
    star);
}
// 목록을 자르지 않는다. 처음엔 한 묶음만 그리고, 끝에 닿으면 다음 묶음을 잇는다.
function pager(rows, key, make) {
  const list = h('div', { className: 'inv-list' });
  let n = 0;
  const more = h('button', { className: 'btn inv-more', on: { click: () => add() } });
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) add(); }, { rootMargin: '300px' }) : null;
  function add(count = PAGE) {
    const to = Math.min(rows.length, n + count);
    for (; n < to; n++) list.insertBefore(make(rows[n]), more);
    ui.shown[key] = n;
    if (n >= rows.length) { more.remove(); io?.disconnect(); return; }
    more.textContent = `더 보기 (남은 ${rows.length - n}개)`;
    if (io) { io.unobserve(more); io.observe(more); }
  }
  list.append(more); add(Math.max(PAGE, ui.shown[key] ?? 0));
  return list;
}
function listBody(ctx, s, cat, q) {
  const box = h('div', { className: 'stack' });
  let rows = review.searchAssets(s, q, { cat: cat ?? undefined, sort: ui.sort });
  const chips = cat ? CHIPS[cat] : null, chip = chips ? ui.chip[cat] ?? '전체' : '전체';
  if (chip !== '전체') rows = rows.filter((r) => {
    if (cat === '국내주식') return String(r.market).startsWith(chip === '코스피' ? 'KOSPI' : 'KOSDAQ');
    return (REGION[r.ccy] ?? '기타') === chip;
  });
  const w = watchOf(s);
  if (w.length && !q) rows = [...rows.filter((r) => w.includes(r.id)), ...rows.filter((r) => !w.includes(r.id))];
  const g = cat ? inv.access(s, cat) : { ok: true };
  if (!g.ok) box.append(h('div', { className: 'card inv-catlock' }, lockLine(g.why), g.need?.step ? h('button', { className: 'btn', on: { click: () => ctx.go('account') } }, '계좌 준비 보기') : null));
  if (chips) box.append(h('div', { className: 'tabs inv-chips', role: 'group', 'aria-label': '시장' }, chips.map((c) => h('button', { 'aria-pressed': String(c === chip), on: { click: () => { ui.chip[cat] = c; ctx.refresh(); } } }, c))));
  box.append(h('div', { className: 'tabs inv-chips', role: 'group', 'aria-label': '정렬' }, review.SORTS.map((o) => h('button', { 'aria-pressed': String(o === ui.sort), on: { click: () => { ui.sort = o; ctx.refresh(); } } }, o))));
  box.append(h('p', { className: 'sub num', role: 'status', text: q ? `‘${q}’ 검색 결과 ${rows.length}개` : `전체 ${rows.length}개` }));
  if (cat === '선물') box.append(h('p', { className: 'sub', text: '선물은 지수가 조금만 움직여도 증거금이 크게 변합니다. 눌러서 위험 안내를 먼저 읽으세요.' }));
  box.append(rows.length ? pager(rows, `${cat ?? 'q'}|${chip}|${ui.sort}|${q}`, (r) => rowEl(ctx, s, r, { showWhy: !cat || r.why !== g.why })) : h('p', { className: 'sub', text: '찾는 종목이 없습니다.' }));
  return box;
}
function mixBar(p) {
  const P = p.parts, groups = [['현금', Math.max(0, p.cash), 'sun'], ['예금·적금', P.예금 + P.적금, 'leaf'], ['주식', P.국내주식 + P.해외주식, 'coral'], ['ETF·채권', P.ETF + P.채권, 'sky'], ['코인·외화·선물', P.코인 + P.외화 + P.선물, 'rose'], ['부동산·토지', P.부동산 + P.해외부동산 + P.토지, 'stone']].filter((g) => g[1] > 0);
  const total = groups.reduce((t, g) => t + g[1], 0); if (!total) return null;
  return h('div', { className: 'card stack' }, h('h3', { text: '자산 구성' }),
    h('div', { className: 'inv-mix', role: 'img', 'aria-label': groups.map((g) => `${g[0]} ${Math.round(g[1] / total * 100)}%`).join(', ') }, groups.map((g) => h('i', { className: `m-${g[2]}`, style: `flex:${g[1] / total} 1 0` }))),
    h('div', { className: 'inv-legend' }, groups.map((g) => h('div', { className: 'row between' }, h('span', {}, h('i', { className: `inv-dot m-${g[2]}` }), g[0]), h('span', { className: 'num', text: `${won(g[1])} · ${Math.round(g[1] / total * 100)}%` })))));
}
function marketStrip(s) {
  const x = inv.indices(s), v = (t, val, u = '') => (val == null ? null : h('div', {}, h('span', { className: 'sub small', text: t }), h('b', { className: 'num', text: `${num(val)}${u}` })));
  return h('div', { className: 'inv-strip', 'aria-label': '시장 지표' }, v('코스피', x.코스피), v('코스닥', x.코스닥), v('나스닥', x.나스닥), v('원/달러', x.원달러), v('기준금리', x.기준금리, '%'));
}
function mineBody(ctx, s) {
  const p = inv.portfolio(s), box = h('div', { className: 'stack' }), P = inv.init(s);
  box.append(marketStrip(s));
  const bar = mixBar(p); if (bar) box.append(bar);
  const hold = p.holdings.map((x) => ({ ...x, ...inv.quote(s, x.id), held: x.qty, ret: x.ret, locked: false }));
  box.append(h('h3', { text: `가진 것 ${hold.length + (P.deposit > 0 ? 1 : 0) + P.savings.length + (P.fut ? 1 : 0)}` }));
  if (P.deposit > 0) box.append(h('button', { className: 'inv-mine', on: { click: () => { ui.tab = '예금'; ctx.refresh(); } } }, h('span', { text: '예금' }), h('b', { className: 'num', text: won(P.deposit) })));
  for (const c of inv.savingsInfo(s)) box.append(h('button', { className: 'inv-mine', on: { click: () => { ui.tab = '적금'; ctx.refresh(); } } }, h('span', { text: `적금 · 월 ${won(c.monthly)}` }), h('b', { className: 'num', text: won(c.paid) })));
  if (P.fut) box.append(h('button', { className: 'inv-mine', on: { click: () => ctx.go('asset', { id: 'fut:kospi200' }) } }, h('span', { text: `코스피200 선물 ${P.fut.side > 0 ? '매수' : '매도'} ${P.fut.n}계약` }), h('b', { className: 'num', text: won(P.fut.account) })));
  if (hold.length) box.append(h('div', { className: 'inv-list' }, hold.map((r) => rowEl(ctx, s, r, { showWhy: true }))));
  else if (!P.deposit && !P.savings.length && !P.fut) box.append(h('p', { className: 'sub', text: '아직 가진 것이 없습니다. 예금은 지금도 넣을 수 있습니다.' }));
  const w = watchOf(s);
  if (w.length) {
    const rows = review.searchAssets(s, '').filter((r) => w.includes(r.id));
    box.append(h('h3', { text: `★ 관심 종목 ${rows.length}` }), h('div', { className: 'inv-list' }, rows.map((r) => rowEl(ctx, s, r, { showWhy: true }))));
  }
  box.append(h('button', { className: 'btn', on: { click: () => openReview(ctx) } }, '연말 결산 보기'));
  return box;
}
function depositBody(ctx, s) {
  const P = inv.init(s), rate = inv.rateNow(s, 'kr_deposit_bank_1to2y');
  const input = moneyInput(() => {});
  const run = (r, text) => { if (!r.ok) return ctx.toast(r.why); return done(ctx, null, text); };
  return h('div', { className: 'stack' },
    h('div', { className: 'panel stack' },
      h('div', { className: 'row between' }, h('h2', { text: '정기예금' }), rate == null ? null : h('span', { className: 'num sub', text: `이번 달 연 ${num(rate)}%` })),
      h('div', { className: 'inv-total num', text: won(P.deposit) }),
      h('p', { className: 'sub', text: '매달 세금을 뺀 이자가 붙습니다. 언제든 찾을 수 있습니다.' })),
    input.el,
    h('div', { className: 'grid2' },
      h('button', { className: 'btn', on: { click: () => input.set(Math.max(0, s.cash)) } }, `현금 전부 ${won(Math.max(0, s.cash))}`),
      h('button', { className: 'btn', disabled: !(P.deposit > 0), on: { click: () => input.set(P.deposit) } }, `예금 전부 ${won(P.deposit)}`)),
    h('div', { className: 'grid2' },
      h('button', { className: 'btn main', on: { click: () => run(inv.depositMoney(s, input.get()), '예금에 넣었습니다.') } }, '넣기'),
      h('button', { className: 'btn sky', on: { click: () => run(inv.withdrawDeposit(s, input.get()), '예금에서 찾았습니다.') } }, '찾기')));
}
function savingsBody(ctx, s) {
  const rate = inv.rateNow(s, 'kr_installment_bank'), input = moneyInput(() => {}, '매달 낼 금액(원)');
  const list = inv.savingsInfo(s);
  return h('div', { className: 'stack' },
    h('div', { className: 'panel stack' },
      h('div', { className: 'row between' }, h('h2', { text: '정기적금 가입' }), rate == null ? null : h('span', { className: 'num sub', text: `이번 달 연 ${num(rate)}%` })),
      h('p', { className: 'sub', text: `${inv.RULES.SAVING_TERM}개월 동안 매달 냅니다. 돈이 모자란 달에는 저절로 해지됩니다.` })),
    input.el,
    h('button', { className: 'btn main', on: { click: () => { const r = inv.openSavings(s, input.get()); if (!r.ok) ctx.toast(r.why); else done(ctx, null, '적금에 가입했습니다. 첫 달 치를 냈습니다.'); } } }, '가입하기'),
    list.length ? h('h3', { text: `내 적금 ${list.length}` }) : null,
    list.map((c) => h('div', { className: 'card stack' },
      line('매달', won(c.monthly)), line('넣은 돈', `${won(c.paid)} (${c.n}회)`), line('금리', `연 ${num(c.rate)}%`), line('만기', c.maturity ? ymText(c.maturity) : '—'), line('만기까지 받을 이자', won(c.interest)),
      h('button', { className: 'btn', on: { click: () => confirmSheet(ctx, '적금 해지', `지금 해지하면 ${won(c.earlyBack)}을 돌려받습니다. 이자는 많이 줄어듭니다.`, '해지하기', () => { const r = inv.cancelSavings(s, c.index); return r.ok ? { ok: true, text: `${won(r.back)}을 돌려받았습니다.` } : r; }) } }, `해지 · 받을 돈 ${won(c.earlyBack)}`))));
}
function confirmSheet(ctx, title, text, label, run) {
  ctx.sheet((close) => h('div', { className: 'stack' }, sheetHead(title, close), h('p', { text }),
    h('button', { className: 'btn main', text: label, on: { click: () => { const r = run(); if (!r.ok) ctx.toast(r.why); else done(ctx, close, r.text); } } })));
}
function renderInvest(ctx, params) {
  const s = ready(ctx);
  // 다른 화면에서 분류를 정해 들어올 때(집 사기 등). 다시 그릴 때는 고른 탭을 유지한다.
  if (params?.tab && !params.opened) {
    params.opened = true; ui.q = ''; ui.tab = params.tab;
    ui.group = inv.MENU.실물.includes(params.tab) ? '실물' : '금융';
  }
  const body = h('div', { className: 'inv-body' });
  const paint = () => {
    if (ui.q) return body.replaceChildren(listBody(ctx, s, null, ui.q));
    if (ui.tab === '내자산') return body.replaceChildren(mineBody(ctx, s));
    if (ui.tab === '전자기기') return body.replaceChildren(deviceBody(ctx, s));
    if (ui.tab === '명품') return body.replaceChildren(gearBody(ctx, s));
    if (ui.tab === '예금') return body.replaceChildren(depositBody(ctx, s));
    if (ui.tab === '적금') return body.replaceChildren(savingsBody(ctx, s));
    return body.replaceChildren(listBody(ctx, s, ui.tab, ''));
  };
  let timer = 0;
  const search = h('input', { type: 'search', className: 'inv-search', value: ui.q, placeholder: '종목 이름·옛 이름·티커 검색', 'aria-label': '종목 검색', on: { input: () => { clearTimeout(timer); timer = setTimeout(() => { ui.q = search.value.trim(); paint(); }, 160); } } });
  paint();
  if (ui.scroll != null) { const y = ui.scroll; ui.scroll = null; requestAnimationFrame(() => window.scrollTo(0, y)); }
  const setGroup = (g) => { ui.group = g; ui.q = ''; ui.tab = inv.MENU[g].includes(ui.tab) || ui.tab === '내자산' ? ui.tab : inv.MENU[g][0]; if (ui.tab === '내자산') ui.tab = inv.MENU[g][0]; ctx.refresh(); };
  return h('div', { className: 'inv stack' },
    h('div', { className: 'section-heading' }, h('span', { className: 'eyebrow', text: 'A SMALL BEGINNING' }), h('h1', { text: '자산과 투자' }), h('p', { className: 'num', text: `${dateOf(s)} · 실제 월말 시세로 움직입니다.` })),
    summary(ctx, s),
    accountBanner(ctx, s),
    search,
    h('div', { className: 'inv-seg', role: 'group', 'aria-label': '묶음' }, Object.keys(inv.MENU).map((g) => h('button', { 'aria-pressed': String(ui.group === g), text: g, on: { click: () => setGroup(g) } }))),
    tabsRow(ctx, s),
    body,
    h('p', { className: 'sub small inv-disc', text: inv.DISCLAIMER }));
}

// ---------- 차트 ----------
const SVG = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); e.append(...kids); return e; };
// 지나간 달의 값만 받는다. 거래정지로 빈 달은 선을 끊는다.
function chart(points, fmt) {
  const pts = points.map((p, i) => ({ ...p, i })).filter((p) => p.price != null);
  const read = h('p', { className: 'inv-chart-read num', role: 'status' });
  if (pts.length < 2) return h('div', { className: 'inv-chart-empty sub', text: '아직 그릴 값이 모자랍니다.' });
  const W = 340, H = 170, L = 6, R = 6, T = 14, B = 22;
  const vals = pts.map((p) => p.price); let lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo === hi) { lo *= 0.95; hi *= 1.05; }
  const x = (i) => L + (W - L - R) * i / Math.max(1, points.length - 1), y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const last = pts.at(-1), dir = last.price >= pts[0].price ? 'up' : 'down';
  const segs = []; let cur = [];
  for (const p of pts) { if (cur.length && p.i !== cur.at(-1).i + 1) { segs.push(cur); cur = []; } cur.push(p); }
  segs.push(cur);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: `inv-chart ${dir}`, role: 'img', 'aria-label': `${ymText(points[0].ym)}부터 ${ymText(last.ym)}까지 가격 선 그래프. 최저 ${fmt(lo)}, 최고 ${fmt(hi)}, 지금 ${fmt(last.price)}.` });
  for (const v of [hi, (hi + lo) / 2, lo]) svg.append(sv('line', { class: 'grid', x1: L, x2: W - R, y1: y(v), y2: y(v) }));
  const text = (t, tx, ty, anchor = 'start') => { const e = sv('text', { x: tx, y: ty, 'text-anchor': anchor }); e.textContent = t; return e; };
  svg.append(text(fmt(hi), L, y(hi) - 3), text(fmt(lo), L, y(lo) - 3), text(ymText(points[0].ym), L, H - 6), text(ymText(last.ym), W - R, H - 6, 'end'));
  for (const g of segs) {
    if (g.length < 2) { svg.append(sv('circle', { class: 'pt', cx: x(g[0].i), cy: y(g[0].price), r: 1.5 })); continue; }
    const d = g.map((p, n) => `${n ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p.price).toFixed(1)}`).join('');
    svg.append(sv('path', { class: 'area', d: `${d}L${x(g.at(-1).i).toFixed(1)} ${H - B}L${x(g[0].i).toFixed(1)} ${H - B}Z` }), sv('path', { class: 'ln', d }));
  }
  const cross = sv('line', { class: 'cross', y1: T, y2: H - B, x1: x(last.i), x2: x(last.i) });
  const dot = sv('circle', { class: 'dot', r: 4, cx: x(last.i), cy: y(last.price) });
  svg.append(cross, dot);
  const show = (p) => { read.textContent = `${ymText(p.ym)} · ${fmt(p.price)}`; dot.setAttribute('cx', x(p.i)); dot.setAttribute('cy', y(p.price)); cross.setAttribute('x1', x(p.i)); cross.setAttribute('x2', x(p.i)); };
  show(last);
  const move = (e) => { const b = svg.getBoundingClientRect(), i = (e.clientX - b.left) / b.width * W; show(pts.reduce((a, p) => (Math.abs(x(p.i) - i) < Math.abs(x(a.i) - i) ? p : a), pts[0])); };
  svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move); svg.addEventListener('pointerleave', () => show(last));
  return h('div', {}, read, svg);
}
function chartCard(d, fmt) {
  const box = h('div', { className: 'inv-chart-box' });
  const usable = d.ranges.filter((r, i) => i === 0 || r.points.length > d.ranges[i - 1].points.length);
  let pick = usable.find((r) => r.label === ui.range[d.cat]) ?? usable.find((r) => r.label === (HOUSE.includes(d.cat) ? '5년' : '1년')) ?? usable[0];
  const tabs = h('div', { className: 'tabs inv-chips', role: 'group', 'aria-label': '차트 기간' });
  const paint = () => {
    box.replaceChildren(chart(pick.points, fmt));
    tabs.replaceChildren(...usable.map((r) => h('button', { 'aria-pressed': String(r === pick), text: r.label, on: { click: () => { pick = r; ui.range[d.cat] = r.label; paint(); } } })));
  };
  paint();
  return h('div', { className: 'card stack' }, box, tabs);
}

// ---------- 주문 시트 ----------
function orderSheet(ctx, id, side0) {
  const s = ctx.s, q = inv.quote(s, id), held = inv.init(s).pos[id]?.qty ?? 0;
  ctx.sheet((close) => {
    let side = side0;
    const sides = h('div', { className: 'inv-seg', role: 'group', 'aria-label': '주문 방향' });
    const btns = h('div', { className: 'grid4' }), under = h('div', { className: 'inv-under5' }), info = h('div', { className: 'inv-preview', role: 'status' });
    const run = (qty) => {
      const amount = input.get(), n = qty ?? qtyNow(), r = n ? (side === 'buy' ? inv.buy(s, id, n) : inv.sell(s, id, n)) : side === 'buy' ? review.buyWon(s, id, amount) : review.sellWon(s, id, amount);
      if (!r.ok) return ctx.toast(r.why);
      if (side === 'sell') recordTrade(s, r.gain - (r.back ?? 0), r.name);
      return done(ctx, close, r.text);
    };
    // 5%·10%를 처음 넘는 매수는 한 번 묻는다(src/disclose.js).
    const go = h('button', { className: 'btn', disabled: true, on: { click: () => {
      const amount = input.get(), n = qtyNow(), P = n ? review.previewOrder(s, id, 0, { side, qty: n }) : review.previewOrder(s, id, amount, { side });
      if (side !== 'buy' || !P?.ok || !dc.needsConfirm(s, id, P.qty)) return run();
      const u5 = dc.maxUnder5(s, id), L = dc.stakeLine(s, id, P.qty);
      return ctx.sheet((close2) => h('div', { className: 'stack' }, h('h2', { text: L.cross10 ? '주요주주가 됩니다' : '5%를 넘습니다' }),
        h('p', { text: dc.warnOf(s, id, 'buy', P.qty) }),
        h('p', { className: 'sub small', text: L.cross10 ? '공시와 주요주주 보고가 함께 나갑니다.' : '이달 말 공시에 이름이 실리고, 증권사·기자·회사가 연락해 올 수 있습니다.' }),
        h('button', { className: 'btn main', text: '그래도 산다', on: { click: () => { close2(); run(P.qty); } } }),
        u5 > 0 ? h('button', { className: 'btn', text: `5% 미만까지만 산다 (${qtyText(Math.min(u5, P.qty), q.cat)})`, on: { click: () => { close2(); run(Math.min(u5, P.qty)); } } }) : null,
        h('button', { className: 'btn', text: '그만두기', on: { click: close2 } })));
    } } });
    const paint = () => {
      const amount = input.get(), n = qtyNow(), P = n ? review.previewOrder(s, id, 0, { side, qty: n }) : amount > 0 ? review.previewOrder(s, id, amount, { side }) : null;
      go.className = `btn ${side === 'buy' ? 'main' : 'sky'}`;
      go.disabled = !P?.ok;
      go.textContent = !P?.qty ? (side === 'buy' ? '매수' : '매도') : `${side === 'buy' ? '매수' : '매도'} ${qtyText(P.qty, q.cat)}`;
      const rows = [];
      if (!P) rows.push(h('p', { className: 'sub', text: `${side === 'buy' ? '쓸 금액' : '팔 금액'}을 넣거나 비율을 고르세요.` }));
      else {
        if (P.qty) {
          rows.push(line('수량', qtyText(P.qty, q.cat)), line('단가', priceText({ ...q, price: P.price })), line('거래 금액', pw(P.gross)), line('수수료', pw(P.fee)), line('세금', pw(P.tax)));
          if (side === 'buy') rows.push(line('내는 돈', pw(P.total)));
          else rows.push(line('받는 돈', pw(P.net)), line('손익', `${P.gain >= 0 ? '+' : '−'}${pw(Math.abs(P.gain))}`, tone(P.gain)));
          rows.push(line('주문 뒤 현금', pw(P.cashAfter)));
          const phone = inv.phoneOrderNote(s, id); if (phone) rows.push(h('p', { className: 'sub small', text: phone }));
          const room = inv.buyRoom(s, id), stake = inv.stakeOf(s, id, side === 'buy' ? P.qty : -P.qty);
          if (side === 'buy' && room != null) rows.push(line('더 살 수 있는 수량', `${qtyText(room, q.cat)} (시장에 풀린 물량 기준)`));
          if (stake != null && stake >= 0.0001) rows.push(line('주문 뒤 지분', `${(stake < 0.01 ? Math.floor(stake * 1e5) / 1e3 : Math.floor(stake * 1e4) / 100).toFixed(stake < 0.01 ? 3 : 2)}%`));
          const warn = dc.warnOf(s, id, side, P.qty); if (warn) rows.push(h('p', { className: 'inv-warn', text: warn }));
          const back = side === 'sell' ? dc.clawbackOf(s, id, P.gain) : null; if (back?.back > 0) rows.push(line('회사에 돌려줄 이익', pw(back.back), 'down'));
          const big = inv.stakeNote(s, id, side, P.qty); if (big) rows.push(h('p', { className: 'sub small', text: big }));
          if (P.deferred) rows.push(line('내년 5월 양도세 예상', pw(P.taxLater)), h('p', { className: 'sub small', text: '작년 거래를 합산해 5월에 청구됩니다. 받는 돈에서 빠지지 않습니다.' }));
        }
        if (!P.ok) rows.push(lockLine(P.why));
      }
      info.replaceChildren(...rows);
    };
    const input = moneyInput(() => { qtyEl.value = ''; paint(); });
    // 수량으로 주문할 수도 있다. 수량을 넣으면 금액 칸을 비운다.
    const qtyEl = h('input', { type: 'text', inputMode: 'decimal', autocomplete: 'off', className: 'num inv-money', placeholder: `수량(${unitOf(q.cat) || '단위'})`, 'aria-label': '수량', on: { input: () => { input.el.value = ''; paint(); } } });
    function qtyNow() { const v = Number(String(qtyEl.value).replace(/[^\d.]/g, '')); return v > 0 ? v : 0; }
    const paintSide = () => {
      sides.replaceChildren(...[['buy', '매수'], ['sell', '매도']].map(([v, t]) => h('button', { 'aria-pressed': String(side === v), text: t, disabled: v === 'sell' && !(held > 0), on: { click: () => { side = v; qtyEl.value = ''; input.set(0); paintSide(); } } })));
      btns.replaceChildren(...review.orderButtons(s, id, side).map((b) => h('button', { className: 'btn', text: b.label, disabled: !(b.won > 0), on: { click: () => input.set(b.won) } })));
      const u5 = side === 'buy' ? review.under5Button(s, id) : null;
      under.replaceChildren(...(u5 ? [h('button', { className: 'btn', text: u5.label, disabled: !(u5.qty > 0), on: { click: () => { input.el.value = ''; qtyEl.value = String(u5.qty); paint(); } } })] : []));
      paint();
    };
    paintSide();
    return h('div', { className: 'stack' },
      sheetHead(nameOf(q), close, `지금 ${priceText(q)} · 현금 ${won(s.cash)}${held > 0 ? ` · 보유 ${qtyText(held, q.cat)}` : ''}`),
      sides, input.el, qtyEl, btns, under, info, go);
  });
}
function houseBuySheet(ctx, id) {
  const s = ctx.s, q = inv.quote(s, id), L = inv.loanLimit(s, id), a = inv.assetOf(id);
  ctx.sheet((close) => {
    const rate = inv.rateNow(s, 'kr_loan_mortgage');
    let useLoan = false, living = !!s.family?.homeWish; // 집을 사러 온 길이면 내가 사는 쪽이 기본
    const pay = h('div', { className: 'inv-seg', role: 'group', 'aria-label': '내는 방식' }), live = h('div', { className: 'inv-seg', role: 'group', 'aria-label': '쓰는 방식' });
    const loanBox = h('div', { className: 'stack' }), info = h('div', { className: 'inv-preview', role: 'status' });
    const loanNow = () => (useLoan ? input.get() : 0);
    const preview = () => review.previewOrder(s, id, 0, { side: 'buy', qty: 1, loan: loanNow(), living });
    const go = h('button', { className: 'btn main', text: '이 집 사기', on: { click: () => {
      const r = review.buyWon(s, id, q.price, { loan: loanNow(), living });
      if (!r.ok) return ctx.toast(r.why);
      setRecord(s, 'firstHouse', `${dateOf(s)} ${r.name}`);
      return done(ctx, close, r.text);
    } } });
    const paint = () => {
      const P = preview(), rows = [];
      go.disabled = !P.ok;
      if (P.gross != null) {
        rows.push(line('매매가', won(P.gross)), line('취득세', pw(P.tax)));
        if (P.loan > 0) rows.push(line('대출', won(P.loan)));
        rows.push(line('내 돈', won(P.total - P.loan)), line('산 뒤 현금', won(P.cashAfter)));
        if (P.loan > 0 && rate != null) rows.push(line(`매달 이자(연 ${num(rate)}%)`, won(P.loan * rate / 100 / 12)));
        rows.push(line(living ? '매달 월세' : '매달 받을 월세', living ? '내가 살아서 없음' : won(rentNow(a, s.year))));
      }
      if (!P.ok) rows.push(lockLine(P.why));
      info.replaceChildren(...rows);
    };
    const input = moneyInput(paint, '대출 금액(원)');
    const paintToggles = () => {
      pay.replaceChildren(...[[false, '현금만'], [true, '대출 포함']].map(([v, t]) => h('button', { 'aria-pressed': String(useLoan === v), text: t, disabled: v && !L.ok, on: { click: () => { useLoan = v; paintToggles(); } } })));
      live.replaceChildren(...[[false, '월세 주기'], [true, '내가 살기']].map(([v, t]) => h('button', { 'aria-pressed': String(living === v), text: t, on: { click: () => { living = v; paintToggles(); } } })));
      loanBox.replaceChildren(...(useLoan ? [
        h('p', { className: 'sub num', text: `LTV ${Math.round(L.ltv * 100)}%${L.regulated ? ' · 규제지역' : ''} · 한도 ${won(L.limit)} (${L.note})` }),
        input.el,
        h('div', { className: 'grid2' },
          h('button', { className: 'btn', text: '한도까지', on: { click: () => input.set(L.limit) } }),
          h('button', { className: 'btn', text: '모자란 만큼', on: { click: () => { const c = review.previewOrder(s, id, 0, { side: 'buy', qty: 1, loan: 0 }); input.set(Math.min(L.limit, Math.max(0, (c.total ?? 0) - s.cash))); } } })),
      ] : []));
      paint();
    };
    paintToggles();
    return h('div', { className: 'stack' },
      sheetHead(q.name, close, `현금 ${won(s.cash)}`),
      housePhoto(id, q.name),
      pay, L.ok ? null : lockLine(L.why), loanBox, live, info, go);
  });
}
function houseSellSheet(ctx, id) {
  const s = ctx.s, q = inv.quote(s, id), P = review.previewOrder(s, id, 0, { side: 'sell', qty: 1 });
  ctx.sheet((close) => h('div', { className: 'stack' },
    sheetHead(`${q.name} 팔기`, close),
    P.gross == null ? null : h('div', { className: 'inv-preview' }, line('매매가', won(P.gross)), line('내년 5월 양도세 예상', won(P.taxLater ?? 0)), P.loan ? line('갚을 대출', won(P.loan)) : null, line('받는 돈', won(P.net)), line('손익', signWon(P.gain), tone(P.gain)), line('판 뒤 현금', won(P.cashAfter))),
    P.ok ? null : lockLine(P.why),
    h('button', { className: 'btn sky', text: '팔기', disabled: !P.ok, on: { click: () => {
      const r = review.sellWon(s, id, q.price); if (!r.ok) return ctx.toast(r.why);
      recordTrade(s, r.gain, r.name); return done(ctx, close, r.text);
    } } })));
}

// ---------- 집 사진 ----------
// 자유 이용 사진이 있는 집만 data/re_photos.json에 있다. 처음 필요할 때 한 번 받고, 없거나 못 받으면 칸을 그리지 않는다.
let housePhotos = null;
const loadHousePhotos = () => (housePhotos ??= fetch('data/re_photos.json').then((r) => (r.ok ? r.json() : {})).catch(() => { housePhotos = null; return {}; }));
function housePhoto(id, name) {
  const box = h('figure', { className: 're-photo', hidden: true });
  loadHousePhotos().then((all) => {
    const p = all[id]; if (!p) return;
    box.append(h('img', { src: p.src, alt: `${name} 사진`, loading: 'lazy' }),
      h('figcaption', {}, h('a', { href: p.page, target: '_blank', rel: 'noopener', text: `사진 ${p.author} · ${p.license}` })));
    box.hidden = false;
  });
  return box;
}
// ---------- 분류별 칸 ----------
function houseBlock(ctx, s, d) {
  const a = inv.assetOf(d.id), P = inv.init(s), h0 = P.pos[d.id], box = h('div', { className: 'card stack' });
  const rate = inv.rateNow(s, 'kr_loan_mortgage'), rent = rentNow(a, s.year);
  box.append(h('h3', { text: '이 집' }), line('올해 월세', rent ? won(rent) : '자료 없음'));
  if (d.cat === '부동산') {
    if (inv.isRegulated(a.region, ymOf(s))) box.append(h('span', { className: 'chip', text: '규제지역' }));
    const L = inv.loanLimit(s, d.id);
    box.append(L.ok ? line(`대출 한도(LTV ${Math.round(L.ltv * 100)}%)`, won(L.limit)) : lockLine(L.why));
    if (rate != null) box.append(line('이번 달 주택담보대출 금리', `연 ${num(rate)}%`));
  } else box.append(h('p', { className: 'sub', text: '해외 랜드마크는 대출 없이 현금으로만 삽니다.' }));
  if (!h0) return box;
  const months = inv.posOf(s).i - h0.since, loan = P.loans[d.id];
  box.append(line('보유 기간', `${months}개월`));
  box.append(h('div', { className: 'inv-seg', role: 'group', 'aria-label': '쓰는 방식' }, [[true, '내가 살기'], [false, '월세 주기']].map(([v, t]) => h('button', { 'aria-pressed': String(!!P.living[d.id] === v), text: t, on: { click: () => { const r = inv.setResidence(s, d.id, v); if (!r.ok) ctx.toast(r.why); else done(ctx, null, v ? '이 집에 살기로 했습니다.' : '이 집을 월세로 내놓았습니다.'); } } }))));
  if (loan) {
    box.append(line('남은 대출', won(loan.principal)));
    if (rate != null) box.append(line('매달 이자', won(loan.principal * rate / 100 / 12)));
    if (loan.late) box.append(h('p', { className: 'inv-warn-text', text: `이자가 ${loan.late}번 밀렸습니다. ${inv.RULES.AUCTION_LATE}번이면 경매로 넘어갑니다.` }));
    box.append(h('button', { className: 'btn', on: { click: () => amountSheet(ctx, { title: '대출 상환', note: `남은 대출 ${won(loan.principal)} · 현금 ${won(s.cash)}`, max: Math.min(loan.principal, Math.max(0, s.cash)), label: '갚기', run: (v) => { const r = inv.repayLoan(s, d.id, v); return r.ok ? { ok: true, text: r.principal ? `대출이 ${won(r.principal)} 남았습니다.` : '대출을 다 갚았습니다.' } : r; } }) } }, '대출 상환'));
  }
  const L = d.cat === '부동산' ? inv.loanLimit(s, d.id) : null;
  if (L?.ok && L.limit > 0) box.append(h('button', { className: 'btn', on: { click: () => amountSheet(ctx, { title: '추가 대출', note: `한도 ${won(L.limit)}`, max: L.limit, maxLabel: '한도까지', label: '빌리기', run: (v) => { const r = inv.takeLoan(s, d.id, v); return r.ok ? { ok: true, text: `대출이 ${won(r.principal)}이 되었습니다.` } : r; } }) } }, '추가 대출'));
  return box;
}
function futClone(s) { const c = structuredClone(s); c.cash = 1e15; return c; }
function futureBlock(ctx, s, d) {
  const P = inv.init(s), box = h('div', { className: 'stack' }), g = inv.access(s, '선물'), R = inv.RULES;
  box.append(h('div', { className: 'panel stack inv-risk' }, h('h3', { text: '⚠ 위험 안내' }),
    h('p', { text: '증거금보다 훨씬 큰 금액을 굴리는 거래입니다. 지수가 조금만 반대로 가도 증거금이 빠르게 줄어듭니다.' }),
    h('p', { text: '달마다 값을 맞춰 보고, 증거금이 유지선 아래로 내려가면 강제로 정리됩니다. 달 중간에 벌어진 일은 달 끝에 한꺼번에 나타납니다.' })));
  if (!g.ok) {
    box.append(h('div', { className: 'card stack' }, lockLine(g.why), ymOf(s) >= R.DERIV_EDU_YM && !s.flags?.[R.DERIV_FLAG] && ymOf(s) >= inv.ADULT_YM
      ? h('button', { className: 'btn sun', on: { click: () => ctx.result(inv.takeDerivEducation(s)) && ctx.refresh() } }, '파생상품 교육 받기 (활동 한 칸)') : null));
    return box;
  }
  if (P.fut) {
    const f = P.fut, c = futClone(s), closed = inv.closeFuture(c);
    const again = futClone(s); again.portfolio.fut = null; const o = inv.openFuture(again, f.side, f.n);
    const keep = o.ok ? o.margin / R.FUT_MARGIN * R.FUT_KEEP : null, top = Math.max(f.account, f.margin, keep ?? 0);
    box.append(h('div', { className: 'card stack' }, h('h3', { text: '내 계약' }),
      line('방향', f.side > 0 ? '매수(오르면 이익)' : '매도(내리면 이익)'), line('계약 수', `${f.n}계약`), line('맞춰 본 지수', num(f.ref)),
      line('증거금 계좌', won(f.account)), keep == null ? null : line('유지선', won(keep)),
      keep == null ? null : h('div', { className: `inv-gauge ${f.account < keep * 1.2 ? 'bad' : ''}`, role: 'img', 'aria-label': '증거금과 유지선' }, h('i', { style: `width:${Math.max(0, f.account / top * 100)}%` }), h('b', { style: `left:${keep / top * 100}%` })),
      closed.ok ? line('지금 정리하면 받는 돈', won(closed.back)) : null,
      line('시작 증거금과 비교한 손익', signWon(f.account - f.margin), tone(f.account - f.margin)),
      h('button', { className: 'btn main', on: { click: () => { const start = f.margin, r = inv.closeFuture(s); if (!r.ok) return ctx.toast(r.why); recordTrade(s, r.back - start, '코스피200 선물'); return done(ctx, null, `선물을 정리하고 ${won(r.back)}을 받았습니다.`); } } }, '계약 정리')));
    return box;
  }
  let n = 1;
  const count = h('b', { className: 'num inv-count' }), info = h('div', { className: 'inv-preview', role: 'status' });
  const open = (side) => { const r = inv.openFuture(s, side, n); if (!r.ok) return ctx.toast(r.why); return done(ctx, null, `${side === 'long' ? '매수' : '매도'} ${n}계약을 열었습니다. 증거금 ${won(r.margin)}.`); };
  const buy = h('button', { className: 'btn main', text: '매수(오르면 이익)', on: { click: () => open('long') } }), sell = h('button', { className: 'btn sky', text: '매도(내리면 이익)', on: { click: () => open('short') } });
  const paint = () => {
    count.textContent = `${n}계약`;
    const r = inv.openFuture(futClone(s), 'long', n);
    if (!r.ok) { info.replaceChildren(lockLine(r.why)); buy.disabled = sell.disabled = true; return; }
    const shortOf = r.margin + r.fee > s.cash;
    info.replaceChildren(line('지금 지수', num(r.level)), line('계약 금액', won(r.margin / R.FUT_MARGIN)), line('증거금', won(r.margin)), line('수수료', pw(r.fee)), line('유지선', won(r.margin / R.FUT_MARGIN * R.FUT_KEEP)), line('현금', won(s.cash)), ...(shortOf ? [lockLine('증거금이 모자랍니다.')] : []));
    buy.disabled = sell.disabled = shortOf;
  };
  paint();
  box.append(h('div', { className: 'card stack' }, h('h3', { text: '새 계약' }),
    h('div', { className: 'row between' },
      h('button', { className: 'btn inv-step', 'aria-label': '한 계약 줄이기', text: '−', on: { click: () => { n = Math.max(1, n - 1); paint(); } } }), count,
      h('button', { className: 'btn inv-step', 'aria-label': '한 계약 늘리기', text: '+', on: { click: () => { n += 1; paint(); } } })),
    info, h('div', { className: 'grid2' }, buy, sell)));
  return box;
}

// ---------- asset 상세 ----------
function renderAsset(ctx, params) {
  const s = ready(ctx), d = review.assetDetail(s, params?.id);
  if (!d) return h('div', { className: 'inv stack' }, head(ctx, '종목'), h('p', { text: '찾는 종목이 없습니다.' }));
  const isHouse = HOUSE.includes(d.cat), isFut = d.cat === '선물';
  const fmt = (v) => (isFut ? num(v) : isHouse ? won(v) : pw(v));
  const a = inv.assetOf(d.id), held = d.holding?.qty ?? 0, title = nameOf(d);
  const tag = [LABEL[d.cat], marketOf(d.market) !== d.cat ? marketOf(d.market) : null, d.cat === '부동산' ? a.region : null, d.sector || null, d.cat === '토지' || d.cat === '외화' || isHouse || isFut ? null : d.ticker].filter(Boolean);
  const value = held > 0 ? held * (d.price ?? 0) : 0;
  const wrap = h('div', { className: 'inv stack' },
    head(ctx, title, dateOf(s)),
    isHouse ? housePhoto(d.id, title) : null,
    h('section', { className: 'panel inv-hero' },
      h('div', { className: 'row between wrap' }, h('div', { className: 'inv-total num', text: d.price == null ? inv.statusLabel(d.status, d.cat) : priceText(d) }), d.change == null ? null : h('b', { className: `num inv-${tone(d.change)}`, text: `지난달보다 ${pct(d.change)}` })),
      h('p', { className: 'sub', text: [...new Set(tag)].join(' · ') }),
      d.oldNames?.length ? h('p', { className: 'sub small', text: `옛 이름: ${d.oldNames.join(', ')}` }) : null,
      d.status !== '정상' ? h('span', { className: 'chip', text: inv.statusLabel(d.status, d.cat) }) : null),
    d.locked ? h('div', { className: 'card stack' }, lockLine(d.why), d.need?.step ? h('button', { className: 'btn sun', on: { click: () => ctx.go('account') } }, '계좌 준비 보기') : null) : null,
    chartCard(d, fmt),
    d.notes.length ? h('div', { className: 'sub small inv-notes' }, d.notes.map((t) => h('p', { text: t }))) : null);
  if (held > 0 && !isFut) wrap.append(h('div', { className: 'card stack' }, h('h3', { text: '내 보유' }), line('수량', qtyText(held, d.cat)), line('평균 단가', fmt(d.holding.avg)), line('평가액', won(value)), d.holding.ret == null ? null : line('수익률', pct(d.holding.ret), tone(d.holding.ret))));
  if (isHouse) wrap.append(houseBlock(ctx, s, d));
  if (isFut) wrap.append(futureBlock(ctx, s, d));
  if (d.foresee) wrap.append(h('div', { className: 'inv-memory' }, h('span', { className: 'chip', text: '다음 달' }), h('p', { text: d.foresee.text })));
  if (d.memory) wrap.append(h('div', { className: 'inv-memory' }, h('span', { className: 'chip', text: `기억 · ${d.memory.clarity}` }), h('p', { text: d.memory.text })));
  if (['국내주식', '해외주식', 'ETF'].includes(d.cat)) wrap.append(h('p', { className: 'sub inv-div', text: `배당: ${d.dividend.text}` }));
  if (!isFut) {
    const buyBtn = h('button', { className: `btn ${isHouse && held > 0 ? '' : 'main'}`, disabled: d.locked, text: isHouse && held > 0 ? '이미 가진 집' : '매수', on: { click: () => (isHouse ? houseBuySheet(ctx, d.id) : orderSheet(ctx, d.id, 'buy')) } });
    if (isHouse && held > 0) buyBtn.disabled = true;
    const sellBtn = h('button', { className: 'btn sky', disabled: d.locked || !(held > 0), text: '매도', on: { click: () => (isHouse ? houseSellSheet(ctx, d.id) : orderSheet(ctx, d.id, 'sell')) } });
    wrap.append(h('div', { className: 'bar' }, h('div', { className: 'inv-bar' }, buyBtn, sellBtn)));
  }
  return wrap;
}

// ---------- account 계좌 준비 ----------
function promiseSheet(ctx) {
  const s = ctx.s, sc = contest.promiseScene(s);
  if (!sc) return ctx.toast(contest.canTalk(s).why);
  return ctx.sheet((close) => {
    const body = h('div', { className: 'stack' });
    const end = (r) => body.replaceChildren(h('div', { className: 'panel' }, h('p', { text: r.text })), h('button', { className: 'btn main', text: '확인', on: { click: () => done(ctx, close) } }));
    body.append(h('div', { className: 'panel' }, h('p', { text: sc.text })), ...sc.choices.map((c) => h('button', { className: 'btn', text: c.label, on: { click: () => { const r = contest.talkToParents(s, c.i); ctx.save(); if (!r.ok) { ctx.toast(r.why); close(); } else end(r); } } })));
    return h('div', { className: 'stack' }, sheetHead(sc.title, () => { close(); ctx.refresh(); }), body);
  });
}
function nextStep(ctx, a) {
  const s = ctx.s, n = a.next; if (!n) return null;
  if (n.id === 'bank') return actBtn(n.label, n.can, 'main', () => { ctx.result(contest.visitBank(s)); ctx.refresh(); });
  if (n.id === 'talk') return actBtn(n.label, n.can, 'main', () => promiseSheet(ctx));
  if (n.id === 'retry') return actBtn(n.label, n.can, 'main', () => { ctx.result(contest.retryParents(s)); ctx.refresh(); });
  return null; // 'contest'는 아래 올해 대회 칸에서 한다.
}
// 후보 종목. 발표 전에는 떠오른 기억을, 발표 뒤에는 실제 수익률을 보여 준다.
function candList(ctx, s, st) {
  return h('div', { className: 'stack' }, st.cands.map((x) => {
    const pick = () => { const r = contest.togglePick(s, x.id); if (!r.ok) ctx.toast(r.why); ctx.refresh(); };
    return h('button', { className: `btn inv-cand${x.picked ? ' sun' : ''}`, disabled: !st.canPick.ok, 'aria-pressed': String(x.picked), on: { click: pick } },
      h('span', { className: 'inv-cand-name' }, x.picked ? '✓ ' : '', x.name, x.sector ? h('small', { className: 'sub', text: ` ${x.sector}` }) : null),
      x.ret != null ? h('span', { className: 'num', text: `${x.ret >= 0 ? '+' : ''}${x.ret}%` }) : h('small', { className: 'sub', text: x.hint ?? '아직 떠오르지 않는다.' }));
  }));
}
function contestCard(ctx, s) {
  const st = contest.contestState(s), box = h('section', { className: 'panel stack inv-contest', 'aria-label': '올해 대회' });
  box.append(h('div', {}, h('h2', { text: st.season ? `${st.year} ${st.title}` : st.title }), h('p', { className: 'sub', text: `${st.organizer} 주최${st.division ? ` · ${st.division}` : ''}` })));
  if (!st.season) { if (st.text) box.append(h('p', { text: st.text })); return box; }
  box.append(h('p', { className: 'sub', text: st.team }));
  box.append(h('ol', { className: 'inv-cs' }, st.steps.map((x) => h('li', { className: x.done ? 'done' : '' }, `${x.done ? '✓' : '·'} ${x.label}`))));
  for (const w of st.warnings) box.append(h('p', { className: 'inv-warn-text', text: `⚠ ${w}` }));
  box.append(h('p', { className: 'sub num', text: `이번 달 활동 ${s.used}/${s.capacity}칸` }));
  if (st.result) {
    box.append(h('div', { className: 'inv-result' }, h('b', { text: st.result.rankName }), h('span', { className: 'num', text: `수익률 ${pct(st.result.returnPct / 100)}` }), st.result.prize ? h('span', { className: 'num', text: `상금 ${won(st.result.prize)}` }) : null), candList(ctx, s, st));
    return box;
  }
  if (!st.entered) { box.append(actBtn('대회 신청', st.canApply, 'main', () => { ctx.result(contest.applyContest(s)); ctx.refresh(); })); return box; }
  box.append(h('p', { className: 'sub', text: `후보 ${st.cands.length}종목 중 1~${st.maxPick}개를 고릅니다. 적게 고를수록 크게 받거나 크게 잃습니다.` }));
  box.append(actBtn(`기억 떠올리기 (대회 준비 ${st.prep}/${st.maxPrep})`, st.canPrepare, 'sun', () => { ctx.result(contest.prepareContest(s)); ctx.refresh(); }));
  box.append(candList(ctx, s, st));
  return box;
}
function renderAccount(ctx) {
  const s = ready(ctx), a = contest.accountSteps(s);
  const cur = a.steps.find((x) => !x.done);
  return h('div', { className: 'inv stack' },
    head(ctx, '계좌 준비', dateOf(s)),
    h('section', { className: 'inv-road', 'aria-label': '계좌 단계' },
      h('h2', { text: a.hasAccount ? '내 계좌' : '내 계좌를 여는 길' }),
      h('p', { text: a.text }),
      h('ol', { className: 'inv-steps' }, a.steps.map((x) => h('li', { className: x.done ? 'done' : x === cur ? 'now' : '' }, h('b', { text: `${x.done ? '✓ ' : ''}${x.label}` }), h('span', { className: 'small', text: x.detail })))),
      nextStep(ctx, a)),
    contestCard(ctx, s),
    a.awards.length ? h('section', { className: 'card stack', 'aria-label': '대회 기록' }, h('h3', { text: '대회 기록' }), a.awards.map((w) => h('div', { className: 'row between' }, h('span', { text: `${w.year} ${w.division} ${w.rankName}` }), h('span', { className: 'num', text: pct(w.returnPct / 100) })))) : null);
}

export const screens = { invest: renderInvest, asset: renderAsset, account: renderAccount };
