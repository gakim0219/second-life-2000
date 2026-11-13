// 명품 착용과 카드(사용자 지시 2026-11-08).
// 착용 6칸: 옷·신발·가방·시계·장신구·안경. 칸마다 하나씩 입고, 입은 것만 효과를 낸다.
// 가게 명품은 매력·인맥만 올리고 중고로 팔 수 있다. 카드 아이템은 네 능력치와 특수 효과가 있고, 팔 수 없지만 버릴 수 있다.
// 카드: 매달 노멀 카드를 받는다(매력·인맥 구간이 높으면 더). 업적을 이루면 더 받는다.
// 카드를 까면 그 등급의 아이템이 하나 나온다(같은 것이 또 나올 수 있다, 다시 뽑기 없음). 같은 등급 10장은 다음 등급 1장으로 바꾼다.
// 효과는 s.stats에 직접 더하고 s.gear.applied에 적어 둔다. 원래 능력치 = s.stats - applied.
import { tierOf, stageOf, STAT_MAX } from './rules.js';
import { netWorth } from './invest.js';
import { ownBonus } from './devices.js';
import { featBonus, checkFeats, monthlyPerks } from './feats.js';

const M = 10000;
export const SLOTS = ['옷', '신발', '가방', '시계', '장신구', '안경'];
export const SLOT_ICON = { 옷: '🧥', 신발: '👞', 가방: '👜', 시계: '⌚', 장신구: '💍', 안경: '🕶️' };
export const TIERS = ['노멀', '유니크', '전설', '레전드'];
export const TIER_ICON = { 노멀: '⬜', 유니크: '🟦', 전설: '🟪', 레전드: '🟨' };
export const UPGRADE_N = 10;
const SHOP_CAP = 30, TOTAL_CAP = 80; // 착용 효과 합 상한. 능력치 상한 300(rules.STAT_MAX)

