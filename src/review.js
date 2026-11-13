// 연말 결산, 배당, 명절 용돈, 원 단위 주문, 검색, 종목 상세(설계 6.3, 6.6, 8, 9, 10.1). 순수 함수.
// 세금 계산은 invest.js 안에 있다(buy/sell이 직접 지켜야 하므로). 여기서는 화면이 쓰는 묶음을 낸다.
import { stageOf, tierOf } from './rules.js';
import { onMonth as coreOnMonth } from './core.js';
import { eventById } from './events.js';
import * as inv from './invest.js';
import * as contest from './contest.js';
import * as coding from './coding.js';
import * as parents from './parents.js';
import * as dc from './disclose.js';
import * as tax from './tax.js';
import { hintsForAsset, pastMemories, yearHeadline } from './paper.js';
import EXTRA from '../data/market/extra.js';

const won = Math.round;
const ymOf = (s) => s.year * 100 + s.month;
const no = (why, extra = {}) => ({ ok: false, why, ...extra });

// ---------- 명절 용돈(설계 8) ----------
const SEOLLAL = { 2000: 2, 2001: 1, 2002: 2, 2003: 2, 2004: 1, 2005: 2, 2006: 1, 2007: 2, 2008: 2, 2009: 1, 2010: 2, 2011: 2, 2012: 1, 2013: 2, 2014: 1, 2015: 2, 2016: 2, 2017: 1, 2018: 2, 2019: 2, 2020: 1, 2021: 2, 2022: 2, 2023: 1, 2024: 2, 2025: 1, 2026: 2 };
const CHUSEOK = { 2000: 9, 2001: 10, 2002: 9, 2003: 9, 2004: 9, 2005: 9, 2006: 10, 2007: 9, 2008: 9, 2009: 10, 2010: 9, 2011: 9, 2012: 9, 2013: 9, 2014: 9, 2015: 9, 2016: 9, 2017: 10, 2018: 9, 2019: 9, 2020: 10, 2021: 9, 2022: 9, 2023: 9, 2024: 9, 2025: 10, 2026: 9 };
const GIVERS = [['할머니', 0.4, 60], ['엄마', 0.35, 50], ['아빠', 0.25, 50]];
const SCENE_GIFT = { 200101: 'sc_e6_newyear' }; // 이야기 장면이 이미 봉투를 주는 달은 겹쳐 주지 않는다
export function giftBase(s) {
  if (stageOf(s) === '사회인') return 0;
  const ym = ymOf(s);
  return ym <= 200112 ? 40000 : ym <= 200412 ? 60000 : ym <= 200802 ? 120000 : 170000;
}
const bondOfGiver = (s, who) => (who === '할머니' ? s.bonds?.할머니 ?? 60 : s.bonds?.부모님 ?? 50);
export function giftsThisMonth(s) {
  const out = [], m = s.month;
  if (SEOLLAL[s.year] === m) out.push('설날 세뱃돈');
  if ((s.birthMonth ?? 2) === m) out.push('생일 선물');
  if (CHUSEOK[s.year] === m) out.push('추석 용돈');
  return out;
}
function payGifts(s) {
  const base = giftBase(s); if (!base) return;
  for (const label of giftsThisMonth(s)) {
    const scene = SCENE_GIFT[ymOf(s)];
    if (scene && label === '설날 세뱃돈' && eventById(scene)) continue;
    const parts = GIVERS.map(([who, rate]) => [who, Math.round(base * rate * (0.8 + 0.4 * bondOfGiver(s, who) / 100) / 1000) * 1000]);
    const total = parts.reduce((t, [, v]) => t + v, 0);
    inv.addMoney(s, `${label} (${parts.map(([w, v]) => `${w} ${inv.fmtWon(v)}`).join(' · ')})`, total, 'gifts');
  }
}

