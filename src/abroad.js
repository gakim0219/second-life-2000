// 미국 대학 유학 준비(사용자 지시 2026-11-09).
// - 고등학교에 다니면 학교와 상관없이 고1(2005년 4월 설명회)부터 시작할 수 있다. 수능 준비와 함께 한다.
// - 준비: 토플·SAT(시험 달에 응시, 가장 좋은 점수를 쓴다), 활동 기록(대회·학생회·캠프·봉사), 에세이, 추천서(담당 선생님과의 사이).
// - 조기 지원(2007.11.1)은 NIT 한 곳. 정규 지원(2008.1.1)은 NIT와 지어낸 미국 대학 네 곳. 결과는 2007.12, 2008.3.
// - 실제로 다닐 수 있는 미국 대학은 NIT뿐이다. 나머지 학교는 합격장만 받는다.
// 판정은 seed로 정해지는 난수라 같은 판에서는 같은 결과가 나온다.
import { stageOf } from './rules.js';
import { bondOf } from './bonds.js';

const M = 10000;
export const SCHOOLS = [
  { name: 'NIT', bar: 80 },
  { name: '노스브리지 대학교', bar: 75 },
  { name: '웨스트레이크 공과대', bar: 67 },
  { name: '파인힐 칼리지', bar: 56 },
  { name: '레이크쇼어 주립대', bar: 42 },
];
export const OTHERS = SCHOOLS.slice(1).map((x) => x.name);
export const TEACHER = { 한빛과학고: 't06', 한빛고: 't05', 푸른여고: 't12', 새길특성화고: 't07' };
const ym = (s) => s.year * 100 + s.month;
const hash = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 1597334677); h ^= h >>> 16; return h >>> 0; };
const rand = (s, salt) => hash(`${s.seed ?? 1}:abroad:${salt}`) / 4294967296;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function start(s) {
  s.flags.유학준비 = true;
  s.abroad ??= { eng: 0, sat: 0, toefl: null, satScore: null, essay: 0, camp: false, serve: 0, tries: { toefl: 0, sat: 0 }, at: {}, rd: [], res: {} };
  return s.abroad;
}
export const A = (s) => s.abroad ?? null;
// 준비 활동을 할 수 있는 때: 유학 준비를 시작했고 고등학생이며 정규 지원 마감(2007년 12월) 전.
export const preparing = (s) => !!s.abroad && stageOf(s) === '고등' && ym(s) <= 200712;