// ---------- 가게 명품 [연도, 이름, 값(만원)]. 값은 출시 무렵 국내 대략값 ----------
export const LUXURY = {
  옷: [[2000, '버버리 트렌치코트', 150], [2001, '휴고 보스 정장', 200], [2003, '겐조 니트', 90], [2004, '프라다 정장', 400], [2006, '조르지오 아르마니 정장', 450], [2008, '톰 브라운 수트', 500], [2010, '몽클레르 패딩', 200], [2012, '브리오니 맞춤 정장', 1500], [2013, '아크네 스튜디오 코트', 150], [2014, '캐나다구스 패딩', 120], [2016, '구찌 자수 재킷', 400], [2018, '발렌시아가 오버사이즈 코트', 450], [2019, '메종 마르지엘라 재킷', 350], [2020, '로로피아나 캐시미어 코트', 1200], [2022, '키톤 맞춤 정장', 2000], [2024, '에르메스 가죽 재킷', 2500], [2026, '브루넬로 쿠치넬리 캐시미어 수트', 3000]],
  신발: [[2000, '페라가모 구두', 60], [2002, '구찌 홀스빗 로퍼', 80], [2003, '닥터마틴 1460 부츠', 25], [2005, '크리스찬 루부탱 구두', 100], [2008, '존롭 수제 구두', 250], [2011, '벨루티 구두', 350], [2013, '지미추 펌프스', 120], [2015, '골든구스 스니커즈', 60], [2017, '발렌시아가 트리플S', 110], [2019, '디올 B23 스니커즈', 130], [2021, '로로피아나 서머워크', 150], [2023, '로저 비비에 벨벳 슈즈', 160], [2024, '에르메스 바운싱 스니커즈', 170], [2026, '존롭 맞춤 부츠', 600]],
  가방: [[2000, '루이비통 스피디', 80], [2002, '프라다 나일론 백', 100], [2004, '구찌 재키백', 200], [2006, '샤넬 클래식 플랩', 350], [2008, '고야드 생루이', 180], [2009, '에르메스 켈리', 1200], [2012, '셀린느 러기지', 400], [2015, '에르메스 버킨', 1800], [2017, '구찌 마몬트', 280], [2018, '디올 새들백', 450], [2021, '샤넬 클래식 플랩 미디움', 1100], [2023, '에르메스 버킨 25', 2500], [2025, '보테가 베네타 안디아모', 700], [2026, '에르메스 켈리 25 악어', 8000]],
  시계: [[2000, '태그호이어 까레라', 300], [2001, '롤렉스 데이저스트', 600], [2003, '오메가 씨마스터', 400], [2005, '까르띠에 탱크', 500], [2007, '롤렉스 서브마리너', 900], [2009, '브라이틀링 내비타이머', 900], [2010, 'IWC 포르투기저', 1200], [2012, '오데마 피게 로열 오크', 3000], [2014, '롤렉스 데이토나', 1600], [2016, '파텍 필립 노틸러스', 5000], [2018, '바쉐론 콘스탄틴 오버시즈', 3500], [2019, '리차드 밀 RM 011', 20000], [2022, '롤렉스 데이토나 신형', 2500], [2024, '파텍 필립 칼라트라바', 4500], [2026, '리차드 밀 RM 67', 30000]],
  장신구: [[2000, '티파니 은목걸이', 30], [2002, '스와로브스키 목걸이', 20], [2003, '까르띠에 러브 팔찌', 600], [2006, '불가리 비제로원 반지', 150], [2009, '반클리프 아펠 알함브라 목걸이', 350], [2012, '까르띠에 저스트 앵 끌루', 800], [2014, '쇼메 조세핀 반지', 900], [2015, '티파니 1캐럿 다이아 반지', 2000], [2018, '불가리 세르펜티 목걸이', 1500], [2021, '반클리프 아펠 알함브라 팔찌', 700], [2024, '그라프 다이아 목걸이', 10000], [2026, '티파니 옐로 다이아 반지', 15000]],
  안경: [[2000, '레이밴 에비에이터', 20], [2001, '오클리 선글라스', 25], [2003, '샤넬 선글라스', 50], [2006, '톰포드 선글라스', 60], [2009, '까르띠에 안경테', 200], [2012, '린드버그 안경테', 100], [2015, '젠틀몬스터 선글라스', 30], [2018, '크롬하츠 안경테', 250], [2018, '모스콧 렘토쉬', 50], [2021, '디타 안경테', 120], [2024, '까르띠에 골드 안경테', 600], [2026, '까르띠에 다이아 안경테', 1200]],
};
export const SHOP_SHOW = 4;
const SHOP_STAT = { 옷: '매력', 신발: '매력', 가방: '매력', 시계: '인맥', 장신구: '매력', 안경: '인맥' };
// 값이 비쌀수록 효과가 크다. 같은 능력치의 가게 명품 효과는 합쳐서 +30까지.
export function luxuryBonus(price) {
  const man = price / M;
  return man < 50 ? 2 : man < 150 ? 4 : man < 500 ? 6 : man < 1500 ? 9 : man < 5000 ? 12 : 15;
}
// 중고값 [처음, 해마다, 바닥, 최고]. 인기 시계와 에르메스·샤넬 가방은 값이 오른다.
const VALUE_UP = /롤렉스|파텍|오데마|리차드 밀|에르메스|샤넬/;
function deprOf(it) {
  if (VALUE_UP.test(it.name)) return [0.95, 1.04, 0.5, 2.5];
  return { 옷: [0.4, 0.8, 0.05, 1], 신발: [0.3, 0.8, 0.05, 1], 가방: [0.5, 0.85, 0.1, 1], 시계: [0.7, 0.9, 0.2, 1], 장신구: [0.6, 0.95, 0.3, 1], 안경: [0.3, 0.8, 0.05, 1] }[it.slot];
}

