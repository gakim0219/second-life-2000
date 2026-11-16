import { STATS, capacityOf } from './rules.js';
export const VERSION = 1;
// 뒤에 추가된 칸. 옛 저장에는 없을 수 있어서 불러올 때 채운다.
const extras = () => ({
  birthYear: 1989,
  terms: [], termExams: [], lastExam: null, scholarship: 0, warnings: 0, // 학기 기록
  owned: [], flexCount: {}, // 플렉스
  promo: {}, support: {}, pair: null, stageStats: null, project: 0, // 선거·무대·탐구 과제
  bondSeen: {}, promises: [], talkedAt: {}, // 관계
});
export const withDefaults = (s) => { for (const [k, v] of Object.entries(extras())) if (s[k] === undefined) s[k] = v; return s; };
export function newGame({ name = '주인공', sex = '남', seed = 1 } = {}) {
  // 지능만 높게 시작한다. 몸은 열한 살이어도 머리에는 마흔 가까이 산 기억이 있다.
  const stats = Object.fromEntries(STATS.map((k) => [k, k === '지능' ? 60 : 20]));
  return {
    v: VERSION, name, sex, seed, year: 2000, month: 1,
    stats, stress: 10, cash: 30000, used: 0, capacity: capacityOf(stats.체력),
    graduateYear: sex === '남' ? 2014 : 2012,
    study: 0, fame: 0, school: { 초등: '한솔초', 중학: '청솔중' },
    flags: {}, seen: [], bonds: { 부모님: 75, 미영: 60 }, log: [], queue: [], portfolio: {}, company: null, partner: null, ended: null,
    ...extras(),
  };
}
// 게임에서 지운 인물. 예전 세이브를 불러올 때 관계·약속·기록을 함께 지운다.
const GONE = ['c12', '신지현'];
function purgeGone(v) {
  if (Array.isArray(v)) {
    for (let i = v.length - 1; i >= 0; i--) {
      const x = v[i];
      if ((typeof x === 'string' && GONE.some((w) => x === w || x.includes('신지현'))) || (x && typeof x === 'object' && x.id === 'c12')) v.splice(i, 1);
      else if (x && typeof x === 'object') purgeGone(x);
    }
  } else if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) {
      const x = v[k];
      if (k === 'c12' || k === 'f_c12') delete v[k];
      else if (x && typeof x === 'object' && x.id === 'c12') v[k] = null;
      else if (x && typeof x === 'object') purgeGone(x);
    }
  }
}
export function serialize(s) { return JSON.stringify(s); }
// 학교 이름이 바뀌었다. 옛 저장의 이름을 새 이름으로 옮긴다.
// 2026-11-16: 학교 이름 바꿈(사용자 지시). 긴 이름부터 바꾼다.
const RENAMED = [['한빛중', '청솔중'], ['서일중', '청솔중'], ['서울과학고', '한빛과학고'], ['새길직업고', '새길특성화고'], ['느티여고', '푸른여고'], ['세화여고', '매화여고'], ['서울고', '한빛사립고'], ['느티초', '한솔초'],
  // 2026-11-16: 대학 이름 바꿈(사용자 지시).
  ['서울대', '한성국립대'], ['한성대', '한성국립대'], ['한빛고', '한빛사립고'], ['한빛대', '태산대'], ['한줄대', '백제대'], ['새길실무대', '신라전문대'], [/(?<![A-Za-z])MIT(?![A-Za-z]| \(상장)/g, 'NIT']];
export function deserialize(t) {
  for (const [a, b] of RENAMED) t = typeof a === 'string' ? (t.includes(a) ? t.replaceAll(a, b) : t) : t.replace(a, b);
  const s = JSON.parse(t);
  if (!s || s.v !== VERSION || !s.stats || typeof s.year !== 'number') throw new Error('저장 파일을 읽을 수 없습니다.');
  if (GONE.some((w) => t.includes(w))) purgeGone(s);
  withDefaults(s);
  if (!(s.bonds?.부모님 >= 75)) (s.bonds ??= {}).부모님 = 75; // 부모님 신뢰 5단계 고정
  if (s.bonds.미영 == null) s.bonds.미영 = 60; // 여동생(사용자 지시 2026-11-16). 옛 저장에도 넣는다.
  return s;
}
