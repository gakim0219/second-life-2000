// 1년 단위로 청구되는 세금. 거래 때 빠지는 것은 수수료, 증권거래세, 취득세, 이자·배당 원천징수뿐이다.
// 5월: 작년 거래의 양도소득세와 금융소득 종합과세. 7·9월: 재산세. 12월: 종합부동산세.
// 재산세와 종합부동산세는 실제처럼 6월 1일에 가진 것을 기준으로 매긴다. 세율은 시기별 대표값이다.
import * as inv from './invest.js';
const won = Math.round;
const NAMES = { 5: '5월 양도소득세·종합소득세', 7: '7월 재산세', 9: '9월 재산세', 12: '12월 종합부동산세' };
export const PENALTY = 0.0066; // 납부지연가산세, 월 환산(invest.js가 매달 붙인다)
export const AGENT_MIN_FEE = 300000, AGENT_FEE_RATE = 0.02;

// 시가의 70%를 공시가격, 그 60%를 과세표준으로 본다. 도시지역분 0.14% 포함.
export function propertyTax(value) {
  const base = value * 0.7 * 0.6;
  const band = Math.min(base, 6e7) * 0.001 + Math.max(0, Math.min(base, 1.5e8) - 6e7) * 0.0015 + Math.max(0, Math.min(base, 3e8) - 1.5e8) * 0.0025 + Math.max(0, base - 3e8) * 0.004;
  return won(band + base * 0.0014);
}
const CUTS = [3e8, 6e8, 12e8, Infinity];
const compTable = (y, many) => {
  if (y < 2019) return { rates: [0.005, 0.0075, 0.01, 0.02], ratio: 0.8 };
  if (y < 2021) return { rates: many ? [0.006, 0.009, 0.013, 0.032] : [0.005, 0.007, 0.01, 0.027], ratio: y === 2019 ? 0.85 : 0.9 };
  if (y < 2023) return { rates: many ? [0.012, 0.016, 0.022, 0.06] : [0.006, 0.008, 0.012, 0.03], ratio: y === 2021 ? 0.95 : 0.6 };
  return { rates: many ? [0.005, 0.007, 0.01, 0.05] : [0.005, 0.007, 0.01, 0.027], ratio: 0.6 };
};
const compDeduct = (y, one) => (y < 2005 ? Infinity : y < 2006 ? 9e8 : y < 2009 ? 6e8 : y < 2021 ? (one ? 9e8 : 6e8) : y < 2023 ? (one ? 11e8 : 6e8) : one ? 12e8 : 9e8);
// 집값(시가) 목록으로 그해 종합부동산세를 낸다. 농어촌특별세 20% 포함.
export function comprehensiveTax(values, year) {
  if (!values.length) return 0;
  const left = values.reduce((a, v) => a + v * 0.7, 0) - compDeduct(year, values.length === 1);
  if (left <= 0) return 0;
  const { rates, ratio } = compTable(year, values.length >= 3), base = left * ratio;
  let tax = 0, from = 0;
  CUTS.forEach((cut, k) => { tax += Math.max(0, Math.min(base, cut) - from) * rates[k]; from = cut; });
  return won(tax * 1.2);
}
function snapshot(s) {
  const out = { year: s.year, houses: [], land: 0, world: 0 };
  for (const h of inv.portfolio(s).holdings) {
    if (h.cat === '부동산') out.houses.push(h.value); else if (h.cat === '토지') out.land += h.value; else if (h.cat === '해외부동산') out.world += h.value;
  }
  return out;
}
const stateOf = (s) => (inv.init(s).tax ??= { ym: 0, base: null, bill: null, history: [] });
const baseOf = (s) => { const t = stateOf(s); return t.base?.year === s.year ? t.base : snapshot(s); };
const item = (label, amount, lo, hi, why) => ({ label, amount, lo, hi, why });
const halfHouse = (b, k) => won(b.houses.reduce((a, v) => a + propertyTax(v), 0) / 2 * k);