// ---------- 카드 아이템. eff: 능력치 더하기, 특수: talk(대화 호감 배율), cap(활동 칸), fatigue(피곤함 배율), dateSafe(데이트 실패 확률 배율) ----------
export const CARD_ITEMS = [
  // 노멀 +3~5
  ['n01', '노멀', '옷', '손뜨개 니트', { 매력: 4 }], ['n02', '노멀', '옷', '빈티지 청재킷', { 매력: 3, 인맥: 2 }],
  ['n03', '노멀', '신발', '오래 신은 운동화', { 체력: 4 }], ['n04', '노멀', '신발', '반짝이는 구두', { 매력: 4 }],
  ['n05', '노멀', '가방', '낡은 가죽 서류가방', { 지능: 4 }], ['n06', '노멀', '가방', '캔버스 토트백', { 매력: 3, 체력: 1 }],
  ['n07', '노멀', '시계', '아버지의 오래된 시계', { 인맥: 4 }], ['n08', '노멀', '시계', '계산기 전자시계', { 지능: 3 }],
  ['n09', '노멀', '장신구', '은반지', { 매력: 4 }], ['n10', '노멀', '장신구', '행운의 팔찌', { 인맥: 4 }],
  ['n11', '노멀', '안경', '뿔테 안경', { 지능: 5 }], ['n12', '노멀', '안경', '동그란 선글라스', { 매력: 4 }],
  ['n13', '노멀', '옷', '교복 위에 걸친 후드티', { 체력: 2, 인맥: 2 }], ['n14', '노멀', '옷', '다림질한 흰 셔츠', { 매력: 3, 지능: 1 }],
  ['n15', '노멀', '신발', '축구화', { 체력: 5 }], ['n16', '노멀', '신발', '캔버스 운동화', { 매력: 2, 인맥: 2 }],
  ['n17', '노멀', '가방', '필통이 든 백팩', { 지능: 3, 체력: 1 }], ['n18', '노멀', '가방', '명함 지갑', { 인맥: 4 }],
  ['n19', '노멀', '시계', '스포츠 손목시계', { 체력: 3, 지능: 1 }], ['n20', '노멀', '시계', '졸업 선물 시계', { 인맥: 3, 매력: 1 }],
  ['n21', '노멀', '장신구', '커플링', { 매력: 3, 인맥: 1 }], ['n22', '노멀', '장신구', '부적 키링', { 체력: 2, 지능: 2 }],
  ['n23', '노멀', '안경', '블루라이트 안경', { 지능: 4 }], ['n24', '노멀', '안경', '스포츠 고글', { 체력: 4 }],
  // 유니크 +8~12
  ['u01', '유니크', '옷', '장인 맞춤 셔츠', { 매력: 10 }], ['u02', '유니크', '옷', '한정판 트랙수트', { 체력: 10 }],
  ['u03', '유니크', '신발', '한정판 스니커즈', { 매력: 8, 인맥: 4 }], ['u04', '유니크', '신발', '장인 수제 구두', { 인맥: 10 }],
  ['u05', '유니크', '가방', '메모가 가득한 가방', { 지능: 10 }], ['u06', '유니크', '가방', '여행자의 배낭', { 체력: 8, 인맥: 4 }],
  ['u07', '유니크', '시계', '빈티지 크로노그래프', { 인맥: 10 }], ['u08', '유니크', '시계', '항해사의 시계', { 체력: 6, 지능: 6 }],
  ['u09', '유니크', '장신구', '행운의 만년필 브로치', { 지능: 12 }], ['u10', '유니크', '장신구', '할머니의 진주 브로치', { 매력: 10 }],
  ['u11', '유니크', '안경', '책벌레의 금테 안경', { 지능: 12 }], ['u12', '유니크', '안경', '파일럿 선글라스', { 매력: 8, 체력: 4 }],
  ['u13', '유니크', '옷', '무대 의상 재킷', { 매력: 12 }], ['u14', '유니크', '옷', '산악인의 고어텍스', { 체력: 9, 인맥: 3 }],
  ['u15', '유니크', '신발', '마라톤 기록화', { 체력: 12 }], ['u16', '유니크', '신발', '면접 날의 구두', { 인맥: 6, 매력: 6 }],
  ['u17', '유니크', '가방', '연구 노트 가방', { 지능: 9, 체력: 3 }], ['u18', '유니크', '가방', '사인이 가득한 가방', { 인맥: 12 }],
  ['u19', '유니크', '시계', '첫 월급 시계', { 인맥: 8, 지능: 4 }], ['u20', '유니크', '시계', '다이버 시계', { 체력: 10, fatigue: 0.95 }],
  ['u21', '유니크', '장신구', '은사의 넥타이핀', { 인맥: 8, 지능: 4 }], ['u22', '유니크', '장신구', '반짝이는 귀걸이', { 매력: 12 }],
  ['u23', '유니크', '안경', '밤샘의 돋보기', { 지능: 10, fatigue: 0.95 }], ['u24', '유니크', '안경', '연예인 선글라스', { 매력: 10, 인맥: 2 }],
  // 전설: 두 능력치 +12~18 또는 특수 효과
  ['l01', '전설', '옷', '이름 모를 재단사의 턱시도', { 매력: 18, 인맥: 12 }], ['l02', '전설', '신발', '마라토너의 러닝화', { 체력: 18, fatigue: 0.8 }],
  ['l03', '전설', '가방', '수첩이 가득한 서류가방', { 지능: 15, 인맥: 15 }], ['l04', '전설', '시계', '한 세기를 지난 회중시계', { 인맥: 18, 지능: 10 }],
  ['l05', '전설', '장신구', '첫사랑의 반지', { 매력: 15, dateSafe: 0.5 }], ['l06', '전설', '안경', '천재의 안경', { 지능: 18, 인맥: 10 }],
  ['l07', '전설', '옷', '국가대표 단복', { 체력: 18, 인맥: 12 }], ['l08', '전설', '신발', '레드카펫 하이힐', { 매력: 20, talk: 1.1 }],
  ['l09', '전설', '가방', '투자자의 가죽 가방', { 인맥: 18, 지능: 12 }], ['l10', '전설', '시계', '우주인의 시계', { 지능: 15, 체력: 15 }],
  ['l11', '전설', '장신구', '가문의 인장 반지', { 인맥: 20, 매력: 10 }], ['l12', '전설', '안경', '예언자의 안경', { 지능: 20, dateSafe: 0.8 }],
  ['l13', '전설', '옷', '밤을 새운 연구 가운', { 지능: 18, fatigue: 0.85 }], ['l14', '전설', '시계', '약속을 지키는 시계', { 인맥: 15, 매력: 12, cap: 1 }],
  // 레전드: 세 능력치 이상 +20과 특수 효과
  ['g01', '레전드', '옷', '시간을 거슬러 온 코트', { 지능: 20, 매력: 20, 인맥: 20, talk: 1.3 }],
  ['g02', '레전드', '시계', '멈추지 않는 시계', { 체력: 20, 지능: 20, 인맥: 20, cap: 1 }],
  ['g03', '레전드', '장신구', '별을 담은 목걸이', { 매력: 25, 인맥: 20, 지능: 10, talk: 1.3 }],
  ['g04', '레전드', '신발', '어디든 가는 신발', { 체력: 25, 매력: 20, 인맥: 10, fatigue: 0.7 }],
  ['g05', '레전드', '안경', '미래가 비치는 안경', { 지능: 35, 인맥: 15, 매력: 10 }],
  ['g06', '레전드', '가방', '끝이 없는 가방', { 지능: 20, 체력: 20, 인맥: 25 }],
  ['g07', '레전드', '옷', '빛의 수트', { 매력: 35, 인맥: 20, talk: 1.4 }],
  ['g08', '레전드', '장신구', '두 번째 인생의 반지', { 지능: 20, 체력: 20, 매력: 20, 인맥: 20, dateSafe: 0.5 }],
  ['g09', '레전드', '신발', '지치지 않는 운동화', { 체력: 35, 지능: 10, fatigue: 0.6, cap: 1 }],
  ['g10', '레전드', '시계', '돌아오는 시계', { 지능: 25, 인맥: 25, 체력: 10 }],
].map(([id, tier, slot, name, eff]) => ({ id, tier, slot, name, eff }));
const STAT_KEYS = ['지능', '체력', '매력', '인맥'];
export const SPECIAL_TEXT = { talk: (v) => `대화 호감 ×${v}`, cap: (v) => `활동 칸 +${v}`, fatigue: (v) => `피곤함 ${Math.round((1 - v) * 100)}% 덜`, dateSafe: (v) => `데이트 실패 ${Math.round((1 - v) * 100)}% 덜` };
export function effText(eff) {
  return Object.entries(eff).map(([k, v]) => (STAT_KEYS.includes(k) ? `${k} +${v}` : SPECIAL_TEXT[k](v))).join(' · ');
}

