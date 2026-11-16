// 풋풋한 마음: 중·고등학생 때의 첫사랑. 성인 연애(love.js)와 따로 돈다. 순수 함수. DOM을 쓰지 않는다.
// 지킬 선(사용자 지시 2026-11-09)
// - 상대는 지어낸 또래 학생뿐이다. 나와 한 살 차이 이내. 어른은 절대 후보가 아니다.
// - 스킨십은 손잡기 한 번이 최고 단계다. 그 이상은 글로도 쓰지 않는다.
// - 고등학생 때만 열린다(중학교 연애는 사용자 지시로 폐기). 화면은 고등학생 사진을 쓴다(이니셜만 쓰던 규칙은 사용자 지시 2026-11-16로 없앰).
// - 성인이 되면 기록(history)이 love.js 동창 후보로 이어진다. 그때부터는 성인 사진만 쓴다.
import { stageOf, tierOf, STRESS_MAX, raise } from './rules.js';
import { enrolled, isVacation } from './school.js';
import { TEENS } from '../data/teens.js';

const ym = (s) => s.year * 12 + (s.month - 1);
const yyyymm = (s) => s.year * 100 + s.month;
const hash = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 1597334677); h ^= h >>> 16; return h >>> 0; };
const chance = (s, salt) => hash(`${s.seed ?? 1}:${s.year}:${s.month}:${salt}`) / 4294967296;
export const roll = (s, salt) => chance(s, salt);
const pickOne = (s, salt, list) => (list.length ? list[hash(`${s.seed ?? 1}:${salt}`) % list.length] : null);
const SLOT = '이번 달 활동 칸을 다 썼습니다.';
const LOCK = (why) => ({ ok: false, why });

// ---------- 사람 ----------
const NEW = new Map(TEENS.map((t) => [t.id, t]));
// 원래 있던 학교 친구들. 성별·출생연도·좋아하는 타입(내 어느 능력에 끌리는지).
const OLD = {
  c01: ['남', 1989, '인맥'], c02: ['여', 1989, '지능'], c03: ['남', 1989, '지능'], c04: ['여', 1989, '매력'], c05: ['남', 1989, '지능'], c06: ['여', 1989, '인맥'],
  c07: ['남', 1989, '체력'], c08: ['여', 1989, '매력'], c09: ['남', 1989, '체력'], c10: ['여', 1988, '매력'], c11: ['남', 1989, '인맥'], c13: ['남', 1988, '체력'],
  c14: ['남', 1989, '지능'], c15: ['여', 1989, '매력'], c16: ['남', 1989, '지능'], c17: ['여', 1989, '지능'], c18: ['남', 1988, '지능'], c19: ['여', 1989, '지능'],
  c20: ['남', 1989, '인맥'], c21: ['여', 1989, '인맥'], c23: ['여', 1989, '지능'], c24: ['남', 1989, '매력'], c34: ['남', 1989, '인맥'], c35: ['남', 1988, '매력'],
  c36: ['남', 1989, '매력'], c37: ['남', 1989, '지능'], c38: ['여', 1989, '지능'], c39: ['여', 1989, '체력'], c40: ['여', 1989, '인맥'], c41: ['여', 1989, '지능'],
  c42: ['남', 1989, '지능'], c43: ['남', 1989, '지능'], c44: ['여', 1989, '지능'],
};
const OLD_ROUTE = { c10: '동아리 선배', c35: '동아리 선배', c36: '밴드부', c15: '밴드부', c13: '선배', c18: '선배' };
let NAMES = {};
export function setNames(map) { NAMES = { ...(map ?? {}) }; }
export const nameOf = (id) => NEW.get(id)?.이름 ?? NAMES[id] ?? '그 아이';
export function infoOf(id) {
  const t = NEW.get(id);
  if (t) return { id, 이름: t.이름, 성별: t.성별, 출생연도: t.출생연도, 타입: t.teen.타입, 소개: t.teen.소개, 성격: t.teen.성격, 말버릇: t.teen.말버릇, 집안: t.teen.집안, 장면: t.teen.장면, 새인물: true };
  const o = OLD[id];
  if (!o) return null;
  return { id, 이름: nameOf(id), 성별: o[0], 출생연도: o[1], 타입: o[2], 소개: null, 성격: null, 말버릇: null, 집안: null, 장면: null, 새인물: false };
}
// 어느 학교에서 만나는가. 다른 학교 사람은 축제·연합 동아리·학원·소개로만 만난다.
export const POOL = {
  서울고: ['c07', 'c09', 'c11', 'c14', 'c34', 'c35', 'c36', 'c37', 'c111', 'c112'],
  느티여고: ['c02', 'c04', 'c10', 'c15', 'c38', 'c39', 'c40', 'c41', 'c106', 'c107', 'c109'],
  세화여고: ['c113', 'c114', 'c115', 'c116', 'c117', 'c118', 'c108', 'c110'],
  서울과학고: ['c16', 'c17', 'c18', 'c19', 'c42', 'c43', 'c44', 'c119'],
  새길직업고: ['c01', 'c06', 'c20', 'c21', 'c23', 'c24', 'c120'],
};
// 그 학교에 있는 기간(전학·졸업). 없으면 그 시기 내내.
const WINDOW = { 'c35@서울고': 200702, 'c18@서울과학고': 200702, 'c10@느티여고': 200702 };
const schoolOf = (id) => NEW.get(id)?.teen.학교 ?? null;