// ---------- 배당(설계 6.6) ----------
// 자료가 있는 종목만 지급한다. 없는 해는 무배당(설계 그대로). 지어내지 않는다.
const divTaxKr = (y) => (y <= 2000 ? 0.22 : y <= 2004 ? 0.165 : 0.154);
const DIV_TAX_US = 0.15;
function rateOf(id, year) {
  const d = EXTRA.dividend[id]; if (!d) return null;
  if (year === 2026 && d.kind !== 'kr') return d.rate[2025] ?? null; // 2026년은 부분 값
  return d.rate[year] ?? null;
}
function payDividends(s) {
  const p = inv.init(s), st = inv.yearStats(s), pay = (a, gross, tax) => {
    const net = won(gross * (1 - tax)); if (net <= 0) return;
    inv.addMoney(s, `${inv.nameOfAt(a.id, s)} 배당`, net, 'dividends');
    st.taxes += won(gross) - net; st.finGross = (st.finGross ?? 0) + gross;
    if (!st.biggestDividend || net > st.biggestDividend.amount) st.biggestDividend = { name: inv.nameOfAt(a.id, s), amount: net };
  };
  if (s.month === 4) { // 국내: 전년 12월 들고 있던 수량 x 전년 배당률 x 전년 12월 값
    for (const [id, qty] of Object.entries(p.divBase ?? {})) {
      const a = inv.assetOf(id); if (!a || a.ccy !== 'KRW' || !p.pos[id] || !['국내주식', 'ETF'].includes(a.cat)) continue;
      const r = rateOf(id, s.year - 1), px = inv.priceOfAt(id, s.year - 1, 12);
      if (r && px) pay(a, r / 100 * px * Math.min(qty, p.pos[id].qty), divTaxKr(s.year));
    }
  }
  if ([3, 6, 9, 12].includes(s.month)) { // 미국: 분기
    for (const [id, h] of Object.entries(p.pos)) {
      const a = inv.assetOf(id); if (!a || a.ccy !== 'USD' || !['해외주식', 'ETF'].includes(a.cat)) continue;
      const r = rateOf(id, s.year), px = inv.priceOf(s, id);
      if (r && px) pay(a, r / 100 / 4 * px * h.qty, DIV_TAX_US);
    }
  }
}
export function dividendInfo(s, id) {
  const y = s.month >= 4 ? s.year - 1 : s.year - 2, r = rateOf(id, y), d = EXTRA.dividend[id];
  if (!d) return { known: false, text: '배당 자료가 없어 배당을 받지 않습니다.' };
  if (r == null) return { known: false, year: y, rate: null, text: `${y}년 배당 자료가 없어 배당을 받지 않습니다.` }; // 표에 없는 해
  return { known: true, year: y, rate: r, text: r > 0 ? `${y}년 배당률 ${r}%` : `${y}년에는 배당이 없었습니다.` };
}

// ---------- 달 넘김 ----------
export function onMonth(s) {
  if (!inv.isLoaded()) return s;
  const p = inv.init(s), ym = ymOf(s);
  if (p.reviewMonth === ym) return s; p.reviewMonth = ym;
  payDividends(s); payGifts(s);
  return s;
}
// 순서가 중요하다: invest(결산·이번 달 내역 시작) -> 배당·용돈 -> 대회. main은 이것만 부르면 된다.
export function install() { coreOnMonth(inv.onMonth); coreOnMonth(tax.onMonth); coreOnMonth(parents.onMonth); coreOnMonth(coding.onMonth); coreOnMonth(onMonth); coreOnMonth(contest.onMonth); }

