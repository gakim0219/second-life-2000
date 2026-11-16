// 연애·결혼. 순수 함수. DOM과 core.js를 쓰지 않는다. 근거: design/15_사회인_연애_결혼_가족.md, 08 4-6·4-7, 06 7장.
// 달 넘김에는 main이 core.onMonth(love.onMonth)로 연결한다. 가족(family.js)과 엔딩 플래그도 여기서 함께 돈다.
// 미성년 규칙: 주인공과 상대 모두 만 19세 이상 + 고교 졸업 뒤에만 후보가 된다. 고교 미팅은 친구끼리 어울리는 자리로 끝나고 후보를 만들지 않는다.
import { charmTalk, tierOf, stageOf, gain, STRESS_MAX, lockStat as lockMin, jobAt, raise } from './rules.js';
import * as family from './family.js';
import { registerNames, markEarly, syncFlags } from './ending.js';
import { canAppear, hasAdultPhoto } from './cast.js';
import { afterParting } from './bonds.js';
import * as company from './company.js';
import { ARCS, PERSONAL, ARC_WORDS, MARRIED, ARC_MARRIED, CRISIS, TOUCH, NIGHT_LINE, NIGHT_MARRIED } from '../data/love_arcs.js';

export const BIRTH_YEAR = 1989; // 주인공 출생연도(2000년 초5, 2008년 대학 입학과 맞춤)
export const ADULT_AGE = 19;
export const OLD_BOND = 10; // 옛 인연: 학창 시절 사이 '좋음'(bonds.js 기준)
const THREE = { lo: 35, hi: 70 }; // 호감 3단계 경계(내부값, 화면에 숫자 없음)
const TIER_MIN = [0, 0, 51, 101, 151, 176, 201, 251];

let DATES = [];
const BY_ID = new Map();
export function loadDates(list) {
  DATES = Array.isArray(list) ? list : [];
  BY_ID.clear();
  for (const p of DATES) BY_ID.set(p.id, p);
  registerNames(DATES);
  return DATES.length;
}
export const personOf = (id) => BY_ID.get(id) ?? null;

// ---------- 상태 ----------
export function init(s) {
  if (s.birthYear == null) s.birthYear = BIRTH_YEAR;
  s.bonds ??= {};
  s.flags ??= {};
  s.log ??= [];
  const L = (s.love ??= {});
  L.people ??= {}; L.closed ??= {}; L.missed ??= {}; L.ex ??= [];
  L.matchmaker ??= null; L.lastIntro ??= null; L.reopenAt ??= null; L.clubs ??= {}; L.approach ??= null; L.lastApproach ??= null; L.기사 ??= []; L.freeIntro ??= 0; L.introDeclined ??= null;
  family.init(s);
  return L;
}
const ym = (s) => s.year * 12 + (s.month - 1);
export const ageOf = (s) => s.year - (s.birthYear ?? BIRTH_YEAR);
// 나이와 학교를 함께 본다. 고3 겨울(2008년 1~2월)은 아직 성인 연애가 열리지 않는다.
export const isAdult = (s) => ageOf(s) >= ADULT_AGE && ['대학', '사회인'].includes(stageOf(s));
const inService = (s) => !!(s.flags?.군입대 && !s.flags?.전역);
const tier = (s, k) => tierOf(s.stats[k]);
const say = (s, t) => { s.log.push(t); };
const hash = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 1597334677); h ^= h >>> 16; return h >>> 0; };
const pick = (s, salt, n) => (n <= 0 ? -1 : hash(`${s.seed ?? 1}:${s.year}:${s.month}:${salt}`) % n);
const chance = (s, salt) => hash(`${s.seed ?? 1}:${s.year}:${s.month}:${salt}`) / 4294967296;
export const GRADE = { 평범: 0, '무난한 부자': 1, '큰 부자': 2, 재벌: 3 };
// 잠금 형식: {ok:false, why:'매력 151 필요 · 지금 83', need:{stat,min,now}}
export const lockStat = (s, k, t) => lockMin(s, k, TIER_MIN[t]);
const lockCash = (s, cost) => ({ ok: false, why: '돈이 모자랍니다.', need: { cash: cost, now: s.cash } });
const SLOT = '이번 달 활동 칸을 다 썼습니다.';

// ---------- 길 ----------
// pool: 후보가 나오는 쓰임. light: 후보 없이 가벼운 만남으로 끝나는 길.
export const ROUTES = {
  동창: { cost: 0, pool: '동창', need: () => null },
  미팅: { cost: 30000, light: true, need: () => null },
  소개팅: { cost: 50000, pool: '소개팅', need: (s) => (tier(s, '인맥') >= 2 ? null : lockStat(s, '인맥', 2)) },
  헌팅: { cost: 30000, pool: '헌팅', need: (s) => (tier(s, '매력') >= 2 ? null : lockStat(s, '매력', 2)) },
  클럽: { cost: 200000, light: true, need: (s) => (tier(s, '매력') >= 3 ? null : lockStat(s, '매력', 3)) },
  선보기: { cost: 300000, pool: '소개팅', need: (s) => (ageOf(s) >= 30 ? null : { ok: false, why: '30세부터 열립니다.' }) },
  결혼정보회사: { cost: 500000, joinCost: 3000000, pool: '소개팅', need: (s) => (s.love?.matchmaker ? null : { ok: false, why: '가입이 필요합니다.' }) },
  사교모임: { cost: 0, pool: '사교모임', need: () => null },
  유명인: { cost: 0, pool: '유명인', need: () => null },
};
const LOCKED_WHEN_PARTNER = ['소개팅', '헌팅', '클럽', '선보기', '결혼정보회사', '동창', '유명인'];
export const HIGHSCHOOL_MEETING_COST = 10000;

function locked(s) {
  const L = s.love;
  if (s.partner) return s.partner.married ? '결혼한 뒤에는 새 만남이 열리지 않습니다.' : '연인이 있는 동안 새 만남은 잠깁니다.';
  if (L.reopenAt && ym(s) < L.reopenAt) return '이혼 뒤 1년이 지나야 새 만남이 열립니다.';
  return null;
}

// 내 회사 사람은 연애 후보가 아니다. company.js 필드 이름(staff, x.artists, x.trainees)을 그대로 읽는다.
function companyIds(s) {
  const out = new Set();
  for (const c of [s.company, s.company2]) {
    if (!c) continue;
    for (const m of c.staff ?? []) out.add(typeof m === 'object' ? m?.id : m);
    for (const m of c.x?.artists ?? []) if (m?.id) out.add(m.id);
    for (const m of c.x?.trainees ?? []) if (m?.id) out.add(m.id);
  }
  return out;
}
export function isBlockedByCompany(s, id) {
  return companyIds(s).has(id) || !!s.flags?.[`직원:${id}`];
}

function ended(s, id) {
  const L = s.love;
  return !!(L.closed[id] || L.missed[id] || L.ex.includes(id) || s.partner?.id === id);
}

