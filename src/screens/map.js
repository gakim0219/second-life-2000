// 동네·학교 지도와 장소 화면. 활동과 성적은 규칙 함수에서 받기만 한다.
import { abroadSheet } from './abroad.js';
import { h, won, bgInto, hasBg, kinPhoto } from '../ui.js';
import { stageOf } from '../rules.js';
import { raceOf } from '../election.js';
import { placesOf, schoolPlacesOf, doAction, homeBrief, groups, listActions, storyPlaceOf, previewAction, effectText, FLEX_BRANCH_ICON, FLEX_ICON, ownedList, upkeepOf, releaseOwned, projectStatus } from '../activities.js';
import { rankText, sizeOfRank, reportCard, fameLevel, calendar, examOf, examPending, enrolled, inArmy, isVacation } from '../school.js';
import { contestState } from '../contest.js';
import { eventById } from '../events.js';
import { bondStage, knows } from '../bonds.js';
import { showMet } from './love.js';
import { openCashier, openKaraoke, nextBar, kinCard } from './common.js';
import { officeStaff, islandPeople, islandProfile } from '../../data/events_island.js';
import { icon } from './icons.js';
import { face, heartsEl, mateMark, crowd, nameOf, tagOf, photoOf, PLACE_NAME } from './people.js';

// ───────── 지도 자료 ─────────
const MAP_KEY = { 초등: 'map_e', 중학: 'map_m', 고등: 'map_h', 대학: 'map_u' };
// 핀 위치는 지도 위 %. 얼굴줄과 이름표를 합쳐 320px 폭에서도 겹치지 않게 잡았다.
const TOWN_PINS = { school: [32, 7], cafe: [76, 5], park: [24, 38], town: [76, 30], home: [24, 66], work: [76, 56], shop: [72, 80], other: [24, 80] };
// 서울 지도. 광화문 사무소가 열리면 탭이 생긴다. 동네 핀은 동네 지도로 돌아간다.
const SEOUL_PINS = { hill: [44, 25], town_back: [22, 68] };
const SCHOOL_PINS = {
  map_e: { classroom: [28, 6], lab: [74, 15], hall: [27, 41], ground: [66, 66] },
  map_m: { classroom: [72, 5], lab: [26, 18], hall: [72, 40], ground: [32, 66] },
  map_h: { classroom: [28, 5], lab: [74, 22], hall: [27, 45], ground: [68, 68] },
  map_u: { classroom: [50, 5], lab: [24, 32], hall: [76, 40], ground: [38, 70] },
};
const SCHOOL_OPEN_AT = { 중학: [200203, '중학교'], 고등: [200503, '고등학교'], 대학: [200803, '대학'] };
const LADDER = [['초등', '초등'], ['중학', '중학'], ['고등', '고등'], ['대학', '대학']];
const PLACE_GROUP = { shop: ['꾸미기'], cafe: ['인맥 관리', '만남'], town: ['플렉스', '놀기'], other: ['다른 학교'], work: ['과외 알바'], school: ['학교'], park: ['운동'], home: ['공부', '휴식'] };
const ELECTION = { 초등: [200104, '전교회장 선거'], 중학: [200304, '학생회장 선거'], 고등: [200604, '학생회장 선거'] };
const YM = (s) => s.year * 100 + s.month;
const ymText = (v) => `${Math.floor(v / 100)}년 ${v % 100}월`;

