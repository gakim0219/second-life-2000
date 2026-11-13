// 인맥: 인맥 관리로 만나는 사람, 사교모임, 유명인 만남, 도움, 가상 인물 시계. 순수 함수. 근거: design/00 인맥 표, 08 4-6, 06 7장, 11, 12d, 16 3장.
// 실존 인물은 people.json에 없다. 미성년과는 만나지 않는다(19세 미만 제외).
import { tierOf, stageOf, gain, addStress, jobAt, raise } from './rules.js';
import * as love from './love.js';
import { registerNames, markEarly, markHelp } from './ending.js';
import { MARKET, loadArtists, raiseIntro } from './company.js';
import { onNetwork } from './activities.js';
import { bump, openLifelong } from './bonds.js';
import { canAppear, setRoster } from './cast.js';

const ADULT = 19;
const COST = 20000; // 인맥 관리 1회 비용(문서 초안값)
const TIER_MIN = [0, 0, 51, 101, 151, 176, 201, 251];
let PEOPLE = []; let CLOCK = []; let GATHER = []; let SCHOOL = {}; const BY = new Map();
export function loadPeople(data) {
  PEOPLE = data?.people ?? []; CLOCK = data?.clock ?? []; GATHER = data?.gatherings ?? []; SCHOOL = data?.school ?? {};
  setRoster(SCHOOL);
  BY.clear();
  for (const p of PEOPLE) BY.set(p.id, p);
  registerNames(PEOPLE); registerNames(Object.entries(SCHOOL).map(([id, 이름]) => ({ id, 이름 })));
  loadArtists(PEOPLE.filter((p) => p.분류 === '유명인' && p.곧_뜰_사람));
  onNetwork(metFromActivity); // activities.doAction('net_*') 결과의 met 칸으로 사람이 온다
  return PEOPLE.length;
}
export const personOf = (id) => BY.get(id) ?? null;
// 학교 인물 이름표. 장면 이름표와 인물 시트가 쓴다.
export const schoolNameOf = (id) => SCHOOL[id] ?? null;
export const schoolNames = () => SCHOOL;
export const allPeople = () => PEOPLE;

export function init(s) {
  love.init(s);
  const n = (s.network ??= {});
  n.met ??= {}; n.helped ??= {}; n.briefing ??= null; n.early ??= null;
  return n;
}
const ym = (s) => s.year * 12 + (s.month - 1);
const tier = (s, k) => tierOf(s.stats[k]);
const say = (s, t) => { s.log.push(t); };
const hash = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 1597334677); h ^= h >>> 16; return h >>> 0; };
const SLOT = '이번 달 활동 칸을 다 썼습니다.';
const lockTier = love.lockStat;
const lockCash = (s, cost) => ({ ok: false, why: '돈이 모자랍니다.', need: { cash: cost, now: s.cash } });

// 유명인은 세부 분류, 나머지는 그때 시점 분야만. 2026년 직업표를 과거 문장에 쓰지 않는다.
// 동창의 직업표는 어른이 된 뒤 이야기다. 학생 시절에 꺼내면 초등학생이 일을 하는 것처럼 보인다.
export const JOB_FROM = 2020;
export const jobNow = (s, p) => (p.분류 === '유명인' ? p.세부 : p.분류 === '동창' && s.year < JOB_FROM ? '' : jobAt(p.직업, s.year));
const jobLine = (s, p) => { const j = jobNow(s, p); return j ? `하는 일은 ${j}입니다.` : ''; };
const onSchool = (s, p) => !p.학교 || Object.values(s.school ?? {}).includes(p.학교);
const adultNow = (s, p) => s.year - p.출생연도 >= ADULT;
const inTime = (s, p) => s.year >= p.기간[0] && s.year <= p.기간[1];

