// 인물 시트, 만난 사람 목록, 수집. 학교 인물 이름·소속은 design/04~06 표에서 뽑았다(규칙 쪽에 표가 없다).
import { friendInfo, learnedNow } from '../friends.js';
import { profileOf, profileLearned } from '../profiles.js';
import { h, won, photo, fullPhoto, hasPhoto } from '../ui.js';
import { stageOf, jobAt } from '../rules.js';
import { canAppear } from '../cast.js';
import * as mz from '../messenger.js';
import { bondOf, bondStage, bondView, knows, knownPeople as bondPeople, talk, promise, cancelPromise, bump, isFirstTalk } from '../bonds.js';
import { knownPeople as lovePeople, personOf as lovePerson, likeText } from '../love.js';
import { jobNow, personOf as netPerson, schoolNameOf, friendHelps, helpFriend, askFunding, opportunities, attendBriefing, hearEarly } from '../network.js';
import { enrolled, inArmy, isVacation, examOf, reportCard, calendar } from '../school.js';
import { placesOf, projectStatus, homeBrief } from '../activities.js';
import { contestState } from '../contest.js';
import { albumOf, milestonesOf } from '../events.js';
import { newsScrap, visibleHints, pastMemories } from '../paper.js';
import { regressionNote, noteYears, halfNote, HALF_FROM, DISCLAIMER } from '../invest.js';
import { kinCard } from './common.js';
import { groups as actionGroups } from '../activities.js';
import { icon } from './icons.js';
import { isAdmin } from '../admin.js';

// ───────── 인물 표 ─────────
// 학교별 인물과 화면 꼬리표. 빈 값은 '같은 반'으로 보인다. 연애·돈·외모와 관련된 말은 꼬리표에 쓰지 않는다.
// 사진 없는 인물은 예전 세이브에 관계가 남아 있어도 보이지 않는다. 가족과 배우자는 그대로 둔다.
const shown = (s, id) => !/^[a-z]+\d/.test(id) || id === s.partner?.id || canAppear(id, stageOf(s));
const ROSTER = {"느티초":{"c01":"소꿉친구","c02":"친구","c03":"과학 퀴즈 맞수","c04":"","c05":"전학생","c06":"친구","c07":"이어달리기 맞수","c08":"","c09":"짝꿍","t01":"담임 선생님","t02":"담임 선생님"},"서일중":{"c01":"소꿉친구","c02":"","c03":"경시대회 맞수","c04":"","c05":"탐구 과제 파트너","c06":"친구","c07":"계주 맞수","c08":"","c10":"방송반 선배","c11":"친구의 친구","c13":"선배","t03":"과학반 선생님","t04":"담임 선생님"},"서울고":{"c07":"계주 맞수","c09":"다시 만난 친구","c11":"마당발 친구","c14":"성적 맞수","c34":"","c35":"방송반 선배","c36":"밴드부","c37":"도서관 친구","c111":"","c112":"","t05":"진학 상담"},"느티여고":{"c02":"친구","c04":"","c10":"방송반 선배","c15":"밴드부 보컬","c38":"성적 맞수","c39":"육상부","c40":"마당발","c41":"컴퓨터부 친구","c106":"","c107":"후배","c109":"","t12":"진학 상담"},"서울과학고":{"c16":"기숙사 룸메이트","c17":"연구 팀장","c18":"선배","c19":"화학반 친구","c42":"공부 맞수","c43":"탐구 과제 파트너","c44":"생물반 동료","c119":"물리 연구반","t06":"연구 과제 지도"},"새길직업고":{"c01":"소꿉친구","c06":"친구","c20":"의리 친구","c21":"수다 친구","c22":"알바 소개 선배","c23":"현실파 친구","c24":"장난꾼 친구","c120":"디자인과 실습반","t07":"현장실습"},"서울대":{"c25":"학회 선배","c26":"동기","c45":"친구","c46":"맞수","c47":"연구 동료","c48":"맞수","c49":"친구","c50":"친구","c51":"친구","c59":"맞수","c60":"친구","c61":"공모전 팀원","c62":"대동제 무대 짝","c63":"복학생 선배","c64":"늦깎이 선배","c65":"운동 동아리 주장","c66":"선배","c67":"학회 친구","c68":"영상 공모전 팀원","c69":"연합 동아리 선배","c70":"논문 공모전 팀원","c71":"운동 동아리 친구","c72":"무대 미술","c73":"학과 동기","c74":"연극 동아리","c75":"대동제 퀴즈 맞수","c76":"연합 동아리 총무","c77":"과외 자리 연결","c78":"학과 동기","c79":"교양 통계 조교","t08":"지도교수"},"MIT":{"c27":"룸메이트","c28":"적응 도우미","c52":"친구","c53":"선배","c80":"기숙사 친구","c81":"로켓 단체 동료","c82":"창업 동아리 선배","c83":"친구","c84":"친구","c85":"기숙사 친구","c86":"맞수","c87":"기숙사 맏형","c88":"무대 세트 선배","c89":"체스 친구","c90":"실험 조원","c91":"산책 친구","c92":"즉흥 코미디 선배","c93":"연구 참여 선배","c94":"수업 조교","c95":"수업 조교","c96":"국제 학생 모임 선배","c97":"기숙사 옆방","c98":"사진 단체 동료","c99":"물리 스터디 친구","c100":"프로그래밍 스터디장","c101":"실습 조원","c102":"로켓 단체 회장","c103":"요트 단체 친구","c104":"설계 수업 친구","c105":"합창 단체","t09":"연구실 지도교수"}};
// 그 학교에 있는 기간(YYYYMM). 없으면 학교 전체 기간.
const WINDOW = { '느티여고:c107': [200603, 999912], '느티초:t01': [0, 200102], '느티초:t02': [200103, 999912], '느티초:c05': [200009, 999912], '서일중:c08': [0, 200308], '서일중:c10': [0, 200402], '서일중:c13': [0, 200402], '서일중:t04': [200303, 200402], '서울고:c35': [0, 200702], '느티여고:c10': [0, 200702], '서울과학고:c18': [0, 200702], '새길직업고:c22': [0, 200602] };
const STAGES = ['초등', '중학', '고등', '대학', '사회인'];
const YM = (s) => s.year * 100 + s.month;
const hash = (t) => { let x = 2166136261; for (const c of String(t)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } x ^= x >>> 13; x = Math.imul(x, 1597334677); x ^= x >>> 16; return x >>> 0; };
const isTeacher = (id) => /^t\d/.test(id);
const isParent = (id) => id === '아버지' || id === '어머니';
const isKin = (id) => isParent(id) || id === '부모님';
// 쪽지·하교는 또래끼리만 어울린다.
const isPeer = (id) => /^c\d/.test(id);

