// 회사 운영. 설계: design/13, design/16 1장. 순수 함수, DOM 없음. 돈 액수는 첫 균형값.
import { krNum } from './num.js';
import { tierOf, gain, raise, workGain, stageOf, fatigueRate, STRESS_MAX } from './rules.js';
import { onMonth as coreOnMonth } from './core.js';
import { registerNames, setRecord, markEarly } from './ending.js';
import * as invest from './invest.js';

// ---------- 표 ----------
export const STAGES = [
  { n: 1, 이름: '작은 창업', 직원: [1, 5], 칸: 2 }, { n: 2, 이름: '스타트업', 직원: [6, 30], 칸: 4 },
  { n: 3, 이름: '성장 기업', 직원: [31, 200], 칸: 8 }, { n: 4, 이름: '중견', 직원: [201, 1000], 칸: 14 },
  { n: 5, 이름: '대기업급', 직원: [1000, 3000], 칸: 24 },
];
export const BASE = [3e6, 3e7, 3e8, 3e9, 3e10];
export const PROD = [0.3, 0.7, 1, 1.6, 2.5];
export const OWNER = [0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4];
export const PROMO = [0, 3e8, 3e9, 3e10, 3e11]; // 단계 n+1로 가는 직전 12개월 매출 (index = 도착 단계-1)
export const OWNER_SLOTS = [3, 3, 2, 2, 1]; // 대표가 달마다 먼저 쓰는 칸(13 3장: 많이 듦, 많이 듦, 보통, 보통, 적음)
export const STAGE_MIN_MONTHS = 30; // 단계마다 최소한 버텨야 하는 달 수. 한 해에 두 단계씩 뛰지 않게 한다.
export const SCALE_MAX = [3, 3, 3, 2.5, 1.5]; // 단계 안에서 커지는 규모 배율. 문서 승급 매출은 이 규모까지 키워야 닿는다.
const RENT = [4e5, 3e6, 2e7, 1.2e8, 6e8];
const ANON_RATE = [0.3, 0.35, 0.42, 0.5, 0.55]; // 이름 없는 직원 인건비 = 평균 매출의 비율. 커질수록 조직 비용이 는다.
const GRADES = ['초급', '실무', '핵심', '임원'];
const SALARY = { 초급: [25e6, 32e6, 40e6], 실무: [40e6, 50e6, 65e6], 핵심: [70e6, 90e6, 120e6], 임원: [150e6, 200e6, 300e6] };
const FEE = 0.012; // 투자자문 연 수수료율
const AUM_REF = 2e10; // 이 규모에서 초과수익이 절반으로 줄어듦
const VENTURE_NAMES = ['블루아크파트너스', '하늘다리캐피털', '새벽항구벤처스'];
const BUYERS = ['태헌그룹', '성운그룹', '오렐그룹'];

export const MARKET = {
  2010: [1.0, 1.0, 0.9, 0.8, 1.0], 2011: [1.1, 1.0, 0.9, 1.0, 1.1], 2012: [1.1, 1.0, 1.3, 1.2, 1.3], 2013: [1.1, 1.0, 1.3, 1.2, 1.1],
  2014: [1.2, 0.9, 1.1, 1.2, 1.1], 2015: [1.3, 0.8, 1.0, 1.3, 1.1], 2016: [1.3, 1.0, 1.0, 1.2, 1.1], 2017: [0.9, 0.9, 1.2, 1.2, 0.8],
  2018: [1.0, 0.8, 1.0, 1.2, 1.2], 2019: [1.0, 0.9, 0.9, 1.2, 1.3], 2020: [1.2, 0.6, 1.3, 1.5, 0.6], 2021: [1.2, 0.7, 1.2, 1.5, 0.8],
  2022: [1.0, 1.0, 0.9, 0.8, 1.3], 2023: [1.1, 1.1, 0.8, 0.8, 1.3], 2024: [1.3, 0.9, 0.8, 1.0, 1.2], 2025: [1.3, 0.9, 0.9, 1.1, 1.2],
  2026: [1.3, 0.9, 0.9, 1.1, 1.2],
};
const MARKET_COL = { '뷰티·커머스': 0, '외식 프랜차이즈': 1, 게임회사: 2, 'IT 플랫폼': 3, 연예기획사: 4 };
const BASE_RATE = { 2010: 2.25, 2011: 3.25, 2012: 2.75, 2013: 2.5, 2014: 2.25, 2015: 1.5, 2016: 1.25, 2017: 1.5, 2018: 1.75, 2019: 1.25, 2020: 0.5, 2021: 0.75, 2022: 3, 2023: 3.5, 2024: 3.25, 2025: 2.5, 2026: 2.5 };

const customer = new Set(['뷰티·커머스', '외식 프랜차이즈']);
export const INDUSTRIES = {
  '뷰티·커머스': { start: 5e6, core: ['마케팅', '디자인', '물류·구매'], fixed: 0.04, mult: 1.0, revK: 1.1, 전용: ['상품 고르기', '재고 주문', '해외 판로 열기'],
    open: (s) => (['대학', '사회인'].includes(stageOf(s)) && s.year >= 2010) || '대3(2010년)부터 열립니다.' },
  '외식 프랜차이즈': { start: 1e8, core: ['CS·운영', '영업', '생산·품질'], fixed: 0.12, mult: 0.9, revK: 1.2, 전용: ['메뉴 개발', '매장 열기', '가맹점 모집'],
    open: (s) => stageOf(s) === '사회인' || '졸업 후에 열립니다.' },
  게임회사: { start: 5e7, core: ['개발', '디자인', '기획·PM'], fixed: 0.02, mult: 1.2, revK: 1.1, 전용: ['기획', '개발 스프린트', '시험 서비스', '출시', '운영'],
    open: (s) => stageOf(s) === '사회인' || '졸업 후에 열립니다.' },
  'IT 플랫폼': { start: 3e7, core: ['개발', '데이터·AI', '기획·PM'], fixed: 0.1, mult: 1.4, revK: 0.65, 전용: ['기능 출시', '사용자 모으기', '수익 모델 시험'],
    open: (s) => (['대학', '사회인'].includes(stageOf(s)) && s.year >= 2012) || '2012년부터 열립니다.' },
  연예기획사: { start: 3e8, core: ['콘텐츠·영상', '마케팅', '법무'], fixed: 0.03, mult: 1.0, revK: 1.05, 전용: ['오디션', '연습생 관리', '데뷔', '공연', '해외 진출'],
    open: (s) => (stageOf(s) === '사회인' && tierOf(s.stats.인맥) >= 3) || '졸업 후, 인맥 3구간부터 열립니다.' },
  투자자문사: { start: 5e8, core: ['재무·회계', '데이터·AI', '법무'], fixed: 0.04, mult: 1.6, revK: 0.85, 전용: ['리서치', '고객 설명회', '운용 원칙 정하기', '준법 점검'],
    open: (s) => (stageOf(s) === '사회인' && s.year >= 2014 && tierOf(s.stats.인맥) >= 3) || '졸업 후 2014년부터, 인맥 3구간부터 열립니다.' },
};
export const INDUSTRY_NAMES = Object.keys(INDUSTRIES);
export const ACTIVITIES = ['제품 만들기', '영업·협상', '면접 보기', '직원 챙기기', '현장 돌기', '투자자 만나기', '업종 전용'];