// 사교모임 입장 조건. 첫 입장은 회비 전액, 그 뒤로는 10%.
const hasInvested = (s) => { const p = s.portfolio ?? {}; return Object.keys(p.pos ?? {}).length > 0 || Object.keys(p.traded ?? {}).length > 0 || (p.history ?? []).length > 0; };
const clubCost = (s, base) => (s.love?.clubs?.[base.모임] ? Math.round((base.비용 ?? 0) * 0.1) : base.비용 ?? 0);
export function gatherCheck(s, p) {
  const e = p.만남.입장 ?? {};
  return checkEntry(s, e, p.만남.모임);
}
export function checkEntry(s, e, group) {
  const miss = []; let need = null;
  const lack = (k, t) => { miss.push(`${k} ${t}구간`); need ??= lockStat(s, k, t).need; };
  if (e.인맥 && tier(s, '인맥') < e.인맥) lack('인맥', e.인맥);
  if (e.체력 && tier(s, '체력') < e.체력) lack('체력', e.체력);
  if (e.회사단계) {
    const ok = Math.max(s.company?.stage ?? 0, s.company2?.stage ?? 0) >= e.회사단계 || (e.투자이력대체 && hasInvested(s));
    if (!ok) miss.push(e.투자이력대체 ? `회사 ${e.회사단계}단계 또는 투자 이력` : `회사 ${e.회사단계}단계`);
  }
  const ok = miss.length === 0;
  const cost = clubCost(s, { 모임: group, 비용: e.비용 ?? 0 });
  return { ok, miss, need, why: ok ? undefined : need ? lockStat(s, need.stat, TIER_MIN.indexOf(need.min)).why + (miss.length > 1 ? ` 외 ${miss.length - 1}개` : '') : miss.join(', '), cost, 설명: e.설명 };
}
export function gatherings(s) {
  init(s);
  const seen = new Map();
  for (const p of DATES) {
    if (p.쓰임 !== '사교모임') continue;
    const g = p.만남.모임;
    if (!seen.has(g)) seen.set(g, { 모임: g, 성격: p.만남.모임_성격, 입장함: !!s.love.clubs[g], ...gatherCheck(s, p) });
  }
  return [...seen.values()];
}

// 지금 이 사람의 구간 조건(옛 인연, 구간 변화 반영)
export function condOf(s, p) {
  const c = p.만남.조건 ?? {};
  let 매력 = c.매력 ?? 0;
  const v = p.만남.구간변화;
  if (v) for (const [y, t] of Object.entries(v)) if (s.year >= +y) 매력 = t;
  if (p.만남.옛인연 && (s.bonds?.[p.id] ?? 0) >= OLD_BOND && 매력 <= 3) 매력 = Math.min(매력, 2);
  return { 매력, 인맥: c.인맥 ?? 0 };
}
function inPeriod(s, p) {
  const list = p.만남.기간들 ?? [p.만남.기간];
  return list.some(([a, b]) => s.year >= a && s.year <= b);
}
const isMarriedOff = (s, p) => p.결혼연도 != null && s.year >= p.결혼연도 && !(p.만남.재개 && s.year >= p.만남.재개);
// 학생 때 마음이 쓰였던 사람은 둘 다 스무 살이 되면 동창 후보로 일찍 나온다(crush.js 기록).
const crushTie = (s, p) => { const h = s.crush?.history?.[p.id]; return !!h && ['사귐', '썸', '친한 사이'].includes(h.best) && s.year >= p.출생연도 + 20 && s.year <= (p.만남.기간?.[1] ?? 2026); };
export function crushBonus(s, id) {
  const h = s.crush?.history?.[id];
  if (!h) return 0;
  if (h.best === '사귐') return h.end === '나쁘게' ? -10 : 25;
  return { 썸: 12, '친한 사이': 6, '신경 쓰이는 애': 3 }[h.best] ?? 0;
}
const onSchoolPath = (s, p) => !p.만남.학교 || Object.values(s.school ?? {}).includes(p.만남.학교);
// 양쪽 다 성인인지 본다. 모든 후보 판정이 이 함수를 거친다.
const adultPair = (s, p) => isAdult(s) && s.year - p.출생연도 >= ADULT_AGE;
// 나이 차가 20살 이상이면 후보가 아니다(사용자 지시 2026-11-10). 모든 후보에 같이 쓴다.
export const AGE_GAP_MAX = 20;
const ageGapOK = (s, p) => Math.abs((p.출생연도 ?? 0) - (s.birthYear ?? BIRTH_YEAR)) < AGE_GAP_MAX;
// 아는사람: 학교·인맥으로 실제로 알게 된 사람만 다시 닿는다(dates_more.json).
const metBefore = (s, p) => !p.만남.아는사람 || s.bonds?.[p.id] != null || crushTie(s, p);
function eligible(s, p) {
  if (!ageGapOK(s, p) || !metBefore(s, p) || !hasAdultPhoto(p.id)) return false;
  if (!canAppear(p.id, stageOf(s)) || p.성별 === s.sex || !adultPair(s, p) || !(inPeriod(s, p) || crushTie(s, p)) || isMarriedOff(s, p)) return false;
  if (!onSchoolPath(s, p) && !crushTie(s, p)) return false;
  if (ended(s, p.id) || isBlockedByCompany(s, p.id)) return false;
  return true;
}
function statOK(s, p) {
  const c = condOf(s, p);
  return tier(s, '매력') >= c.매력 && tier(s, '인맥') >= c.인맥;
}
function inRoute(s, p, route, opts) {
  switch (route) {
    case '동창': return p.쓰임 === '동창';
    case '소개팅': return (p.쓰임 === '소개팅' && p.만남.경로 === '소개팅') || (p.쓰임 === '동창' && !p.만남.학교 && condOf(s, p).매력 <= 3 && (s.bonds?.c11 ?? 0) > 0);
    case '선보기': return ((p.쓰임 === '소개팅' && p.만남.경로 === '선보기') || (p.쓰임 === '동창' && (p.만남.길 ?? '').includes('선보기'))) && grade(p) <= familyAccess(s);
    case '결혼정보회사': return p.쓰임 === '소개팅' && p.만남.경로 === '결혼정보회사' && grade(p) <= matchmakerAccess(s);
    case '사교모임': return p.쓰임 === '사교모임' && (!opts.group || p.만남.모임 === opts.group) && gatherCheck(s, p).ok;
    case '헌팅': return p.쓰임 === '헌팅';
    case '유명인': return p.쓰임 === '유명인' && s.year >= (p.만남.처음_등장?.연도 ?? 0) && tier(s, '인맥') >= (p.만남.만남조건?.인맥 ?? 0) && tier(s, '매력') >= (p.만남.만남조건?.매력 ?? 0);
    default: return false;
  }
}

// 후보 추리기. 미성년(주인공, 상대 모두)은 여기서 전부 빠진다.
export function candidates(s, route, opts = {}) {
  init(s);
  const r = ROUTES[route];
  if (!r || !r.pool) return [];
  if (!isAdult(s) || locked(s) || r.need(s)) return [];
  return DATES.filter((p) => eligible(s, p) && statOK(s, p) && inRoute(s, p, route, opts));
}
const grade = (p) => GRADE[p.집안등급] ?? 0;
// 선보기: 상대 급은 인맥. 결혼정보회사: 돈·직장·지능.
function familyAccess(s) { const t = tier(s, '인맥'); return t >= 4 ? 2 : t >= 3 ? 1 : 0; }
function matchmakerAccess(s) {
  let g = s.cash >= 1e9 ? 2 : s.cash >= 1e8 ? 1 : 0;
  if (s.company && g < 2) g += 1;
  if (tier(s, '지능') >= 4 && g < 2) g += 1;
  return Math.min(2, g);
}

// ---------- 호감 ----------
export function stageOfLike(v) { return v >= THREE.hi ? 3 : v >= THREE.lo ? 2 : 1; }
export function likeText(s, id) {
  const e = s.love?.people?.[id] ?? (s.partner?.id === id ? s.partner : null);
  const p = personOf(id);
  const n = p?.이름 ?? '상대';
  if (!e) return `${n}을(를) 아직 모릅니다.`;
  return [null, `${n}과(와) 아직 어색합니다.`, `${n}과(와) 있으면 마음이 편합니다.`, `${n}은(는) 곁에 오래 두고 싶은 사람입니다.`][stageOfLike(e.호감)];
}
const likeOf = (s, id) => (s.partner?.id === id ? s.partner : s.love.people[id]);