// 인맥 구간에 맞는 사람 목록. 사교모임 사람은 모임에서만 만난다.
export function networkPool(s) {
  const T = tier(s, '인맥');
  return PEOPLE.filter((p) => canAppear(p.id, stageOf(s)) && p.분류 !== '사교모임' && p.구간 <= T && (p.매력 ?? 0) <= tier(s, '매력') && inTime(s, p) && adultNow(s, p) && onSchool(s, p));
}
export function canNetwork(s) {
  init(s);
  const st = stageOf(s);
  if (s.ended) return { ok: false, why: '이야기가 끝났습니다.' };
  if (st !== '대학' && st !== '사회인') return { ok: false, why: '대학부터 열립니다.' };
  if (s.flags?.군입대 && !s.flags?.전역) return { ok: false, why: '복무 중에는 만날 수 없습니다.' };
  if (s.used >= s.capacity) return { ok: false, why: SLOT };
  if (s.cash < COST) return lockCash(s, COST);
  return { ok: true, cost: COST };
}
const REPEAT = {
  동창: ['요즘 어떻게 지내?', '또 보네. 밥 먹었어?', '다음엔 네가 사.'],
  동네: ['왔어? 앉아.', '부모님은 잘 계시고?', '요즘 동네도 많이 바뀌었어.'],
  유명인: ['오늘은 사진 없이 이야기만 해요.', '또 뵙네요.', '요즘 일은 어때요?'],
  사교모임: ['오랜만입니다. 일은 잘 되시죠?', '다음 모임에도 나오세요.', '명함 새로 나왔어요.'],
};
const lineOf = (s, p, count) => (count === 0 && p.한줄대사 ? p.한줄대사 : (REPEAT[p.분류] ?? REPEAT.동창)[hash(`${p.id}:${s.year}:${s.month}`) % 3]);
function touch(s, p, base = 2) {
  const n = s.network;
  const e = n.met[p.id] ?? (n.met[p.id] = { count: 0, first: ym(s), last: ym(s) });
  const count = e.count;
  e.count += 1; e.last = ym(s);
  bump(s, p.id, count === 0 ? base + 1 : base);
  const early = !!p.곧_뜰_사람 && s.year <= (p.데뷔연도 ?? p.기간[0] + 2) && markEarly(s, p);
  const line = lineOf(s, p, count);
  const adopted = love.adopt(s, p.id, '인맥'); // 연애 후보(양쪽 성인, 나이 차 20살 미만)가 아니면 false
  return { line, early, adopted, first: count === 0 };
}
// 사람 한 명을 고르고 만난 것으로 기록한다. 칸과 돈은 쓰지 않는다. kind: 일반|동아리|회사
function meetOne(s, kind = '일반') {
  init(s);
  const T = Math.min(5, tier(s, '인맥')); // 6·7구간은 5구간 사람을 고르게 만난다
  let pool = networkPool(s);
  if (kind === '동아리') { const a = pool.filter((p) => p.분류 === '동창'); if (a.length) pool = a; }
  if (kind === '회사') { const a = pool.filter((p) => p.분류 !== '유명인' && p.구간 >= 2); if (a.length) pool = a; }
  if (!pool.length) {
    const t = '아는 사람 소개로 자리에 나갔습니다. 명함만 몇 장 받았습니다.';
    say(s, t);
    return { ok: true, person: null, text: t, tier: T };
  }
  const weigh = (p) => (s.network.met[p.id] ? 1 : 3) * (p.구간 === T ? 3 : p.구간 === T - 1 ? 2 : 1);
  const total = pool.reduce((a, p) => a + weigh(p), 0);
  let roll = hash(`${s.seed ?? 1}:${s.year}:${s.month}:${s.used}:net`) % total;
  let p = pool[0];
  for (const q of pool) { roll -= weigh(q); if (roll < 0) { p = q; break; } }
  const r = touch(s, p);
  const t = `${p.이름}${r.first ? '을(를) 처음 만났습니다' : '을(를) 다시 만났습니다'}. ${jobLine(s, p)}`.trim();
  say(s, t);
  return { ok: true, person: p, text: t, line: r.line, early: r.early, adopted: r.adopted, help: p.도움, tier: T };
}
// activities.doAction('net_meet' 등)이 부르는 쪽. 칸·돈·인맥 상승은 활동 쪽에서 이미 처리했다.
function metFromActivity(s, ctx = {}) { return meetOne(s, ctx.kind); }
// 활동 메뉴 없이 인맥 관리를 한 번 통째로 한다(칸, 돈, 인맥 상승까지 여기서 처리). doAction('net_meet')과 같이 쓰지 않는다.
export function meetByNetwork(s) {
  const c = canNetwork(s);
  if (!c.ok) return c;
  s.used += 1; s.cash -= COST;
  raise(s, '인맥');
  addStress(s, 2);
  return meetOne(s, '일반');
}

// ---------- 자금 ----------
// 사교모임 사람 소개로 자금을 받는다(13 9장). 인맥 4구간부터.
export function askFunding(s, id, opts = {}) {
  init(s);
  const p = BY.get(id);
  if (!p || p.분류 !== '사교모임') return { ok: false, why: '모임에서 만난 사람에게 부탁할 수 있습니다.' };
  if (tier(s, '인맥') < 4) return lockTier(s, '인맥', 4);
  if ((s.bonds[id] ?? 0) < 8) return { ok: false, why: '아직 부탁할 사이가 아닙니다.' };
  return raiseIntro(s, p.이름, opts);
}

