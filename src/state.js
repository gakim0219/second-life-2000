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
    study: 0, fame: 0, school: { 초등: '느티초', 중학: '서일중' },
    flags: {}, seen: [], bonds: { 부모님: 75 }, log: [], queue: [], portfolio: {}, company: null, partner: null, ended: null,
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
const RENAMED = [['한빛중', '서일중']];
export function deserialize(t) {
  for (const [a, b] of RENAMED) if (t.includes(a)) t = t.replaceAll(a, b);
  const s = JSON.parse(t);
  if (!s || s.v !== VERSION || !s.stats || typeof s.year !== 'number') throw new Error('저장 파일을 읽을 수 없습니다.');
  if (GONE.some((w) => t.includes(w))) purgeGone(s);
  withDefaults(s);
  if (!(s.bonds?.부모님 >= 75)) (s.bonds ??= {}).부모님 = 75; // 부모님 신뢰 5단계 고정
  return s;
}