export const PLACE_NAME = { home: '집', park: '공원', work: '일터', school: '학교', shop: '상가', cafe: '카페', town: '번화가', classroom: '교실', lab: '특별실', hall: '강당', ground: '운동장', hill: '광화문 사무소' };
export const nameOf = (id) => (isKin(id) ? id : schoolNameOf(id) ?? netPerson(id)?.이름 ?? lovePerson(id)?.이름 ?? id);
// 지금 시기에 가장 가까운 사진. 고르는 규칙은 ui.photo에 있다.
export const photoOf = (id, s) => (isParent(id) ? kinCard(id, stageOf(s)) : id === '부모님' ? null : photo(id, stageOf(s)));
export function tagOf(s, id) {
  if (isKin(id)) return '가족';
  const st = s.school?.[stageOf(s)];
  const list = [ROSTER[st], ...Object.values(s.school ?? {}).map((n) => ROSTER[n])].filter(Boolean);
  for (const r of list) if (r[id] !== undefined) return r[id] || '같은 반';
  // 풋풋한 마음에서 알게 된 다른 학교 아이.
  const teen = s.crush?.history?.[id]?.학교; if (teen) return teen === s.school?.고등 ? '같은 학교' : teen;
  const n = netPerson(id);
  if (n) return n.분류 === '동창' ? '동창' : n.분류 === '동네' ? '동네 어른' : n.세부 ?? n.분류;
  return lovePerson(id) ? '아는 사람' : isTeacher(id) ? '선생님' : '아는 사람';
}
// 얼굴 원형. 사진이 없으면 이름 첫 글자가 보인다.
export function face(id, s, cls = '', met = false) {
  const known = met || knows(s, id) || !!(s.love?.people?.[id] || s.partner?.id === id);
  const first = known ? [...nameOf(id)][0] : '?';
  return h('span', { className: `face ${cls} ${known ? '' : 'new'}`.trim(), 'aria-hidden': 'true' }, h('b', { text: first }), photoOf(id, s));
}
export const heartsEl = (n) => h('span', { className: 'hearts', role: 'img', 'aria-label': `하트 ${n}개`, text: '♥'.repeat(n) + '♡'.repeat(5 - n) });

// 해외에 나가 있는 동안은 동네에서 만날 수 없다(design/08_인물_인생흐름). MIT 사람들은 같은 학교에 다닐 때만 만난다.
const ABROAD = { c08: [200308, 201410, '미국'], c18: [200703, 999912, '미국'], c41: [202401, 999912, '캐나다'], c47: [201901, 999912, '호주'], c68: [201901, 999912, '싱가포르'] };
export function abroadOf(s, id) {
  const a = ABROAD[id]; if (a && YM(s) >= a[0] && YM(s) <= a[1]) return a[2];
  if (ROSTER.MIT?.[id] !== undefined && !(enrolled(s) && s.school?.[stageOf(s)] === 'MIT')) return '해외';
  return null;
}
const active = (id, school, s) => { const w = WINDOW[`${school}:${id}`]; return !w || (YM(s) >= w[0] && YM(s) <= w[1]); };
// 이번 달 어디에 누가 있는가. 같은 저장·같은 달이면 늘 같다. 규칙 쪽에 일정이 없어 화면에서 정한다.
export function crowd(s) {
  const out = {};
  const add = (p, id) => { (out[p] ??= []).push(id); };
  const seat = (id, list) => list[hash(`${s.seed ?? 1}:${s.year}:${s.month}:${id}`) % list.length];
  add('home', '아버지'); add('home', '어머니');
  if (s.partner?.id) add(s.partner.married ? 'home' : 'cafe', s.partner.id);
  if (inArmy(s)) return out;
  const school = s.school?.[stageOf(s)];
  const roster = enrolled(s) ? ROSTER[school] ?? {} : {};
  const atSchool = enrolled(s) && !isVacation(s);
  const here = Object.keys(roster).filter((id) => active(id, school, s));
  if (atSchool) {
    const known = here.filter((id) => s.bonds?.[id] != null && shown(s, id));
    // 아직 모르는 얼굴은 달마다 몇 명만 보인다.
    const fresh = here.filter((id) => s.bonds?.[id] == null && hasPhoto(id)).sort((a, b) => hash(`${s.year}${s.month}${a}`) - hash(`${s.year}${s.month}${b}`)).slice(0, 3);
    for (const id of [...known, ...fresh]) add(seat(id, isTeacher(id) ? ['hall', 'classroom', 'lab'] : ['classroom', 'ground', 'lab', 'hall']), id);
  }
  const spots = placesOf(s).filter((p) => p.open && ['park', 'cafe', 'town', 'shop'].includes(p.id)).map((p) => p.id);
  const away = Object.keys(s.bonds ?? {}).filter((id) => !isKin(id) && !(atSchool && here.includes(id)) && (s.bonds[id] ?? 0) >= 1 && shown(s, id) && !abroadOf(s, id) && timeOk(id, s) && (atSchool || !isTeacher(id)))
    .sort((a, b) => s.bonds[b] - s.bonds[a]).slice(0, 6);
  if (spots.length) for (const id of away) add(seat(id, spots), id);
  return out;
}
// 이미 아는 또래는 동창 모임이 열리기 전에도 동네에서 마주친다. 사람들 탭에서는 대화할 수 없기 때문이다.
const timeOk = (id, s) => { const p = netPerson(id); if (!p?.기간) return true; if (s.year > p.기간[1]) return false; return s.year >= p.기간[0] || isPeer(id); };

