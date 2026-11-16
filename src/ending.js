// 엔딩. 순수 함수. 근거: design/17_엔딩.md. 점수·순위는 두지 않는다.
import { krNum } from './num.js';
import { tierOf } from './rules.js';

export const WEALTH = [
  { key: '평범', label: '평범', from: -Infinity },
  { key: '여유', label: '여유', from: 1e9 },
  { key: '큰부자', label: '큰 부자', from: 1e10 },
  { key: '재벌급', label: '재벌급', from: 1e11 },
  { key: '세계적부호', label: '세계적 부호', from: 1e12 },
];
export function wealthTier(net) {
  let i = 0;
  WEALTH.forEach((w, k) => { if (net >= w.from) i = k; });
  return { index: i + 1, ...WEALTH[i] };
}

export const MAIN_ENDINGS = [
  { no: 1, id: 'empty', name: '빈손', text: '다 잃었습니다. 부모님 집 밥상에서 다시 시작합니다.' },
  { no: 2, id: 'burnout', name: '번아웃', text: '돈은 남았는데 병실에 혼자 누워 있습니다.' },
  { no: 3, id: 'world', name: '세계의 이름', text: '큰 무대에 섰습니다. 그래도 첫 가게 앞은 일부러 지나갑니다.' },
  { no: 4, id: 'chairman', name: '그룹 회장', text: '회장실입니다. 동창이 직원으로 인사합니다.' },
  { no: 5, id: 'dynasty', name: '재벌가의 사람', text: '만찬장의 긴 식탁 끝에 앉아 있습니다.' },
  { no: 6, id: 'exit', name: '성공한 매각', text: '회사를 넘기고 다음 일을 천천히 고민합니다.' },
  { no: 7, id: 'hidden-rich', name: '숨은 부자', text: '아무도 모르는 부자입니다. 동네는 평범합니다.' },
  { no: 8, id: 'family', name: '다복한 집', text: '명절 거실이 시끄럽습니다.' },
  { no: 9, id: 'my-way', name: '나의 방식대로', text: '자유로운 일상과 오랜 친구들이 곁에 있습니다.' },
  { no: 10, id: 'first-love', name: '첫사랑', text: '교문 앞에서 찍은 사진이 책상에 있습니다.' },
  { no: 11, id: 'star', name: '스타의 곁', text: '시상식 객석에서 박수를 칩니다.' },
  { no: 12, id: 'calm', name: '평범한 행복', text: '저녁 산책을 합니다.' },
  { no: 13, id: 'regret', name: '또 후회', text: '"다시 돌아가면" 하고 중얼거립니다.' },
];
export const HIDDEN_ENDINGS = [
  { id: 'confession', name: '고백', text: '회귀했다는 사실을 털어놓습니다.' },
  { id: 'to-2000', name: '2000년의 나에게', text: '2000년 첫 장면과 같은 구도로 끝납니다.' },
  { id: 'nobody-fell', name: '아무도 망하지 않은 길', text: '동창 모임에 빈자리가 없습니다.' },
  { id: 'perfect', name: '완벽한 두 번째 인생', text: '네 가지 능력이 모두 보통 사람의 한계를 넘었습니다. 2000년의 나는 상상도 못 한 사람이 되었습니다.' },
  { id: 'island-heir', name: '섬의 후계자', text: '섬의 진 노인이 남긴 것을 조용히, 오래 지킵니다.' },
  { id: 'island-friend', name: '바둑 친구', text: '낡은 바둑판 하나가 남았습니다. 섬의 진 노인과 오래 바둑을 두었습니다.' },
];
// 7구간 칭호(사용자 지시 2026-11-09)
export const TITLES = { 지능: '전설의 두뇌', 체력: '철인', 매력: '시대의 얼굴', 인맥: '모두가 아는 이름' };
export const titlesOf = (s) => Object.entries(TITLES).filter(([k]) => tierOf(s.stats[k]) >= 7).map(([, v]) => v);
export const BEST = 90; // '사이 최고'
export const GOOD = 70; // '좋은 사이'(가족)
export const BOND_FRIEND = 25; // 사람 축에 세는 친구. 이벤트 합이 대개 20~34에 머무는 규모에 맞춤
export const BOND_CARD = 15; // 동창 에필로그에 나오는 사이
export const HELP_MIN = 5; // 아무도 망하지 않은 길: 도운 동창 수
export const BIG_SALE = 1e10; // 큰돈 매각 기준(100억)
export const BURNOUT_STRESS = 90; // 스트레스 최고 구간

