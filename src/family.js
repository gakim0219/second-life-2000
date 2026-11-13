// 가족: 부모님 장면, 가정 생활, 자녀, 이혼. 순수 함수. 근거: design/15 5~8장, 17 3장.
// 장면은 {id,title,text,who,choices:[{label,ok,why}]} 형식. pendingScenes로 받고 chooseScene으로 고른다.
import { krNum } from './num.js';
import { tierOf, stageOf, jobAt, gain, raise } from './rules.js';
import * as invest from './invest.js';
import { setRecord } from './ending.js';
import { afterParting } from './bonds.js';

export const MARRY_LIMIT_CHILD = 3; // 자녀 수 상한(미정, 가정)
export const EDU = [0, 300000, 1000000]; // 교육비 선택(아이당 매달): 없음 / 보통 / 많이
const ym = (s) => s.year * 12 + (s.month - 1);
const say = (s, t) => { s.log.push(t); };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function init(s) {
  s.flags ??= {};
  s.bonds ??= {};
  s.log ??= [];
  const f = (s.family ??= {});
  f.done ??= [];
  f.home ??= null;
  f.교육 ??= s.love?.교육 ?? 0;
  f.이전자녀 ??= [];
  f.방문연 ??= null;
  f.방문수 ??= 0;
  f.nwPeak ??= null;
  f.돈장면 ??= null;
  return f;
}
const seen = (s, id) => init(s).done.includes(id);
const done = (s, id) => { const f = init(s); if (!f.done.includes(id)) f.done.push(id); };
const spouse = (s) => (s.partner?.married ? s.partner : null);
const addParent = (s, n) => { s.bonds.부모님 = clamp((s.bonds.부모님 ?? 75) + n, 75, 100); };

// ---------- 자녀 ----------
export function canHaveChild(s) {
  const P = spouse(s);
  if (!P) return { ok: false, why: '결혼한 뒤에 정할 수 있습니다.' };
  if (P.자녀.length >= MARRY_LIMIT_CHILD) return { ok: false, why: '더는 정하지 않습니다.' };
  return { ok: true };
}
export function haveChild(s, name) {
  init(s);
  const c = canHaveChild(s);
  if (!c.ok) return c;
  const P = s.partner;
  const child = { 이름: String(name ?? '').trim() || `아이${P.자녀.length + 1}`, 이름정함: !!String(name ?? '').trim(), 태어남: { year: s.year, month: s.month }, 장면: ['이름짓기'] };
  P.자녀.push(child);
  s.flags.자녀 = true;
  s.flags.자녀_이름짓기 = true;
  const t = `${child.이름}이(가) 태어났습니다.`;
  say(s, t);
  return { ok: true, child, text: t };
}
export function nameChild(s, index, name) {
  const P = s.partner; const c = P?.자녀?.[index]; const n = String(name ?? '').trim();
  if (!c) return { ok: false, why: '없는 아이입니다.' };
  if (!n || n.length > 8) return { ok: false, why: '이름은 1~8자로 지어 주세요.' };
  c.이름 = n; c.이름정함 = true;
  return { ok: true, text: `아이 이름을 ${n}(으)로 지었습니다.` };
}
export const childMonths = (s, c) => ym(s) - (c.태어남.year * 12 + c.태어남.month - 1);
// 아이 한 명의 매달 양육비. 어릴수록 많이 든다.
export function childCost(s, c) {
  const y = Math.floor(childMonths(s, c) / 12);
  return y < 3 ? 800000 : y < 7 ? 600000 : 400000;
}
export function setEducation(s, level) {
  init(s);
  if (!Number.isInteger(level) || EDU[level] == null) return { ok: false, why: '없는 선택입니다.' };
  s.family.교육 = level;
  return { ok: true, monthly: EDU[level] };
}
export const educationOptions = (s) => EDU.map((v, i) => ({ level: i, label: ['없음', '보통', '많이'][i], monthly: v, selected: init(s).교육 === i }));
const slotsOf = (s, list) => list.reduce((n, c) => { const y = Math.floor(childMonths(s, c) / 12); return n + (y < 3 ? 2 : y < 7 ? 1 : 0); }, 0);
// 어릴수록 많이 드는 가족 칸. 달이 넘어가면 먼저 빠진다.
export function familySlots(s) {
  const P = spouse(s);
  return P ? slotsOf(s, P.자녀) : 0;
}
export function familyPanel(s) {
  const f = init(s); const P = spouse(s);
  if (!P) return null;
  syncHome(s);
  const away = ym(s) - (P.마지막 ?? ym(s));
  const kidCost = P.자녀.reduce((a, c) => a + childCost(s, c) + EDU[f.교육], 0);
  // 저장된 직업은 고백할 때 표현이다. 해가 바뀌면 그때 표현으로 다시 읽는다.
  return { 배우자: P.이름, 직업: P.직업표 ? jobAt(P.직업표, s.year) : P.직업 ?? '', 사이문구: P.사이 >= 70 ? '저녁을 같이 먹는 날이 많습니다.' : P.사이 >= 30 ? '요즘 대화가 짧습니다.' : '말을 안 한 지 오래됐습니다.',
    자녀: P.자녀.map((c) => ({ 이름: c.이름, 나이: Math.floor(childMonths(s, c) / 12), 이름정함: !!c.이름정함 })), 가족칸: familySlots(s),
    칸안내: familySlots(s) ? '아이가 어려서 달마다 가족 칸이 먼저 빠집니다.' : '달에 한 번은 가족과 시간을 보내야 멀어지지 않습니다.', 멀어지는중: away > 2,
    월양육비: kidCost, 교육: f.교육, 배우자수입: spouseIncome(s), 집: f.home, 이혼가능: canDivorce(s).ok };
}
// 가족과 시간을 보낸다(활동 칸 1). 사이를 지킨다.
export function familyTime(s) {
  init(s);
  const P = spouse(s);
  if (!P) return { ok: false, why: '가족이 없습니다.' };
  if (s.used >= s.capacity) return { ok: false, why: '이번 달 활동 칸을 다 썼습니다.' };
  s.used += 1;
  P.사이 = Math.min(100, P.사이 + 12);
  P.마지막 = ym(s);
  s.stress = Math.max(0, s.stress - 2);
  raise(s, '매력', 0.3);
  const t = P.자녀.length ? `${P.이름}, 아이들과 저녁을 먹었습니다.` : `${P.이름}과(와) 저녁을 먹었습니다.`;
  say(s, t);
  return { ok: true, text: t };
}

