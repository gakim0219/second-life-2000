// 전자기기와 차량. 부모님이 내 돈을 알고 이사까지 마치면 살 수 있다.
// 가게에는 그해까지 나온 제품 중 내가 가지지 않은 최근 것만 보인다(사용자 지시 2026-11-08). 산 것은 중고값으로 되팔 수 있다.
// 항목은 [출시 해, 이름, 만원, 출시 달]. 출시 달부터 가게에 보인다(사용자 지시 2026-11-09). 값은 출시 당시 기본 모델의 대략값이다. 자산에 잡히지 않는 소비다. 노트북이 있으면 코딩 공부가 열린다.
// 차량(국산·수입 고급차·슈퍼카)은 만 18세가 넘고 운전면허 시험에 붙어야 살 수 있다.
// 요트와 개인 비행기는 선장·승무원·조종사를 따로 두어야 해서 매달 운영비가 나간다(사용자 지시 2026-11-08). 못 내면 중고값에 판다.
import { applyGear } from './gear.js';
const M = 10000;
export const PHONES = [
  [1998, '모토로라 스타택', 70, 1], [2000, '삼성 애니콜 듀얼폴더', 50, 1], [2000, 'LG 싸이언 폴더폰', 45, 1], [2000, '스카이 폴더폰', 55, 7], [2001, '모토로라 V60', 60, 4],
  [2002, '삼성 애니콜 컬러폰', 55, 3], [2003, '스카이 컬러폰', 60, 4], [2004, '삼성 애니콜 가로본능', 75, 11], [2005, '모토로라 레이저 V3', 60, 4], [2005, 'LG 싸이언 초콜릿폰', 55, 11],
  [2006, '삼성 애니콜 울트라 에디션', 60, 9], [2006, 'LG 샤인폰', 60, 11],
  [2007, 'LG 프라다폰', 88, 3], [2008, '삼성 햅틱', 90, 3], [2009, '아이폰 3GS', 81, 11], [2010, '갤럭시 S', 95, 6], [2010, '아이폰 4', 81, 9], [2011, '갤럭시 노트', 99, 11], [2012, '갤럭시 S3', 99, 6], [2012, '아이폰 5', 81, 12],
  [2013, '갤럭시 S4', 89, 4], [2013, '아이폰 5s', 81, 10], [2014, '아이폰 6', 85, 10], [2015, '갤럭시 S6', 85, 4], [2016, '갤럭시 S7', 83, 3], [2017, '갤럭시 S8', 93, 4], [2017, '아이폰 X', 142, 11], [2018, '갤럭시 노트9', 109, 8],
  [2019, '갤럭시 S10', 105, 3], [2019, '갤럭시 폴드', 240, 9], [2020, '갤럭시 S20', 125, 3], [2021, '갤럭시 Z 플립3', 125, 8], [2021, '아이폰 13', 109, 10], [2022, '갤럭시 S22', 100, 2], [2023, '갤럭시 S23', 115, 2], [2023, '아이폰 15', 125, 10], [2024, '갤럭시 S24', 115, 1],
  [2025, '갤럭시 S25', 115, 2], [2025, '갤럭시 Z 폴드7', 240, 7], [2025, '아이폰 17', 125, 9], [2026, '갤럭시 S26', 125, 3],
];
export const LAPTOPS = [
  [2000, '삼성 센스 노트북', 250, 1], [2000, '삼보 드림북', 230, 1], [2000, 'IBM 씽크패드 T20', 350, 1], [2001, '애플 파워북 G4', 400, 2], [2002, 'IBM 씽크패드 X30', 300, 4], [2003, 'LG 엑스노트', 200, 6], [2004, '삼성 센스 Q30', 250, 3],
  [2005, '소니 바이오 TX', 280, 10], [2006, '애플 맥북', 170, 6], [2007, '삼성 센스 Q45', 190, 6], [2008, '맥북 에어', 230, 2], [2009, '삼성 센스 N310 넷북', 60, 6], [2010, '맥북 에어 11형', 130, 11], [2011, '삼성 시리즈9', 190, 3],
  [2012, '맥북 프로 레티나', 270, 7], [2013, '맥북 에어 13형 (2013)', 150, 6], [2014, 'LG 그램', 150, 1], [2015, '맥북 12형', 190, 4], [2016, '맥북 프로 터치바', 230, 11], [2017, '삼성 노트북9 올웨이즈', 170, 2],
  [2018, '삼성 노트북 펜', 170, 1], [2019, 'LG 그램 17', 200, 1], [2020, '맥북 에어 M1', 130, 11], [2021, '맥북 프로 M1 Pro', 270, 10], [2022, '갤럭시북2 프로', 180, 3], [2023, 'LG 그램 16', 200, 1], [2024, '맥북 프로 M4', 240, 11],
  [2025, '맥북 에어 M4', 150, 3], [2025, '맥북 프로 M5', 240, 10], [2026, '갤럭시북6 프로', 220, 1],
];
export const CARS = [
  [1998, '현대 EF 쏘나타', 1500, 3], [1999, '대우 마티즈', 600, 1], [1999, '현대 에쿠스', 5000, 4], [2000, '현대 아반떼 XD', 1050, 4], [2000, '기아 카렌스', 1300, 6],
  [2001, '르노삼성 SM5', 1800, 1], [2001, '현대 싼타페', 1900, 6], [2002, '기아 쏘렌토', 2100, 2], [2002, 'GM대우 라세티', 1050, 11], [2003, '기아 오피러스', 3800, 3], [2004, '기아 모닝', 800, 2], [2004, '현대 NF 쏘나타', 1800, 9],
  [2005, '기아 프라이드', 1000, 4], [2005, '현대 그랜저 TG', 2500, 5], [2006, '현대 아반떼 HD', 1200, 4], [2007, '현대 i30', 1500, 10], [2008, '현대 제네시스', 4000, 1], [2008, '기아 모하비', 3500, 1], [2009, '현대 YF 쏘나타', 2100, 9], [2010, '기아 K5', 2100, 5],
  [2011, '현대 그랜저 HG', 3100, 1], [2012, '기아 K3', 1500, 9], [2013, '쉐보레 트랙스', 1950, 2], [2014, '현대 LF 쏘나타', 2250, 3], [2015, '현대 아반떼 AD', 1550, 9], [2015, '제네시스 EQ900', 7300, 12], [2016, '제네시스 G80', 4800, 8],
  [2017, '기아 스팅어', 3500, 5], [2017, '현대 코나', 1900, 6], [2018, '현대 팰리세이드', 3500, 12], [2019, '현대 쏘나타 DN8', 2350, 3], [2019, '기아 셀토스', 1950, 7], [2020, '제네시스 GV80', 6000, 1], [2021, '현대 아이오닉 5', 5000, 4], [2021, '기아 EV6', 4800, 8],
  [2022, '기아 니로 2세대', 2700, 1], [2022, '현대 아이오닉 6', 5200, 9], [2022, '현대 그랜저 GN7', 3700, 11], [2023, '현대 코나 2세대', 2500, 1], [2023, '기아 EV9', 7300, 6], [2024, '기아 EV3', 4200, 7],
  [2025, '현대 팰리세이드 LX3', 4400, 1], [2025, '현대 넥쏘 2세대', 7600, 6], [2026, '기아 셀토스 2세대', 2300, 1],
];
export const IMPORTS = [
  [1998, '벤츠 S클래스', 13000, 1], [1999, '페라리 360 모데나', 25000, 3], [2000, '포르쉐 911 카레라', 13000, 1], [2001, '벤츠 SL', 15000, 10], [2002, 'BMW 7시리즈', 14000, 9], [2003, '롤스로이스 팬텀', 50000, 1],
  [2003, '람보르기니 가야르도', 32000, 3], [2003, '벤틀리 컨티넨탈 GT', 28000, 9], [2004, '마이바흐 62', 70000, 1], [2004, '포르쉐 카레라 GT', 70000, 1], [2005, 'BMW 3시리즈', 4800, 4], [2005, '부가티 베이론', 200000, 9],
  [2006, '아우디 R8', 20000, 10], [2007, 'BMW M3', 10000, 9], [2008, '페라리 캘리포니아', 25000, 10], [2009, '벤츠 E클래스', 6500, 9], [2009, '페라리 458 이탈리아', 35000, 9], [2010, '포르쉐 파나메라', 15000, 4], [2011, '람보르기니 아벤타도르', 57000, 3], [2012, '맥라렌 MP4-12C', 35000, 1],
  [2013, '롤스로이스 레이스', 40000, 3], [2014, '벤츠 마이바흐 S클래스', 23000, 11], [2015, '페라리 488 GTB', 35000, 3], [2016, '벤틀리 벤테이가', 27000, 1], [2016, '부가티 시론', 350000, 3], [2017, '맥라렌 720S', 33000, 3], [2017, '테슬라 모델 S', 12000, 6],
  [2018, '람보르기니 우루스', 25000, 1], [2018, '롤스로이스 컬리넌', 47000, 5], [2019, '페라리 SF90', 53000, 5], [2019, '포르쉐 타이칸', 15000, 9], [2020, '롤스로이스 고스트', 40000, 9], [2021, '테슬라 모델 Y', 6000, 2], [2021, '벤츠 마이바흐 S680', 27000, 11],
  [2022, 'BMW i7', 19000, 12], [2023, '페라리 푸로산게', 55000, 1], [2023, '람보르기니 레부엘토', 60000, 3], [2023, '롤스로이스 스펙터', 62000, 10], [2024, '맥라렌 750S', 45000, 4], [2025, '페라리 F80', 500000, 10],
];
// 요트·비행기는 등급 이름으로 적는다. 값은 출시 무렵 원화 대략값(만원).
export const YACHTS = [
  [2000, '아지무트 50 (15m)', 150000], [2000, '써니시커 프레데터 68 (21m)', 350000], [2003, '페레티 70 (21m)', 450000], [2005, '베네티 30m 슈퍼요트', 1500000],
  [2008, '써니시커 88 (27m)', 800000], [2010, '아지무트 72 (22m)', 400000], [2012, '베네티 40m 슈퍼요트', 3000000], [2015, '뤼르센 60m 메가요트', 10000000],
  [2018, '아지무트 그란데 27m', 1300000], [2020, '산로렌초 SX88 (27m)', 1000000], [2023, '페드십 80m 메가요트', 30000000],
];
export const JETS = [
  [2000, '세스나 사이테이션 엑셀', 1100000], [2000, '걸프스트림 V', 4500000], [2001, '보잉 비즈니스 제트(BBJ)', 6000000], [2003, '봄바디어 챌린저 300', 2500000],
  [2004, '걸프스트림 G550', 5500000], [2007, '다쏘 팔콘 7X', 5000000], [2008, '엠브라에르 페놈 100', 450000], [2012, '걸프스트림 G650', 8000000],
  [2015, '혼다제트', 550000], [2016, '에어버스 ACJ320neo', 13000000], [2018, '봄바디어 글로벌 7500', 9000000], [2022, '걸프스트림 G700', 10500000], [2025, '봄바디어 글로벌 8000', 10500000],
];
export const SHOW = 4, CAR_SHOW = 6;
export const KINDS = ['핸드폰', '노트북', '차량', '수입차', '요트', '비행기'];
export const KIND_LABEL = { 핸드폰: '핸드폰', 노트북: '노트북', 차량: '국산차', 수입차: '해외 고급차·슈퍼카', 요트: '요트', 비행기: '개인 비행기' };
export const KIND_ICON = { 핸드폰: '📱', 노트북: '💻', 차량: '🚗', 수입차: '🏎️', 요트: '🛥️', 비행기: '🛩️' };
const LIST = { 핸드폰: PHONES, 노트북: LAPTOPS, 차량: CARS, 수입차: IMPORTS, 요트: YACHTS, 비행기: JETS };
const DRIVE = new Set(['차량', '수입차']);
// 매달 운영비: 요트는 선장·승무원·정박료·정비(값의 연 약 10%), 비행기는 조종사 2명·승무원·격납고·정비(값의 연 약 6% + 인건비).
export function upkeepFor(kind, price) {
  if (kind === '요트') return Math.round((500 * M + price * 0.008) / M) * M;
  if (kind === '비행기') return Math.round((2000 * M + price * 0.005) / M) * M;
  return 0;
}
export const UPKEEP_NOTE = { 요트: '선장·승무원 급여, 정박료, 정비비', 비행기: '조종사·승무원 급여, 격납고, 정비비' };
const owned = (s) => (s.devices ??= []);
const ymOf = (s) => s.year * 12 + s.month - 1;
export const devicesOpen = (s) => !!s.parentsHome;
export const hasLaptop = (s) => (s.devices ?? []).some((d) => d.kind === '노트북');
export const myDevices = (s) => s.devices ?? [];
export const ageOf = (s) => s.year - (s.birthYear ?? 1989);

