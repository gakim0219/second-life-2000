// 투자: 순수 함수. 근거 ../invest/투자_설계_초안.md. 시세는 loadMarket(obj)로 주입(브라우저·node 공통).
// obj = { kospi, kosdaq, global, etf, coins, fx, land, re_kr, re_world, macro, rates } (data/market/*.json 내용)
// 값이 빈 달의 가격은 만들지 않는다. 빈 달은 '거래정지', 첫 값 전은 '미상장'.
// 마지막 값 뒤: 자료에 폐지로 적힌 종목은 '상장폐지'(0원), 합병 종목은 '합병'(마지막 거래가 현금 정산), 표기가 없으면 '거래정지'(마지막 거래가 평가).
import { tierOf, stageOf, raise, addStress } from './rules.js';
import { krNum } from './num.js';
import EXTRA from '../data/market/extra.js';

export const ADULT_YM = 200803; // 본인 명의 시작(문서 2.0)
export const RULES = {
  DERIV_FLAG: '파생교육', // 2014-12 이후 선물 개방 조건
  OVERSEAS_YM: 201003, PHONE_ORDER_YM: 200501, PHONE_FEE: 0.01, ISLAND_FEE: 0.003, DERIV_EDU_YM: 201412, // 해외 주식: 2005년부터 전화·지점 주문(수수료는 게임용 추정), 2010-03부터 온라인
  FX_SPREAD: 0.0175, FX_MIN_USD: 100, COIN_FEE: 0.0005, COIN_MIN_WON: 5000, COIN_STEP: 10000,
  OVERSEAS_FEE: 0.0025, OVERSEAS_TAX: 0.22, OVERSEAS_DEDUCT: 2500000,
  INTEREST_TAX: 0.154, DEPOSIT_MIN: 10000, SAVING_MIN: 10000, SAVING_TERM: 12, SAVING_EARLY: 0.25,
  MAX_HOMES: 5, LAND_MIN_SQM: 100, LAND_BUY_TAX: 0.046, LAND_HOLD: 0.005, WORLD_HOLD: 0.01,
  AUCTION_RATE: 0.8, AUCTION_LATE: 3,
  FUT_MARGIN: 0.15, FUT_KEEP: 0.10, FUT_FEE: 0.00003,
  LARGE_LOW: 0.22, LARGE_HIGH: 0.275, LARGE_BRACKET: 300000000,
  LARGE_LINE: [[200001, 1e10], [201307, 5e9], [201604, 2.5e9], [201804, 1.5e9], [202004, 1e9], [202401, 5e9]], // 코스피 금액 기준(옛 표, 화면 설명용)
  // 대주주 기준: [시작 달, 코스피 [지분율, 금액], 코스닥 [지분율, 금액]]. 직전 연말 보유로 판정하고, 지분율은 올해 중 넘긴 때부터도 대주주다.
  // 2013-07 이후는 시행령 개정 이력, 그 전(3%·100억, 5%·50억)은 게임용 추정.
  LARGE_TABLE: [[200001, [0.03, 1e10], [0.05, 5e9]], [201307, [0.02, 5e9], [0.04, 4e9]], [201604, [0.01, 2.5e9], [0.02, 2e9]], [201804, [0.01, 1.5e9], [0.02, 1.5e9]], [202004, [0.01, 1e9], [0.02, 1e9]], [202401, [0.01, 5e9], [0.02, 5e9]]],
  LARGE_SHORT: 0.33, LARGE_BRACKET_YEAR: 2018, // 1년 안 된 주식(중소기업 외) 33%, 2018년부터 과표 3억 초과 27.5%
  FLOAT_RATIO: 0.5, // 시장에 풀린 물량: 상장주식의 절반으로 가정
};
const IDS = { 예금: '예금', 적금: '적금', 선물: 'fut:kospi200' };
export const CATEGORIES = [
  { id: '예금', label: '예금' }, { id: '적금', label: '적금' },
  { id: '국내주식', label: '국내 주식' }, { id: '해외주식', label: '해외 주식' },
  { id: 'ETF', label: 'ETF' }, { id: '채권', label: '채권' }, { id: '외화', label: '외화' },
  { id: '선물', label: '선물' }, { id: '코인', label: '코인' },
  { id: '부동산', label: '부동산' }, { id: '해외부동산', label: '해외 랜드마크' }, { id: '토지', label: '토지' },
];
// 투자 탭 묶음(초안 4.1). 내 자산, 결산, 계좌 준비는 화면에서 앞뒤로 붙인다.
export const MENU = { 금융: ['예금', '적금', '국내주식', '해외주식', 'ETF', '채권', '외화', '선물', '코인'], 실물: ['부동산', '해외부동산', '토지'] };
export const DISCLAIMER = '실제 기업·지수 이름을 쓴 역사 시뮬레이션입니다. 해당 기업과 관계없고 투자 조언이 아닙니다.';
const HOUSE = ['부동산', '해외부동산'];
const KR_COIN_OPEN = { btc: 201309, eth: 201603, xrp: 201705, doge: 202102 }; // 국내 첫 원화 거래 달(문서 2.0)
const CCY = { USD: ['usd', 1], JPY: ['jpy100', 0.01], EUR: ['eur', 1], GBp: ['gbp', 0.01], CHF: ['chf', 1], HKD: ['hkd', 1], DKK: ['dkk', 1] };
const won = Math.round;
const ymOf = (s) => s.year * 100 + s.month;
export const fmtWon = (n) => krNum(n);
// 받침으로 조사 고르기. 끝 글자가 한글이 아니면 숫자·영문 읽는 소리까지 따지지 않고 앞쪽 조사를 쓴다.
export function josa(name, pair) {
  const c = String(name).charCodeAt(String(name).length - 1), [a, b] = pair.split('/');
  if (c < 0xac00 || c > 0xd7a3) return name + a;
  return name + ((c - 0xac00) % 28 ? a : b);
}
// 화면 이름과 검색 별칭을 나눈다. '(상장폐지)'는 미래를 알려 주므로 이름에서 뺀다.
// '현재이름(구 A/B)'에서 시기 표가 없으면 언제 바뀌었는지 모르므로 가장 옛 이름을 화면에 쓰고, 나머지는 검색 별칭으로만 쓴다.
// 토지 이름의 괄호에는 뒷날 낙찰가·순위 같은 설명이 들어 있어 뺀다(cat 또는 '낙찰'로 알아본다).
export function cleanName(raw, cat = null) {
  let name = String(raw).replace(/\s*\(상장폐지\)\s*/g, '').replace(/\(기존\)/g, '').trim();
  if (cat === '토지' || /낙찰/.test(name)) name = name.replace(/\s*\(.*$/, '').trim();
  const old = [...name.matchAll(/\(구 ([^)]+)\)/g)].flatMap((m) => m[1].split('/')).map((x) => x.trim());
  const now = name.replace(/\s*\(구 [^)]+\)/g, '').trim();
  return { name: old[0] ?? now, old, alias: old.length ? [now, ...old.slice(1)] : [] };
}
// 시장 값 정리. 'KOSDAQ→KOSPI(2024-01-02 이전상장)'은 그 달부터 KOSPI, 다른 괄호 메모는 지운다.
export function cleanMarket(raw) {
  const t = String(raw ?? '').trim(), m = t.match(/^(.+?)→(.+?)(?:\((\d{4})-(\d{2}).*\))?$/);
  const bare = (x) => x.replace(/\s*\(.*$/, '').trim();
  if (m) return { market: bare(m[1]), next: bare(m[2]), from: m[3] ? `${m[3]}-${m[4]}` : null };
  return { market: bare(t), next: null, from: null };
}

let M = null;
export const isLoaded = () => !!M;
function need() { if (!M) throw new Error('시세 자료를 먼저 loadMarket으로 넣어야 합니다.'); return M; }

// ---------- 시세 자료 ----------
export function loadMarket(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('시세 자료가 없습니다.');
  const m = { x: null, n: 0, y0: 0, m0: 0, assets: new Map(), cats: {}, fx: {}, rates: {}, macro: {} };
  const files = ['kospi', 'kosdaq', 'global', 'etf', 'coins', 'fx', 'land', 're_kr', 're_world', 'macro', 'rates'];
  for (const k of files) {
    const f = obj[k]; if (!f) continue;
    if (!Array.isArray(f.x) || !f.series || !Array.isArray(f.items)) throw new Error('시세 파일 모양이 다릅니다: ' + k);
    if (!m.x) { m.x = f.x; m.n = f.x.length; [m.y0, m.m0] = f.x[0].split('-').map(Number); }
    else if (f.x.length !== m.n || f.x[0] !== m.x[0] || f.x[m.n - 1] !== m.x[m.n - 1]) throw new Error('달 목록이 서로 다릅니다: ' + k);
  }
  if (!m.x) throw new Error('쓸 수 있는 시세 파일이 없습니다.');
  const add = (item, series, cat, extra = {}) => {
    if (!series) return;
    let first = series.findIndex((v) => v != null); if (first < 0) return;
    let last = series.length - 1; while (series[last] == null) last--;
    const id = extra.id ?? item.id;
    const clean = cleanName(item.name, cat), mk = cleanMarket(item.market);
    const a = { id, name: clean.name, notes: item.notes ?? '', oldNames: clean.old, alias: clean.alias, names: EXTRA.names[id] ?? null, delisted: /상장폐지/.test(item.name), merged: EXTRA.merged[id] ?? null, shares: item.shares ?? null, sharesEst: !!item.sharesEst, ticker: String(item.ticker ?? '').replace(/\.(KS|KQ)$/, ''), cat, sector: item.sector || '', market: mk.market, marketNext: mk.next, marketFrom: mk.from, ccy: 'KRW', scale: 1, series, first, last, item, ...extra };
    m.assets.set(id, a); (m.cats[cat] ??= []).push(id);
  };
  const stocks = (f, cat) => obj[f] && obj[f].items.forEach((it) => add(it, obj[f].series[it.id], cat, { ccy: it.unit === 'KRW' ? 'KRW' : it.unit, scale: null }));
  stocks('kospi', '국내주식'); stocks('kosdaq', '국내주식'); stocks('global', '해외주식');
  if (obj.etf) obj.etf.items.forEach((it) => {
    const bond = it.sector === '채권' || /채권|국채/.test(it.name);
    add(it, obj.etf.series[it.id], bond ? '채권' : 'ETF', { ccy: it.unit, scale: null, broad: /지수/.test(it.sector) });
  });
  if (obj.coins) obj.coins.items.forEach((it) => add(it, obj.coins.series[it.id], '코인', { open: KR_COIN_OPEN[it.id] })); // 코인 값은 모두 원화 환산본
  if (obj.fx) obj.fx.items.forEach((it) => { m.fx[it.id] = obj.fx.series[it.id]; add(it, obj.fx.series[it.id], '외화', { id: 'fx:' + it.id }); });
  if (obj.land) obj.land.items.forEach((it) => add(it, obj.land.series[it.id], '토지'));
  if (obj.re_kr) obj.re_kr.items.forEach((it) => add(it, obj.re_kr.series[it.id], '부동산', { scale: 10000, rent: it.rent, region: it.ticker }));
  if (obj.re_world) obj.re_world.items.forEach((it) => add(it, obj.re_world.series[it.id], '해외부동산', { scale: 10000, rent: it.rent, region: it.ticker }));
  if (obj.macro) obj.macro.items.forEach((it) => { m.macro[it.id] = obj.macro.series[it.id]; });
  if (obj.rates) obj.rates.items.forEach((it) => { m.rates[it.id] = obj.rates.series[it.id]; });
  if (m.macro.kospi200) { // 선물: 코스피200 한 종목
    const it = { id: IDS.선물, name: '코스피200 선물', market: '선물' };
    m.assets.set(it.id, { ...it, cat: '선물', ccy: 'KRW', scale: 1, series: m.macro.kospi200, first: 0, last: m.n - 1, item: it });
    m.cats.선물 = [it.id];
  }
  M = m; return summaryOfLoad(m);
}
const summaryOfLoad = (m) => ({ months: m.n, from: m.x[0], to: m.x[m.n - 1], assets: m.assets.size });

// 이번 달 위치. 자료가 끝난 뒤(2026-11~)는 마지막 달 값을 쓰고 ended=true(기억이 끝난 달)
function pos(s) {
  const m = need(); const raw = (s.year - m.y0) * 12 + (s.month - m.m0);
  return { i: Math.min(raw, m.n - 1), raw, ended: raw > m.n - 1 };
}
const ccyRate = (ccy, i) => {
  if (ccy === 'KRW') return 1; const c = CCY[ccy]; if (!c) return null;
  const v = need().fx[c[0]]?.[i]; return v == null ? null : v * c[1];
};
const scaleAt = (a, i) => (typeof a.scale === 'number' ? a.scale : ccyRate(a.ccy, i));
export function statusAt(a, i) {
  if (i < a.first) return '미상장';
  if (i > a.last) return a.merged != null ? '합병' : a.delisted ? '상장폐지' : '거래정지';
  return a.series[i] == null ? '거래정지' : '정상';
}
// 화면에 보이는 상태 말. 증권과 코인만 '미상장'이고, 집은 '분양 전', 외화·선물처럼 상장과 무관한 것은 '거래 전'.
const LISTED = ['국내주식', '해외주식', 'ETF', '코인'];
export const statusLabel = (status, cat) => (status !== '미상장' || LISTED.includes(cat) ? status : HOUSE.includes(cat) ? '분양 전' : '거래 전');
// 그 시기 이름. 시기별 자료가 있으면 그 달까지 지난 이름 중 마지막(첫 이름 전이면 첫 이름).
function nameAt(a, i) {
  if (!a.names) return a.name;
  const ym = need().x[i]; let cur = a.names[0].ko;
  for (const n of a.names) if (n.from <= ym) cur = n.ko;
  return cur;
}
const pastNames = (a, i) => { if (!a.names) return []; const ym = need().x[i], now = nameAt(a, i); return [...new Set(a.names.filter((n) => n.from <= ym && n.ko !== now).map((n) => n.ko))]; };
// 그 달의 시장. 이전 상장 달이 지나면 옮겨 간 시장을 쓴다. 이전 달을 모르면 처음 시장 그대로.
function marketAt(a, i) { return a.marketNext && a.marketFrom && need().x[i] >= a.marketFrom ? a.marketNext : a.market; }
export const marketOfNow = (s, id) => { const a = asset(id); return a ? marketAt(a, pos(s).i) : ''; };
// 원화 단가. stale=true면 빈 달에 마지막 거래가를 쓴다(평가용). 값이 없으면 null.
function priceAt(a, i, stale = false) {
  let j = i; if (stale) while (j > a.first && a.series[j] == null) j--;
  const v = a.series[j]; if (v == null || i < a.first) return null;
  const k = scaleAt(a, i); return k == null ? null : v * k;
}
const asset = (id) => need().assets.get(id);
const rateAt = (id, i) => { const r = need().rates[id]; if (!r) return null; for (let j = i; j >= 0; j--) if (r[j] != null) return r[j]; return null; };
// 이달 금리(연 %). 화면은 이것만 부른다.
export const rateNow = (s, id) => rateAt(id, pos(s).i);

// ---------- 상태 ----------
export function init(s) {
  const p = (s.portfolio ??= {});
  const d = { pos: {}, deposit: 0, savings: [], loans: {}, living: {}, fut: null, traded: {}, taxDue: 0, history: [], lastMonth: 0, prevNw: null, lastInterest: 0, lastRent: 0,
    ledger: [], yearStats: null, annual: {}, closeBase: {}, divBase: {}, firstHome: null };
  for (const k of Object.keys(d)) if (p[k] === undefined) p[k] = d[k];
  return p;
}
const emptyStats = (year, start = null) => ({ year, start, track: [], realized: { 국내: 0, 해외: 0, 코인: 0, 부동산: 0, 기타: 0 }, dividends: 0, interest: 0, rent: 0, gifts: 0, prizes: 0, settled: 0, loanInterest: 0, taxes: 0, fees: 0, largeGain: 0, largeShort: 0, overseasGain: 0, derivGain: 0, houseTax: 0, finGross: 0, biggestTrade: null, biggestDividend: null });
function statsOf(s) { const p = init(s); return (p.yearStats ??= emptyStats(s.year)); }
// 돈이 들고 날 때 이달 내역과 올해 집계에 함께 적는다. key는 yearStats 칸 이름(없으면 내역만).
export function addMoney(s, label, amount, key = null) {
  const p = init(s); amount = won(amount); s.cash += amount;
  note(p, label, amount); if (key) statsOf(s)[key] += Math.abs(amount);
  return amount;
}
const note = (p, label, amount) => { if (amount) p.ledger.push({ label, amount }); };

// ---------- 개방 ----------
const OK = { ok: true };
const no = (why) => ({ ok: false, why });
// 계좌 없음의 다음 단계 안내. 대회 입상 -> 부모님 허락 -> 은행 방문, 성인은 은행 방문만(설계 6.0).
export function accountWhy(s) {
  const f = s.flags ?? {};
  if (ymOf(s) >= ADULT_YM) return { ok: false, why: '은행에 가면 계좌를 열 수 있습니다.', need: { step: '은행' } };
  if (f.guardianConsent) return { ok: false, why: '부모님과 은행에 가면 계좌를 열 수 있습니다.', need: { step: '은행' } };
  if (f.contestPassed) return { ok: false, why: f.contestParentsTalk ? '부모님과 다시 상의해 허락을 받아야 합니다.' : '입상 소식을 부모님께 말씀드리면 계좌 이야기를 할 수 있습니다.', need: { step: '허락' } };
  return { ok: false, why: '여름 모의투자 대회에서 입상하면 부모님과 계좌를 열 수 있습니다.', need: { step: '입상' } };
}
const hasAccount = (s) => !!s.account;
export function access(s, cat, a) {
  const ym = ymOf(s), adult = ym >= ADULT_YM, f = s.flags ?? {};
  const foreign = a ? a.ccy !== 'KRW' : false;
  switch (cat) {
    case '예금': case '적금': case '외화': return OK; // 외화는 예금처럼 은행에서(초안 2.0)
    case '국내주식': case 'ETF': case '채권': case '해외주식':
      if ((foreign || cat === '해외주식') && ym < RULES.PHONE_ORDER_YM && !f.힐_계좌) return no('2005년 1월부터 증권사 전화 주문으로 살 수 있습니다.');
      return hasAccount(s) ? OK : accountWhy(s);
    case '코인': {
      if (!adult) return no('성인이 되면');
      const from = a ? (a.open ?? 201309) : 201309; // 첫 달을 조사한 4종 밖은 국내 첫 원화 거래(2013-09) 앞으로 가지 않는다
      if (ym < from) return no(`국내 거래소에 ${Math.floor(from / 100)}년 ${from % 100}월부터 올라옵니다.`);
      return OK;
    }
    case '선물':
      if (!adult) return no('성인이 되면');
      return ym < RULES.DERIV_EDU_YM || f[RULES.DERIV_FLAG] ? OK : no('파생상품 교육을 먼저 받아야 합니다.');
    case '부동산': case '토지': return adult ? OK : no('성인이 되면');
    case '해외부동산':
      if (!adult) return no('성인이 되면');
      return ym >= RULES.OVERSEAS_YM ? OK : no('2010년 3월부터');
    default: return no('알 수 없는 분류');
  }
}
export function categories(s) {
  return CATEGORIES.map((c) => { const g = access(s, c.id); return { ...c, open: g.ok, why: g.why ?? null, need: g.need ?? null, count: need().cats[c.id]?.length ?? (c.id === '예금' || c.id === '적금' ? 1 : 0) }; });
}

// ---------- 조회 ----------
export function quote(s, id) {
  const a = asset(id); if (!a) return null; const { i, ended } = pos(s);
  const st = statusAt(a, i), price = priceAt(a, i), prev = i > 0 ? priceAt(a, i - 1) : null;
  const g = access(s, a.cat, a);
  let why = null; const ok = st === '정상' && price != null && price > 0;
  if (!g.ok) why = g.why; else if (st !== '정상') why = st === '미상장' ? (HOUSE.includes(a.cat) ? '아직 분양 전입니다.' : '아직 거래가 시작되지 않았습니다.') : st === '거래정지' ? '거래정지 중입니다.' : st === '합병' ? '합병으로 거래가 끝났습니다.' : '상장폐지되어 거래할 수 없습니다.'; else if (!ok) why = '가격이 없습니다.';
  // 마지막 거래 달의 안내. 그 달이 되어야만 보인다.
  let notice = null;
  if (i === a.last && a.last < need().n - 1 && st === '정상' && !ended) {
    if (a.merged != null) notice = '합병으로 이번 달이 마지막 거래입니다. 남은 주식은 다음 달 이번 달 값으로 현금 정산됩니다.';
    else if (a.delisted) notice = '정리매매 중입니다. 이번 달이 팔 수 있는 마지막 달입니다.';
  }
  return { id, name: nameAt(a, i), oldNames: pastNames(a, i), ticker: a.ticker, market: marketAt(a, i), cat: a.cat, sector: a.sector, status: st, price, prev, change: !ended && price && prev ? price / prev - 1 : null, tradable: g.ok && ok, why, need: g.need ?? null, notice, ended, ccy: a.ccy, native: a.series[i] ?? null };
}
export function listAssets(s, cat) {
  const p = init(s);
  return (need().cats[cat] ?? []).map((id) => ({ ...quote(s, id), held: p.pos[id]?.qty ?? 0 }));
}
export function priceOf(s, id) { const a = asset(id); return a ? priceAt(a, pos(s).i) : null; }
export function priceOfAt(id, year, month) { const a = asset(id), m = need(); return a ? priceAt(a, (year - m.y0) * 12 + (month - m.m0)) : null; }
export function indices(s) {
  const { i } = pos(s), mc = need().macro, g = (k) => mc[k]?.[i] ?? null;
  return { 코스피: g('kospi'), 코스닥: g('kosdaq'), 나스닥: g('nasdaq'), 원달러: g('usdkrw'), 기준금리: rateAt('kr_base_rate', i) };
}

// ---------- 비용·세금 ----------
// 힐아일랜드 계좌(flags.힐_계좌): 해외 주식 전화 주문 수수료가 낮다(data/events_island.js).
function feeRate(a, ym, s) {
  if (a.cat === '코인') return RULES.COIN_FEE; if (a.cat === '외화') return RULES.FX_SPREAD;
  if (HOUSE.includes(a.cat) || a.cat === '토지') return 0; // 중개보수는 넣지 않는다(문서 2.8.2)
  if (a.ccy !== 'KRW') return ym < RULES.OVERSEAS_YM ? (s?.flags?.힐_계좌 ? RULES.ISLAND_FEE : RULES.PHONE_FEE) : RULES.OVERSEAS_FEE;
  return ym < 200005 ? 0.001 : ym < 200805 ? 0.00025 : 0.00015;
}
const SALE_TAX = [[200001, 0.003], [201905, 0.0025], [202101, 0.0023], [202301, 0.002], [202401, 0.0018], [202501, 0.0015], [202601, 0.002]];
const saleTax = (a, ym) => (a.cat === '국내주식' ? SALE_TAX.filter((r) => r[0] <= ym).pop()[1] : 0);
// 취득세(설계 A.7, 초안 2.8.4). 다주택 중과는 2020-08부터 규제지역 2주택째 8%, 3주택째부터 12%.
export function acquisitionRate(price, ym, owned = 0, regulated = false) {
  if (ym >= 202008 && regulated && owned >= 1) return owned >= 2 ? 0.12 : 0.08;
  if (price > 9e8) return ym < 201312 ? 0.04 : 0.03;
  if (price <= 6e8) return ym < 201312 ? 0.02 : 0.01;
  if (ym < 202001) return 0.02;
  return (price / 1e8 * 2 / 3 - 3) / 100;
}
const highPrice = (ym) => (ym < 200812 ? 6e8 : ym < 202112 ? 9e8 : 1.2e9);
const holdNeed = (ym) => (ym < 201207 ? 36 : 24);
// 양도세(설계 A.7). 요건을 채운 1주택은 기준까지 비과세, 넘으면 기준 초과분 비례로 20%.
export function houseTransferTax({ cat, gain, gross, months, ym, onlyHome }) {
  if (gain <= 0) return 0;
  const hi = ym >= 202106;
  if (months < 12) return won(gain * (hi ? 0.7 : 0.5));
  if (months < 24) return won(gain * (hi ? 0.6 : 0.4));
  if (cat === '토지') return won(gain * 0.4);
  if (cat === '부동산' && onlyHome && months >= holdNeed(ym)) {
    const high = highPrice(ym);
    return gross <= high ? 0 : won(gain * (gross - high) / gross * 0.2);
  }
  if (cat === '부동산' && onlyHome) return won(gain * 0.2); // 2년 넘었지만 보유 요건 미달(2012-06 전)
  return won(gain * 0.24); // 다주택·해외: 단순화한 대표값
}

// ---------- 매수·매도 ----------
function qtyOk(a, qty, buying) {
  if (typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0) return '수량이 올바르지 않습니다.';
  const step = (x, k) => Math.abs(x * k - Math.round(x * k)) < 1e-6;
  if (HOUSE.includes(a.cat)) return qty === 1 ? null : '한 채씩만 거래합니다.';
  if (a.cat === '코인') return step(qty, RULES.COIN_STEP) ? null : '코인은 0.0001개 단위입니다.';
  if (a.cat === '외화') return step(qty, 100) ? null : '외화는 소수 둘째 자리까지입니다.';
  if (!Number.isInteger(qty)) return '수량은 정수여야 합니다.';
  if (a.cat === '토지' && buying && qty < RULES.LAND_MIN_SQM) return `토지는 ${RULES.LAND_MIN_SQM}㎡부터 살 수 있습니다.`;
  if (a.cat === '선물') return '선물은 openFuture를 씁니다.';
  return null;
}
function tradeGate(s, a) {
  if (s.ended) return no('이야기가 끝났습니다.');
  const q = quote(s, a.id); if (!q.tradable) return no(q.why); return { ok: true, price: priceAt(a, pos(s).i) };
}
const homesOwned = (p) => Object.keys(p.pos).filter((k) => HOUSE.includes(asset(k)?.cat)).length;
const regionOf = (a) => a.region || '';
const SEOUL3 = ['서울 강남', '서울 서초', '서울 송파'];
const GG5 = ['경기 과천', '경기 분당', '경기 판교', '경기 광교', '경기 위례'];
export function isRegulated(region, ym) {
  if (ym < 200209) return false;
  const seoul = region.startsWith('서울');
  if (ym < 201708) return SEOUL3.includes(region);
  if (ym < 202212) return seoul || ['경기 과천', '경기 분당'].includes(region);
  if (ym < 202510) return [...SEOUL3, '서울 용산'].includes(region);
  return seoul || GG5.includes(region);
}
// 시기별 LTV(문서 2.8.3). 규제지역과 그 외 두 칸. [A] 표시 값이 많아 실제와 다를 수 있다.
export const LTV_TABLE = [
  { from: 200001, 규제: 0.7, 그외: 0.7, note: '은행 자율' },
  { from: 200209, 규제: 0.6, 그외: 0.7, note: '투기과열지구' },
  { from: 200310, 규제: 0.4, 그외: 0.6, note: '10·29 대책, 투기지역' },
  { from: 201408, 규제: 0.7, 그외: 0.7, note: '일괄 완화' },
  { from: 201708, 규제: 0.4, 그외: 0.6, note: '8·2 대책' },
  { from: 201912, 규제: 0.4, 그외: 0.6, note: '9억 초과분 20%, 15억 초과 대출 금지' },
  { from: 202212, 규제: 0.5, 그외: 0.7, note: '규제지역 50% 단일, 15억 초과 허용' },
  { from: 202506, 규제: 0.5, 그외: 0.7, note: '수도권 주담대 최대 6억' },
  { from: 202510, 규제: 0.4, 그외: 0.7, note: '서울 전역 규제, 유주택 0%, 가격대별 한도 6억·4억·2억' },
];
export const ltvTable = () => LTV_TABLE.map((r) => ({ ...r }));
export function ltvInfo(ym, region, price, owned = 0) {
  const row = LTV_TABLE.filter((r) => r.from <= ym).pop(); const reg = isRegulated(region, ym);
  const ltv = reg ? row.규제 : row.그외; let limit = price * ltv;
  if (reg && ym >= 201912 && ym < 202212) limit = price > 1.5e9 ? 0 : Math.min(price, 9e8) * 0.4 + Math.max(0, price - 9e8) * 0.2;
  if (ym >= 202506 && /^(서울|경기|인천)/.test(region)) limit = Math.min(limit, 6e8);
  if (ym >= 202510 && reg) limit = owned > 0 ? 0 : Math.min(limit, price <= 1.5e9 ? 6e8 : price <= 2.5e9 ? 4e8 : 2e8);
  return { ltv, regulated: reg, limit: Math.max(0, Math.floor(limit)), note: row.note };
}
const hasIncome = (s) => ymOf(s) >= ADULT_YM && (!!s.company || stageOf(s) === '사회인');
const mortgageRate = (i) => rateAt('kr_loan_mortgage', i) ?? rateAt('kr_loan_household', i) ?? 0;
export function loanLimit(s, id) {
  const p = init(s), a = asset(id); if (!a || a.cat !== '부동산') return { ok: false, why: '대출은 국내 부동산만 됩니다.', limit: 0 };
  if (!hasIncome(s)) return { ok: false, why: '소득이 있어야 대출을 받을 수 있습니다.', limit: 0 };
  const price = priceAt(a, pos(s).i, true); const owned = homesOwned(p) - (p.pos[id] ? 1 : 0);
  const info = ltvInfo(ymOf(s), regionOf(a), price, owned);
  const left = Math.max(0, info.limit - (p.loans[id]?.principal ?? 0));
  return { ok: true, ...info, limit: left };
}

const realizedKey = (a) => (a.cat === '국내주식' || (a.ccy === 'KRW' && ['ETF', '채권'].includes(a.cat)) ? '국내' : ['해외주식', 'ETF', '채권'].includes(a.cat) ? '해외' : a.cat === '코인' ? '코인' : HOUSE.includes(a.cat) || a.cat === '토지' ? '부동산' : '기타');
const isOverseasGain = (a) => a.ccy !== 'KRW' && ['해외주식', 'ETF', '채권'].includes(a.cat);
const largeLine = (ym) => RULES.LARGE_LINE.filter((r) => r[0] <= ym).pop()[1];
// 그 달 그 시장의 대주주 기준 [지분율, 금액]
export function largeRule(ym, market = 'KOSPI') { const r = RULES.LARGE_TABLE.filter((x) => x[0] <= ym).pop(); return /KOSDAQ|코스닥/i.test(market) ? r[2] : r[1]; }
// 이 종목에서 대주주인가: 작년 말 평가액이나 지분율, 또는 올해 지분율 기준을 넘긴 적이 있다.
function isLarge(s, a) {
  if (a.cat !== '국내주식') return false;
  const p = init(s), ym = ymOf(s), [pct, amt] = largeRule(ym, marketAt(a, pos(s).i));
  if ((p.closeBase[a.id] ?? 0) >= amt) return true;
  if (a.shares && (p.divBase?.[a.id] ?? 0) / a.shares >= pct) return true;
  return p.largeNow?.[a.id] === s.year;
}
export const isLargeHolder = (s, id) => { const a = asset(id); return a ? isLarge(s, a) : false; };
// 지분율(0~1). 상장주식 수를 모르면 null.
export function stakeOf(s, id, extra = 0) { const a = asset(id); if (!a?.shares) return null; return ((init(s).pos[id]?.qty ?? 0) + extra) / a.shares; }
// 주문 화면의 대주주 안내. 해당 없으면 ''.
export function stakeNote(s, id, side, qty) {
  const a = asset(id); if (!a || a.cat !== '국내주식') return '';
  const [pct, amt] = largeRule(ymOf(s), marketAt(a, pos(s).i)), now = isLarge(s, a), pctTxt = `${+(pct * 100).toFixed(1)}%`, amtTxt = `${amt / 1e8}억`;
  if (side === 'buy') {
    const after = a.shares ? ((init(s).pos[id]?.qty ?? 0) + qty) / a.shares : 0;
    if (!now && after >= pct) return `지분이 ${pctTxt}를 넘어 올해부터 대주주가 됩니다. 이 종목을 팔면 다음 해 5월에 양도세(1년 안 된 몫 33%)가 나옵니다.`;
    return now ? '이 종목의 대주주입니다. 팔 때 양도세가 나옵니다.' : `대주주 기준: 지분 ${pctTxt} 이상, 또는 연말 보유액 ${amtTxt} 이상.`;
  }
  if (!now) return '';
  const h = init(s).pos[id]; const short = h && pos(s).i - h.since < 12;
  return `대주주라 양도세 대상입니다. ${short ? '산 지 1년이 안 되어 33%입니다.' : `${ymOf(s) >= RULES.LARGE_BRACKET_YEAR * 100 ? '3억까지 22%, 넘는 몫 27.5%' : '22%'}입니다.`}`;
}
// 더 살 수 있는 수량. 주식이 아니거나 상장주식 수를 모르면 null(제한 없음).
export function buyRoom(s, id) {
  const a = asset(id); if (!a?.shares || !['국내주식', '해외주식'].includes(a.cat)) return null;
  return Math.max(0, Math.floor(a.shares * RULES.FLOAT_RATIO) - (init(s).pos[id]?.qty ?? 0));
}
function bigTrade(s, a, side, gross) { const st = statsOf(s); if (!st.biggestTrade || gross > st.biggestTrade.gross) st.biggestTrade = { id: a.id, name: nameAt(a, pos(s).i), side, gross }; }

// 값 바꾸지 않는 계산. 돈·한도 부족이면 ok:false에 short와 금액을 함께 돌려준다(미리보기용).
export function orderCost(s, id, side, qty) {
  const a = asset(id); if (!a) return null; const ym = ymOf(s), p = init(s), { i } = pos(s);
  const price = priceAt(a, i); if (price == null) return null; const gross = won(qty * price);
  const fee = won(gross * feeRate(a, ym, s));
  if (side === 'buy') {
    let tax = 0;
    if (a.cat === '토지') tax = won(gross * RULES.LAND_BUY_TAX);
    if (a.cat === '부동산') tax = won(gross * acquisitionRate(gross, ym, homesOwned(p), isRegulated(regionOf(a), ym)));
    return { price, gross, fee, tax };
  }
  return { price, gross, fee, tax: won(gross * saleTax(a, ym)) };
}
export function planBuy(s, id, qty, opts = {}) {
  const p = init(s), a = asset(id); if (!a) return no('없는 종목입니다.');
  if (a.cat === '선물') return no('선물은 openFuture를 씁니다.');
  const g0 = access(s, a.cat, a); if (!g0.ok) return g0;
  const g = tradeGate(s, a); if (!g.ok) return g;
  const bad = qtyOk(a, qty, true); if (bad) return no(bad);
  const room = buyRoom(s, id);
  if (room != null && qty > room) return { ...no(room > 0 ? `시장에 풀린 주식은 약 ${fmtWon(Math.floor(a.shares * RULES.FLOAT_RATIO))}주입니다. ${fmtWon(room)}주까지 더 살 수 있습니다.` : '시장에 풀린 주식을 다 가졌습니다. 더 살 수 없습니다.'), short: 'float', room };
  const { i } = pos(s), { price, gross, fee, tax } = orderCost(s, id, 'buy', qty);
  if (a.cat === '코인' && gross < RULES.COIN_MIN_WON) return no('최소 주문 금액은 5천 원입니다.');
  if (a.cat === '외화' && gross < won(RULES.FX_MIN_USD * ccyRate('USD', i))) return no('외화는 100달러 상당부터 바꿀 수 있습니다.');
  let loan = 0;
  if (HOUSE.includes(a.cat)) {
    if (p.pos[id]) return no('이미 가진 집입니다.');
    if (p.traded[id] === i) return no('같은 단지는 한 달에 한 번만 거래합니다.');
    if (homesOwned(p) >= RULES.MAX_HOMES) return no('집은 5채까지 가질 수 있습니다.');
    loan = won(opts.loan ?? 0);
    if (loan < 0) return no('대출 금액이 올바르지 않습니다.');
    if (loan > 0) { const L = loanLimit(s, id); if (!L.ok) return no(L.why); if (loan > L.limit) return no('대출 한도를 넘었습니다.'); }
  }
  const total = gross + fee + tax, base = { side: 'buy', id, name: nameAt(a, i), qty, price, gross, fee, tax, loan, total, cashAfter: s.cash - (total - loan) };
  if (total - loan > s.cash) return { ...base, ok: false, short: 'cash', why: '돈이 모자랍니다.' };
  return { ...base, ok: true };
}
export function buy(s, id, qty, opts = {}) {
  const r = planBuy(s, id, qty, opts); if (!r.ok) return r;
  const p = init(s), a = asset(id), { i } = pos(s), st = statsOf(s);
  s.cash -= r.total - r.loan;
  const h = (p.pos[id] ??= { qty: 0, cost: 0, since: i });
  if (!HOUSE.includes(a.cat) && h.qty > 0) h.since = Math.round((h.since * h.qty + i * qty) / (h.qty + qty)); // 보유 기간은 수량 가중 평균
  h.qty = Math.round((h.qty + qty) * 1e4) / 1e4; h.cost += r.total;
  if (a.cat === '국내주식' && a.shares && h.qty / a.shares >= largeRule(ymOf(s), marketAt(a, i))[0]) (p.largeNow ??= {})[id] = s.year;
  st.fees += r.fee; st.taxes += r.tax; bigTrade(s, a, '매수', r.gross);
  if (HOUSE.includes(a.cat)) {
    p.traded[id] = i; if (r.loan > 0) p.loans[id] = { principal: r.loan, late: 0, unpaid: 0 };
    if (opts.living) p.living = { [id]: true }; // 사는 집은 하나다
    p.firstHome ??= { ym: ymOf(s), name: r.name };
    s.log.push(`${josa(r.name, '을/를')} 샀습니다.`);
  }
  const extra = tradeHook(s, 'buy', id, qty, r);
  return { ...r, text: `${josa(r.name, '을/를')} ${qty}${unitOf(a)} 샀습니다.${extra}` };
}
// 매매 뒤에 부르는 연결(공시 규칙 src/disclose.js 등). 돌려준 text는 결과 문장 뒤에 붙는다.
const tradeHooks = [];
export const onTrade = (fn) => { if (!tradeHooks.includes(fn)) tradeHooks.push(fn); };
function tradeHook(s, side, id, qty, r) { let out = ''; for (const f of tradeHooks) { const x = f(s, side, id, qty, r); if (x?.back) r.back = (r.back ?? 0) + x.back; if (x?.text) out += ` ${x.text}`; } return out; }
const unitOf = (a) => (a.cat === '코인' ? '개' : a.cat === '외화' ? '' : a.cat === '토지' ? '㎡' : HOUSE.includes(a.cat) ? '채' : '주');

export function planSell(s, id, qty) {
  const p = init(s), a = asset(id); if (!a) return no('없는 종목입니다.');
  const h = p.pos[id]; if (!h || h.qty <= 0) return no('가지고 있지 않습니다.');
  const g = tradeGate(s, a); if (!g.ok) return g;
  const bad = qtyOk(a, qty, false); if (bad) return no(bad);
  if (qty > h.qty + 1e-9) return no('가진 수량보다 많습니다.');
  const { i } = pos(s), ym = ymOf(s), c = orderCost(s, id, 'sell', qty), { price, gross, fee } = c; let { tax } = c;
  if (a.cat === '코인' && gross < RULES.COIN_MIN_WON && qty < h.qty) return no('최소 주문 금액은 5천 원입니다.');
  if (HOUSE.includes(a.cat) && p.traded[id] === i) return no('같은 단지는 한 달에 한 번만 거래합니다.');
  const frac = qty >= h.qty - 1e-9 ? 1 : qty / h.qty, costPart = won(h.cost * frac);
  const loan = p.loans[id] ? p.loans[id].principal + p.loans[id].unpaid : 0;
  const estate = a.cat === '토지' || HOUSE.includes(a.cat);
  const houseTax = estate ? houseTransferTax({ cat: a.cat, gain: gross - costPart, gross, months: i - h.since, ym, onlyHome: homesOwned(p) === 1 }) : 0;
  const large = isLarge(s, a), overseas = isOverseasGain(a), short = large && i - h.since < 12;
  const deferred = estate || overseas || large; // 내년 5월에 작년 거래를 합산해 청구된다
  const st0 = statsOf(s), g0 = gross - fee - tax - costPart;
  const taxLater = deferred ? Math.max(0, yearTaxOf({ ...st0, houseTax: (st0.houseTax ?? 0) + houseTax, overseasGain: st0.overseasGain + (overseas ? g0 : 0), largeGain: st0.largeGain + (large && !short ? g0 : 0), largeShort: (st0.largeShort ?? 0) + (short ? g0 : 0) }).total - yearTaxOf(st0).total) : 0;
  const net = gross - fee - tax - loan;
  const base = { side: 'sell', id, name: nameAt(a, i), qty, price, gross, fee, tax, loan, net, gain: gross - fee - tax - costPart, costPart, deferred, large, short: !!short, houseTax, taxLater, cashAfter: s.cash + net };
  if (s.cash + net < 0) return { ...base, ok: false, short: 'cash', why: '대출을 갚을 돈이 모자랍니다.' };
  return { ...base, ok: true };
}
export function sell(s, id, qty) {
  const r = planSell(s, id, qty); if (!r.ok) return r;
  const p = init(s), a = asset(id), h = p.pos[id], { i } = pos(s), st = statsOf(s);
  s.cash += r.net; h.qty = Math.round((h.qty - qty) * 1e4) / 1e4; h.cost -= r.costPart;
  if (h.qty <= 0) delete p.pos[id];
  st.fees += r.fee; st.taxes += r.tax; st.realized[realizedKey(a)] += r.gain; bigTrade(s, a, '매도', r.gross);
  st.houseTax = (st.houseTax ?? 0) + r.houseTax;
  if (isOverseasGain(a)) st.overseasGain += r.gain;
  else if (r.large && r.short) st.largeShort = (st.largeShort ?? 0) + r.gain;
  else if (r.large) st.largeGain += r.gain;
  if (HOUSE.includes(a.cat)) { delete p.loans[id]; delete p.living[id]; p.traded[id] = i; s.log.push(`${josa(r.name, '을/를')} 팔았습니다.`); }
  const extra = tradeHook(s, 'sell', id, qty, r);
  return { ...r, text: `${josa(r.name, '을/를')} ${qty}${unitOf(a)} 팔았습니다.${extra}` };
}
// 금융소득 종합과세: 이자·배당이 기준을 넘은 만큼 누진세율로 더 낸다. 원천징수 15.4%는 뺀다.
const FIN_BANDS = [[5e7, 0.176], [8.8e7, 0.264], [1.5e8, 0.385], [3e8, 0.418], [5e8, 0.44], [1e9, 0.462], [Infinity, 0.495]];
export function financeExtra(gross, year) {
  const over = gross - (year <= 2012 ? 4e7 : 2e7); if (over <= 0) return 0;
  let tax = 0, from = 0;
  for (const [cut, rate] of FIN_BANDS) { tax += Math.max(0, Math.min(over, cut) - from) * Math.max(0, rate - RULES.INTEREST_TAX); from = cut; }
  return won(tax);
}
// 그해 거래로 다음 해 5월에 청구될 세금(연 합산). year가 없으면 최근 세율을 쓴다.
export function yearTaxOf(st) {
  const y = st.year ?? 9999;
  // 대주주: 1년 넘게 가진 몫은 22%(2018년부터 3억 초과 27.5%), 1년 안 된 몫은 33%. 손실은 서로 상계한다.
  const L0 = st.largeGain ?? 0, S0 = st.largeShort ?? 0;
  const L = Math.max(0, L0 + Math.min(0, S0)), S = Math.max(0, S0 + Math.min(0, L0));
  const large = won((y < RULES.LARGE_BRACKET_YEAR ? L * RULES.LARGE_LOW : Math.min(L, RULES.LARGE_BRACKET) * RULES.LARGE_LOW + Math.max(0, L - RULES.LARGE_BRACKET) * RULES.LARGE_HIGH) + S * RULES.LARGE_SHORT);
  const overseas = won(RULES.OVERSEAS_TAX * Math.max(0, st.overseasGain - RULES.OVERSEAS_DEDUCT));
  const deriv = y < 2016 ? 0 : won((y < 2018 ? 0.055 : 0.11) * Math.max(0, (st.derivGain ?? 0) - RULES.OVERSEAS_DEDUCT));
  const house = st.houseTax ?? 0, finance = financeExtra(st.finGross ?? 0, y);
  return { large, overseas, deriv, house, finance, total: large + overseas + deriv + house + finance };
}
// 현금 -> 예금 순서로 내고, 모자라면 체납으로 남겨 매달 가산세가 붙는다.
export function payTax(s, amount, label) {
  const p = init(s), st = statsOf(s); let left = won(amount);
  const fromCash = Math.min(left, Math.max(0, s.cash)); s.cash -= fromCash; left -= fromCash;
  const fromDep = Math.min(left, p.deposit); p.deposit -= fromDep; left -= fromDep;
  const paid = fromCash + fromDep; st.taxes += paid; if (paid) note(p, label, -paid);
  p.taxDue += left;
  return { paid, unpaid: left };
}
export const pendingYearTax = (s) => yearTaxOf(statsOf(s));
export function setResidence(s, id, living) { const p = init(s); if (!p.pos[id]) return no('가지고 있지 않습니다.'); if (living) p.living = { [id]: true }; else delete p.living[id]; return OK; }

// ---------- 대출 ----------
export function takeLoan(s, id, amount) {
  const p = init(s); amount = won(amount);
  if (!p.pos[id]) return no('가지고 있는 집이 아닙니다.'); if (!(amount > 0)) return no('대출 금액이 올바르지 않습니다.');
  const L = loanLimit(s, id); if (!L.ok) return no(L.why); if (amount > L.limit) return no('대출 한도를 넘었습니다.');
  const l = (p.loans[id] ??= { principal: 0, late: 0, unpaid: 0 }); l.principal += amount; s.cash += amount; return { ok: true, principal: l.principal };
}
export function repayLoan(s, id, amount) {
  const p = init(s), l = p.loans[id]; amount = won(amount);
  if (!l) return no('갚을 대출이 없습니다.'); if (!(amount > 0) || amount > l.principal) return no('금액이 올바르지 않습니다.'); if (amount > s.cash) return no('돈이 모자랍니다.');
  s.cash -= amount; l.principal -= amount; if (l.principal === 0 && l.unpaid === 0) delete p.loans[id]; return { ok: true, principal: l.principal };
}

// ---------- 예금·적금 ----------
export function depositMoney(s, amount) {
  const p = init(s); amount = won(amount); if (!(amount >= RULES.DEPOSIT_MIN)) return no('예금은 1만 원부터 넣을 수 있습니다.');
  if (amount > s.cash) return no('돈이 모자랍니다.'); s.cash -= amount; p.deposit += amount; return { ok: true, balance: p.deposit };
}
export function withdrawDeposit(s, amount) {
  const p = init(s); amount = won(amount); if (!(amount > 0) || amount > p.deposit) return no('금액이 올바르지 않습니다.');
  p.deposit -= amount; s.cash += amount; return { ok: true, balance: p.deposit };
}
export function openSavings(s, monthly) {
  const p = init(s), i = pos(s).i; monthly = won(monthly);
  if (!(monthly >= RULES.SAVING_MIN)) return no('적금은 월 1만 원부터입니다.'); if (monthly > s.cash) return no('돈이 모자랍니다.');
  s.cash -= monthly; p.savings.push({ monthly, n: 1, paid: monthly, rate: rateAt('kr_installment_bank', i) ?? 0, open: i }); return { ok: true, index: p.savings.length - 1 };
}
const savingInterest = (c, n) => c.monthly * c.rate / 100 / 12 * n * (n + 1) / 2;
// 적금 안내(초안 4.2): 넣은 돈, 금리, 만기, 만기까지 받을 세후 이자, 지금 해지하면 받는 돈.
export function savingsInfo(s) {
  const p = init(s), x = need().x;
  return p.savings.map((c, index) => ({ index, name: '정기적금', monthly: c.monthly, paid: c.paid, n: c.n, rate: c.rate, maturity: x[c.open + RULES.SAVING_TERM] ?? null, interest: won(savingInterest(c, RULES.SAVING_TERM) * (1 - RULES.INTEREST_TAX)), earlyBack: c.paid + won(savingInterest(c, c.n) * RULES.SAVING_EARLY * (1 - RULES.INTEREST_TAX)) }));
}
export function cancelSavings(s, index) {
  const p = init(s), c = p.savings[index]; if (!c) return no('그 적금이 없습니다.');
  const net = won(savingInterest(c, c.n) * RULES.SAVING_EARLY * (1 - RULES.INTEREST_TAX));
  s.cash += c.paid + net; p.savings.splice(index, 1); return { ok: true, back: c.paid + net };
}

// ---------- 선물(코스피200, 월말 정산) ----------
const multiplier = (ym) => (ym < 201703 ? 500000 : 250000);
export function openFuture(s, side, n) {
  const p = init(s), a = asset(IDS.선물); if (!a) return no('선물 자료가 없습니다.');
  const g = access(s, '선물'); if (!g.ok) return no(g.why); if (s.ended) return no('이야기가 끝났습니다.');
  side = side === 'long' ? 1 : side === 'short' ? -1 : side;
  if (p.fut) return no('이미 선물 계약이 있습니다.'); if (side !== 1 && side !== -1) return no('방향이 올바르지 않습니다.');
  if (!Number.isInteger(n) || n < 1) return no('계약 수가 올바르지 않습니다.');
  const lv = a.series[pos(s).i]; if (lv == null) return no('지수가 없는 달입니다.');
  const notional = won(lv * multiplier(ymOf(s)) * n), margin = won(notional * RULES.FUT_MARGIN), fee = won(notional * RULES.FUT_FEE);
  if (margin + fee > s.cash) return no('증거금이 모자랍니다.');
  s.cash -= margin + fee; statsOf(s).fees += fee; p.fut = { side, n, ref: lv, account: margin, margin, openFee: fee }; return { ok: true, margin, fee, level: lv };
}
export function closeFuture(s) {
  const p = init(s), f = p.fut; if (!f) return no('선물 계약이 없습니다.');
  const lv = asset(IDS.선물).series[pos(s).i]; if (lv == null) return no('지수가 없는 달입니다.');
  const pnl = won(f.side * (lv - f.ref) * multiplier(ymOf(s)) * f.n), fee = won(lv * multiplier(ymOf(s)) * f.n * RULES.FUT_FEE);
  const back = Math.max(0, f.account + pnl - fee); s.cash += back; p.fut = null;
  futRealized(s, f, back, fee); // 달마다 정산된 몫까지 합쳐 실현 손익으로 적는다
  return { ok: true, back, pnl };
}

// 계약 전체의 손익 = 돌려받은 돈 - 처음 증거금 - 진입 수수료.
function futRealized(s, f, back, closeFee = 0) {
  const st = statsOf(s); st.fees += closeFee;
  const pnl = back - f.margin - (f.openFee ?? 0); st.realized.기타 += pnl; st.derivGain = (st.derivGain ?? 0) + pnl;
}

const LATER_NAME = /지주|합병|사명|변경|전신|포괄적|상호|구 |옛 |분할|인수|개명|현 /;
// 그해 7월에서 8월 사이 실제로 움직인 국내 종목. 대회 후보는 여기서 고른다.
export function summerPool(year) {
  const m = need(), i = (year - m.y0) * 12 + (7 - m.m0), out = [];
  for (const a of m.assets.values()) {
    if (a.cat !== '국내주식' || statusAt(a, i) !== '정상' || statusAt(a, i + 1) !== '정상') continue;
    if (!a.names && LATER_NAME.test(a.notes)) continue; // 그때 없던 이름이 후보에 나오지 않게 한다
    const p = priceAt(a, i), q = priceAt(a, i + 1);
    if (p > 0 && q > 0) out.push({ id: a.id, name: nameAt(a, i), sector: a.sector ?? '', ret: Math.round((q / p - 1) * 1000) / 10 });
  }
  return out.sort((x, y) => x.ret - y.ret);
}
// 파생상품 교육(2014-12부터 선물 조건, 초안 2.6). 활동 칸 1.
export function takeDerivEducation(s) {
  const f = (s.flags ??= {}); if (f[RULES.DERIV_FLAG]) return no('이미 교육을 받았습니다.');
  if (ymOf(s) < RULES.DERIV_EDU_YM) return no('2014년 12월부터 필요한 교육입니다.');
  if (s.used >= s.capacity) return no('이번 달 활동 칸을 다 썼습니다.');
  s.used += 1; f[RULES.DERIV_FLAG] = true; raise(s, '지능', 0.5); addStress(s, 2); return { ok: true, text: '파생상품 사전 교육을 마쳤습니다.' };
}

// 지난달 말 상태 그대로의 평가(달을 넘기기 직전 값). 결산과 월별 기록에 쓴다.
function closeOfPrev(s) {
  const y = s.month === 1 ? s.year - 1 : s.year, m = s.month === 1 ? 12 : s.month - 1;
  const w = portfolio({ ...s, year: y, month: m });
  return { year: y, month: m, netWorth: w.netWorth, cash: w.cash, parts: w.parts, debt: w.debt, holdings: w.holdings };
}
// 1월: 올해 통계를 닫아 보관한다. 세금은 여기서 내지 않고 5월 고지서로 나온다(tax.js).
function closeYear(s, p, close) {
  const st = p.yearStats, bill = yearTaxOf(st);
  p.annual[st.year] = { year: st.year, close, stats: st, bill: { ...bill, paid: 0, unpaid: 0, pending: bill.total > 0 } };
  // 연말 기준값: 대주주 판단과 다음 해 4월 국내 배당의 기준 수량
  p.closeBase = {}; p.divBase = {};
  for (const h of close.holdings) { p.closeBase[h.id] = h.value; p.divBase[h.id] = h.qty; }
  p.yearStats = emptyStats(close.year + 1, close.netWorth);
}

// ---------- 월 넘김 ----------
export function onMonth(s) {
  if (!M) return s;
  const p = init(s), ym = ymOf(s), { i } = pos(s);
  if (p.lastMonth === ym) return s; p.lastMonth = ym;
  p.ledger = [];
  // 지난달 말 순자산이 portfolio().change의 기준이다.
  const close = closeOfPrev(s); p.prevNw = close.netWorth; p.yearStats ??= emptyStats(close.year, close.netWorth);
  if (p.yearStats.year === close.year) p.yearStats.track.push(close.netWorth);
  if (p.yearStats.year < s.year) closeYear(s, p, close);
  // 1. 예금 이자(그 달 1~2년 정기예금 금리 ÷ 12, 이자소득세 15.4%)
  if (p.deposit > 0) { const g = p.deposit * (rateAt('kr_deposit_bank_1to2y', i) ?? 0) / 100 / 12, v = won(g * (1 - RULES.INTEREST_TAX)); p.yearStats.finGross = (p.yearStats.finGross ?? 0) + g; p.deposit += v; p.yearStats.interest += v; note(p, '예금 이자', v); }
  // 2. 적금 납입·만기
  for (const c of [...p.savings]) {
    if (i - c.open >= RULES.SAVING_TERM) {
      const net = won(savingInterest(c, c.n) * (1 - RULES.INTEREST_TAX)); p.yearStats.finGross = (p.yearStats.finGross ?? 0) + savingInterest(c, c.n); s.cash += c.paid + net; p.savings.splice(p.savings.indexOf(c), 1); p.yearStats.interest += net; note(p, '적금 만기', c.paid + net);
      s.log.push('적금이 만기가 되어 원금과 이자를 받았습니다.');
    } else if (s.cash >= c.monthly) { s.cash -= c.monthly; c.paid += c.monthly; c.n += 1; }
    else { const k = cancelSavings(s, p.savings.indexOf(c)); s.log.push('적금을 낼 돈이 없어 중도 해지되었습니다.'); void k; }
  }
  // 3. 대출 이자(연체 3회면 경매)
  p.lastInterest = 0;
  for (const id of Object.keys(p.loans)) {
    const l = p.loans[id], due = won(l.principal * mortgageRate(i) / 100 / 12) + l.unpaid;
    if (s.cash >= due) { s.cash -= due; p.lastInterest += due; p.yearStats.loanInterest += due; note(p, '대출 이자', -due); l.late = 0; l.unpaid = 0; }
    else {
      l.late += 1; l.unpaid = due; s.log.push('대출 이자를 내지 못했습니다.');
      if (l.late >= RULES.AUCTION_LATE) {
        const a = asset(id), got = won(priceAt(a, i, true) * RULES.AUCTION_RATE);
        s.cash += Math.max(0, got - l.principal - l.unpaid); delete p.loans[id]; delete p.pos[id]; delete p.living[id];
        p.history.push({ ym, id, what: '경매' }); s.log.push(`${josa(nameAt(a, i), '이/가')} 경매로 넘어갔습니다.`);
      }
    }
  }
  // 4. 월세(살지 않는 집만, 그해 월세)
  p.lastRent = 0;
  for (const id of Object.keys(p.pos)) {
    const a = asset(id); if (!HOUSE.includes(a.cat) || p.living[id]) continue;
    const r = rentOf(a, s.year); if (r > 0) { s.cash += r; p.lastRent += r; p.yearStats.rent += r; note(p, `${nameAt(a, i)} 월세`, r); }
  }
  // 5. 선물 정산(월말 값만 있어 월중 마진콜은 보지 못한다)
  if (p.fut) {
    const f = p.fut, lv = asset(IDS.선물).series[i];
    if (lv != null) {
      f.account += won(f.side * (lv - f.ref) * multiplier(ym) * f.n); f.ref = lv;
      if (f.account < won(lv * multiplier(ym) * f.n * RULES.FUT_KEEP)) {
        const back = Math.max(0, f.account); s.cash += back; futRealized(s, f, back); p.fut = null; p.history.push({ ym, id: IDS.선물, what: '마진콜' }); s.log.push('증거금이 모자라 선물이 강제로 정리되었습니다.');
      }
    }
  }
  // 6. 체납 세금: 가산세가 붙고, 돈이 생기면 먼저 낸다
  if (p.taxDue > 0) {
    p.taxDue += won(p.taxDue * 0.0066);
    const v = Math.min(p.taxDue, Math.max(0, s.cash));
    if (v > 0) { s.cash -= v; p.taxDue -= v; p.yearStats.taxes += v; note(p, '밀린 세금', -v); }
  }
  // 7. 상장폐지: 마지막 거래 달 뒤에 남은 주식은 0원. 합병: 마지막 거래가로 현금 정산(세금 없음).
  for (const id of Object.keys(p.pos)) {
    const a = asset(id), st = statusAt(a, i);
    if (st === '상장폐지') {
      p.history.push({ ym, id, what: '상장폐지', qty: p.pos[id].qty, cost: p.pos[id].cost }); delete p.pos[id]; delete p.traded[id];
      s.log.push(`${josa(nameAt(a, i), '이/가')} 상장폐지되어 보유분의 값이 사라졌습니다.`);
    } else if (st === '합병') {
      const back = won(p.pos[id].qty * (priceAt(a, a.last) ?? 0));
      p.history.push({ ym, id, what: '합병', qty: p.pos[id].qty, cost: p.pos[id].cost, back }); delete p.pos[id]; delete p.traded[id];
      s.cash += back; p.yearStats.settled += back; note(p, `${nameAt(a, i)} 합병 정산`, back);
      s.log.push(`${josa(nameAt(a, i), '이/가')} 합병되어 보유분을 마지막 거래가로 정산받았습니다.`);
    }
  }
  return s;
}
function rentOf(a, year) {
  const ys = Object.keys(a.rent ?? {}).map(Number).sort((x, y) => x - y); if (!ys.length || year < ys[0]) return 0;
  const y = ys.filter((v) => v <= year).pop(); return won(a.rent[y]) * 10000; // 월세는 만 원에서 끊는다.
}
// ---------- 순자산·요약 ----------
export function portfolio(s) {
  const p = init(s), { i, ended } = pos(s), parts = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])), holdings = [], warnings = [];
  parts.예금 = p.deposit; parts.적금 = p.savings.reduce((t, c) => t + c.paid, 0);
  for (const [id, h] of Object.entries(p.pos)) {
    const a = asset(id), st = statusAt(a, i);
    const unit = st === '상장폐지' ? 0 : priceAt(a, i, true) ?? 0, value = won(h.qty * unit);
    parts[a.cat] += value; holdings.push({ id, name: nameAt(a, i), cat: a.cat, qty: h.qty, cost: h.cost, avg: h.qty > 0 ? h.cost / h.qty : 0, ret: h.cost > 0 ? value / h.cost - 1 : null, value, status: st, living: !!p.living[id], loan: p.loans[id]?.principal ?? 0 });
    if (st === '거래정지') warnings.push('거래정지 종목 보유');
    if (i === a.last && a.last < need().n - 1 && a.delisted) warnings.push('정리매매 종목 보유');
  }
  if (p.fut) { parts.선물 = p.fut.account; if (p.fut.account < p.fut.margin * 0.8) warnings.push('마진콜 근접'); }
  const debt = Object.values(p.loans).reduce((t, l) => t + l.principal + l.unpaid, 0) + p.taxDue;
  const limit = ymOf(s) < 202509 ? 50000000 : 100000000; if (p.deposit > limit) warnings.push('예금자보호 한도 초과');
  const assets = Object.values(parts).reduce((t, v) => t + v, 0), netWorth = s.cash + assets - debt;
  const rate = mortgageRate(i);
  const monthlyInterest = Object.values(p.loans).reduce((t, l) => t + won(l.principal * rate / 100 / 12), 0);
  const monthlyRent = Object.keys(p.pos).reduce((t, id) => { const a = asset(id); return t + (HOUSE.includes(a.cat) && !p.living[id] ? rentOf(a, s.year) : 0); }, 0);
  return { netWorth, cash: s.cash, parts, assets, debt, loans: debt - p.taxDue, taxDue: p.taxDue, monthlyInterest, monthlyRent, prevNetWorth: p.prevNw, change: p.prevNw == null ? null : netWorth - p.prevNw, holdings, warnings: [...new Set(warnings)], memoryEnded: ended };
}
export const netWorth = (s) => portfolio(s).netWorth;
// 온라인 거래 전의 해외 종목이면 안내 문구를 돌려준다.
export const phoneOrderNote = (s, id) => { const a = asset(id); return a && a.ccy !== 'KRW' && !HOUSE.includes(a.cat) && a.cat !== '외화' && ymOf(s) < RULES.OVERSEAS_YM ? '증권사 전화 주문이라 수수료가 1%입니다. 2010년 3월부터 온라인으로 낮아집니다.' : null; };

