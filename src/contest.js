// 여름 모의투자 대회와 계좌 열기(설계 6.0). 순수 함수, 화면 코드 없음.
// 입상 -> 부모님 허락 -> 은행 방문으로 s.account가 열린다. 성인은 은행 방문만. 2008-03에 저절로 열리지 않는다.
// 진행: 후보 6종목 중 1~3개를 고른다. 수익률은 그해 7~8월의 실제 시세다. 회귀 기억(힌트)은 지능·인맥·준비로 늘어난다.
// 순위는 후보 안에서 고른 종목의 등수로 정한다. 하락장에도 잘 고르면 입상한다. 적게 고를수록 위험하고 크게 받는다.
import { stageOf, tierOf, gain, addStress, raise } from './rules.js';
import { addMoney, summerPool, accountWhy, ADULT_YM, fmtWon } from './invest.js';

export const ORGANIZER = '새날경제신문', TITLE = '새날 청소년 경제탐험대회';
export const FIRST_YEAR = 2000, LAST_YEAR = 2007, MAX_PREP = 3, MAX_PICK = 3, CANDIDATES = 6, BOND_NEED = 45, DEFAULT_BOND = 50;
export const DIVISIONS = {
  초등: { id: '어린이부', cut: { gold: 80, silver: 65, bronze: 50 }, team: '혼자 나간다. 담임 선생님이 신청서를 대신 내 준다.' },
  중학: { id: '중등부', cut: { gold: 85, silver: 70, bronze: 55 }, team: '같은 반 친구 둘, 담임 선생님과 한 팀으로 나간다.' },
  고등: { id: '고등부', cut: { gold: 90, silver: 75, bronze: 60 }, team: '고등학교 친구 둘, 담임 선생님과 한 팀으로 나간다.' },
};
export const RANKS = { gold: { name: '금상' }, silver: { name: '은상' }, bronze: { name: '동상' }, participation: { name: '참가' } };
const PRIZE = { 어린이부: { gold: 100000, silver: 70000, bronze: 50000 }, school: { gold: 200000, silver: 150000, bronze: 100000 } };
const ym = (s) => s.year * 100 + s.month;
const no = (why, need) => ({ ok: false, why, ...(need ? { need } : {}) });

export function init(s) {
  if (s.account === undefined) s.account = null;
  if (s.contest === undefined) s.contest = null;
  if (s.contestAwards === undefined) s.contestAwards = [];
  s.flags ??= {};
  // 옛 저장의 대회(전략 방식)를 후보 고르기 방식으로 옮긴다. 끝난 대회는 기록만 남긴다.
  const old = s.contest;
  if (old && !Array.isArray(old.cands)) { old.picks = []; old.cands = old.resolved ? [] : candidatesOf(s, old.year); }
  return s;
}
const entered = (s) => (s.contest?.year === s.year ? s.contest : null);
export const parentBond = (s) => Math.max(s.bonds?.부모님 ?? 0, 75);
export function divisionOf(s) {
  if (s.year < FIRST_YEAR || s.year > LAST_YEAR) return null;
  return DIVISIONS[stageOf(s)] ?? null;
}
const useSlot = (s, stress = 0) => {
  if (s.used >= s.capacity) return no('이번 달 활동 칸을 다 썼습니다.');
  s.used += 1;
  if (stress) addStress(s, stress);
  return { ok: true };
};