export const isTeenStage = (s) => stageOf(s) === '고등';
export const ownSchool = (s) => s.school?.[stageOf(s)] ?? null;
// 지도에 표시하는 다른 학교. 여고는 남학생일 때만, 여학생이면 서울고가 그 자리다.
export function otherSchool(s) {
  const st = stageOf(s);
  if (st !== '고등') return null;
  if (s.sex === '여') return ownSchool(s) === '서울고' ? '세화여고' : '서울고';
  return '세화여고';
}
// 연합 동아리·축제로 닿는 학교들(지도의 다른 학교 + 이웃 학교).
function nearSchools(s) {
  const st = stageOf(s), own = ownSchool(s);
  if (st !== '고등') return [];
  const list = s.sex === '여' ? ['서울고'] : ['세화여고', '느티여고'];
  return list.filter((x) => x !== own);
}
const ageGapOK = (s, id) => Math.abs((infoOf(id)?.출생연도 ?? 0) - (s.birthYear ?? 1989)) <= 1;
// 한 학년 아래 후배는 다음 해 3월에 들어온다.
const START = { c107: 200603, c118: 200603 };
const inWindow = (s, id, school) => { const end = WINDOW[`${id}@${school}`]; return (!end || yyyymm(s) <= end) && yyyymm(s) >= (START[id] ?? 0); };
// 이웃 학교에 지금 다니는 아이들(전학·졸업·입학 시기를 본다). 동네 지도의 이웃 학교에 보인다.
export const studentsAt = (s, school) => (POOL[school] ?? []).filter((id) => inWindow(s, id, school));
// 그 아이가 다니는 학교. 내 학교 명단에 있으면 내 학교, 어느 명단에도 없으면 '다른 학교'.
export function homeSchool(s, id) {
  const own = ownSchool(s);
  if (schoolOf(id)) return schoolOf(id);
  if (POOL[own]?.includes(id)) return own;
  return Object.keys(POOL).find((k) => POOL[k].includes(id)) ?? '다른 학교';
}
// 후보 조건. 모든 만남이 이 함수를 거친다.
export function canBe(s, id, school) {
  const p = infoOf(id);
  if (!p || !isTeenStage(s)) return false;
  if (p.성별 === s.sex || !ageGapOK(s, id)) return false;
  if (school && !inWindow(s, id, school)) return false;
  return true;
}

// ---------- 상태 ----------
// 사이(bonds)에 '스친 인연'(3)으로 올린다. 이미 있으면 그대로 둔다.
function known(s, id) { if ((s.bonds ??= {})[id] == null) { s.bonds[id] = 3; (s.bondSeen ??= {})[id] = s.year * 12 + s.month; } }
export function init(s) {
  const C = (s.crush ??= {});
  C.people ??= {}; C.history ??= {}; C.cool ??= {}; C.pending ??= []; C.touched ??= {}; C.gifted ??= {}; C.diary ??= {};
  if (C.partner === undefined) C.partner = null;
  if (C.first === undefined) C.first = null;
  C.monthDates ??= 0;
  // 만난 아이는 사람들 탭에도 보인다(사용자 지시 2026-11-16). 예전 저장도 여기서 맞춘다.
  for (const id of Object.keys(C.people)) known(s, id);
  if (C.partner?.id) known(s, C.partner.id);
  return C;
}
export const STEPS = [[0, '아는 애'], [20, '신경 쓰이는 애'], [40, '친한 사이'], [60, '썸']];
export function stepOf(v) { let n = STEPS[0][1]; for (const [min, t] of STEPS) if (v >= min) n = t; return n; }
const RANK = { '아는 애': 0, '신경 쓰이는 애': 1, '친한 사이': 2, 썸: 3, 사귐: 4 };
function remember(s, id, best, extra = {}) {
  const H = s.crush.history, cur = H[id];
  const keep = cur && RANK[cur.best] >= RANK[best] ? cur.best : best;
  H[id] = { ...(cur ?? {}), best: keep, ...extra, at: cur?.at ?? yyyymm(s) };
}
const say = (s, t) => { (s.log ??= []).push(t); };

// 만난다(아는 사이로 올린다). 이미 아는 사람이면 아무것도 하지 않는다.
// school: 이웃 학교에서 말을 텄을 때 그 학교 이름. 없으면 새 인물의 학교나 내 학교.
export function meet(s, id, route, school) {
  init(s);
  const C = s.crush;
  if (C.people[id] || C.history[id]?.ended) return false;
  const at = schoolOf(id) ?? school ?? ownSchool(s);
  if (!canBe(s, id, at)) return false;
  C.people[id] = { 마음: 8, 길: route ?? '같은 반', 학교: at, at: yyyymm(s) };
  remember(s, id, '아는 애', { 학교: C.people[id].학교, 길: C.people[id].길 });
  known(s, id);
  return true;
}
// 같은 학교 사람 가운데 아직 모르는 사람.
export function unmetOwn(s) {
  init(s);
  const own = ownSchool(s);
  return (POOL[own] ?? []).filter((id) => canBe(s, id, own) && !s.crush.people[id] && !s.crush.history[id]?.ended && (schoolOf(id) == null || schoolOf(id) === own));
}
export function unmetNear(s, routes) {
  init(s);
  const out = [];
  for (const sch of nearSchools(s)) for (const id of POOL[sch] ?? []) {
    if (!canBe(s, id, sch) || s.crush.people[id] || s.crush.history[id]?.ended) continue;
    const t = NEW.get(id);
    if (routes && t && !routes.includes(t.teen.길)) continue;
    out.push(id);
  }
  return out;
}
// 첫 번째 인생에서 말도 못 걸어 본 아이. 고등학교 1학년 때 내 학교나 이웃 학교에서 한 명을 정한다.
export function firstLoveOf(s) {
  init(s);
  if (s.crush.first) return s.crush.first;
  if (stageOf(s) !== '고등') return null;
  const list = [ownSchool(s), ...nearSchools(s)].flatMap((sch) => (POOL[sch] ?? []).filter((id) => canBe(s, id, sch) && !WINDOW[`${id}@${sch}`] && !START[id]));
  s.crush.first = pickOne(s, 'firstlove', list);
  return s.crush.first;
}

