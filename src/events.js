// 이야기 데이터 엔진. 조건은 작은 객체로 쓰고, 효과는 숫자를 화면에 보이지 않는다.
import { tierOf, stageOf, gain, raise, TIER_MIN, statNow, STATS, growCapacity, stepsCrossed, statGains } from './rules.js';
import { fameTotal, studyAvg } from './school.js';
import { isLeading, addSupport, shareOf, tallyLine } from './election.js';
import { bump, bondOf } from './bonds.js';
import { finishIoi } from './coding.js';
import { eventCastOK, choiceCastOK } from './cast.js';
let DB = [];
export function loadEvents(list) { DB = list; validate(list); }
export function validate(list) {
  const ids = new Set();
  for (const e of list) {
    if (!e.id || ids.has(e.id)) throw new Error('이벤트 id 오류: ' + e.id);
    ids.add(e.id);
    if (!e.text) throw new Error('본문 없음: ' + e.id);
    for (const c of e.choices ?? []) if (!c.label) throw new Error('선택지 이름 없음: ' + e.id);
  }
}
const list = (v) => (Array.isArray(v) ? v : [v]);
const inSchool = (s, name) => Object.values(s.school).includes(name);
const stageStat = (s) => Math.min(...(s.stageStats ?? ['매력']).map((k) => s.stats[k]));
export function meets(s, c = {}) {
  if (c.year != null && s.year !== c.year) return false;
  if (c.month != null && s.month !== c.month) return false;
  if (c.from != null && s.year * 100 + s.month < c.from) return false;
  if (c.to != null && s.year * 100 + s.month > c.to) return false;
  if (c.stage && stageOf(s) !== c.stage) return false;
  if (c.sex && s.sex !== c.sex) return false;
  for (const [k, v] of Object.entries(c.tier ?? {})) if (tierOf(s.stats[k]) < v) return false;
  for (const [k, v] of Object.entries(c.tierBelow ?? {})) if (tierOf(s.stats[k]) >= v) return false;
  // 구간 안의 '후반' 같은 값 조건: statMin {지능:126} 이상, statBelow {지능:126} 미만.
  for (const [k, v] of Object.entries(c.statMin ?? {})) if (s.stats[k] < v) return false;
  for (const [k, v] of Object.entries(c.statBelow ?? {})) if (s.stats[k] >= v) return false;
  if (c.flag && !s.flags[c.flag]) return false;
  if (c.notFlag && s.flags[c.notFlag]) return false;
  if (c.notFlags?.some((f) => s.flags[f])) return false;
  if (c.anyFlag && !c.anyFlag.some((f) => s.flags[f])) return false;
  if (c.cash != null && s.cash < c.cash) return false;
  if (c.fame != null && s.fame < c.fame) return false;
  if (c.fameTotal != null && fameTotal(s) < c.fameTotal) return false; // 짝의 인지도까지 더한 값
  if (c.leading != null && isLeading(s) !== c.leading) return false; // 선거: 내 자리 후보 가운데 1위인가
  if (c.study != null && s.study < c.study) return false;
  if (c.studyAvg != null && studyAvg(s) < c.studyAvg) return false;
  if (c.school && !inSchool(s, c.school)) return false;
  if (c.notSchool && list(c.notSchool).some((n) => inSchool(s, n))) return false;
  for (const [k, v] of Object.entries(c.bondMin ?? {})) if (bondOf(s, k) < v) return false;
  for (const [k, v] of Object.entries(c.bondBelow ?? {})) if (bondOf(s, k) >= v) return false;
  if (c.stageMin != null && stageStat(s) < c.stageMin) return false; // 무대 종목의 낮은 쪽 능력
  if (c.stageBelow != null && stageStat(s) >= c.stageBelow) return false;
  if (typeof c.test === 'function' && !c.test(s)) return false; // 데이터에서 쓰는 작은 조건(풋풋한 마음 장면 등)
  if (c.examJust && !(s.lastExam && s.lastExam.at === s.year * 12 + s.month && s.lastExam.band === c.examJust)) return false;
  return true;
}
// 조건 미달 이유. 화면 칩에 그대로 쓴다. 시기·성별처럼 칩으로 보일 필요 없는 조건은 hidden이 된다.
const FLAG_NAME = { 탐구과제: '탐구 과제 필요', 입상: '입상 필요', 수상: '수상 필요', hs_won: '학생회장 경력 필요', 수능응시: '수능 응시 필요', 유학시험: '토플·SAT 점수 필요' };
export function lockOf(s, c = {}) {
  const chips = [];
  const stat = (k, min) => { if (s.stats[k] < min) chips.push({ why: `${k} ${min} 필요 · 지금 ${statNow(s, k)}`, need: { stat: k, min, now: statNow(s, k) } }); };
  for (const [k, v] of Object.entries(c.tier ?? {})) stat(k, TIER_MIN[v - 1]);
  for (const [k, v] of Object.entries(c.statMin ?? {})) stat(k, v);
  if (c.flag && !s.flags[c.flag] && FLAG_NAME[c.flag]) chips.push({ why: FLAG_NAME[c.flag] });
  if (c.cash != null && s.cash < c.cash) chips.push({ why: '돈이 모자랍니다.' });
  if (c.fame != null && s.fame < c.fame) chips.push({ why: '인지도가 더 필요합니다.' });
  if (c.study != null && s.study < c.study) chips.push({ why: `학기 공부 ${c.study}% 필요 · 지금 ${Math.round(s.study)}%` });
  if (c.studyAvg != null && studyAvg(s) < c.studyAvg) chips.push({ why: `학기 공부 평균 ${c.studyAvg}% 필요 · 지금 ${Math.round(studyAvg(s))}%` });
  for (const [k, v] of Object.entries(c.bondMin ?? {})) if (bondOf(s, k) < v) chips.push({ why: '사이가 더 가까워야 합니다.' });
  const ok = meets(s, c);
  return { ok, why: ok ? null : chips[0]?.why ?? '조건이 맞지 않습니다.', need: chips.find((x) => x.need)?.need ?? null, chips: ok ? [] : chips.map((x) => x.why), hidden: !ok && !chips.length };
}
// 장면 플레이어용 선택지 목록. hidden이면 그리지 않아도 된다.
export function choicesOf(s, e) {
  return (e.choices ?? []).map((c, i) => ({ c, i })).filter(({ c }) => choiceCastOK(c, stageOf(s))).map(({ c, i }) => ({ i, label: c.label, ...lockOf(s, c.when) }));
}
export function eventsFor(s) {
  return DB.filter((e) => !(e.once !== false && s.seen.includes(e.id)) && meets(s, e.when) && eventCastOK(e, stageOf(s)));
}
export const eventById = (id) => DB.find((e) => e.id === id);
// 개표 장면은 후보별 지지도를 첫 문장으로 붙인다.
// textOf가 있으면 상태에 따라 본문을 만든다(예: 유학 합격 결과 목록).
export function sceneEvent(s, e) { const base = e.textOf ? { ...e, text: e.textOf(s) } : e; const t = base.tally ? tallyLine(s) : ''; return t ? { ...base, text: `${t} ${base.text}` } : base; }
// 이야기 속 선택은 활동 한 칸보다 조금 크게 오른다.
const EVENT_GAIN = 1.5;
const PASSIVE = /구경|그냥|나가지 않|안 나|나중에|집에 간|집으로 돌아|돌아간다|일찍 잔|쉰다|쉬는 데|미룬|모른 척|넘어간|않는다|않고|안 한다|거절|그만둔|포기|못 본 척|고민해 본다|하던 대로|결과만|손만 흔들|인사만|안부만/;
const STAT_WORDS = [
  ['체력', /뛰|달리|운동|축구|농구|걷|걸어|나르|짐|청소|수영|체육|계주|줄넘기|등산|자전거/],
  ['매력', /발표|노래|무대|웃|옷|꾸미|용기|고백|사진|춤|선물|솔직|말을 건|먼저 말|연설|출마|표현/],
  ['인맥', /함께|같이|친구|선배|후배|부탁|전화|만나|만난|한 조|도와|돕|약속|모임|소개|부모님|엄마|아빠|사람|팀|팀원|동아리|반 전체/],
  ['지능', /공부|읽|쓴다|적|기록|계산|문제|정리|조사|찾아|연구|생각|준비|분석|배운|계획|서류|보고|기획|시험|과제|짠다|만든다/],
];
// 선택지에 능력치가 적혀 있지 않으면 행동 내용으로 정한다. 물러서는 선택은 오르지 않는다.
export function inferStats(e, c) {
  if (!c || c.effect?.stats) return null;
  const text = c.label ?? '';
  if (PASSIVE.test(text)) return null;
  const hit = STAT_WORDS.find(([, re]) => re.test(text)) ?? STAT_WORDS.find(([, re]) => re.test(c.result ?? ''));
  return { [hit ? hit[0] : e.who ? '인맥' : '지능']: 1 };
}
export function applyEffect(s, f = {}) {
  for (const [k, n] of Object.entries(f.stats ?? {})) for (let i = 0; i < n; i++) raise(s, k, EVENT_GAIN);
  if (f.cash) s.cash = f.cash < 0 ? Math.max(Math.min(0, s.cash), s.cash + f.cash) : s.cash + f.cash; // 이벤트 지출로 빚이 생기지 않는다
  if (f.stress) s.stress = Math.max(0, Math.min(100, s.stress + f.stress));
  if (f.fame) s.fame = Math.max(0, s.fame + f.fame);
  if (f.study) s.study = Math.min(100, s.study + f.study);
  for (const k of f.unset ?? []) delete s.flags[k];
  for (const k of f.set ?? []) s.flags[k] = true;
  for (const [k, n] of Object.entries(f.bond ?? {})) bump(s, k, n, { story: true });
  if (f.school) Object.assign(s.school, f.school);
  if (f.graduateYear) s.graduateYear = f.graduateYear;
  if (f.support) addSupport(s, f.support); // 선거 지지도
  if (f.pair) s.pair = f.pair; // 짝 출마: { id, fame } 친구의 인지도를 더한다.
  if (f.stageStats) s.stageStats = f.stageStats; // 무대 종목 능력: 낮은 쪽으로 판정한다.
  if (f.next) s.queue.unshift(f.next);
  if (typeof f.run === 'function') f.run(s); // 데이터에서 쓰는 작은 처리(유학 지원 등)
  if (f.ioiFinish) finishIoi(s); // 2일 차 선택까지 합쳐 메달 장면을 고른다
}
const withShare = (s, c, before) => (c?.result && c.effect?.support && before != null ? `${c.result} (지지도 ${before}% → ${shareOf(s)}%)` : c?.result ?? null);
// 결과 문장은 돌려받은 result를 바로 보여 준다. queueLeft가 0이어도 result는 있을 수 있다.
export function choose(s, id, i) {
  const e = eventById(id);
  if (!e) throw new Error('없는 이벤트: ' + id);
  const c = e.choices?.[i];
  if (c && !meets(s, c.when)) { const l = lockOf(s, c.when); return { ok: false, why: l.why, need: l.need, chips: l.chips }; }
  if (!s.seen.includes(id)) s.seen.push(id);
  s.queue = s.queue.filter((q) => q !== id);
  const stats = { ...s.stats }, stress = s.stress, share = shareOf(s);
  applyEffect(s, e.effect);
  if (c) applyEffect(s, c.effect);
  const guess = inferStats(e, c);
  if (guess) applyEffect(s, { stats: guess });
  const slots = growCapacity(s, stats.체력);
  const effects = { stats: STATS.filter((k) => s.stats[k] > stats[k]), gains: statGains(stats, s.stats), stress: Math.round((s.stress - stress) * 10) / 10, slots, marks: stepsCrossed(stats, s.stats) };
  return { ok: true, id, effects, title: e.title ?? null, result: typeof c?.resultOf === 'function' ? c.resultOf(s) : withShare(s, c, share), next: c?.effect?.next ?? e.effect?.next ?? null, queueLeft: s.queue.length };
}
// 수집 화면 자료: 지나간 이야기 앨범과 이정표.
export const albumOf = (s) => s.seen.map((id) => eventById(id)).filter(Boolean).map((e) => ({ id: e.id, title: e.title ?? '', who: e.who ?? null, text: e.text }));
const MILESTONES = [['IOI출전', '국제정보올림피아드 출전'], ['코딩입상', '정보 경시대회 입상'], ['IOI동메달', '국제정보올림피아드 동메달'], ['IOI은메달', '국제정보올림피아드 은메달'], ['IOI금메달', '국제정보올림피아드 금메달'], ['초등입상', '과학의 날 입상'], ['초6당선', '전교회장'], ['입상', '경시대회 입상'], ['탐구과제', '탐구 과제 완성'], ['중2당선', '중학교 학생회장'], ['hs_won', '고등학교 학생회장'], ['수상', '고교 대회 수상'], ['fes_hit', '축제 무대 대박'], ['동아리가입', '대학 동아리'], ['당선', '총학생회'], ['전역', '군 복무 마침'], ['고졸취업', '첫 직장'], ['초6부회장', '전교 부회장'], ['중2부회장', '중학교 부회장'], ['hs_vice_won', '고등학교 부회장'], ['부당선', '대학 부회장']];
export const milestonesOf = (s) => MILESTONES.map(([flag, name]) => ({ flag, name, done: !!s.flags[flag] }));
// 장면 플레이어 비트: 본문을 문장 단위로 나눈다.
// 따옴표 안의 문장 부호로는 나누지 않는다. 닫는 따옴표 뒤에 말이 바로 붙으면('…"라고 했다') 그 문장이 끝날 때까지 잇는다.
export function beatsOf(e) {
  const t = String(e.text), out = [], balanced = (t.match(/"/g) ?? []).length % 2 === 0;
  let buf = '', q = false;
  const cut = () => { const x = buf.trim(); if (x) out.push(x); buf = ''; };
  for (let i = 0; i < t.length; i++) {
    const c = t[i], next = t[i + 1];
    buf += c;
    if (c === '"' && balanced) { q = !q; if (!q && (next === undefined || /\s/.test(next)) && /[.!?…,]"$/.test(buf)) cut(); continue; }
    if (q || !/[.!?]/.test(c)) continue;
    if (next === undefined || /\s/.test(next)) cut(); // 2.5 같은 숫자와 '...' 중간에서는 끊지 않는다
  }
  cut();
  return out.length ? out : [t];
}