// ---------- 운전면허 ----------
// 2011.6~2016.12은 시험이 간소화되어 싸고 잘 붙었다. 2016.12 다시 어려워졌다. 학원비 포함 대략값.
export const LICENSE_AGE = 18;
const EASY_FROM = 2011 * 12 + 5, EASY_TO = 2016 * 12 + 11;
export function licenseRule(s) {
  const i = ymOf(s);
  if (i >= EASY_FROM && i < EASY_TO) return { fee: 30 * M, pass: 0.9, note: '간소화된 시험이라 대부분 붙습니다.' };
  if (i >= EASY_TO) return { fee: 70 * M, pass: 0.6, note: '2016년 말부터 기능 시험이 다시 어려워졌습니다.' };
  return { fee: 60 * M, pass: 0.6, note: '기능과 도로 주행에서 많이 떨어집니다.' };
}
export const hasLicense = (s) => !!s.license?.ym;
const hash = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 1597334677); h ^= h >>> 16; return h >>> 0; };
const chance = (s, salt) => hash(`${s.seed ?? 1}:${s.year}:${s.month}:${salt}`) / 4294967296;
// 처음에는 학원비 전부, 떨어진 뒤에는 재응시료만 낸다.
export function licenseInfo(s) {
  const r = licenseRule(s), tries = s.licenseTries ?? 0;
  const fee = tries > 0 ? Math.round(r.fee * 0.15 / M) * M : r.fee;
  const smart = Math.min(0.1, Math.max(0, ((s.stats?.지능 ?? 0) - 50) / 1500));
  const pass = Math.min(0.97, r.pass + smart);
  let why = null;
  if (hasLicense(s)) why = '이미 면허가 있습니다.';
  else if (ageOf(s) < LICENSE_AGE) why = `만 ${LICENSE_AGE}세부터 볼 수 있습니다. 지금 ${ageOf(s)}세입니다.`;
  else if (s.flags?.군입대 && !s.flags?.전역) why = '복무 중에는 볼 수 없습니다.';
  else if (s.used >= s.capacity) why = '이번 달 남은 칸이 없습니다.';
  else if (s.cash < fee) why = '현금이 모자랍니다.';
  return { ok: !why, why, fee, pass, tries, note: r.note, has: hasLicense(s) };
}
export function takeLicense(s) {
  const c = licenseInfo(s);
  if (!c.ok) return { ok: false, why: c.why };
  s.cash -= c.fee; s.used += 1;
  s.licenseTries = c.tries + 1;
  const passed = chance(s, `license${c.tries}`) < c.pass;
  if (passed) {
    s.license = { ym: ymOf(s), tries: s.licenseTries };
    s.log.push(`운전면허 시험에 붙었습니다.${s.licenseTries > 1 ? ` ${s.licenseTries}번째 만입니다.` : ''}`);
    return { ok: true, passed, fee: c.fee, text: '운전면허 시험에 붙었습니다. 이제 차를 살 수 있습니다.' };
  }
  s.log.push('운전면허 시험에서 떨어졌습니다.');
  return { ok: true, passed, fee: c.fee, text: '시험에서 떨어졌습니다. 다시 보면 재응시료만 냅니다.' };
}