// ---------- 상태 ----------
export function gearOf(s) {
  s.gear ??= { items: [], worn: {}, applied: {}, next: 1 };
  s.cards ??= { 노멀: 0, 유니크: 0, 전설: 0, 레전드: 0 };
  s.cardMarks ??= [];
  return s.gear;
}
const ymOf = (s) => s.year * 12 + s.month - 1;
const hash = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 1597334677); h ^= h >>> 16; return h >>> 0; };
export const shopOpen = (s) => !!s.parentsHome;
export const baseStat = (s, k) => s.stats[k] - (s.gear?.applied?.[k] ?? 0);
export const bonusOf = (s, k) => s.gear?.applied?.[k] ?? 0;

// 입은 것으로 효과를 다시 계산해 s.stats에 반영한다.
export function applyGear(s) {
  const g = gearOf(s), shop = {}, card = {};
  let talk = 1, cap = 0, fatigue = 1, dateSafe = 1;
  for (const slot of SLOTS) {
    const it = g.items.find((x) => x.uid === g.worn[slot]); if (!it) { delete g.worn[slot]; continue; }
    if (it.src === 'shop') shop[it.stat] = (shop[it.stat] ?? 0) + it.bonus;
    else for (const [k, v] of Object.entries(it.eff)) {
      if (STAT_KEYS.includes(k)) card[k] = (card[k] ?? 0) + v;
      else if (k === 'talk') talk *= v; else if (k === 'cap') cap += v; else if (k === 'fatigue') fatigue *= v; else if (k === 'dateSafe') dateSafe *= v;
    }
  }
  const own = ownBonus(s), feat = featBonus(s); // 기기·탈것·평생 업적은 착용 상한과 따로 더한다
  for (const k of STAT_KEYS) {
    const want = Math.min(TOTAL_CAP, Math.min(SHOP_CAP, shop[k] ?? 0) + (card[k] ?? 0)) + (own[k] ?? 0) + (feat[k] ?? 0);
    const base = s.stats[k] - (g.applied[k] ?? 0);
    const now = Math.max(0, Math.min(STAT_MAX, base + want));
    g.applied[k] = now - base; s.stats[k] = now;
    if (!g.applied[k]) delete g.applied[k];
  }
  g.talk = Math.min(1.6, talk); g.cap = Math.min(2, cap); g.fatigue = Math.max(0.5, fatigue); g.dateSafe = Math.max(0.25, dateSafe);
  return g;
}
export const wornList = (s) => { const g = gearOf(s); return SLOTS.map((slot) => ({ slot, item: g.items.find((x) => x.uid === g.worn[slot]) ?? null })); };
export function wear(s, uid) {
  const g = gearOf(s), it = g.items.find((x) => x.uid === uid); if (!it) return { ok: false, why: '가지고 있지 않습니다.' };
  g.worn[it.slot] = uid; applyGear(s);
  return { ok: true, text: `${it.name}을(를) 착용했습니다.` };
}
export function takeOff(s, slot) {
  const g = gearOf(s); if (!g.worn[slot]) return { ok: false, why: '착용한 것이 없습니다.' };
  delete g.worn[slot]; applyGear(s);
  return { ok: true, text: '벗었습니다.' };
}
function removeItem(s, uid) {
  const g = gearOf(s);
  for (const slot of SLOTS) if (g.worn[slot] === uid) delete g.worn[slot];
  g.items = g.items.filter((x) => x.uid !== uid); applyGear(s);
}
const newItem = (s, x) => { const g = gearOf(s); const it = { uid: g.next++, year: s.year, month: s.month, ...x }; g.items.push(it); return it; };

