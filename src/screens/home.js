import { isAdmin, setAdmin } from '../admin.js';
import { canChooseResidence, residenceOf, residenceOptions, moveResidence } from '../family.js';
import { canChoose, promiseNote } from '../parents.js';
import { islandNote } from '../../data/events_island.js';
import { billOf, forecast } from '../tax.js';
// 홈과 설정.
import { slotPanel } from './saves.js';
import { h, won } from '../ui.js';
import { stageOf, STATS, ageOf, STEP } from '../rules.js';
import { groups, doAction, homeBrief, canRefill, refill, previewAction, effectText, FLEX_BRANCH_ICON } from '../activities.js';
import { portfolio } from '../invest.js';
import { headlineCard } from '../paper.js';
import { contestState } from '../contest.js';
import { serialize, deserialize } from '../state.js';
import * as sound from '../sound.js';
import { backdrop, mePic, resumeFlow, goSafe, isDeferred, deferScenes, openCashier, openKaraoke, nextBar } from './common.js';
import { icon } from './icons.js';
import { coach as coachMarks } from './motion.js';
import { todoPanel, todoRows } from './map.js';
import { showMet } from './love.js';
import { friendHelps } from '../network.js';
import { DISCLAIMER } from '../invest.js';
import { openStat } from './stat.js';
import { timesBar, doMany } from './times.js';
import { abroadSheet } from './abroad.js';

const ICON = { 공부: 'book', 운동: 'run', '과외 알바': 'case', 학교: 'school', 꾸미기: 'spark', '인맥 관리': 'people', 만남: 'heart', 플렉스: 'shop', 휴식: 'moon', 놀기: 'spark', '다른 학교': 'school' };
const ROUTE = { 회사: 'company', 만남: 'love', 마음: 'crush' };
let flash = new Set(); // 방금 달라진 칸. 다음 그리기 한 번만 반짝인다.