// ───────── 인물 시트 ─────────
const ym = (s) => s.year * 12 + s.month;
const SLOT = '이번 달 활동 칸을 다 썼습니다.';
const KIND_LABEL = { 대화: '이야기 나누기', 쪽지: '쪽지 건네기', 하교: '함께 하교하기', 놀기: '같이 놀러 가기' };
// 규칙 쪽에 첫 인사 함수가 없어 여기서 칸을 쓰고 사이를 시작한다.
function greet(s, id) {
  if (s.ended) return { ok: false, why: '이야기가 끝났습니다.' };
  if (inArmy(s)) return { ok: false, why: '복무 중에는 휴가 때만 만날 수 있습니다.' };
  bump(s, id, 1); // 처음 이야기하는 것이라 칸을 쓰지 않는다.
  (s.talkedAt ??= {})[id] = ym(s);
  return { ok: true, text: '먼저 말을 걸었다. 서로 이름을 알게 됐다.' };
}
const whereOf = (s, id) => Object.entries(crowd(s)).find(([, ids]) => ids.includes(id))?.[0];
function statusLine(s, id) {
  const where = whereOf(s, id);
  const out = [];
  if (isKin(id)) out.push('저녁이면 식탁에서 하루 이야기를 듣는다.');
  else if (where) out.push(`이번 달에는 ${PLACE_NAME[where]}에서 자주 보인다.`);
  const last = s.bondSeen?.[id];
  const gap = last == null ? null : ym(s) - last;
  if (gap != null && gap >= 24) out.push(`마지막으로 본 지 ${Math.floor(gap / 12)}년이 지났다.`);
  else if (gap != null && gap >= 6) out.push('한동안 얼굴을 못 봤다.');
  const here = ROSTER[s.school?.[stageOf(s)]]?.[id] !== undefined;
  if (!where && !isKin(id) && enrolled(s) && !here && isPeer(id)) out.push('지금은 다른 곳에서 지낸다.');
  const n = netPerson(id);
  // 2026년 기준 직업은 미래 정보다. 어른은 그대로, 동창은 2020년 뒤에만 쓴다.
  if (n?.직업) { const j = jobNow(s, n); if (j) out.push(`요즘 하는 일: ${j}.`); }
  if (s.promises?.some((p) => p.id === id)) out.push('다음 달에 만나기로 했다.');
  if (!out.length) out.push('요즘은 별다른 소식이 없다.');
  return out.join(' ');
}
function renderPerson(ctx, { id, here = false } = {}) {
  const s = ctx.s;
  const loved = (() => { try { return lovePeople(s).find((x) => x.person.id === id) ?? null; } catch { return null; } })();
  const known = knows(s, id);
  const v = bondView(s, id);
  const before = friendInfo(s, id);
  const beforeP = profileOf(s, id);
  // 결과 글은 알림으로 띄운다(사용자 지시 2026-11-12: 사진과 버튼 사이에 칸이 생겨 버튼이 밀리지 않게).
  const act = (r) => {
    if (!r.ok) { ctx.toast(r.why); return; }
    const opened = learnedNow(s, id, before) ?? profileLearned(s, id, beforeP);
    ctx.toast(opened ? `${r.text} ${opened}` : r.text);
    ctx.refresh();
  };
  const actions = [];
  const abroad = abroadOf(s, id), where = whereOf(s, id);
  // 사람들 탭은 기록만 본다. 말을 걸려면 동네에서 그 사람을 찾아가야 한다.
  if (!here) {
    actions.push(h('p', { className: 'sub person-away', text: abroad ? `지금은 ${abroad}에 있어 만날 수 없다.` : where ? `이번 달에는 ${PLACE_NAME[where]}에서 볼 수 있다. 동네에서 찾아가면 이야기할 수 있다.` : '이번 달에는 동네에서 보이지 않는다.' }));
    if (!abroad && where) actions.push(h('button', { className: 'btn leaf', on: { click: () => ctx.go('map') } }, '동네로 가기'));
  } else if (known) {
    const gap = s.bondSeen?.[id] == null ? 0 : ym(s) - s.bondSeen[id];
    for (const a of v.actions) {
      if (a.kind !== '대화' && !isPeer(id)) continue;
      const label = a.kind === '대화' && gap >= 24 ? '오랜만에 다시 만나기' : KIND_LABEL[a.kind];
      actions.push(h('button', { className: `btn ${a.ok && a.kind === '대화' ? 'leaf' : ''}`, disabled: !a.ok, on: { click: () => act(talk(s, id, a.kind, where)) } },
        label, h('span', { className: `chip ${a.ok ? '' : 'lock'}`, text: a.ok ? (isFirstTalk(s, id) ? '처음이라 칸을 쓰지 않음' : '칸 1') : a.why })));
    }
    if (!isKin(id)) {
      actions.push(v.promised
        ? h('button', { className: 'btn', on: { click: () => act(cancelPromise(s, id)) } }, '약속 미루기', h('span', { className: 'chip', text: '사이가 조금 멀어진다' }))
        : h('button', { className: 'btn sky', on: { click: () => act(promise(s, id)) } }, '다음 달 약속 잡기', h('span', { className: 'chip', text: '그달 칸을 하나 쓴다' })));
    }
  } else if (!loved) {
    actions.push(h('button', { className: 'btn leaf', on: { click: () => act(greet(s, id)) } }, '먼저 말 걸기', h('span', { className: 'chip', text: '칸을 쓰지 않음' })));
  }
  if (loved) actions.push(h('button', { className: 'btn rose', on: { click: () => ctx.go('love', { id }) } }, '만남 화면으로'));
  // 멀리 있거나 동네에 안 보여도 연락 창으로는 닿는다.
  if (known && mz.contactable(s, id)) actions.push(h('button', { className: 'btn sky', on: { click: () => ctx.go('messenger', { id }) } }, '연락하기', h('span', { className: 'chip', text: `이번 달 남은 연락 ${mz.left(s)}/${mz.LIMIT}` })));
  if (here) for (const f of friendHelps(s).filter((x) => x.id === id)) actions.push(helpBtn(ctx, f));
  const npc = netPerson(id);
  if (here && (known || loved)) {
    if (npc?.분류 === '사교모임' && s.company) actions.push(h('button', { className: 'btn', on: { click: () => { const r = askFunding(s, id); ctx.toast(r.text ?? r.why); if (r.ok) ctx.refresh(); } } }, '회사 자금을 부탁한다'));
  }
  const pic = photoOf(id, s);
  const named = known || !!loved;
  return h('div', { className: 'person' },
    h('button', { className: 'nav-back', on: { click: () => ctx.back() } }, '‹ 돌아가기'),
    h('div', { className: 'person-pic' }, pic ?? h('b', { text: named ? [...nameOf(id)][0] : '?' })),
    h('div', { className: 'panel person-card stack' },
      h('div', { className: 'stack person-head' },
        h('div', { className: 'person-title' }, h('div', { className: 'person-name' }, h('h1', { text: named ? nameOf(id) : '처음 보는 얼굴' }), named ? detailBtn(ctx, s, id) : null),
          named && fullOk(s, id) && fullPhoto(id, stageOf(s)) ? h('button', { className: 'person-fullbtn', on: { click: () => ctx.sheet((close) => h('div', { className: 'stack person-fullsheet' }, h('div', { className: 'person-full' }, fullPhoto(id, stageOf(s))), h('button', { className: 'btn', on: { click: close } }, '닫기'))) } }, '전신 보기') : null),
        named ? h('p', { className: 'sub', text: loved?.관계 ?? tagOf(s, id) }) : h('p', { className: 'sub', text: '같은 학교에서 자주 마주친다.' })),
      named && !loved?.person?.연애 ? h('div', { className: 'row wrap' }, heartsEl(v.hearts), h('span', { className: 'person-stage', text: v.label })) : null,
      named && isAdmin() ? h('p', { className: 'person-admin num', text: adminLine(s, id) }) : null,
      loved ? h('p', { text: likeText(s, id) }) : null,
      named ? h('p', { text: statusLine(s, id) }) : null,
    ),
    actions.length ? h('div', { className: 'stack person-actions' }, actions) : null);
}