// ---------- 원 단위 주문(설계 6.3) ----------
const stepOf = (a) => (a.cat === '코인' ? 0.0001 : a.cat === '외화' ? 0.01 : 1);
const roundStep = (n, step) => (step === 1 ? n : Math.round(n * step * 1e8) / 1e8);
// 조건을 만족하는 가장 큰 n(n*step 수량)을 찾는다. fits는 n이 커질수록 거짓이 되는 함수.
function largest(top, fits) { let lo = 0, hi = Math.max(0, Math.floor(top)); while (lo < hi) { const m = Math.ceil((lo + hi) / 2); if (fits(m)) lo = m; else hi = m - 1; } return lo; }
export function previewOrder(s, id, amount, opts = {}) {
  const side = opts.side ?? 'buy', a = inv.assetOf(id); if (!a) return no('없는 종목입니다.');
  const plan = (q) => (side === 'buy' ? inv.planBuy(s, id, q, opts) : inv.planSell(s, id, q));
  if (a.cat === '선물') return no('선물은 openFuture를 씁니다.');
  const q0 = inv.quote(s, id), step = stepOf(a);
  if (!q0.tradable) return no(q0.why, { need: q0.need });
  let qty;
  if (opts.qty != null) qty = opts.qty;
  else {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return no('금액이 올바르지 않습니다.');
    const px = q0.price;
    if (side === 'buy') {
      if (a.cat === '부동산' || a.cat === '해외부동산') qty = 1;
      else {
        const budget = Math.min(amount, s.cash), cost = (n) => inv.orderCost(s, id, 'buy', roundStep(n, step));
        const fitsMoney = (n) => { const c = cost(n); return c.gross + c.fee + c.tax <= budget; };
        qty = roundStep(largest(budget / px / step, fitsMoney), step);
        const room = inv.buyRoom(s, id); if (room === 0) return no('시장에 풀린 주식을 다 가졌습니다. 더 살 수 없습니다.'); if (room != null && qty > room) qty = room;
      }
    } else {
      const held = inv.init(s).pos[id]?.qty ?? 0; if (held <= 0) return no('가지고 있지 않습니다.');
      if (a.cat === '부동산' || a.cat === '해외부동산') qty = 1;
      else {
        qty = amount >= held * px ? held : roundStep(Math.floor(amount / px / step), step);
      }
    }
    if (!(qty > 0)) return no('그 금액으로는 한 단위도 살 수 없습니다.');
  }
  const r = plan(qty);
  return { ...r, unit: step };
}
export function buyWon(s, id, amount, opts = {}) {
  const p = previewOrder(s, id, amount, { ...opts, side: 'buy' }); if (!p.ok) return p;
  return inv.buy(s, id, p.qty, opts);
}
export function sellWon(s, id, amount, opts = {}) {
  const p = previewOrder(s, id, amount, { ...opts, side: 'sell' }); if (!p.ok) return p;
  return inv.sell(s, id, p.qty);
}
// 10·25·50%·최대 버튼 값. buy는 현금 기준, sell은 보유 평가액 기준.
export function orderButtons(s, id, side = 'buy') {
  const a = inv.assetOf(id); if (!a) return [];
  const held = inv.init(s).pos[id]?.qty ?? 0, price = inv.priceOf(s, id) ?? 0, base = side === 'buy' ? Math.max(0, s.cash) : held * price;
  return [['10%', 0.1], ['25%', 0.25], ['50%', 0.5], ['최대', 1]].map(([label, r]) => {
    const amount = side === 'buy' ? Math.floor(base * r) : Math.ceil(base * r);
    return { label, ratio: r, won: amount, preview: amount > 0 ? previewOrder(s, id, amount, { side }) : no('금액이 없습니다.') };
  });
}
// '5% 미만까지' 버튼: 5% 바로 밑까지 사는 수량(가진 돈 안). 공시 규칙이 작동하지 않거나 이미 5% 이상이면 null.
export function under5Button(s, id) {
  const room = dc.maxUnder5(s, id); if (!room) return null;
  const cash = previewOrder(s, id, Math.max(0, s.cash), { side: 'buy' }), qty = Math.min(room, cash.ok || cash.qty ? cash.qty ?? 0 : 0);
  return { label: '5% 미만까지', qty, preview: qty > 0 ? previewOrder(s, id, 0, { side: 'buy', qty }) : no('돈이 모자랍니다.') };
}

