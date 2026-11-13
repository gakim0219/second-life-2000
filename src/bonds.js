// 관계. 값은 내부 수이고 화면에는 하트와 말로만 보인다.
// 미성년 기간의 쪽지·함께 하교는 친구 사이 일상 수준으로만 쓴다.
import { stageOf, gain, addStress, charmTalk, raise } from './rules.js';
import { enrolled, isVacation } from './school.js';

export const BOND_MAX = 100;
// 엔딩 기준(50·60·90)에 대화와 약속을 꾸준히 쌓으면 닿도록 잡은 값이다.
const HEARTS = [
  { min: 3, label: '스친 인연' }, { min: 10, label: '닿은 인연' }, { min: 25, label: '깊은 인연' },
  { min: 50, label: '오랜 인연' }, { min: 75, label: '평생 인연' },
];
// 친구·선생님·동료 누구에게나 같은 말을 쓴다(사용자 지시 2026-11-10). 연인·배우자는 따로 부른다.
export const ACQUAINT = 3; // '스친 인연'의 맨 아래
export const REFUSE_BELOW = 2; // 이 값 밑이면 선거 짝 같은 부탁을 들어주지 않는다.
const REUNION_MONTHS = 24;
const ym = (s) => s.year * 12 + s.month;

// 부모님은 처음부터 끝까지 신뢰 5단계다(사용자 지시 2026-11-05). 더 오를 수는 있어도 이 밑으로 내려가지 않는다.
export const PARENT_TRUST = 75;
export const keepParentTrust = (s) => { s.bonds ??= {}; if (!(s.bonds.부모님 >= PARENT_TRUST)) s.bonds.부모님 = PARENT_TRUST; };
// 화면에서는 아버지와 어머니가 따로 서 있고, 사이 값은 '부모님' 하나를 함께 쓴다. 이번 달 대화는 사람마다 따로 센다.
const bondKey = (id) => (id === '아버지' || id === '어머니' ? '부모님' : id);
export const bondOf = (s, id) => s.bonds?.[bondKey(id)] ?? 0;
// 사이가 차는 속도(사용자 지시 2026-11-10: 친구가 다 100이 되지 않게).
// 1) 가까울수록 덜 오른다. 2) 놀기·친구 사귀기·연락 같은 사소한 일은 한 사람에게 한 달 +3까지(bumpSmall).
// 3) '평생 인연'(75)에서 멈추지 않고 그대로 오른다(사용자 지시 2026-11-12: 74 제한 없앰). 75 위는 천천히 오른다.
//    평생 인연 표시(flags 평생:id)는 기록으로만 남는다: 큰일(한 번에 +5 이상), 앞날을 알고 도와줌, 10년 넘게 연락을 이어 옴.
export const LIFELONG_AT = 75, SMALL_CAP = 3;
const DAMP = [[90, 0.04], [75, 0.08], [50, 0.3], [25, 0.6]]; // 90 위는 아주 천천히: 평생 인연이라도 100은 드물다
const dampOf = (v) => DAMP.find(([min]) => v >= min)?.[1] ?? 1;
export const lifelongOpen = (s, id) => !!s.flags?.[`평생:${id}`];
export function openLifelong(s, id) {
  if (bondKey(id) === '부모님' || lifelongOpen(s, id)) return false;
  (s.flags ??= {})[`평생:${id}`] = true;
  return true;
}
// opts.story: 이야기 선택에서 온 값. 한 번에 +5 이상이면 큰일로 보고 평생 인연 문을 연다.
export function bump(s, who, n, opts = {}) {
  const id = bondKey(who);
  (s.bondSince ??= {})[id] ??= ym(s);
  if (opts.story && n >= 5) openLifelong(s, id);
  const v = bondOf(s, id);
  let next = v + n;
  if (n > 0 && id !== '부모님') {
    next = v + n * dampOf(v);
  }
  s.bonds[id] = Math.max(id === '부모님' ? PARENT_TRUST : -10, Math.min(BOND_MAX, Math.max(next, n > 0 ? v : -Infinity)));
  (s.bondSeen ??= {})[id] = ym(s);
}
// 사소한 일로 오르는 사이. 한 사람에게 한 달 합 SMALL_CAP까지만 오른다.
export function bumpSmall(s, who, n) {
  const id = bondKey(who), now = ym(s);
  if (s.bondSmall?.at !== now) s.bondSmall = { at: now };
  const used = s.bondSmall[id] ?? 0, take = Math.max(0, Math.min(n, SMALL_CAP - used));
  s.bondSmall[id] = used + n;
  if (take > 0) bump(s, id, take);
  else (s.bondSeen ??= {})[id] = now; // 오르지 않아도 만난 것은 만난 것이다
}
// { hearts:0~5, label:'닿은 인연', word:'나쁨|보통|좋음' }
const heartsOf = (v) => HEARTS.filter((h) => v >= h.min).length;
export function bondStage(s, id) {
  if (bondKey(id) === '부모님') return { hearts: 5, label: '신뢰', word: '좋음' };
  const v = bondOf(s, id);
  // 연인·배우자: 이름은 관계로, 하트는 연애 쪽 '사이'로 보인다.
  if (s.partner?.id && s.partner.id === id) {
    const label = s.partner.married ? (s.sex === '여' ? '남편' : '아내') : '연인';
    return { hearts: heartsOf(s.partner.사이 ?? v), label, word: '좋음' };
  }
  const hearts = heartsOf(v);
  return { hearts, label: hearts ? HEARTS[hearts - 1].label : v < 0 ? '서먹한 사이' : '아직 모르는 사이', word: v < REFUSE_BELOW ? '나쁨' : v < 10 ? '보통' : '좋음' };
}
// 헤어지거나 이혼하면 어떻게 끝났는지에 따라 사이가 내려간다(사용자 지시 2026-11-10). 평생 인연의 문도 다시 닫힌다.
// 좋게: 마음이 남은 채 내가 정리함 · 식음: 오래 못 봐서 멀어짐 · 틀어짐: 다툼 끝에 끝남 · 이혼 · 이혼_자녀: 아이 때문에 계속 봄
export const PARTING = { 좋게: 10, 식음: ACQUAINT, 틀어짐: -1, 이혼: ACQUAINT, 이혼_자녀: 10 };
export function afterParting(s, id, how) {
  if (!id || bondKey(id) === '부모님') return;
  const to = PARTING[how] ?? ACQUAINT;
  s.bonds ??= {}; s.bonds[id] = Math.min(s.bonds[id] ?? to, to);
  if (s.flags) delete s.flags[`평생:${id}`];
  (s.bondSeen ??= {})[id] = ym(s);
}
export const knows = (s, id) => bondKey(id) === '부모님' || s.bonds?.[id] != null;
const minor = (s) => ['초등', '중학', '고등'].includes(stageOf(s));