// ---------- 집과 돈 ----------
const INCOME = { 빠듯: 1500000, 보통: 2000000, 안정: 2500000, 유복: 4000000, 최상: 7000000 }; // 가계에 들어오는 몫. 집안 돈은 포함하지 않는다.
export const spouseIncome = (s) => { const P = spouse(s); return P ? INCOME[P.형편] ?? 2000000 : 0; };
export const rentOf = (year) => Math.round(1000000 * 1.03 ** Math.max(0, year - 2010));
export function homeOptions(s) {
  init(s);
  return [{ kind: '월세', label: '월세', monthly: rentOf(s.year), ok: true }, { kind: '매매', label: '집 사기', ok: true, note: '투자 메뉴의 부동산에서 고릅니다.' }];
}
export function chooseHome(s, kind) {
  const f = init(s);
  if (kind === '월세') { f.home = { kind, since: s.year }; say(s, '월세 집을 구했습니다.'); return { ok: true, monthly: rentOf(s.year), text: '월세 집을 구했습니다.' }; }
  // 매매는 실제로 집을 사서 들어간 뒤에 기록한다(syncHome). 여기서는 집을 보러 간다는 표시만 남긴다.
  if (kind === '매매') { f.homeWish = true; return { ok: true, openInvest: '부동산', text: '투자 메뉴에서 집을 고릅니다. 내가 살기로 사면 그 집이 우리 집이 됩니다.' }; }
  return { ok: false, why: '없는 선택입니다.' };
}
// 투자에서 산 집 중 내가 사는 집이 있으면 '매매'로 적고, 그 집을 팔면 다시 비운다.
export function syncHome(s) {
  const f = init(s); if (!invest.isLoaded()) return f.home;
  const p = invest.init(s), mine = Object.keys(p.living ?? {}).find((id) => p.pos[id]);
  if (mine) {
    if (f.home?.kind !== '매매' || f.home.id !== mine) f.home = { kind: '매매', since: s.year, id: mine };
    f.homeWish = false;
  } else if (f.home?.kind === '매매') { f.home = null; }
  return f.home;
}
// ---------- 사는 곳 ----------
// 성인이 되면 스스로 정한다. 부모님 집, 월세, 내가 산 집 중 하나다. 살지 않는 집은 월세를 받는다.
const LUX_HOMES = new Set(['re04', 're07', 're12', 're25', 're32', 're39', 're45', 're46', 're47', 're49', 're50']);
export const homeTypeOf = (id) => (id === 'W01' ? 'us' : /^W\d/.test(id) ? 'world' : LUX_HOMES.has(id) ? 'lux' : 'apt');
const TYPE_LABEL = { lux: '고급 아파트', apt: '일반 아파트', us: '미국 랜드마크', world: '해외 랜드마크' };
export const canChooseResidence = (s) => s.year * 100 + s.month >= invest.ADULT_YM;
const parentsName = (s) => (s.parentsHome ? `부모님 집(${s.parentsHome.name})` : '부모님 집');
export function residenceOf(s) {
  const home = syncHome(s);
  if (home?.kind === '월세') return { key: 'rent', name: '월세 집', monthly: rentOf(s.year) };
  if (home?.kind === '매매') return { key: home.id, name: invest.nameOfAt(home.id, s) ?? '내 집', type: homeTypeOf(home.id) };
  return { key: 'parents', name: parentsName(s) };
}
export function residenceOptions(s) {
  const cur = residenceOf(s).key, married = !!spouse(s);
  const own = invest.isLoaded() ? invest.portfolio(s).holdings.filter((x) => x.cat === '부동산' || x.cat === '해외부동산') : [];
  return [
    { key: 'parents', label: parentsName(s), note: married ? '결혼한 뒤에는 돌아갈 수 없습니다.' : '생활비가 들지 않습니다.', ok: !married },
    { key: 'rent', label: '월세 집', note: `매달 ${krNum(rentOf(s.year))}원`, ok: true },
    ...own.map((x) => ({ key: x.id, label: x.name, note: `${TYPE_LABEL[homeTypeOf(x.id)]} · 내가 산 집`, ok: true })),
  ].map((o) => ({ ...o, current: o.key === cur }));
}
export function moveResidence(s, key) {
  if (!canChooseResidence(s)) return { ok: false, why: '성인이 되면 정할 수 있습니다.' };
  const o = residenceOptions(s).find((x) => x.key === key); if (!o) return { ok: false, why: '없는 집입니다.' };
  if (!o.ok) return { ok: false, why: o.note }; if (o.current) return { ok: true, text: '이미 그 집에 삽니다.' };
  const f = init(s), p = invest.init(s);
  if (key === 'parents' || key === 'rent') {
    p.living = {}; f.home = key === 'rent' ? { kind: '월세', since: s.year } : null;
  } else { const r = invest.setResidence(s, key, true); if (!r.ok) return r; f.home = { kind: '매매', since: s.year, id: key }; f.homeWish = false; }
  const text = key === 'parents' ? '부모님 집으로 돌아왔습니다.' : `${o.label}(으)로 이사했습니다.`; say(s, text);
  return { ok: true, text };
}
function netWorth(s) {
  try { return invest.isLoaded() ? invest.netWorth(s) : s.cash; } catch { return s.cash; }
}
export function canDivorce(s) {
  const P = spouse(s);
  if (!P) return { ok: false, why: '결혼한 상태가 아닙니다.' };
  if ((P.나쁜달 ?? 0) < 6) return { ok: false, why: '아직 서로 더 이야기해 볼 시간이 있습니다.' };
  return { ok: true };
}
// 재산 일부(순자산의 30%, 현금 한도)가 나뉜다. 1년 뒤 만남 메뉴가 다시 열린다.
export function divorce(s, netWorthValue) {
  const f = init(s);
  const c = canDivorce(s);
  if (!c.ok) return c;
  const P = s.partner;
  const base = Math.max(0, netWorthValue ?? s.cash);
  const pay = Math.min(Math.floor(base * 0.3), Math.max(0, s.cash));
  s.cash -= pay;
  f.이전자녀.push(...P.자녀);
  s.love.ex.push(P.id);
  s.love.reopenAt = ym(s) + 12;
  s.partner = null;
  afterParting(s, P.id, P.자녀?.length ? '이혼_자녀' : '이혼');
  f.home = null;
  s.flags.이혼 = true;
  s.flags.결혼 = false;
  s.stress = Math.min(100, s.stress + 15);
  const t = `${P.이름}과(와) 이혼했습니다. 재산 일부를 나눴습니다.`;
  say(s, t);
  return { ok: true, paid: pay, text: t };
}