// ---------- 가게 ----------
export function shopList(s, slot) {
  const g = gearOf(s), mine = new Set(g.items.filter((x) => x.src === 'shop').map((x) => x.name));
  return LUXURY[slot].filter(([y, n]) => y <= s.year && !mine.has(n)).slice(-SHOP_SHOW).reverse().map(([year, name, man]) => {
    const price = man * M, why = s.cash >= price ? null : '현금이 모자랍니다.';
    return { slot, year, name, price, stat: SHOP_STAT[slot], bonus: luxuryBonus(price), ok: !why, why };
  });
}
export function buyLuxury(s, slot, name) {
  if (!shopOpen(s)) return { ok: false, why: '아직 살 수 없습니다.' };
  const x = shopList(s, slot).find((d) => d.name === name); if (!x) return { ok: false, why: '지금은 팔지 않습니다.' };
  if (!x.ok) return { ok: false, why: x.why };
  s.cash -= x.price;
  const it = newItem(s, { src: 'shop', slot, name, price: x.price, stat: x.stat, bonus: x.bonus });
  const g = gearOf(s); if (!g.worn[slot]) { g.worn[slot] = it.uid; applyGear(s); }
  s.log.push(`${name}을(를) 샀습니다.`);
  return { ok: true, item: it, text: `${name}을(를) 샀습니다.${g.worn[slot] === it.uid ? ' 바로 착용했습니다.' : ''}` };
}
export function resaleOf(s, it) {
  if (it.src !== 'shop') return 0;
  const [first, yearly, floor, top] = deprOf(it);
  const years = Math.max(0, (ymOf(s) - (it.year * 12 + it.month - 1)) / 12);
  return Math.round(it.price * Math.min(top, Math.max(floor, first * yearly ** years)) / 1000) * 1000;
}
export function sellLuxury(s, uid) {
  const it = gearOf(s).items.find((x) => x.uid === uid); if (!it) return { ok: false, why: '가지고 있지 않습니다.' };
  if (it.src !== 'shop') return { ok: false, why: '카드에서 나온 물건은 팔 수 없습니다. 버릴 수는 있습니다.' };
  const money = resaleOf(s, it); removeItem(s, uid); s.cash += money;
  s.log.push(`${it.name}을(를) 중고로 팔았습니다.`);
  return { ok: true, money, text: `${it.name}을(를) 팔았습니다.` };
}
export function discard(s, uid) {
  const it = gearOf(s).items.find((x) => x.uid === uid); if (!it) return { ok: false, why: '가지고 있지 않습니다.' };
  removeItem(s, uid);
  return { ok: true, text: `${it.name}을(를) 버렸습니다.` };
}
export function itemsOf(s) {
  const g = gearOf(s), worn = new Set(Object.values(g.worn));
  return g.items.map((it) => ({ ...it, worn: worn.has(it.uid), resale: resaleOf(s, it), text: it.src === 'shop' ? `${it.stat} +${it.bonus}` : effText(it.eff) }));
}