// 그림이 없을 때 보이는 종이 지도. 그림이 있으면 그 위를 덮는다.
const tree = (x, y, r = 8) => `<circle class="a-tree" cx="${x}" cy="${y}" r="${r}"/>`;
const bld = (x, y, w, ht, cls = 'a-roof') => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${ht}" rx="3"/>`;
const road = (d, cls = 'a-road') => `<path class="${cls}" d="${d}"/>`;
const svg = (body) => `<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect class="a-paper" width="300" height="400"/>${body}</svg>`;
const ART = {
  map_town: svg(`<path class="a-water" d="M-10 330 C60 300 90 350 150 330 S260 290 310 320 L310 350 C260 320 220 360 150 358 S60 330 -10 360Z"/>
${road('M0 120 H300')}${road('M0 232 H300')}${road('M150 0 V400')}${road('M40 0 V400','a-road thin')}${road('M262 0 V400','a-road thin')}
<rect class="a-green" x="170" y="10" width="110" height="95" rx="16"/>${tree(195, 40)}${tree(225, 72, 10)}${tree(255, 38)}
${bld(58, 30, 74, 62)}${bld(90, 136, 120, 74, 'a-wall')}<rect class="a-field" x="108" y="146" width="84" height="46" rx="22"/>
${bld(56, 244, 76, 52, 'a-wall')}${bld(172, 244, 84, 34)}${bld(56, 368, 76, 40)}${bld(172, 366, 84, 40, 'a-wall')}`),
  map_seoul: svg(`<path class="a-green" d="M0 0 H300 V46 C240 70 190 30 150 52 S60 74 0 50Z"/><path class="a-water" d="M-10 250 C60 230 110 280 170 262 S260 236 310 256 L310 292 C250 272 210 300 160 300 S50 268 -10 290Z"/>
${road('M150 60 V250')}${road('M0 150 H300','a-road thin')}${road('M60 300 V400','a-road thin')}${road('M0 340 H300','a-road thin')}
${bld(112, 62, 76, 40, 'a-wall')}${bld(100, 112, 36, 30)}${bld(164, 112, 36, 30)}<circle class="a-green" cx="210" cy="196" r="26"/>${tree(210, 196, 6)}
${bld(190, 312, 34, 44)}${bld(232, 320, 30, 52, 'a-wall')}${bld(30, 318, 54, 34, 'a-wall')}${bld(96, 350, 40, 28)}`),
  map_e: svg(`${road('M0 386 H300')}${bld(14, 62, 150, 70, 'a-wall')}${bld(14, 62, 42, 150, 'a-wall')}${bld(180, 66, 104, 62)}${bld(40, 190, 120, 64)}
<ellipse class="a-field" cx="200" cy="310" rx="84" ry="62"/><ellipse class="a-track" cx="200" cy="310" rx="62" ry="42"/>
${tree(30, 310, 16)}${tree(62, 344, 11)}${tree(100, 318, 13)}${tree(274, 180, 10)}${tree(250, 214, 8)}`),
  map_m: svg(`${road('M0 16 H300','a-road thin')}${bld(150, 50, 134, 84, 'a-wall')}${bld(24, 104, 92, 72)}${bld(146, 184, 138, 70)}
<rect class="a-field" x="14" y="280" width="190" height="106" rx="10"/><rect class="a-track" x="34" y="298" width="150" height="70" rx="6"/>
${tree(250, 310, 14)}${tree(276, 350, 11)}${tree(226, 362, 9)}${tree(70, 230, 12)}${tree(30, 216, 8)}`),
  map_h: svg(`${road('M150 400 V340','a-road thin')}${bld(16, 40, 158, 56, 'a-wall')}${bld(16, 112, 158, 40, 'a-wall')}${bld(170, 124, 114, 72)}${bld(22, 216, 108, 78)}
<ellipse class="a-field" cx="208" cy="326" rx="86" ry="62"/><ellipse class="a-track" cx="208" cy="326" rx="68" ry="46"/>
${tree(40, 342, 14)}${tree(82, 370, 11)}${tree(100, 324, 9)}${tree(266, 66, 13)}${tree(232, 40, 9)}`),
  map_u: svg(`<rect class="a-green" x="84" y="130" width="130" height="140" rx="20"/>${road('M150 0 V400')}${road('M0 200 H300')}${road('M24 400 C60 300 110 280 150 200','a-road thin')}
${bld(92, 46, 116, 56, 'a-wall')}${bld(14, 164, 62, 80)}${bld(224, 196, 64, 92, 'a-wall')}
<rect class="a-field" x="30" y="310" width="176" height="78" rx="12"/><rect class="a-track" x="48" y="324" width="140" height="50" rx="6"/>
${tree(120, 170, 11)}${tree(180, 232, 13)}${tree(110, 240, 8)}${tree(250, 96, 12)}${tree(262, 340, 14)}`),
};

// ───────── 이번 달 이야기 ─────────
// 어디에 놓일지는 activities.storyPlaceOf가 정한다.
const SCHOOL_SPOTS = ['classroom', 'lab', 'hall', 'ground'];
const storyList = (s) => (s.queue ?? []).map((id) => eventById(id)).filter(Boolean).map((e, i) => ({ id: e.id, title: e.title || '이번 달 이야기', who: e.who ?? null, place: storyPlaceOf(s, e), first: i === 0 }));
// 조건이 앞 장면의 플래그에 기대는 이야기가 있어 큐 순서대로만 연다.
function openStory(ctx, st) {
  if (!st.first) { const f = storyList(ctx.s)[0]; ctx.toast(`앞선 이야기부터 이어집니다: ${f?.title ?? ''}`); return; }
  ctx.go('scene', { event: st.id });
}

