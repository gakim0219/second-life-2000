// 5% 대량보유 공시와 10% 주요주주(사용자 지시 2026-11-12, docs/2026-11-12_5퍼센트공시_설계.md).
// - 미성년 때(invest.ADULT_YM 전)만 작동한다. 힐아일랜드 계좌(flags.힐_계좌)가 열리면 이름이 그 뒤로 숨어 작동하지 않는다.
// - 국내주식 가운데 상장주식 수를 아는 종목만 본다. 주가는 실제 시세라 바꾸지 않는다.
// - 달 말(다음 달 첫 처리)에 지분을 보고 새 공시·1%p 변동·5% 미만 공시를 남긴다. 첫 공시 장면(dc_filed)은 종목마다 한 번이다.
// - 10% 이상 종목을 산 지 6개월 안에 팔아 이익이 나면 그 이익을 회사에 돌려준다(단기매매차익 반환).
import * as inv from './invest.js';
import { onMonth as coreOnMonth } from './core.js';

export const LINE5 = 0.05, LINE10 = 0.1, STEP = 0.01, SHORT_MONTHS = 6;
const ymOf = (s) => s.year * 100 + s.month;
const m12 = (s) => s.year * 12 + (s.month - 1);
export const minor = (s) => ymOf(s) < inv.ADULT_YM;
export const active = (s) => minor(s) && !s.flags?.힐_계좌;
export const stateOf = (s) => (s.disclose ??= { stocks: {}, log: [], queue: [] });
const domestic = (id) => { const a = inv.assetOf(id); return a && a.cat === '국내주식' && a.shares > 0 ? a : null; };
const held = (s, id) => inv.init(s).pos[id]?.qty ?? 0;
const pctText = (x) => `${(x * 100).toFixed(1)}%`;

// 주문 미리보기용. 해당 없으면 null.
export function stakeLine(s, id, qty) {
  if (!active(s)) return null; const a = domestic(id); if (!a) return null;
  const now = held(s, id) / a.shares, after = (held(s, id) + qty) / a.shares, rec = s.disclose?.stocks?.[id];
  return { now, after, cross5: now < LINE5 && after >= LINE5, cross10: now < LINE10 && after >= LINE10, over5: after >= LINE5, filed: !!rec?.on, rec: rec ?? null };
}
// 5% 바로 밑까지 더 살 수 있는 주식 수. 해당 없으면 null, 이미 5% 이상이면 0.
export function maxUnder5(s, id) {
  if (!active(s)) return null; const a = domestic(id); if (!a) return null;
  return Math.max(0, Math.ceil(a.shares * LINE5) - 1 - held(s, id));
}
// 주문 화면의 경고 문장. 없으면 ''.
export function warnOf(s, id, side, qty) {
  if (side !== 'buy') { const c = clawbackOf(s, id, null); return c ? '산 지 6개월이 안 된 주요주주 지분입니다. 팔아서 이익이 나면 그 이익을 회사에 돌려줘야 합니다.' : ''; }
  const L = stakeLine(s, id, qty); if (!L) return '';
  if (L.cross10) return '지분이 10%를 넘어 주요주주가 됩니다. 앞으로 6개월 안에 팔아 이익이 나면 그 이익을 회사에 돌려줘야 합니다.';
  if (L.cross5 && !L.filed) return '5%를 넘습니다. 이달 말 대량보유 공시가 나가고 이름이 알려집니다.';
  if (L.filed && L.after >= LINE5) return `공시한 지분 ${pctText(L.rec.pct)} · 단순투자. 1%p 넘게 바뀌면 변동 공시가 나갑니다.`;
  return '';
}
// 확인 시트를 띄울 매수인가: 5%나 10%를 처음 넘는다.
export function needsConfirm(s, id, qty) { const L = stakeLine(s, id, qty); return !!L && ((L.cross5 && !L.filed) || L.cross10); }

// 단기매매차익 반환 대상이면 { months }를, 이익 gain을 주면 돌려줄 금액까지. 아니면 null.
export function clawbackOf(s, id, gain) {
  if (!active(s)) return null;
  const rec = s.disclose?.stocks?.[id]; if (rec?.buy10 == null) return null;
  const months = m12(s) - rec.buy10; if (months >= SHORT_MONTHS) return null;
  return { months, back: gain == null ? null : Math.max(0, Math.round(gain)) };
}

