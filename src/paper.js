// 이달의 신문(설계 7, 10.2). 순수 함수. 미래 값은 기억 힌트 문장으로만 나간다.
// 재난·사고 뉴스: PLAN 임시 결정대로 사회 칸에 사실 한 줄만. 재미 요소, 시장 호재와 묶지 않는다.
import { tierOf } from './rules.js';
import * as inv from './invest.js';
import { contestNews } from './contest.js';
import HEADLINES from '../data/market/headlines.js';
import HINTS from '../data/market/hints.js';
import NEWS from '../data/news.js';

export const LAST_NEWS = '2026-10';
const key = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
const keyOf = (s) => key(s.year, s.month);
const monthsBetween = (a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
const HL = ([text, section, tag, date, source]) => ({ text, section, tag, date, source });
const DAILY = [
  '이번 달 신문에는 크게 눈에 띄는 기사가 없다.',
  '아빠가 신문을 펼쳤다가 금방 접었다. 이번 달은 조용하다.',
  '신문에는 날씨와 동네 소식이 많다.',
];

// 이번 달 헤드라인: OK 전부, SOFT는 한 달 하나. 최대 3개. AVOID는 사회 칸 한 줄로만 간다.
function linesOf(k) {
  const all = (HEADLINES[k] ?? []).map(HL), out = []; let soft = 0;
  for (const h of all) { if (h.tag === 'OK') out.push(h); else if (h.tag === 'SOFT' && soft < 1) { out.push(h); soft += 1; } }
  return { headlines: out.slice(0, 3), avoid: all.filter((h) => h.tag === 'AVOID') };
}
const isDisaster = (n) => n.분류 === '재난·보건';
function eraOf(k) { return NEWS.filter((n) => n.ym === k && !isDisaster(n)).map((n) => ({ text: n.text, 분류: n.분류, url: n.url ?? null })); }
function societyOf(k, avoid) {
  if (avoid.length) return { text: avoid[0].text, date: avoid[0].date, source: avoid[0].source };
  const n = NEWS.find((x) => x.ym === k && isDisaster(x));
  return n ? { text: n.text, source: n.url ?? null } : null;
}

// ---------- 기억 힌트(초안 1.1) ----------
const REACH = [3, 6, 12, 18, 24, 30, 36], CAP = [0, 1, 2, 2, 2, 2, 2], CLARITY = ['흐릿', '또렷', '선명'];
function hintView(h, tier, left) {
  const level = Math.min(CAP[tier - 1], (left <= 6 ? 1 : 0) + (left <= 2 ? 1 : 0));
  return { id: h.id, event: h.event, ids: h.ids, monthsLeft: left, clarity: CLARITY[level], level, text: h.text[level] };
}
export function visibleHints(s) {
  const tier = tierOf(s.stats?.지능 ?? 0), now = keyOf(s), out = [];
  if (now > LAST_NEWS) return out;
  for (const h of HINTS) {
    const left = monthsBetween(now, h.event);
    if (left < 0 || left > REACH[tier - 1] || tier < h.band) continue;
    out.push(hintView(h, tier, left));
  }
  return out;
}
// 신문의 기억 한 조각: 보이는 힌트 중 가장 선명하고 사건이 가까운 것 하나.
export function memoryPiece(s) {
  return visibleHints(s).sort((a, b) => b.level - a.level || a.monthsLeft - b.monthsLeft)[0] ?? null;
}
// 종목 상세용: 그 종목과 이어진 힌트만.
export function hintsForAsset(s, id) { return visibleHints(s).filter((h) => h.ids.includes(id)); }
// 사건 달이 지난 힌트와 실제 결과. 시세 표에서 계산한다(지난 달만).
export function pastMemories(s, year = null) {
  const now = keyOf(s), tier = tierOf(s.stats?.지능 ?? 0);
  return HINTS.filter((h) => h.event < now && (year == null || h.event.startsWith(String(year))) && tier >= h.band).map((h) => ({ id: h.id, event: h.event, text: h.text[0], result: resultOf(h) }));
}
const CHECK_LABEL = { kospi: '코스피', kosdaq: '코스닥', nasdaq: '나스닥', sp500: 'S&P 500', usdkrw: '원/달러', kr_base_rate: '기준금리' };
function resultOf(h) {
  const { ref, from, to, op, pct } = h.check, id = ref.split(':')[1], name = CHECK_LABEL[id] ?? inv.assetOf(id)?.name ?? id, v = inv.refChange(ref, from, to);
  if (v == null) return `${name} ${pct > 0 ? '+' : ''}${pct}% ${op === '<=' ? '이하' : '이상'}`;
  const r = Math.round(v); return `${name} ${from}~${to} ${r >= 0 ? '+' : '−'}${Math.abs(r)}%`;
}

// ---------- 시장 알림(설계 6.10) ----------
function holdingAlerts(s) {
  const out = [], p = inv.portfolio(s);
  for (const h of p.holdings) {
    const q = inv.quote(s, h.id);
    if (q.notice) out.push({ id: h.id, kind: 'notice', name: q.name, text: `${q.name}: ${q.notice}` });
    if (q.status === '거래정지') out.push({ id: h.id, kind: 'halt', name: q.name, text: `${q.name}: 거래정지 중입니다.` });
    if (q.ended || q.change == null || Math.abs(q.change) < 0.2) continue;
    const pct = Math.round(q.change * 100);
    out.push({ id: h.id, kind: 'move', name: q.name, pct, text: `${q.name} 지난달보다 ${pct > 0 ? '+' : '−'}${Math.abs(pct)}%` });
  }
  return out;
}
function marketLine(s) {
  const y0 = s.month === 1 ? s.year - 1 : s.year, m0 = s.month === 1 ? 12 : s.month - 1;
  const a = inv.indexAt('kospi', y0, m0), b = inv.indexAt('kospi', s.year, s.month);
  if (!a || !b) return null;
  const pct = Math.round((b / a - 1) * 100);
  if (Math.abs(pct) < 10) return null;
  return { pct, text: `이번 달 코스피 ${pct > 0 ? '+' : '−'}${Math.abs(pct)}%` };
}

// ---------- 이달의 신문 ----------
export function monthlyPaper(s) {
  const k = keyOf(s), ended = k > LAST_NEWS, contest = contestNews(s), money = [...inv.init(s).ledger];
  const base = { ym: k, year: s.year, month: s.month, reviewYear: s.month === 1 && inv.annualOf(s)[s.year - 1] ? s.year - 1 : null, contest, money, alerts: holdingAlerts(s) };
  if (ended) {
    return { ...base, ended: true, endedCard: { title: '기억이 끝난 달', text: '여기서부터는 회귀 전의 나도 겪어 보지 못한 날들이다.', priceNote: '10월 28일 이후 시세 없음' }, headlines: [], era: [], society: null, daily: null, memory: null, market: null };
  }
  const { headlines, avoid } = linesOf(k), era = eraOf(k), society = societyOf(k, avoid);
  const daily = !headlines.length && !era.length ? DAILY[(s.year + s.month) % DAILY.length] : null;
  return { ...base, ended: false, endedCard: null, headlines, era, society, daily, memory: memoryPiece(s), market: marketLine(s) };
}
// 홈 '이달의 헤드라인' 카드 한 줄
export function headlineCard(s) {
  const p = monthlyPaper(s);
  if (p.ended) return { text: p.endedCard.title, ended: true };
  return { text: p.headlines[0]?.text ?? p.era[0]?.text ?? p.daily ?? '', section: p.headlines[0]?.section ?? null, ended: false };
}
// 기록 탭 '신문 스크랩'. 지난 달까지만.
export function newsScrap(s, year) {
  const out = [], now = keyOf(s);
  for (let m = 1; m <= 12; m++) {
    const k = key(year, m); if (k >= now || k > LAST_NEWS) break;
    const { headlines } = linesOf(k), era = eraOf(k);
    if (headlines.length || era.length) out.push({ ym: k, headlines, era });
  }
  return out;
}
// 그해의 헤드라인 하나: 코스피가 가장 크게 움직인 달의 첫 OK 줄(결산용).
export function yearHeadline(year) {
  let best = null, top = -1;
  for (let m = 1; m <= 12; m++) {
    const line = (HEADLINES[key(year, m)] ?? []).map(HL).find((h) => h.tag === 'OK'); if (!line) continue;
    const a = inv.indexAt('kospi', m === 1 ? year - 1 : year, m === 1 ? 12 : m - 1), b = inv.indexAt('kospi', year, m), mv = a && b ? Math.abs(b / a - 1) : 0;
    if (mv > top) { top = mv; best = line; }
  }
  return best?.text ?? null;
}