// ---------- 사고팔기 ----------
const showOf = (kind) => (DRIVE.has(kind) ? CAR_SHOW : SHOW);
function gateOf(s, kind) {
  if (DRIVE.has(kind)) return carWhy(s);
  if (UPKEEP_NOTE[kind] && ageOf(s) < LICENSE_AGE) return `만 ${LICENSE_AGE}세부터 살 수 있습니다.`;
  return null;
}
function carWhy(s) {
  if (ageOf(s) < LICENSE_AGE) return `만 ${LICENSE_AGE}세가 되고 운전면허를 따야 살 수 있습니다.`;
  if (!hasLicense(s)) return '운전면허가 있어야 살 수 있습니다.';
  return null;
}
// 그해까지 나온 제품 중 내가 가지지 않은 최근 것.
export function deviceList(s, kind) {
  const mine = new Set(owned(s).filter((d) => d.kind === kind).map((d) => d.name));
  const gate = gateOf(s, kind);
  return LIST[kind].filter(([y, name, , mo = 1]) => y * 12 + mo - 1 <= ymOf(s) && !mine.has(name)).slice(-showOf(kind)).reverse().map(([year, name, man, mo = 1]) => {
    const price = man * M, why = gate ?? (s.cash >= price ? null : '현금이 모자랍니다.');
    return { kind, year, month: mo, name, price, upkeep: upkeepFor(kind, price), mine: false, ok: !why, why };
  });
}
export function buyDevice(s, kind, name) {
  if (!devicesOpen(s)) return { ok: false, why: '아직 살 수 없습니다.' };
  if (owned(s).some((d) => d.kind === kind && d.name === name)) return { ok: false, why: '이미 있습니다.' };
  const x = deviceList(s, kind).find((d) => d.name === name); if (!x) return { ok: false, why: '지금은 팔지 않습니다.' };
  if (!x.ok) return { ok: false, why: x.why };
  const first = kind === '노트북' && !hasLaptop(s);
  s.cash -= x.price; owned(s).push({ kind, name, year: s.year, month: s.month, price: x.price, ...(x.upkeep ? { upkeep: x.upkeep } : {}) });
  s.log.push(`${name}을(를) 샀습니다.`); applyGear(s);
  return { ok: true, price: x.price, unlocked: first, text: first ? `${name}을(를) 샀습니다. 이제 공부에서 코딩 공부를 할 수 있습니다.` : `${name}을(를) 샀습니다.` };
}
// 중고값. 사자마자 팔아도 값이 깎이고, 해마다 더 떨어진다. 기기는 빨리, 차는 천천히.
const DEPR = { 핸드폰: [0.7, 0.7, 0.05], 노트북: [0.7, 0.75, 0.05], 차량: [0.85, 0.88, 0.1], 수입차: [0.85, 0.9, 0.2], 요트: [0.85, 0.92, 0.15], 비행기: [0.85, 0.93, 0.15] };
export function resaleOf(s, d) {
  const [first, yearly, floor] = DEPR[d.kind] ?? DEPR.핸드폰;
  const years = Math.max(0, (ymOf(s) - (d.year * 12 + (d.month ?? 1) - 1)) / 12);
  return Math.round(d.price * Math.max(floor, first * yearly ** years) / 1000) * 1000;
}
export function ownedDevices(s) {
  return owned(s).map((d, i) => ({ ...d, i, resale: resaleOf(s, d) }));
}
export function sellDevice(s, i) {
  const d = owned(s)[i]; if (!d) return { ok: false, why: '가지고 있지 않습니다.' };
  const money = resaleOf(s, d);
  owned(s).splice(i, 1); s.cash += money; applyGear(s);
  s.log.push(`${d.name}을(를) 중고로 팔았습니다.`);
  const lost = d.kind === '노트북' && !hasLaptop(s);
  return { ok: true, money, lost, text: `${d.name}을(를) 팔았습니다.${lost ? ' 노트북이 없어 코딩 공부는 쉽니다.' : ''}` };
}