// ---------- 카드 ----------
// 매달 받는 수: 기본 1장, 매력 3구간부터 +1, 인맥 4구간부터 +1.
export const monthlyCards = (s) => 1 + (tierOf(s.stats.매력) >= 3 ? 1 : 0) + (tierOf(s.stats.인맥) >= 4 ? 1 : 0) + (tierOf(s.stats.인맥) >= 6 ? 1 : 0);
const worth = (s) => { try { return netWorth(s); } catch { return 0; } };
// 업적: 한 번만 받는다. [id, 이름, 조건, 등급, 장수]
export const ACHIEVEMENTS = [
  ['mid', '중학교 입학', (s) => stageOf(s) !== '초등', '노멀', 3],
  ['high', '고등학교 입학', (s) => !['초등', '중학'].includes(stageOf(s)), '노멀', 3],
  ['adult', '스무 살', (s) => s.year - (s.birthYear ?? 1989) >= 20, '유니크', 1],
  ['work', '사회인이 되었다', (s) => stageOf(s) === '사회인', '유니크', 1],
  ['license', '운전면허 합격', (s) => !!s.license?.ym, '노멀', 5],
  ['love', '첫 연인', (s) => !!s.partner, '노멀', 5],
  ['marry', '결혼', (s) => !!s.partner?.married, '전설', 1],
  ['company', '첫 회사', (s) => !!s.company, '유니크', 2],
  ['contest', '대회 첫 입상', (s) => (s.contestAwards ?? []).length > 0, '유니크', 1],
  ...['지능', '체력', '매력', '인맥'].flatMap((k) => [[`${k}3`, `${k} 3구간`, (s) => tierOf(baseStat(s, k)) >= 3, '노멀', 5], [`${k}4`, `${k} 4구간`, (s) => tierOf(baseStat(s, k)) >= 4, '유니크', 1], [`${k}5`, `${k} 5구간`, (s) => tierOf(baseStat(s, k)) >= 5, '유니크', 3], [`${k}6`, `${k} 6구간`, (s) => tierOf(s.stats[k]) >= 6, '전설', 1], [`${k}7`, `${k} 7구간`, (s) => tierOf(s.stats[k]) >= 7, '레전드', 1]]),
  ['w1e8', '순자산 1억', (s) => worth(s) >= 1e8, '노멀', 5],
  ['w1e9', '순자산 10억', (s) => worth(s) >= 1e9, '유니크', 1],
  ['w1e10', '순자산 100억', (s) => worth(s) >= 1e10, '유니크', 5],
  ['w1e11', '순자산 1000억', (s) => worth(s) >= 1e11, '전설', 1],
  ['w1e12', '순자산 1조', (s) => worth(s) >= 1e12, '전설', 3],
  ['w1e13', '순자산 10조', (s) => worth(s) >= 1e13, '레전드', 1],
].map(([id, label, test, tier, n]) => ({ id, label, test, tier, n }));
export function checkAchievements(s) {
  gearOf(s); const got = [];
  for (const a of ACHIEVEMENTS) {
    if (s.cardMarks.includes(a.id)) continue;
    let ok = false; try { ok = a.test(s); } catch { ok = false; }
    if (!ok) continue;
    s.cardMarks.push(a.id); s.cards[a.tier] += a.n; got.push(a);
    s.log.push(`업적 '${a.label}': ${a.tier} 카드 ${a.n}장을 받았습니다.`);
  }
  return got;
}
export function achievementList(s) {
  gearOf(s);
  return ACHIEVEMENTS.map((a) => ({ id: a.id, label: a.label, tier: a.tier, n: a.n, done: s.cardMarks.includes(a.id) }));
}
// 달이 바뀔 때 호출.
export function monthly(s) {
  gearOf(s);
  const n = monthlyCards(s); s.cards.노멀 += n;
  checkAchievements(s);
  checkFeats(s);
  monthlyPerks(s);
  applyGear(s);
  return n;
}
export function upgrade(s, tier) {
  gearOf(s); const i = TIERS.indexOf(tier);
  if (i < 0 || i >= TIERS.length - 1) return { ok: false, why: '더 올릴 수 없는 등급입니다.' };
  if (s.cards[tier] < UPGRADE_N) return { ok: false, why: `${tier} 카드 ${UPGRADE_N}장이 필요합니다. 지금 ${s.cards[tier]}장입니다.` };
  s.cards[tier] -= UPGRADE_N; s.cards[TIERS[i + 1]] += 1;
  return { ok: true, to: TIERS[i + 1], text: `${tier} 카드 ${UPGRADE_N}장을 ${TIERS[i + 1]} 카드 1장으로 바꿨습니다.` };
}
export function openCard(s, tier) {
  const g = gearOf(s);
  if (!(s.cards[tier] > 0)) return { ok: false, why: `${tier} 카드가 없습니다.` };
  const pool = CARD_ITEMS.filter((x) => x.tier === tier);
  s.cardOpened = (s.cardOpened ?? 0) + 1;
  const pickd = pool[hash(`${s.seed ?? 1}:${s.year}:${s.month}:card${s.cardOpened}`) % pool.length];
  s.cards[tier] -= 1;
  const it = newItem(s, { src: 'card', tier, slot: pickd.slot, name: pickd.name, cid: pickd.id, eff: { ...pickd.eff } });
  if (!g.worn[it.slot]) { g.worn[it.slot] = it.uid; applyGear(s); }
  s.log.push(`${tier} 카드에서 ${it.name}이(가) 나왔습니다.`);
  return { ok: true, item: { ...it, text: effText(it.eff) }, worn: g.worn[it.slot] === it.uid };
}