// ---------- 부모님 ----------
export const PARENT_SCENES = [
  { id: '부모_가게', skipIf: '부모_찻집', from: 2013, to: 2016, title: '부모님 가게', text: '부모님 가게 간판 불이 절반만 들어옵니다. 어머니는 괜찮다고 합니다. 장부는 괜찮지 않습니다.', acts: ['가게고치기', '가게지키기'], skip: '이번에는 그냥 나왔습니다.' },
  { id: '부모_검진', from: 2017, to: 2022, title: '건강 검진', text: '아버지가 요즘 계단에서 자주 쉽니다. 검진은 내년에 받겠다고 합니다.', tea: '찻집을 하신 뒤로 아버지 얼굴빛이 좋아졌습니다. 그래도 나이가 있으니 검진은 한번 받아 보자고 했습니다.', acts: ['건강검진'], skip: '내년에 가자는 말에 고개를 끄덕였습니다.' },
  { id: '부모_코로나', skipIf: '부모_찻집', from: 2020, to: 2020, month: 3, title: '손님이 끊겼습니다', text: '점심시간인데 가게에 손님이 없습니다. 어머니가 의자를 닦고 또 닦습니다.', acts: ['가게지키기'], skip: '안부만 묻고 전화를 끊었습니다.', mute: 2 },
  { id: '부모_칠순', from: 2018, to: 2024, title: '칠순', text: '아버지 칠순이 다가옵니다. 아버지는 밥이나 먹자고 합니다.', acts: ['칠순잔치', '효도여행'], skip: '가족끼리 밥을 먹었습니다.', mute: 2 },
  { id: '부모_2026', from: 2026, to: 2026, title: '올해 설날', text: '부모님이 같은 자리에 앉아 있습니다. 첫 생의 2026년과 다른 식탁입니다.', tea: '어머니가 찻집에서 가져온 차를 따릅니다. 첫 생의 2026년에는 없던 찻잔입니다.', acts: [], skip: '밥을 두 그릇 먹었습니다.', mute: 3 },
];
export const PARENT_ACTS = {
  가게고치기: { cost: 30000000, from: 2013, to: 2016, flag: '첫가게지킴', bond: 8, label: '가게를 고쳐 드린다', text: '간판과 주방을 고쳐 드렸습니다. 어머니가 영수증을 오래 들여다봤습니다.' },
  가게지키기: { cost: 10000000, from: 2013, to: 2021, flag: '첫가게지킴', bond: 6, label: '월세와 외상을 막아 드린다', text: '가게 월세와 거래처 외상을 대신 막았습니다.' },
  건강검진: { cost: 1000000, from: 2015, to: 2026, flag: '부모_건강챙김', bond: 5, label: '정밀 검진을 모시고 간다', text: '부모님을 모시고 정밀 검진을 받았습니다. 일찍 찾아서 다행이라고 의사가 말했습니다.' },
  효도여행: { cost: 3000000, from: 2010, to: 2026, flag: '부모_효도여행', bond: 6, label: '효도 여행을 보내 드린다', text: '부모님과 3박 4일 여행을 다녀왔습니다.' },
  칠순잔치: { cost: 5000000, from: 2018, to: 2024, flag: '부모_칠순잔치', bond: 7, label: '칠순 잔치를 연다', text: '칠순 잔치를 열었습니다. 동네 어른들이 다 왔습니다.' },
};
function parentCheck(s, key) {
  const A = PARENT_ACTS[key];
  if (!A) return { ok: false, why: '없는 선택입니다.' };
  if (s.flags[`효도:${key}`]) return { ok: false, why: '이미 했습니다.' };
  if (s.year < A.from || s.year > A.to) return { ok: false, why: `${A.from}~${A.to}년에 할 수 있습니다.` };
  if (s.cash < A.cost) return { ok: false, why: '돈이 모자랍니다.', need: { cash: A.cost, now: s.cash } };
  return { ok: true, cost: A.cost };
}
export function parentAct(s, key) {
  init(s);
  const c = parentCheck(s, key);
  if (!c.ok) return c;
  const A = PARENT_ACTS[key];
  s.cash -= A.cost;
  s.flags[A.flag] = true;
  s.flags[`효도:${key}`] = true;
  addParent(s, A.bond * 2);
  say(s, A.text);
  return { ok: true, text: A.text };
}
// 지금 고를 수 있는 효도 목록(메뉴용). 잠긴 것도 이유와 함께 준다.
export function parentOptions(s) {
  init(s);
  return Object.entries(PARENT_ACTS).map(([key, A]) => ({ key, label: A.label, cost: A.cost, ...parentCheck(s, key) }));
}
// 안부 들르기: 활동 칸 1, 작은 돈. 해마다 세 번까지 사이가 오른다.
export function parentVisit(s) {
  const f = init(s);
  if (stageOf(s) !== '대학' && stageOf(s) !== '사회인') return { ok: false, why: '집에서 같이 삽니다.' };
  if (s.used >= s.capacity) return { ok: false, why: '이번 달 활동 칸을 다 썼습니다.' };
  if (s.cash < 50000) return { ok: false, why: '돈이 모자랍니다.', need: { cash: 50000, now: s.cash } };
  s.used += 1; s.cash -= 50000;
  if (f.방문연 !== s.year) { f.방문연 = s.year; f.방문수 = 0; }
  f.방문수 += 1;
  if (f.방문수 <= 3) addParent(s, 2);
  s.stress = Math.max(0, s.stress - 3);
  raise(s, '인맥', 0.3);
  const t = '부모님 댁에 들러 저녁을 먹었습니다. 반찬통을 싸 주셨습니다.';
  say(s, t);
  return { ok: true, text: t };
}