// ---------- 신청·준비·전략 ----------
const CLOSED = '내 계좌를 연 뒤에는 대회에 나갈 수 없습니다.'; // 계좌가 없는 학생을 위한 대회다
export function canApply(s) {
  init(s);
  if (s.account) return no(CLOSED);
  if (s.year < FIRST_YEAR || s.year > LAST_YEAR) return no('대회는 2007년까지만 열립니다.');
  if (!divisionOf(s)) return no('초·중·고 재학 중에만 나갈 수 있습니다.');
  if (s.month < 6) return no('6월에 공고가 납니다.');
  if (s.month > 7) return no('올해 신청은 끝났습니다. 내년 6월에 다시 공고가 납니다.');
  if (entered(s)) return no('올해는 이미 신청했습니다.');
  return { ok: true };
}
export function applyContest(s) {
  const c = canApply(s); if (!c.ok) return c;
  s.contest = { year: s.year, division: divisionOf(s).id, prep: 0, picks: [], cands: candidatesOf(s), resolved: false, rank: null, score: null, returnPct: null, prize: 0 };
  return { ok: true, text: `${TITLE} ${s.contest.division}에 신청했습니다. 7~8월에 후보 종목 중 1~3개를 고릅니다. 대회 준비를 하면 기억이 더 떠오릅니다.` };
}
export function canPrepare(s) {
  init(s);
  const c = entered(s);
  if (!c) return no('먼저 6~7월에 대회를 신청해야 합니다.');
  if (s.month < 7 || s.month > 8) return no('대회 준비는 7~8월에 합니다.');
  if (c.prep >= MAX_PREP) return no('올해 준비는 세 번까지입니다.');
  if (s.used >= s.capacity) return no('이번 달 활동 칸을 다 썼습니다.');
  return { ok: true };
}
export function prepareContest(s) {
  const c = canPrepare(s); if (!c.ok) return c;
  useSlot(s, 3); s.contest.prep += 1; raise(s, '지능', 1);
  const fresh = hintsOf(s, s.contest).at(-1);
  return { ok: true, prep: s.contest.prep, text: fresh ? `지난 신문을 뒤적이다 떠올랐다. ${fresh.name}: ${fresh.hint}` : `대회 준비를 했습니다. (${s.contest.prep}/${MAX_PREP})` };
}
// 후보: 그해 실제 등락을 여섯 칸으로 나눠 칸마다 하나씩 뽑는다. 크게 오른 것도 크게 내린 것도 늘 섞여 있다.
const mix = (t) => { let h = 7; for (const ch of String(t)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
export function candidatesOf(s, year = s.year) {
  const pool = summerPool(year); if (!pool.length) return [];
  const n = Math.min(CANDIDATES, pool.length), band = pool.length / n, out = [];
  for (let k = 0; k < n; k++) { const lo = Math.floor(k * band), hi = Math.max(lo + 1, Math.floor((k + 1) * band)); out.push(pool[lo + mix(`${s.seed}:${year}:${k}`) % (hi - lo)]); }
  return out.map((x) => ({ ...x, key: mix(`${s.seed}:${year}:${x.id}`) })).sort((a, b) => a.key - b.key).map(({ key, ...x }) => x);
}
// 떠오르는 기억 수: 처음 1개, 지능 2·3구간에서 하나씩, 인맥 51부터 선배의 귀띔 하나, 준비마다 하나.
export const hintCount = (s, c) => Math.min(CANDIDATES, 1 + (tierOf(s.stats.지능) >= 2 ? 1 : 0) + (tierOf(s.stats.지능) >= 3 ? 1 : 0) + (s.stats.인맥 >= 51 ? 1 : 0) + c.prep);
const hintWord = (r) => (r >= 15 ? '이번 여름에 크게 올랐던 기억이 난다.' : r >= 3 ? '이번 여름에 올랐던 것 같다.' : r > -3 ? '이번 여름에는 별 움직임이 없었던 것 같다.' : r > -15 ? '이번 여름에 내렸던 것 같다.' : '이번 여름에 크게 떨어졌던 기억이 난다.');
function hintsOf(s, c) {
  const order = [...c.cands].sort((a, b) => mix(`h${s.seed}:${c.year}:${a.id}`) - mix(`h${s.seed}:${c.year}:${b.id}`));
  return order.slice(0, hintCount(s, c)).map((x) => ({ id: x.id, name: x.name, hint: hintWord(x.ret) }));
}
export function canPick(s) {
  init(s);
  const c = entered(s);
  if (!c) return no('먼저 6~7월에 대회를 신청해야 합니다.');
  if (c.resolved || s.month < 7 || s.month > 8) return no('종목은 7~8월에 고릅니다.');
  return { ok: true };
}
// 누를 때마다 담고 뺀다. 칸을 쓰지 않으며 8월 말까지 바꿀 수 있다.
export function togglePick(s, id) {
  const can = canPick(s); if (!can.ok) return can;
  const c = s.contest; if (!c.cands.some((x) => x.id === id)) return no('후보가 아닌 종목입니다.');
  if (c.picks.includes(id)) { c.picks = c.picks.filter((x) => x !== id); return { ok: true }; }
  if (c.picks.length >= MAX_PICK) return no(`종목은 ${MAX_PICK}개까지 고를 수 있습니다.`);
  c.picks.push(id);
  return { ok: true };
}

// ---------- 점수 ----------
// 후보를 수익률 순으로 세워 일등 100, 꼴찌 0으로 매기고 고른 종목의 평균을 낸다. 한 종목만 폭등한 해에도 순위가 흔들리지 않는다.
export function scoreOf(c) {
  const order = [...c.cands].sort((a, b) => b.ret - a.ret), n = order.length;
  const pts = c.picks.map((id) => order.findIndex((x) => x.id === id)).filter((k) => k >= 0).map((k) => (n > 1 ? 100 * (n - 1 - k) / (n - 1) : 0));
  return pts.length ? Math.round(pts.reduce((a, x) => a + x, 0) / pts.length) : 0;
}
export const returnOf = (c) => { const p = c.cands.filter((x) => c.picks.includes(x.id)); return p.length ? Math.round(p.reduce((a, x) => a + x.ret, 0) / p.length * 10) / 10 : 0; };
export function rankOf(score, division) {
  const cut = Object.values(DIVISIONS).find((d) => d.id === division).cut;
  return score >= cut.gold ? 'gold' : score >= cut.silver ? 'silver' : score >= cut.bronze ? 'bronze' : 'participation';
}
export const prizeOf = (division, rank) => (rank === 'participation' ? 0 : PRIZE[division === '어린이부' ? '어린이부' : 'school'][rank]);

function resolve(s) {
  const c = s.contest;
  if (!c.picks.length) { c.auto = true; c.picks = c.cands.slice(0, MAX_PICK).map((x) => x.id); } // 고르지 않으면 앞의 셋을 담는다
  c.score = scoreOf(c); c.rank = rankOf(c.score, c.division);
  c.returnPct = returnOf(c); c.prize = prizeOf(c.division, c.rank); c.resolved = true;
  if (c.prize) addMoney(s, `${ORGANIZER} 대회 상금`, c.prize, 'prizes');
  s.contestAwards.push({ year: c.year, division: c.division, rank: c.rank, rankName: RANKS[c.rank].name, returnPct: c.returnPct, prize: c.prize, score: c.score });
  if (c.rank !== 'participation' && !s.flags.contestPassed) { s.flags.contestPassed = true; s.flags.contestFirstWin = c.year; }
  s.log.push(`${TITLE} ${c.division}: ${RANKS[c.rank].name}, 수익률 ${signed(c.returnPct)}%.`);
}
const signed = (x) => `${x >= 0 ? '+' : '−'}${Math.abs(x)}`;

// 달 넘김: 2000-03 복선, 8월 시작에 전략 기본값, 9월 시작(8월 말 정산)에 결과.
export function onMonth(s) {
  init(s);
  if (s.year === 2000 && s.month === 3) s.flags.contestPromise = true;
  const c = s.contest;
  if (c && c.year === s.year && !c.resolved) {
    if (s.month >= 9) resolve(s);
  }
  return s;
}

// ---------- 부모님 약속 ----------
const PROMISE_CHOICES = [
  { label: '손해가 나도 숨기지 않고 말씀드릴게요', bond: 3 },
  { label: '공부 시간은 꼭 지킬게요', bond: 3 },
];
const wonThisYear = (s) => s.contestAwards?.some((a) => a.year === s.year && a.rank !== 'participation');
// 약속 장면: 처음 입상한 해 9~12월에 한 번.
export function canTalk(s) {
  init(s); const f = s.flags;
  if (!f.contestPassed || !wonThisYear(s)) return no('모의투자 대회에서 입상하면 부모님과 이야기할 수 있습니다.');
  if (f.contestParentsTalk || f.guardianConsent || s.account) return no('부모님과는 이미 이야기했습니다.');
  if (s.month < 9) return no('대회 결과가 나온 뒤 9~12월에 이야기합니다.');
  return { ok: true };
}
export function promiseScene(s) {
  const c = canTalk(s); if (!c.ok) return null;
  const agree = parentBond(s) >= BOND_NEED;
  return {
    title: '부모님 약속',
    text: agree ? '저녁을 먹고 대회 상장을 식탁에 올려놓았다. 아빠가 한참 들여다보다 말했다. "그럼 네 용돈으로 간단하게 해 봐."' : '저녁을 먹고 대회 상장을 식탁에 올려놓았다. 엄마가 아빠를 한번 보고 말했다. "잘했네. 그런데 조금 더 지켜보자."',
    agree, choices: agree ? PROMISE_CHOICES.map((x, i) => ({ i, label: x.label })) : [{ i: 0, label: '알겠어요' }],
  };
}
export function talkToParents(s, i = 0) {
  const c = canTalk(s); if (!c.ok) return c;
  s.flags.contestParentsTalk = true;
  if (parentBond(s) < BOND_NEED) return { ok: true, agreed: false, text: '허락을 받지 못했습니다. 나중에 다시 상의할 수 있습니다.' };
  const pick = PROMISE_CHOICES[i] ?? PROMISE_CHOICES[0];
  s.bonds ??= {}; s.bonds.부모님 = Math.min(100, parentBond(s) + pick.bond);
  s.flags.guardianConsent = true;
  return { ok: true, agreed: true, text: '부모님이 허락했습니다. 이제 함께 은행에 가면 계좌를 열 수 있습니다.' };
}
export function canRetry(s) {
  init(s); const f = s.flags;
  if (s.account || f.guardianConsent) return no('이미 허락을 받았습니다.');
  if (!f.contestPassed) return no('먼저 모의투자 대회에서 입상해야 합니다.');
  if (!f.contestParentsTalk && wonThisYear(s)) return no('먼저 부모님께 대회 결과를 말씀드려야 합니다.');
  if (parentBond(s) < BOND_NEED) return no(`부모님과 사이가 더 가까워져야 합니다. ${BOND_NEED} 필요 · 지금 ${Math.floor(parentBond(s))}`, { stat: '부모님', min: BOND_NEED, now: Math.floor(parentBond(s)) });
  return { ok: true };
}
export function retryParents(s) {
  const c = canRetry(s); if (!c.ok) return c;
  s.flags.guardianConsent = true; s.flags.contestParentsTalk = true;
  return { ok: true, text: '대회 결과를 다시 보여드렸습니다. 부모님이 허락했습니다.' };
}

// ---------- 은행 방문 ----------
export function canVisitBank(s) {
  init(s);
  if (s.account) return no('계좌가 이미 있습니다.');
  const adult = ym(s) >= ADULT_YM;
  if (!adult && !s.flags.guardianConsent) return accountWhy(s);
  return { ok: true };
}
export function visitBank(s) {
  const c = canVisitBank(s); if (!c.ok) return c;
  addStress(s, 1); raise(s, '지능', 0.3);
  const minor = ym(s) < ADULT_YM;
  s.account = { ym: ym(s), minor }; s.flags.계좌열림 = true;
  s.log.push(minor ? '부모님과 은행에 가서 주식 계좌를 열었습니다.' : '은행에 가서 주식 계좌를 열었습니다.');
  return { ok: true, text: minor ? '부모님과 은행에 가서 계좌를 열었습니다. 이제 내 돈 안에서 자유롭게 투자할 수 있습니다.' : '은행에서 계좌를 열었습니다.' };
}

// ---------- 화면용 상태 ----------
export function contestState(s) {
  init(s);
  const div = divisionOf(s), c = entered(s), years = s.year >= FIRST_YEAR && s.year <= LAST_YEAR;
  const base = { organizer: ORGANIZER, title: TITLE, year: s.year, division: div?.id ?? null, team: div?.team ?? null, awards: [...s.contestAwards], maxPrep: MAX_PREP, maxPick: MAX_PICK };
  if (s.account && !c) return { ...base, season: false, phase: '없음', text: CLOSED, todos: [], warnings: warningsOf(s) };
  if (!div) return { ...base, season: false, phase: '없음', text: years ? '초·중·고 재학 중에만 나갈 수 있습니다.' : s.year > LAST_YEAR ? '대회는 2007년까지 열렸습니다.' : '', todos: [], warnings: warningsOf(s) };
  const phase = c?.resolved ? '발표' : s.month < 6 ? '공고 전' : s.month <= 7 && !c ? '신청' : !c ? '마감' : s.month <= 8 ? '준비' : '발표';
  const steps = [
    { id: '공고', label: '6월 공고', done: s.month >= 6 || !!c },
    { id: '신청', label: '6~7월 신청', done: !!c },
    { id: '준비', label: `준비 ${c?.prep ?? 0}/${MAX_PREP}`, done: (c?.prep ?? 0) >= MAX_PREP },
    { id: '종목', label: `종목 고르기 ${c?.picks?.length ?? 0}/${MAX_PICK}`, done: !!c?.picks?.length },
    { id: '결과', label: c?.resolved ? RANKS[c.rank].name : '8월 말 결과', done: !!c?.resolved },
  ];
  return {
    ...base, season: true, phase, steps, entered: !!c, prep: c?.prep ?? 0, picks: c?.picks ?? [],
    cands: c ? candView(s, c) : [],
    canApply: canApply(s), canPrepare: canPrepare(s), canPick: canPick(s),
    result: c?.resolved ? { rank: c.rank, rankName: RANKS[c.rank].name, returnPct: c.returnPct, prize: c.prize, auto: !!c.auto } : null,
    todos: todosOf(s), warnings: warningsOf(s),
  };
}
// 발표 전에는 수익률을 숨긴다. 발표 뒤에는 전부 공개한다.
function candView(s, c) {
  const hints = hintsOf(s, c);
  return c.cands.map((x) => ({ id: x.id, name: x.name, sector: x.sector, picked: c.picks.includes(x.id), hint: hints.find((h) => h.id === x.id)?.hint ?? null, ret: c.resolved ? x.ret : null }));
}
function todosOf(s) {
  const c = entered(s), out = [];
  if (canApply(s).ok) out.push({ id: 'apply', title: '모의투자 대회 신청', done: false });
  if (c && (s.month === 7 || s.month === 8)) out.push({ id: 'prep', title: `대회 준비 ${c.prep}/${MAX_PREP}`, done: c.prep >= MAX_PREP });
  if (c && !c.resolved && (s.month === 7 || s.month === 8)) out.push({ id: 'pick', title: '대회 종목 고르기', done: !!c.picks.length });
  if (canTalk(s).ok) out.push({ id: 'parents', title: '부모님께 대회 결과 말씀드리기', done: false });
  return out;
}
// 달을 넘기기 전 알림
function warningsOf(s) {
  const c = entered(s), out = [];
  if (s.month === 7 && divisionOf(s) && !c && !s.account) out.push('대회 신청은 이번 달까지입니다.');
  if (c && !c.resolved && s.month === 8 && !c.picks.length) out.push('이번 달까지 종목을 고르지 않으면 앞의 셋이 담깁니다.');
  if (canTalk(s).ok) out.push('부모님 약속이 남아 있습니다.');
  return out;
}
// '계좌 준비' 탭 내용
export function accountSteps(s) {
  init(s);
  const f = s.flags, adult = ym(s) >= ADULT_YM, has = !!s.account;
  const steps = adult
    ? [{ id: '은행', label: '은행 방문', done: has, detail: '은행 방문만으로 열 수 있습니다.' }]
    : [
      { id: '입상', label: '모의투자 대회 입상', done: !!f.contestPassed, detail: '동상 이상' },
      { id: '허락', label: '부모님 허락', done: !!f.guardianConsent || has, detail: '부모님께 말씀드리기' },
      { id: '은행', label: '은행 방문', done: has, detail: '칸을 쓰지 않음' },
    ];
  let next = null;
  if (!has) {
    if (canVisitBank(s).ok || adult || f.guardianConsent) next = { id: 'bank', label: adult ? '은행 가기' : '부모님과 은행 가기', can: canVisitBank(s) };
    else if (canTalk(s).ok) next = { id: 'talk', label: '부모님께 대회 결과 말씀드리기', can: canTalk(s) };
    else if (f.contestPassed) next = { id: 'retry', label: '부모님과 다시 상의', can: canRetry(s) };
    else next = { id: 'contest', label: '올해 대회', can: canApply(s), why: accountWhy(s).why };
  }
  const card = divisionOf(s) ? contestState(s) : null;
  return {
    hasAccount: has, account: s.account, adult, steps, next, thisYear: card,
    awards: [...s.contestAwards],
    text: has ? '계좌가 열려 있습니다. 내 돈 안에서 자유롭게 투자할 수 있습니다.' : accountWhy(s).why,
  };
}
// 신문 대회 소식
export function contestNews(s) {
  init(s);
  const out = [], c = entered(s), div = divisionOf(s);
  if (s.year === 2000 && s.month === 3) out.push({ kind: 'promise', title: '저녁 식탁', text: '주식 이야기를 꺼내자 아빠가 말했다. "아직은 이르다. 여름에 신문사 모의투자 대회가 있다던데, 거기서 상을 타면 생각해 보자."' });
  if (div && s.month === 6 && !s.account) out.push({ kind: 'notice', title: `${s.year} ${TITLE} 공고`, text: `${ORGANIZER}가 ${div.id} 참가자를 받습니다. 신청은 7월까지입니다. ${div.team}`, can: canApply(s) });
  if (div && s.month === 7 && !c && !s.account) out.push({ kind: 'deadline', title: '대회 신청 마감', text: '대회 신청은 이번 달까지입니다.', can: canApply(s) });
  if (c?.resolved && s.month === 9) {
    const r = RANKS[c.rank].name;
    out.push({ kind: 'result', title: `${c.year} ${TITLE} 결과`, text: `${c.division} ${r}. 수익률 ${signed(c.returnPct)}%.${c.prize ? ` 장학금 ${fmtWon(c.prize)}원.` : ''}`, rank: c.rank, returnPct: c.returnPct, prize: c.prize, parents: canTalk(s).ok });
  }
  return out;
}