function spend(s, cost, useSlot = true) {
  if (s.cash < cost) return '돈이 모자랍니다.';
  if (useSlot && s.used >= s.capacity) return SLOT;
  s.cash -= cost;
  if (useSlot) s.used += 1;
  return null;
}
const routeCost = (s, route, opts) => {
  if (route === '미팅' && !isAdult(s)) return HIGHSCHOOL_MEETING_COST;
  if (route === '소개팅' && s.love.freeIntro > 0) return 0;
  if (route === '유명인') return personOf(opts.id)?.만남?.비용 ?? 0;
  return ROUTES[route].cost;
};

export function canMeet(s, route, opts = {}) {
  init(s);
  const r = ROUTES[route];
  if (!r) return { ok: false, why: '없는 만남입니다.' };
  if (s.ended) return { ok: false, why: '이야기가 끝났습니다.' };
  if (inService(s)) return { ok: false, why: '복무 중에는 만나러 갈 수 없습니다.' };
  if (!isAdult(s)) {
    if (route !== '미팅' || stageOf(s) !== '고등') return { ok: false, why: stageOf(s) === '고등' ? '고등학생 때는 미팅만 열립니다.' : '아직 열리지 않았습니다.' };
    if (s.cash < HIGHSCHOOL_MEETING_COST) return lockCash(s, HIGHSCHOOL_MEETING_COST);
    if (s.used >= s.capacity) return { ok: false, why: SLOT };
    return { ok: true, cost: HIGHSCHOOL_MEETING_COST };
  }
  if (LOCKED_WHEN_PARTNER.includes(route)) {
    const l = locked(s);
    if (l) return { ok: false, why: l };
  }
  const n = r.need(s);
  if (n) return n;
  let cost = routeCost(s, route, opts);
  if (route === '사교모임') {
    const g = gatherings(s).find((x) => x.모임 === opts.group);
    if (!g) return { ok: false, why: '모임을 골라야 합니다.' };
    if (!g.ok) return { ok: false, why: `입장 조건이 모자랍니다: ${g.miss.join(', ')}`, need: g.need };
    cost = g.cost;
  }
  if (route === '결혼정보회사') {
    const L = s.love;
    if (L.lastIntro != null && ym(s) - L.lastIntro < 3) return { ok: false, why: '다음 소개는 3개월마다 옵니다.' };
  }
  if (route === '유명인' && opts.id && !candidates(s, '유명인').some((p) => p.id === opts.id)) return { ok: false, why: '지금은 닿을 수 없는 사람입니다.' };
  if (s.cash < cost) return lockCash(s, cost);
  if (s.used >= s.capacity) return { ok: false, why: SLOT };
  return { ok: true, cost };
}

export function joinMatchmaker(s) {
  init(s);
  if (!isAdult(s)) return { ok: false, why: '성인이 된 뒤에 열립니다.' };
  if (s.love.matchmaker) return { ok: false, why: '이미 가입했습니다.' };
  const l = locked(s);
  if (l) return { ok: false, why: l };
  if (s.cash < ROUTES.결혼정보회사.joinCost) return lockCash(s, ROUTES.결혼정보회사.joinCost);
  s.cash -= ROUTES.결혼정보회사.joinCost;
  s.love.matchmaker = { since: ym(s) };
  const t = '결혼정보회사에 가입했습니다. 석 달마다 소개가 옵니다.';
  say(s, t);
  return { ok: true, text: t };
}

// 만남 뒤 화면에 쓸 칸. 외모와 성격은 처음 볼 때 보여 주고, 좋아하는 것은 하나만 먼저 알린다.
function sceneOf(route, p) {
  const m = p.만남;
  return { 장소: m.장소, 시간대: m.시간대, 왜_거기_있나: m.왜_거기_있나, 반응: m.말_걸었을_때, 첫_만남: m.첫_만남, 주선_경로: m.주선_경로, 모임: m.모임, 역할: m.모임에서_역할, 외모: p.외모, 성격: p.성격, 백제대사: p.백제대사, 직업: p.직업_2026, 힌트: m['좋아하는 것']?.[0] ?? null };
}
const HUNT_OK = [0.6, 0.75, 0.9];
function learnMeet(s, p) {
  if (p.쓰임 !== '유명인' || !p.만남.곧_뜰_사람) return false;
  const debut = p.만남.데뷔연도 ?? (p.만남.처음_등장?.연도 ?? 0) + 2;
  return s.year <= debut && markEarly(s, p);
}
const gainCharm = (s, k = 0.5) => { raise(s, '매력', k); };
function articleRisk(s, p, base) {
  if (p.쓰임 !== '유명인') return null;
  if (chance(s, `article${p.id}${s.used}`) >= base) return null;
  const t = `연예 면에 ${p.이름}의 사진이 실렸습니다. 옆에 누군가 서 있다는 말이 돕니다.`;
  s.flags.연애기사 = true;
  s.love.기사.push({ id: p.id, year: s.year, month: s.month });
  s.stress = Math.min(STRESS_MAX, s.stress + 6);
  say(s, t);
  return t;
}