// ---------- 인맥 표의 기회 ----------
const INDUSTRY = ['뷰티·커머스', '외식 프랜차이즈', '게임회사', 'IT 플랫폼', '연예기획사'];
// 올해(또는 내년) 업계 분위기. 종목이 아니라 업종 분위기만 말한다. 실존 회사 없음.
function marketLine(s, ahead = 0) {
  const y = Math.min(2026, Math.max(2010, s.year + ahead));
  const row = MARKET[y];
  if (!row) return '요즘은 어디나 비슷하다고 합니다.';
  const hi = INDUSTRY[row.indexOf(Math.max(...row))];
  const lo = INDUSTRY[row.indexOf(Math.min(...row))];
  return `${ahead ? '내년에는' : '요즘은'} ${hi} 쪽 이야기가 많고 ${lo} 쪽은 조용하다고 합니다.`;
}
export function opportunities(s) {
  init(s);
  return { 투자설명회: canBriefing(s), 미리듣기: canEarly(s) };
}
export function canBriefing(s) {
  init(s);
  if (tier(s, '인맥') < 3) return lockTier(s, '인맥', 3);
  if (s.network.briefing === s.year) return { ok: false, why: '올해 설명회는 다녀왔습니다.' };
  if (s.used >= s.capacity) return { ok: false, why: SLOT };
  if (s.cash < 100000) return lockCash(s, 100000);
  return { ok: true, cost: 100000 };
}
// 투자 설명회(인맥 3구간): 칸 1, 10만 원. 지능이 조금 오르고 업종 분위기를 듣는다. 종목 힌트는 없다.
export function attendBriefing(s) {
  const c = canBriefing(s); if (!c.ok) return c;
  s.used += 1; s.cash -= 100000; s.network.briefing = s.year; s.flags.투자설명회 = true;
  raise(s, '지능', 0.5); addStress(s, 2);
  const t = `투자 설명회에 다녀왔습니다. ${marketLine(s)}`;
  say(s, t);
  return { ok: true, text: t };
}
export function canEarly(s) {
  init(s);
  if (tier(s, '인맥') < 4) return lockTier(s, '인맥', 4);
  if (s.network.early === s.year) return { ok: false, why: '올해는 이미 들었습니다.' };
  if (s.used >= s.capacity) return { ok: false, why: SLOT };
  return { ok: true };
}
// 미리 알려 주는 기회(인맥 4구간): 칸 1. 내년 업종 분위기를 먼저 듣는다.
export function hearEarly(s) {
  const c = canEarly(s); if (!c.ok) return c;
  s.used += 1; s.network.early = s.year; s.flags.미리듣기 = true;
  raise(s, '인맥', 0.3); addStress(s, 1);
  const t = `임원 모임에서 먼저 들었습니다. ${marketLine(s, 1)}`;
  say(s, t);
  return { ok: true, text: t };
}

// ---------- 사교모임 ----------
export function gatherings(s) {
  init(s);
  return GATHER.map((g) => {
    const c = love.checkEntry(s, g.입장, g.모임);
    return { 모임: g.모임, 성격: g.성격, 인원: g.인원, 입장조건: g.입장.설명, 입장함: !!s.love.clubs[g.모임], ok: c.ok, why: c.why, need: c.need, miss: c.miss, cost: c.cost };
  });
}
export function canEnter(s, group) {
  init(s);
  const g = gatherings(s).find((x) => x.모임 === group);
  if (!g) return { ok: false, why: '없는 모임입니다.' };
  if (s.ended) return { ok: false, why: '이야기가 끝났습니다.' };
  if (!love.isAdult(s)) return { ok: false, why: '성인이 된 뒤에 열립니다.' };
  if (!g.ok) return { ok: false, why: g.why, need: g.need };
  if (s.cash < g.cost) return lockCash(s, g.cost);
  if (s.used >= s.capacity) return { ok: false, why: SLOT };
  return { ok: true, cost: g.cost };
}
// 모임에 간다. 첫 입장은 회비 전액, 다음부터 10%. 사람 한 명을 만나고, 연애 후보면 후보 목록에도 오른다.
export function enterGathering(s, group) {
  const c = canEnter(s, group);
  if (!c.ok) return c;
  s.used += 1; s.cash -= c.cost;
  const first = !s.love.clubs[group];
  s.love.clubs[group] = true;
  raise(s, '인맥', 0.8); addStress(s, 2);
  const pool = PEOPLE.filter((p) => canAppear(p.id, stageOf(s)) && p.모임 === group && inTime(s, p) && adultNow(s, p));
  if (!pool.length) {
    const t = `${group}에 다녀왔습니다. 오늘은 사람이 적었습니다.`;
    say(s, t);
    return { ok: true, person: null, first, cost: c.cost, text: t };
  }
  const fresh = pool.filter((p) => !s.network.met[p.id]);
  const from = fresh.length ? fresh : pool;
  const p = from[hash(`${s.seed ?? 1}:${s.year}:${s.month}:${group}:${s.used}`) % from.length];
  const r = touch(s, p, 3);
  const t = `${group}에서 ${p.이름}을(를) ${r.first ? '알게 됐습니다' : '다시 만났습니다'}. ${p.역할 ?? ''}`.trim();
  say(s, t);
  return { ok: true, person: p, first, cost: c.cost, text: t, line: r.line, help: p.도움, adopted: r.adopted };
}

