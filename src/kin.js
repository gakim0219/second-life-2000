// 가족에게 해 주는 일(사용자 지시 2026-11-16): 네 살 아래 여동생 미영, 학생 때부터 부모님께 해 드리기.
// 학생 때 큰돈(100만원 이상)을 쓰려면 투자 계좌를 허락받았고, 가진 현금이 값의 3배 이상이어야 한다.
import { bump } from './bonds.js';
import { addStress, raise } from './rules.js';
import * as inv from './invest.js';

export const SIS = '미영', SIS_BORN = 1993, SIS_START = 60, BIG = 1e6, MINOR_TIMES = 3;
const ymOf = (s) => s.year * 100 + s.month, m12 = (s) => s.year * 12 + s.month;
const won = (n) => (n >= 1e8 ? `${Math.round(n / 1e7) / 10}억원` : `${Math.round(n / 1e4).toLocaleString('ko-KR')}만원`);
const minor = (s) => ymOf(s) < inv.ADULT_YM;
export const sisName = (s) => `${[...(s.name ?? '')][0] ?? ''}미영`;
export const sisCall = (s) => (s.sex === '여' ? '언니' : '오빠');
export const sisAge = (s) => s.year - SIS_BORN;
// 미영이 다니는 곳. 2000년 3월 초등학교 입학, 2012년 대학 입학, 2016년부터 직장인.
export function sisStage(s) {
  const v = ymOf(s);
  return v < 200003 ? '유치원' : v < 200603 ? '초등' : v < 200903 ? '중학' : v < 201203 ? '고등' : v < 201603 ? '대학' : '어른';
}
export function sisSchool(s) {
  const st = sisStage(s), y = s.year - (s.month < 3 ? 1 : 0);
  if (st === '유치원') return '유치원에 다닌다';
  if (st === '초등') return `초등학교 ${y - 1999}학년`;
  if (st === '중학') return `중학교 ${y - 2005}학년`;
  if (st === '고등') return `고등학교 ${y - 2008}학년`;
  if (st === '대학') return `대학교 ${y - 2011}학년`;
  return '직장에 다닌다';
}
// 저장에 미영이 없으면 넣는다. 옛 저장도 여기서 채운다.
export function initKin(s) {
  s.bonds ??= {};
  if (s.bonds[SIS] == null) s.bonds[SIS] = SIS_START;
  s.kin ??= {};
  s.kin.last ??= {};
  return s.kin;
}
// 물가: 해마다 3%씩. 만원 단위로 맞춘다.
const price = (s, base) => Math.max(1e4, Math.round(base * 1.03 ** (s.year - 2000) / 1e4) * 1e4);