// 만남을 한 번 한다. 후보가 있으면 한 명을 고르고 아는 사이로 기록한다. opts: {group} 사교모임, {id} 유명인·동창을 콕 집을 때.
export function meet(s, route, opts = {}) {
  const c = canMeet(s, route, opts);
  if (!c.ok) return c;
  const r = ROUTES[route];
  const err = spend(s, c.cost);
  if (err) return { ok: false, why: err };
  if (route === '결혼정보회사') s.love.lastIntro = ym(s);
  if (route === '소개팅' && c.cost === 0 && s.love.freeIntro > 0) s.love.freeIntro -= 1;
  if (route === '사교모임') s.love.clubs[opts.group] = true;
  gainCharm(s);
  if (r.light) {
    s.stress = Math.max(0, s.stress - 2);
    const t = !isAdult(s) ? '다른 학교 아이들과 분식집에서 떠들다 헤어졌습니다. 그날 일은 다음 날 친구들 놀림거리가 됐습니다.'
      : route === '미팅' ? '함께 나간 사람들과 어울려 놀았습니다. 연락처를 주고받지는 않았습니다.' : '시끄러운 밤이 지나갔습니다. 이름만 겨우 아는 사이가 늘었습니다.';
    say(s, t);
    return { ok: true, light: true, cost: c.cost, text: t };
  }
  s.stress = Math.min(STRESS_MAX, s.stress + 2); // 처음 보는 자리는 긴장된다
  let list = candidates(s, route, opts);
  if (opts.id) list = list.filter((p) => p.id === opts.id);
  if (!list.length) {
    const t = route === '사교모임' ? `${opts.group}에 다녀왔습니다. 인사만 나누고 나왔습니다.` : '이번에는 마음이 가는 사람을 만나지 못했습니다.';
    say(s, t);
    return { ok: true, person: null, cost: c.cost, text: t };
  }
  const fresh = list.filter((p) => !s.love.people[p.id]);
  const from = fresh.length ? fresh : list;
  const p = from[pick(s, route + s.used, from.length)];
  if (route === '헌팅' && !s.love.people[p.id]) {
    const gap = clampIdx(tier(s, '매력') - condOf(s, p).매력);
    if (chance(s, `hunt${p.id}`) >= HUNT_OK[gap]) {
      closeRelation(s, p.id, '거절');
      const t = `${p.만남.장소}에서 ${p.이름}에게 말을 걸었습니다. "${p.만남.거절}" 그걸로 끝입니다.`;
      say(s, t);
      return { ok: true, refused: true, person: p, cost: c.cost, text: t, scene: sceneOf(route, p) };
    }
  }
  const start = (route === '선보기' ? 45 : route === '동창' ? 30 + Math.min(20, s.bonds[p.id] ?? 0) : 20) + crushBonus(s, p.id);
  const firstTime = !s.love.people[p.id];
  const e = s.love.people[p.id] ?? (s.love.people[p.id] = { 호감: start, 처음: ym(s), 마지막: ym(s), 길: route });
  e.마지막 = ym(s);
  const text = openingLine(s, route, p, firstTime);
  say(s, text);
  const early = learnMeet(s, p);
  const news = articleRisk(s, p, 0.12);
  return { ok: true, person: p, cost: c.cost, text, scene: sceneOf(route, p), early, news };
}
const clampIdx = (g) => Math.min(2, Math.max(0, g));
function openingLine(s, route, p, firstTime) {
  const m = p.만남;
  if (!firstTime) return `${p.이름}과(와) 다시 마주쳤습니다.`;
  if (route === '헌팅') return `${m.장소}에서 ${p.이름}에게 말을 걸었습니다. ${m.말_걸었을_때}`;
  if (route === '사교모임') return `${m.모임}에서 ${p.이름}을(를) 알게 됐습니다. ${m.모임에서_역할 ?? ''}`.trim();
  if (route === '선보기') return `양가 어른의 자리에서 ${p.이름}을(를) 만났습니다.`;
  if (route === '결혼정보회사') return `결혼정보회사가 ${p.이름}을(를) 소개했습니다. ${m.첫_만남 ?? ''}`.trim();
  if (route === '소개팅') return p.쓰임 === '동창' ? `임재민이 자리를 만들었습니다. ${p.이름}이(가) 앉아 있습니다. 오랜만입니다.` : `${m.주선_경로}로 ${p.이름}을(를) 만났습니다. ${m.첫_만남 ?? ''}`.trim();
  if (route === '동창') return `${p.이름}과(와) 다시 닿았습니다. ${m.첫_만남 ?? ''}`.trim();
  if (route === '유명인') return `${p.이름}을(를) 만났습니다. ${m.만남조건?.설명 ?? ''}`.trim();
  return `${p.이름}을(를) 만났습니다.`;
}
// 인맥 관리에서 만난 후보를 연애 후보 목록에 올린다(양쪽 성인 조건 그대로). 후보가 아니면 false.
export function adopt(s, id, route = '인맥') {
  init(s);
  const p = personOf(id);
  if (!p || !eligible(s, p) || locked(s) || s.love.people[id]) return false;
  s.love.people[id] = { 호감: 25 + Math.min(20, s.bonds[id] ?? 0) + crushBonus(s, id), 처음: ym(s), 마지막: ym(s), 길: route };
  return true;
}
// 동창회에서 학생 때 그 사람을 다시 만난다. 성인 후보면 아는 사이로 올리고, 아니면 추억만 남긴다.
export const canReunite = (s, id) => { init(s); const p = personOf(id); return !!p && eligible(s, p) && !locked(s) && !s.love.people[id]; };
export function reunite(s, id) {
  const p = personOf(id), n = p?.이름 ?? '그 사람', h = s.crush?.history?.[id];
  if (!adopt(s, id, '동창')) return `${n}과(와) 옛날 이야기로 한참 웃었다. 각자 잘 살고 있어서 다행이었다.`;
  const past = h?.best === '사귐' ? (h.hand ? '처음 손을 잡았던 날 이야기가 나오자 둘 다 웃음을 참지 못했다.' : '사귀던 때 이야기가 나오자 둘 다 얼굴이 붉어졌다.') : '그때 서로 좋아했던 걸 이제야 털어놓았다.';
  return `${n}과(와) 학생 때 이야기를 했다. ${past} 헤어지기 전에 연락처를 주고받았다. ${p.직업_2026 ? `${n}은(는) 요즘 일 이야기를 하며 눈을 반짝였다.` : ''}`.trim();
}

// ---------- 데이트 ----------
export const DATE_ACTIVITIES = {
  산책: { cost: 20000, words: ['산책', '공원', '걷', '강변', '둘레길', '동네'] },
  영화: { cost: 50000, words: ['영화', '극장'] },
  식사: { cost: 80000, words: ['밥', '국밥', '식당', '칼국수', '맛집', '요리', '카페', '커피', '빵', '술'] },
  '공연·전시': { cost: 120000, words: ['공연', '전시', '미술', '음악', '콘서트', '밴드', '연극'] },
  책방: { cost: 30000, words: ['서점', '책', '도서관'] },
  운동: { cost: 50000, words: ['운동', '등산', '러닝', '수영', '골프', '테니스', '자전거', '요가'] },
  여행: { cost: 500000, words: ['여행', '바다', '캠핑', '드라이브'] },
  선물: { cost: 200000, words: ['선물', '꽃', '문구'] },
  플렉스: { cost: 3000000, words: ['요트', '차 ', '드라이브', '골프', '리조트'] },
};
// '끝나는 경우' 문장을 종류로 나눈다. 어느 활동, 어떤 상태일 때 걸리는지가 다르다.
const TAG = [
  ['돈', /돈|재산|재력|자랑|허세|과시|배경|비싼|명품|잘난|집안|계산|조건|저울|점수|숫자/],
  ['약속', /약속|시간|늦|취소|미루|연락|잠수/],
  ['건성', /휴대폰|건성|흘리|시큰둥|대화를 막|감정|마감|무시/],
  ['음식', /음식|맛|밥값/],
];
const endTag = (p) => (TAG.find(([, re]) => re.test(p.만남['끝나는 경우'] ?? ''))?.[0] ?? '말');
const CHARM_RISK = [0.3, 0.2, 0.12, 0.07, 0.04, 0.02, 0.01];
function dateReact(s, p, act, e) {
  const A = DATE_ACTIVITIES[act];
  const tag = endTag(p);
  const likes = `${(p.만남['좋아하는 것'] ?? []).join(' ')} ${p.만남.잘되면 ?? ''}`;
  const liked = A.words.some((w) => likes.includes(w));
  if (tag === '돈' && (act === '선물' || act === '플렉스')) return 'bad';
  let risk = CHARM_RISK[tier(s, '매력') - 1] * (liked ? 0.5 : 1) * (s.gear?.dateSafe ?? 1);
  if (tag === '약속') risk = s.used >= s.capacity - 1 || s.used / Math.max(1, s.capacity) >= 0.8 ? 0.5 : 0.05;
  if (tag === '건성') risk = s.stress >= 70 ? 0.5 : 0.05;
  if (tag === '음식' && act === '식사') risk = 0.25;
  if (chance(s, `date${p.id}${act}${s.used}${e.횟수 ?? 0}`) < risk) return 'bad';
  if (liked) return 'good';
  if (act === '플렉스') return grade(p) >= 2 || p.쓰임 === '사교모임' ? 'ok' : 'flat';
  return 'ok';
}
const GAIN = { good: 16, ok: 7, flat: 2 };

