import { krNum } from '../num.js';
import { moveDue } from '../parents.js';
import { homeTypeOf } from '../family.js';
import { billOf, forecast } from '../tax.js';
// 시작·홈·장면·신문·엔딩이 같이 쓰는 것: 달 넘김 흐름, 배경, 인물 이름, 작은 그래프.
import { h, won, bgInto, hasMe, hasBg, photo, kinPhoto, setBgTable } from '../ui.js';
import { ctx as appCtx } from '../shell.js';
import { nextMonth } from '../core.js';
import { sfx } from '../sound.js';
import { veil } from './motion.js';
import { contestState } from '../contest.js';
import { homeBrief, canRefill, refill, doKaraoke, projectPending, projectStatus } from '../activities.js';
import { inArmy, examOf, examPending } from '../school.js';
import { eventById } from '../events.js';
import { stageOf, tierOf } from '../rules.js';
import { cashierRound, doShop, canAction } from '../activities.js';
import * as love from '../love.js';
import * as network from '../network.js';
import { yearReview } from '../review.js';

// ---------- 달 넘김 흐름 ----------
// 저장되지 않는 차례표. 이벤트 큐는 s.queue에 있으므로 다시 불러와도 홈에서 이어진다.
let flow = null;
const fresh = () => ({ yearend: null, paper: false, tax: false, log: [], changes: [], done: new Set() });
// 나중에 보기로 미룬 이야기. 저장하지 않는다. 다음 달로 넘어가기 전에는 꼭 보게 한다.
let deferred = false;
export const isDeferred = () => deferred;
export const deferScenes = (on) => { deferred = on; };
// 지난 신문 뒤로 오른 능력을 숫자 없이 말한다.
function statChanges(s, before) {
  if (!before) return [];
  const out = [];
  for (const k of Object.keys(s.stats)) {
    const a = tierOf(before[k] ?? 0), b = tierOf(s.stats[k]);
    if (b > a) out.push(`${k}이 ${b}구간이 되었다.`);
    else if (Math.floor(s.stats[k]) > Math.floor(before[k] ?? 0)) out.push(`${k}이 조금 올랐다.`);
  }
  return out;
}
let turning = false; // 막이 내려간 사이 다시 눌러도 달이 두 번 넘어가지 않는다
export function monthFlow(ctx) {
  if (turning) return null;
  const s = ctx.s, logAt = s.log.length, before = s.paperStats;
  nextMonth(s); deferred = false; sfx('month');
  flow = fresh();
  flow.log = s.log.slice(logAt);
  flow.changes = statChanges(s, before); s.paperStats = { ...s.stats }; ctx.save(); ctx.autosave();
  if (!s.ended) { if (s.month === 1 && yearReview(s, s.year - 1)) flow.yearend = s.year - 1; flow.paper = true; flow.tax = !!billOf(s); }
  const v = veil({ year: s.year, month: s.month, season: seasonOf(s.month) });
  if (!v) return advance(ctx);
  turning = true;
  return v.then(() => { turning = false; return advance(ctx); });
}
// 달 넘기기. 대회 경고가 있으면 먼저 묻는다.
export function askNext(ctx) {
  if (ctx.s.queue.length) { deferScenes(false); ctx.toast('미룬 이야기를 먼저 봅니다.'); resumeFlow(ctx); return; }
  if (billOf(ctx.s)) { ctx.go('tax'); return; }
  const soon = forecast(ctx.s);
  const warn = [...(soon?.short ? [`다음 달 ${soon.title} ${won(soon.total)}이 나옵니다. 현금과 예금으로는 ${won(soon.short)} 모자랍니다.`] : []), ...(projectPending(ctx.s) ? [`탐구 과제를 아직 다 하지 않았습니다(기록장 ${projectStatus(ctx.s).count}/${projectStatus(ctx.s).total}장). 방학 동안 과학실에서 기록을 채워야 합니다.`] : []), ...(examPending(ctx.s) ? [`이번 달 ${examOf(ctx.s)}을 아직 보지 않았습니다. 넘기면 지금 공부한 만큼으로 치릅니다.`] : []), ...(contestState(ctx.s).warnings ?? [])];
  if (!warn.length) { monthFlow(ctx); return; }
  ctx.sheet((close) => h('div', { className: 'stack' },
    h('h2', { text: '달을 넘기기 전에' }),
    h('ul', { className: 'h-warn' }, warn.map((w) => h('li', { text: w }))),
    h('button', { className: 'btn', text: '돌아가기', on: { click: close } }),
    h('button', { className: 'btn main', text: '그래도 넘긴다', on: { click: () => { close(); monthFlow(ctx); } } })));
}
// 일상과 동네 아래에 뜨는 줄: 남은 칸과 다음 달로.
export function nextBar(ctx) {
  const b = homeBrief(ctx.s), full = b.slotsLeft <= 0;
  return h('div', { className: `bar next-bar${full ? ' ready' : ''}` }, h('div', {},
    full && canRefill(ctx.s) ? h('button', { className: 'btn next-refill', text: '칸 1개 무료 충전', on: { click: () => { const r = refill(ctx.s); ctx.save(); ctx.toast(r.ok ? r.text : r.why); ctx.draw(); } } })
      : h('span', { className: 'next-left num', text: full ? '이번 달 칸을 다 썼다' : `남은 칸 ${b.slotsLeft}` }),
    h('button', { className: `btn next-btn ${full ? 'main' : ''}`, on: { click: () => askNext(ctx) } }, full ? '이번 달 마무리 →' : '다음 달로 →')));
}
// 큐에 남은 장면부터 이어 간다. 새 게임 시작과 불러온 직후에 쓴다.
export function resumeFlow(ctx) { flow = fresh(); return advance(ctx); }
export function advance(ctx) {
  const s = ctx.s, go = (n, p = {}) => ctx.go(n, p, { replace: true });
  ctx.save();
  if (s.ended) { flow = null; return go('ending'); }
  if (flow?.yearend) { const year = flow.yearend; flow.yearend = null; return go('yearend', { year }); }
  if (flow?.paper) { flow.paper = false; return go('paper', { log: flow.log, changes: flow.changes }); }
  if (flow?.tax) { flow.tax = false; if (billOf(s)) return go('tax'); }
  while (s.queue.length && !eventById(s.queue[0])) s.queue.shift();
  if (s.queue.length && !deferred) return go('scene', { event: s.queue[0] });
  if (!s.queue.length && moveDue(s)) { s.flags.부모_이사안내 = true; ctx.save(); flow = null; ctx.stack.length = 0; return go('movehome'); }
  if (flow && !deferred) {
    const sc = love.pendingScenes(s).find((x) => !flow.done.has(x.id));
    if (sc) { flow.done.add(sc.id); return go('scene', { love: sc.id }); }
  }
  // 지도·장소에서 연 이야기는 그 자리로 돌아간다. 달 넘김 흐름(flow)은 언제나 홈으로 끝난다.
  const fromFlow = !!flow; flow = null;
  if (fromFlow) ctx.stack.length = 0;
  if (ctx.stack.length) return ctx.back();
  return go('home');
}
// 다른 담당 화면을 부를 때. 파일이 아직 없어도 게임이 멈추지 않게 제자리로 돌아온다.
export async function goSafe(ctx, name, params = {}) {
  const cur = ctx.cur, n = ctx.stack.length;
  try { await ctx.go(name, params); } catch { ctx.cur = cur; ctx.stack.length = n; ctx.toast('아직 준비 중인 화면입니다.'); await ctx.draw(); }
}