// ---------- 마음 쌓기 ----------
const tier = (s, k) => tierOf(s.stats[k]);
// 상대가 좋아하는 타입(내 능력)이 높을수록, 매력이 높을수록 잘 쌓인다.
export function fitOf(s, id) {
  const p = infoOf(id);
  const t = tier(s, p?.타입 ?? '매력');
  return Math.min(1.9, (0.7 + 0.12 * t) * (1 + 0.04 * tier(s, '매력')));
}
const sameSchool = (s, id) => (s.crush.people[id]?.학교 ?? schoolOf(id)) === ownSchool(s);
const inClass = (s) => enrolled(s) && !isVacation(s);
const talkLabel = (s) => (stageOf(s) === '고등' ? '문자 보내기' : s.year >= 2003 ? '싸이월드 방명록 남기기' : '버디버디로 대화하기');
const GIFT = { 2: ['초콜릿 주기', '밸런타인데이'], 3: ['사탕 주기', '화이트데이'], 11: ['빼빼로 주기', '빼빼로데이'], 12: ['크리스마스 카드 주기', '크리스마스'] };
const SPECIAL_MONTH = (s) => [2, 3, 10, 11, 12].includes(s.month) || (!!s.flags?.수학여행중 && yyyymm(s) === 200610);
// 같은 달·같은 사람이면 같은 글, 달이 바뀌면 다른 글.
const vary = (s, id, list) => list[hash(`${s.seed ?? 1}:${s.year}:${s.month}:${id}:글`) % list.length];
const summerOf = (s) => s.month >= 6 && s.month <= 9;
// term: 학기 중에만 보인다. vac: 방학에만 보인다.
export const ACTS = {
  note: { label: '쪽지 건네기', gain: 6, term: true, need: (s, id) => (!sameSchool(s, id) ? '같은 학교일 때만 할 수 있습니다.' : !inClass(s) ? '방학 중에는 학교에 가지 않습니다.' : null),
    text: (n, s, id) => vary(s, id, [`쉬는 시간에 ${n}에게 쪽지를 건넸다. 수업 시간 내내 답장이 올까 신경이 쓰였다. 종이 치기 전에 접힌 쪽지가 돌아왔다.`, `${n}의 필통 밑에 쪽지를 끼워 두었다. 다음 시간에 같은 자리에 답장이 있었다. 글씨가 평소보다 반듯했다.`, `수업 중에 ${n}에게 쪽지를 돌렸다. 앞자리 친구 셋을 거쳐 갔다. 돌아온 답장에는 "들키면 너 책임"이라고 적혀 있었다.`]) },
  walk: { label: '같이 하교하기', gain: 7, stress: -2, min: 40, term: true, need: (s, id) => (!sameSchool(s, id) ? '같은 학교일 때만 할 수 있습니다.' : !inClass(s) ? '방학 중에는 학교에 가지 않습니다.' : null),
    text: (n, s, id) => vary(s, id, [`${n}과(와) 같이 교문을 나섰다. 일부러 먼 길로 돌아갔다. 문방구 앞에서 헤어질 때 내일 보자는 말이 이상하게 길었다.`, `${n}과(와) 버스 정류장까지 같이 걸었다. 버스가 두 대나 지나갔다. 둘 다 못 본 척했다.`, `비가 와서 ${n}과(와) 우산 하나를 같이 썼다. 내 쪽 어깨만 젖었는데 하나도 춥지 않았다.`]) },
  vacation: { label: '방학 특강 같이 듣기', gain: 6, study: 2, vac: true, cost: 20000, need: (s) => (inClass(s) ? '방학 때만 열립니다.' : null),
    text: (n, s, id) => vary(s, id, summerOf(s)
      ? [`여름 방학 특강에 ${n}과(와) 같이 등록했다. 에어컨 바람이 센 자리를 ${n}이(가) 맡아 두었다.`, `특강이 끝나고 ${n}과(와) 학원 앞 편의점에서 아이스크림을 하나씩 사 먹었다. 매미 소리가 시끄러웠다.`]
      : [`겨울 방학 특강 교실에서 ${n}과(와) 나란히 앉았다. 난로 옆자리라 졸음이 쏟아졌다. ${n}이(가) 볼펜으로 내 팔을 콕 찔렀다.`, `특강이 끝나니 밖이 벌써 깜깜했다. ${n}과(와) 붕어빵 한 봉지를 나눠 들고 정류장까지 걸었다.`]) },
  study: { label: '도서관에서 같이 공부하기', gain: 5, min: 20, study: 3,
    text: (n, s, id) => vary(s, id, inClass(s)
      ? [`도서관 맞은편 자리에 ${n}이(가) 앉았다. 모르는 문제를 물어보는 척 몇 번 말을 걸었다. 공부도 조금은 했다.`, `시험 기간이라 도서관이 꽉 찼다. ${n}이(가) 옆자리 가방을 치워 자리를 내주었다.`]
      : [`방학이라 구립 도서관이 한산했다. ${n}과(와) 창가 자리에 앉아 방학 숙제를 했다. 반은 수다였다.`, `방학 동안 ${n}과(와) 도서관에서 만나기로 했다. 열람실을 나와 매점 컵라면을 먹는 시간이 제일 길었다.`]) },
  talk: { label: null, gain: 5,
    text: (n, s, id) => {
      const vac = !inClass(s);
      if (stageOf(s) === '고등') return vary(s, id, vac ? [`방학 잘 보내냐고 ${n}에게 문자를 보냈다. 답장이 오자마자 또 보냈다. 문자 요금이 걱정됐다.`, `밤늦게 ${n}과(와) 문자를 주고받았다. 개학하면 보자는 말에 한참 답을 못 했다.`] : [`${n}에게 문자를 보냈다. 답장이 올 때까지 휴대폰을 몇 번이나 열어 봤다.`, `야자 쉬는 시간에 ${n}에게 문자를 보냈다. 답장에 웃는 이모티콘이 붙어 있었다.`]);
      if (s.year >= 2003) return vary(s, id, vac ? [`${n}의 미니홈피에 방학 사진이 올라왔다. 방명록에 잘 지내냐고 남겼다. 다음 날 답글이 길게 달렸다.`] : [`${n}의 미니홈피에 방명록을 남겼다. 한참 뒤에 일촌 신청이 와 있었다.`]);
      return vary(s, id, vac ? [`방학이라 밤늦게까지 버디버디로 ${n}과(와) 이야기했다. 엄마가 컴퓨터 좀 끄라고 했다.`] : [`밤에 버디버디로 ${n}과(와) 이야기했다. 대화창이 깜빡일 때마다 가슴이 뛰었다.`]);
    } },
  diary: { label: '교환일기 쓰기', gain: 8, min: 40, need: (s, id) => (!sameSchool(s, id) ? '같은 학교일 때만 할 수 있습니다.' : s.crush.diary[id] === yyyymm(s) ? '이번 달에는 이미 썼습니다.' : null),
    text: (n, s, id) => vary(s, id, inClass(s)
      ? [`${n}과(와) 돌려 쓰는 공책에 오늘 일을 적었다. 지난 장에 ${n}이(가) 그려 놓은 작은 그림 옆에 나도 하나 그렸다.`, `교환일기에 오늘 급식 이야기만 세 줄 썼다. 돌아온 장에는 ${n}의 급식 평가가 다섯 줄이었다.`]
      : [`방학이라 교환일기를 ${n}네 집 앞에서 주고받았다. 방학 동안 쓴 장이 평소보다 두꺼웠다.`, `방학 내내 쓴 교환일기를 ${n}에게 건넸다. ${n}이(가) 그 자리에서 첫 장을 펼쳐 보고 웃었다.`]) },
  gift: { label: null, gain: 10, cost: 5000, need: (s, id) => (!GIFT[s.month] ? '특별한 날에만 열립니다.' : s.crush.gifted[id] === yyyymm(s) ? '이번 달에는 이미 줬습니다.' : null),
    text: (n, s) => `${GIFT[s.month][1]}에 ${n}에게 ${GIFT[s.month][0].replace(' 주기', '')}을(를) 건넸다. ${n}이(가) 받아 들고 한참 웃었다.` },
};
// 지금 보일 행동. 방학에는 학교에서 하는 일을 빼고 방학 일을 넣는다.
export const actKeys = (s) => Object.keys(ACTS).filter((k) => (inClass(s) ? !ACTS[k].vac : !ACTS[k].term));
export function actLabel(s, key) { return key === 'talk' ? talkLabel(s) : key === 'gift' ? (GIFT[s.month]?.[0] ?? '선물 주기') : ACTS[key].label; }
function slotErr(s, cost = 0) {
  if (s.ended) return '이야기가 끝났습니다.';
  if (s.used >= s.capacity) return SLOT;
  if (s.cash < cost) return '돈이 모자랍니다.';
  return null;
}
export function canAct(s, id, key) {
  init(s);
  const a = ACTS[key], e = s.crush.people[id];
  if (!a || !e) return LOCK('지금은 할 수 없습니다.');
  if (!isTeenStage(s)) return LOCK('학생 때만 할 수 있습니다.');
  if (a.min && e.마음 < a.min && s.crush.partner?.id !== id) return LOCK(`${stepOf(a.min)}부터 할 수 있습니다.`);
  const w = a.need?.(s, id);
  if (w) return LOCK(w);
  const err = slotErr(s, a.cost ?? 0);
  return err ? LOCK(err) : { ok: true, cost: a.cost ?? 0 };
}
export function act(s, id, key) {
  const c = canAct(s, id, key);
  if (!c.ok) return c;
  const C = s.crush, a = ACTS[key], e = C.people[id], n = nameOf(id), before = stepOf(e.마음);
  s.used += 1; s.cash -= c.cost;
  e.마음 = Math.min(100, e.마음 + a.gain * fitOf(s, id));
  C.touched[id] = yyyymm(s);
  if (key === 'diary') C.diary[id] = yyyymm(s);
  if (key === 'gift') C.gifted[id] = yyyymm(s);
  if (a.study && enrolled(s)) s.study = Math.min(100, s.study + a.study);
  if (a.stress) s.stress = Math.max(0, s.stress + a.stress);
  else s.stress = Math.max(0, s.stress - 1);
  raise(s, '매력', 0.4);
  if (key === 'study') raise(s, '지능', 0.5);
  if (C.partner?.id === id) C.partner.사이 = Math.min(100, C.partner.사이 + a.gain * 0.6);
  const after = stepOf(e.마음);
  if (RANK[after] > RANK[before]) remember(s, id, after);
  let text = a.text(n, s, id);
  if (after !== before) text += ` ${n}과(와)는 이제 ${after}다.`;
  say(s, text);
  return { ok: true, text, step: after, stepUp: after !== before };
}