export function canDate(s, id, act) {
  init(s);
  const A = DATE_ACTIVITIES[act];
  if (!A) return { ok: false, why: '없는 활동입니다.' };
  if (s.ended) return { ok: false, why: '이야기가 끝났습니다.' };
  if (!isAdult(s)) return { ok: false, why: '성인이 된 뒤에 열립니다.' };
  if (inService(s)) return { ok: false, why: '복무 중에는 만나러 갈 수 없습니다.' };
  const e = likeOf(s, id);
  if (!e) return { ok: false, why: '아직 만난 적이 없는 사람입니다.' };
  if (ended(s, id) && s.partner?.id !== id) return { ok: false, why: '이미 끝난 관계입니다.' };
  if (s.partner && s.partner.id !== id) return { ok: false, why: '지금 만나는 사람이 있습니다.' };
  if (s.cash < A.cost) return lockCash(s, A.cost);
  if (s.used >= s.capacity) return { ok: false, why: SLOT };
  return { ok: true, cost: A.cost };
}
// 데이트 메뉴. 활동 전부를 돌려준다.
export function dateOptions(s, id) {
  return Object.entries(DATE_ACTIVITIES).map(([act, A]) => ({ act, cost: A.cost, ...canDate(s, id, act) }));
}
// 상대에 대해 지금까지 알게 된 것. 호감이 오를수록 많이 보인다.
export function dateHints(s, id) {
  const e = likeOf(s, id); const p = personOf(id);
  if (!e || !p) return null;
  const st = stageOfLike(e.호감);
  const likes = p.만남['좋아하는 것'] ?? [];
  return { 좋아하는것: likes.slice(0, st), 끝나는경우: (st >= 2 || (e.나쁜 ?? 0) > 0) ? p.만남['끝나는 경우'] ?? '' : null, 성격: p.성격, 외모: p.외모, 백제대사: p.백제대사, 직업: jobAt(p.직업_2026, s.year) };
}
export function date(s, id, act) {
  const c = canDate(s, id, act);
  if (!c.ok) return c;
  const p = personOf(id);
  const e = likeOf(s, id);
  spend(s, c.cost);
  const r = dateReact(s, p, act, e);
  e.횟수 = (e.횟수 ?? 0) + 1;
  e.마지막 = ym(s);
  s.stress = Math.max(0, s.stress - 3);
  gainCharm(s, 0.3);
  const married = !!(s.partner?.id === id && s.partner.married);
  if (married) {
    s.partner.사이 = Math.min(100, s.partner.사이 + (r === 'bad' ? -8 : 8));
    if (s.partner.사이 < 0) s.partner.사이 = 0;
    const t = r === 'bad' ? `${p.이름}과(와) 나갔다가 말다툼을 했습니다.` : `${p.이름}과(와) 둘이 나갔다 왔습니다.`;
    say(s, t);
    return { ok: true, result: r === 'bad' ? 'bad' : r, text: t };
  }
  if (r === 'bad') {
    e.호감 = Math.max(0, e.호감 - 15);
    e.나쁜 = (e.나쁜 ?? 0) + 1;
    if (e.호감 <= 0 || e.나쁜 >= 2) {
      closeRelation(s, id, '끝남');
      const t = `${p.이름}이(가) 이야기를 마쳤습니다. 다시 만날 수 없습니다.`;
      say(s, t);
      return { ok: true, result: 'ended', text: t, reason: p.만남['끝나는 경우'] ?? '' };
    }
    const t = `${p.이름}의 표정이 굳었습니다. 오늘은 좋지 않았습니다.`;
    say(s, t);
    return { ok: true, result: 'bad', text: t, reason: p.만남['끝나는 경우'] ?? '', like: likeText(s, id) };
  }
  e.호감 = Math.min(100, e.호감 + (GAIN[r] > 0 ? GAIN[r] * charmTalk(s) : GAIN[r]));
  if (r === 'good' && (e.나쁜 ?? 0) > 0) e.나쁜 -= 1;
  const news = articleRisk(s, p, 0.15);
  const t = r === 'good' ? `${p.이름}이(가) 오늘을 오래 기억할 듯합니다.` : r === 'ok' ? `${p.이름}과(와) 무난한 하루를 보냈습니다.` : `${p.이름}은(는) 크게 반응하지 않았습니다.`;
  say(s, t);
  return { ok: true, result: r, text: t, like: likeText(s, id), news };
}

// ---------- 관계 ----------
function closeRelation(s, id, reason) {
  s.love.closed[id] = reason;
  delete s.love.people[id];
  if (s.partner?.id === id) {
    const how = reason === '식음' ? '식음' : reason === '헤어짐' ? (s.partner.호감 >= 50 ? '좋게' : '식음') : '틀어짐';
    s.partner = null; afterParting(s, id, how);
  }
}
// 알고 지내는 사람 + 연인. 화면 목록용.
export function knownPeople(s) {
  init(s);
  const out = [];
  if (s.partner) { const p = personOf(s.partner.id); if (p) out.push({ person: p, 관계: s.partner.married ? '배우자' : '연인', like: likeText(s, p.id), hints: dateHints(s, p.id) }); }
  for (const id of Object.keys(s.love.people)) { const p = personOf(id); if (p) out.push({ person: p, 관계: '아는 사이', like: likeText(s, id), hints: dateHints(s, id), askOut: canAskOut(s, id) }); }
  return out;
}
export function canAskOut(s, id) {
  init(s);
  if (!isAdult(s)) return { ok: false, why: '성인이 된 뒤에 열립니다.' };
  if (s.partner) return { ok: false, why: '지금 만나는 사람이 있습니다.' };
  const e = s.love.people[id];
  if (!e) return { ok: false, why: '아직 만난 적이 없는 사람입니다.' };
  const p = personOf(id);
  if (!p || s.year - p.출생연도 < ADULT_AGE) return { ok: false, why: '고백할 수 없는 사람입니다.' };
  const c = condOf(s, p);
  if (tier(s, '매력') < c.매력) return lockStat(s, '매력', c.매력);
  if (tier(s, '인맥') < c.인맥) return lockStat(s, '인맥', c.인맥);
  return { ok: true };
}
// 연인이 되자고 말한다. 호감이 모자라면 거절당하고 관계가 닫힌다.
export function askOut(s, id) {
  const can = canAskOut(s, id);
  if (!can.ok) return can;
  const e = s.love.people[id];
  const p = personOf(id);
  if (e.호감 >= 50) {
    delete s.love.people[id];
    s.partner = { id, 이름: p.이름, 호감: e.호감, since: { year: s.year, month: s.month }, 사이: 70, 나쁜달: 0, 마지막: ym(s), 쓰임: p.쓰임, 집안등급: p.집안등급, 직업: jobAt(p.직업_2026, s.year), 직업표: p.직업_2026 ?? '', 형편: p.형편_2026 ?? null, 양가: null, 청혼: false, married: null, 자녀: [] };
    const t = `${p.이름}이(가) 고개를 끄덕였습니다. 이제 연인입니다.`;
    say(s, t);
    return { ok: true, accepted: true, text: t };
  }
  closeRelation(s, id, '거절');
  const t = p.만남.거절 ? `${p.이름}이(가) 말했습니다. "${p.만남.거절}" 더는 찾아가지 않습니다.` : `${p.이름}이(가) 마음을 받지 못하겠다고 했습니다. 더는 찾아가지 않습니다.`;
  say(s, t);
  return { ok: true, accepted: false, text: t };
}
export function breakUp(s) {
  init(s);
  if (!s.partner || s.partner.married) return { ok: false, why: '헤어질 연인이 없습니다.' };
  const id = s.partner.id;
  const n = s.partner.이름;
  closeRelation(s, id, '헤어짐');
  s.stress = Math.min(100, s.stress + 8);
  const t = `${n}과(와) 헤어졌습니다.`;
  say(s, t);
  return { ok: true, text: t };
}