// 관리자 모드 숫자. 사이(bonds)와, 연애 상대면 호감도 함께.
const fmt = (n) => (Math.round(n * 10) / 10).toString();
function adminLine(s, id) {
  const love = s.love?.people?.[id]?.호감;
  return `사이 ${fmt(bondOf(s, id))}${love != null ? ` · 호감 ${fmt(love)}` : ''}`;
}
// 친해지면 집안, 더 친해지면 형편과 사정을 알게 된다. 이름 옆 '상세'로 연다. 아직 모르면 버튼이 잠긴다.
function detailBtn(ctx, s, id) {
  const f = friendInfo(s, id), p = profileOf(s, id);
  if (!f && !p) return null;
  const open = (f && (f.family.length > 0 || f.situation.length > 0)) || (p && p.stage >= 1);
  const hint = p?.hint ?? f?.hint ?? '';
  const list = (title, rows) => (rows.length ? h('section', { className: 'stack friend-info' }, h('b', { text: title }), h('ul', {}, rows.map((t) => h('li', { text: t })))) : null);
  const show = () => ctx.sheet((close) => h('div', { className: 'stack' },
    h('h2', { text: `${nameOf(id)} · 상세` }),
    p ? h('div', { className: 'prof-steps', role: 'img', 'aria-label': `알게 된 정도 ${p.stage} / 4` }, [1, 2, 3, 4].map((n) => h('i', { className: n <= p.stage ? 'on' : '' }))) : null,
    p ? list('하는 일', [p.job, p.look].filter(Boolean)) : null,
    p ? list('사는 곳', [p.home, p.wed ? `결혼: ${p.wed}` : null].filter(Boolean)) : null,
    p ? list('지나온 길', p.history) : null,
    f ? list(p ? '어릴 때 집안' : '집안', f.family) : null,
    f ? list(p ? '어릴 때 사정' : '사정', f.situation) : null,
    p ? list('가족', [p.parents, p.siblings, ...p.family].filter(Boolean)) : null,
    p?.links.length ? h('section', { className: 'stack friend-info' }, h('b', { text: '인연' }), h('ul', {}, p.links.map((l) => h('li', {},
      h('button', { className: 'prof-link', disabled: !knows(s, l.id), title: knows(s, l.id) ? '이 사람 보기' : '아직 만난 적 없는 사람', on: { click: () => { close(); ctx.go('person', { id: l.id }); } } }, h('b', { text: l.name }), h('span', { className: 'sub', text: ` · ${l.rel}` })),
      l.text ? h('span', { className: 'prof-link-text', text: l.text }) : null)))) : null,
    p ? list('속 이야기', p.secrets) : null,
    hint ? h('p', { className: 'sub', text: hint }) : null,
    h('button', { className: 'btn', on: { click: close } }, '닫기')));
  return h('button', { className: 'person-fullbtn', disabled: !open, title: open ? '상세' : hint, 'aria-label': open ? '상세 보기' : `상세 잠김. ${hint}`, on: { click: show } }, open ? '상세' : '상세 🔒');
}