// 회귀 장면 플래그. family.js 장면이 세우고, 전부 모이면 syncFlags가 회귀장면_모두를 세운다.
export const REGRESSION_SCENES = ['회귀:스무살', '회귀:가게앞', '회귀:2020', '회귀:말할뻔', '회귀:기억끝'];
// 첫 생에 무너진 동창. 이벤트나 network.helpFriend가 '도움:id'를 세운다. 옛 플래그 이름도 같이 센다.
export const HELP_ALIAS = { '조언:정민혁': 'c01', '조언:노현우': 'c14', '원고:한유진': 'c02', '소개:오세라': 'c40' };

const isReal = (id) => /^[ps]\d{3}$/.test(String(id ?? '')); // 실존 인물 id는 카드에 쓰지 않는다

// ---------- 이름표 ----------
const NAMES = new Map();
export function registerNames(list) { for (const p of list ?? []) if (p?.id && p.이름) NAMES.set(p.id, p.이름); }

// ---------- 플래그 세우기 ----------
export function markHelp(s, id) { s.flags ??= {}; s.flags[`도움:${id}`] = true; return helpCount(s); }
export function helpCount(s) {
  const f = s.flags ?? {};
  const ids = new Set(Object.keys(f).filter((k) => k.startsWith('도움:') && f[k]).map((k) => k.slice(3)));
  for (const [flag, id] of Object.entries(HELP_ALIAS)) if (f[flag]) ids.add(id);
  return ids.size;
}
export function markEarly(s, who) {
  s.flags ??= {};
  if (!Array.isArray(s.flags.일찍알아봄)) s.flags.일찍알아봄 = [];
  if (isReal(who.id) || s.flags.일찍알아봄.some((x) => x.id === who.id)) return false;
  s.flags.일찍알아봄.push({ id: who.id, 이름: who.이름 });
  return true;
}
export function setRecord(s, key, value) { s.records ??= {}; if (s.records[key] == null) s.records[key] = value; return s.records[key]; }
// 투자 손익을 기록한다. invest.sell 결과의 gain을 넘긴다.
export function recordTrade(s, gain, name) {
  if (!Number.isFinite(gain)) return;
  s.records ??= {};
  if (gain > 0 && gain > (s.records.bestGain ?? 0)) { s.records.bestGain = gain; s.records.bestTrade = `${name} ${krNum(gain)}원 이익`; }
  if (gain < 0 && gain < (s.records.worstGain ?? 0)) { s.records.worstGain = gain; s.records.worstTrade = `${name} ${krNum(-gain)}원 손실`; }
}
export function syncFlags(s) {
  s.flags ??= {};
  if (REGRESSION_SCENES.every((k) => s.flags[k])) s.flags.회귀장면_모두 = true;
  s.flags.동창도움수 = Math.max(s.flags.동창도움수 ?? 0, helpCount(s));
  return s.flags;
}

function companyDebt(s) {
  let d = s.companyMeta?.guarantee ?? 0;
  for (const c of [s.company, s.company2]) for (const l of c?.loans ?? []) d += l.principal ?? 0;
  return d;
}
function portfolioDebt(s) {
  const p = s.portfolio ?? {};
  return Object.values(p.loans ?? {}).reduce((a, l) => a + (l.principal ?? 0) + (l.unpaid ?? 0), 0) + (p.taxDue ?? 0);
}

function normCompany(s, ci) {
  const meta = s.companyMeta?.sold ?? null;
  const c = ci ?? s.company ?? null;
  if (!c) {
    if (meta) return { has: false, stage: meta.stage ?? 0, listed: !!meta.listed, sold: true, soldBig: (meta.amount ?? 0) >= BIG_SALE, second: false, rep: null, staff: meta.staff ?? [], debt: null, buyer: meta.buyer };
    return { has: false, stage: 0, listed: false, sold: false, soldBig: false, second: false, rep: null, staff: [], debt: null };
  }
  const sold = !!(c.sold ?? c.매각);
  const amount = c.soldAmount ?? c.매각금액 ?? (typeof c.매각 === 'number' ? c.매각 : null);
  const stage = c.stage ?? c.단계 ?? 0;
  return {
    has: stage > 0 && !sold,
    stage: sold ? c.stage ?? c.단계 ?? 0 : stage,
    listed: !!(c.listed ?? c.상장),
    sold,
    soldBig: sold && (c.bigSale === true || c.큰매각 === true || (amount != null && amount >= BIG_SALE)),
    second: !!(c.second ?? c.두번째회사 ?? ((c.companies ?? 0) >= 2)) || (!ci && !!s.company2),
    rep: c.reputation ?? c.평판 ?? (c.rep != null ? (c.rep < 35 ? '나쁨' : c.rep < 65 ? '보통' : '좋음') : null),
    staff: c.staff ?? c.employees ?? c.직원 ?? [],
    debt: c.debt ?? null,
  };
}
const debtOf = (s, ci, co) => Math.max(0, (co.debt ?? ci?.debt ?? s.debt ?? s.loan ?? 0) + (s.cash < 0 ? -s.cash : 0) + companyDebt(s) + portfolioDebt(s));
const stageNow = (co) => (co.sold ? 0 : co.stage);