// ---------- 노래방 미니게임 ----------
// 움직이는 표시가 가운데 칸에 올 때 누른다. 네 번. 정확할수록 점수가 높다. 평소처럼 부르면 점수 없이 끝난다.
const BEATS = 4;
export function openKaraoke(ctx, onDone) {
  const s = ctx.s, can = canAction(s, 'play_karaoke');
  if (!can.ok) { ctx.toast(can.why); return; }
  let raf = 0, closed = false;
  const stop = () => cancelAnimationFrame(raf);
  const finish = (close, score) => { closed = true; stop(); close(); onDone(doKaraoke(s, score)); };
  ctx.sheet((close) => {
    const box = h('div', { className: 'stack' });
    const play = () => {
      let n = 0, total = 0, t0 = performance.now(), speed = 0.9;
      const dot = h('i', { className: 'kr-dot' });
      const bar = h('div', { className: 'kr-bar', 'aria-hidden': 'true' }, h('span', { className: 'kr-zone' }), dot);
      const info = h('p', { className: 'sub num', text: `박자 1 / ${BEATS}` });
      const said = h('p', { className: 'kr-said', text: '가운데 칸에 오면 누르세요.' });
      let pos = 0;
      const tick = (now) => { if (closed) return; const x = ((now - t0) / 1000) * speed; pos = 50 + 48 * Math.sin(x * Math.PI); dot.style.left = `${pos}%`; raf = requestAnimationFrame(tick); };
      const hit = () => {
        const d = Math.abs(pos - 50), pts = d <= 5 ? 25 : d <= 12 ? 18 : d <= 22 ? 10 : 3;
        total += pts; n += 1; said.textContent = pts >= 25 ? '완벽!' : pts >= 18 ? '좋아!' : pts >= 10 ? '괜찮아' : '놓쳤다';
        if (n >= BEATS) { setTimeout(() => finish(close, total), 350); return; }
        info.textContent = `박자 ${n + 1} / ${BEATS}`; speed += 0.25; t0 = performance.now();
      };
      box.replaceChildren(h('h2', { text: '노래방 박자 맞추기' }), info, bar, said, h('button', { className: 'btn sun kr-tap', text: '지금!', on: { click: hit } }));
      raf = requestAnimationFrame(tick);
    };
    box.append(
      h('h2', { text: '노래방' }),
      h('p', { className: 'sub', text: '박자를 맞출수록 점수가 높다. 점수가 높으면 더 신나고 더 풀린다.' }),
      h('button', { className: 'btn sun', on: { click: play } }, '박자 맞추며 부르기', h('span', { className: 'chip', text: '네 번 누르기' })),
      h('button', { className: 'btn', on: { click: () => finish(close, null) } }, '그냥 신나게 부르기', h('span', { className: 'chip', text: '점수 없이 바로' })));
    return box;
  }, { onClose: () => { closed = true; stop(); } });
}
// ---------- 계산대 미니게임 ----------
// 시간제: 한 문제 8초, 맞힌 만큼 웃돈. 천천히: 제한 없음, 웃돈 절반. 평소처럼: 문제 없이 일만 한다.
const ROUNDS = 3, SECONDS = 8;
export function openCashier(ctx, onDone) {
  const s = ctx.s, can = canAction(s, 'shop_help');
  if (!can.ok) { ctx.toast(can.why); return; }
  let timer = 0, closed = false; // 바깥을 눌러 닫으면 칸을 쓰지 않고 그만둔다
  const stop = () => clearInterval(timer);
  const finish = (close, correct, total) => { closed = true; stop(); close(); const r = doShop(s, correct, total); onDone(r); };
  ctx.sheet((close) => {
    const box = h('div', { className: 'stack' });
    const ask = (mode, n, correct) => {
      stop(); if (closed) return;
      if (n >= ROUNDS) { finish(close, mode === '천천히' ? Math.floor(correct / 2) : correct, ROUNDS); return; }
      const q = cashierRound(s, n), opts = [...new Set(q.choices)].sort((a, b) => ((a * 7 + n) % 5) - ((b * 7 + n) % 5));
      const clock = h('span', { className: 'chip num' }); let left = SECONDS;
      const answer = (v) => ask(mode, n + 1, correct + (v === q.answer ? 1 : 0));
      box.replaceChildren(
        h('p', { className: 'sub', text: `손님 ${n + 1} / ${ROUNDS}` }),
        h('h2', { className: 'num', text: `${krNum(q.price)}원짜리에 ${krNum(q.paid)}원을 냈다` }),
        h('p', { text: '거스름돈은 얼마일까?' }), mode === '시간제' ? clock : null,
        h('div', { className: 'stack' }, opts.map((v) => h('button', { className: 'btn', text: `${krNum(v)}원`, on: { click: () => answer(v) } }))));
      if (mode === '시간제') {
        clock.textContent = `${left}초`;
        timer = setInterval(() => { left -= 1; clock.textContent = `${left}초`; if (left <= 0) answer(null); }, 1000);
      }
    };
    box.append(
      h('h2', { text: '부모님 가게 계산대' }),
      h('p', { className: 'sub', text: '손님이 내민 돈을 보고 거스름돈을 고른다. 틀려도 일한 값은 받는다.' }),
      h('button', { className: 'btn sun', on: { click: () => ask('시간제', 0, 0) } }, '시간제로 하기', h('span', { className: 'chip', text: '문제마다 8초 · 잘하면 웃돈' })),
      h('button', { className: 'btn', on: { click: () => ask('천천히', 0, 0) } }, '천천히 하기', h('span', { className: 'chip', text: '시간 제한 없음' })),
      h('button', { className: 'btn', on: { click: () => finish(close, 0, 0) } }, '평소처럼 돕기', h('span', { className: 'chip', text: '문제 없이 바로' })));
    return box;
  }, { onClose: () => { closed = true; stop(); } });
}