// 사용자 가이드: 고등학교부터 상반신과 전신. 초·중 시기에는 전신이 없다.
function fullOk(s, id) {
  if (isTeacher(id) || isKin(id)) return !isKin(id);
  const birth = netPerson(id)?.출생연도 ?? lovePerson(id)?.출생연도;
  return birth ? s.year - birth >= 16 : ['고등', '대학', '사회인'].includes(stageOf(s));
}

// 인맥으로 열리는 자리. 구간이 모자라면 무엇이 모자란지 칩으로 보인다.
function oppCard(ctx) {
  const s = ctx.s, o = opportunities(s);
  const row = (label, c, run) => h('button', { className: `btn ${c.ok ? 'sky' : ''}`, disabled: !c.ok, on: { click: () => { const r = run(s); ctx.toast(r.text ?? r.why); if (r.ok) ctx.refresh(); } } }, label, c.ok ? (c.cost ? h('span', { className: 'chip', text: won(c.cost) }) : null) : h('span', { className: 'chip lock', text: c.why }));
  return h('section', { className: 'stack card' }, h('h2', { text: '인맥으로 열리는 자리' }), row('투자 설명회 가기', o.투자설명회, attendBriefing), row('먼저 듣는 이야기', o.미리듣기, hearEarly));
}

// 첫 생에 무너진 동창을 돕는다. 말 한마디가 그 사람의 흐름을 바꾼다.
function helpBtn(ctx, f) {
  return h('button', { className: `btn ${f.ok ? 'sun' : ''}`, disabled: !f.ok, on: { click: () => { const r = helpFriend(ctx.s, f.id); ctx.toast(r.text ?? r.why); if (r.ok) ctx.refresh(); } } },
    f.label, f.cost && f.ok ? h('span', { className: 'chip', text: won(f.cost) }) : null, !f.ok ? h('span', { className: 'chip lock', text: f.why }) : null);
}

