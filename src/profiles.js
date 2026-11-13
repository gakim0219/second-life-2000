// 어른 인물의 상세. 친해질수록 열린다(사용자 지시 2026-11-13). 자료: data/profiles.json(사는 곳·부모·형제·가족사·인연·속 이야기)과 data/people.json(직업·성격·히스토리).
// 단계(사이): 3 스친 인연 → 하는 일과 인상 / 10 닿은 인연 → 사는 곳·결혼 여부·지나온 길 / 25 깊은 인연 → 가족과 인연 / 50 오랜 인연 → 속 이야기.
// 연도가 적힌 내용은 그해가 되어야 보인다. 주인공과 사귀었거나 결혼한 사람의 결혼·자녀 이력은 보이지 않는다(자료는 주인공이 없을 때의 삶이다).
import { closeness as friendCloseness } from './friends.js';
import { personOf as netPerson, jobNow } from './network.js';
import { personOf as lovePerson } from './love.js';
import { jobAt } from './rules.js';

// 인맥 인물이 먼저, 없으면 연애 상대 자료. 화면에 쓰는 칸만 같은 이름으로 맞춘다.
function personOf(id) {
  const n = netPerson(id); if (n) return n;
  const l = lovePerson(id); if (l) return { ...l, 기간: l.만남?.기간 ?? [0, 9999], love: true };
  // 선생님처럼 다른 자료에 없는 사람은 상세 자료 안의 '인물' 칸을 쓴다.
  const own = DATA[id]?.인물; return own ? { id, ...own, own: true } : null;
}
// 연인·배우자는 가장 깊은 단계까지 안다.
const closeness = (s, id) => (s.partner?.id === id ? STEPS[3] : friendCloseness(s, id));
// 지금 하는 일. 앞날의 직함은 미리 보이지 않는다(2026년 전에는 분야만).
const jobText = (s, p) => (DATA[p.id]?.일 ? [...DATA[p.id].일].reverse().find((x) => x.부터 <= s.year)?.글 ?? DATA[p.id].일[0].글 : p.love ? jobAt(p.직업_2026, s.year) : [jobNow(s, p), p.모임].filter(Boolean).join(' · '));

export const STEPS = [3, 10, 25, 50];
const HINTS = ['몇 번 더 마주치면 무슨 일을 하는 사람인지 알게 될 것 같다.', '더 친해지면 사는 곳과 지나온 이야기를 듣게 될 것 같다.', '더 가까워지면 가족과 주변 사람 이야기도 듣게 될 것 같다.', '오래 알고 지내면 남에게 하지 않는 이야기도 털어놓을 것 같다.'];
let DATA = {};
export function loadProfiles(d) { DATA = d ?? {}; }
export const hasProfile = (id) => !!DATA[id] && !!personOf(id);
export const profileIds = () => Object.keys(DATA);

const yearsIn = (t) => (t.match(/(?:19|20)\d\d(?=년)/g) ?? []).map(Number);
// 문장 단위로, 아직 오지 않은 해가 적힌 문장은 뺀다.
const upTo = (t, year) => String(t ?? '').split(/(?<=[.?!])\s+/).filter((x) => x && yearsIn(x).every((y) => y <= year)).join(' ');
const WED = { 결혼: '기혼', 이혼: '이혼', 사별: '사별' };
const mine = (s, id) => s.partner?.id === id || !!s.love?.people?.[id];

// 자료가 시작되는 해. 학교 또래는 스무 살이 되는 해보다 앞설 수 없다.
const adultFrom = (id, d, p) => Math.max(d.사는곳[0]?.부터 ?? 0, /^[cx]\d/.test(id) && p.출생연도 ? p.출생연도 + 19 : 0);
// { stage 0~4, job, look, home, wed, history[], parents, siblings, family[], links[], secrets[], hint }
export function profileOf(s, id) {
  const d = DATA[id], p = personOf(id);
  if (!d || !p) return null;
  // 이 자료는 어른이 된 뒤의 삶이다. 그 전(학생 때)에는 보여 주지 않는다. 또래는 어릴 때 집안(friends.js)만 보인다.
  if (s.year < adultFrom(id, d, p)) return null;
  const c = closeness(s, id), stage = STEPS.filter((n) => c >= n).length, y = s.year;
  const out = { stage, hint: HINTS[stage] ?? null, job: null, look: null, home: null, wed: null, history: [], parents: null, siblings: null, family: [], links: [], secrets: [] };
  if (stage >= 1) { out.job = jobText(s, p) || null; out.look = p.외모 || null; }
  const events = mine(s, id) ? [] : d.가족사.filter((e) => e.연도 <= y);
  if (stage >= 2) {
    out.home = [...d.사는곳].reverse().find((x) => x.부터 <= y)?.글 ?? null;
    if (s.partner?.id === id && s.partner.married) out.home = '지금은 나와 한집에 산다.'; // 자료의 거처는 주인공이 없을 때의 삶이다
    if (!mine(s, id)) { const last = [...events].reverse().find((e) => WED[e.종류]); out.wed = last ? `${WED[last.종류]} (${last.연도}년)` : '미혼'; }
    out.history = String(p.히스토리 ?? '').split(/(?<=[.])\s+/).filter((x) => x && yearsIn(x).length && yearsIn(x).every((n) => n <= y));
  }
  if (stage >= 3) {
    out.parents = upTo(d.부모, y) || null; out.siblings = upTo(d.형제, y) || null;
    out.family = events.map((e) => `${e.연도}년 ${e.글}`);
    // 인연: 상대가 세상에 나온 뒤에만. 이야기 문장은 지금까지의 일만.
    out.links = d.인연.map((l) => ({ l, q: personOf(l.id) })).filter(({ l, q }) => q && (l.부터 ?? q.기간?.[0] ?? 0) <= y) // 부터: 상대가 자료상 늦게 나와도 그 전부터 알던 사이
      .map(({ l, q }) => ({ id: l.id, name: q.이름, rel: l.관계, text: upTo(l.글, y) }));
  }
  // 속 이야기는 그 사람이 지금 삶에 이른 뒤(마지막 거처와 마지막 가족사 뒤)에만 나온다.
  if (stage >= 4) { const late = Math.max(d.사는곳.at(-1)?.부터 ?? 0, ...d.가족사.map((e) => e.연도)); out.secrets = y >= late ? d.속이야기.map((t) => upTo(t, y)).filter(Boolean) : []; if (!out.secrets.length) out.hint = '아직은 속을 다 보이지 않는다. 세월이 더 지나야 들을 수 있을 것 같다.'; }
  return out;
}
// 방금 대화로 새로 열린 단계를 한 줄로. before는 대화 전 profileOf.
const LEARNED = [null, '무슨 일을 하는 사람인지 알게 되었다.', '사는 곳과 지나온 이야기를 들었다.', '가족과 주변 사람 이야기를 들었다.', '남에게 하지 않는 이야기를 들었다.'];
export function profileLearned(s, id, before) {
  const now = profileOf(s, id);
  return now && before && now.stage > before.stage ? LEARNED[now.stage] : null;
}