// ---------- 회귀 기억(지능 구간별) ----------
// 실제 시세에서 앞으로의 큰 방향만 말한다. 가격표, 정확한 숫자는 주지 않는다.
const REACH = [3, 6, 12, 18, 24, 30, 36], MIN_MOVE = [0.3, 0.2, 0.15, 0.1, 0.1, 0.08, 0.06], CAP = [0, 1, 2, 2, 2, 2, 2], CLARITY = ['흐릿', '또렷', '선명'];
const LEAD = ['어렴풋이 떠오른다.', '기억이 또렷하다.', '선명하게 기억난다.'];
// 목록 행마다 붙이지 않는다. 종목 상세에서만 쓴다(목록은 searchAssets의 star만).
export function memoryHint(s, id) {
  const a = asset(id); if (!a) return null; const m = need(), { i } = pos(s);
  const tier = tierOf(s.stats?.지능 ?? 0), reach = REACH[tier - 1], end = Math.min(i + reach, m.n - 1);
  if (i >= m.n - 1 || (tier === 1 && !a.broad)) return null;
  const nm = nameAt(a, i), out = (o) => ({ id, name: nm, tier, ...o });
  const near = (d) => Math.min(CAP[tier - 1], (d <= 6 ? 1 : 0) + (d <= 2 ? 1 : 0));
  if (i < a.first) { // 상장 소식
    if (tier < 2 || a.first > end) return null; const c = near(a.first - i);
    return out({ clarity: CLARITY[c], dir: 'listing', star: false, text: `${LEAD[c]} ${josa(nm, '은/는')} 곧 ${HOUSE.includes(a.cat) ? '분양이' : '거래가'} 시작될 것 같다.` });
  }
  if (statusAt(a, i) === '상장폐지') return null;
  let base = a.series[i]; for (let j = i; base == null && j >= a.first; j--) base = a.series[j]; if (!(base > 0)) return null;
  let hi = { r: -Infinity, j: i }, lo = { r: Infinity, j: i };
  for (let j = i + 1; j <= end; j++) { const v = a.series[j]; if (v == null || v <= 0) continue; const r = v / base - 1; if (r > hi.r) hi = { r, j }; if (r < lo.r) lo = { r, j }; }
  const delist = tier >= 4 && a.delisted && a.last < m.n - 1 && a.last > i && a.last <= end;
  const up = hi.r > -Infinity ? Math.log(1 + hi.r) : 0, down = lo.r < Infinity ? -Math.log(1 + lo.r) : 0;
  const goUp = up >= down, ev = goUp ? hi : lo, mag = goUp ? hi.r : lo.r;
  if (!delist && Math.abs(mag) < MIN_MOVE[tier - 1]) return null;
  if (!delist && !Number.isFinite(mag)) return null;
  const star = tier >= 4 && hi.r >= 1;
  if (delist && Math.abs(mag) < MIN_MOVE[tier - 1]) {
    const c = near(a.last - i);
    return out({ clarity: CLARITY[c], dir: 'down', star: false, text: `${LEAD[c]} ${josa(nm, '은/는')} 거래가 끝나 버릴 것 같다.`, ...(tier >= 5 ? { months: a.last - i } : {}) });
  }
  const c = near(ev.j - i); let word = '';
  if (tier >= 3) word = goUp ? (mag >= 1 ? '두 배 넘게 ' : mag >= 0.5 ? '크게 ' : '꽤 ') : (mag <= -0.5 ? '반토막 가까이 ' : mag <= -0.25 ? '크게 ' : '꽤 ');
  const when = tier >= 5 ? ` ${ev.j - i}개월쯤 뒤다.` : '';
  return out({ clarity: CLARITY[c], dir: goUp ? 'up' : 'down', star, text: `${LEAD[c]} ${josa(nm, '은/는')} ${word}${goUp ? '오를' : '내릴'} 것 같다.${when}`, ...(tier >= 5 ? { months: ev.j - i } : {}) });
}