// ---------- 회귀 장면 ----------
const REGRESS = [
  { id: '회귀:스무살', from: 200803, title: '다시 스무 살', text: '2008년 봄입니다. 첫 생의 나는 이 봄에 아무것도 몰랐습니다. 지금의 나는 올가을 뉴스를 압니다. 그 말을 할 사람이 없습니다.', label: '혼자 걷습니다.' },
  { id: '회귀:가게앞', from: 201306, title: '가게 앞에서', text: '부모님 가게 앞에 섰습니다. 이 간판이 언제 내려갔는지 기억납니다. 그때 나는 전화도 안 받았습니다.', tea: '찻집 앞에 섰습니다. 첫 생에는 이맘때 부모님 가게 간판이 내려갔습니다. 지금은 창가에서 어머니가 화분에 물을 줍니다.', label: '문을 열고 들어갑니다.' },
  { id: '회귀:2020', from: 202001, title: '기억하는 겨울', text: '신문 구석에 낯선 폐렴 기사가 작게 실렸습니다. 다들 그냥 넘깁니다. 기억이 맞다면 곧 많은 것이 멈춥니다.', label: '부모님께 전화합니다.' },
  { id: '회귀:말할뻔', from: 202403, title: '말할 뻔한 밤', text: '늦은 밤 술잔을 앞에 두고 "내가 사실은" 하고 입을 열었습니다. 상대가 쳐다봅니다. 뒷말이 나오지 않았습니다.', label: '아무것도 아니라고 합니다.' },
  { id: '회귀:기억끝', from: 202601, title: '기억의 끝', text: '2026년입니다. 내 기억은 여기까지입니다. 앞으로의 뉴스는 나도 처음 봅니다.', label: '달력을 넘깁니다.' },
];