// ---------- 배경 ----------
// 그림은 art/bg에 넣고 scripts/build_art.py를 돌리면 쓰인다. 아래 표가 장소 키를 파일 이름에 잇는다.
// 후보를 앞에서부터 찾아 처음 있는 그림을 쓴다. 맨 앞은 언제나 키 그대로라, 나중에 art/bg/place_home.png를 넣으면 그것이 먼저다.
export const seasonOf = (month) => (month <= 2 || month === 12 ? '겨울' : month <= 5 ? '봄' : month <= 8 ? '여름' : '가을');
const SEASON_FILE = { 봄: 'home-spring', 여름: 'home-summer', 가을: 'home-autumn', 겨울: 'home-winter' };
const PRE = { 초등: 'el', 중학: 'mi', 고등: 'hi', 대학: 'un', 사회인: 'un' };
// 시기마다 다른 방이 있는 장소. 없는 방은 가장 비슷한 방으로 잇는다.
const ROOM = {
  classroom: { el: 'el-classroom', mi: 'mi-classroom', hi: 'hi-classroom', un: 'un-classroom' },
  yard: { el: 'el-yard', mi: 'mi-yard', hi: 'hi-yard', un: 'un-yard' },
  library: { el: 'el-library', mi: 'mi-library', hi: 'hi-library', un: 'un-library' },
  office: { el: 'el-office', mi: 'mi-office', hi: 'hi-office', un: 'un-classroom' },
  lab: { el: 'el-music', mi: 'mi-broadcast', hi: 'hi-lab', un: 'un-club' },
  shop: { el: 'el-stationery', mi: 'mi-snack', hi: 'hi-cafeteria', un: 'store' },
};
const HOME_BG = { lux: ['home-kr-lux'], apt: ['home-kr-apt', 'home-apt'], us: ['home-us'], world: ['home-world'] };
export const homeBgOf = (id) => HOME_BG[homeTypeOf(id)];
// 내가 사는 집, 월세 집, 부모님께 사 드린 집 순서로 본다.
function homeBgs(s) {
  const p = s.portfolio, mine = Object.keys(p?.living ?? {}).find((id) => p.pos?.[id]);
  if (mine) return homeBgOf(mine);
  if (s.family?.home?.kind === '월세') return ['home-apt'];
  return s.parentsHome ? homeBgOf(s.parentsHome.id) : [];
}
const homeList = (s) => [...homeBgs(s), SEASON_FILE[seasonOf(s.month)], 'home', 'home-winter'];
// 부모님이 찻집을 하시면 학생 때 일터(부모님 가게)는 찻집 그림이다.
const workList = (s) => (stageOf(s) === '사회인' ? ['office1', 'wk-office'] : s.flags?.부모_찻집 ? ['tea-inside', 'tea-open', 'store'] : ['store']);
const hallList = (p) => ['stage', ROOM.office[p]];
// 키 -> 파일 후보 표. 키는 화면이 부르는 이름(지도, place_<id>, scene_<id>, 회사 사무실, 옛 장소 이름)이다.
// 고등학교마다 다른 교내 지도(사용자 지시 2026-11-16). 서울고는 map-high를 그대로 쓴다.
const HI_MAP = { 느티여고: 'map-high-girls', 서울과학고: 'map-high-science', 새길직업고: 'map-high-voc' };
function bgListFor(s, key) {
  const p = s ? PRE[stageOf(s)] : 'el';
  const hiMap = HI_MAP[s?.school?.고등];
  const fixed = {
    map_town: s && stageOf(s) === '고등' ? ['map-town-hi', 'map-town'] : ['map-town'], map_seoul: ['map-seoul'], map_e: ['map-elementary'], map_m: ['map-middle'], map_h: hiMap ? [hiMap, 'map-high'] : ['map-high'], map_u: ['map-university'],
    office1: ['wk-office'], office2: ['wk-office'], office3: ['wk-office', 'un-club'],
    e_class: ['el-classroom'], m_class: ['mi-classroom'], h_class: ['hi-classroom'], u_class: ['un-classroom'],
    e_yard: ['el-yard'], m_yard: ['mi-yard'], h_yard: ['hi-yard'], u_yard: ['un-yard'],
    bank: ['mi-office', 'wk-office'], cafe: ['un-club', 'store'], restaurant: ['hi-cafeteria', 'un-club'], lounge: ['un-club', 'wk-office'],
    park: ['un-yard', 'el-yard'], wedding: ['ev-graduation', 'home-apt'], stage: ['el-music', 'un-classroom'], army: ['hi-yard'], mit: ['un-yard'], golf: ['un-yard'], gallery: ['un-club'], marina: ['moment-up'],
    street: ['el-stationery', 'mi-snack'],
  };
  if (fixed[key]) return [key, ...fixed[key]];
  if (!s) return [key];
  const place = key.replace(/^(place|scene)_/, ''), scene = key.startsWith('scene_');
  const byPlace = {
    home: homeList(s), school: [ROOM.yard[p]],
    park: ['park', ROOM.yard[p]], work: workList(s), shop: [ROOM.shop[p], 'store'],
    hill: ['isl-lobby', 'isl-office', 'office1'], other: ['other-school'], cafe: ['cafe', 'un-club', 'store'], town: ['restaurant', 'lounge', 'moment-up', 'store'],
    classroom: [ROOM.classroom[p]], lab: [ROOM.lab[p]], hall: scene ? hallList(p) : [ROOM.office[p]], ground: [ROOM.yard[p]], office: [ROOM.office[p]], library: [ROOM.library[p]],
  };
  if (key === 'scene' || key === 'home') return homeList(s);
  return [key, ...(byPlace[place] ?? [])];
}
setBgTable((key) => bgListFor(appCtx.s, key));
// 이야기 내용으로 고르는 배경. 제목에서 먼저, 없으면 본문의 장소 말에서 찾는다. 행사는 ev-*.
const EVENT_BG = [
  [/설날|세배/, () => ['ev-seollal', 'home-winter']], [/추석|송편/, () => ['ev-chuseok', 'home-autumn']], [/크리스마스|성탄/, () => ['ev-christmas', 'home-winter']],
  [/운동회|체육대회|계주|이어달리기|달리기/, (p) => ['ev-sports', ROOM.yard[p]]], [/입학|새 학교|첫날|개강/, (p) => ['ev-entrance', ROOM.classroom[p]]], [/졸업/, (p) => ['ev-graduation', ROOM.yard[p]]],
  [/결혼|청혼|웨딩/, () => ['wedding', 'ev-graduation', 'home-apt']], [/입대|군대|복무|훈련소|전역|휴가 나온/, () => ['army', 'hi-yard']], [/MIT/, () => ['mit', 'un-yard']],
  [/골프/, () => ['golf', 'un-yard']], [/전시|미술관|갤러리/, () => ['gallery', 'un-club']], [/요트|마리나/, () => ['marina', 'moment-up']], [/무대|공연|콘서트|축제|학예회/, (p) => ['stage', ROOM.lab[p]]],
];
const WORD_BG = [
  [/은행|통장|대출|적금|예금/, () => ['bank', 'mi-office']], [/카페|커피/, () => ['cafe', 'un-club']], [/회식|식당|저녁 자리/, () => ['restaurant', 'hi-cafeteria']], [/라운지|사교모임/, () => ['lounge', 'un-club']], [/공원|한강/, (p) => ['park', ROOM.yard[p]]],
  [/도서관|도서실|독서/, (p) => [ROOM.library[p]]], [/독서실|자율학습|야자/, () => ['hi-study_hall']], [/매점/, () => ['mi-snack']], [/문방구/, () => ['el-stationery']], [/급식|학생식당/, () => ['hi-cafeteria']],
  [/옥상|계단/, () => ['mi-rooftop']], [/방송실|방송부/, () => ['mi-broadcast']], [/음악실|합창|피아노/, () => ['el-music']], [/과학실|실험실/, () => ['hi-lab']], [/공작|실습/, () => ['hi-workshop']], [/교무실|상담/, (p) => [ROOM.office[p]]],
  [/동아리/, (p) => [p === 'hi' ? 'hi-club' : 'un-club']], [/편의점|계산대|부모님 가게/, (p, s) => (s?.flags?.부모_찻집 ? ['tea-inside', 'store'] : ['store'])], [/찻집/, () => ['tea-inside', 'cafe']], [/사무실|출근/, () => ['office1', 'wk-office']],
];
export function storyBg(s, d) {
  const p = PRE[stageOf(s)], key = d.place ? `scene_${d.place}` : 'scene', file = `${key}_${stageOf(s)}_${seasonOf(s.month)}`;
  const hit = (table, t) => table.find(([re]) => re.test(t ?? ''))?.[1](p, s) ?? [];
  const event = hit(EVENT_BG, d.title), word = event.length ? [] : hit(WORD_BG, d.title).length ? hit(WORD_BG, d.title) : hit(WORD_BG, d.beats?.[0] ?? d.text); // 본문은 첫 문장만 본다. 뒤 문장의 장소 말은 그 장면의 자리가 아닐 때가 많다
  const armyNow = inArmy(s) ? ['army', 'hi-yard'] : [];
  return [...(d.bg ?? []), file, ...event, ...armyNow, ...word, ...bgListFor(s, key)];
}
const SKY = 'linear-gradient(180deg,var(--sky1),var(--sky2) 62%,var(--sky3))';
// key는 장소 키 또는 파일 후보 목록. 그림이 있으면 계절 하늘 장식을 끄고 계절빛만 살짝 얹는다.
export function backdrop(s, key, extra = '') {
  const season = seasonOf(s.month);
  const list = Array.isArray(key) ? key : [`${key}_${stageOf(s)}_${season}`, ...bgListFor(s, key)];
  const art = hasBg(list);
  const el = h('div', { className: `backdrop season-${season} ${art ? 'has-art' : ''} ${extra}`.trim(), 'aria-hidden': 'true' }, art ? null : [h('i', { className: 'bd-orb' }), h('i', { className: 'bd-fall' }), h('i', { className: 'bd-ground' })]);
  bgInto(el, list, SKY);
  return el;
}
// 표가 있는 그림으로 이어지는지 시험에서 본다.
export const bgTableForTest = bgListFor;