// ───────── 시험 일정과 성적 ─────────
function peekExam(s, n) {
  let { year, month } = s;
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const t = { ...s, year, month };
    out.push({ year, month, exam: enrolled(t) ? examOf(t) : null, vac: enrolled(t) && isVacation(t) });
    month += 1; if (month === 13) { month = 1; year += 1; }
  }
  return out;
}
function lastExam(card) {
  const e = card.current?.exams ?? [];
  if (e.length) return e[e.length - 1];
  const h0 = card.history[card.history.length - 1];
  return h0?.exams?.[h0.exams.length - 1] ?? null;
}
function gradeWords(s, card) {
  const st = card.stage;
  const last = lastExam(card);
  if (st === '초등') return ['통지표', '서술식', '석차', last?.rank ? `${last.rank} / 35` : '시험 전'];
  if (st === '대학') return ['평점', card.gpa != null ? card.gpa.toFixed(2) : last?.gpa != null ? String(last.gpa) : '시험 전', '학과 석차', last?.rank ? `${last.rank} / 40` : '시험 전'];
  return ['내신', last?.grade ?? '시험 전', '석차', last?.rank ? `${last.rank} / 35` : '시험 전'];
}
// fresh: 방금 시험을 봤으면 그 결과를 맨 위에 보여 준다.
export function reportSheet(ctx, fresh = false) {
  const s = ctx.s;
  const card = reportCard(s);
  const examLine = (x) => {
    const tail = [x.grade, x.gpa != null ? `평점 ${x.gpa}` : null, rankText(x)].filter(Boolean).join(', ') || `${x.percent}%까지 익혔다`;
    return h('li', { className: 'row between' }, h('span', { text: `${x.year}년 ${x.month}월 ${x.kind}` }), h('b', { className: 'num', text: tail }));
  };
  ctx.sheet((close) => h('div', { className: 'stack report' },
    h('h2', { text: '성적표' }),
    fresh && card.current?.exams.length ? (() => {
      const x = card.current.exams.at(-1);
      return h('section', { className: 'panel stack exam-fresh' },
        h('span', { className: 'sub', text: `${x.year}년 ${x.month}월 ${x.kind}` }),
        x.rank ? h('b', { className: 'num exam-rank', text: `${rankText(x)} / ${sizeOfRank(x)}명` }) : null,
        h('p', { text: [x.grade, x.gpa != null ? `평점 ${x.gpa}` : null, `이번 학기 공부 ${x.percent}%`].filter(Boolean).join(' · ') }),
        card.current.preview.note ? h('p', { className: 'sub', text: card.current.preview.note }) : null);
    })() : null,
    card.current ? h('section', { className: 'panel stack' },
      h('div', { className: 'row between' }, h('b', { text: `${s.year}년 ${card.current.term}` }), h('span', { className: 'num', text: `공부 ${card.current.percent}%` })),
      h('div', { className: 'meter', role: 'img', 'aria-label': `학기 공부 ${card.current.percent}%` }, h('i', { style: `width:${card.current.percent}%` })),
      card.current.done ? h('p', { className: 'sub', text: '이번 학기 시험은 다 봤다. 다음 학기가 시작되면 공부는 처음부터 다시 쌓인다.' }) : null,
      !card.current.done && !card.current.taken ? h('p', { className: 'sub', text: `지금 이대로 시험을 보면 ${[card.current.preview.grade, card.current.preview.gpa != null ? `평점 ${card.current.preview.gpa}` : null, rankText(card.current.preview)].filter(Boolean).join(', ')} 정도다.` }) : null,
      card.current.exams.length ? h('ul', { className: 'report-list' }, card.current.exams.map(examLine)) : h('p', { className: 'sub', text: '이번 학기 시험은 아직이다.' })) : h('p', { className: 'card', text: '지금은 학교에 다니지 않는다.' }),
    card.gpa != null ? h('p', { text: `지금까지 평점 ${card.gpa.toFixed(2)}${card.warnings ? ` · 학사 경고 ${card.warnings}번` : ''}` }) : null,
    card.history.length ? h('section', { className: 'stack' }, h('h3', { text: '지난 학기' }),
      h('ul', { className: 'report-list dark' }, card.history.map((t, i) => [t, i]).sort((a, b) => b[0].year - a[0].year || a[1] - b[1]).map(([t]) => h('li', { className: 'row between' },
        h('span', { text: `${t.year}년 ${t.term} (${t.stage})` }), h('b', { className: 'num', text: [t.grade, t.gpa != null ? `평점 ${t.gpa}` : null, rankText(t)].filter(Boolean).join(', ') || `${t.percent}%` }))))) : null,
    h('button', { className: 'btn', on: { click: close } }, '닫기')));
}

// 학교 정보 카드. 접으면 한 줄, 펼치면 일정과 공부.
let cardOpen = false;
function schoolCard(ctx, s) {
  const st = stageOf(s);
  const cal = calendar(s);
  if (st === '사회인') return null;
  const lock = lockReason(s);
  if (lock) return h('section', { className: 'card row' }, h('span', { className: 'lock-ico ico-lock', 'aria-hidden': 'true' }), h('p', { className: 'sub', text: lock }));
  const card = reportCard(s);
  const [a, b, c, d] = gradeWords(s, card);
  const toggle = () => { cardOpen = !cardOpen; ctx.go('map', ctx.cur.params, { replace: true }); };
  return h('section', { className: 'panel stack school-card' },
    h('button', { className: 'row between sc-head', 'aria-expanded': String(cardOpen), on: { click: toggle } },
      h('span', { className: 'stack sc-title' },
        h('b', { text: `${cal.school ?? cal.label}` }),
        h('span', { className: 'sub', text: `${cal.vacation ? cal.vacationName : cal.term} · ${a} ${b} · ${c} ${d} · 인지도 ${fameLevel(s)}` })),
      h('span', { className: 'sc-fold', text: cardOpen ? '접기' : '펼치기' })),
    cardOpen ? h('div', { className: 'stack' },
      h('div', {}, h('div', { className: 'row between' }, h('span', { className: 'sub', text: `${card.current.term} 공부` }), h('b', { className: 'num', text: `${card.current.percent}%` })),
        h('div', { className: 'meter', role: 'img', 'aria-label': `학기 공부 ${card.current.percent}%` }, h('i', { style: `width:${card.current.percent}%` }))),
      h('ol', { className: 'sc-months' }, peekExam(s, 6).map((m) => h('li', { className: `${m.exam ? 'exam' : ''} ${m.vac ? 'vac' : ''}`.trim() }, h('b', { className: 'num', text: `${m.month}월` }), h('span', { text: m.exam ? m.exam.slice(0, 2) : m.vac ? '방학' : ' ' })))),
      cal.vacationPeriod ? h('p', { className: 'sub', text: `방학 기간: ${cal.vacationPeriod}` }) : null,
      ...cal.notes.filter((n) => !/시험|고사|평가/.test(n)).map((n) => h('p', { className: 'sub', text: n })),
      h('button', { className: 'btn sun', on: { click: () => reportSheet(ctx) } }, '성적표 보기')) : null);
}