function run(ctx, id, close, many = true) {
  const s = ctx.s, before = { ...s.stats }, cash = s.cash, tired = s.stress;
  if (id === 'ab_status') { close?.(); abroadSheet(ctx, s); return; }
  if (id === 'shop_help') { close?.(); openCashier(ctx, (r) => after(ctx, r, before, cash, tired)); return; }
  if (id === 'play_karaoke') { close?.(); openKaraoke(ctx, (r) => { if (!r.ok) { ctx.toast(r.why); return; } after(ctx, r, before, cash, tired); }); return; }
  const r = many ? doMany(s, id) : doAction(s, id);
  if (!r.ok) { ctx.toast(r.why); return; }
  close?.();
  after(ctx, r, before, cash, tired);
}
function after(ctx, r, before, cash, tired) {
  const s = ctx.s;
  if (!r.ok) { ctx.toast(r.why); return; }
  if (r.route) { goSafe(ctx, ROUTE[r.route.tab] ?? 'home', { way: r.route.way }); return; }
  flash = new Set(STATS.filter((k) => s.stats[k] !== before[k]));
  if (s.cash !== cash) flash.add('cash');
  if (s.stress !== tired) flash.add('tired');
  flash.add('slots');
  document.querySelectorAll('.toast').forEach((e) => e.remove()); // 빠르게 눌러도 한 줄만 보인다
  const fx = effectText(r.effects);
  { const said = fx ? `${r.text} (${fx})` : r.text; ctx.toast(r.icon ? `${r.icon} ${said}` : said); }
  ctx.refresh();
  if (r.met) showMet(ctx, r.met); // 인맥 관리로 만난 사람을 보여 준다
}
function actionBtn(ctx, a, close) {
  const note = [a.cost ? won(a.cost) : null, a.upkeep ? `매달 ${won(a.upkeep)}` : null].filter(Boolean).join(' · ');
  const fx = effectText(previewAction(ctx.s, a.id) ?? {});
  return h('button', { className: 'btn', disabled: !a.ok, on: { click: () => run(ctx, a.id, close) } }, a.icon ? `${a.icon} ${a.label}` : a.label, note && a.ok ? h('span', { className: 'chip', text: note }) : null, fx ? h('span', { className: 'chip num', text: fx }) : null, !a.ok ? h('span', { className: 'chip lock', text: a.why ?? '지금은 할 수 없습니다.' }) : null);
}
function openGroup(ctx, g) {
  if (!g.open) { ctx.toast(g.why ?? '아직 열리지 않았습니다.'); return; }
  if (g.name === '학교' && g.label !== '부대' && stageOf(ctx.s) !== '사회인') { goSafe(ctx, 'map', { view: 'school' }); return; } // 학교는 목록 대신 학교 지도로 간다
  const list = g.actions;
  if (list.length === 1 && !list[0].route) { run(ctx, list[0].id); return; } // 고를 것이 하나면 바로 한다
  const b = homeBrief(ctx.s);
  ctx.sheet((close) => {
    const branches = [...new Set(list.map((a) => a.branch))];
    return h('div', { className: 'stack' },
      h('div', { className: 'row between' }, h('h2', { text: g.label }), h('button', { className: 'sheet-x', 'aria-label': '닫기', text: '✕', on: { click: close } })),
      h('p', { className: 'sub', text: b.slotsLeft > 0 ? `남은 활동 칸 ${b.slotsLeft}개` : '이번 달 칸을 다 썼습니다.' }),
      timesBar(),
      list.length ? branches.map((br) => h('div', { className: 'stack' }, br ? h('h3', { text: FLEX_BRANCH_ICON[br] ? `${FLEX_BRANCH_ICON[br]} ${br}` : br }) : null, list.filter((a) => a.branch === br).map((a) => actionBtn(ctx, a, close)))) : h('p', { className: 'sub', text: '지금 할 수 있는 일이 없습니다.' }));
  });
}
// 작은 단계(10) 안에서 얼마나 찼는지. 한 번만 움직여도 막대가 늘어난다.
function stepBar(v) { const bar = h('i'); bar.style.width = `${v >= 300 ? 100 : ((v % STEP) / STEP) * 100}%`; return h('span', { className: 'h-tiredbar h-stepbar', 'aria-hidden': 'true' }, bar); }
function statChip(ctx, k) {
  const s = ctx.s;
  return h('button', { className: `h-stat${flash.has(k) ? ' flash' : ''}`, 'aria-label': `${k} 자세히`, on: { click: () => openStat(ctx, k) } }, h('span', { text: k }), h('b', { className: 'num', text: Math.floor(s.stats[k]) }), stepBar(s.stats[k]));
}
// 피곤함 0~100. 100이면 다음 달 칸이 절반이다.
function tiredChip(ctx, b) {
  const bar = h('i'); bar.style.width = `${b.tired}%`;
  return h('button', { className: `h-stat h-tired${b.tired >= 85 ? ' danger' : ''}${flash.has('tired') ? ' flash' : ''}`, 'aria-label': `피곤함 ${b.tired}, 100 중, 능력 자세히`, on: { click: () => openStat(ctx) } }, h('span', { text: '피곤함' }), h('b', { className: 'num', text: b.tired }), h('span', { className: 'h-tiredbar', 'aria-hidden': 'true' }, bar));
}
// 활동 칸: 적으면 칸마다 그리고, 많으면 막대로 그린다.
function slotsEl(s, b) {
  const label = { role: 'img', 'aria-label': `활동 칸 ${s.capacity}개 중 ${s.used}개 사용` };
  if (s.capacity > 12) { const bar = h('i'); bar.style.width = `${Math.min(100, (b.slotsLeft / s.capacity) * 100)}%`; return h('div', { className: `h-slotbar${flash.has('slots') ? ' just' : ''}`, ...label }, bar); }
  return h('div', { className: 'h-slots', ...label }, Array.from({ length: s.capacity }, (_, i) => h('i', { className: i >= s.capacity - b.slotsLeft ? 'on' : flash.has('slots') && i === s.used - 1 ? 'just' : '' })));
}
// 이달의 할 일 묶음: 한 줄로 접어 두고 누르면 시트로 연다.
function bundleSheet(ctx, helps) {
  ctx.sheet((close) => h('div', { className: 'stack' },
    h('div', { className: 'row between' }, h('div', {}, h('span', { className: 'eyebrow', text: 'THIS MONTH' }), h('h2', { text: `${ctx.s.year}년 ${ctx.s.month}월` })), h('button', { className: 'sheet-x', 'aria-label': '닫기', text: '✕', on: { click: close } })),
    todoPanel(ctx, ctx.s, close),
    helps.length ? h('button', { className: 'btn sun', text: `도울 수 있는 동창 ${helps.length}명`, on: { click: () => { close(); ctx.go('people'); } } }) : null));
}
// 내 사진을 화면 가득 본다. 아무 데나 누르면 닫힌다.
function zoomMe(s) {
  const el = h('button', { className: 'me-zoom', 'aria-label': '사진 닫기', on: { click: () => el.remove() } }, mePic(s));
  document.body.append(el);
}
function home(ctx) {
  const s = ctx.s;
  if (s.ended) { setTimeout(() => ctx.go('ending', {}, { replace: true })); return h('div'); }
  if (s.queue.length && !isDeferred()) { setTimeout(() => resumeFlow(ctx)); return h('div'); }
  const helps = friendHelps(s).filter((x) => x.ok);
  const stage = stageOf(s), p = portfolio(s), b = homeBrief(s), news = headlineCard(s), c = contestState(s), full = b.slotsLeft <= 0;
  const all = groups(s).filter((g) => g.open || !['놀기', '다른 학교'].includes(g.name)), meet = all.find((g) => g.name === '만남');
  const teen = stage === '고등';
  const rows = todoRows(ctx, s), open = rows.filter((r) => !r.done).length;
  const left = `${Math.floor(b.monthsLeft / 12) ? `${Math.floor(b.monthsLeft / 12)}년 ` : ''}${b.monthsLeft % 12 ? `${b.monthsLeft % 12}개월` : ''}` || '이번 달까지';
  const el = h('div', { className: 'home' },
    h('section', { className: 'h-hero' },
      backdrop(s, 'home'), h('span', { className: 'h-shade', 'aria-hidden': 'true' }),
      h('div', { className: 'h-who' }, h('button', { className: 'h-face', 'aria-label': '내 사진 크게 보기', on: { click: () => zoomMe(s) } }, mePic(s)),
        h('div', { className: 'h-id' }, h('b', { text: s.name }), h('small', { className: 'num', text: `${b.age}살 · ${stage} · ${s.year}. ${String(s.month).padStart(2, '0')}` }))),
      h('button', { className: `h-money${flash.has('cash') ? ' flash' : ''}${Math.max(Math.abs(s.cash), p.assets, Math.abs(p.netWorth)) >= 1e12 ? ' long' : ''}`, 'aria-label': '자산 보기', on: { click: () => { ctx.stack.length = 0; goSafe(ctx, 'invest'); } } },
        [['현금', s.cash], ['자산', p.assets], p.debt > 0 ? ['부채', -p.debt] : null, ['순자산', p.netWorth]].filter(Boolean).map(([t, v]) => h('span', { className: t === '순자산' ? 'h-net' : '' }, h('i', { text: t }), h('b', { className: 'num', text: won(v) })))),
      h('div', { className: 'h-count' }, h('small', { text: '2026년 12월까지' }), h('b', { className: 'num', text: left }))),
    h('button', { className: 'h-news', 'aria-label': '이달의 신문 보기', on: { click: () => ctx.go('paper', { peek: true }) } },
      h('small', { className: 'num', text: `${s.month}월` }), h('span', { text: news.text })),
    taxBanner(ctx),
    h('div', { className: 'h-hud' }, STATS.map((k) => statChip(ctx, k)),
      tiredChip(ctx, b)),
    h('div', { className: 'h-head' }, h('h2', { text: '오늘은 무엇을 할까?' }), slotsEl(s, b)),
    b.tiredFull ? h('p', { className: 'small h-warnline', text: '피곤함이 100입니다. 다음 달 활동 칸이 절반으로 줄어듭니다.' }) : null,
    full && canRefill(s) ? h('button', { className: 'btn main h-refill', text: '활동 칸 1개 무료 충전 (한 달에 한 번)', on: { click: () => { const r = refill(s); ctx.save(); ctx.toast(r.ok ? r.text : r.why); ctx.draw(); } } }) : null,
    full && !canRefill(s) ? h('p', { className: 'small h-full', text: '칸을 다 썼습니다. 이번 달 무료 충전도 썼습니다. 다음 달로 넘어가세요.' }) : null,
    timesBar(),
    h('div', { className: 'h-acts' }, all.map((g) => h('button', { className: `h-act${!g.open ? ' locked' : ''}`, on: { click: () => openGroup(ctx, g) } },
      icon(g.open ? ICON[g.name] ?? 'spark' : 'lock', 'h-ico'), h('b', { className: 'h-lbl', text: g.label })))),
    s.queue.length ? h('button', { className: 'h-story', on: { click: () => { deferScenes(false); resumeFlow(ctx); } } }, h('span', { className: 'qdot', 'aria-hidden': 'true' }), h('b', { text: `미룬 이야기 ${s.queue.length}개 보기` }), h('em', { 'aria-hidden': 'true', text: '›' })) : null,
    stage === '사회인' || s.company ? h('button', { className: 'h-link', on: { click: () => goSafe(ctx, 'company') } }, icon('building'), h('span', {}, h('small', { text: '회사' }), h('b', { text: s.company?.name ?? '내 회사와 일' })), h('em', { 'aria-hidden': 'true', text: '›' })) : null,
    canChooseResidence(s) ? h('button', { className: 'h-link', on: { click: () => residenceSheet(ctx) } }, icon('home'), h('span', {}, h('small', { text: '사는 곳' }), h('b', { text: residenceOf(s).name }))) : null,
    canChoose(s) ? h('button', { className: 'h-link', on: { click: () => ctx.go('movehome') } }, icon('building'), h('span', {}, h('small', { text: s.parentsHome ? `가족 집 · ${s.parentsHome.name}` : '아버지와 상의' }), h('b', { text: s.parentsHome ? '더 좋은 집으로 이사' : '이사 갈 집 고르기' }))) : null,
    teen ? h('button', { className: 'h-link', on: { click: () => goSafe(ctx, 'crush') } }, icon('heart'), h('span', {}, h('small', { text: '풋풋한 마음' }), h('b', { text: s.crush?.partner ? '사귀는 사이' : '아직 사귀는 사람이 없다' })), h('em', { 'aria-hidden': 'true', text: '›' })) : null,
    meet?.open && !teen ? h('button', { className: 'h-link', on: { click: () => goSafe(ctx, 'love') } }, icon('heart'), h('span', {}, h('small', { text: '만남' }), h('b', { text: s.partner ? '곁에 있는 사람' : '새로운 사람을 만나러' })), h('em', { 'aria-hidden': 'true', text: '›' })) : null,
    h('button', { className: 'h-bundle', on: { click: () => bundleSheet(ctx, helps) } }, h('span', {}, '이번 달 할 일 ', h('b', { className: 'num', text: open })), helps.length ? h('span', { className: 'small sub', text: ` · 도울 동창 ${helps.length}` }) : null, h('em', { 'aria-hidden': 'true', text: '›' })),
    promiseNote(s) ? h('p', { className: 'small h-warnline', text: promiseNote(s) }) : null,
    islandNote(s) ? h('p', { className: 'small h-warnline', text: islandNote(s) }) : null,
    c.warnings?.length ? h('p', { className: 'small h-warnline', text: c.warnings[0] }) : null,
    nextBar(ctx));
  flash = new Set();
  if (!s.flags.coachDone) setTimeout(() => coach(ctx));
  return el;
}
// 어디서 살지 고른다. 살지 않는 집은 월세를 받는다.
function residenceSheet(ctx) {
  const s = ctx.s;
  ctx.sheet((close) => h('div', { className: 'stack' },
    h('h2', { text: '어디서 살까' }),
    h('p', { className: 'sub small', text: '내가 산 집이 여러 채면 한 곳에 살고, 나머지는 월세를 받습니다.' }),
    residenceOptions(s).map((o) => h('button', { className: `h-home${o.current ? ' on' : ''}`, disabled: !o.ok, on: { click: () => { const r = moveResidence(s, o.key); close(); if (!r.ok) return ctx.toast(r.why); ctx.save(); ctx.toast(r.text); ctx.refresh(); } } }, h('b', { text: o.current ? `${o.label} · 지금 사는 곳` : o.label }), h('small', { text: o.note }))),
    h('button', { className: 'btn', text: '집 사러 가기', on: { click: () => { close(); goSafe(ctx, 'invest', { tab: '부동산' }); } } }),
    h('button', { className: 'btn', text: '닫기', on: { click: close } })));
}
// 고지서가 나왔거나 다음 달에 나올 세금이 있으면 알린다.
function taxBanner(ctx) {
  const s = ctx.s, bill = billOf(s), next = bill ? null : forecast(s);
  if (bill) return h('button', { className: 'h-tax due', on: { click: () => ctx.go('tax') } }, h('small', { text: '세금 고지서' }), h('b', { className: 'num', text: `${bill.title} ${won(bill.total)}` }));
  if (!next) return null;
  return h('button', { className: `h-tax${next.short ? ' due' : ''}`, on: { click: () => ctx.sheet((close) => h('div', { className: 'stack' },
    h('h2', { text: `다음 달 ${next.title}` }),
    h('div', { className: 'stack' }, next.items.map((x) => h('div', { className: 'row between' }, h('span', { text: x.label }), h('b', { className: 'num', text: won(x.amount) })))),
    h('div', { className: 'row between' }, h('span', { text: '현금과 예금' }), h('b', { className: 'num', text: won(next.cash) })),
    h('p', { className: 'sub small', text: next.short ? `${won(next.short)} 모자랍니다. 이번 달 안에 마련하지 못하면 체납되어 매달 가산세가 붙습니다.` : '지금 가진 돈으로 낼 수 있습니다. 다음 달에 직접 낼지 세무사에게 맡길지 고릅니다.' }),
    h('button', { className: 'btn', text: '닫기', on: { click: close } }))) } },
    h('small', { text: `다음 달 세금 예상${next.short ? ' · 돈이 모자랍니다' : ''}` }), h('b', { className: 'num', text: `${next.title} ${won(next.total)}` }));
}
// 처음 일상에 왔을 때 네 군데만 짚어 준다. 한 번 보면 다시 나오지 않는다.
const COACH = [
  { target: '.h-head', title: '활동 칸', text: '달마다 쓸 수 있는 칸이 정해져 있다. 공부, 운동, 학교, 가게 돕기 중에서 골라 칸을 쓴다.' },
  { target: '.h-hud', title: '능력치', text: '네 칸을 누르면 지금 값과 다음에 열리는 것이 보인다. 피곤함이 100이 되면 다음 달 칸이 절반으로 줄어든다.' },
  { target: '#nav [data-tab=map]', title: '지도와 사람', text: '동네 지도에서 장소마다 누가 있는지 본다. 사람을 눌러 말을 걸면 사이가 가까워진다.' },
  { target: '.next-btn', title: '다음 달로', text: '칸을 다 쓰면 다음 달로 넘어간다. 신문이 오고 이야기가 이어진다. 여름에는 모의투자 대회가 있다.' },
];
function coach(ctx) {
  if (ctx.s.flags.coachDone || document.querySelector('.sheet-wrap') || ctx.cur?.name !== 'home') return;
  ctx.s.flags.coachDone = true; ctx.save();
  coachMarks(COACH);
}