// ---------- 프러포즈, 양가, 결혼식 ----------
export const isMarried = (s) => !!s.partner?.married;
export function canPropose(s) {
  init(s);
  const P = s.partner;
  if (!P || P.married) return { ok: false, why: '프러포즈할 연인이 없습니다.' };
  if (P.청혼) return { ok: false, why: '이미 청혼을 받아 주었습니다.' };
  if (stageOfLike(P.호감) < 3) return { ok: false, why: '아직 때가 아닙니다. 데이트를 더 해 보세요.' };
  if (P.청혼거절 != null && ym(s) < P.청혼거절) return { ok: false, why: '지금 다시 말할 때가 아닙니다.' };
  return { ok: true };
}
export function propose(s) {
  const c = canPropose(s);
  if (!c.ok) return c;
  const P = s.partner;
  const p = personOf(P.id);
  const noMarry = p?.만남?.결혼의향 === false;
  const rate = P.호감 >= 85 ? 1 : tier(s, '매력') >= (p ? condOf(s, p).매력 : 0) ? 0.8 : 0.5;
  if (noMarry || chance(s, `propose${P.id}`) >= rate) {
    P.청혼거절 = ym(s) + 6;
    P.호감 = Math.max(0, P.호감 - 5);
    const t = noMarry ? `${P.이름}이(가) 반지를 돌려줬습니다. 결혼은 생각이 없다고 합니다. 연인으로는 그대로입니다.` : `${P.이름}이(가) 아직은 아니라고 했습니다. 그날은 더 묻지 않았습니다.`;
    say(s, t);
    return { ok: true, accepted: false, text: t };
  }
  P.청혼 = true;
  const pp = personOf(P.id), extra = pp ? wordsOf(pp).propose : null;
  const t = `${P.이름}이(가) 청혼을 받아 주었습니다.${extra ? ' ' + arcFill(s, pp, extra) : ''}`;
  say(s, t);
  return { ok: true, accepted: true, text: t };
}
// 순자산으로 본 내 집안 급. 순자산 값을 못 받으면 현금으로 본다.
export function myGrade(s, netWorthValue) {
  const v = netWorthValue ?? s.cash;
  return v >= 1e11 ? 3 : v >= 1e10 ? 2 : v >= 1e9 ? 1 : 0;
}
export function familyCheck(s, netWorthValue) {
  const P = s.partner;
  const gap = (GRADE[P.집안등급] ?? 0) - myGrade(s, netWorthValue);
  if (gap < 2) return { oppose: false, pass: true, gap };
  const need = P.집안등급 === '재벌' ? 5 : P.집안등급 === '큰 부자' ? 4 : 3;
  return { oppose: true, pass: tier(s, '인맥') >= need, need, gap };
}
export function meetFamilies(s, netWorthValue) {
  init(s);
  const P = s.partner;
  if (!P || P.married || !P.청혼) return { ok: false, why: '청혼을 받은 연인이 있어야 합니다.' };
  const f = familyCheck(s, netWorthValue);
  if (f.pass) {
    P.양가 = 'ok';
    const t = f.oppose ? `${P.이름}의 집안이 처음엔 반대했지만 ${s.name}의 사람 됨을 보고 마음을 열었습니다.` : '양가 어른이 인사를 나눴습니다.';
    say(s, t);
    return { ok: true, oppose: f.oppose, passed: true, text: t };
  }
  P.양가 = 'no';
  P.호감 = Math.max(0, P.호감 - 20);
  const t = `${P.이름}의 집안이 결혼을 반대했습니다. 인맥이 더 필요합니다.`;
  say(s, t);
  return { ok: true, oppose: true, passed: false, text: t, need: lockStat(s, '인맥', f.need).need };
}
export const WEDDINGS = {
  작은: { cost: 20000000, stress: 2 },
  보통: { cost: 50000000, stress: 4 },
  호텔: { cost: 300000000, stress: 6 },
};
export function wedding(s, kind) {
  init(s);
  const P = s.partner;
  const W = WEDDINGS[kind];
  if (!W) return { ok: false, why: '없는 결혼식입니다.' };
  if (!P || P.married || !P.청혼) return { ok: false, why: '청혼을 받은 연인이 있어야 합니다.' };
  if (P.양가 !== 'ok') return { ok: false, why: '양가 인사를 먼저 마쳐야 합니다.' };
  if (s.cash < W.cost) return lockCash(s, W.cost);
  s.cash -= W.cost;
  s.stress = Math.max(0, s.stress - W.stress);
  P.married = { year: s.year, month: s.month, 종류: kind };
  P.사이 = 80;
  P.마지막 = ym(s);
  if (s.flags.이혼) s.flags.재혼 = true;
  s.flags.결혼 = true;
  const wp = personOf(P.id), wline = wp ? wordsOf(wp).wedding : null;
  const t = `${P.이름}과(와) ${kind} 결혼식을 올렸습니다.${wline ? ' ' + arcFill(s, wp, wline) : ''}`;
  say(s, t);
  return { ok: true, text: t };
}
// 결혼 전 단계를 순서대로 알려 준다. 화면은 next만 보여 주면 된다.
export function marriageStep(s) {
  const P = s.partner;
  if (!P) return null;
  if (P.married) return { next: '가정' };
  if (!P.청혼) return { next: '청혼', ...canPropose(s) };
  if (P.양가 !== 'ok') return { next: '양가 인사', ok: true };
  return { next: '결혼식', ok: true, 종류: Object.entries(WEDDINGS).map(([k, W]) => ({ kind: k, cost: W.cost, ok: s.cash >= W.cost })) };
}