// ── 시험 ──
// SAT는 2005년 3월부터 2400점 만점. 한국에서는 정해진 달에만 본다. 토플은 2006년 9월부터 iBT(120점).
export const SAT_MONTHS = [1, 5, 6, 10, 11, 12];
export const satOpen = (s) => SAT_MONTHS.includes(s.month) && ym(s) >= 200505;
export const toeflFee = (s) => (ym(s) >= 200609 ? 17 * M : 14 * M);
export const SAT_FEE = 9 * M;
// 2007년 4~7월 '토플 대란': iBT 자리가 모자라 접수가 잘 안 된다.
export const seatCrunch = (s) => ym(s) >= 200704 && ym(s) <= 200707;
const iq = (s) => s.stats.지능;
export function toeflOf(s, salt) {
  const a = A(s), noise = (rand(s, `t${salt}`) - 0.5) * 12;
  return Math.round(clamp(45 + a.eng * 0.6 + (iq(s) - 60) * 0.15 + noise, 20, 120));
}
export function satOf(s, salt) {
  const a = A(s), noise = (rand(s, `s${salt}`) - 0.5) * 160;
  return Math.round(clamp(1350 + a.sat * 7 + (iq(s) - 60) * 3 + noise, 600, 2400) / 10) * 10;
}
const grow = (v, n) => Math.min(100, v + n * (1 - v / 140));
export function studyEnglish(s) { const a = A(s); a.eng = grow(a.eng, 9); return '토플 문제집을 풀고 듣기 파일을 반복해 들었다. 빠른 말 속에서 단어가 하나씩 들리기 시작했다.'; }
export function studySat(s) { const a = A(s); a.sat = grow(a.sat, 9); return 'SAT 문제집을 한 회 풀었다. 처음 보는 영어 단어를 공책에 적고 수학은 시간을 재며 풀었다.'; }
export function takeToefl(s) {
  const a = A(s);
  if (seatCrunch(s) && rand(s, `seat${ym(s)}`) < 0.6) return { ok: false, text: '접수 사이트가 열리자마자 자리가 다 찼다. 이번 달에는 시험을 보지 못했다. 응시료는 나가지 않았다.', refund: true };
  a.tries.toefl += 1; const sc = toeflOf(s, a.tries.toefl); const best = Math.max(a.toefl ?? 0, sc); a.toefl = best; markTests(s);
  return { ok: true, score: sc, text: `토플을 봤다. 이번 점수는 ${sc}점이다.${sc < best ? ` 지원서에는 가장 좋았던 ${best}점을 쓴다.` : ''}` };
}
export function takeSat(s) {
  const a = A(s); a.tries.sat += 1; const sc = satOf(s, a.tries.sat); const best = Math.max(a.satScore ?? 0, sc); a.satScore = best; markTests(s);
  return { ok: true, score: sc, text: `SAT를 봤다. 이번 점수는 ${sc}점이다.${sc < best ? ` 지원서에는 가장 좋았던 ${best}점을 쓴다.` : ''}` };
}
export const testsDone = (s) => !!(A(s)?.toefl && A(s)?.satScore);
const markTests = (s) => { if (testsDone(s)) s.flags.유학시험 = true; };
// 토플 대란 때 일본에 가서 보는 시험. 자리 걱정이 없다.
export function toeflAbroad(s) { s.abroad.toeflAt = ym(s); takeToeflNoSeat(s); }
function takeToeflNoSeat(s) {
  const a = A(s); a.tries.toefl += 1; const sc = toeflOf(s, a.tries.toefl); a.toefl = Math.max(a.toefl ?? 0, sc); markTests(s);
  s.log.push(`일본에서 토플을 봤습니다. ${sc}점이 나왔습니다.`);
}
// 미국 대학 가운데 다닐 수 있는 곳은 NIT뿐이다. 국내 대학에 등록했다가 옮기면 그해 낸 등록금은 돌려받는다.
export function goMit(s) {
  const t = s.lastTuition;
  if (t && t.ym >= 200802 && t.school && t.school !== 'NIT' && t.school === s.school.대학) { s.cash += t.paid; s.log.push(`${t.school} 등록을 취소하고 등록금을 돌려받았습니다.`); }
  s.school.대학 = 'NIT'; s.flags.대학확정 = true; s.flags.NIT합격 = true; delete s.flags.NIT포기;
  s.graduateYear = s.sex === '남' ? 2014 : 2012;
}

// ── 에세이·활동·추천서 ──
export const essayOpen = (s) => !!s.abroad && ym(s) >= 200706 && ym(s) <= 200712;
export function writeEssay(s) {
  const a = A(s); a.essay = grow(a.essay, 14 + Math.min(6, s.stats.매력 / 30));
  return a.essay >= 80 ? '에세이를 처음부터 다시 읽었다. 이제 고칠 곳보다 남기고 싶은 문장이 더 많다.' : '에세이를 한 문단 고쳤다. 앞으로 일어날 일은 쓸 수 없어서, 지금까지 겪은 일만 골라 적었다.';
}
const EC = [['IOI금메달', 40], ['IOI은메달', 34], ['IOI동메달', 28], ['IOI출전', 20], ['코딩입상', 14], ['수상', 18], ['입상', 8], ['hs_won', 18], ['hs_vice_won', 10], ['fes_hit', 6], ['탐구과제', 8]];
export function ecOf(s) {
  const a = A(s) ?? {}; let v = 0;
  for (const [f, n] of EC) if (s.flags[f]) v += n;
  if (a.camp) v += 10;
  v += Math.min(15, (a.serve ?? 0) * 3);
  return Math.min(100, v);
}
export const teacherOf = (s) => TEACHER[s.school?.고등] ?? null;
export const recOf = (s) => { const t = teacherOf(s); return t ? clamp(bondOf(s, t) * 1.2, 0, 100) : 30; };
export function testOf(s) {
  const a = A(s); if (!a?.satScore || !a?.toefl) return 0;
  const sat = clamp((a.satScore - 1500) / 9, 0, 100);
  return Math.round(sat * (a.toefl >= 100 ? 1 : a.toefl >= 80 ? 0.85 : 0.6));
}
export function scoreOf(s) {
  const a = A(s); if (!a) return 0;
  return Math.round(0.35 * testOf(s) + 0.3 * ecOf(s) + 0.2 * a.essay + 0.15 * recOf(s));
}
export const chanceOf = (score, bar) => 1 / (1 + Math.exp(-(score - bar) / 4));
export const LEVEL = (p) => (p >= 0.75 ? '높음' : p >= 0.45 ? '해 볼 만함' : p >= 0.2 ? '어려움' : '아주 어려움');