// 지능 6구간부터: 다음 달 시세 방향. 7구간은 크기까지. 시세 끝(2026.10) 뒤에는 없다.
export function nextMonthHint(s, id) {
  const a = asset(id); if (!a) return null; const m = need(), { i } = pos(s);
  const tier = tierOf(s.stats?.지능 ?? 0); if (tier < 6 || i >= m.n - 1 || i < a.first) return null;
  const now = a.series[i], nx = a.series[i + 1]; if (!(now > 0) || !(nx > 0)) return null;
  const r = nx / now - 1, flat = Math.abs(r) < 0.01;
  if (flat) return { dir: 'flat', text: '다음 달 시세는 지금과 거의 같을 것이다.' };
  const big = tier >= 7 ? (Math.abs(r) >= 0.2 ? '크게 ' : Math.abs(r) >= 0.07 ? '꽤 ' : '조금 ') : '';
  return { dir: r > 0 ? 'up' : 'down', text: `다음 달 시세는 ${big}${r > 0 ? '오른다' : '내린다'}. 확실하게 떠오른다.` };
}

// ---------- 다른 모듈용 조회(contest, review, paper) ----------
export const posOf = (s) => pos(s);
export const monthsOf = () => need().x;
export const assetOf = (id) => asset(id);
export const allAssetIds = () => [...need().assets.keys()];
export const idsOf = (cat) => need().cats[cat] ?? [];
// 지나간 달까지의 원화 가격만 돌려준다. 미래 값은 절대 넣지 않는다.
export function priceHistory(s, id, months = Infinity) {
  const a = asset(id); if (!a) return []; const { i } = pos(s), from = Math.max(a.first, months === Infinity ? 0 : i - months + 1), out = [];
  for (let j = from; j <= Math.min(i, a.last); j++) out.push({ ym: need().x[j], price: priceAt(a, j), status: statusAt(a, j) });
  return out;
}
// 힌트 사실 검사와 지나간 기억의 실제 결과. ref는 'macro:kospi'|'rates:kr_base_rate'|'kospi:005930' 꼴.
export function refChange(ref, from, to) {
  const m = need(), [k, id] = ref.split(':'), ser = k === 'macro' ? m.macro[id] : k === 'rates' ? m.rates[id] : asset(id)?.series;
  const a = ser?.[m.x.indexOf(from)], b = ser?.[m.x.indexOf(to)];
  return a && b ? (b / a - 1) * 100 : null;
}
export function indexAt(key, year, month) { const m = need(), j = (year - m.y0) * 12 + (month - m.m0); return m.macro[key]?.[j] ?? null; }
export function yearStats(s) { return statsOf(s); }
export const annualOf = (s) => init(s).annual;
export const nameOfAt = (id, s) => { const a = asset(id); return a ? nameAt(a, pos(s).i) : null; };
export const marketChips = (cat) => [...new Set(idsOf(cat).map((id) => asset(id).market).filter(Boolean))];
// 검색에만 쓴다. 뒷날 이름도 여기로 찾을 수 있지만 화면에는 그 달 이름만 낸다.
export const allNames = (a) => [a.name, ...(a.oldNames ?? []), ...(a.alias ?? []), ...(a.names ?? []).map((n) => n.ko), a.ticker, a.id];