// ---------- 장면 목록 ----------
const childSceneDefs = [
  { key: '돌잔치', due: (m) => m >= 12, text: (n) => `${n}의 돌입니다. 상 위에 실과 연필, 돈을 놓았습니다.`, choices: [{ label: '가족끼리 조촐하게', cost: 1000000, gap: 4 }, { label: '친척을 다 모아서', cost: 10000000, gap: 6 }] },
  { key: '재롱잔치', due: (m, s) => m >= 60 && s.month === 12, text: (n) => `${n}의 유치원 재롱 잔치 날입니다. 맨 앞줄 자리를 맡아 두라고 합니다.`, choices: [{ label: '일을 미루고 간다', gap: 8 }, { label: '일이 있어 못 간다', gap: -6 }] },
  { key: '입학식', due: (m, s) => m >= 72 && s.month === 3, text: (n) => `${n}의 초등학교 입학식입니다. 가방이 몸보다 큽니다.`, choices: [{ label: '손을 잡고 교문까지 간다', gap: 8 }, { label: '사진으로 받아 본다', gap: -6 }] },
];
export function pendingScenes(s) {
  const f = init(s);
  const out = [];
  const stamp = s.year * 100 + s.month;
  const tea = !!s.flags.부모_찻집; // 부모님이 찻집을 하시면 가게 이야기가 찻집 글로 바뀐다
  for (const r of REGRESS) if (stamp >= r.from && !s.flags[r.id] && !s.ended) out.push({ id: r.id, title: r.title, text: tea && r.tea ? r.tea : r.text, kind: '회귀', choices: [{ label: r.label, ok: true }] });
  for (const sc of PARENT_SCENES) {
    if (seen(s, sc.id) || s.year < sc.from || s.year > sc.to || (sc.month && s.month < sc.month) || (sc.skipIf && s.flags[sc.skipIf])) continue;
    if (stageOf(s) !== '사회인' && stageOf(s) !== '대학') continue;
    out.push({ id: sc.id, title: sc.title, text: tea && sc.tea ? sc.tea : sc.text, who: '부모님', kind: '부모', choices: [...sc.acts.map((k) => ({ label: PARENT_ACTS[k].label, cost: PARENT_ACTS[k].cost, ...parentCheck(s, k) })), { label: sc.skip ? '이번에는 넘어간다' : '넘어간다', ok: true }] });
  }
  if (s.flags.부모_병원 && !seen(s, '부모_병원')) {
    out.push({ id: '부모_병원', title: '병원', text: '늦게 찾았습니다. 수술은 잘 됐지만 병원비가 크고 어머니가 많이 야위었습니다. 첫 생과 같은 복도입니다.', who: '부모님', kind: '부모', choices: [{ label: '병원비를 맡는다', cost: 20000000, ok: s.cash >= 20000000, why: s.cash >= 20000000 ? undefined : '돈이 모자랍니다.' }, { label: '형편껏 보탠다', cost: 3000000, ok: s.cash >= 3000000, why: s.cash >= 3000000 ? undefined : '돈이 모자랍니다.' }, { label: '병실을 지킨다', ok: true }] });
  }
  const P = spouse(s);
  if (P) {
    if (!f.home && !seen(s, '집_고르기')) out.push({ id: '집_고르기', title: '어디서 살까', text: `${P.이름}과(와) 집을 보러 다녔습니다. 어디서 살지 정해야 합니다.`, who: P.id, kind: '가정', choices: [{ label: `월세 (매달 ${Math.round(rentOf(s.year) / 10000)}만 원)`, ok: true }, { label: '집을 산다 (투자 메뉴)', ok: true }] });
    if (f.돈장면 === 'due') out.push({ id: '돈_부부', title: '통장', text: `${P.이름}이(가) 통장을 보고 물었습니다. 언제 이렇게 줄었느냐고 합니다.`, who: P.id, kind: '가정', choices: [{ label: '다 털어놓는다', ok: true }, { label: '걱정 말라고만 한다', ok: true }] });
    P.자녀.forEach((c, i) => {
      if (!c.이름정함 && !c.장면.includes('이름완료')) out.push({ id: `자녀:${i}:이름짓기`, title: '이름 짓기', text: '아이 이름을 정해야 합니다. 부모님이 작명소 이야기를 꺼냅니다.', who: P.id, kind: '자녀', needName: i, choices: [{ label: '이대로 부른다', ok: true }] });
      for (const d of childSceneDefs) {
        if (c.장면.includes(d.key) || !d.due(childMonths(s, c), s)) continue;
        out.push({ id: `자녀:${i}:${d.key}`, title: d.key, text: d.text(c.이름), who: P.id, kind: '자녀', choices: d.choices.map((x) => {
          const lack = x.cost && s.cash < x.cost ? '돈이 모자랍니다.' : null;
          return { label: x.label, cost: x.cost, ok: !lack, why: lack ?? undefined };
        }) });
      }
    });
  }
  return out;
}
export function chooseScene(s, id, i = 0) {
  const f = init(s);
  const scene = pendingScenes(s).find((x) => x.id === id);
  if (!scene) return { ok: false, why: '지금 볼 수 있는 장면이 아닙니다.' };
  const ch = scene.choices[i];
  if (!ch) return { ok: false, why: '없는 선택입니다.' };
  if (ch.ok === false) return { ok: false, why: ch.why ?? '고를 수 없습니다.' };
  if (scene.kind === '회귀') { s.flags[id] = true; return { ok: true, text: '' }; }
  if (scene.kind === '부모') {
    if (id === '부모_병원') {
      if (ch.cost) { s.cash -= ch.cost; addParent(s, ch.cost >= 20000000 ? 10 : 4); }
      s.stress = Math.min(100, s.stress + 10);
      done(s, id);
      return { ok: true, text: '퇴원하는 날 아버지가 먼저 신발을 신었습니다.' };
    }
    const sc = PARENT_SCENES.find((x) => x.id === id);
    if (i < sc.acts.length) { const r = parentAct(s, sc.acts[i]); if (!r.ok) return r; done(s, id); return r; }
    done(s, id);
    if (sc.mute) addParent(s, sc.mute);
    say(s, sc.skip);
    return { ok: true, text: sc.skip };
  }
  if (id === '집_고르기') { done(s, id); return chooseHome(s, i === 0 ? '월세' : '매매'); }
  if (id === '돈_부부') {
    const P = s.partner; f.돈장면 = ym(s);
    if (i === 0) { P.사이 = Math.max(0, P.사이 - 3); s.stress = Math.max(0, s.stress - 5); return { ok: true, text: '화를 낸 뒤 같이 계산기를 두드렸습니다.' }; }
    P.사이 = Math.max(0, P.사이 - 12); return { ok: true, text: `${P.이름}은(는) 더 묻지 않았습니다. 그날부터 말수가 줄었습니다.` };
  }
  if (scene.kind === '자녀') {
    const [, idx, key] = id.split(':'); const P = s.partner; const c = P.자녀[+idx];
    if (key === '이름짓기') { c.장면.push('이름완료'); c.이름정함 = true; return { ok: true, text: `${c.이름}이라고 부르기로 했습니다.` }; }
    const d = childSceneDefs.find((x) => x.key === key).choices[i];
    if (d.cost) s.cash -= d.cost;
    P.사이 = clamp(P.사이 + (d.gap ?? 0), 0, 100);
    c.장면.push(key); s.flags[`자녀_${key}`] = true;
    return { ok: true, text: d.gap > 0 ? '사진을 많이 찍었습니다.' : '저녁에 사진을 봤습니다.' };
  }
  return { ok: false, why: '처리할 수 없는 장면입니다.' };
}