// ───────── 이번 달 할 일 ─────────
export function todoRows(ctx, s) {
  const rows = [];
  const cal = calendar(s);
  const brief = homeBrief(s);
  const place = (id) => () => ctx.go('place', { id });
  for (const st of storyList(s)) rows.push({ tag: '이야기', title: st.title, sub: PLACE_NAME[st.place], go: () => openStory(ctx, st), hot: st.first });
  if (examPending(s)) rows.push({ tag: '시험', title: `${cal.exam} 보기`, sub: `공부 ${Math.round(s.study)}% · 교실`, go: place('classroom'), hot: true });
  for (const kind of cal.holidays) rows.push({ tag: '명절', title: kind === '생일' ? '내 생일' : kind });
  for (const t of brief.todo) {
    if (t === '선거 홍보') { const r = raceOf(s); rows.push({ tag: '선거', title: '선거 홍보', sub: r ? `${r.post} 후보 · 지지도 ${r.share}% · ${r.rank}위` : undefined, go: () => ctx.go('map', { view: 'school' }) }); }
    else if (t === '탐구 과제 기록') { const ps = projectStatus(s); rows.push({ tag: '과제', title: '탐구 과제 기록', sub: `${ps.count}/${ps.total}장 · 과학실`, go: place('lab'), hot: true }); }
    else if (t === '약속 있음') rows.push({ tag: '약속', title: s.promises.map((p) => nameOf(p.id)).join(', ') + '과 약속', go: () => ctx.go('people') });
  }
  for (const c of contestState(s).todos) rows.push({ tag: '대회', title: c.title, done: c.done, go: () => ctx.go('account') });
  const el = ELECTION[stageOf(s)];
  if (el && YM(s) === el[0] - 1) rows.push({ tag: '선거', title: `다음 달 ${el[1]}` });
  return rows;
}
// 선거 현황: 내 자리 후보들의 지지도. 등록부터 개표까지만 보인다.
function racePanel(s, ctx) {
  const r = raceOf(s); if (!r) return null;
  return h('section', { className: 'panel stack el-race' },
    h('div', { className: 'row between' }, h('b', { text: `조별 지지도 · 나는 ${r.post} 후보` }), h('span', { className: 'sub', text: r.rank === 1 ? '지금 1위' : `지금 ${r.rank}위` })),
    r.rows.map((x) => h('div', { className: `el-row${x.me ? ' me' : ''}` }, h('span', { className: 'el-name', text: x.name }), h('span', { className: 'el-bar' }, h('i', { style: `width:${x.share}%` })), h('b', { className: 'num', text: `${x.share}%` }))),
    h('p', { className: 'sub', text: '회장·부회장 후보가 한 조로 나가고, 지지도가 가장 높은 조가 당선된다. 상대 조도 투표가 가까워질수록 표를 모은다.' }),
    ctx ? h('div', { className: 'stack el-spots' }, schoolPlacesOf(s).flatMap((p) => p.actions.filter((a) => a.kind === 'promo' && a.ok).map((a) =>
      h('button', { className: 'btn', on: { click: () => ctx.go('place', { id: p.id }) } }, h('span', { className: 'chip', text: p.name }), a.label.replace('선거 홍보: ', ''))))) : null);
}
export function todoPanel(ctx, s, close) {
  const rows = todoRows(ctx, s).map((r) => (r.go && close ? { ...r, go: () => { close(); r.go(); } } : r));
  const brief = homeBrief(s);
  return h('section', { className: 'panel stack todo' },
    h('div', { className: 'row between' }, h('h2', { text: '이번 달 할 일' }), h('span', { className: 'sub num', text: `남은 칸 ${Math.max(0, brief.slotsLeft)} / ${brief.capacity}` })),
    rows.length ? h('ul', {}, rows.map((r) => h('li', {}, h(r.go ? 'button' : 'div', { className: `todo-row ${r.done ? 'done' : ''} ${r.hot ? 'hot' : ''}`, on: r.go ? { click: r.go } : {} },
      h('span', { className: 'todo-tag', text: r.done ? '✓' : r.tag }),
      h('span', { className: 'todo-title', text: r.title }),
      r.sub ? h('span', { className: 'sub todo-sub', text: r.sub }) : null))))
      : h('p', { className: 'sub', text: '이번 달은 정해진 일이 없다. 칸을 어떻게 쓸지는 내 몫이다.' }),
    brief.finishPrompt ? h('p', { className: 'sub', text: '이번 달 칸을 다 썼다. 다음 달로 넘어갈 수 있다.' }) : null);
}