// ---------- 검색·정렬(설계 10.1) ----------
export const SORTS = ['기본', '상승률', '하락률', '이름'];
const rowOf = (s, id) => {
  const q = inv.quote(s, id), p = inv.init(s), h = p.pos[id], t = tierOf(s.stats?.지능 ?? 0);
  const value = h ? Math.round(h.qty * (inv.priceOf(s, id) ?? 0)) : 0;
  return { ...q, locked: !q.tradable, held: h?.qty ?? 0, avg: h && h.qty > 0 ? h.cost / h.qty : null, ret: h && h.cost > 0 && value ? value / h.cost - 1 : null, star: t >= 4 ? !!inv.memoryHint(s, id)?.star : false };
};
// q: 이름·옛 이름·티커. opts: {cat, market:'KOSPI'|'KOSDAQ', sort}. 전부 돌려준다. 자르는 것은 화면 몫.
export function searchAssets(s, q = '', opts = {}) {
  const needle = String(q).trim().toLowerCase();
  const ids = opts.cat ? inv.idsOf(opts.cat) : inv.allAssetIds();
  let rows = ids.filter((id) => {
    const a = inv.assetOf(id);
    if (opts.market && !inv.marketOfNow(s, id).startsWith(opts.market)) return false;
    return !needle || inv.allNames(a).some((n) => String(n).toLowerCase().includes(needle));
  }).map((id) => rowOf(s, id));
  const rank = (r) => (r.held > 0 ? 0 : r.status === '정상' ? 1 : r.status === '거래정지' ? 2 : r.status === '미상장' ? 3 : 4);
  const sort = opts.sort ?? '기본';
  if (sort === '기본') rows = rows.map((r, i) => [r, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map((x) => x[0]);
  if (sort === '이름') rows.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  if (sort === '상승률' || sort === '하락률') { const d = sort === '상승률' ? -1 : 1; rows.sort((a, b) => (a.change == null) - (b.change == null) || d * ((a.change ?? 0) - (b.change ?? 0))); }
  return rows;
}

// ---------- 종목 상세 ----------
export const CHART_RANGES = [{ label: '1년', months: 12 }, { label: '3년', months: 36 }, { label: '5년', months: 60 }, { label: '10년', months: 120 }];
export function assetDetail(s, id) {
  const a = inv.assetOf(id); if (!a) return null;
  const r = rowOf(s, id), { i } = inv.posOf(s), x = inv.monthsOf();
  const notes = [];
  if (a.cat === '코인') notes.push('해외 시세를 원화로 환산한 값입니다.');
  if (r.ended) notes.push('10월 28일 이후 시세 없음');
  if (r.notice) notes.push(r.notice);
  const hints = hintsForAsset(s, id), own = hints.length ? null : inv.memoryHint(s, id);
  const series = inv.priceHistory(s, id, 120);
  return {
    id, name: r.name, oldNames: r.oldNames, ticker: r.ticker, market: r.market, cat: r.cat, sector: r.sector, ccy: a.ccy,
    status: r.status, price: r.price, change: r.change, locked: r.locked, why: r.why, need: r.need, notes,
    listed: i >= a.first ? { from: a.first > 0 ? x[a.first] : null } : null,
    series, ranges: CHART_RANGES.map((c) => ({ ...c, points: series.slice(-c.months) })),
    holding: r.held > 0 ? { qty: r.held, avg: r.avg, ret: r.ret } : null,
    dividend: dividendInfo(s, id),
    foresee: inv.nextMonthHint(s, id),
    memory: hints[0] ? { text: hints[0].text, clarity: hints[0].clarity } : own ? { text: own.text, clarity: own.clarity, star: own.star } : null,
  };
}

// ---------- 연말 결산(설계 9) ----------
export const reportYears = (s) => Object.keys(inv.annualOf(s)).map(Number).sort((a, b) => a - b);
export function yearReview(s, year = null) {
  const all = inv.annualOf(s), y = year ?? reportYears(s).at(-1); const a = all[y]; if (!a) return null;
  const { close, stats: t, bill } = a, prev = t.start ?? t.track[0] ?? 0, change = close.netWorth - prev;
  const held = close.holdings.filter((h) => h.cost > 0 && h.status !== '상장폐지').map((h) => ({ id: h.id, name: h.name, ret: h.ret })).sort((p, q) => q.ret - p.ret);
  const realized = Object.values(t.realized).reduce((x, v) => x + v, 0);
  const earned = { 실현손익: realized, 배당: t.dividends, 이자: t.interest, 월세: t.rent, 용돈: t.gifts, 상금: t.prizes, 정산금: t.settled };
  const award = (s.contestAwards ?? []).find((c) => c.year === y && c.rank !== 'participation');
  const highlights = [];
  if (award) highlights.push(`모의투자 대회 ${award.rankName} (수익률 ${award.returnPct >= 0 ? '+' : ''}${award.returnPct}%)`);
  if (s.account && Math.floor(s.account.ym / 100) === y) highlights.push('내 이름의 첫 주식 계좌');
  const home = inv.init(s).firstHome; if (home && Math.floor(home.ym / 100) === y) highlights.push(`첫 집 마련: ${home.name}`);
  if (t.biggestTrade) highlights.push(`가장 큰 거래: ${t.biggestTrade.name} ${t.biggestTrade.side} ${inv.fmtWon(t.biggestTrade.gross)}원`);
  if (t.biggestDividend) highlights.push(`가장 큰 배당: ${t.biggestDividend.name} ${inv.fmtWon(t.biggestDividend.amount)}원`);
  return {
    year: y, netWorth: close.netWorth, prevNetWorth: prev, change, changePct: prev > 0 ? Math.round(change / prev * 1000) / 10 : null,
    track: [...t.track], mix: { 현금: close.cash, ...close.parts }, earned, realized: { ...t.realized },
    taxes: t.taxes, fees: t.fees, loanInterest: t.loanInterest, bill,
    best: held[0] ?? null, worst: held.length > 1 ? held.at(-1) : null,
    memories: pastMemories(s, y), headline: yearHeadline(y), highlights: highlights.slice(0, 3),
  };
}
// 엔딩의 27년 그래프
export const endingSeries = (s) => reportYears(s).map((y) => ({ year: y, netWorth: inv.annualOf(s)[y].close.netWorth }));