// ---------- 유명인 만남 ----------
const CEL_COST = { '재벌·회장': 10000000, 정치인: 3000000, 아이돌: 1000000, '유명 가수': 1000000, 배우: 1500000, 방송인: 500000, 인플루언서: 200000 };
export const celebCost = (p) => Math.round((CEL_COST[p.세부] ?? 1000000) * (1 + (p.구간 ?? 0) / 5) / 10000) * 10000;
// 지금 만나러 갈 수 있는 유명인과 잠긴 이유. 비연애 99명과 연애 후보 44명 모두 들어 있다.
export function celebrities(s) {
  init(s);
  return PEOPLE.filter((p) => canAppear(p.id, stageOf(s)) && p.분류 === '유명인' && adultNow(s, p) && s.year >= p.기간[0] && s.year <= p.기간[1]).map((p) => ({ person: p, cost: celebCost(p), ...canMeetCeleb(s, p.id) }));
}
export function canMeetCeleb(s, id) {
  init(s);
  const p = BY.get(id);
  if (!p || p.분류 !== '유명인') return { ok: false, why: '없는 사람입니다.' };
  if (s.ended) return { ok: false, why: '이야기가 끝났습니다.' };
  if (!adultNow(s, p) || !love.isAdult(s)) return { ok: false, why: '지금은 만날 수 없습니다.' };
  if (!inTime(s, p)) return { ok: false, why: `${p.기간[0]}년부터 소식이 들립니다.` };
  if (tier(s, '인맥') < p.구간) return lockTier(s, '인맥', p.구간);
  if (tier(s, '매력') < (p.매력 ?? 0)) return lockTier(s, '매력', p.매력);
  const cost = celebCost(p);
  if (s.cash < cost) return lockCash(s, cost);
  if (s.used >= s.capacity) return { ok: false, why: SLOT };
  return { ok: true, cost };
}
export function meetCeleb(s, id) {
  const c = canMeetCeleb(s, id);
  if (!c.ok) return c;
  const p = BY.get(id);
  s.used += 1; s.cash -= c.cost;
  raise(s, '인맥', 0.6); addStress(s, 2);
  const r = touch(s, p, 3);
  const t = `${p.이름}을(를) 만났습니다.`; // p.설명은 입장 조건 메모라 문장에 넣지 않는다
  say(s, t);
  let news = null;
  if (hash(`${s.seed ?? 1}:${s.year}:${s.month}:press${id}`) % 100 < 10) { news = `연예 면 구석에 ${p.이름}과 함께 찍힌 사진이 실렸습니다.`; s.stress = Math.min(100, s.stress + 4); say(s, news); }
  return { ok: true, person: p, text: t, line: r.line, early: r.early, adopted: r.adopted, help: p.도움, news };
}