// ---------- 공용 ----------
const fin = (x) => (Number.isFinite(x) ? x : 0);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ym = (s) => s.year * 12 + (s.month - 1);
const env0 = { index: null, rate: null, market: null };
let ENV = { ...env0 };
export function configure(e = {}) { ENV = { ...ENV, ...e }; return ENV; }
export function init(s) {
  if (s.company2 === undefined) s.company2 = null;
  if (!s.companyMeta) s.companyMeta = { closedAt: null, guarantee: 0 };
  s.companyMeta.sold ??= null; s.companyMeta.scenes ??= []; s.companyMeta.done ??= [];
  return s;
}
function rnd(s, tag) { // 결정적 난수 0~1
  let h = (Number(s.seed) || 1) ^ (s.year * 131 + s.month * 17);
  for (const ch of String(tag)) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const log = (s, t) => s.log.push(t);
const ind = (c) => INDUSTRIES[c.industry];
export const companies = (s) => [s.company, s.company2].filter(Boolean);
const target = (s, o = {}) => (o.second ? s.company2 : s.company);

// ---------- 채용 데이터 ----------
let HIRES = []; let BY = new Map();
export function loadHires(list) {
  HIRES = (list || []).filter((h) => h && h.id && Array.isArray(h.채용_가능기간) && Array.isArray(h.시기별) && h.시기별.length);
  BY = new Map(HIRES.map((h) => [h.id, h]));
  registerNames(HIRES);
  return HIRES.length;
}
export const hires = () => HIRES;
export const hireById = (id) => BY.get(id);
function parseRange(t) { const [a, b] = String(t).split('~').map(Number); return [a, b ?? a]; }
export function gradeAt(h, year) { // 시기별 표에서 그 해의 등급
  const rows = h.시기별.map((r) => ({ r, range: parseRange(r.기간) })).sort((x, y) => x.range[0] - y.range[0]);
  let pick = rows[0];
  for (const x of rows) if (year >= x.range[0]) pick = x;
  return { 등급: pick.r.등급, 실력구간: pick.r.실력구간 };
}
const toMan = (v) => Math.round(v / 1e4) * 1e4; // 연봉, 투자금, 매각값은 만 원에서 끊는다. 이 숫자는 1원까지 화면에 보인다.
export function salaryOf(grade, year) { // 연봉 시세 (2012/2018/2024 사이를 이어 그음)
  const t = SALARY[grade]; if (!t) return 0;
  if (year <= 2012) return toMan(t[0] * 0.96 ** (2012 - year));
  if (year >= 2024) return toMan(t[2] * 1.03 ** (year - 2024));
  if (year <= 2018) return toMan(t[0] + (t[1] - t[0]) * (year - 2012) / 6);
  return toMan(t[1] + (t[2] - t[1]) * (year - 2018) / 6);
}
// data/market/rates.json을 넘기면 회사 대출 이자가 실제 기준금리를 쓴다.
export function loadRates(json) {
  const x = json?.x; const v = json?.series?.kr_base_rate;
  if (!x || !v) return false;
  const byYear = new Map();
  x.forEach((m, i) => { const y = +String(m).slice(0, 4); if (v[i] != null && !byYear.has(y)) byYear.set(y, v[i]); });
  ENV.rate = (year) => byYear.get(year) ?? BASE_RATE[clamp(year, 2010, 2026)] ?? 2;
  return true;
}
export const marketMult = (industry, year, env = ENV) => {
  if (env.market) { const v = env.market(industry, year); if (Number.isFinite(v)) return v; }
  const col = MARKET_COL[industry]; if (col === undefined) return 1;
  if (year < 2010) return 1;
  return MARKET[Math.min(2026, year)][col];
};
const baseRate = (year, env = ENV) => (env.rate ? env.rate(year) : BASE_RATE[clamp(year, 2010, 2026)] ?? 2) / 100;
const partnerId = (s) => s.partner?.id ?? s.partner?.who ?? s.partner?.hireId ?? null;

// ---------- 회사 값 ----------
export const repTier = (c) => (c.rep < 35 ? 1 : c.rep < 65 ? 2 : 3);
export const repLabel = (c) => ['나쁨', '보통', '좋음'][repTier(c) - 1];
export function teamLevel(s, c, role) {
  let best = 1;
  for (const m of c.staff) { const h = BY.get(m.id); if (h && h.직군 === role) best = Math.max(best, gradeAt(h, s.year).실력구간); }
  return best;
}
export function teamLevels(s, c) { const r = {}; for (const m of c.staff) { const h = BY.get(m.id); if (h) r[h.직군] = Math.max(r[h.직군] ?? 1, gradeAt(h, s.year).실력구간); } return r; }
function ceilingOf(s, c) {
  const best = Math.max(1, ...ind(c).core.map((r) => teamLevel(s, c, r)));
  const owner = Math.max(1, tierOf(s.stats.지능) - 1);
  return clamp(1 + Math.max(best, owner), 2, 5);
}
export function productLevel(s, c) { return clamp(1 + Math.floor(c.p / 20), 1, ceilingOf(s, c)); }
function ownerMult(s, c) {
  if (c.retired) return 1;
  const t = customer.has(c.industry) ? Math.max(tierOf(s.stats.인맥), tierOf(s.stats.매력)) : tierOf(s.stats.인맥);
  return OWNER[t - 1];
}
export function headcount(c) {
  const [lo, hi] = STAGES[c.stage - 1].직원;
  const q = clamp(c.avgRev / BASE[c.stage - 1], 0, 1.5) / 1.5;
  return Math.max(c.staff.length + 1, Math.round(lo + (hi - lo) * q));
}

function newCompany(s, industry, name, start, loan) {
  const x = { aum: 0, rule: 1 };
  return {
    industry, name, founded: { year: s.year, month: s.month }, stage: 1, cash: start, p: 5, rep: 50, equity: 100,
    staff: [], alumni: [], interview: { list: [] }, loans: loan > 0 ? [{ principal: loan, rate: baseRate(s.year) + 0.015 }] : [],
    hist: [], avgRev: 0, scale: 1, stageAt: s.year * 12 + s.month - 1, negMonths: 0, crisis: null, warned: false, salesBoost: 0, clients: 0, pitch: 0, care: 0, careYear: 0,
    profitYears: 0, listed: false, ventureStage: 0, restructure: 0, scouted: false,
    x: industry === '투자자문사' ? { aum: 0, rule: 1, research: 0, compliance: 0, ret: [] }
      : industry === '뷰티·커머스' ? { stock: 0, overseas: false }
      : industry === '외식 프랜차이즈' ? { stores: 1, franchise: 0 }
      : industry === '게임회사' ? { proj: { plan: 0, dev: 0, beta: false }, games: [], live: 0 }
      : industry === 'IT 플랫폼' ? { traction: 0.1, monet: 0 }
      : industry === '연예기획사' ? { trainees: [], artists: [], overseas: false, gig: 0 } : x,
  };
}

export function startCompany(s, industry, name, opts = {}) {
  init(s);
  const def = INDUSTRIES[industry];
  if (!def) return { ok: false, why: '없는 업종입니다.' };
  if (s.ended) return { ok: false, why: '이야기가 끝났습니다.' };
  const nm = String(name ?? '').trim();
  if (!nm || nm.length > 20) return { ok: false, why: '회사 이름은 1~20자로 지어 주세요.' };
  const o = def.open(s); if (o !== true) return { ok: false, why: o };
  const second = !!opts.second;
  if (second) {
    if (!s.company) return { ok: false, why: '첫 회사가 먼저 있어야 합니다.' };
    if (s.company.stage < 4) return { ok: false, why: '두 번째 회사는 첫 회사가 4단계가 된 뒤에 세웁니다.' };
    if (s.company2) return { ok: false, why: '회사는 둘까지 운영합니다.' };
    if (s.company.industry === industry) return { ok: false, why: '다른 업종으로 세워야 합니다.' };
  } else if (s.company) return { ok: false, why: '이미 회사가 있습니다.' };
  const m = s.companyMeta;
  if (m.closedAt != null && ym(s) - m.closedAt < 12) return { ok: false, why: '폐업 뒤 1년이 지나야 다시 창업할 수 있습니다.' };
  // 시작 돈은 내 돈으로 낸다. 모자라면 부동산 담보 대출로만 메울 수 있다(13 9장).
  const own = Math.min(Math.max(0, s.cash), def.start);
  const gap = def.start - own;
  if (gap > collateralOf(s)) return { ok: false, why: `시작 자금 ${krNum(def.start)}원이 필요합니다. 지금 ${krNum(Math.max(0, s.cash))}원입니다.`, need: { cash: def.start, now: s.cash } };
  s.cash -= own;
  const c = newCompany(s, industry, nm, def.start, gap);
  if (second) s.company2 = c; else s.company = c;
  queueScene(s, `등록:${industry}`, REGISTER[industry]);
  log(s, `${nm}을(를) 세웠습니다. (${industry})`);
  return { ok: true, company: c };
}

// ---------- 장면 ----------
const REGISTER = {
  '뷰티·커머스': { title: '통신판매업 신고', text: '구청에 통신판매업 신고를 했습니다. 쇼핑몰 맨 아래에 사업자 정보를 넣어야 합니다.' },
  '외식 프랜차이즈': { title: '위생교육', text: '영업신고 전에 위생교육을 들었습니다. 건강진단 결과서와 임대차계약서를 들고 구청에 갔습니다.' },
  게임회사: { title: '등급분류', text: '게임은 내놓기 전에 등급을 받아야 합니다. 신청서의 빈칸이 생각보다 많습니다.' },
  'IT 플랫폼': { title: '사업자 등록', text: '세무서에서 사업자 등록을 마쳤습니다. 약관과 개인정보 처리 방침을 직접 읽어 봅니다.' },
  연예기획사: { title: '기획업 등록', text: '대중문화예술기획업을 등록했습니다. 표준전속계약서를 책상에 올려 뒀습니다.' },
  투자자문사: { title: '자문업 등록', text: '법인을 세우고 투자자문업 등록을 신청했습니다. 심사 동안 자본금은 그대로 두어야 합니다.' },
};
function queueScene(s, id, sc) {
  init(s);
  const m = s.companyMeta;
  if (m.done.includes(id) || m.scenes.some((x) => x.id === id)) return;
  m.scenes.push({ id, title: sc.title, text: sc.text, kind: '회사', choices: [{ label: sc.label ?? '확인했습니다', ok: true }] });
}
export function pendingScenes(s) { init(s); return [...s.companyMeta.scenes, ...offerScenes(s)]; }
export function chooseScene(s, id, i = 0) {
  init(s);
  if (id.startsWith('offer:')) return answerOffer(s, i === 0, { second: id === 'offer:2' });
  const m = s.companyMeta;
  const k = m.scenes.findIndex((x) => x.id === id);
  if (k < 0) return { ok: false, why: '지금 볼 수 있는 장면이 아닙니다.' };
  m.scenes.splice(k, 1); m.done.push(id);
  return { ok: true, text: '' };
}
function collateralOf(s) {
  // 내가 가진 부동산 값의 절반에서 그 집 대출을 뺀 만큼. 시세 자료가 없으면 0.
  try {
    if (!invest.isLoaded()) return 0;
    let v = 0;
    for (const h of invest.portfolio(s).holdings ?? []) if (h.cat === '부동산' || h.cat === '토지') v += Math.max(0, h.value * 0.5 - (h.loan ?? 0));
    return v - (s.companyMeta?.담보쓴돈 ?? 0);
  } catch { return 0; }
}

// ---------- 매출 ----------
export function revenueBreakdown(s, c, env = ENV) {
  const lv = productLevel(s, c);
  const base = BASE[c.stage - 1]; const prod = PROD[lv - 1];
  const market = marketMult(c.industry, s.year, env); const owner = ownerMult(s, c);
  const lv2 = Object.values(teamLevels(s, c)).reduce((a, v) => a + (v - 1), 0);
  const team = 1 + Math.min(0.25, 0.04 * lv2);
  const rep = [0.95, 1, 1.05][repTier(c) - 1];
  const sales = 1 + c.salesBoost;
  const scale = c.scale ?? 1;
  const formula = base * prod * market * owner;
  const f = formula * team * rep * sales * scale;
  const x = c.x; let total = f; let note = '';
  switch (c.industry) {
    case '뷰티·커머스': {
      const need = f * 0.5; let k = 1;
      if (x.stock < need) { k = 0.7; note = '품절'; }
      total = f * k * (1 + 0.3 * (x.brand ?? 0)) * (x.overseas ? 1.15 : 1); break;
    }
    case '외식 프랜차이즈': total = f * (1 + 0.04 * (x.stores - 1)) + f * 0.01 * x.franchise; break;
    case '게임회사': {
      total = f * 0.08; for (const g of x.games) total += g.peak * g.cur;
      break;
    }
    case 'IT 플랫폼': total = f * (0.15 + 0.85 * x.monet) * clamp(0.3 + x.traction, 0.3, 1.5); break;
    case '연예기획사': {
      const pop = x.artists.reduce((a, r) => a + r.pop, 0);
      total = f * (0.15 + clamp(pop / 60, 0, 0.9)) * (x.overseas ? 1.15 : 1) + (x.gig > 0 ? f * 0.3 * clamp(pop / 80, 0.2, 1) : 0); break;
    }
    case '투자자문사': total = x.aum * FEE / 12 + f * 0.05; break;
    default:
  }
  total *= ind(c).revK ?? 1; // 업종 균형값(scripts/balance_sim.mjs)
  return { base, prod, market, owner, team, rep, sales, scale, formula, total: Math.max(0, fin(total)), 제품력: lv, note };
}

export function costsOf(s, c, rev = revenueBreakdown(s, c).total) {
  const lv = productLevel(s, c);
  const payroll = c.staff.reduce((a, m) => a + m.salary / 12 * 1.1, 0);
  const basis = Math.max(c.avgRev, 0.5 * BASE[c.stage - 1] * PROD[lv - 1]);
  const rs = c.restructure > 0 ? 0.8 : 1;
  const anon = ANON_RATE[c.stage - 1] * basis * rs;
  const infl = Math.max(0.7, 1.025 ** (s.year - 2010));
  const rent = RENT[c.stage - 1] * infl * rs;
  const B = BASE[c.stage - 1]; const x = c.x;
  let fixed = ind(c).fixed * B;
  switch (c.industry) {
    case '외식 프랜차이즈': fixed += 0.1 * B * (x.stores - 1); break;
    case 'IT 플랫폼': fixed += 0.1 * B * x.traction; break;
    case '연예기획사': fixed += 0.15 * B * x.trainees.length + 0.05 * B * x.artists.length; break;
    case '뷰티·커머스': fixed += Math.max(0, x.stock - 1.5 * rev) * 0.03; break;
    default:
  }
  const interest = c.loans.reduce((a, l) => a + l.principal * l.rate / 12, 0);
  const listed = c.listed ? rev * 0.01 : 0;
  const total = payroll + anon + rent + fixed + interest + listed;
  return { payroll, anon, rent, fixed, interest, listed, total: fin(total) };
}

// ---------- 활동 ----------
function canWork(s, o = {}) {
  if (s.ended) return { ok: false, why: '이야기가 끝났습니다.' };
  if (!['대학', '사회인'].includes(stageOf(s))) return { ok: false, why: '회사는 대학생 이후에 운영합니다.' };
  const c = target(s, o); if (!c) return { ok: false, why: '회사가 없습니다.' };
  if (s.used >= s.capacity) return { ok: false, why: '이번 달 활동 칸을 다 썼습니다.' };
  return { ok: true };
}
const cap = (s, c) => ceilingOf(s, c) * 20 + 19;
const addP = (s, c, v) => { c.p = clamp(c.p + v, 0, cap(s, c)); };
const spend = (c, v) => { c.cash -= v; };
export function canCompanyDo(s, name, opts = {}) {
  const w = canWork(s, opts); if (!w.ok) return w;
  const c = target(s, opts);
  if (!ACTIVITIES.includes(name)) return { ok: false, why: '없는 활동입니다.' };
  if (name === '업종 전용') {
    if (!ind(c).전용.includes(opts.key)) return { ok: false, why: '이 업종에 없는 활동입니다.' };
    return special(s, c, opts.key, true, opts);
  }
  if (name === '투자자 만나기' && c.stage < 2) return { ok: false, why: '2단계부터 투자자를 만날 수 있습니다.' };
  return { ok: true };
}
const ACT = {
  '제품 만들기': { st: [['지능', 1]], str: 3, fn: (s, c) => addP(s, c, 7 * (1 + 0.12 * (tierOf(s.stats.지능) - 1) + (tierOf(s.stats.지능) >= 6 ? 0.25 : 0))) },
  '영업·협상': { st: [['인맥', 0.6], ['매력', 0.4]], str: 3, fn: (s, c) => { c.salesBoost = Math.min(0.3, c.salesBoost + 0.1); c.clients += 1; } },
  '면접 보기': { st: [['인맥', 0.8]], str: 2, fn: (s, c) => { c.interview = { year: s.year, month: s.month, list: pickCandidates(s, c).map((r) => r.id) }; } },
  '직원 챙기기': { st: [['매력', 0.8]], str: 2, fn: (s, c) => { c.care += 1; c.careYear += 1; c.rep = clamp(c.rep + 2, 0, 100); } },
  '현장 돌기': { st: [['체력', 0.8]], str: 3, fn: (s, c) => { c.scouted = true; } },
  '투자자 만나기': { st: [['인맥', 0.8]], str: 2, fn: (s, c) => { c.pitch += 1; } },
};
export function companyAct(s, name, opts = {}) {
  const ok = canCompanyDo(s, name, opts); if (!ok.ok) return ok;
  const c = target(s, opts);
  let str = 2; let st = [];
  if (name === '업종 전용') { const r = special(s, c, opts.key, false, opts); if (!r.ok) return r; st = r.st; str = 3; }
  else { const a = ACT[name]; a.fn(s, c); st = a.st; str = a.str; }
  for (const [k, v] of st) raise(s, k, v, workGain);
  s.used += 1;
  s.stress = Math.min(STRESS_MAX, s.stress + str * fatigueRate(s.stats.체력));
  return { ok: true };
}
function special(s, c, key, dry, opts = {}) {
  const B = BASE[c.stage - 1]; const x = c.x; const no = (why) => ({ ok: false, why });
  const go = (st, f) => { if (!dry) f(); return { ok: true, st }; };
  switch (key) {
    case '상품 고르기': return go([['매력', 1]], () => { addP(s, c, 6); x.brand = Math.min(1, (x.brand ?? 0) + 0.025); });
    case '재고 주문': { const q = B * 0.6; if (c.cash < q) return no('회사 돈이 모자랍니다.'); return go([['인맥', 0.4]], () => { spend(c, q); x.stock += q; }); }
    case '해외 판로 열기': { if (x.overseas) return no('이미 열었습니다.'); if (c.stage < 2) return no('2단계부터 열 수 있습니다.'); if (c.cash < B) return no('회사 돈이 모자랍니다.'); return go([['인맥', 0.8]], () => { spend(c, B); x.overseas = true; addP(s, c, 3); }); }
    case '메뉴 개발': return go([['체력', 0.5], ['매력', 0.5]], () => addP(s, c, 6));
    case '매장 열기': { const q = B * 0.8; if (x.stores >= 10) return no('더는 열 수 없습니다.'); if (c.cash < q) return no('회사 돈이 모자랍니다.'); return go([['체력', 1]], () => { spend(c, q); x.stores += 1; }); }
    case '가맹점 모집': { if (c.stage < 2) return no('2단계부터 가맹을 받습니다.'); if (x.franchise >= 20) return no('더는 받을 수 없습니다.'); return go([['인맥', 0.8], ['매력', 0.4]], () => { queueScene(s, '정보공개서', { title: '정보공개서', text: '가맹을 받기 전에 정보공개서를 등록했습니다. 예비 점주에게 건네고 14일을 기다려야 계약할 수 있습니다.' }); x.franchise += 2; }); }
    case '기획': if (x.proj.plan >= 100) return no('기획이 끝났습니다.'); return go([['지능', 0.8]], () => { x.proj.plan = Math.min(100, x.proj.plan + 25); });
    case '개발 스프린트': if (x.proj.plan < 25) return no('기획이 먼저 필요합니다.'); return go([['지능', 1]], () => { x.proj.dev = Math.min(100, x.proj.dev + 15); addP(s, c, 2); });
    case '시험 서비스': if (x.proj.dev < 50) return no('개발이 더 필요합니다.'); if (x.proj.beta) return no('이미 시험했습니다.'); return go([['인맥', 0.5]], () => { x.proj.beta = true; });
    case '출시': { const r = canLaunch(c); if (!r.ok) return r; const pf = opts.platform ?? c.x.proj.platform; if (pf === '해외 동시' && c.stage < 2) return no('해외 동시 출시는 2단계부터입니다.'); return go([['인맥', 0.5]], () => { if (pf) c.x.proj.platform = pf; launchGame(s, c, undefined, ENV); }); }
    case '운영': if (!x.games.length) return no('출시한 게임이 없습니다.'); return go([['지능', 0.4]], () => { x.live = Math.min(12, x.live + 4); });
    case '기능 출시': return go([['지능', 1]], () => { addP(s, c, 5); x.traction = Math.min(2, x.traction + 0.05); });
    case '사용자 모으기': { const q = B * 0.3; if (c.cash < q) return no('회사 돈이 모자랍니다.'); return go([['인맥', 0.6], ['매력', 0.4]], () => { spend(c, q); x.traction = Math.min(2, x.traction + 0.12); }); }
    case '수익 모델 시험': return go([['지능', 0.8]], () => { x.monet = Math.min(1, x.monet + 0.08); x.traction = Math.max(0, x.traction - 0.02); });
    case '오디션': { const q = B * 0.3; if (x.trainees.length >= 6) return no('연습생 자리가 찼습니다.'); if (c.cash < q) return no('회사 돈이 모자랍니다.'); return go([['매력', 0.6], ['인맥', 0.4]], () => { spend(c, q); x.trainees.push({ pop: 8 + tierOf(s.stats.매력) * 2 + Math.floor(rnd(s, 'aud' + x.trainees.length) * 8), age: 0 }); }); }
    case '연습생 관리': { if (!x.trainees.length) return no('연습생이 없습니다.'); const how = opts.option ?? '연습'; if (!['연습', '학업', '쉼'].includes(how)) return no('없는 선택입니다.'); const t0 = x.trainees.find((t) => t.minor && !t.쉼); if (how === '연습' && t0 && t0.연습달 === ym(s)) return no('미성년 연습생은 이번 달 연습을 이미 채웠습니다. 학업이나 쉬는 시간을 주어야 합니다.'); return go([['매력', 0.4], ['인맥', 0.2]], () => { for (const t of x.trainees) { if (how === '연습') { t.pop = Math.min(100, t.pop + (t.minor ? 2 : 3)); t.연습달 = ym(s); } else { t.pop = Math.min(100, t.pop + 1); t.연습달 = null; } } if (how !== '연습') c.rep = clamp(c.rep + 1, 0, 100); }); }
    case '데뷔': { if (!x.trainees.length) return no('연습생이 없습니다.'); const q = B; if (c.cash < q) return no('회사 돈이 모자랍니다.'); return go([['인맥', 0.6]], () => { spend(c, q); x.trainees.sort((a, b) => b.pop - a.pop); const t = x.trainees.shift(); if (x.artists.length >= 5) x.artists.sort((a, b) => a.pop - b.pop).shift(); x.artists.push({ ...t, pop: t.pop + productLevel(s, c) * 3, age: 0 }); log(s, `${t.이름 ?? '연습생'}이(가) 데뷔했습니다.`); }); }
    case '공연': { if (!x.artists.length) return no('데뷔한 팀이 없습니다.'); const q = B * 0.3; if (c.cash < q) return no('회사 돈이 모자랍니다.'); return go([['체력', 0.6], ['매력', 0.4]], () => { spend(c, q); x.gig = 1; }); }
    case '해외 진출': { if (x.overseas) return no('이미 나가 있습니다.'); if (c.stage < 2 || !x.artists.length) return no('2단계 이상, 데뷔한 팀이 필요합니다.'); if (c.cash < 2 * B) return no('회사 돈이 모자랍니다.'); return go([['인맥', 0.8]], () => { spend(c, 2 * B); x.overseas = true; }); }
    case '리서치': return go([['지능', 1]], () => { x.research = Math.min(100, x.research + 12); });
    case '고객 설명회': return go([['인맥', 0.8], ['매력', 0.4]], () => { x.aum += B * 3 / (FEE / 12) * 0.05; c.rep = clamp(c.rep + 1, 0, 100); });
    case '운용 원칙 정하기': return go([['지능', 0.5]], () => { x.rule = x.rule === 1 ? 1.25 : x.rule === 1.25 ? 0.75 : 1; });
    case '준법 점검': return go([['지능', 0.4]], () => { x.compliance = Math.min(100, x.compliance + 25); c.rep = clamp(c.rep + 1, 0, 100); });
    default: return no('없는 활동입니다.');
  }
}

// ---------- 게임 출시 ----------
function canLaunch(c) {
  const p = c.x.proj;
  if (c.industry !== '게임회사') return { ok: false, why: '게임회사만 출시합니다.' };
  if (p.dev < 70) return { ok: false, why: '개발이 70 이상이어야 출시합니다.' };
  return { ok: true };
}
const ERA = (platform, year) => {
  if (platform === 'PC') return year <= 2013 ? 1.3 : 0.8;
  if (platform === '해외 동시') return year >= 2018 ? 1.3 : 0.6;
  return year >= 2012 && year <= 2022 ? 1.3 : 0.9; // 모바일
};
export function launchGame(s, c, indexFn, env = ENV) {
  const r = canLaunch(c); if (!r.ok) return r;
  const p = c.x.proj;
  const platform = p.platform || (s.year >= 2012 ? '모바일' : 'PC');
  if (platform === '해외 동시' && c.stage < 2) return { ok: false, why: '해외 동시 출시는 2단계부터입니다.' };
  const ix = indexFn || env.index;
  let sent = 1;
  if (ix) { const a = ix(s.year, s.month); const b = ix(s.year - 1, s.month); if (a > 0 && b > 0) sent = clamp(a / b, 0.6, 1.5); }
  const lv = productLevel(s, c);
  const q = (0.8 + p.dev / 250) * (p.beta ? 1.25 : 1) * (0.7 + 0.1 * lv);
  const peak = BASE[c.stage - 1] * (c.scale ?? 1) * PROD[lv - 1] * 0.6 * q * ERA(platform, s.year) * sent * ownerMult(s, c);
  c.x.games.push({ peak: fin(peak), cur: 1, platform, year: s.year });
  c.x.proj = { plan: 0, dev: 0, beta: false };
  log(s, `${c.name}의 게임을 ${platform}으로 출시했습니다.`);
  return { ok: true, peak };
}
export const PLATFORMS = ['PC', '모바일', '해외 동시'];
export function setPlatform(s, platform, opts = {}) {
  const c = target(s, opts); if (!c || c.industry !== '게임회사') return { ok: false, why: '게임회사만 고릅니다.' };
  if (!PLATFORMS.includes(platform)) return { ok: false, why: '없는 플랫폼입니다.' };
  if (platform === '해외 동시' && c.stage < 2) return { ok: false, why: '해외 동시 출시는 2단계부터입니다.' };
  c.x.proj.platform = platform; return { ok: true };
}
// 출시 플랫폼 목록. 시기 문구만 주고 배율 숫자는 주지 않는다.
export function platformOptions(s, opts = {}) {
  const c = target(s, opts); if (!c || c.industry !== '게임회사') return [];
  return PLATFORMS.map((p) => ({ platform: p, selected: (c.x.proj.platform ?? (s.year >= 2012 ? '모바일' : 'PC')) === p, ok: !(p === '해외 동시' && c.stage < 2), why: p === '해외 동시' && c.stage < 2 ? '2단계부터입니다.' : undefined, 시기: ERA(p, s.year) > 1 ? '지금 사람들이 많이 찾습니다.' : '지금은 사람들이 예전만큼 찾지 않습니다.' }));
}

// ---------- 채용 ----------
export function candidatesFor(s, c = s.company) {
  if (!c) return [];
  const it = tierOf(s.stats.인맥);
  const out = [];
  for (const h of HIRES) {
    const [a, b] = h.채용_가능기간;
    if (s.year < a || s.year > b) continue;
    if (h.합류_최소_회사단계 > c.stage) continue;
    if ((h.영입_조건?.인맥구간 ?? 1) > it) continue;
    if (c.staff.some((m) => m.id === h.id)) continue;
    out.push(h);
  }
  return out;
}
function pickCandidates(s, c) {
  const pool = candidatesFor(s, c).map((h) => {
    let w = 1 + rnd(s, 'pick' + h.id);
    if (c.alumni.includes(h.id)) w += 2;
    if (ind(c).core.includes(h.직군)) w += 1;
    // 승급에 필요한 등급이 아직 없으면 그런 사람이 명단에 오르기 쉽다.
    const need = c.stage === 2 ? ['핵심', '임원'] : c.stage === 3 ? ['임원'] : null;
    if (need && need.includes(gradeAt(h, s.year).등급) && !c.staff.some((m) => { const b = BY.get(m.id); return b && need.includes(gradeAt(b, s.year).등급); })) w += 1.5;
    return { h, w };
  }).sort((x, y) => y.w - x.w).slice(0, 3);
  const mem = tierOf(s.stats.지능) >= 3;
  return pool.map(({ h }) => ({ id: h.id, 이름: h.이름, 직군: h.직군, ...gradeAt(h, s.year), 기억난다: mem && GRADES.indexOf(h.최고_등급) > GRADES.indexOf(gradeAt(h, s.year).등급) }));
}
export function interviewList(s, opts = {}) {
  const c = target(s, opts); if (!c) return [];
  const mem = tierOf(s.stats.지능) >= 3;
  return c.interview.list.map((id) => BY.get(id)).filter(Boolean).map((h) => {
    const g = gradeAt(h, s.year);
    return { id: h.id, 이름: h.이름, 직군: h.직군, 등급: g.등급, 실력구간: g.실력구간, 특기: h.특기, 약점: h.약점, 이직_위험: h.이직_위험, 조건: h.영입_조건.제안, 설명: h.영입_조건.설명,
      연봉: Math.round(salaryOf(g.등급, s.year)), 기억난다: mem && GRADES.indexOf(h.최고_등급) > GRADES.indexOf(g.등급) };
  });
}
export function makeOffer(s, id, offer = {}, opts = {}) {
  const c = target(s, opts); if (!c) return { ok: false, why: '회사가 없습니다.' };
  const h = BY.get(id); const no = (why) => ({ ok: false, why });
  if (!h) return no('없는 후보입니다.');
  if (!c.interview.list.includes(id)) return no('면접 명단에 없는 사람입니다.');
  const [a, b] = h.채용_가능기간;
  if (s.year < a || s.year > b) return no('지금은 영입할 수 없는 시기입니다.');
  if (h.합류_최소_회사단계 > c.stage) return no('회사 규모가 아직 작습니다.');
  if (tierOf(s.stats.인맥) < (h.영입_조건?.인맥구간 ?? 1)) return no('인맥이 모자랍니다.');
  if (h.겸용 && partnerId(s) === h.id) return no('사귀는 동안은 입사 제안을 할 수 없습니다.');
  if (c.staff.some((m) => m.id === id)) return no('이미 함께 일하고 있습니다.');
  if (c.staff.length >= STAGES[c.stage - 1].칸) return no('이름 있는 직원 자리가 찼습니다.');
  const pay = offer.pay ?? 1; const eq = offer.equity ?? 0; const cond = h.영입_조건.제안;
  if (cond === '시세' && pay < 1) return no('시세보다 낮은 제안은 받지 않습니다.');
  if (cond === '시세보다 위' && pay < 1.15) return no('시세보다 높은 연봉을 원합니다.');
  if (cond === '지분 필요' && eq < 2) return no('지분을 함께 원합니다.');
  if (cond === '가족 사정 배려' && !(offer.care && c.careYear >= 1)) return no('가족 사정을 배려하겠다는 약속과, 직원을 챙긴 실적이 필요합니다.');
  if (eq < 0 || eq >= c.equity) return no('줄 수 없는 지분입니다.');
  const g = gradeAt(h, s.year); const sal = toMan(salaryOf(g.등급, s.year) * pay);
  if (c.cash < sal / 4) return no('회사 돈이 모자랍니다.');
  c.equity -= eq;
  c.staff.push({ id, salary: sal, pay, equity: eq, joined: { year: s.year, month: s.month }, unpaid: false });
  c.interview.list = c.interview.list.filter((x) => x !== id);
  c.alumni = c.alumni.filter((x) => x !== id);
  setRecord(s, 'firstHire', `${h.이름} (${s.year}년, ${h.직군})`);
  log(s, `${h.이름}이(가) ${h.직군} 자리에 합류했습니다.`);
  return { ok: true, salary: sal };
}

// 면접 후보에게 낼 제안 목록. 후보 조건(시세, 시세보다 위, 지분 필요, 가족 사정 배려)에 맞는 것이 포함된다.
export function offerOptions(s, id, opts = {}) {
  const c = target(s, opts); const h = BY.get(id); if (!c || !h) return [];
  const list = [{ label: '시세', offer: { pay: 1 } }, { label: '시세보다 더', offer: { pay: 1.2 } }, { label: '지분 나눠 주기', offer: { pay: 1, equity: 2 } }, { label: '가족 사정 배려하기', offer: { pay: 1, care: true } }];
  const cond = h.영입_조건.제안;
  const fit = (o) => (cond === '시세' ? o.pay >= 1 : cond === '시세보다 위' ? o.pay >= 1.15 : cond === '지분 필요' ? (o.equity ?? 0) >= 2 : cond === '가족 사정 배려' ? !!o.care && c.careYear >= 1 : true);
  return list.map((x) => ({ ...x, fit: fit(x.offer), hint: cond === '가족 사정 배려' && x.offer.care && c.careYear < 1 ? '올해 직원을 챙긴 실적이 필요합니다.' : undefined }));
}

// ---------- 연예기획사: 이름 있는 가상 인물 계약 ----------
let ARTISTS = []; // people.json의 곧_뜰_사람. 실존 인물은 들어오지 않는다.
export function loadArtists(list) { ARTISTS = list ?? []; return ARTISTS.length; }
const BIG_AGENCY = /아스트라|오닉스|파로스|스텔라맥스/;
const CONTRACT_YEARS = 7; // 표준전속계약 기준
const debutOf = (p) => p.데뷔연도 ?? p.기간[0] + 2;
function scoutable(s, p, c) {
  // 데뷔 4년 전부터 연습생으로 볼 수 있다(15세 이상). 이때 미성년이면 보호자 동의 장면이 먼저다.
  const from = Math.min(p.기간[0], Math.max(debutOf(p) - 4, p.출생연도 + 15));
  if (s.year < from || s.year > debutOf(p) + 10) return false;
  if (BIG_AGENCY.test(p.소속 ?? '') && s.year < debutOf(p) + CONTRACT_YEARS) return false; // 대형 소속은 계약 만료 뒤에 온다
  const x = c.x;
  return ![...x.trainees, ...x.artists].some((a) => a.id === p.id);
}
// 지금 계약할 수 있는 가상 인물 명단. 지능이 높을수록 '곧 뜰 사람' 표시가 보인다.
export function scoutList(s, opts = {}) {
  const c = target(s, opts); if (!c || c.industry !== '연예기획사') return [];
  // 명단은 12명까지. 미성년 후보가 잘려 보호자 장면이 안 나오는 일이 없게 앞에 세운다.
  const isMinor = (p) => s.year - p.출생연도 < 19;
  const pool = ARTISTS.filter((p) => scoutable(s, p, c));
  return [...pool.filter(isMinor), ...pool.filter((p) => !isMinor(p))].slice(0, 12).map((p) => ({ id: p.id, 이름: p.이름, 나이: s.year - p.출생연도, 미성년: s.year - p.출생연도 < 19, 분류: p.세부, 기억난다: tierOf(s.stats.지능) >= 3 && s.year <= debutOf(p), 성격: p.성격, 비용: Math.round(BASE[c.stage - 1] * 0.5) }));
}
// 계약. 미성년이면 보호자 동의 장면이 먼저다: guardian:true 없이 부르면 needGuardian과 장면을 돌려준다.
export function signArtist(s, id, opts = {}) {
  const c = target(s, opts); const no = (why) => ({ ok: false, why });
  if (!c || c.industry !== '연예기획사') return no('연예기획사만 계약합니다.');
  const p = ARTISTS.find((a) => a.id === id);
  if (!p || !scoutable(s, p, c)) return no('지금은 계약할 수 없는 사람입니다.');
  if (c.x.trainees.length >= 6) return no('연습생 자리가 찼습니다.');
  const cost = Math.round(BASE[c.stage - 1] * 0.5);
  if (c.cash < cost) return no('회사 돈이 모자랍니다.');
  const minor = s.year - p.출생연도 < 19;
  if (minor && !opts.guardian) return { ok: false, needGuardian: true, why: '보호자 동의가 먼저입니다.', scene: { id: `보호자:${id}`, title: '보호자 동의', text: `${p.이름}의 보호자와 마주 앉았습니다. 학교는 끝까지 다니고, 밤 시간과 쉬는 날을 계약서에 적었습니다.`, choices: [{ label: '동의를 받고 계약한다', ok: true, guardian: true }, { label: '졸업 뒤에 다시 오겠다고 한다', ok: true }] } };
  c.cash -= cost;
  const debuted = s.year >= debutOf(p);
  const row = { id: p.id, 이름: p.이름, pop: debuted ? 35 : 14 + tierOf(s.stats.매력) * 2, age: 0, minor, hitYear: debutOf(p), contractTo: s.year + CONTRACT_YEARS };
  if (debuted) c.x.artists.push(row); else c.x.trainees.push(row);
  if (s.year <= debutOf(p)) markEarly(s, p);
  log(s, `${p.이름}과(와) 계약했습니다.`);
  return { ok: true, debuted, cost, minor };
}

// ---------- 회사 화면 ----------
export function companyPanel(s, opts = {}) {
  const c = target(s, opts); if (!c) return null;
  const rb = revenueBreakdown(s, c); const cost = costsOf(s, c, rb.total);
  const team = ind(c).core.map((r) => ({ 직군: r, 실력: teamLevel(s, c, r) }));
  const rev12 = c.hist.reduce((a, h) => a + h.rev, 0) * (12 / Math.max(1, c.hist.length));
  const next = c.stage < 5 ? PROMO[c.stage] : null;
  return { name: c.name, industry: c.industry, stage: c.stage, 단계이름: STAGES[c.stage - 1].이름, 현금: c.cash, 월매출: rb.total, 월비용: cost.total, 비용: cost, 제품력: productLevel(s, c), 팀: team, 평판: repLabel(c), 지분: c.equity, 직원수: headcount(c), 직원칸: STAGES[c.stage - 1].칸, 대표칸: c.retired ? 0 : OWNER_SLOTS[c.stage - 1], 최근12개월매출: rev12, 다음승급매출: next, 상장: c.listed, 물러남: !!c.retired, 위기: c.crisis, 제안: c.offer ?? null, 대출: c.loans.reduce((a, l) => a + l.principal, 0), 대출한도: loanLimit(c, s), 전용활동: ind(c).전용 };
}

// ---------- 돈 ----------
export function loanLimit(c, s = null) { return Math.max(0, 6 * c.avgRev + (s ? collateralOf(s) : 0) - c.loans.reduce((a, l) => a + l.principal, 0)); }
export function takeLoan(s, amount, opts = {}) {
  const c = target(s, opts); if (!c) return { ok: false, why: '회사가 없습니다.' };
  const v = Math.floor(amount);
  if (!(v > 0)) return { ok: false, why: '금액을 확인해 주세요.' };
  if (v > loanLimit(c, s)) return { ok: false, why: '매출과 담보로 빌릴 수 있는 한도를 넘었습니다.' };
  c.loans.push({ principal: v, rate: baseRate(s.year) + 0.025 }); c.cash += v;
  return { ok: true };
}
export function repayLoan(s, amount, opts = {}) {
  const c = target(s, opts); if (!c) return { ok: false, why: '회사가 없습니다.' };
  let left = Math.min(Math.floor(amount), Math.max(0, c.cash));
  if (!(left > 0)) return { ok: false, why: '갚을 돈이 없습니다.' };
  const paid = left; c.cash -= left;
  for (const l of c.loans) { const d = Math.min(l.principal, left); l.principal -= d; left -= d; }
  c.loans = c.loans.filter((l) => l.principal > 0);
  c.cash += left; return { ok: true, paid: paid - left };
}
export function injectCash(s, amount, opts = {}) {
  const c = target(s, opts); const v = Math.floor(amount);
  if (!c) return { ok: false, why: '회사가 없습니다.' };
  if (!(v > 0) || v > s.cash) return { ok: false, why: '개인 돈이 모자랍니다.' };
  s.cash -= v; c.cash += v; afterCash(s, c); return { ok: true };
}
// 회사 돈을 개인으로 뺀다. 빚이 있어도 되지만 회사 돈이 음수가 되면 안 된다.
export function withdrawCash(s, amount, opts = {}) {
  const c = target(s, opts); const v = Math.floor(amount);
  if (!c) return { ok: false, why: '회사가 없습니다.' };
  if (!(v > 0) || v > c.cash) return { ok: false, why: '회사 돈이 모자랍니다.' };
  const mine = Math.round(v * c.equity / 100); // 지분만큼만 내 몫이 된다.
  c.cash -= v; s.cash += mine;
  return { ok: true, got: mine };
}
// 사교모임 소개 자금(인맥 4구간). 지분 7%, 해마다 한 번. network.askFunding이 부른다.
export function raiseIntro(s, who, opts = {}) {
  const c = target(s, opts); const no = (why) => ({ ok: false, why });
  if (!c) return no('회사가 없습니다.');
  if (c.stage < 2) return no('2단계부터 소개받을 수 있습니다.');
  if (c.introYear === s.year) return no('올해는 이미 소개받았습니다.');
  const amount = Math.round(BASE[c.stage - 1] * 4);
  c.equity *= 0.93; c.cash += amount; c.introYear = s.year;
  log(s, `${who}의 소개로 투자자를 만나 돈을 받았습니다. 지분을 조금 내줬습니다.`);
  afterCash(s, c);
  return { ok: true, amount, pct: 7, who };
}
export function raiseVenture(s, opts = {}) {
  const c = target(s, opts); const no = (why) => ({ ok: false, why });
  if (!c) return no('회사가 없습니다.');
  if (c.stage < 2) return no('2단계부터 투자를 받습니다.');
  if (tierOf(s.stats.인맥) < 3) return no('인맥 3구간부터 투자자와 닿습니다.');
  if (c.pitch < 2) return no('투자자를 두 번 이상 만나야 합니다.');
  if (c.ventureStage >= c.stage) return no('이 단계에서는 이미 투자를 받았습니다.');
  const pct = [15, 20, 25][3 - repTier(c)];
  const amount = Math.round(BASE[c.stage - 1] * 6 * (1 + (productLevel(s, c) - 1) * 0.15));
  c.equity = c.equity * (1 - pct / 100); c.cash += amount; c.pitch = 0; c.ventureStage = c.stage;
  const who = VENTURE_NAMES[Math.floor(rnd(s, 'vc') * VENTURE_NAMES.length)];
  log(s, `${who}에서 투자를 받았습니다. 지분 ${pct}%를 내줬습니다.`);
  afterCash(s, c);
  return { ok: true, amount, pct, who };
}
export function goPublic(s, opts = {}) {
  const c = target(s, opts); const no = (why) => ({ ok: false, why });
  if (!c) return no('회사가 없습니다.');
  if (c.listed) return no('이미 상장했습니다.');
  if (c.stage < 4) return no('4단계부터 상장할 수 있습니다.');
  if (c.profitYears < 3) return no('3년 연속 흑자가 필요합니다.');
  const v = rawValue(s, c); const raise = toMan(v * 0.15);
  c.equity *= 0.85; c.cash += raise; c.listed = true; c.rep = clamp(c.rep + 5, 0, 100);
  log(s, `${c.name}이(가) 상장했습니다.`);
  afterCash(s, c);
  return { ok: true, raise };
}
export function acquisitionOffer(s, opts = {}) {
  const c = target(s, opts); if (!c) return { ok: false };
  const ok = c.stage >= 4 || (c.stage === 3 && productLevel(s, c) >= 4);
  if (!ok) return { ok: false, why: '업계 1위권이 아니면 제안이 오지 않습니다.' };
  return { ok: true, buyer: BUYERS[Math.floor(rnd(s, 'buyer') * BUYERS.length)], price: toMan(rawValue(s, c) * c.equity / 100) };
}
function removeCompany(s, c) {
  if (s.company === c) { s.company = s.company2; s.company2 = null; } else if (s.company2 === c) s.company2 = null;
}
export function sellCompany(s, opts = {}) {
  const c = target(s, opts); if (!c) return { ok: false, why: '회사가 없습니다.' };
  const distressed = !!c.crisis || !!opts.distressed;
  let price; let buyer = '';
  if (distressed) price = Math.max(0, toMan(rawValue(s, c) * c.equity / 100 * 0.5)); else {
    const o = acquisitionOffer(s, opts); if (!o.ok) return o; price = o.price; buyer = o.buyer;
  }
  s.cash += price;
  init(s);
  // 엔딩이 읽는 기록. 여러 번 팔면 가장 큰 매각을 남긴다.
  if (!s.companyMeta.sold || price > s.companyMeta.sold.amount) s.companyMeta.sold = { name: c.name, industry: c.industry, amount: price, buyer, stage: c.stage, listed: c.listed, year: s.year, staff: c.staff.map((m) => ({ id: m.id })) };
  removeCompany(s, c); // 빚은 인수 쪽이 안고 간다(가격에 이미 반영)
  log(s, `${c.name}을(를) ${buyer || '다른 회사'}에 넘겼습니다.`);
  return { ok: true, price, buyer };
}
// 인수 제안 장면 ------------------
function maybeOffer(s, c) {
  if (c.offer || c.listed) return;
  if (c.offerAt != null && ym(s) - c.offerAt < 18) return;
  const o = acquisitionOffer(s, { second: s.company2 === c });
  if (!o.ok || rnd(s, 'offer' + c.name) >= 0.15) return;
  c.offer = { buyer: o.buyer, price: o.price, at: ym(s) };
  c.offerAt = ym(s);
}
function offerScenes(s) {
  const out = [];
  for (const [c, id, second] of [[s.company, 'offer:1', false], [s.company2, 'offer:2', true]]) {
    if (!c?.offer) continue;
    out.push({ id, title: '인수 제안', text: `${c.offer.buyer}에서 ${c.name}을(를) 사고 싶다고 합니다. 값은 ${krNum(c.offer.price)}원입니다.`, kind: '회사', second, choices: [{ label: '넘긴다', ok: true }, { label: '거절한다', ok: true }] });
  }
  return out;
}
export const pendingOffer = (s, opts = {}) => target(s, opts)?.offer ?? null;
export function answerOffer(s, accept, opts = {}) {
  const c = target(s, opts); if (!c?.offer) return { ok: false, why: '받은 제안이 없습니다.' };
  const o = c.offer; c.offer = null;
  if (!accept) { log(s, `${o.buyer}의 제안을 거절했습니다.`); return { ok: true, accepted: false, text: `${o.buyer}의 제안을 거절했습니다.` }; }
  // 제안 때 값으로 넘긴다.
  init(s);
  s.cash += o.price;
  if (!s.companyMeta.sold || o.price > s.companyMeta.sold.amount) s.companyMeta.sold = { name: c.name, industry: c.industry, amount: o.price, buyer: o.buyer, stage: c.stage, listed: c.listed, year: s.year, staff: c.staff.map((m) => ({ id: m.id })) };
  removeCompany(s, c);
  const t = `${c.name}을(를) ${o.buyer}에 넘겼습니다.`;
  log(s, t);
  return { ok: true, accepted: true, price: o.price, buyer: o.buyer, text: t };
}
// 상장 뒤 회장으로 물러난다. 대표 칸이 없어지고 제품력은 직원에게 맡긴다.
export function retire(s, opts = {}) {
  const c = target(s, opts); if (!c) return { ok: false, why: '회사가 없습니다.' };
  if (!c.listed) return { ok: false, why: '상장한 뒤에 물러날 수 있습니다.' };
  c.retired = true;
  const t = `${c.name} 대표 자리를 넘기고 회장으로 물러났습니다.`;
  log(s, t);
  return { ok: true, text: t };
}
export function closeCompany(s, opts = {}) {
  init(s);
  const c = target(s, opts); if (!c) return { ok: false, why: '회사가 없습니다.' };
  const debt = c.loans.reduce((a, l) => a + l.principal, 0);
  const left = c.cash - debt;
  if (left > 0) s.cash += Math.round(left * c.equity / 100); else s.companyMeta.guarantee += Math.round(-left * 0.4);
  s.companyMeta.closedAt = ym(s);
  removeCompany(s, c);
  log(s, `${c.name}을(를) 닫았습니다.`);
  return { ok: true };
}
export function resolveCrisis(s, choice, arg = {}) {
  const c = target(s, arg); if (!c || !c.crisis) return { ok: false, why: '지금 위기가 아닙니다.' };
  if (choice === '구조조정') {
    c.restructure = 12; c.rep = clamp(c.rep - 10, 0, 100);
    c.cash -= ANON_RATE[c.stage - 1] * Math.max(c.avgRev, 1) * 2; // 퇴직 비용
    c.staff = c.staff.slice(0, Math.max(0, c.staff.length - 1)); // 마지막으로 합류한 이름 있는 직원 한 명이 떠남
  } else if (choice === '내 돈 넣기') {
    const need = Math.max(0, -c.cash) + ind(c).fixed * BASE[c.stage - 1] * 3 + 1;
    const v = Math.min(s.cash, Math.ceil(arg.amount ?? need));
    if (!(v > 0)) return { ok: false, why: '개인 돈이 없습니다.' };
    s.cash -= v; c.cash += v;
  } else if (choice === '매각') return sellCompany(s, { ...arg, distressed: true });
  else if (choice === '폐업') return closeCompany(s, arg);
  else return { ok: false, why: '고를 수 없는 선택입니다.' };
  c.negMonths = 0; c.crisis = null; c.warned = false;
  return { ok: true };
}
function afterCash(s, c) { if (c.cash >= 0) { c.negMonths = 0; c.crisis = null; } }

// ---------- 가치 ----------
function rawValue(s, c) {
  const n = c.hist.length;
  const rev12 = n ? c.hist.reduce((a, h) => a + h.rev, 0) * 12 / n : 0;
  const debt = c.loans.reduce((a, l) => a + l.principal, 0);
  return Math.max(0, fin(rev12 * ind(c).mult * (c.listed ? 1.3 : 1) + c.cash - debt));
}
export function companyValue(s) {
  let v = 0;
  for (const c of companies(s)) v += rawValue(s, c) * c.equity / 100;
  return Math.round(fin(v));
}

// ---------- 매달 ----------
function monthlyOne(s, c, env) {
  const rev0 = revenueBreakdown(s, c, env);
  let rev = rev0.total;
  const x = c.x;
  // 업종별 상태 갱신
  switch (c.industry) {
    case '뷰티·커머스': x.stock = Math.max(0, x.stock - Math.min(x.stock, rev * 0.5)); break;
    case '외식 프랜차이즈':
      if (x.franchise > 0 && rnd(s, 'badfr') < 0.04 * x.franchise / 2) { c.rep = clamp(c.rep - 8, 0, 100); log(s, '관리가 부실한 가맹점이 나와 평판이 떨어졌습니다.'); }
      break;
    case '게임회사':
      for (const g of x.games) g.cur *= x.live > 0 ? 0.9 : 0.8;
      x.games = x.games.filter((g) => g.cur > 0.02);
      if (x.live > 0) x.live -= 1; break;
    case 'IT 플랫폼':
      x.traction = clamp(x.traction * (productLevel(s, c) >= 3 ? 1.01 : 0.99), 0, 2); break;
    case '연예기획사': {
      x.gig = 0;
      for (const a of x.artists) {
        a.age += 1;
        const fated = a.hitYear != null && s.year >= a.hitYear && s.year <= a.hitYear + 2; // 곧 뜰 사람은 뜨는 때가 정해져 있다
        if (rnd(s, 'hit' + (a.id ?? '') + a.age + a.pop) < (fated ? 0.12 : 0.03) + 0.01 * productLevel(s, c)) a.pop = Math.min(100, a.pop + 25); else a.pop = Math.max(2, a.pop * 0.97);
      }
      for (const t of x.trainees) t.age += 1;
      break;
    }
    case '투자자문사': {
      const prev = s.month === 1 ? [s.year - 1, 12] : [s.year, s.month - 1];
      let rm = 0.004;
      if (env.index) { const a = env.index(s.year, s.month); const b = env.index(prev[0], prev[1]); if (a > 0 && b > 0) rm = clamp(a / b - 1, -0.4, 0.4); }
      x.ret.push(rm); if (x.ret.length > 12) x.ret.shift();
      const trail = x.ret.reduce((a, v) => (1 + a) * (1 + v) - 1, 0);
      const team = Math.max(teamLevel(s, c, '재무·회계'), teamLevel(s, c, '데이터·AI'));
      const shrink = 1 / (1 + x.aum / AUM_REF);
      const alpha = 0.0006 * (team + x.research / 50) * shrink * (x.compliance > 0 ? 1 : 0.9);
      const beta = 1 + (x.rule - 1) * shrink; // 규모가 커지면 시장 평균(1)에 수렴
      x.aum *= 1 + rm * beta + alpha;
      const lv = productLevel(s, c);
      const targetAum = BASE[c.stage - 1] * (c.scale ?? 1) * PROD[lv - 1] * ownerMult(s, c) * rev0.team / (FEE / 12);
      const sentiment = clamp(1 + 3 * trail, 0.4, 1.4);
      x.aum += (targetAum * sentiment - x.aum) * 0.05;
      if (trail < -0.15) x.aum *= 0.975;
      x.aum = Math.max(0, fin(x.aum));
      x.compliance = Math.max(0, x.compliance - 2);
      break;
    }
    default:
  }
  const cost = costsOf(s, c, rev);
  const profit = rev - cost.total;
  c.cash = fin(c.cash + profit);
  c.hist.push({ rev, profit, cost: cost.total }); if (c.hist.length > 12) c.hist.shift();
  const last = c.hist.slice(-3); c.avgRev = last.reduce((a, h) => a + h.rev, 0) / last.length;
  // 제품력과 평판의 느린 움직임
  const lvs = ind(c).core.map((r) => teamLevel(s, c, r) - 1).sort((a, b) => b - a).slice(0, 3);
  addP(s, c, 0.4 * lvs.reduce((a, v) => a + v, 0) - 0.9);
  c.rep = clamp(c.rep + (50 - c.rep) * 0.02 + (c.cash < 0 ? -1 : 0), 0, 100);
  // 단계 안에서 규모가 자란다. 흑자이고 제품력이 받쳐 줄수록 빠르다.
  c.scale = clamp((c.scale ?? 1) + (profit > 0 ? (0.012 + 0.004 * (rev0.제품력 - 1)) * [1, 1, 0.8, 0.6, 0.4][c.stage - 1] : -0.005), 1, SCALE_MAX[c.stage - 1]);
  // 대출 이자는 비용에 이미 포함. 한 달치 효과 초기화
  c.salesBoost = 0; if (c.restructure > 0) c.restructure -= 1;
  // 위기
  if (c.cash < 0) c.negMonths += 1; else { c.negMonths = 0; c.crisis = null; }
  if (c.scouted && !c.crisis) { if (c.cash + profit < 0 && c.cash >= 0) { c.warned = true; log(s, '현장을 돌아보니 다음 달 현금이 모자랄 조짐이 보입니다.'); } }
  c.scouted = false;
  if (c.negMonths >= 3 && !c.crisis) { c.crisis = { since: ym(s), options: ['구조조정', '내 돈 넣기', '매각', '폐업'] }; log(s, `${c.name}의 현금이 석 달째 모자랍니다. 선택해야 합니다.`); }
  if (c.negMonths >= 9) { log(s, `${c.name}은(는) 버티지 못하고 문을 닫았습니다.`); closeCompany(s, { second: s.company2 === c }); return false; }
  return true;
}
function yearEnd(s, c) {
  const rev12 = c.hist.reduce((a, h) => a + h.rev, 0) * (12 / Math.max(1, c.hist.length));
  const profit12 = c.hist.reduce((a, h) => a + h.profit, 0);
  c.profitYears = profit12 > 0 && c.hist.length >= 12 ? c.profitYears + 1 : 0;
  // 연봉 협상과 이직
  const leaving = [];
  for (const m of c.staff) {
    const h = BY.get(m.id); if (!h) continue;
    const g = gradeAt(h, s.year); const mk = salaryOf(g.등급, s.year) * m.pay;
    const afford = c.cash > m.salary * 0.5;
    if (mk > m.salary * 1.001) { if (afford) { m.salary = toMan(mk); m.unpaid = false; } else m.unpaid = true; }
    let p = { 낮음: 0.05, 보통: 0.12, 높음: 0.25 }[h.이직_위험] ?? 0.12;
    p += m.unpaid ? 0.15 : 0; p += [0.08, 0, -0.05][repTier(c) - 1]; p -= Math.min(0.12, 0.04 * c.careYear);
    if (m.equity > 0) p -= 0.05;
    if (c.cash < 0) p += 0.1;
    p = clamp(p, 0.01, 0.6);
    if (rnd(s, 'leave' + m.id) < p) leaving.push(m);
  }
  for (const m of leaving) { c.staff = c.staff.filter((x) => x !== m); c.alumni.push(m.id); if (m.equity) c.equity += m.equity; log(s, `${BY.get(m.id)?.이름 ?? '직원'}이(가) 회사를 떠났습니다.`); }
  c.careYear = 0; c.care = 0;
  // 승급
  const n = c.stage;
  if (n < 5) {
    const th = PROMO[n];
    const hasGrade = (gs) => c.staff.some((m) => { const h = BY.get(m.id); return h && gs.includes(gradeAt(h, s.year).등급); });
    const gate = n === 2 ? hasGrade(['핵심', '임원']) : n === 3 ? hasGrade(['임원']) : n === 4 ? c.listed : true;
    const held = ym(s) - (c.stageAt ?? -Infinity) >= STAGE_MIN_MONTHS;
    if (c.hist.length >= 12 && rev12 >= th && gate && held) { c.stage += 1; c.scale = 1; c.stageAt = ym(s); log(s, `${c.name}이(가) ${STAGES[c.stage - 1].이름}이(가) 됐습니다.`); }
  }
}
export function onMonth(s, env = ENV) {
  init(s);
  if (s.ended) return s;
  const cs = companies(s);
  for (const c of cs) {
    if (!c.hist) continue;
    const alive = monthlyOne(s, c, env);
    if (alive && s.month === 12) yearEnd(s, c);
    if (alive && !c.crisis) maybeOffer(s, c);
    if (alive && !c.retired) s.used = Math.min(s.capacity ?? Infinity, (s.used ?? 0) + OWNER_SLOTS[c.stage - 1]); // 대표 칸이 먼저 빠진다
  }
  if (s.year === 2017 && cs.length) queueScene(s, '경천본보기', { title: '경천그룹 해체', text: '경천그룹이 해체됐다는 기사를 읽었습니다. 무리한 차입과 계열사 보증이 함께 무너졌다고 합니다. 책상 위의 대출 서류를 한 번 더 봤습니다.' });
  const g = s.companyMeta.guarantee;
  if (g > 0) { const pay = Math.min(g, Math.max(0, s.cash), Math.max(3e5, g * 0.04)); s.cash -= pay; s.companyMeta.guarantee = g - pay; }
  return s;
}
let installed = false;
export function install() { if (!installed) { installed = true; coreOnMonth((s) => onMonth(s)); } }