// ---------- 인물 ----------
let byNameMap = null;
const byName = (n) => (byNameMap ??= new Map(Object.entries(network.schoolNames()).map(([id, x]) => [x, id]))).get(n);
const looksId = (w) => /^[a-z]\d+$/.test(w);
export function whoName(who) {
  if (!who) return null;
  if (!looksId(who)) return who;
  return network.schoolNameOf(who) ?? network.personOf(who)?.이름 ?? love.personOf(who)?.이름 ?? null;
}
export function whoId(who) {
  if (!who || who === '부모님') return null;
  if (looksId(who)) return who;
  return byName(who) ?? network.allPeople().find((p) => p.이름 === who)?.id ?? null;
}
// 있는 사진 중 지금 시기에 가장 가까운 것을 고른다. 시기가 지나면 마지막으로 찍힌 때의 사진을 쓴다.
// 사진이 없으면 뒤의 이름 글자가 보인다.
export function portrait(who, stage) {
  const name = whoName(who), id = whoId(who), img = id ? photo(id, stage) : null;
  return h('div', { className: 'who-pic' }, h('span', { className: 'who-letter', 'aria-hidden': 'true', text: (name ?? '?').replace(/ 선생님$/, '').slice(0, 1) }), img);
}
// 주인공 사진 자리. images/me 파일이 생기면 실루엣을 덮는다.
export function mePic(s) {
  const wrap = h('div', { className: 'me-pic' });
  wrap.append(h('div', { className: 'me-shape', 'aria-hidden': 'true', innerHTML: '<svg viewBox="0 0 120 150"><circle cx="60" cy="46" r="27"/><path d="M12 150c0-44 21-72 48-72s48 28 48 72z"/></svg>' }));
  if (hasMe(`${s.sex}_${stageOf(s)}`)) wrap.append(photo('me', stageOf(s), s.sex));
  return wrap;
}
// 이 문장에 나오는 가족. 사진이 있는 사람만 돌려준다.
const KIN = [['아버지', /아버지|아빠/], ['어머니', /어머니|엄마/], ['할머니', /할머니/]];
// '민혁의 어머니'처럼 남의 가족은 빼고 본다.
export function kinOf(text, who, extra = []) {
  const t = String(text ?? '').replace(/[가-힣]+(?:의|네) (?:아버지|아빠|어머니|엄마|할머니)/g, ''), both = who === '부모님' || /부모님/.test(t);
  // extra: 그 이야기에만 나오는 사람(예: 섬의 노인). 이름표와 정규식을 이야기 자료가 넘긴다.
  return [...KIN.filter(([n, re]) => re.test(t) || (both && n !== '할머니')), ...extra.filter(([, re]) => re.test(t))].map(([n]) => n);
}
export function kinCard(name, stage) {
  const img = kinPhoto(name, stage);
  return img ? h('div', { className: 'who-pic' }, img) : null;
}

// ---------- 작은 추이선 ----------
export function spark(values, label) {
  const v = values.filter(Number.isFinite); if (v.length < 2) return null;
  const lo = Math.min(...v), hi = Math.max(...v), W = 300, H = 72, x = (i) => 4 + i * (W - 8) / (v.length - 1), y = (n) => (hi === lo ? H / 2 : H - 6 - (n - lo) / (hi - lo) * (H - 12));
  const pts = v.map((n, i) => `${x(i).toFixed(1)},${y(n).toFixed(1)}`).join(' ');
  return h('div', { className: 'spark', role: 'img', 'aria-label': label, innerHTML: `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>` });
}
export const pct = (r) => `${r >= 0 ? '+' : '−'}${Math.abs(Math.round(r * 100))}%`;