// 첫 집 기록(엔딩 숫자 카드). 부동산을 처음 가진 달에 남긴다.
function recordFirstHouse(s) {
  if (s.records?.firstHouse) return;
  try {
    if (!invest.isLoaded()) return;
    const h = (invest.portfolio(s).holdings ?? []).find((x) => x.cat === '부동산');
    if (h) setRecord(s, 'firstHouse', `${h.name} (${s.year}년)`);
  } catch { /* 시세 자료가 없으면 건너뛴다 */ }
}

// ---------- 달 넘김 ----------
export function onMonth(s) {
  const f = init(s);
  for (const sc of PARENT_SCENES) if (s.year >= sc.from && s.year <= sc.to && !s.flags[sc.id]) s.flags[sc.id] = true;
  // 건강을 미리 챙기지 않았으면 2023년에 병원 장면. 건강 플렉스 플래그도 챙긴 것으로 친다.
  if (s.year === 2023 && !s.flags.부모_건강챙김 && !s.flags['플렉스:건강'] && !(s.flexCount?.건강 > 0) && !s.flags.부모_병원) s.flags.부모_병원 = true;
  recordFirstHouse(s);
  const now = ym(s);
  const P = spouse(s);
  for (const c of f.이전자녀) s.cash -= Math.round(childCost(s, c) / 2);
  syncHome(s);
  if (f.home?.kind === '월세') s.cash -= rentOf(s.year); // 혼자 살아도 낸다
  if (P) {
    const away = now - (P.마지막 ?? now);
    P.사이 = Math.max(0, P.사이 + (away > 2 ? -4 : 1));
    P.나쁜달 = P.사이 < 30 ? (P.나쁜달 ?? 0) + 1 : 0;
    if (s.cash < 0 && P.사이 > 0) P.사이 = Math.max(0, P.사이 - 2);
    s.cash += spouseIncome(s);
    for (const c of P.자녀) s.cash -= childCost(s, c) + EDU[f.교육];
    s.used = Math.min(s.capacity, s.used + familySlots(s));
    // 큰 손실이면 부부 장면
    const nw = netWorth(s);
    f.nwPeak = Math.max(f.nwPeak ?? nw, nw);
    if (f.돈장면 !== 'due' && (f.돈장면 == null || now - f.돈장면 >= 24) && f.nwPeak > 1e8 && nw < f.nwPeak * 0.6) { f.돈장면 = 'due'; f.nwPeak = nw; }
  }
  return s;
}