// ───────── 지도 ─────────
function lockReason(s) {
  const st = stageOf(s);
  if (inArmy(s)) return '복무 중에는 학교에 없다. 전역하면 다시 돌아온다.';
  if (st === '사회인') return '학교를 졸업했다. 지금은 회사와 동네에서 지낸다.';
  if (!enrolled(s)) return st === '대학' && s.school?.대학 === 'MIT' ? '2008년 9월에 입학한다. 그때까지는 동네에서 지낸다.' : '지금은 학교에 다니지 않는다.';
  return null;
}
function pinButton({ ctx, s, x, y, label, ids, stories, lock, why, go }) {
  const faces = ids.slice(0, 3);
  const more = ids.length - faces.length;
  const aria = [label, ids.length ? `${ids.length}명` : '', stories ? `이야기 ${stories}개` : '', lock ? `잠김: ${why ?? ''}` : ''].filter(Boolean).join(', ');
  return h('button', { className: `pin ${stories ? 'story' : ''} ${lock ? 'locked' : ''}`.trim(), style: `left:${x}%;top:${y}%`, 'aria-label': aria, on: { click: lock ? () => ctx.toast(why ?? '아직 열리지 않았습니다.') : go } },
    faces.length ? h('span', { className: 'pin-faces' }, faces.map((id) => face(id, s)), more > 0 ? h('span', { className: 'pin-more num', text: `+${more}` }) : null) : null,
    h('span', { className: 'pin-label' }, lock ? h('span', { className: 'ico-lock', 'aria-hidden': 'true' }) : null, h('span', { text: label }), stories ? h('b', { className: 'pin-n num', text: String(stories) }) : null));
}
function placeWhy(s, id, all) {
  const g = all.filter((x) => PLACE_GROUP[id]?.includes(x.name));
  return g.map((x) => x.why).find(Boolean) ?? null;
}
function mapBox(key, label, pins, banner) {
  return h('div', { className: 'mapbox', role: 'group', 'aria-label': label },
    h('div', { className: 'map-art', innerHTML: ART[key] }),
    hasBg(key) ? bgInto(h('div', { className: 'map-img' }), key, 'none') : null,
    banner ? h('span', { className: 'map-banner', text: banner }) : null,
    pins);
}
function townMap(ctx, s, stories, people) {
  const places = placesOf(s);
  const all = groups(s);
  const st = stageOf(s);
  const lock = lockReason(s);
  const pins = places.filter((p) => !p.seoul && (p.id !== 'other' || p.open)).map((p) => {
    const [x, y] = TOWN_PINS[p.id];
    if (p.id === 'school') {
      const list = SCHOOL_SPOTS.flatMap((k) => people[k] ?? []);
      const n = stories.filter((t) => SCHOOL_SPOTS.includes(t.place)).length;
      if (st === '사회인') return pinButton({ ctx, s, x, y, label: '회사', ids: [], stories: 0, go: () => ctx.go('company') });
      return pinButton({ ctx, s, x, y, label: calendar(s).school ?? calendar(s).label, ids: list, stories: n, lock: !!lock, why: lock, go: () => ctx.go('map', { view: 'school' }, { replace: true }) });
    }
    return pinButton({ ctx, s, x, y, label: p.name, ids: people[p.id] ?? [], stories: stories.filter((t) => t.place === p.id).length, lock: !p.open, why: placeWhy(s, p.id, all), go: () => ctx.go('place', { id: p.id }) });
  });
  return mapBox('map_town', '동네 지도', pins);
}
function seoulMap(ctx, s, stories) {
  const pins = placesOf(s).filter((p) => p.seoul).map((p) => {
    const [x, y] = SEOUL_PINS[p.id];
    return pinButton({ ctx, s, x, y, label: p.name, ids: [], stories: stories.filter((t) => t.place === p.id).length, lock: !p.open, why: '복무 중에는 갈 수 없습니다.', go: () => ctx.go('place', { id: p.id }) });
  });
  const [bx, by] = SEOUL_PINS.town_back;
  pins.push(pinButton({ ctx, s, x: bx, y: by, label: '우리 동네', ids: [], stories: stories.filter((t) => !placesOf(s).some((p) => p.seoul && p.id === t.place)).length, go: () => ctx.go('map', { view: 'town' }, { replace: true }) }));
  return mapBox('map_seoul', '서울 지도', pins);
}
function lockCard(title, text) {
  return h('div', { className: 'mapbox lockbox' },
    h('div', { className: 'map-art dim', innerHTML: ART.map_town }),
    h('div', { className: 'lock-note stack' }, h('span', { className: 'lock-ico big ico-lock', 'aria-hidden': 'true' }), h('h2', { text: title }), h('p', { className: 'sub', text })));
}
function schoolMap(ctx, s, stories, people, peek) {
  const st = stageOf(s);
  const cur = LADDER.findIndex(([k]) => k === st);
  const view = peek ?? st;
  const idx = LADDER.findIndex(([k]) => k === view);
  if (peek && peek !== st) {
    if (idx < cur) return lockCard(`${s.school?.[peek] ?? peek}`, '이미 졸업한 학교다. 지금 학교로 돌아가자.');
    const [at, word] = SCHOOL_OPEN_AT[peek];
    return lockCard(word, `${ymText(at)}에 ${word}에 가면 열린다. 지금은 ${calendar(s).school ?? calendar(s).label}에 다닌다.`);
  }
  const lock = lockReason(s);
  if (lock) return lockCard(calendar(s).label, lock);
  const key = MAP_KEY[st];
  const pinsAt = SCHOOL_PINS[key];
  const pins = schoolPlacesOf(s).map((p) => {
    const [x, y] = pinsAt[p.id];
    return pinButton({ ctx, s, x, y, label: p.name, ids: people[p.id] ?? [], stories: stories.filter((t) => t.place === p.id).length, go: () => ctx.go('place', { id: p.id }) });
  });
  const cal = calendar(s);
  return mapBox(key, `${cal.school ?? cal.label} 지도`, pins, cal.vacation ? `${cal.vacationName} · 교실이 비어 있다` : null);
}
function renderMap(ctx, params = {}) {
  const s = ctx.s;
  if (!s) { ctx.go('start', {}, { replace: true }); return h('div'); }
  const hasSeoul = placesOf(s).some((p) => p.seoul);
  const view = params.view === 'school' && stageOf(s) !== '사회인' ? 'school' : params.view === 'seoul' && hasSeoul ? 'seoul' : 'town';
  const seoulStories = hasSeoul ? storyList(s).filter((t) => placesOf(s).some((p) => p.seoul && p.id === t.place)).length : 0;
  const stories = storyList(s);
  const people = crowd(s);
  const st = stageOf(s);
  const cal = calendar(s);
  const peek = params.peek ?? null;
  const schoolLabel = st === '사회인' ? '회사' : cal.label;
  const setView = (v, extra = {}) => ctx.go('map', { view: v, ...extra }, { replace: true });
  const cur = LADDER.findIndex(([k]) => k === st);
  return h('div', { className: 'mapscreen stack' },
    h('div', { className: 'section-heading' }, h('span', { className: 'eyebrow', text: 'AROUND THE NEIGHBORHOOD' }), h('h1', { text: '오늘은 어디로 갈까?' }),
      h('p', { text: `${view === 'town' ? '우리 동네' : view === 'seoul' ? '서울' : cal.school ?? cal.label} · ${s.year}년 ${s.month}월. 이름표를 누르면 그곳의 사람과 할 일이 보여요.` })),
    h('div', { className: 'tabs map-tabs' },
      h('button', { 'aria-pressed': String(view === 'town'), text: '동네', on: { click: () => setView('town') } }),
      st === '사회인'
        ? h('button', { text: '회사', on: { click: () => ctx.go('company') } })
        : h('button', { 'aria-pressed': String(view === 'school'), className: lockReason(s) ? 'tab-lock' : '', text: schoolLabel, on: { click: () => setView('school') } }),
      hasSeoul ? h('button', { 'aria-pressed': String(view === 'seoul'), text: seoulStories ? `서울 ${seoulStories}` : '서울', on: { click: () => setView('seoul') } }) : null),
    view === 'school' ? h('div', { className: 'ladder', role: 'group', 'aria-label': '시기별 학교' }, LADDER.map(([k, label], i) => {
      const current = (peek ?? st) === k;
      return h('button', { className: `lad ${i > cur ? 'future' : i < cur ? 'past' : 'now'}`, 'aria-pressed': String(current), on: { click: () => setView('school', i === cur ? {} : { peek: k }) } },
        i > cur ? h('span', { className: 'ico-lock', 'aria-hidden': 'true' }) : i < cur ? h('span', { 'aria-hidden': 'true', text: '✓' }) : null, label);
    })) : null,
    view === 'town' ? townMap(ctx, s, stories, people) : view === 'seoul' ? seoulMap(ctx, s, stories) : schoolMap(ctx, s, stories, people, peek),
    view === 'school' && !peek ? racePanel(s, ctx) : null,
    todoPanel(ctx, s),
    schoolCard(ctx, s),
    nextBar(ctx));
}