// invest.onTrade 연결. 매수 때 10% 이상이면 산 달을 적고, 매도 때 6개월 안이면 이익을 돌려준다.
export function onTrade(s, side, id, qty, r) {
  if (!active(s) || !domestic(id)) return null;
  const a = domestic(id);
  if (side === 'buy') {
    if (held(s, id) / a.shares >= LINE10) (stateOf(s).stocks[id] ??= { name: r.name, scened: false, on: false, pct: 0 }).buy10 = m12(s);
    return null;
  }
  const c = clawbackOf(s, id, r.gain); if (!c || !(c.back > 0)) return null;
  s.cash -= c.back; stateOf(s).log.push({ ym: ymOf(s), id, kind: 'back', back: c.back });
  (s.log ??= []).push(`${inv.josa(r.name, '을/를')} 산 지 6개월 안에 팔아, 단기매매차익을 회사에 돌려주었습니다.`);
  return { back: c.back, text: '산 지 6개월 안에 판 주요주주 지분이라 이익을 회사에 돌려주었습니다.' };
}

// 달마다: 지분을 보고 공시를 남긴다. 첫 공시 장면은 큐에 넣는다.
export function onMonth(s) {
  if (!inv.isLoaded() || !active(s)) return s;
  const d = s.disclose, ids = new Set([...Object.keys(inv.init(s).pos), ...Object.keys(d?.stocks ?? {})]);
  for (const id of ids) {
    const a = domestic(id); if (!a) continue;
    const pct = held(s, id) / a.shares, rec = s.disclose?.stocks?.[id], name = inv.quote(s, id)?.name ?? a.name;
    if (!rec?.on) {
      if (pct < LINE5) continue;
      const D = stateOf(s), r = (D.stocks[id] ??= { scened: false });
      Object.assign(r, { name, on: true, pct, ym: ymOf(s), at: m12(s) });
      D.log.push({ ym: ymOf(s), id, kind: 'new', pct });
      D.first ??= m12(s); D.last = id;
      // 부모님이 아직 모르면 신문으로 알게 된다(dc_minor_home). 명세서 장면(parents.js)과 겹치지 않게 미리 표시한다.
      if (D.first === m12(s) && !s.flags.부모_알게됨) { s.flags.부모_알게됨 = true; s.flags.공시_부모 = true; }
      s.log.push(`${josa(name)} 지분이 5%를 넘어 대량보유 공시가 나갔습니다.`);
      if (!r.scened) { r.scened = true; if (!s.queue.includes('dc_filed')) { D.queue.push(id); s.queue.unshift('dc_filed'); } else D.queue.push(id); }
    } else if (pct < LINE5) {
      Object.assign(rec, { on: false, pct }); d.log.push({ ym: ymOf(s), id, kind: 'out', pct });
      s.log.push(`${josa(name)} 지분이 5% 밑으로 내려가 보유 공시를 마쳤습니다.`);
    } else if (Math.abs(pct - rec.pct) >= STEP - 1e-9) {
      d.log.push({ ym: ymOf(s), id, kind: 'chg', from: rec.pct, pct }); rec.pct = pct;
      s.log.push(`${josa(name)} 지분 변동 공시가 나갔습니다.`);
    }
    const r = s.disclose?.stocks?.[id];
    if (r?.on && pct >= LINE10 && r.top10 == null) { r.top10 = m12(s); s.disclose.top10 ??= m12(s); }
  }
  return s;
}
const josa = (name) => `${name}의`;

// 장면에서 쓰는 값.
export const filedName = (s) => { const d = s.disclose; const id = d?.queue?.[0] ?? d?.last; return d?.stocks?.[id]?.name ?? '그 회사'; };
export const lastName = (s) => { const d = s.disclose; return d?.stocks?.[d?.last]?.name ?? '그 회사'; };
export const monthsSinceFirst = (s) => (s.disclose?.first == null ? -1 : m12(s) - s.disclose.first);
export const filedCount = (s) => Object.values(s.disclose?.stocks ?? {}).filter((r) => r.scened).length;
export const doneFiled = (s) => { const q = s.disclose?.queue; q?.shift(); if (q?.length && !s.queue.includes('dc_filed')) s.queue.unshift('dc_filed'); };
// 미성년 판정 함수는 장면 조건에도 쓴다. 힐아일랜드 계좌가 열린 뒤에는 뒤따르는 장면도 나오지 않는다.
export const after = (k) => (s) => active(s) && monthsSinceFirst(s) >= k;

let installed = false;
export function install() { if (installed) return; installed = true; inv.onTrade(onTrade); coreOnMonth(onMonth); }