// ───────── 만난 사람 ─────────
const GROUP_ORDER = ['연인', '가족', '초등학교', '중학교', '고등학교', '대학', '선생님', '어른', '사회'];
function groupOf(s, id) {
  if (isKin(id)) return '가족';
  if (isTeacher(id)) return '선생님';
  // 가장 최근 시기의 학교에 묶는다.
  const LABEL = { 초등: '초등학교', 중학: '중학교', 고등: '고등학교', 대학: '대학' };
  // 미리 정해진 다음 학교는 건너뛴다. 초등학생 친구가 중학교로 묶이지 않게.
  const order = ['초등', '중학', '고등', '대학'];
  const now = order.indexOf(stageOf(s));
  const reached = now < 0 ? order : order.slice(0, now + 1);
  for (const st of reached.reverse()) if (ROSTER[s.school?.[st]]?.[id] !== undefined) return LABEL[st];
  if (s.crush?.history?.[id] && (now < 0 || now >= 2)) return '고등학교'; // 다른 학교에서 만난 아이
  const n = netPerson(id);
  if (n?.분류 === '동창') return '사회';
  if (n?.분류 === '동네' || /^n\d/.test(id)) return '어른';
  return '사회';
}
let peopleTab = '전체';
// 한 줄에 한 사람: 작은 사진 · 관계 · 이름 · 사이(사용자 지시 2026-11-10).
function peopleRow(ctx, s, p) {
  return h('button', { className: 'p-row', on: { click: () => ctx.go('person', { id: p.id }) } },
    face(p.id, s, 'lg', true),
    h('small', { className: 'p-tag', text: p.tag }),
    h('b', { className: 'p-name', text: nameOf(p.id) }),
    h('span', { className: 'p-bond' }, p.hearts != null ? heartsEl(p.hearts) : null, h('em', { text: p.note })));
}
// 연락 창 버튼. 버디버디·싸이월드 때는 컴퓨터, 문자·카톡이 열리면 휴대폰 아이콘.
const PHONE_APPS = ['sms', 'kakao', 'insta'];
function contactBtn(ctx, s) {
  const apps = mz.appsAt(s);
  const mobile = apps.some((a) => PHONE_APPS.includes(a));
  return h('button', { className: 'p-contact', on: { click: () => ctx.go('messenger') } },
    icon(mobile ? 'mobile' : 'pc'),
    h('span', {}, h('small', { text: apps.length ? apps.map((a) => mz.APPS[a].name).join(' · ') : '아직 쓸 수 있는 앱이 없다' }), h('b', { text: '연락 창' })),
    h('span', { className: 'chip', text: `이번 달 ${mz.left(s)}/${mz.LIMIT}` }),
    h('em', { 'aria-hidden': 'true', text: '›' }));
}
function allKnown(s) {
  const map = new Map();
  for (const b of bondPeople(s)) if (shown(s, b.id)) map.set(b.id, { id: b.id, hearts: b.hearts, note: b.promised ? '약속 있음' : b.label, tag: tagOf(s, b.id), group: groupOf(s, b.id), v: bondOf(s, b.id) });
  try {
    for (const l of lovePeople(s)) {
      const had = map.get(l.person.id);
      map.set(l.person.id, { id: l.person.id, hearts: had?.hearts ?? null, note: l.관계, tag: jobAt(l.person.직업_2026, s.year) || '만남으로 알게 된 사람', group: l.관계 === '아는 사이' ? '사회' : '연인', v: had?.v ?? 0 });
    }
  } catch (e) { console.warn(e); }
  return [...map.values()];
}
function renderPeople(ctx) {
  const s = ctx.s;
  const list = allKnown(s).sort((a, b) => b.v - a.v);
  const groups = GROUP_ORDER.filter((g) => list.some((p) => p.group === g));
  const tab = groups.includes(peopleTab) ? peopleTab : '전체';
  const shown = tab === '전체' ? groups : [tab];
  const pick = (t) => { peopleTab = t; ctx.go('people', {}, { replace: true }); };
  const meet = actionGroups(s).find((g) => g.name === '만남');
  const link = (ic, tag, title, go) => h('button', { className: 'p-link', on: { click: go } }, icon(ic), h('span', {}, h('small', { text: tag }), h('b', { text: title })), h('em', { 'aria-hidden': 'true', text: '›' }));
  return h('div', { className: 'people stack' },
    contactBtn(ctx, s),
    h('div', { className: 'section-heading' }, h('span', { className: 'eyebrow', text: 'THE PEOPLE BESIDE ME' }), h('h1', { text: '곁에 있는 사람들' }), h('p', { text: `이번에는, 당연했던 시간을 놓치지 않기로 했다. 만난 사람 ${list.length}명.` })),
    meet?.open ? h('div', { className: 'grid2' }, link('heart', '만남', '만남 화면', () => ctx.go('love')), link('home', '가족', '돌보기', () => ctx.go('family'))) : null,
    ['대학', '사회인'].includes(stageOf(s)) ? oppCard(ctx) : null,
    friendHelps(s).length ? h('section', { className: 'stack card' }, h('h2', { text: '내가 아는 앞날' }), h('p', { className: 'sub', text: '그때 무너진 사람들이다. 지금이라면 말할 수 있다.' }),
      friendHelps(s).map((f) => h('div', { className: 'stack' }, h('b', { text: f.이름 ?? nameOf(f.id) }), helpBtn(ctx, f)))) : null,
    groups.length > 1 ? h('div', { className: 'tabs' }, ['전체', ...groups].map((g) => h('button', { 'aria-pressed': String(g === tab), text: g, on: { click: () => pick(g) } }))) : null,
    list.length ? shown.map((g) => h('section', { className: 'stack p-group' },
      h('h2', { text: `${g} · ${list.filter((p) => p.group === g).length}` }),
      h('div', { className: 'p-list' }, list.filter((p) => p.group === g).map((p) => peopleRow(ctx, s, p)))))
      : h('p', { className: 'card', text: '아직 만난 사람이 없다. 학교에 가면 누군가 먼저 말을 걸어 올지도 모른다.' }));
}