// ───────── 장소 ─────────
const PLACE_TINT = { other: ['--rose', '--line'], home: ['--sun', '--bg2'], park: ['--leaf', '--bg2'], work: ['--coral', '--bg2'], shop: ['--rose', '--bg2'], cafe: ['--sun', '--line'], town: ['--rose', '--bg'], hill: ['--sun', '--bg2'], classroom: ['--sky', '--bg2'], lab: ['--leaf', '--line'], hall: ['--sun', '--line'], ground: ['--leaf', '--sky'] };
const placeBg = (id) => { const [a, b] = PLACE_TINT[id] ?? ['--sky', '--bg2']; return `linear-gradient(180deg,color-mix(in srgb,var(${a}) 30%,var(--bg2)),var(${b}))`; };
// 활동 결과는 알림으로 띄운다(사용자 지시 2026-11-12: 사람 카드와 할 일 사이에 칸이 생겨 버튼이 밀리지 않게).
const flexTabs = {}; // 장소별로 고른 갈래
function actionRow(ctx, s, a, placeId) {
  const chips = [];
  if (!a.route) chips.push(h('span', { className: 'chip num', text: a.free ? '칸을 쓰지 않음' : '칸 1' }));
  if (a.cost) chips.push(h('span', { className: 'chip num', text: won(a.cost) }));
  if (a.upkeep) chips.push(h('span', { className: 'chip num', text: `매달 ${won(a.upkeep)}` }));
  if (a.route) chips.push(h('span', { className: 'chip', text: '화면 이동' }));
  const fx = effectText(previewAction(s, a.id) ?? {});
  if (fx) chips.push(h('span', { className: 'chip num', text: fx }));
  const said = (r) => { const t = effectText(r.effects); return t ? `${r.text} (${t})` : r.text; };
  const run = () => {
    if (a.id === 'ab_status') { abroadSheet(ctx, s); return; }
    if (a.id === 'shop_help') { openCashier(ctx, (r) => { if (!r.ok) { ctx.toast(r.why); return; } ctx.toast(said(r)); ctx.refresh(); }); return; }
    if (a.id === 'play_karaoke') { openKaraoke(ctx, (r) => { if (!r.ok) { ctx.toast(r.why); return; } ctx.toast(said(r)); ctx.refresh(); }); return; }
    const r = doAction(s, a.id);
    if (!r.ok) { ctx.toast(r.why); return; }
    if (r.route) {
      if (r.route.tab === '회사') ctx.go('company');
      else if (r.route.tab === '마음') ctx.go('crush');
      else ctx.go('love', { way: r.route.way });
      return;
    }
    ctx.toast(r.icon ? `${r.icon} ${said(r)}` : said(r));
    ctx.refresh();
    if (r.exam) reportSheet(ctx, true);
    if (r.met) showMet(ctx, r.met); // 만난 사람을 시트로 보여 준다
  };
  const tier = a.level >= 8 ? ' top' : a.level >= 4 ? ' mid' : '';
  return h('button', { className: a.icon ? `act has-ico${tier}` : 'act', disabled: !a.ok, on: { click: run } },
    a.icon ? h('span', { className: 'act-ico', 'aria-hidden': 'true', text: a.icon }) : null,
    h('span', { className: 'act-name' }, !a.ok ? h('span', { className: 'ico-lock', 'aria-hidden': 'true' }) : null, a.label),
    h('span', { className: 'act-chips row wrap' }, chips),
    !a.ok && a.why ? h('span', { className: 'chip lock act-why', text: a.why }) : null);
}
// 소유 탭 위: 가진 것, 매달 나가는 돈, 정리 버튼. 정리하면 산 값은 돌려받지 못하고 유지비만 멈춘다.
const ownedIcon = (o) => { const [, br, i] = String(o.id).split('_'); return FLEX_ICON[br]?.[Number(i)] ?? '🔑'; };
function ownedPanel(ctx, s, placeId) {
  const list = ownedList(s);
  if (!list.length) return h('p', { className: 'sub own-empty', text: '아직 가진 것이 없다. 사면 매달 유지비가 나간다.' });
  const total = upkeepOf(s);
  const months = total ? Math.floor(s.cash / total) : null;
  const release = (o) => ctx.sheet((close) => h('div', { className: 'stack' },
    h('h2', { text: `${ownedIcon(o)} ${o.label} 정리` }),
    h('p', { text: `산 값은 돌려받지 못합니다. 다음 달부터 매달 ${won(o.upkeep)}이 나가지 않습니다.` }),
    h('button', { type: 'button', className: 'btn main', text: '정리한다', on: { click: () => { close(); const r = releaseOwned(s, o.id); if (!r.ok) { ctx.toast(r.why); return; } ctx.toast(`${ownedIcon(o)} ${o.label}: ${r.text}`); ctx.refresh(); } } }),
    h('button', { type: 'button', className: 'btn', text: '그만둔다', on: { click: close } })));
  return h('div', { className: 'panel own stack' },
    h('div', { className: 'row between own-head' }, h('b', { text: `가진 것 ${list.length}개` }), h('span', { className: 'num own-total', text: `매달 ${won(total)}` })),
    months != null && months < 12 ? h('p', { className: 'own-warn', text: months < 1 ? '다음 달 유지비가 모자라다. 못 내면 하나씩 잃는다.' : `지금 현금으로 ${months}달 버틸 수 있다.` }) : null,
    list.map((o) => h('div', { className: 'own-row' },
      h('span', { className: 'own-ico', 'aria-hidden': 'true', text: ownedIcon(o) }),
      h('span', { className: 'own-main' }, h('b', { text: o.label }), h('span', { className: 'small num', text: `${Math.floor(o.since / 100)}년 ${o.since % 100}월부터 · 매달 ${won(o.upkeep)}` })),
      h('button', { type: 'button', className: 'btn own-x', text: '정리', on: { click: () => release(o) } }))));
}
// 힐아일랜드 사람들: 이야기가 나아간 만큼 알게 된 것을 본다.
function hillSheet(ctx, s, key) {
  const p = islandProfile(s, key), who = islandPeople(s).find((x) => x.key === key); if (!p || !who) return;
  ctx.sheet((close) => h('div', { className: 'stack' },
    h('h2', { text: `${who.name} · 상세` }),
    h('section', { className: 'stack friend-info' }, h('b', { text: who.tag }), h('ul', {}, p.rows.map((t) => h('li', { text: t })))),
    p.hint ? h('p', { className: 'sub', text: p.hint }) : null,
    h('button', { className: 'btn', on: { click: close } }, '닫기')));
}
function hillPeople(ctx, s) {
  const list = islandPeople(s); if (!list.length) return null;
  return h('section', { className: 'stack' }, h('h2', { text: '힐아일랜드 사람들' }),
    h('div', { className: 'hill-people' }, list.map((m) => h('button', { className: 'hill-who', on: { click: () => hillSheet(ctx, s, m.key) } },
      h('span', { className: 'face lg' }, h('b', { text: [...m.name][0] }), kinPhoto(m.pic, stageOf(s))),
      h('span', { className: 'hill-who-text' }, h('b', { text: m.name }), h('span', { className: 'sub', text: m.tag }))))));
}
function renderPlace(ctx, params = {}) {
  const s = ctx.s;
  const id = params.id;
  const inSchool = SCHOOL_SPOTS.includes(id);
  const place = (inSchool ? schoolPlacesOf(s) : placesOf(s)).find((p) => p.id === id);
  if (!place) { ctx.go('map', {}, { replace: true }); return h('div'); }
  const brief = homeBrief(s);
  const people = crowd(s)[id] ?? [];
  const stories = storyList(s).filter((t) => t.place === id);
  const big = people.slice(0, 3);
  const staff = id === 'hill' ? officeStaff(s) : [];
  const rest = people.slice(3);
  let acts = place.actions;
  const branches = [...new Set(acts.map((a) => a.branch).filter(Boolean))];
  const tab = branches.includes(flexTabs[id]) ? flexTabs[id] : branches[0];
  if (branches.length) acts = acts.filter((a) => a.branch === tab);
  const cal = calendar(s);
  return h('div', { className: 'place stack' },
    h('div', { className: 'row between' },
      h('button', { className: 'nav-back', on: { click: () => ctx.back() } }, '‹ 지도'),
      h('span', { className: 'sub num place-slots', text: `칸 ${Math.max(0, brief.slotsLeft)} / ${brief.capacity}` })),
    bgInto(h('div', { className: 'place-hero' }, h('span', { className: 'place-shade', 'aria-hidden': 'true' }), h('div', { className: 'place-title' }, h('span', { className: 'eyebrow', text: inSchool ? cal.school ?? cal.label : place.seoul ? '서울' : '우리 동네' }), h('h2', { text: place.name })),
      big.length ? h('div', { className: 'stands' }, big.map((who) => {
        const known = knows(s, who) || s.partner?.id === who;
        const st = bondStage(s, who);
        return h('button', { className: 'stand', 'aria-label': known ? `${nameOf(who)}, ${st.label}` : '처음 보는 얼굴', on: { click: () => ctx.go('person', { id: who, here: true }) } },
          h('span', { className: 'stand-pic' }, photoOf(who, s) ?? h('b', { text: known ? [...nameOf(who)][0] : '?' })),
          h('span', { className: 'stand-tag' }, h('b', {}, known ? nameOf(who) : '처음 보는 얼굴', mateMark(s, who)), known ? heartsEl(st.hearts) : h('span', { className: 'sub', text: tagOf(s, who) })));
      })) : staff.length ? h('div', { className: 'stands' }, staff.map((m) => h('button', { className: 'stand', 'aria-label': `${m.name} 상세`, on: { click: () => hillSheet(ctx, s, '하연') } },
        h('span', { className: 'stand-pic' }, kinCard(m.pic, stageOf(s)) ?? h('b', { text: [...m.name][0] })),
        h('span', { className: 'stand-tag' }, h('b', { text: m.name }), h('span', { className: 'sub', text: m.tag }))))) : h('p', { className: 'place-empty', text: isVacation(s) && inSchool ? '방학이라 아무도 없다.' : '지금은 아무도 없다.' })), `place_${id}`, placeBg(id)),
    rest.length ? h('div', { className: 'place-more row wrap' }, rest.map((who) => h('button', { className: 'more-face', 'aria-label': knows(s, who) ? nameOf(who) : '처음 보는 얼굴', on: { click: () => ctx.go('person', { id: who, here: true }) } }, face(who, s)))) : null,
    id === 'home' && s.partner?.자녀?.length ? h('div', { className: 'place-more row wrap' }, s.partner.자녀.map((c) => h('button', { className: 'btn', text: c.이름, on: { click: () => ctx.go('family') } }))) : null,
    stories.length ? h('section', { className: 'stack' }, h('h2', { text: '이번 달 이야기' }),
      stories.map((t) => h('button', { className: `tale ${t.first ? '' : 'later'}`.trim(), on: { click: () => openStory(ctx, t) } },
        t.who && knows(s, t.who) ? face(t.who, s) : null,
        h('span', { className: 'tale-main' }, h('b', { text: t.title }), h('span', { className: 'small', text: t.first ? '지금 볼 수 있다' : '앞선 이야기 뒤에 이어진다' }))))) : null,
    inSchool ? racePanel(s) : null,
    id === 'hill' ? hillPeople(ctx, s) : null,
    h('section', { className: 'stack' }, h('h2', { text: `${place.name}에서 할 일` }),
      branches.length > 1 ? h('div', { className: 'tabs' }, branches.map((b) => h('button', { 'aria-pressed': String(b === tab), text: FLEX_BRANCH_ICON[b] ? `${FLEX_BRANCH_ICON[b]} ${b}` : b, on: { click: () => { flexTabs[id] = b; ctx.go('place', params, { replace: true }); } } }))) : null,
      tab === '소유' ? ownedPanel(ctx, s, id) : null,
      acts.length ? h('div', { className: 'stack acts' }, acts.map((a) => actionRow(ctx, s, a, id))) : h('p', { className: 'sub', text: '이번 달에 여기서 할 일은 없다.' })),
    inSchool ? h('button', { className: 'btn', on: { click: () => reportSheet(ctx) } }, '성적표 보기') : null,
    inSchool && examPending(s) ? h('p', { className: 'sub', text: `이번 달 ${cal.exam}. 지금까지 공부한 만큼 성적이 나온다.` }) : null);
}

export const screens = { map: renderMap, place: renderPlace };