// ---------- 고백 ----------
const COOL = 3;
export function canConfess(s, id) {
  init(s);
  const C = s.crush, e = C.people[id];
  if (!e || !isTeenStage(s)) return LOCK('지금은 할 수 없습니다.');
  if (C.partner) return LOCK(C.partner.id === id ? '이미 사귀는 사이입니다.' : '사귀는 사람이 있습니다.');
  if (e.마음 < 60) return LOCK('썸이 되면 고백할 수 있습니다.');
  if (C.cool[id] && ym(s) < C.cool[id]) return LOCK('지난 고백 뒤라 조금 어색합니다. 시간이 좀 필요합니다.');
  const err = slotErr(s);
  return err ? LOCK(err) : { ok: true, good: SPECIAL_MONTH(s) };
}
export function confessChance(s, id) {
  const e = s.crush.people[id];
  const p = 0.3 + (e.마음 - 60) / 80 + 0.06 * tier(s, infoOf(id).타입) + 0.04 * tier(s, '매력') + (SPECIAL_MONTH(s) ? 0.12 : 0);
  return Math.max(0.1, Math.min(0.92, p));
}
const sceneOf = (id, key, n) => infoOf(id)?.장면?.[key] ?? DEFAULT_SCENE[key](n);
const DEFAULT_SCENE = {
  받아줌: (n) => `${n}이(가) 한참 말이 없다가 고개를 끄덕였다. "나도 사실… 너 기다렸어."`,
  거절: (n) => `${n}이(가) 미안한 얼굴로 웃었다. "고마워. 그런데 지금은 친구가 좋아." 집에 오는 길이 유난히 길었다.`,
  먼저고백: (n) => `하교 길에 ${n}이(가) 불러 세웠다. 한참 머뭇거리다 말했다. "나 너 좋아해. 대답은 천천히 해도 돼."`,
  이별: (n) => `${n}과(와) 마지막으로 학교 앞 분식집에 갔다. "그동안 고마웠어." 둘 다 웃으면서 헤어졌다.`,
  첫만남: (n) => `${n}이(가) 자꾸 눈에 들어온다.`,
};
function startDating(s, id) {
  const C = s.crush;
  C.partner = { id, since: ym(s), 사이: 60, hand: false, lastDate: ym(s), far: !sameSchool(s, id), pause: false };
  remember(s, id, '사귐');
}
export function confess(s, id) {
  const c = canConfess(s, id);
  if (!c.ok) return c;
  const C = s.crush, n = nameOf(id), e = C.people[id];
  s.used += 1;
  const yes = chance(s, `confess${id}`) < confessChance(s, id);
  if (yes) {
    startDating(s, id);
    s.stress = Math.max(0, s.stress - 8);
    raise(s, '매력', 1);
    const text = `${sceneOf(id, '받아줌', n)} 오늘부터 ${n}과(와) 사귀는 사이다.`;
    say(s, text);
    return { ok: true, yes: true, text, title: '고백' };
  }
  e.마음 = Math.max(20, e.마음 - 15);
  C.cool[id] = ym(s) + COOL;
  s.stress = Math.min(STRESS_MAX, s.stress + 8);
  remember(s, id, '썸');
  const text = sceneOf(id, '거절', n);
  say(s, text);
  return { ok: true, yes: false, text, title: '고백' };
}