// ---------- 먼저 다가오는 사람 (매력 4·5구간) ----------
function maybeApproach(s) {
  const L = s.love;
  if (L.approach || s.partner || !isAdult(s) || locked(s)) return;
  const t = tier(s, '매력');
  if (t < 4 || (L.lastApproach != null && ym(s) - L.lastApproach < 6)) return;
  if (chance(s, 'approach') >= 0.35) return;
  const list = DATES.filter((p) => eligible(s, p) && !L.people[p.id] && condOf(s, p).매력 >= 3 && condOf(s, p).매력 <= t && tier(s, '인맥') >= condOf(s, p).인맥);
  if (!list.length) return;
  const p = list[pick(s, 'approachPick', list.length)];
  L.approach = { id: p.id, 종류: t >= 5 ? '구애' : '관심' };
  L.lastApproach = ym(s);
}
const SCENE_LOVE = {
  관심: (p) => `${p.이름}이(가) 먼저 연락해 왔습니다. 저녁을 같이 먹자고 합니다.`,
  구애: (p) => `${p.이름}이(가) 사람을 넣어 자리를 청했습니다. 대놓고 마음이 있다고 합니다.`,
};
function introDue(s) {
  const L = s.love;
  if (!L.matchmaker || locked(s) || !isAdult(s)) return false;
  const last = Math.max(L.lastIntro ?? L.matchmaker.since, L.introDeclined ?? -Infinity);
  return ym(s) - last >= 3;
}
// ---------- 성향 이야기(data/love_arcs.js) ----------
// 사람마다 성향 하나. 직접 정한 값(만남.성향)이 있으면 그것, 없으면 데이터에서 고른다.
export function arcOf(p) {
  const m = p.만남 ?? {}, job = p.직업_2026 ?? '';
  if (m.성향 && ARCS[m.성향]) return m.성향;
  if (m.결혼의향 === false) return '자유';
  if (p.쓰임 === '유명인' && !/재벌|회장|정치/.test(m.분류 ?? '')) return '연예';
  if (['재벌', '큰 부자'].includes(p.집안등급)) return '집안';
  if (/[A-Za-z]/.test(p.이름) || /해외|미국|독일|영국|일본|프랑스|하와이|유학|휴스턴|런던|뉴욕/.test(job)) return '먼곳';
  if (/구속|간섭|재촉|집착|자유롭|혼자 지내|혼자 산다|혼자 살/.test(`${m['끝나는 경우'] ?? ''} ${p.성격 ?? ''} ${p.히스토리 ?? ''}`)) return '자유';
  if (p.쓰임 === '동창') return '옛정';
  if (/대표|창업|의사|변호사|기자|PD|엔지니어|연구|팀장|이사|셰프|사장|회계사|검사|판사/.test(job)) return '일';
  if (p.쓰임 === '헌팅') return '밤';
  return '신중';
}
const ARC_LIKE_AT = 35; // 고비: 호감이 이만큼 오르고 두 번 넘게 만난 뒤
const sinceOf = (P) => (P.since ? P.since.year * 12 + (P.since.month - 1) : null);
// 지금 볼 성향 장면 하나(한 달에 하나까지).
function arcDue(s) {
  const L = s.love; L.arc ??= {};
  if (L.arcAt === ym(s) || !isAdult(s) || inService(s)) return null;
  const done = (id) => L.arc[id] ?? [];
  const P = s.partner;
  if (P?.married && personOf(P.id)) {
    const m = ym(s) - (P.married.year * 12 + ((P.married.month ?? 1) - 1));
    if ((P.사이 ?? 80) < 35 && (L.crisisAt == null || ym(s) - L.crisisAt >= 24)) return { id: P.id, wed: 'crisis' };
    const done = ((L.wed ??= {})[P.id] ??= []);
    // 때를 2년 넘게 지난 장면은 건너뛴다(예전 저장에서 결혼한 지 오래된 부부).
    for (const w of MARRIED) if (m >= w.due && m < w.due + 24 && !done.includes(w.key)) return { id: P.id, wed: w.key };
    return null;
  }
  if (P && !P.married && personOf(P.id)) {
    const m = ym(s) - (sinceOf(P) ?? ym(s));
    for (const [b, need] of [[1, 3], [2, 12]]) if (m >= need && !done(P.id).includes(b)) return { id: P.id, b };
    return null;
  }
  if (P) return null;
  for (const [id, e] of Object.entries(L.people)) if (e.호감 >= ARC_LIKE_AT && (e.횟수 ?? 0) >= 2 && !done(id).includes(0) && personOf(id)) return { id, b: 0 };
  return null;
}
// 주인공급 인물은 자기 장면, 나머지는 성향 장면.
export const beatsOf = (p) => PERSONAL[p.id]?.beats ?? ARCS[arcOf(p)].beats;
const wordsOf = (p) => ({ ...ARC_WORDS[arcOf(p)], ...(PERSONAL[p.id] ?? {}) });
const arcFill = (s, p, t) => t.replaceAll('{n}', p.이름).replaceAll('{job}', jobAt(p.직업_2026, s.year) || '맡은');
const wedBeat = (p, key) => (key === 'crisis' ? CRISIS : key === '성향' ? ARC_MARRIED[arcOf(p)] : MARRIED.find((w) => w.key === key));
function arcScene(s) {
  const d = arcDue(s); if (!d) return null;
  if (d.wed) {
    const p = personOf(d.id), B = wedBeat(p, d.wed);
    return { id: `love:wed:${d.wed}`, title: B.title, text: arcFill(s, p, B.text), who: p.id, kind: '연애', choices: B.choices.map((c) => ({ label: arcFill(s, p, c.label), ok: true })) };
  }
  const p = personOf(d.id), B = beatsOf(p)[d.b];
  return { id: `love:arc:${d.id}:${d.b}`, title: B.title, text: arcFill(s, p, B.text), who: p.id, kind: '연애', arc: arcOf(p), choices: B.choices.map((c) => ({ label: arcFill(s, p, c.label), ok: true })) };
}
function chooseWed(s, id, i) {
  const key = id.slice('love:wed:'.length), d = arcDue(s);
  if (!d || d.wed !== key) return { ok: false, why: '지금 볼 수 있는 장면이 아닙니다.' };
  const P = s.partner, p = personOf(P.id), B = wedBeat(p, key), C = B.choices[i] ?? B.choices[0];
  P.사이 = Math.max(0, Math.min(100, (P.사이 ?? 80) + C.like));
  if (C.stress) s.stress = Math.max(0, Math.min(STRESS_MAX, s.stress + C.stress));
  if (key === 'crisis') s.love.crisisAt = ym(s); else s.love.wed[P.id].push(key);
  s.love.arcAt = ym(s);
  const t = arcFill(s, p, C.result); say(s, t);
  return { ok: true, text: t, result: C.like > 0 ? 'good' : 'bad' };
}
function chooseArc(s, id, i) {
  const [, , pid, bs] = id.split(':'), b = +bs, d = arcDue(s);
  if (!d || d.id !== pid || d.b !== b) return { ok: false, why: '지금 볼 수 있는 장면이 아닙니다.' };
  const p = personOf(pid), C = beatsOf(p)[b].choices[i] ?? beatsOf(p)[b].choices[0];
  const e = likeOf(s, pid);
  if (e) e.호감 = Math.max(0, Math.min(100, e.호감 + C.like));
  if (C.stress) s.stress = Math.max(0, Math.min(STRESS_MAX, s.stress + C.stress));
  (s.love.arc[pid] ??= []).push(b); s.love.arcAt = ym(s);
  const t = arcFill(s, p, C.result); say(s, t);
  return { ok: true, text: t, result: C.like > 0 ? 'good' : C.like < 0 ? 'bad' : 'ok' };
}

// ---------- 연인 사이의 거리(data/love_arcs.js TOUCH) ----------
// 연인(또는 배우자)과 데이트를 이어 가면 손잡기 → 포옹 → 첫 키스 → 함께 보내는 밤이 차례로 열린다. 한 달에 하나까지.
const NIGHT_EVERY = 4; // 4단계 뒤 함께 보내는 밤이 다시 오는 간격(달)
function touchDue(s) {
  const P = s.partner, L = s.love;
  if (!P || !personOf(P.id) || !isAdult(s) || inService(s) || L.touchAt === ym(s)) return null;
  // 결혼한 부부는 처음 단계를 건너뛴다
  const step = P.married ? Math.max(4, P.거리 ?? 0) : P.거리 ?? 0, dates = P.횟수 ?? 0, months = ym(s) - (sinceOf(P) ?? ym(s));
  const T = TOUCH.find((x) => x.step === step + 1);
  if (T) {
    const like = P.married ? 100 : P.호감;
    if (dates >= T.dates && like >= T.like && months >= T.months && ym(s) - (P.거리At ?? -99) >= 1) return { T };
    return null;
  }
  // 4단계 뒤: 최근 두 달 안에 만났고, 지난 밤에서 NIGHT_EVERY달이 지났으면
  if (ym(s) - (P.밤At ?? -99) >= NIGHT_EVERY && ym(s) - (P.마지막 ?? -99) <= 2) return { again: true };
  return null;
}
function touchScene(s) {
  const d = touchDue(s); if (!d) return null;
  const P = s.partner, p = personOf(P.id);
  if (d.T) return { id: `love:touch:${d.T.step}`, title: d.T.title, text: arcFill(s, p, d.T.text), who: p.id, kind: '연애', look: d.T.look ?? null, choices: d.T.choices.map((c) => ({ label: arcFill(s, p, c.label), ok: true })) };
  const line = P.married ? NIGHT_MARRIED : NIGHT_LINE[arcOf(p)] ?? NIGHT_LINE.신중;
  return { id: 'love:night', title: '함께 보내는 밤', text: `오늘도 그 방입니다. ${p.이름}이(가) 창가에서 돌아봅니다.\n${line}`, who: p.id, kind: '연애', look: 'hotel',
    choices: [{ label: '함께 밤을 보낸다', ok: true }, { label: '오늘은 쉬자고 한다', ok: true }] };
}
function chooseTouch(s, id, i) {
  const d = touchDue(s), P = s.partner;
  const want = id === 'love:night' ? 'again' : +id.split(':')[2];
  if (!d || (want === 'again' ? !d.again : d.T?.step !== want)) return { ok: false, why: '지금 볼 수 있는 장면이 아닙니다.' };
  const p = personOf(P.id); s.love.touchAt = ym(s);
  const bump = (n) => { if (P.married) P.사이 = Math.max(0, Math.min(100, (P.사이 ?? 80) + n)); else P.호감 = Math.max(0, Math.min(100, P.호감 + n)); };
  if (d.again) {
    P.밤At = ym(s);
    if (i === 0) { bump(4); s.stress = Math.max(0, s.stress - 4); const t = '그날 밤은 집에 돌아가지 않았습니다.'; say(s, t); return { ok: true, text: t, result: 'good' }; }
    bump(1); const t = `${p.이름}이(가) 알겠다며 웃었습니다. 둘은 일찍 불을 껐습니다.`; say(s, t); return { ok: true, text: t, result: 'ok' };
  }
  const C = d.T.choices[i] ?? d.T.choices[0];
  bump(C.like);
  // 첫 선택(다가감)이면 다음 단계로. 아니면 다음 달에 다시 기회가 온다.
  if (i === 0 || d.T.choices.length === 1) { P.거리 = d.T.step; P.거리At = ym(s); if (d.T.step === 4) P.밤At = ym(s); }
  const t = arcFill(s, p, C.result); say(s, t);
  return { ok: true, text: t, result: C.like > 2 ? 'good' : 'ok' };
}
export const touchStep = (s) => s.partner?.거리 ?? 0;