function spouseOf(s) { const P = s.partner; return P?.married ? P : null; }
const kidCount = (s) => (spouseOf(s)?.자녀?.length ?? 0) + (s.family?.이전자녀?.length ?? 0);
function bestFriend(s) {
  const skip = new Set(['부모님', '미영', s.partner?.id]);
  let best = null;
  for (const [id, v] of Object.entries(s.bonds ?? {})) if (!skip.has(id) && (best == null || v > best.v)) best = { id, v };
  return best;
}
function peopleLevel(s, co) {
  const friends = Object.entries(s.bonds ?? {}).filter(([id, v]) => id !== '부모님' && id !== '미영' && id !== s.partner?.id && !isReal(id) && v >= BOND_FRIEND).length;
  let lv = tierOf(s.stats.인맥);
  if (friends >= 3) lv += 1;
  if (co.staff.length >= 3) lv += 1;
  return { level: Math.min(5, lv), friends };
}

// 결산 5축
export function settle(s, netWorthValue, companyInfo) {
  const co = normCompany(s, companyInfo);
  const wt = wealthTier(netWorthValue);
  const sp = spouseOf(s);
  const kids = kidCount(s);
  const par = s.bonds?.부모님 ?? 50;
  const pl = peopleLevel(s, co);
  const hp = tierOf(s.stats.체력);
  const company = co.sold ? (co.soldBig ? '회사를 큰돈에 넘겼습니다.' : '회사를 넘겼습니다.')
    : co.stage >= 5 ? '회사는 5단계에 닿았습니다.' : co.stage > 0 ? `회사는 ${co.stage}단계입니다.${co.listed ? ' 상장했습니다.' : ''}${co.rep ? ` 평판은 ${co.rep}입니다.` : ''}` : '회사는 없습니다.';
  return {
    부: { value: netWorthValue, tier: wt.label, index: wt.index },
    회사: { stage: stageNow(co), text: company },
    가족: {
      married: !!sp, children: kids, parents: par,
      text: `${sp ? '결혼했습니다.' : '혼자입니다.'} ${kids ? `아이가 ${kids}명 있습니다.` : '아이는 없습니다.'} 부모님과는 ${par >= GOOD ? '가깝습니다.' : par >= 40 ? '그저 그렇습니다.' : '멀어졌습니다.'}`,
    },
    사람: { level: pl.level, friends: pl.friends, text: pl.level >= 4 ? '곁에 사람이 많습니다.' : pl.level >= 3 ? '믿는 사람이 몇 있습니다.' : '곁이 조용합니다.' },
    나: {
      지능: tierOf(s.stats.지능), 체력: hp, 매력: tierOf(s.stats.매력), 인맥: tierOf(s.stats.인맥),
      칭호: titlesOf(s), 건강: hp, 스트레스: s.stress >= BURNOUT_STRESS ? 5 : Math.min(5, 1 + Math.floor(s.stress / 25)),
    },
  };
}

function mainOf(s, net, co, debt) {
  const sp = spouseOf(s);
  const kids = kidCount(s);
  const par = s.bonds?.부모님 ?? 50;
  const { level } = peopleLevel(s, co);
  const stage = stageNow(co);
  const cond = [
    net < 0,
    tierOf(s.stats.체력) === 1 && s.stress >= BURNOUT_STRESS,
    net >= 1e12 && stage === 5,
    stage === 5 || (stage === 4 && co.second),
    sp?.집안등급 === '재벌',
    co.soldBig,
    net >= 1e10 && !co.has,
    !!sp && kids > 0 && par >= GOOD,
    !sp && net >= 1e9 && level >= 4,
    !!sp && ['동창', '학교'].includes(sp.쓰임 ?? sp.from),
    !!sp && sp.쓰임 === '유명인',
    debt === 0,
    true,
  ];
  return MAIN_ENDINGS[cond.findIndex(Boolean)];
}