// term: 학기 중에만(학교에서 하는 일). vac: 방학이거나 학교에 안 다닐 때만. 글은 여러 개 중 달마다 하나를 고른다.
const KIND = {
  대화: { gain: 3 },
  쪽지: { gain: 2, student: true, term: true },
  하교: { gain: 3, student: true, term: true },
  놀기: { gain: 4, student: true, vac: true },
};
export const inTerm = (s) => enrolled(s) && !isVacation(s);
const summer = (s) => s.month >= 6 && s.month <= 9;
const TEXTS = {
  대화: {
    term: ['한참 이야기를 나눴다. 요즘 무슨 생각을 하는지 조금 더 알게 됐다.', '쉬는 시간 내내 어제 본 방송 이야기를 했다. 종이 쳐도 말이 끝나지 않았다.', '점심을 먹고 운동장 스탠드에 앉아 이야기했다. 둘 다 다음 시험이 걱정이었다.', '복도 창가에 기대 수다를 떨었다. 담임 선생님 흉내에 둘 다 웃음이 터졌다.'],
    summer: ['방학 동안 뭐 했는지 한참 이야기했다. 둘 다 생각보다 한 게 없었다.', '더위 이야기로 시작해 개학하기 싫다는 말로 끝났다.', '아이스크림을 하나씩 물고 그늘에 앉아 방학 계획을 늘어놓았다. 반도 못 지킬 계획이다.'],
    winter: ['손을 주머니에 넣고 방학 이야기를 했다. 입김이 말보다 먼저 나왔다.', '겨울방학에 본 영화 이야기를 했다. 같은 걸 봤는데 기억하는 장면이 달랐다.', '새 학년 반 배정 이야기를 했다. 같은 반이 되면 좋겠다는 말은 둘 다 하지 않았다.'],
  },
  쪽지: ['수업이 끝나고 접은 쪽지를 건넸다. 다음 쉬는 시간에 짧은 답장이 돌아왔다.', '수업 시간에 몰래 쪽지를 넘겼다. 답장 끝에 웃는 얼굴이 그려져 있었다.', '쪽지에 다음 시간 숙제를 물었다. 답 대신 "너 또 안 했지?"가 돌아왔다.'],
  하교: ['같은 길로 함께 걸어서 집에 왔다. 별 얘기 아닌데 오래 웃었다.', '교문을 나서 떡볶이 집 앞까지 같이 걸었다. 내일 또 오자고 했다.', '하굣길에 문방구에 들러 뽑기를 했다. 둘 다 꽝이었는데 이상하게 신났다.', '비 오는 날 우산 하나를 같이 썼다. 어깨가 반씩 젖었다.'],
  놀기: {
    park: ['공원에서 자전거를 탔다. 내리막에서 소리를 지르며 내려왔다.', '공원에서 배드민턴을 쳤다. 바람 때문에 공이 자꾸 엉뚱한 데로 갔다.', '분수대 옆 벤치에서 음료수를 마시며 오후를 보냈다.'],
    town: ['노래방에서 한 시간을 불렀다. 마지막 곡은 둘이 같이 불렀다.', 'PC방에서 같은 편으로 게임을 했다. 지고 나서도 한 판만 더 하자고 했다.', '번화가 오락실에서 펌프를 했다. 다리가 후들거렸다.'],
    cafe: ['분식집에서 떡볶이와 튀김을 나눠 먹었다. 방학이라 가게가 한산했다.', '빙수 한 그릇을 둘이 나눠 먹었다. 숟가락이 바빴다.', '만화방에서 오후 내내 만화책을 쌓아 놓고 읽었다.'],
    shop: ['상가를 한 바퀴 돌며 구경만 했다. 산 건 없는데 하루가 금방 갔다.', '문구점에서 새 학기 필통을 미리 골랐다. 서로 골라 준 걸 샀다.'],
    winter: ['동네 언덕에서 눈싸움을 했다. 장갑이 흠뻑 젖었다.', '스케이트장에 갔다. 넘어진 횟수를 세다가 포기했다.'],
    any: ['방학이라 하루 종일 같이 놀았다. 해가 지는 줄도 몰랐다.', '할 일 없이 동네를 돌아다녔다. 그래도 심심하지 않았다.'],
  },
};
const pickText = (s, id, list) => list[[...`${s.seed ?? 1}:${s.year}:${s.month}:${id}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % list.length];
// 그달 그 행동의 글. place는 만난 장소(park·town·cafe·shop).
export function talkText(s, id, kind, place) {
  const T = TEXTS[kind];
  if (kind === '대화') return pickText(s, id, inTerm(s) || stageOf(s) === '사회인' ? T.term : summer(s) ? T.summer : T.winter);
  if (kind === '놀기') { const winter = [12, 1, 2].includes(s.month); return pickText(s, id, [...(T[place] ?? []), ...(winter ? T.winter : []), ...T.any]); }
  return pickText(s, id, T);
}
export const isFirstTalk = (s, id) => s.talkedAt?.[id] == null;
function check(s, id, kind) {
  const k = KIND[kind];
  if (!k) return { ok: false, why: '없는 행동입니다.' };
  if (s.ended) return { ok: false, why: '이야기가 끝났습니다.' };
  if (s.flags?.군입대 && !s.flags?.전역) return { ok: false, why: '복무 중에는 휴가 때만 만날 수 있습니다.' };
  if (!knows(s, id)) return { ok: false, why: '아직 만난 적이 없는 사람입니다.' };
  if (k.student && !minor(s)) return { ok: false, why: '학생 때 하던 일입니다.' };
  if (k.term && !inTerm(s)) return { ok: false, why: '방학 중에는 학교에 가지 않습니다.' };
  if (k.vac && inTerm(s)) return { ok: false, why: '방학 때 할 수 있습니다.' };
  // 처음 이야기할 때는 칸을 쓰지 않는다.
  if (!isFirstTalk(s, id) && s.used >= s.capacity) return { ok: false, why: '이번 달 활동 칸을 다 썼습니다.' };
  if (s.talkedAt?.[id] === ym(s)) return { ok: false, why: '이번 달에는 이미 만났습니다.' };
  return { ok: true };
}
// 인물 시트에 그릴 행동 목록.
export function bondActions(s, id) {
  const term = inTerm(s);
  return Object.keys(KIND).filter((kind) => (!KIND[kind].student || minor(s)) && !(KIND[kind].term && !term) && !(KIND[kind].vac && term)).map((kind) => ({ kind, ...check(s, id, kind) }));
}
// 활동 칸 1개를 쓴다. 오래 못 본 사람이면 재회 장면이 된다.
export function talk(s, id, kind = '대화', place = null) {
  const c = check(s, id, kind);
  if (!c.ok) return c;
  const last = s.bondSeen?.[bondKey(id)];
  const reunion = last != null && ym(s) - last >= REUNION_MONTHS;
  if (!isFirstTalk(s, id)) s.used += 1;
  (s.talkedAt ??= {})[id] = ym(s);
  bump(s, id, (KIND[kind].gain + (reunion ? 3 : 0)) * charmTalk(s));
  raise(s, '인맥', 0.3); addStress(s, -2);
  return { ok: true, reunion, text: reunion ? '오랜만이었다. 처음엔 어색했는데 금세 예전 말투로 돌아왔다.' : talkText(s, id, kind, place), stage: bondStage(s, id) };
}
// 다음 달 약속: 그달 칸 하나를 미리 잡는다. 어기면 사이가 나빠진다.
export function promise(s, id) {
  if (!knows(s, id)) return { ok: false, why: '아직 만난 적이 없는 사람입니다.' };
  if (s.flags?.군입대 && !s.flags?.전역) return { ok: false, why: '복무 중에는 약속을 잡을 수 없습니다.' };
  if (s.promises.some((p) => p.id === id)) return { ok: false, why: '이미 약속이 있습니다.' };
  s.promises.push({ id, at: ym(s) + 1 });
  return { ok: true, text: '다음 달에 보기로 했다. 달력에 작게 적어 두었다.' };
}
export function cancelPromise(s, id) {
  const before = s.promises.length;
  s.promises = s.promises.filter((p) => p.id !== id);
  if (s.promises.length === before) return { ok: false, why: '잡아 둔 약속이 없습니다.' };
  bump(s, id, -3);
  return { ok: true, text: '약속을 미루자고 연락했다. 답장이 짧았다.' };
}
// 인연이 멀어짐(사용자 지시 2026-11-10). 2년 넘게 만나지도 연락하지도 않으면 분기마다 1씩 줄어 '스친 인연'(9)에서 멈춘다.
// '평생 인연'(75 이상), 부모님, 배우자·연인은 줄지 않는다. '오랜 인연'(50)이 '스친 인연'이 되기까지 12년쯤 걸린다.
export const FADE_AFTER = 24, FADE_FLOOR = 9, LIFELONG = 75;
export function fade(s) {
  if (s.month % 3 !== 0) return;
  for (const [id, v] of Object.entries(s.bonds ?? {})) {
    if (id === '부모님' || id === s.partner?.id || id === s.crush?.partner?.id || v >= LIFELONG || v <= FADE_FLOOR) continue;
    const seen = s.bondSeen?.[id];
    if (seen == null || ym(s) - seen < FADE_AFTER) continue;
    s.bonds[id] = Math.max(FADE_FLOOR, v - 1); // bondSeen은 그대로 둔다. 멀어지는 것은 만난 것이 아니다
  }
}
// 달이 바뀔 때 호출. 약속한 달이면 칸 하나를 쓰고 만난다.
// 10년 넘게 알고 지내며 최근 1년 안에 만나거나 연락했고, 사이가 70을 넘으면 평생 인연 문이 열린다.
function longTies(s) {
  for (const [id, v] of Object.entries(s.bonds ?? {})) {
    if (id === '부모님' || v < 70 || lifelongOpen(s, id)) continue;
    const since = s.bondSince?.[id], seen = s.bondSeen?.[id];
    if (since == null || seen == null || ym(s) - since < 120 || ym(s) - seen > 12) continue;
    if (openLifelong(s, id)) (s.log ??= []).push('알고 지낸 지 10년이 넘었다. 이제는 평생 인연이라 해도 될 것 같다.');
  }
}
export function monthly(s) {
  fade(s);
  if (s.month === 12) longTies(s);
  const due = s.promises.filter((p) => p.at <= ym(s));
  s.promises = s.promises.filter((p) => p.at > ym(s));
  for (const p of due) {
    if (s.used < s.capacity) { s.used += 1; bump(s, p.id, 6); s.log.push('약속한 사람을 만났습니다. 약속을 지켜서 사이가 더 가까워졌습니다.'); } else bump(s, p.id, -3);
  }
}
// 인물 시트 요약.
export function bondView(s, id) {
  const p = s.promises.find((x) => x.id === id);
  return { id, ...bondStage(s, id), known: knows(s, id), promised: !!p, actions: bondActions(s, id) };
}
// 아는 사람 전체. 화면의 인물 목록용.
export const knownPeople = (s) => Object.keys(s.bonds ?? {}).flatMap((id) => (id === '부모님' ? ['아버지', '어머니'] : [id])).map((id) => bondView(s, id));
