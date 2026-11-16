// 친구의 집안과 사정. 처음부터 보이지 않고 사이가 가까워질수록 알게 된다. 자료: data/friends.json
import { bondOf } from './bonds.js';

export const FAMILY_AT = 10; // 사이 '닿은 인연'
export const SITUATION_AT = 25; // 사이 '깊은 인연'
let DATA = {};
export function loadFriends(d) { DATA = d ?? {}; }
// 연도가 적힌 문장은 그해가 되어야 알 수 있다.
const ready = (s, t) => { const m = t.match(/(?:19|20)\d\d(?=년)/); return !m || Number(m[0]) <= s.year; };
export function closeness(s, id) {
  if (s.partner?.id === id) return SITUATION_AT;
  // 호감은 25쯤에서 시작하므로 호감 단계(35·70)에 맞춰 읽는다.
  const love = s.love?.people?.[id]?.호감 ?? 0;
  // 풋풋한 마음: 사귀는 사이거나 친한 사이(40)면 집안 이야기를 듣는다.
  const teen = s.crush?.partner?.id === id ? SITUATION_AT : (s.crush?.people?.[id]?.마음 ?? 0) >= 40 ? FAMILY_AT : 0;
  return Math.max(bondOf(s, id), teen, love >= 70 ? SITUATION_AT : love >= 35 ? FAMILY_AT : 0);
}
// 자료가 없는 사람은 null. { family, situation, hint }
export function friendInfo(s, id) {
  const d = DATA[id];
  if (!d) return null;
  const c = closeness(s, id);
  const family = c >= FAMILY_AT ? d.family.filter((t) => ready(s, t)) : [];
  const situation = c >= SITUATION_AT ? d.situation.filter((t) => ready(s, t)) : [];
  const hint = c < FAMILY_AT ? '더 친해지면 집안 이야기를 듣게 될 것 같다.' : c < SITUATION_AT && d.situation.length ? '더 가까워지면 속사정도 털어놓을 것 같다.' : null;
  return { family, situation, hint };
}
// 방금 대화로 새로 알게 된 것을 한 줄로. before는 대화 전 friendInfo.
export function learnedNow(s, id, before) {
  const now = friendInfo(s, id);
  if (!now || !before) return null;
  if (now.situation.length > before.situation.length) return '속사정까지 털어놓았다.';
  if (now.family.length > before.family.length) return '집안 이야기를 들었다.';
  return null;
}