// ── 지원 ──
export function applyEarly(s) { const a = start(s); a.ea = true; s.cash = Math.max(Math.min(0, s.cash), s.cash - 7 * M); }
export function applyRegular(s, which) {
  const a = A(s);
  const pool = which === 'high' ? ['노스브리지 대학교', '웨스트레이크 공과대'] : which === 'safe' ? ['파인힐 칼리지', '레이크쇼어 주립대'] : OTHERS;
  const mit = !!s.flags.EA보류 || (!s.flags.EA합격 && !s.flags.EA불합격 && which !== 'safe'); // 보류된 NIT 지원서는 정규 지원에서 다시 본다
  a.rd = [...(mit ? ['NIT'] : []), ...pool];
  const fee = (a.rd.length - (s.flags.EA보류 ? 1 : 0)) * 7 * M;
  s.cash = Math.max(Math.min(0, s.cash), s.cash - fee);
}
// 결과 판정. 달이 바뀐 직후(이벤트 직전) 부른다.
export function onMonth(s) {
  const a = A(s); if (!a) return;
  if (ym(s) === 200711 && a.ea) a.at.ea = scoreOf(s); // 11월 1일 마감 때의 지원서
  if (ym(s) === 200712 && a.ea && !a.res.NIT) {
    const p = chanceOf(a.at.ea ?? scoreOf(s), SCHOOLS[0].bar), r = rand(s, 'ea');
    const k = r < p ? '합격' : r < p + (1 - p) * 0.5 ? '보류' : '불합격';
    a.res.NIT = `조기 ${k}`; s.flags[`EA${k}`] = true; if (k === '합격') s.flags.NIT합격장 = true;
  }
  if (ym(s) === 200801 && a.rd.length) a.at.rd = scoreOf(s);
  if (ym(s) === 200803 && a.rd.length && !s.flags.RD결과) {
    const sc = a.at.rd ?? scoreOf(s);
    for (const name of a.rd) {
      const bar = SCHOOLS.find((x) => x.name === name).bar - (name === 'NIT' && s.flags.EA보류 ? 1 : 0);
      a.res[name] = rand(s, `rd:${name}`) < chanceOf(sc, bar) ? '합격' : '불합격';
    }
    s.flags.RD결과 = true;
    if (a.res.NIT === '합격') { s.flags.NIT합격장 = true; s.flags['RD:NIT'] = true; }
    if (a.rd.some((n) => a.res[n] === '합격')) s.flags.RD합격 = true;
  }
}
export function resultText(s) {
  const a = A(s); if (!a) return '';
  return a.rd.map((n) => `${n} ${a.res[n] === '합격' ? '합격' : '불합격'}`).join(', ');
}
// 유학 준비 현황(활동 칸을 쓰지 않는 보기).
export function summary(s) {
  const a = A(s); if (!a) return '유학 준비를 시작하지 않았습니다.';
  const sc = scoreOf(s), line = (k, v) => `${k}: ${v}`;
  const out = [
    line('토플', a.toefl ? `${a.toefl}점 (응시 ${a.tries.toefl}번)` : '아직 없음'),
    line('SAT', a.satScore ? `${a.satScore}점 (응시 ${a.tries.sat}번)` : '아직 없음'),
    line('활동 기록', `${Math.round(ecOf(s))}/100`),
    line('에세이', ym(s) < 200706 ? '고3 여름(2007년 6월)부터 씁니다' : `${Math.round(a.essay)}/100`),
    line('추천서', teacherOf(s) ? `${Math.round(recOf(s))}/100 (담당 선생님과의 사이)` : '담당 선생님이 없습니다'),
    line('지원서 전체', `${sc}/100`),
    ...SCHOOLS.map((x) => line(`  ${x.name}`, testsDone(s) ? LEVEL(chanceOf(sc, x.bar)) : '시험 점수가 있어야 봅니다')),
  ];
  return out.join('\n');
}