// cool: 다시 할 수 있을 때까지의 달 수(0이면 한 번만). slot: 활동 칸. from/to: yyyymm.
const PARENT_GIFTS = {
  가전: { label: '가전제품을 바꿔 드린다', base: 1.5e6, cool: 36, bond: 3, calm: 2, text: '낡은 냉장고와 세탁기를 새것으로 바꿔 드렸다. 어머니가 냉장고 문을 몇 번이나 열었다 닫았다.' },
  여행: { label: '해외여행을 보내 드린다', base: 3e6, cool: 12, bond: 5, calm: 3, text: '부모님을 해외여행 보내 드렸다. 공항에서 아버지가 여권을 몇 번이나 꺼내 보았다. 돌아온 어머니의 사진첩이 한 권 늘었다.' },
  차: { label: '차를 사 드린다', base: 2e7, cool: 60, bond: 8, calm: 3, pick: true, text: '아버지께 새 차를 사 드렸다. 아버지는 괜한 짓 했다면서도 그날 저녁 동네를 세 바퀴 돌았다.' },
  빚: { label: '집안의 빚을 갚아 드린다', base: 3e7, cool: 0, bond: 10, calm: 5, text: '집안의 빚을 갚아 드렸다. 어머니가 통장을 덮고 한참 말이 없었다. 첫 번째 인생에서는 이 빚이 십 년을 갔다.' },
};
const SIS_ACTS = {
  숙제: { label: '숙제를 봐 준다', slot: 1, month: true, bond: 2, to: 201202, text: (s) => `미영의 숙제를 봐 주었다. 미영이 "${sisCall(s)}는 어떻게 다 알아?" 하고 물었다.`, run: (s) => raise(s, '지능', 0.2) },
  놀기: { label: '같이 논다', slot: 1, month: true, bond: 2, to: 201202, calm: 4, text: (s) => (sisStage(s) === '초등' ? '미영과 놀이터에서 해가 질 때까지 놀았다. 미영이 집에 가기 싫다고 그네를 붙잡았다.' : '미영과 떡볶이를 먹고 스티커 사진을 찍었다. 미영이 사진을 필통에 붙였다.') },
  밥: { label: '같이 밥을 먹는다', slot: 1, month: true, bond: 2, from: 201203, calm: 3, text: () => '미영과 밥을 먹었다. 요즘 지내는 이야기를 오래 들었다.' },
  용돈: { label: '용돈을 준다', month: true, bond: 1, to: 201602, cost: (s) => price(s, { 유치원: 5e3, 초등: 1e4, 중학: 3e4, 고등: 5e4, 대학: 3e5 }[sisStage(s)] ?? 1e4), text: (s) => `미영에게 용돈을 주었다. "${sisCall(s)} 최고!" 하는 소리가 방 밖까지 들렸다.` },
  선물: { label: '선물을 사 준다', cool: 3, bond: 3, base: 5e4, text: () => '미영이 갖고 싶어 하던 것을 사 주었다. 미영이 포장지를 버리지 않고 접어 두었다.' },
  학원: { label: '한 해 학원비를 대 준다', cool: 12, bond: 4, base: 3e6, from: 200003, to: 201111, flag: '미영_학원', text: () => '미영의 한 해 학원비를 내가 냈다. 어머니가 가계부에서 한 줄을 지웠다.' },
  연수: { label: '어학연수를 보내 준다', cool: 0, bond: 8, base: 3e7, from: 200903, to: 201602, flag: '미영_연수', text: (s) => `미영을 어학연수 보내 주었다. 공항에서 미영이 "${sisCall(s)}, 나 잘하고 올게" 하고 손을 흔들었다.` },
  등록금: { label: '대학 등록금을 내 준다', cool: 12, bond: 6, base: 8e6, from: 201201, to: 201602, flag: '미영_등록금', text: () => '미영의 한 해 등록금을 내가 냈다. 첫 번째 인생에서 미영은 학자금 대출을 서른이 넘어서야 다 갚았다.' },
  집: { label: '독립할 집 보증금을 보탠다', cool: 0, bond: 10, base: 1e8, from: 201603, flag: '미영_집', text: () => '미영이 독립할 집 보증금을 보탰다. 이삿날 미영이 열쇠를 들고 한참 웃었다.' },
};
// 부모님께 사 드릴 수 있는 차(사용자 지시 2026-11-16: 차를 고르고, 고른 차가 집에 보이게).
// [이름, 나온 해, 들어간 해, 나온 해의 값]. 값은 그 뒤 해마다 2%씩 오른다.
export const CARS = [
  ['아반떼', 2000, 2026, 1.1e7], ['카니발', 2000, 2026, 1.8e7], ['싼타페', 2001, 2026, 2.0e7],
  ['EF 쏘나타', 2000, 2004, 1.7e7], ['NF 쏘나타', 2005, 2009, 2.1e7], ['YF 쏘나타', 2010, 2014, 2.5e7], ['LF 쏘나타', 2015, 2019, 2.7e7], ['쏘나타', 2020, 2026, 3.0e7],
  ['그랜저 XG', 2000, 2005, 2.7e7], ['그랜저 TG', 2006, 2011, 3.0e7], ['그랜저 HG', 2012, 2016, 3.3e7], ['그랜저 IG', 2017, 2022, 3.5e7], ['그랜저', 2023, 2026, 4.3e7],
  ['에쿠스', 2000, 2015, 5.5e7], ['제네시스 G80', 2016, 2026, 6.0e7], ['벤츠 E클래스', 2000, 2026, 7.0e7],
];
const carPrice = (s, [, from, , base]) => Math.round(base * 1.02 ** Math.max(0, s.year - from) / 1e5) * 1e5;
export function carOptions(s) {
  return CARS.filter(([, from, to]) => s.year >= from && s.year <= to).map((c) => ({ name: c[0], cost: carPrice(s, c), ...check(s, '부모님', '차', carPrice(s, c)) }));
}
// 부모님 집 앞에 서 있는 차. 고르기 전에 산 차는 '새 차'로 본다.
export function parentsCar(s) {
  const k = s.kin; if (!k) return null;
  if (k.car) return k.car;
  const at = k.last?.['부모님:차']; return at != null ? { name: '새 차', year: Math.floor((at - 1) / 12) } : null;
}
const tableOf = (who) => (who === SIS ? SIS_ACTS : PARENT_GIFTS);
const costOf = (s, A) => (A.cost ? A.cost(s) : A.base ? price(s, A.base) : 0);
function check(s, who, key, price = null) {
  const A = tableOf(who)[key], k = initKin(s), id = `${who}:${key}`, v = ymOf(s);
  if (!A) return { ok: false, why: '없는 선택입니다.' };
  if (s.ended) return { ok: false, why: '이야기가 끝났습니다.' };
  if ((A.from && v < A.from) || (A.to && v > A.to)) return { ok: false, hide: true, why: '지금은 할 수 없습니다.' };
  const last = k.last[id];
  if (last != null) {
    if (A.month && last === m12(s)) return { ok: false, why: '이번 달에는 이미 했습니다.' };
    if (!A.month && !A.cool) return { ok: false, done: true, why: '이미 했습니다.' };
    if (A.cool && m12(s) - last < A.cool) return { ok: false, why: A.cool >= 12 ? `${Math.ceil((A.cool - (m12(s) - last)) / 12)}년쯤 뒤에 다시 할 수 있습니다.` : `${A.cool - (m12(s) - last)}달 뒤에 다시 할 수 있습니다.` };
  }
  if (A.slot && s.used + A.slot > s.capacity) return { ok: false, why: '이번 달 활동 칸을 다 썼습니다.' };
  const cost = price ?? costOf(s, A);
  if (cost >= BIG && minor(s)) {
    if (!(s.flags?.guardianConsent || s.account || s.flags?.부모_믿음)) return { ok: false, cost, why: '투자 계좌를 허락받은 뒤에 할 수 있습니다.' };
    if (s.cash < cost * MINOR_TIMES) return { ok: false, cost, why: `학생 때는 현금이 값의 ${MINOR_TIMES}배(${won(cost * MINOR_TIMES)}) 이상 있어야 합니다.` };
  }
  if (s.cash < cost) return { ok: false, cost, why: '돈이 모자랍니다.' };
  return { ok: true, cost };
}
// 화면용 목록. 때가 아닌 것은 빼고, 못 하는 것은 이유와 함께 준다.
export function kinOptions(s, who) {
  return Object.entries(tableOf(who)).map(([key, A]) => {
    if (!A.pick) return { key, label: A.label, slot: A.slot ?? 0, ...check(s, who, key) };
    // 차는 고를 수 있다. 가장 싼 차로 열림을 보고, 값은 '부터'로 보여 준다.
    const list = carOptions(s), cheap = list.reduce((a, b) => (a && a.cost <= b.cost ? a : b), null);
    return { key, label: A.label, slot: 0, pick: true, from: true, ...(cheap ?? check(s, who, key)), ok: list.some((x) => x.ok) || (cheap?.ok ?? false) };
  }).filter((o) => !o.hide);
}
const FIRST = '"네가 무슨 돈으로…" 아버지는 한참 말이 없었다. 통장을 보여 드리자 어머니가 내 손을 잡았다. ';
export const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b); };
// car: 고른 차 이름(차를 사 드릴 때만).
export function kinAct(s, who, key, car = null) {
  const A = tableOf(who)[key];
  const model = A?.pick ? CARS.find((c) => c[0] === car && s.year >= c[1] && s.year <= c[2]) : null;
  if (A?.pick && !model) return { ok: false, why: '차를 골라 주세요.' };
  const c = check(s, who, key, model ? carPrice(s, model) : null);
  if (!c.ok) return c;
  const k = initKin(s);
  if (A.slot) s.used += A.slot;
  if (c.cost) s.cash -= c.cost;
  k.last[`${who}:${key}`] = m12(s);
  bump(s, who === SIS ? SIS : '부모님', A.bond, { story: A.bond >= 5 });
  if (A.calm) addStress(s, -A.calm);
  if (A.flag) (s.flags ??= {})[A.flag] = true;
  A.run?.(s);
  let text = typeof A.text === 'function' ? A.text(s) : A.text;
  if (model) {
    const before = k.car?.name;
    k.car = { name: model[0], year: s.year, price: c.cost };
    text = `${before ? `${josa(before, '을', '를')} 보내고 ` : ''}아버지께 ${josa(model[0], '을', '를')} 사 드렸다. 아버지는 괜한 짓 했다면서도 그날 저녁 동네를 세 바퀴 돌았다. 어머니는 조수석에서 창문을 끝까지 내렸다.`;
  }
  // 학생 때 처음으로 큰돈을 쓰면 부모님이 놀란다. 한 번만.
  if (c.cost >= BIG && minor(s) && !s.flags.가족_첫선물) { s.flags.가족_첫선물 = true; text = FIRST + text; }
  s.log.push(text);
  return { ok: true, text, cost: c.cost };
}
