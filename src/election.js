// 학생회 선거. 회장 후보와 부회장 후보가 한 조로 나가고, 지지도 점수가 가장 높은 조가 당선된다.
// 우리 조 점수 = 인지도 + 짝의 인지도 + 이번 선거에서 쌓은 지지도. 친구를 회장 후보로 세우면 짝의 인지도가 두 배로 들어간다.
// 화면에는 조별 점수를 백분율로 바꿔 보여 준다.
import { fameTotal, RIVAL } from './school.js';

const ym = (s) => s.year * 100 + s.month;
const FRIEND_FRONT = 2, SECOND_RATE = 0.75; // 친구를 앞세운 값, 두 번째 상대 조는 첫 상대 조보다 약하다.
const HS_NAMES = {
  서울고: [['강태오', '차준영'], ['서지훈', '백승민']],
  느티여고: [['윤다경', '장하늘'], ['임수아', '황서영']],
  서울과학고: [['한도윤', '류지안'], ['문채영', '안소율']],
  새길직업고: [['최민서', '하승우'], ['고은결', '유다인']],
};
const hsNames = (s) => HS_NAMES[s.school?.고등] ?? HS_NAMES.새길직업고;
const univNames = (s) => {
  if (s.school?.대학 === 'MIT') return [['Daniel Park', 'Priya Shah'], ['Sarah Lin', 'Tom Reed']];
  const head = s.sex === '여' && s.pair?.name !== '문혜원' ? '문혜원' : '이건우'; // 문혜원이 내 짝이면 상대 조에 두지 않는다
  return [[head, '권태민'], ['신예린', '서하린']];
};
export const RACES = {
  초6: { run: 'el_run', vice: 'el_vice', from: 200103, voteYm: 200105, done: ['초6당선', '초6부회장', '초6낙선'], top: () => RIVAL.초6, names: () => [['표지환', '남도현'], ['권나윤', '송민재']] },
  중2: { run: 'me_run', vice: 'me_vice', from: 200303, voteYm: 200305, done: ['중2당선', '중2부회장', '중2낙선'], top: () => RIVAL.중2, names: () => [['홍석규', '배유진'], ['조현서', '오지호']] },
  고2: { run: 'hs_run', vice: 'hs_vice', from: 200603, voteYm: 200605, done: ['hs_won', 'hs_vice_won', 'hs_lost'], top: (s) => (Object.values(s.school ?? {}).includes('서울과학고') ? RIVAL.고2과학고 : RIVAL.고2), names: hsNames },
  대학: { run: '출마', vice: '부출마', done: ['당선', '부당선', '낙선'], top: () => RIVAL.대학, names: univNames },
};
const undecided = (s, r) => !!s.flags[r.run] && !r.done.some((f) => s.flags[f]) && (r.from == null || ym(s) >= r.from);
export const raceKeyOf = (s) => Object.keys(RACES).find((k) => undecided(s, RACES[k])) ?? null;

// 상대는 투표가 가까울수록 표를 모은다. 투표 달에 정해진 값에 닿는다.
function progressOf(s, r) {
  if (r.voteYm == null) return s.month === 10 ? 0.9 : 1;
  const left = (Math.floor(r.voteYm / 100) - s.year) * 12 + (r.voteYm % 100) - s.month;
  return left <= 0 ? 1 : left === 1 ? 0.9 : 0.8;
}
export const supportOf = (s, key = raceKeyOf(s)) => (key ? s.support?.[key] ?? 0 : 0);
export function scoreOf(s, key = raceKeyOf(s)) {
  const front = key && s.flags[RACES[key].vice] ? (s.pair?.fame ?? 0) * (FRIEND_FRONT - 1) : 0;
  return fameTotal(s) + front + supportOf(s, key);
}
// 옛 저장의 짝은 이름 없이 id만 있다. 혼자 등록한 옛 저장은 소개받은 친구와 나간 것으로 보여 준다.
const PAIR_NAME = { c01: '정민혁', c04: '김혜린', c06: '이소영', c11: '임재민', c14: '노현우', c17: '엄주희', c20: '조대호', c21: '양미래', c26: '탁경민', c34: '남궁찬', c38: '마수정', c40: '오세라', c44: '국은채', c59: '문혜원', c82: 'Marcus' };
const MATE = { 초6: () => '배지호', 중2: () => '곽민서', 고2: (s) => ({ 서울고: '유재원', 느티여고: '신아름', 서울과학고: '정하민' }[s.school?.고등] ?? '나유찬'), 대학: (s) => (s.school?.대학 === 'MIT' ? 'Alex Kim' : '고승현') };
const OLD_GENERIC = ['반 친구', '과 동기'];
function mateName(s, key) {
  const n = s.pair?.name;
  if (n && !OLD_GENERIC.includes(n)) return n;
  return PAIR_NAME[s.pair?.id] ?? MATE[key](s);
}
const myTeam = (s, key, vice) => { const f = mateName(s, key); return vice ? `${f}·${s.name}` : `${s.name}·${f}`; };

// 지금 조별 표. 점수가 높은 순서이고, 같으면 우리 조가 앞이다.
export function raceOf(s) {
  const key = raceKeyOf(s); if (!key) return null;
  const r = RACES[key], vice = !!s.flags[r.vice];
  const top = r.top(s) * progressOf(s, r);
  const [a, b] = r.names(s);
  const rows = [{ name: myTeam(s, key, vice), me: true, score: Math.max(0, scoreOf(s, key)) }, { name: a.join('·'), score: top }, { name: b.join('·'), score: top * SECOND_RATE }];
  const sum = rows.reduce((n, x) => n + x.score, 0);
  rows.forEach((x) => { x.share = sum > 0 ? Math.round((x.score / sum) * 100) : 0; });
  rows.sort((x, y) => y.score - x.score || (y.me ? 1 : 0) - (x.me ? 1 : 0));
  const rank = rows.findIndex((x) => x.me) + 1;
  return { key, post: vice ? '부회장' : '회장', vice, rows, rank, share: rows[rank - 1].share, voteYm: r.voteYm ?? null };
}
export const isLeading = (s) => raceOf(s)?.rank === 1;
export const shareOf = (s) => raceOf(s)?.share ?? null;

export function addSupport(s, n) {
  const key = raceKeyOf(s); if (!key || !n) return;
  (s.support ??= {})[key] = (s.support[key] ?? 0) + n;
}
export function tallyLine(s) {
  const r = raceOf(s); if (!r) return '';
  return `개표 결과, ${r.rows.map((x) => `${x.name} 조 ${x.share}%`).join(', ')}.`;
}
