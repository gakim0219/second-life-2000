// 확정 규칙: design/00_지금까지_결정.md. 상승량은 행동 결과로 화면에 보여 준다(2026-11-05 사용자 지시).
// 2026년 직업표에서 그 시기에 말해도 되는 표현만 고른다. 시기 정보가 없으니 2026년 전에는 분야만 말한다.
const FIELDS = [
  [/교사|강사|학원|교습|교수|교육|상담/, '가르치고 돕는 일'],
  [/개발|소프트웨어|전산|IT|데이터/, 'IT 쪽 일'],
  [/의사|약사|간호|전문의|병원|의료|수의사|재활/, '병원 쪽 일'],
  [/변호사|법무|변리사|법률/, '법률 쪽 일'],
  [/은행|회계|세무|재무|경리|금융|자산운용|캐피털|분석가/, '돈을 다루는 일'],
  [/엔터|뮤직|레코즈|레이블|스텔라맥스|벨벳|가수|연주|음악|작곡|극단|국악|필름/, '연예·음악 쪽 일'],
  [/출판|편집|번역|작가|소설|교정|사서|에디터/, '글과 책을 다루는 일'],
  [/방송|영상|PD|카메라|리포터|크리에이터|유튜브|사진/, '방송·영상 쪽 일'],
  [/디자이|디자인|아트|MD|미술|갤러리|큐레이터|학예|전시|도자|공방/, '디자인·미술 쪽 일'],
  [/연구|엔지니어|설계|기술자|기사|조선|반도체|공정|시공/, '기술 쪽 일'],
  [/호텔|여행|항공|카페|식당|셰프|조리|와인|바 |소믈리에|레스토랑|가이드/, '손님을 맞는 일'],
  [/영업|무역|마케|광고|컨설팅|기획|물류|유통|쇼핑몰|매니저/, '회사 일'],
  [/대표|이사|사장|부사장|상무|임원/, '가업이나 자기 사업'],
];
export const fieldOfJob = (job) => (FIELDS.find(([re]) => re.test(job ?? ''))?.[1] ?? '자기 일');
export const jobAt = (job, year) => (!job ? '' : year >= 2026 ? job : fieldOfJob(job));
export const STATS = ['지능', '체력', '매력', '인맥'];
export const TIER_MAX = [50, 100, 150, 175, 200, 250, 300];
// 사용자 지시(2026-11-09): 능력치 상한 300. 공부·운동 같은 반복 활동은 200까지만 올린다(TRAIN_MAX).
// 200 위는 명품·카드·기기·탈것 효과와 평생 업적 보너스로만 오른다. 6구간 201~250, 7구간 251~300.
export const STAT_MAX = 300, TRAIN_MAX = 200;
// 착용·기기·업적으로 더해진 몫. 원래(훈련) 능력치 = s.stats - extraOf.
export const extraOf = (s, k) => s.gear?.applied?.[k] ?? 0;
// 문턱 구간(1~5)은 그대로 두고, 상승과 체력 효과는 더 잘게 나눈다. 값이 조금만 올라도 바로 느껴지게 한다.
const GAIN_STEPS = [[25, 1.4], [50, 0.8], [75, 0.45], [100, 0.3], [125, 0.2], [150, 0.12], [175, 0.07], [200, 0.04]];
const REST_CURVE = [[20, 15], [75, 18], [125, 21], [163, 24], [190, 30]];
const TIRE_CURVE = [[50, 1], [100, 0.9], [125, 0.8], [150, 0.75], [175, 0.5], [190, 0.1], [250, 0.05], [300, 0.03]];
const curve = (pts, v) => {
  if (v <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (v <= pts[i][0]) { const [a, x] = pts[i - 1], [b, y] = pts[i]; return x + (y - x) * (v - a) / (b - a); }
  return pts[pts.length - 1][1];
};
export const STEP = 10; // 화면의 작은 단계 폭

// 대화로 쌓이는 사이·호감 배율. 매력 구간이 높을수록 크다(사용자 지시 2026-11-05).
const CHARM_TALK = [1, 1.25, 1.5, 1.75, 2, 2.3, 2.6];
export const charmTalk = (s) => CHARM_TALK[tierOf(s.stats.매력) - 1] * (s.gear?.talk ?? 1); // 착용 레전드 아이템 배율
export function tierOf(v) {
  const i = TIER_MAX.findIndex((m) => v <= m);
  return (i < 0 ? TIER_MAX.length - 1 : i) + 1;
}
export function gain(v, base = 1) {
  if (v >= TRAIN_MAX) return v;
  return Math.min(TRAIN_MAX, v + base * GAIN_STEPS.find(([m]) => v <= m)[1]);
}
// 능력치를 올리는 공통 입구. 훈련 몫만 200까지 올리고, 착용·업적 몫은 그대로 얹는다.
export function raise(s, k, base = 1, fn = gain) {
  const ex = extraOf(s, k), b = s.stats[k] - ex;
  s.stats[k] = Math.min(STAT_MAX, fn(b, base) + ex);
}
// 회사 일의 상승은 업종 균형을 맞춘 구간 표를 그대로 쓴다.
const WORK_RATE = [1, 0.6, 0.35, 0.2, 0.1];
export const workGain = (v, base = 1) => (v >= TRAIN_MAX ? v : Math.min(TRAIN_MAX, v + base * WORK_RATE[Math.min(5, tierOf(v)) - 1]));
// 사용자 지시: 체력 20에서 칸 8개로 시작하고, 체력 10마다 칸이 1개 늘어난다.
// 200 위로는 10마다 늘지 않고, 6구간과 7구간에 들 때 한 칸씩만 더 생긴다.
export const capacityOf = (체력) => 8 + Math.floor(Math.max(0, Math.min(TRAIN_MAX, 체력) - 20) / 10 + 1e-9) + (체력 > 200 ? 1 : 0) + (체력 > 250 ? 1 : 0);
export const restOf = (체력) => Math.round(curve(REST_CURVE, 체력) * 10) / 10;
// 다음 칸이 생기는 체력 값. 마지막 칸이면 null.
export function nextCapacityAt(체력) {
  const now = capacityOf(체력);
  for (let v = Math.floor(체력) + 1; v <= STAT_MAX; v++) if (capacityOf(v) > now) return v;
  return null;
}
// 체력이 올라 칸이 늘면 이번 달부터 바로 쓸 수 있다. 복무 중에는 늘지 않는다. 늘어난 칸 수를 돌려준다.
export function growCapacity(s, 체력before) {
  const d = capacityOf(s.stats.체력) - capacityOf(체력before);
  if (d <= 0 || (s.flags?.군입대 && !s.flags?.전역)) return 0;
  s.capacity += d;
  return d;
}
// 이번 활동으로 넘은 작은 단계. 예: ['체력 30']
export const stepsCrossed = (before, after) => STATS.filter((k) => Math.floor(after[k] / STEP) > Math.floor(before[k] / STEP)).map((k) => `${k} ${Math.floor(after[k] / STEP) * STEP}`);
// 사용자 지시(2026-11-05): 행동으로 무엇이 얼마나 늘었는지 숫자로 보여 준다.
const fmtGain = (d) => `${d > 0 ? '+' : ''}${Math.round(d * 100) / 100}`;
export const statGains = (before, after) => Object.fromEntries(STATS.filter((k) => Math.abs(after[k] - before[k]) >= 0.005).map((k) => [k, Math.round((after[k] - before[k]) * 100) / 100]));
export const gainText = (gains = {}) => Object.entries(gains).map(([k, d]) => `${k} ${fmtGain(d)}`).join(' · ');
export function effectText({ stats = [], gains = null, stress = 0, slots = 0, marks = [] } = {}) {
  const parts = gains ? Object.entries(gains).map(([k, d]) => `${k} ${fmtGain(d)}`) : stats.map((k) => `${k} ↑`);
  if (stress) parts.push(`피곤함 ${stress > 0 ? '+' : ''}${stress}`);
  if (slots) parts.push(`활동 칸 +${slots}`);
  for (const m of marks) parts.push(`${m} 달성`);
  return parts.join(' · ');
}
// 체력이 오를수록 피곤함이 덜 쌓인다. 190부터는 번아웃이 거의 없다.
export const fatigueRate = (체력) => Math.round(curve(TIRE_CURVE, 체력) * 100) / 100;
// 임시 결정: 휴식 1칸은 표의 값 그대로, 쉬지 않아도 매달 그 3분의 1은 저절로 풀린다.
export const naturalRecovery = (체력) => restOf(체력) / 3;

// 학교 단계는 달력으로 정한다. 군 복무와 진로 선택으로 사회인 시작은 뒤로 밀릴 수 있다.
export function stageOf(s) {
  const { year: y, month: m } = s;
  if (y < 2002 || (y === 2002 && m < 3)) return '초등';
  if (y < 2005 || (y === 2005 && m < 3)) return '중학';
  if (y < 2008 || (y === 2008 && m < 3)) return '고등';
  // MIT는 6월 졸업이라 7월부터 사회인이다.
  const gradMonth = s.school?.대학 === 'MIT' ? 7 : 3;
  if (y < s.graduateYear || (y === s.graduateYear && m < gradMonth)) return '대학';
  return '사회인';
}

const OPEN = {
  공부: () => true, 운동: () => true, 휴식: () => true, '과외 알바': () => true, 학교: () => true,
  꾸미기: (st) => st !== '초등' && st !== '중학',
  '인맥 관리': (st) => st === '대학' || st === '사회인',
  만남: (st) => st !== '초등' && st !== '중학',
  놀기: (st) => ['초등', '중학', '고등'].includes(st), // 친구와 놀기(학생 때만)
  '다른 학교': (st) => st === '고등', // 이웃 학교: 축제·연합 동아리·학원(고등학생 때만)
  플렉스: (st) => st !== '초등', // 중학은 아주 작은 단계, 고교는 현실적으로 할 수 있는 단계까지(activities.js MINOR_LEVELS)
};
export const ACTIVITIES = Object.keys(OPEN);
export const isOpen = (name, stage) => OPEN[name](stage);

export const LABEL = {
  '과외 알바': { 초등: '부모님 가게 돕기', 중학: '부모님 가게 돕기', 고등: '알바', 대학: '과외', 사회인: '프리랜서' },
  학교: { 초등: '학교', 중학: '학교', 고등: '학교', 대학: '캠퍼스', 사회인: '회사' },
};
export const labelOf = (name, stage) => LABEL[name]?.[stage] ?? name;
export const PAY = { 초등: 5000, 중학: 10000, 고등: 60000, 대학: 250000, 사회인: 800000 };
export const STRESS_MAX = 100;
// 피곤함(s.stress) 변화의 공통 입구. 늘어나는 쪽만 체력 구간 배율을 받고, 줄어드는 쪽은 그대로 줄어든다.
export const addStress = (s, d) => { s.stress = Math.min(STRESS_MAX, Math.max(0, s.stress + (d > 0 ? d * fatigueRate(s.stats.체력) * (s.gear?.fatigue ?? 1) : d))); };

// ───────── 잠금 칩 ─────────
export const TIER_MIN = [0, 51, 101, 151, 176, 201, 251];
export const statNow = (s, stat) => Math.floor(s.stats[stat]);
// 화면 칩 형식: { ok:false, why:'매력 151 필요 · 지금 83', need:{stat,min,now} }
export function lockStat(s, stat, min) {
  const now = statNow(s, stat);
  return { ok: false, why: `${stat} ${min} 필요 · 지금 ${now}`, need: { stat, min, now } };
}
export const checkStat = (s, stat, min) => (s.stats[stat] >= min ? { ok: true } : lockStat(s, stat, min));

// 문턱 24개: 능력마다 구간 경계 6개. 값은 화면에 보여도 되고 상승량은 쓰지 않는다.
export const UNLOCKS = {
  지능: [
    { min: 51, text: '한빛고·푸른여고·한빛대 진학과 과외를 맡을 수 있습니다.' },
    { min: 101, text: '한빛과학고 원서를 쓸 수 있고 대회 입상이 잦아집니다.' },
    { min: 151, text: '서울대와 MIT의 문이 열립니다. 회귀 기억이 또렷해집니다.' },
    { min: 176, text: '가장 어려운 시험과 대회를 넘볼 수 있습니다. 회귀 기억이 선명합니다.' },
    { min: 201, text: '종목 화면에 다음 달 시세가 오를지 내릴지 떠오릅니다. 회사 제품 개발이 빨라집니다.' },
    { min: 251, text: '얼마나 크게 움직일지까지 떠오릅니다. 사회인이 되면 특허 수입이 매달 들어옵니다.' },
  ],
  체력: [
    { min: 51, text: '달리기를 오래 해도 숨이 덜 찹니다. 체력은 조금만 올라도 활동 칸이 늘어납니다.' },
    { min: 101, text: '활동 칸이 더 늘고 덜 지칩니다.' },
    { min: 151, text: '활동 칸이 크게 늘고 휴식이 더 잘 듣습니다.' },
    { min: 176, text: '활동 칸이 가장 많고 번아웃이 거의 오지 않습니다.' },
    { min: 201, text: '활동 칸이 하나 더 생기고 피곤함이 거의 쌓이지 않습니다. 철인 3종 대회에 초대받습니다.' },
    { min: 251, text: '활동 칸이 하나 더 생깁니다. 마스터스 국가대표 선발전에 나갈 수 있습니다.' },
  ],
  매력: [
    { min: 51, text: '학교 인기인, 선후배, 가게집 자녀의 마음을 얻을 수 있습니다. 헌팅이 열립니다.' },
    { min: 101, text: '전문직, 대기업 직원, 뜨는 신인을 만날 수 있습니다. 클럽이 열립니다.' },
    { min: 151, text: '이름난 사람과 인기 스타가 먼저 관심을 보입니다.' },
    { min: 176, text: '세계적 스타와 재벌가 상속자가 먼저 다가옵니다.' },
    { min: 201, text: '대화 호감이 더 크게 쌓입니다. 광고 모델 제안이 옵니다.' },
    { min: 251, text: '대화 호감이 가장 크게 쌓입니다. 방송 출연 제안이 오고 인지도가 매달 오릅니다.' },
  ],
  인맥: [
    { min: 51, text: '선배, 알바 사장, 동아리 사람을 소개받습니다. 소개팅이 열립니다.' },
    { min: 101, text: '업계 중견과 전문직을 만납니다. 투자 설명회에 갈 수 있습니다.' },
    { min: 151, text: '임원과 유명 인사의 자리에 갑니다. 고급 사교 모임과 미리 듣는 기회가 생깁니다.' },
    { min: 176, text: '재벌가와 정재계 핵심이 있는 자리에 갑니다. 일반인은 못 가는 곳입니다.' },
    { min: 201, text: '매달 받는 카드가 한 장 늘고, 비공개 투자자 모임에 들어갑니다.' },
    { min: 251, text: '국회의원 출마 제안을 받습니다.' },
  ],
};
// 능력치 상세: 현재 값, 구간, 다음 문턱과 남은 값, 이미 열린 것.
export function statView(s, stat) {
  const value = statNow(s, stat);
  const list = UNLOCKS[stat];
  const next = list.find((u) => s.stats[stat] < u.min) ?? null;
  return {
    stat, value, tier: tierOf(s.stats[stat]),
    next: next ? { min: next.min, text: next.text, remain: next.min - value } : null,
    capNext: stat === '체력' ? nextCapacityAt(s.stats.체력) : null,
    opened: list.filter((u) => s.stats[stat] >= u.min),
    locked: list.filter((u) => s.stats[stat] < u.min).map((u) => ({ ...u, chip: lockStat(s, stat, u.min).why })),
  };
}
export const statViews = (s) => STATS.map((k) => statView(s, k));
export const ageOf = (s) => s.year - (s.birthYear ?? 1989);