// ---------- 데이트 (그 나이대에 할 수 있는 것만) ----------
// [키, 이름, 비용, 열리는 조건, 글]
export const DATES = [
  ['tteok', '분식집에서 떡볶이', 3000, () => true, (n) => `${n}과(와) 떡볶이 한 접시를 나눠 먹었다. 순대를 하나 더 시켰더니 ${n}이(가) 그걸 왜 이제 시키냐며 웃었다.`],
  ['walk', '하굣길 산책', 0, (s) => !isVacation(s), (n) => `${n}과(와) 동네를 한 바퀴 돌았다. 놀이터 그네에 앉아 별 얘기 아닌 얘기를 오래 했다.`],
  ['karaoke', '노래방', 5000, () => true, (n) => `노래방에서 ${n}이(가) 요즘 유행하는 노래를 불렀다. 나는 탬버린만 열심히 쳤다.`],
  ['sticker', '스티커 사진', 3000, () => true, (n) => `${n}과(와) 스티커 사진을 찍었다. 반쪽은 내 필통에, 반쪽은 ${n}의 다이어리에 붙였다.`],
  ['keyring', '문방구 커플 열쇠고리', 2000, () => true, (n) => `문방구에서 반쪽짜리 하트 열쇠고리를 샀다. 가방에 달고 다니다가 친구들에게 들켰다.`],
  ['movie', '조조 영화', 6000, () => true, (n) => `일요일 아침 조조 영화를 봤다. 팝콘을 나눠 먹다 손이 부딪힐 때마다 영화 내용이 하나도 들어오지 않았다.`],
  ['library', '도서관 데이트', 0, () => true, (n) => `${n}과(와) 구립 도서관에 갔다. 같은 책상에 마주 앉아 공부했다. 가끔 공책 귀퉁이에 낙서로 대화했다.`, { study: 2 }],
  ['pcbang', 'PC방에서 같이 게임', 2000, () => true, (n) => `PC방 옆자리에서 ${n}과(와) 같은 게임을 했다. ${n}이(가) 나보다 잘해서 조금 분했다.`],
  ['bike', '한강 자전거', 5000, (s) => [4, 5, 6, 9, 10].includes(s.month), (n) => `한강에서 자전거를 빌렸다. ${n}이(가) 앞서 달리다 돌아보며 손을 흔들었다.`],
  ['park', '놀이공원', 30000, (s) => isVacation(s) || [5, 10].includes(s.month), (n) => `놀이공원에서 하루 종일 줄을 섰다. 회전목마 앞에서 ${n}이(가) 이건 꼭 타야 한다고 우겼다. 돌아오는 지하철에서 둘 다 졸았다.`],
  ['daehakro', '대학로 구경', 10000, (s) => stageOf(s) === '고등', (n) => `대학로를 걸었다. 길거리 공연을 한참 구경하다 ${n}이(가) 나중에 우리도 여기서 대학 다니자고 했다.`],
  ['myeongdong', '명동 구경', 15000, (s) => stageOf(s) === '고등', (n) => `명동 거리를 구경했다. 노점 떡꼬치를 하나씩 들고 사람 구경을 했다.`],
  ['xmas', '크리스마스 거리', 10000, (s) => s.month === 12, (n) => `크리스마스 거리는 캐럴과 사람으로 가득했다. ${n}과(와) 붕어빵을 나눠 먹으며 트리 앞에서 사진을 찍었다.`],
  ['dokseosil', '독서실 같이 다니기', 5000, (s) => stageOf(s) === '고등', (n) => `${n}과(와) 같은 독서실에 다녔다. 쉬는 시간에 자판기 코코아를 하나씩 뽑아 계단에서 마셨다.`, { study: 3 }],
  ['cheer', '수능 응원', 0, (s) => s.month === 11 && stageOf(s) === '고등', (n) => `수능 전날 ${n}에게 찹쌀떡과 손편지를 건넸다. "잘 보고 와." ${n}이(가) 편지를 가방 깊숙이 넣었다.`],
];
const HAND_TEXT = (n) => `돌아오는 길에 손끝이 살짝 닿았다. 누가 먼저랄 것도 없이 ${n}의 손을 잡았다. 집 앞에 도착할 때까지 둘 다 아무 말도 하지 않았다.`;
export function dateOptions(s) {
  init(s);
  const P = s.crush.partner;
  if (!P) return [];
  return DATES.filter(([, , , open]) => open(s)).map(([key, label, cost]) => {
    const why = !isTeenStage(s) ? '학생 때만 할 수 있습니다.' : P.pause ? '수능이 끝날 때까지 쉬기로 했습니다.' : slotErr(s, cost);
    return { key, label, cost, ok: !why, why };
  });
}
export function date(s, key) {
  init(s);
  const C = s.crush, P = C.partner;
  const row = DATES.find((d) => d[0] === key);
  const o = dateOptions(s).find((d) => d.key === key);
  if (!P || !row || !o) return LOCK('지금은 할 수 없습니다.');
  if (!o.ok) return LOCK(o.why);
  const n = nameOf(P.id), extra = row[5] ?? {};
  s.used += 1; s.cash -= row[2];
  C.monthDates += 1;
  P.lastDate = ym(s);
  P.사이 = Math.min(100, P.사이 + 8 * Math.min(1.4, fitOf(s, P.id)));
  s.stress = Math.max(0, s.stress - 5);
  raise(s, '매력', 0.6);
  if (extra.study && enrolled(s)) s.study = Math.min(100, s.study + extra.study);
  let text = row[4](n, s);
  let hand = false;
  if (!P.hand && ym(s) - P.since >= 2 && P.사이 >= 55) { P.hand = true; hand = true; text += ` ${HAND_TEXT(n)}`; }
  else if (P.hand && chance(s, `hand${key}`) < 0.35) text += ' 헤어지기 전까지 손을 잡고 걸었다.';
  if (C.monthDates >= 3 && enrolled(s)) { s.study = Math.max(0, s.study - 4); text += ' 요즘 공부가 조금 밀렸다.'; }
  say(s, text);
  return { ok: true, text, hand, title: hand ? '처음 잡은 손' : null };
}