// ───────── 수집 ─────────
let albumTab = '이야기';
let albumMore = 40;
let newsYear = null;
const yearOfGoal = (s) => { const left = homeBrief(s).monthsLeft; return left <= 0 ? '이번 달이 마지막 달이다.' : `2026년 12월까지 ${Math.floor(left / 12)}년 ${left % 12}개월 남았다.`; };
// 규칙 쪽에 목표 모듈이 없어 지금 상태에서 보이는 것만 모은다.
function goalsOf(s) {
  const out = [];
  const st = stageOf(s);
  if (enrolled(s)) {
    const r = reportCard(s);
    const exam = examOf(s);
    out.push({ title: `${r.current.term} 공부`, note: exam ? `이번 달 ${exam}이 있다.` : '시험 전까지 공부를 채운다.', n: r.current.percent, N: 100 });
  }
  const p = projectStatus(s);
  if (p.started) out.push({ title: '탐구 과제', note: p.done ? '기록장을 끝냈다.' : '방학 때 이어서 적는다.', n: p.done ? p.total : p.count, N: p.total });
  const c = contestState(s);
  if (c.season && c.entered) out.push({ title: c.title, note: c.result ? `${c.year}년 ${c.result.rankName}` : `지금 단계: ${c.phase}`, n: c.steps.filter((x) => x.done).length, N: c.steps.length });
  if (c.awards?.length) out.push({ title: '대회 수상', note: '지금까지 받은 상', n: c.awards.length, N: c.awards.length });
  const ms = milestonesOf(s);
  out.push({ title: '이정표', note: '지나온 큰 고비', n: ms.filter((m) => m.done).length, N: ms.length });
  if (s.promises?.length) out.push({ title: '잡아 둔 약속', note: s.promises.map((x) => nameOf(x.id)).join(', '), n: 0, N: s.promises.length });
  if (st === '사회인' || !out.length) out.push({ title: '오늘의 나', note: '칸을 어떻게 쓸지는 내 몫이다.', n: 0, N: 0 });
  return out;
}
function storySheet(ctx, s, a) {
  ctx.sheet((close) => h('div', { className: 'stack album-sheet' },
    h('div', { className: 'row' },
      a.who && schoolNameOf(a.who) ? face(a.who, s, 'lg', true) : null,
      h('div', {}, h('h2', { text: a.title || '이름 없는 이야기' }), a.who ? h('p', { className: 'sub', text: nameOf(a.who) }) : null)),
    h('p', { className: 'album-text', text: a.text }),
    h('button', { className: 'btn', on: { click: close } }, '닫기')));
}
function albumBody(ctx, s) {
  if (albumTab === '이야기') {
    const list = albumOf(s).reverse();
    if (!list.length) return h('p', { className: 'card', text: '아직 앨범이 비어 있다. 지나온 이야기가 여기에 쌓인다.' });
    return [
      h('div', { className: 'p-list' }, list.slice(0, albumMore).map((a) => h('button', { className: 'a-row', on: { click: () => storySheet(ctx, s, a) } },
        a.who && schoolNameOf(a.who) ? face(a.who, s, '', true) : h('span', { className: 'a-dot', 'aria-hidden': 'true' }),
        h('span', { className: 'p-main' }, h('b', { text: a.title || '이름 없는 이야기' }), h('span', { className: 'sub a-clip', text: a.text })) ))),
      list.length > albumMore ? h('button', { className: 'btn', on: { click: () => { albumMore += 40; ctx.go('album', {}, { replace: true }); } } }, '더 보기') : null,
    ];
  }
  if (albumTab === '기억') {
    const now = visibleHints(s), past = pastMemories(s).slice(-30).reverse();
    return [
      h('section', { className: 'stack card' }, h('h2', { text: '떠오르는 일' }), now.length ? h('ul', { className: 'p-mem' }, now.slice(0, 12).map((m) => h('li', { text: m.text }))) : h('p', { className: 'sub', text: '아직 또렷하게 떠오르는 일이 없다.' })),
      h('section', { className: 'stack card' }, h('h2', { text: '지나간 기억' }), past.length ? h('ul', { className: 'p-mem' }, past.map((m) => h('li', {}, m.text, h('span', { className: 'small sub', text: ` → ${m.result}` })))) : h('p', { className: 'sub', text: '아직 맞춰 볼 일이 없다.' })),
    ];
  }
  if (albumTab === '이정표') {
    const ms = milestonesOf(s);
    return [h('p', { className: 'sub', text: `${ms.filter((m) => m.done).length} / ${ms.length}` }),
      h('div', { className: 'grid2' }, ms.map((m) => h('div', { className: `ms ${m.done ? 'on' : ''}` }, m.done ? h('b', { text: '✓', 'aria-hidden': 'true' }) : h('b', { className: 'ico-lock', 'aria-hidden': 'true' }), h('span', { text: m.name }), h('span', { className: 'sr', text: m.done ? '이룸' : '아직' }))))];
  }
  if (albumTab === '목표') {
    return [h('p', { className: 'sub', text: yearOfGoal(s) }),
      h('div', { className: 'stack' }, goalsOf(s).map((g) => h('div', { className: 'card stack goal' },
        h('div', { className: 'row between' }, h('b', { text: g.title }), g.N ? h('span', { className: 'num sub', text: g.N === 100 ? `${g.n}%` : `${g.n}/${g.N}` }) : null),
        g.N ? h('div', { className: 'meter', role: 'img', 'aria-label': `${g.n} / ${g.N}` }, h('i', { style: `width:${Math.min(100, (g.n / g.N) * 100)}%` })) : null,
        h('p', { className: 'sub', text: g.note }))))];
  }
  // 뉴스 스크랩
  const year = newsYear && newsYear <= s.year ? newsYear : s.year;
  const scrap = newsScrap(s, year);
  const years = [];
  for (let y = s.year; y >= 2000; y -= 1) years.push(y);
  return [
    h('div', { className: 'tabs' }, years.map((y) => h('button', { 'aria-pressed': String(y === year), text: String(y), on: { click: () => { newsYear = y; ctx.go('album', {}, { replace: true }); } } }))),
    scrap.length ? h('div', { className: 'stack' }, [...scrap].reverse().map((m) => h('article', { className: 'panel scrap' },
      h('h3', { className: 'num', text: m.ym.replace('-', '년 ').replace(/$/, '월') }),
      h('ul', {}, [...m.headlines.map((x) => h('li', { text: x.text })), ...m.era.map((x) => h('li', { className: 'era', text: x.text }))]))))
      : h('p', { className: 'card', text: '이 해에는 오려 둔 기사가 없다.' }),
  ];
}
// 회귀노트: 회귀한 날 아침에 적어 둔 달마다 가장 많이 오른 주식(사용자 지시 2026-11-10).
let noteYear = null;
// 2004년부터: 반년마다 여섯 종목(많이 오른 셋, 큰 회사 가운데 셋).
function halfList(y) {
  const line = (x) => h('span', {}, h('small', { text: x.where }), h('em', { text: x.name }), h('i', { className: 'num', text: `+${x.pct}%` }));
  return h('ol', { className: 'rn-list rn-half' }, halfNote(y).map((r) => h('li', { className: r.empty ? 'empty' : '' },
    h('b', { className: 'num', text: r.half === 1 ? '1월 → 7월' : '7월 → 1월' }),
    r.empty ? h('span', { className: 'sub', text: '여기부터는 기억이 끊겼다.' }) : h('span', { className: 'rn-pair' },
      h('span', { className: 'rn-cap', text: '가장 많이 오른 셋' }), ...r.plain.map(line),
      r.big.length ? h('span', { className: 'rn-cap', text: '큰 회사 가운데 셋' }) : null, ...r.big.map(line)))));
}
function noteSheet(ctx, s) {
  const years = noteYears();
  ctx.sheet((close) => {
    const body = h('div', { className: 'stack' });
    const draw = () => {
      const y = years.includes(noteYear) ? noteYear : (years.includes(s.year) ? s.year : years[0]);
      const pct = (x) => (x ? `+${x.pct}%` : '');
      body.replaceChildren(
        h('div', { className: 'tabs' }, years.map((v) => h('button', { 'aria-pressed': String(v === y), text: String(v), on: { click: () => { noteYear = v; draw(); } } }))),
        y >= HALF_FROM ? halfList(y) : h('ol', { className: 'rn-list' }, regressionNote(y).map((r) => h('li', { className: r.국내 || r.해외 ? '' : 'empty' },
          h('b', { className: 'num', text: `${r.month}월` }),
          r.국내 || r.해외
            ? h('span', { className: 'rn-pair' },
              r.국내 ? h('span', {}, h('small', { text: '국내' }), h('em', { text: r.국내.name }), h('i', { className: 'num', text: pct(r.국내) })) : null,
              r.해외 ? h('span', {}, h('small', { text: '해외' }), h('em', { text: r.해외.name }), h('i', { className: 'num', text: pct(r.해외) })) : null)
            : h('span', { className: 'sub', text: '여기부터는 기억이 끊겼다.' })))));
    };
    draw();
    return h('div', { className: 'stack rn' },
      h('h2', { text: '회귀노트' }),
      h('p', { className: 'sub', text: '2000년 1월, 기억이 흐려지기 전에 적어 둔 노트. 2003년까지는 그 달에 사 두면 다음 달에 가장 많이 올라 있던 종목을, 2004년부터는 반년 뒤에 가장 많이 올라 있던 종목을 적었다. 큰 회사는 그때 시가총액이 백 번째 안에 들던 곳이다.' }),
      years.length ? body : h('p', { className: 'sub', text: '노트를 펼치는 중이다. 잠시 뒤에 다시 열어 보자.' }),
      h('p', { className: 'small sub', text: DISCLAIMER }),
      h('button', { className: 'btn', on: { click: close } }, '닫기'));
  });
}
function renderAlbum(ctx) {
  const s = ctx.s;
  const pick = (t) => { albumTab = t; albumMore = 40; ctx.go('album', {}, { replace: true }); };
  return h('div', { className: 'album stack' },
    h('div', { className: 'section-heading' }, h('span', { className: 'eyebrow', text: 'MEMORIES OF TOMORROW' }), h('h1', { text: '회귀자의 기억' }), h('p', { text: `지나온 이야기 ${s.seen.length}편 · ${calendar(s).label}` })),
    h('div', { className: 'row rn-row' },
      h('button', { className: 'p-link', on: { click: () => ctx.go('paper', { peek: true }) } }, icon('news'), h('span', {}, h('small', { text: `${s.year}년 ${s.month}월호` }), h('b', { text: '이달의 신문' })), h('em', { 'aria-hidden': 'true', text: '›' })),
      h('button', { className: 'rn-btn', on: { click: () => noteSheet(ctx, s) } }, icon('book'), h('span', { text: '회귀노트' }))),
    h('div', { className: 'tabs' }, ['이야기', '이정표', '목표', '기억', '뉴스'].map((t) => h('button', { 'aria-pressed': String(t === albumTab), text: t === '이야기' ? '이야기 앨범' : t === '뉴스' ? '뉴스 스크랩' : t, on: { click: () => pick(t) } }))),
    albumBody(ctx, s));
}

export const screens = { person: renderPerson, people: renderPeople, album: renderAlbum };
export { bondStage };
