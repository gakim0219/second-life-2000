// 평생 업적 보너스(사용자 지시 2026-11-09). 반복 활동은 200에서 멈추고, 200 위는 이것과 착용 효과로 오른다.
// 한 번씩만 받는다. 받은 값은 s.feats.add에 모아 두고 gear.applyGear가 능력치에 얹는다.
import { stageOf, tierOf, TRAIN_MAX } from './rules.js';

const base = (s, k) => s.stats[k] - (s.gear?.applied?.[k] ?? 0);
// [id, 이름, 조건, 보너스]
export const FEATS = [
  ['ioi_gold', 'IOI 금메달', (s) => !!s.flags.IOI금메달, { 지능: 10 }],
  ['top_univ', '한성국립대·NIT 입학', (s) => ['한성국립대', 'NIT'].includes(s.school?.대학) && ['대학', '사회인'].includes(stageOf(s)), { 지능: 5 }],
  ['top_grad', '한성국립대·NIT 졸업', (s) => !!(s.flags['졸업:한성국립대'] || s.flags['졸업:NIT']), { 지능: 10 }],
  ['grad_school', '대학원 진학', (s) => !!s.flags['진로:대학원'], { 지능: 5 }],
  ['co_top', '회사 5단계', (s) => (s.company?.stage ?? 0) >= 5, { 지능: 10 }],
  ['army', '전역', (s) => !!s.flags.전역, { 체력: 8 }],
  ['ironman', '철인 3종 완주', (s) => !!s.flags.철인완주, { 체력: 10 }],
  ['national', '마스터스 국가대표', (s) => !!s.flags.국가대표, { 체력: 15 }],
  ['president', '학생회장', (s) => !!s.flags.hs_won, { 매력: 5, 인맥: 5 }],
  ['marry', '결혼', (s) => !!s.partner?.married, { 매력: 5 }],
  ['ad_model', '광고 모델', (s) => !!s.flags.광고모델, { 매력: 10 }],
  ['tv', '방송 출연', (s) => !!s.flags.방송출연, { 매력: 10 }],
  ['listed', '회사 상장', (s) => !!s.company?.listed, { 인맥: 10 }],
  ['trillion', '순자산 1조', (s) => !!s.cardMarks?.includes('w1e12'), { 인맥: 10 }],
  ['investors', '비공개 투자자 모임', (s) => !!s.flags.투자자모임, { 인맥: 5 }],
  ['assembly', '국회의원 당선', (s) => !!s.flags.국회의원, { 인맥: 20 }],
  ...['지능', '체력', '매력', '인맥'].map((k) => [`max_${k}`, `${k} 단련의 끝`, (s) => base(s, k) >= TRAIN_MAX - 1e-6, { [k]: 10 }]),
].map(([id, label, test, add]) => ({ id, label, test, add }));

export function featsOf(s) { s.feats ??= { done: [], add: {} }; return s.feats; }
export const featBonus = (s) => featsOf(s).add;
// 새로 이룬 업적을 돌려준다. 능력치 반영은 부르는 쪽에서 applyGear로 한다.
export function checkFeats(s) {
  const f = featsOf(s), got = [];
  for (const x of FEATS) {
    if (f.done.includes(x.id)) continue;
    let ok = false; try { ok = x.test(s); } catch { ok = false; }
    if (!ok) continue;
    f.done.push(x.id); got.push(x);
    for (const [k, v] of Object.entries(x.add)) f.add[k] = (f.add[k] ?? 0) + v;
    s.log?.push(`평생 업적 '${x.label}': ${Object.entries(x.add).map(([k, v]) => `${k} +${v}`).join(' · ')}`);
  }
  return got;
}
export const featList = (s) => { const f = featsOf(s); return FEATS.map((x) => ({ id: x.id, label: x.label, add: x.add, done: f.done.includes(x.id) })); };

// 7구간 달마다 받는 것. 지능: 사회인이 되면 특허 수입. 매력: 인지도가 조금씩 오른다.
export const PATENT_BASE = 3000000;
export function monthlyPerks(s) {
  const out = [];
  if (stageOf(s) !== '사회인') return out;
  if (tierOf(s.stats.지능) >= 7) { const m = Math.round(PATENT_BASE * (1 + Math.max(0, s.year - 2008) / 10) / 10000) * 10000; s.cash += m; out.push({ k: '특허', cash: m }); }
  if (tierOf(s.stats.매력) >= 7) { s.fame = (s.fame ?? 0) + 1; out.push({ k: '인지도' }); }
  return out;
}