// ---------- 회귀노트(사용자 지시 2026-11-10) ----------
// 회귀하자마자 적어 둔 노트: 해마다, 달마다 그 달에 사 두면 다음 달에 가장 많이 올라 있던 종목(국내·해외 하나씩).
// 상장 첫 달·거래정지·상장폐지 직전처럼 값이 비는 달은 뺀다. 한 달에 열 배 넘게 뛴 값은 자료 오류로 보고 뺀다.
const NOTE_CATS = { 국내: '국내주식', 해외: '해외주식' };
let noteCache = null;
function buildNote() {
  const m = need(), out = new Map();
  for (let i = 0; i < m.n - 1; i++) {
    const row = {};
    for (const [k, cat] of Object.entries(NOTE_CATS)) {
      let best = null;
      for (const id of m.cats[cat] ?? []) {
        const a = m.assets.get(id);
        if (i < a.first || (i === a.first && a.first > 0) || i + 1 > a.last) continue; // 자료 첫 달(2000.1)은 쓰고, 그 뒤 새로 상장한 첫 달은 뺀다
        const p0 = a.series[i], p1 = a.series[i + 1];
        if (!(p0 > 0) || !(p1 > 0)) continue;
        const r = p1 / p0 - 1;
        if (r > 9 || (best && r <= best.r)) continue;
        best = { id, r, name: nameAt(a, i) };
      }
      if (best) row[k] = { id: best.id, name: best.name, pct: Math.round(best.r * 1000) / 10 };
    }
    out.set(m.x[i], row);
  }
  return out;
}
// year의 열두 달. 자료가 없는 달은 빈칸.
export function regressionNote(year) {
  if (!M) return [];
  noteCache ??= buildNote();
  return Array.from({ length: 12 }, (_, k) => ({ month: k + 1, ...(noteCache.get(`${year}-${String(k + 1).padStart(2, '0')}`) ?? {}) }));
}
// 2004년부터는 반년 단위로 적는다(사용자 지시 2026-11-13). 1월에 사서 7월에, 7월에 사서 이듬해 1월에 가장 많이 올라 있던 종목 여섯.
// plain: 국내·해외 주식 전체에서 많이 오른 셋. big: 그때 시가총액(상장주식 수 × 값, 원화 환산) 상위 100개 가운데 많이 오른 셋(plain과 겹치면 뺀다).
// 상장한 달에 산 것, 값이 비는 종목, 반년에 서른 배 넘게 뛴 값(자료 오류)은 뺀다. 반년 뒤 자료가 없으면 null.
export const HALF_FROM = 2004, BIG_CAP_N = 100;
let halfCache = null;
function buildHalf(year, h) {
  const m = need(), i0 = (year - m.y0) * 12 + (h === 1 ? 0 : 6) - (m.m0 - 1), i1 = i0 + 6;
  if (i0 < 0 || i1 > m.n - 1) return null;
  const list = [];
  for (const cat of Object.values(NOTE_CATS)) for (const id of m.cats[cat] ?? []) {
    const a = m.assets.get(id);
    if (i0 < a.first || (i0 === a.first && a.first > 0) || i1 > a.last) continue;
    const p0 = a.series[i0], p1 = a.series[i1];
    if (!(p0 > 0) || !(p1 > 0)) continue;
    const r = p1 / p0 - 1; if (r > 30) continue;
    const fx = ccyRate(a.ccy, i0);
    list.push({ id, r, name: nameAt(a, i0), where: cat === '국내주식' ? '국내' : '해외', cap: a.shares && fx ? a.shares * p0 * fx : 0 });
  }
  if (!list.length) return null;
  const row = (x) => ({ id: x.id, name: x.name, where: x.where, pct: Math.round(x.r * 1000) / 10 });
  const byR = (a, b) => b.r - a.r;
  const plain = [...list].sort(byR).slice(0, 3);
  const taken = new Set(plain.map((x) => x.id));
  const big = [...list].filter((x) => x.cap > 0).sort((a, b) => b.cap - a.cap).slice(0, BIG_CAP_N).filter((x) => !taken.has(x.id)).sort(byR).slice(0, 3);
  return { half: h, plain: plain.map(row), big: big.map(row) };
}
// year의 상·하반기. [{ half: 1|2, plain: [...], big: [...] } | { half, empty: true }]
export function halfNote(year) {
  if (!M) return [];
  halfCache ??= new Map();
  if (!halfCache.has(year)) halfCache.set(year, [1, 2].map((h) => buildHalf(year, h) ?? { half: h, empty: true }));
  return halfCache.get(year);
}
export const noteYears = () => { if (!M) return []; const m = need(); const y1 = +m.x[m.n - 2].slice(0, 4); return Array.from({ length: y1 - m.y0 + 1 }, (_, k) => m.y0 + k); };