// 가진 것의 능력치 효과(사용자 지시 2026-11-09). 기기는 지능, 탈것은 매력·인맥.
// 기기: 가장 좋은 핸드폰 하나와 노트북 하나만 친다. 나온 지 5년이 넘으면 1 덜하다.
// 탈것: 매력·인맥마다 가장 좋은 한 대가 다 들고, 그 밖의 탈것은 한 대마다 +1(최대 +4). 요트·비행기는 인맥 쪽이 더 크다.
const VEHICLE = new Set(['차량', '수입차', '요트', '비행기']);
const VTIER = [[1500, 2, 1], [5000, 4, 2], [15000, 6, 4], [50000, 9, 6], [200000, 12, 9], [Infinity, 15, 12]];
const releaseOf = (d) => LIST[d.kind]?.find((x) => x[1] === d.name)?.[0] ?? d.year;
export function effectOf(s, d) {
  const man = d.price / M;
  if (d.kind === '핸드폰' || d.kind === '노트북') {
    const base = d.kind === '핸드폰' ? (releaseOf(d) < 2009 ? 1 : man < 100 ? 2 : man < 200 ? 3 : 4) : (man < 150 ? 3 : man < 250 ? 4 : 5);
    return { 지능: Math.max(1, base - (s.year - releaseOf(d) >= 5 ? 1 : 0)) };
  }
  if (!VEHICLE.has(d.kind)) return {};
  const [, a, b] = VTIER.find(([lim]) => man < lim);
  return d.kind === '요트' || d.kind === '비행기' ? { 매력: b, 인맥: a + 3 } : { 매력: a, 인맥: b };
}
export const effectText = (eff) => Object.entries(eff).map(([k, v]) => `${k} +${v}`).join(' · ');
export function ownBonus(s) {
  const out = {}, list = s.devices ?? [];
  for (const kind of ['핸드폰', '노트북']) {
    const best = Math.max(0, ...list.filter((d) => d.kind === kind).map((d) => effectOf(s, d).지능));
    if (best) out.지능 = (out.지능 ?? 0) + best;
  }
  const cars = list.filter((d) => VEHICLE.has(d.kind)).map((d) => effectOf(s, d));
  for (const k of ['매력', '인맥']) {
    if (!cars.length) break;
    out[k] = Math.max(...cars.map((e) => e[k])) + Math.min(4, cars.length - 1);
  }
  return out;
}

// 매달 운영비. 달이 바뀔 때 호출한다. 못 내면 그 항목을 중고값에 팔고 남은 값으로 낸다.
export const deviceUpkeep = (s) => (s.devices ?? []).reduce((a, d) => a + (d.upkeep ?? 0), 0);
export function monthly(s) {
  for (const d of [...(s.devices ?? [])]) {
    if (!d.upkeep) continue;
    if (s.cash >= d.upkeep) { s.cash -= d.upkeep; continue; }
    const money = resaleOf(s, d);
    s.devices.splice(s.devices.indexOf(d), 1);
    s.cash += money - d.upkeep;
    s.log.push(`운영비를 낼 수 없어 ${d.name}을(를) 중고로 팔았습니다. 받은 값에서 이번 달 운영비를 냈습니다.`);
  }
}