// 장면 전부: 가족, 회귀, 먼저 다가옴, 결혼정보회사 소개 알림, 상대의 청혼.
export function pendingScenes(s) {
  init(s);
  const out = [...family.pendingScenes(s), ...company.pendingScenes(s)];
  const L = s.love;
  if (L.approach) {
    const p = personOf(L.approach.id);
    if (p) out.push({ id: 'love:approach', title: '먼저 온 연락', text: SCENE_LOVE[L.approach.종류](p), who: p.id, kind: '연애', choices: [{ label: '만나 본다', ok: true }, { label: '정중히 사양한다', ok: true }] });
  }
  if (introDue(s)) {
    const cost = ROUTES.결혼정보회사.cost;
    out.push({ id: 'love:intro', title: '소개 알림', text: '결혼정보회사에서 새 소개가 왔다고 전화가 왔습니다.', kind: '연애', choices: [{ label: '소개받는다', cost, ok: s.cash >= cost && s.used < s.capacity, why: s.cash < cost ? '돈이 모자랍니다.' : s.used >= s.capacity ? SLOT : undefined }, { label: '이번에는 넘긴다', ok: true }] });
  }
  const A = arcScene(s); if (A) out.push(A);
  const T = touchScene(s); if (T) out.push(T);
  const P = s.partner;
  if (P && !P.married && !P.청혼 && !P.상대청혼끝 && tier(s, '매력') >= 5 && P.호감 >= THREE.hi && personOf(P.id)?.만남?.결혼의향 !== false) {
    out.push({ id: 'love:counter', title: '먼저 꺼낸 말', text: `${P.이름}이(가) 먼저 결혼 이야기를 꺼냈습니다.`, who: P.id, kind: '연애', choices: [{ label: '받아들인다', ok: true }, { label: '아직 이르다고 한다', ok: true }] });
  }
  return out;
}
export function chooseScene(s, id, i = 0) {
  init(s);
  const L = s.love;
  if (id === 'love:approach') {
    const a = L.approach; if (!a) return { ok: false, why: '지금 볼 수 있는 장면이 아닙니다.' };
    const p = personOf(a.id);
    L.approach = null;
    if (i === 0) {
      L.people[a.id] = { 호감: a.종류 === '구애' ? 72 : 55, 처음: ym(s), 마지막: ym(s), 길: '먼저 연락' };
      const t = `${p.이름}과(와) 저녁을 먹었습니다.`; say(s, t); return { ok: true, text: t };
    }
    L.closed[a.id] = '사양';
    const t = '정중히 사양했습니다. 더 연락은 오지 않았습니다.'; say(s, t); return { ok: true, text: t };
  }
  if (id.startsWith('love:arc:')) return chooseArc(s, id, i);
  if (id.startsWith('love:wed:')) return chooseWed(s, id, i);
  if (id.startsWith('love:touch:') || id === 'love:night') return chooseTouch(s, id, i);
  if (id === 'love:intro') {
    if (i === 0) return meet(s, '결혼정보회사');
    L.introDeclined = ym(s);
    return { ok: true, text: '이번 소개는 넘겼습니다.' };
  }
  if (id === 'love:counter') {
    const P = s.partner; if (!P) return { ok: false, why: '지금 볼 수 있는 장면이 아닙니다.' };
    P.상대청혼끝 = true;
    if (i === 0) { P.청혼 = true; const t = `${P.이름}과(와) 결혼을 약속했습니다.`; say(s, t); return { ok: true, accepted: true, text: t }; }
    return { ok: true, accepted: false, text: `${P.이름}은(는) 알겠다고 했습니다. 기다리겠다고 합니다.` };
  }
  if (company.pendingScenes(s).some((x) => x.id === id)) return company.chooseScene(s, id, i);
  return family.chooseScene(s, id, i);
}

// ---------- 달 넘김 ----------
export function onMonth(s) {
  init(s);
  const L = s.love;
  const now = ym(s);
  // 호감 감소: 3달 넘게 안 만나면 달마다 1
  for (const id of Object.keys(L.people)) {
    const e = L.people[id];
    if (now - e.마지막 > 3) e.호감 = Math.max(0, e.호감 - 1);
    const p = personOf(id);
    if (p && !inPeriod(s, p) && !isMarriedOff(s, p)) { delete L.people[id]; say(s, `${p.이름}과(와) 연락이 뜸해졌습니다.`); }
  }
  // 놓침: 상대 결혼연도 도달. 연인이면 기본 결혼은 취소된다(08 4-2).
  for (const p of DATES) {
    if (p.결혼연도 == null || s.year < p.결혼연도 || L.missed[p.id] || s.partner?.id === p.id) continue;
    if (p.만남.재개) { if (L.people[p.id] && !inPeriod(s, p)) delete L.people[p.id]; continue; }
    L.missed[p.id] = p.결혼연도;
    if (L.people[p.id]) { delete L.people[p.id]; say(s, `${p.이름}은(는) 다른 사람과 결혼했습니다.`); }
  }
  const P = s.partner;
  if (P && !P.married) {
    // 사귀는 중에 오래 안 만나면 천천히 식는다
    if (now - (P.마지막 ?? now) > 3) P.호감 = Math.max(0, P.호감 - 1);
    if (P.호감 <= 0) { const n = P.이름; closeRelation(s, P.id, '식음'); say(s, `${n}과(와) 마음이 멀어져 헤어졌습니다.`); }
  }
  maybeApproach(s);
  family.onMonth(s);
  syncFlags(s);
  return s;
}

// 가족 쪽 공개 함수는 그대로 쓸 수 있게 다시 내보낸다.
export { MARRY_LIMIT_CHILD, EDU, PARENT_SCENES, PARENT_ACTS, haveChild, canHaveChild, nameChild, childMonths, childCost, setEducation, educationOptions, familySlots, familyPanel, familyTime, canDivorce, divorce, parentAct, parentOptions, parentVisit, homeOptions, chooseHome, syncHome, spouseIncome } from './family.js';