function itemsFor(s, month) {
  if (month === 5) {
    const a = inv.annualOf(s)[s.year - 1], b = a?.bill; if (!b?.pending) return [];
    return [item('대주주 양도소득세', b.large, 0.03, 0.08, '취득 비용과 손익 통산 확인'), item('해외주식 양도소득세', b.overseas, 0.03, 0.08, '수수료와 환산 기준 확인'), item('파생상품 양도소득세', b.deriv ?? 0, 0.03, 0.08, '손익 통산 확인'),
      item('부동산·토지 양도소득세', b.house ?? 0, 0.08, 0.2, '필요경비와 특례 확인'), item('금융소득 종합과세', b.finance ?? 0, 0.08, 0.15, '공제 항목 확인')];
  }
  const b = baseOf(s);
  if (month === 7) return [item('주택 재산세 1기분', halfHouse(b, 1), 0.01, 0.03, '감면 대상 확인')];
  if (month === 9) return [item('주택 재산세 2기분', halfHouse(b, 1), 0.01, 0.03, '감면 대상 확인'), item('토지 재산세', won(b.land * inv.RULES.LAND_HOLD), 0.01, 0.03, '분리과세 대상 확인'), item('해외 부동산 보유세', won(b.world * inv.RULES.WORLD_HOLD), 0, 0.02, '현지 공제 확인')];
  if (month === 12) return [item('종합부동산세', comprehensiveTax(b.houses, s.year), 0.05, 0.12, '합산배제와 공제 확인')];
  return [];
}
function makeBill(s, month) {
  if (!NAMES[month]) return null;
  const items = itemsFor(s, month).filter((x) => x.amount > 0); if (!items.length) return null;
  return { ym: s.year * 100 + month, month, title: NAMES[month], taxYear: month === 5 ? s.year - 1 : s.year, items, total: items.reduce((a, x) => a + x.amount, 0) };
}
const liquid = (s) => Math.max(0, s.cash) + inv.init(s).deposit;
// 세무사 비용과 줄어들 범위. 실제 절세액은 맡긴 뒤에 정해지지만 다시 불러와도 같은 값이다.
export function quote(s, bill = billOf(s)) {
  if (!bill) return null;
  const fee = Math.max(AGENT_MIN_FEE, won(bill.total * AGENT_FEE_RATE));
  const saveLo = won(bill.items.reduce((a, x) => a + x.amount * x.lo, 0)), saveHi = won(bill.items.reduce((a, x) => a + x.amount * x.hi, 0));
  return { direct: bill.total, fee, saveLo, saveHi, costLo: bill.total - saveHi + fee, costHi: bill.total - saveLo + fee, liquid: liquid(s), short: Math.max(0, bill.total - liquid(s)) };
}
const shake = (s, ym) => { let n = (s.seed ?? 1) * 31 + ym; n = (n ^ (n >>> 7)) * 2654435761 >>> 0; return (n % 1000) / 1000; };

export const billOf = (s) => stateOf(s).bill;
export const historyOf = (s) => stateOf(s).history;
// 다음 달 청구될 금액. 이번 달 안에 돈을 마련하라고 미리 보여 준다.
export function forecast(s) {
  if (s.month >= 12) return null;
  const month = s.month + 1, b = makeBill(s, month); if (!b) return null;
  return { ...b, ym: s.year * 100 + month, cash: liquid(s), short: Math.max(0, b.total - liquid(s)) };
}
export function settle(s, mode = 'direct') {
  const t = stateOf(s), bill = t.bill; if (!bill) return { ok: false, why: '낼 세금이 없습니다.' };
  let due = bill.total, fee = 0, saved = 0;
  if (mode === 'agent') {
    const q = quote(s, bill), r = shake(s, bill.ym);
    saved = won(q.saveLo + (q.saveHi - q.saveLo) * r); fee = q.fee; due -= saved;
  }
  const a = inv.payTax(s, due, bill.title), b = fee ? inv.payTax(s, fee, '세무사 수수료') : { paid: 0, unpaid: 0 };
  const unpaid = a.unpaid + b.unpaid, row = { ym: bill.ym, title: bill.title, total: bill.total, mode, saved, fee, paid: a.paid + b.paid, unpaid };
  t.history.push(row); t.bill = null;
  const y = inv.annualOf(s)[bill.taxYear]; if (bill.month === 5 && y?.bill) Object.assign(y.bill, { pending: false, paid: a.paid, unpaid: a.unpaid, saved, agentFee: fee });
  return { ok: true, ...row, net: saved - fee };
}
export function onMonth(s) {
  if (!inv.isLoaded()) return s;
  const t = stateOf(s), ym = s.year * 100 + s.month; if (t.ym === ym) return s; t.ym = ym;
  if (t.bill) settle(s, 'direct'); // 고르지 않은 고지서는 그대로 낸 것으로 친다
  if (s.month === 6) t.base = snapshot(s); // 과세 기준일
  const bill = makeBill(s, s.month);
  if (bill) { t.bill = bill; s.log.push(`${bill.title} 고지서가 나왔습니다. ${inv.fmtWon(bill.total)}원입니다.`); }
  if (s.month === 5) { const y = inv.annualOf(s)[s.year - 1]; if (y?.bill?.pending && !bill) y.bill.pending = false; }
  const next = forecast(s);
  if (next) s.log.push(`다음 달 ${next.title}가 약 ${inv.fmtWon(next.total)}원 나올 예정입니다.${next.short ? ` 현금과 예금으로는 ${inv.fmtWon(next.short)}원 모자랍니다.` : ''}`);
  return s;
}