// ---------- 설정 ----------
const toCode = (t) => { let b = ''; for (const c of new TextEncoder().encode(t)) b += String.fromCharCode(c); return btoa(b); };
const fromCode = (c) => { const t = c.trim(); if (t.startsWith('{')) return t; return new TextDecoder().decode(Uint8Array.from(atob(t), (x) => x.charCodeAt(0))); };
// 소리 칸: 배경음악과 효과음을 따로 켜고 끄고, 음량을 맞춘다. 값은 기기에 남는다.
function soundCard() {
  const p = sound.prefs();
  const status = h('p', { className: 'small sub', 'aria-live': 'polite' }); soundStatus(status);
  const row = (label, onKey, volKey, test) => {
    const box = h('input', { type: 'checkbox', checked: p[onKey], 'aria-label': `${label} 켜기` });
    const vol = h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(p[volKey] * 100), 'aria-label': `${label} 음량`, disabled: !p[onKey] });
    box.addEventListener('change', () => { vol.disabled = !box.checked; sound.setPrefs({ [onKey]: box.checked }); });
    vol.addEventListener('input', () => sound.setPrefs({ [volKey]: Number(vol.value) / 100 }));
    vol.addEventListener('change', test);
    return h('div', { className: 'sound-row' }, h('label', { className: 'row' }, box, h('span', { text: label })), vol);
  };
  return h('div', { className: 'card stack' }, h('h3', { text: '소리' }),
    row('배경음악', 'music', 'musicVol', () => {}),
    row('효과음', 'sfx', 'sfxVol', () => sound.sfx('good')),
    h('p', { className: 'small sub', text: '음악은 화면과 인생 시기에 따라 바뀝니다. 소리가 멈추면 화면을 한 번 눌러 주세요.' }),
    status);
}
// 소리가 안 날 때 알려 줄 수 있게 지금 상태를 보여 준다.
const MOOD_KO = { child: '어린 시절', youth: '청춘', adult: '어른', love: '설렘', tense: '긴장', story: '이야기', ending: '엔딩', title: '시작' };
function soundStatus(el) {
  const c = sound.current();
  const st = !c.state ? '아직 안 켜짐(화면을 한 번 누르세요)' : c.state === 'running' ? (c.playing ? `재생 중 · ${MOOD_KO[c.playing] ?? c.playing}` : '켜짐 · 음악 꺼둠') : `멈춤(${c.state}) · 화면을 누르면 다시 켜집니다`;
  el.textContent = `소리 상태: ${st}${c.error ? ` · 오류 ${c.error}` : ''}`;
  if (el.isConnected || !el.dataset.once) { el.dataset.once = '1'; setTimeout(() => soundStatus(el), 1000); }
}
// 관리자 모드: 인물 시트에 사이 수치를 숫자로 보여 준다.
function adminCard() {
  const box = h('input', { type: 'checkbox', checked: isAdmin(), 'aria-label': '관리자 모드 켜기' });
  box.addEventListener('change', () => setAdmin(box.checked));
  return h('div', { className: 'card stack' }, h('h3', { text: '관리자 모드' }),
    h('label', { className: 'row' }, box, h('span', { text: '켜기' })),
    h('p', { className: 'small sub', text: '켜면 사람 카드의 하트 아래에 지금 사이(호감도)가 숫자로 보입니다. 이 기기에만 저장됩니다.' }));
}
function settings(ctx) {
  const out = h('textarea', { rows: 4, readOnly: true, 'aria-label': '저장 코드', hidden: true });
  const inp = h('textarea', { rows: 4, placeholder: '저장 코드를 붙여 넣으세요', 'aria-label': '불러올 저장 코드' });
  return h('div', { className: 'stack set' },
    h('div', { className: 'row between' }, h('h1', { text: '설정' }), h('button', { className: 'sheet-x', 'aria-label': '돌아가기', text: '✕', on: { click: () => ctx.back() } })),
    soundCard(),
    adminCard(),
    h('div', { className: 'card stack' }, h('h3', { text: '저장·불러오기' }), slotPanel(ctx)),
    h('div', { className: 'card stack' }, h('h3', { text: '저장 코드 꺼내기' }), h('p', { className: 'sub', text: '다른 기기로 옮기거나 따로 보관할 때 씁니다.' }), out,
      h('button', { className: 'btn', text: '코드 만들고 복사', on: { click: async () => { ctx.save(); out.value = toCode(serialize(ctx.s)); out.hidden = false; out.select(); try { await navigator.clipboard.writeText(out.value); ctx.toast('복사했습니다.'); } catch { ctx.toast('직접 선택해서 복사해 주세요.'); } } } })),
    h('div', { className: 'card stack' }, h('h3', { text: '불러오기' }), inp,
      h('button', { className: 'btn', text: '이 코드로 불러오기', on: { click: () => {
        try { ctx.s = deserialize(fromCode(inp.value)); } catch { ctx.toast('저장 코드를 읽을 수 없습니다.'); return; }
        ctx.save(); ctx.stack.length = 0; ctx.toast('불러왔습니다.'); ctx.go('home', {}, { replace: true });
      } } })),
    h('p', { className: 'small sub', text: DISCLAIMER }),
    h('div', { className: 'card stack' }, h('h3', { text: '처음부터' }), h('p', { className: 'sub', text: '지금 게임과 자동 저장이 지워집니다. 저장 1~3은 남습니다.' }),
      h('button', { className: 'btn', text: '이름 입력부터 다시', on: { click: () => ctx.sheet((close) => h('div', { className: 'stack' },
        h('h2', { text: '정말 지울까요?' }), h('p', { className: 'sub', text: '되돌릴 수 없습니다.' }),
        h('button', { className: 'btn', text: '그만두기', on: { click: close } }),
        h('button', { className: 'btn main', text: '지우고 처음부터', on: { click: () => { close(); ctx.wipe(); ctx.stack.length = 0; ctx.go('start', { form: true }, { replace: true }); } } }))) } })));
}
export const screens = { home, settings };