function hiddenOf(s) {
  const out = [];
  const sp = spouseOf(s);
  const bf = bestFriend(s);
  const spouseV = sp ? sp.사이 ?? 0 : 0;
  const bondV = Math.max(spouseV, bf?.v ?? 0);
  if (bondV >= BEST && s.flags?.회귀장면_모두) out.push({ ...HIDDEN_ENDINGS[0], believed: bondV >= 95, with: spouseV >= (bf?.v ?? 0) ? 'spouse' : 'friend' });
  if ((s.bonds?.부모님 ?? 0) >= BEST && s.flags?.첫가게지킴) out.push({ ...HIDDEN_ENDINGS[1] });
  if (Math.max(s.flags?.동창도움수 ?? 0, helpCount(s)) >= HELP_MIN) out.push({ ...HIDDEN_ENDINGS[2] });
  if (['지능', '체력', '매력', '인맥'].every((k) => tierOf(s.stats[k]) >= 6)) out.push({ ...HIDDEN_ENDINGS[3] });
  if (s.flags?.후계_승계) out.push({ ...HIDDEN_ENDINGS[4] }); else if (s.flags?.섬_작별) out.push({ ...HIDDEN_ENDINGS[5] }); // 섬의 노인(data/events_island.js)
  return out;
}

const nameFrom = (names, id) => names?.[id] ?? NAMES.get(id) ?? null;
function nameOf(x, names) { return typeof x === 'object' ? x.이름 ?? x.name ?? nameFrom(names, x.id) : nameFrom(names, x); }

function epilogue(s, net, co, opts) {
  const names = opts.names ?? s.names ?? {};
  const cards = [];
  const par = s.bonds?.부모님 ?? 50;
  cards.push({ kind: '가족', who: '부모님', text: par >= GOOD ? '부모님은 건강하게 2026년의 식탁에 앉아 있습니다.' : par >= 40 ? '부모님은 가끔 전화로 안부를 묻습니다.' : '부모님과는 연락이 드뭅니다.' });
  const sp = spouseOf(s);
  if (sp) {
    cards.push({ kind: '가족', who: sp.이름, text: (sp.사이 ?? 0) >= GOOD ? `${sp.이름}과(와) 저녁을 같이 먹는 날이 많습니다.` : `${sp.이름}과(와) 사이에 거리가 있습니다.` });
    for (const c of [...(sp.자녀 ?? []), ...(s.family?.이전자녀 ?? [])]) cards.push({ kind: '가족', who: c.이름, text: `${c.이름}은(는) ${Math.max(0, s.year - c.태어남.year)}살입니다.` });
  }
  const skip = new Set(['부모님', '미영', s.partner?.id]);
  const staffIds = new Set(co.staff.map((x) => (typeof x === 'object' ? x.id : x)));
  Object.entries(s.bonds ?? {})
    .filter(([id, v]) => !skip.has(id) && !staffIds.has(id) && !isReal(id) && !/^(v\d|g\d{3})/.test(id) && v >= BOND_CARD)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .forEach(([id]) => { const n = nameFrom(names, id); cards.push({ kind: '동창', id, who: n, text: `${n ?? '동창'}은(는) 아직 모임에 나옵니다.` }); });
  co.staff.filter((x) => !isReal(typeof x === 'object' ? x.id : x)).slice(0, 3)
    .forEach((x) => { const n = nameOf(x, names); cards.push({ kind: '직원', id: typeof x === 'object' ? x.id : x, who: n ?? null, text: `${n ?? '직원'}은(는) 회사를 함께 키웠습니다.` }); });
  const early = Array.isArray(s.flags?.일찍알아봄) ? s.flags.일찍알아봄 : s.early ?? [];
  for (const x of early.filter((y) => !isReal(typeof y === 'object' ? y.id : y)).slice(0, 3)) {
    const n = nameOf(x, names);
    cards.push({ kind: '일찍 알아본 사람', id: typeof x === 'object' ? x.id : x, who: n ?? null, text: `${n ?? '그 사람'}을(를) 무명일 때 알아봤습니다.` });
  }
  const r = s.records ?? {};
  for (const [k, label] of [['bestTrade', '가장 많이 번 거래'], ['worstTrade', '가장 크게 잃은 거래'], ['firstHouse', '첫 집'], ['firstHire', '첫 직원']]) if (r[k]) cards.push({ kind: '숫자', label, text: String(r[k]) });
  return cards;
}

// netWorthValue: 원 단위 순자산(빚 포함해 뺀 값). companyInfo: 생략하면 s.company, s.company2, s.companyMeta를 읽는다.
export function resolveEnding(s, netWorthValue, companyInfo, opts = {}) {
  syncFlags(s);
  const co = normCompany(s, companyInfo);
  const debt = debtOf(s, companyInfo, co);
  const main = mainOf(s, netWorthValue, co, debt);
  return {
    axes: settle(s, netWorthValue, companyInfo),
    wealth: wealthTier(netWorthValue),
    main,
    hidden: hiddenOf(s),
    epilogue: epilogue(s, netWorthValue, co, opts),
    again: '다시 2000년으로',
  };
}