// ---------- 헤어짐 ----------
export function breakUp(s, how = '좋게', text) {
  const C = s.crush, P = C.partner;
  if (!P) return null;
  const n = nameOf(P.id);
  remember(s, P.id, '사귐', { end: how, ended: true, hand: P.hand, months: ym(s) - P.since });
  delete C.people[P.id]; // 헤어진 사람은 추억으로만 남는다(다시 만나는 건 성인이 된 뒤 동창회)
  C.partner = null;
  const t = text ?? sceneOf(P.id, '이별', n);
  say(s, t);
  return t;
}

// ---------- 달 넘김 ----------
const SCENE_KINDS = ['서운함', '고백받음', '부모님', '수능', '이별', '첫사랑'];
const hasPending = (s, kind) => s.crush.pending.some((p) => p.kind === kind);
const push = (s, kind, id) => { if (!hasPending(s, kind)) s.crush.pending.push({ kind, id, at: yyyymm(s) }); };
export function onMonth(s) {
  init(s);
  const C = s.crush, st = stageOf(s), cur = yyyymm(s);
  // 성인이 되면 학생 때 이야기를 닫는다. 기록은 love.js가 동창 후보로 읽는다.
  if (!isTeenStage(s)) {
    if (st !== '초등' && !C.closed) {
      if (C.partner) breakUp(s, '졸업', `졸업식 날 ${nameOf(C.partner.id)}과(와) 교문 앞에서 사진을 찍었다. 각자 다른 길로 간다. 그래도 연락은 하기로 했다.`);
      C.pending = []; C.closed = true;
    }
    return;
  }
  // 지난달 손대지 않은 마음은 조금씩 식는다.
  for (const [id, e] of Object.entries(C.people)) {
    if (C.partner?.id === id) continue;
    const last = C.touched[id];
    if (!last || cur - last > 1) e.마음 = Math.max(0, e.마음 - 2);
  }
  const P = C.partner;
  if (P && !P.pause) {
    const idle = ym(s) - P.lastDate;
    if (idle >= 1) P.사이 = Math.max(0, P.사이 - (P.far ? 7 : 5));
    if (P.사이 < 12) push(s, '이별', P.id);
    else if (P.사이 < 30) push(s, '서운함', P.id);
  }
  if (P?.pause && cur >= 200712) { P.pause = false; P.lastDate = ym(s); }
  C.monthDates = 0;
  // 새 학년마다, 그리고 가끔 같은 학교 아이가 눈에 들어온다.
  const fresh = unmetOwn(s);
  const first = firstLoveOf(s);
  if (first && !C.people[first] && !C.history[first] && cur >= 200503) { if (meet(s, first, NEW.get(first)?.teen.길 ?? OLD_ROUTE[first] ?? '같은 반')) push(s, '첫사랑', first); }
  else if (fresh.length && inClass(s) && (s.month === 3 || chance(s, 'intro') < 0.3)) {
    const id = pickOne(s, `intro${cur}`, fresh);
    if (meet(s, id, OLD_ROUTE[id] ?? NEW.get(id)?.teen.길 ?? '같은 반')) say(s, `요즘 같은 학교 ${nameOf(id)}이(가) 자꾸 눈에 들어온다.`);
  }
  // 마음이 큰 아이가 먼저 고백할 때가 있다.
  if (!C.partner) {
    const hot = Object.entries(C.people).filter(([id, e]) => e.마음 >= 70 && !(C.cool[id] && ym(s) < C.cool[id])).map(([id]) => id);
    const id = hot.sort()[0];
    if (id && chance(s, `them${id}`) < 0.08 + 0.03 * tier(s, '매력')) push(s, '고백받음', id);
  }
  if (C.partner) {
    // 시험 뒤 성적이 떨어지면 부모님이 알게 된다.
    if ([5, 7, 10, 12].includes(s.month) && s.study < 40 && !C.parentsAt) push(s, '부모님', C.partner.id);
    // 중학교 졸업: 다른 고등학교로 가는 상대.
    if (cur === 200709) push(s, '수능', C.partner.id);
  }
}
export const pendingOf = (s, kind) => (init(s), s.crush.pending.find((p) => p.kind === kind) ?? null);
const drop = (s, kind) => { s.crush.pending = s.crush.pending.filter((p) => p.kind !== kind); };
// 장면 글. events.js의 textOf로 쓴다.
export function sceneText(s, kind) {
  const p = pendingOf(s, kind);
  const n = p ? nameOf(p.id) : '그 아이';
  switch (kind) {
    case '첫사랑': return `고등학교 첫 봄, 길 건너에서 ${n}이(가) 친구들과 웃고 있다. 숨이 잠깐 멎었다. 첫 번째 인생에서 삼 년 내내 말 한마디 못 걸어 본 아이다. 그때는 졸업식 날 멀리서 보기만 했다. 이번에는 다를 수 있을까.`;
    case '서운함': return `요즘 ${n}의 답장이 짧아졌다. 복도에서 마주쳐도 먼저 눈을 피한다. 친구가 귀띔했다. "${n}, 너 요즘 너무 바쁜 것 같다고 서운해하더라."`;
    case '고백받음': return sceneOf(p?.id, '먼저고백', n);
    case '부모님': return `성적표가 나온 날 저녁, 엄마가 책상 서랍에서 ${n}이(가) 준 쪽지를 들고 서 계셨다. "요즘 성적이 왜 이런가 했더니." 아빠도 신문을 내려놓으셨다.`;
    case '수능': return `고3 가을이 왔다. 교실 뒤 칠판의 숫자가 하루씩 줄어든다. ${n}이(가) 조심스럽게 말했다. "우리 수능 끝날 때까지 잠깐 쉬었다가 다시 만날까?"`;
    case '이별': return `${n}과(와) 연락이 뜸해진 지 오래다. 어느 날 ${n}이(가) 학교 앞에서 기다리고 있었다. "우리 그만 만나는 게 좋겠어." 붙잡을 말이 떠오르지 않았다.`;
    default: return '';
  }
}
// 장면 선택. i는 선택지 순서. 결과 문장을 s.crush.last에 남긴다(events.js resultOf).
export function resolve(s, kind, i) {
  init(s);
  const p = pendingOf(s, kind), C = s.crush;
  drop(s, kind);
  if (!p) return null;
  const n = nameOf(p.id), P = C.partner;
  let t = '';
  if (kind === '첫사랑') { const e = C.people[p.id]; if (e) e.마음 = i === 0 ? 22 : 12; t = i === 0 ? `쉬는 시간에 ${n}에게 먼저 인사했다. "안녕. 나 너 이름 알아." ${n}이(가) 놀란 눈으로 웃었다. 첫 번째 인생에서는 끝내 못 했던 말이다.` : `이번에도 멀리서 보기만 했다. 그래도 아직 삼 년이 남았다.`; }
  if (kind === '서운함' && P) { P.사이 = Math.min(100, P.사이 + (i === 0 ? 22 : 6)); P.lastDate = ym(s); t = i === 0 ? `먼저 연락해서 미안하다고 했다. ${n}이(가) 한참 뒤에 답장을 보냈다. "나도 너무 서운해만 했어." 다음 날 복도에서 ${n}이(가) 먼저 손을 흔들었다.` : `시험 때문에 바빴다고 둘러댔다. ${n}은(는) 알겠다고만 했다.`; }
  if (kind === '고백받음') {
    if (i === 0 && !C.partner) { startDating(s, p.id); s.stress = Math.max(0, s.stress - 6); t = `${n}에게 나도 좋다고 대답했다. ${n}이(가) 두 손으로 얼굴을 가리고 웃었다. 오늘부터 사귀는 사이다.`; }
    else { const e = C.people[p.id]; if (e) e.마음 = Math.max(30, e.마음 - 12); C.cool[p.id] = ym(s) + COOL; t = `아직은 친구로 지내고 싶다고 했다. ${n}은(는) 괜찮다며 웃었지만 눈가가 빨갰다.`; }
  }
  if (kind === '부모님') { C.parentsAt = yyyymm(s); if (i === 0) { s.stress = Math.min(STRESS_MAX, s.stress + 3); t = '솔직하게 다 말씀드렸다. 엄마가 한숨을 쉬다 말했다. "만나는 건 좋은데, 공부도 같이 챙겨." 아빠는 그 아이 이름만 물어보셨다.'; } else { s.stress = Math.min(STRESS_MAX, s.stress + 8); t = '그냥 친구가 준 거라고 했다. 엄마는 더 묻지 않았다. 대신 그날부터 휴대폰 요금 고지서를 꼼꼼히 보셨다.'; } }
  if (kind === '수능' && P) { if (i === 0) { P.pause = true; t = `수능이 끝날 때까지 잠깐 쉬기로 했다. ${n}이(가) 손가락을 걸었다. "수능 끝나는 날 꼭 연락해."`; } else { P.사이 = Math.min(100, P.사이 + 6); t = `끝까지 같이 가기로 했다. 같은 독서실에 다니며 서로의 시험 범위를 물어봐 주기로 했다.`; } }
  if (kind === '이별') t = breakUp(s, i === 0 ? '좋게' : '나쁘게', i === 0 ? `${n}에게 그동안 고마웠다고 했다. ${n}도 고개를 끄덕였다. 좋은 추억으로 남기로 했다.` : `왜냐고 따져 물었다. ${n}은(는) 대답 대신 돌아섰다. 한동안 그 길로는 다니지 않았다.`);
  C.last = t;
  say(s, t);
  return t;
}