// ---------- 동창 돕기 (첫 생에 무너진 사람) ----------
// 08 2장 '개입'. 이벤트가 있으면 이벤트에서 같은 플래그를 세워도 된다.
export const FRIEND_HELP = [
  { id: 'c01', from: 2017, to: 2018, label: '"크게 하지 마"라고 말한다', flag: '조언:정민혁', text: '정민혁이 한참 말이 없다가 확장 계약서를 서랍에 넣었습니다.' },
  { id: 'c02', from: 2016, to: 2022, label: '원고를 읽어 준다', flag: '원고:한유진', text: '한유진의 원고를 밤새 읽고 연필로 표시해 돌려줬습니다.' },
  { id: 'c05', from: 2021, to: 2021, label: '재창업에 돈을 보탠다', cost: 50000000, text: '박도영의 재창업에 돈을 보탰습니다. 큰돈이 될 일은 아닙니다.' },
  { id: 'c06', from: 2020, to: 2021, label: '상가를 사 두라고 말한다', text: '이소영이 대출을 알아보기 시작했습니다. 임대료 걱정은 줄어들 듯합니다.' },
  { id: 'c11', from: 2019, to: 2021, label: '"대출은 빼"라고 말한다', text: '임재민이 대출을 일부 갚았습니다.' },
  { id: 'c14', from: 2018, to: 2018, label: '"지금 접어"라고 말한다', flag: '조언:노현우', text: '노현우가 가게를 접었습니다. 빚은 절반에서 멈췄습니다.' },
  { id: 'c21', from: 2018, to: 2019, label: '믿을 만한 사람을 소개한다', text: '양미래에게 사람을 소개했습니다. 위기가 얕아졌습니다.' },
  { id: 'c34', from: 2024, to: 2026, label: '서점 재개장에 사람을 모아 준다', text: '남궁찬의 서점에 사람들이 모였습니다.' },
  { id: 'c40', from: 2022, to: 2022, tier: 3, label: '업계 사람을 소개한다', flag: '소개:오세라', text: '오세라에게 업계 사람을 이어 줬습니다.' },
  { id: 'c45', from: 2017, to: 2019, label: '일을 맡긴다', cost: 5000000, text: '연서인에게 번역 일을 맡겼습니다.' },
  { id: 'c48', from: 2022, to: 2022, label: '금리 이야기를 해 준다', text: '사공진이 집 한 채를 팔았습니다. 나머지 한 채는 지켰습니다.' },
];
const FRIEND_MIN_BOND = 10; // bonds.js의 사이 '좋음'
function friendCheck(s, h) {
  const p = BY.get(h.id);
  if (!p) return { ok: false, why: '없는 사람입니다.' };
  if (s.flags[`도움:${h.id}`]) return { ok: false, why: '이미 도왔습니다.' };
  if (!onSchool(s, p)) return { ok: false, why: '같은 학교를 다니지 않았습니다.' };
  if (s.year < h.from || s.year > h.to) return { ok: false, why: `${h.from}~${h.to}년에 할 수 있습니다.` };
  if ((s.bonds[h.id] ?? 0) < FRIEND_MIN_BOND) return { ok: false, why: '아직 내 말을 들을 사이가 아닙니다.' };
  if (h.tier && tier(s, '인맥') < h.tier) return lockTier(s, '인맥', h.tier);
  if (h.cost && s.cash < h.cost) return lockCash(s, h.cost);
  return { ok: true };
}
// 지금 시기에 도울 수 있는 동창(잠긴 이유 포함). 시기가 지났거나 이미 도운 사람은 빠진다.
export function friendHelps(s) {
  init(s);
  return FRIEND_HELP.filter((h) => canAppear(h.id, stageOf(s)) && s.year >= h.from && s.year <= h.to && !s.flags[`도움:${h.id}`]).map((h) => ({ id: h.id, 이름: BY.get(h.id)?.이름, label: h.label, cost: h.cost ?? 0, ...friendCheck(s, h) }));
}
export function helpFriend(s, id) {
  init(s);
  const h = FRIEND_HELP.find((x) => x.id === id);
  if (!h) return { ok: false, why: '도울 수 없는 사람입니다.' };
  const c = friendCheck(s, h);
  if (!c.ok) return c;
  if (h.cost) s.cash -= h.cost;
  if (h.flag) s.flags[h.flag] = true;
  const n = markHelp(s, id);
  openLifelong(s, id); // 무너지기 전에 손을 내민 친구
  bump(s, id, 5);
  say(s, h.text);
  return { ok: true, text: h.text, 도운수: n };
}

// ---------- 가상 인물 시계 ----------
// 이번 달 가상 세계 소식. 연도 표의 첫 등장, 데뷔, 경천그룹 해체 등. opts.upto=true면 지금까지의 소식을 최근순으로.
export function celebNews(s, opts = {}) {
  if (opts.upto) {
    const now = s.year * 12 + s.month;
    return CLOCK.filter((c) => c.year * 12 + c.month <= now).slice(-(opts.limit ?? 12)).reverse();
  }
  return CLOCK.filter((c) => c.year === s.year && c.month === s.month);
}
