import { capacityOf, stageOf, isOpen, tierOf, STRESS_MAX, naturalRecovery } from './rules.js';
import { onMonth as abroadMonthly } from './abroad.js';
import { eventsFor } from './events.js';
import { keepParentTrust } from './bonds.js';
import { closeMonth, rollTerm, holidaysOf, inArmy, capacityBonus, noltoOf } from './school.js';
import { doAction, canAction, defaultAction, monthly as activityMonthly } from './activities.js';
import { monthly as bondMonthly } from './bonds.js';
import { monthly as deviceMonthly } from './devices.js';
import { monthly as gearMonthly } from './gear.js';

const ARMY_CAPACITY = 4; // 복무 중 활동 칸 제한

// 옛 호출(갈래 이름)도 그대로 쓸 수 있다. 세부 항목은 activities.doAction을 쓴다.
export function canDo(s, name) {
  if (s.ended) return { ok: false, why: '이야기가 끝났습니다.' };
  if (!isOpen(name, stageOf(s))) return { ok: false, why: '아직 열리지 않았습니다.' };
  const id = defaultAction(s, name);
  return id ? canAction(s, id) : { ok: false, why: '지금은 할 수 없습니다.' };
}
export function act(s, name) {
  const c = canDo(s, name);
  if (!c.ok) return c;
  return doAction(s, defaultAction(s, name));
}
const hooks = [];
export const onMonth = (fn) => { if (!hooks.includes(fn)) hooks.push(fn); };
// 명절 용돈 연결 지점: fn(s, '설날'|'추석'|'생일'). 정기 용돈은 없다.
const holidayHooks = [];
export const onHoliday = (fn) => { if (!holidayHooks.includes(fn)) holidayHooks.push(fn); };
function queueEvents(s) {
  for (const e of eventsFor(s)) if (!s.queue.includes(e.id)) s.queue.push(e.id);
}
// 새 게임 첫 달의 이벤트를 큐에 넣는다. 달이 넘어가야만 나오던 시작 장면을 위한 것이다.
export function startGame(s) { queueEvents(s); return s; }
export function nextMonth(s) {
  if (s.ended) return s;
  const before = stageOf(s);
  keepParentTrust(s);
  closeMonth(s);
  s.month += 1;
  if (s.month === 13) { s.month = 1; s.year += 1; }
  s.used = 0;
  s.capacity = capacityOf(s.stats.체력) + capacityBonus(s) + (s.gear?.cap ?? 0);
  if (s.stress >= STRESS_MAX) { s.capacity = Math.ceil(s.capacity / 2); s.stress = 60; s.log.push('피곤함이 100에 닿아 번아웃이 왔습니다. 이번 달 활동 칸이 절반으로 줄었습니다.'); }
  const after = stageOf(s);
  rollTerm(s, before, after);
  if (inArmy(s)) s.capacity = Math.min(s.capacity, ARMY_CAPACITY);
  // 임시 결정: 쉬지 않아도 조금은 풀리고, 초·중·고 놀토는 조금 더 풀린다.
  const nolto = ['초등', '중학', '고등'].includes(after) ? noltoOf(s.year, s.month) : 0;
  s.stress = Math.max(0, s.stress - naturalRecovery(s.stats.체력) - nolto);
  activityMonthly(s);
  deviceMonthly(s);
  gearMonthly(s);
  bondMonthly(s);
  for (const h of hooks) h(s);
  abroadMonthly(s);
  for (const kind of holidaysOf(s)) for (const h of holidayHooks) h(s, kind);
  if (s.year === 2027) { s.year = 2026; s.month = 12; s.ended = 'pending'; }
  if (!s.ended) queueEvents(s);
  return s;
}
export function statLine(s) { return Object.fromEntries(Object.entries(s.stats).map(([k, v]) => [k, tierOf(v)])); }