// ---------- 다른 학교에서 만나기 ----------
// route: 축제·연합 동아리·학원·친구 소개·수학여행. 사람이 없으면 null.
export function meetNear(s, route) {
  init(s);
  const routes = { 축제: ['축제'], '연합 동아리': ['연합 동아리'], 학원: ['학원'], '친구 소개': ['친구 소개'], 수학여행: ['수학여행'] }[route];
  let list = unmetNear(s, routes);
  if (!list.length && route !== '수학여행') list = unmetNear(s, null); // 그 길의 사람을 다 만났으면 이웃 학교의 다른 아이
  const id = pickOne(s, `${route}${yyyymm(s)}${s.used}`, list.sort());
  if (!id || !meet(s, id, route)) return null;
  return id;
}
export function firstSceneOf(id) { const n = nameOf(id); return infoOf(id)?.장면?.첫만남 ?? DEFAULT_SCENE.첫만남(n); }

// ---------- 화면 자료 ----------
export function panel(s) {
  init(s);
  const C = s.crush;
  const P = C.partner;
  const people = Object.entries(C.people).filter(([id]) => id !== P?.id && !C.history[id]?.ended).map(([id, e]) => ({ id, 이름: nameOf(id), 단계: stepOf(e.마음), 마음: e.마음, 길: e.길, 학교: e.학교, info: infoOf(id), first: C.first === id }))
    .sort((a, b) => b.마음 - a.마음);
  const partner = P ? { id: P.id, 이름: nameOf(P.id), 사이: P.사이, hand: P.hand, months: ym(s) - P.since, far: P.far, pause: P.pause, 학교: C.people[P.id]?.학교 ?? schoolOf(P.id), info: infoOf(P.id),
    mood: P.사이 >= 70 ? '요즘 같이 있으면 시간이 빨리 간다.' : P.사이 >= 40 ? '사이가 좋다.' : '요즘 조금 서먹하다.' } : null;
  const memories = Object.entries(C.history).filter(([, h]) => h.best === '사귐' && h.ended).map(([id, h]) => ({ id, 이름: nameOf(id), end: h.end, hand: h.hand, 학교: h.학교 }));
  return { open: isTeenStage(s), partner, people, memories, own: ownSchool(s), other: otherSchool(s) };
}
// 성인 연애로 이어질 때 쓰는 값. love.js가 직접 읽는다(순환 참조를 피하려고 s.crush만 본다).
export function adultBonus(s, id) {
  const h = s.crush?.history?.[id];
  if (!h) return 0;
  if (h.best === '사귐') return h.end === '나쁘게' ? -10 : 25;
  return { 썸: 12, '친한 사이': 6, '신경 쓰이는 애': 3 }[h.best] ?? 0;
}
export const SCENES = SCENE_KINDS;
