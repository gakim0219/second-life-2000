// 만남과 가족 화면. showMet은 인맥 관리 결과에서도 부를 수 있다.
import { h, won, photo } from '../ui.js';
import { stageOf } from '../rules.js';
import * as love from '../love.js';
import * as network from '../network.js';
import * as invest from '../invest.js';
import * as crush from '../crush.js';

const SLOT = '이번 달 활동 칸을 다 썼습니다.';
const CSS = 'src/screens/love.css';
const dry = (s, fn) => { try { return fn(structuredClone(s)); } catch { return { ok: false, why: '지금은 할 수 없습니다.' }; } };
const netWorth = (s) => { try { return invest.isLoaded() ? invest.netWorth(s) : s.cash; } catch { return s.cash; } };
const first = (t) => (String(t ?? '').match(/^.*?[.!?](?=\s|$)/)?.[0] ?? String(t ?? ''));

const ROUTES = [
  ['소개팅', '🤝', '아는 사람이 자리를 만들어 줍니다.'],
  ['동창', '🏫', '옛 친구에게 다시 연락합니다.'],
  ['미팅', '🍻', '여럿이 어울립니다. 연락처까지는 안 갑니다.'],
  ['헌팅', '💬', '직접 말을 겁니다. 거절이면 그걸로 끝입니다.'],
  ['클럽', '🌃', '시끄러운 밤을 보냅니다.'],
  ['사교모임', '🥂', '회비를 내고 모임에 들어갑니다.'],
  ['유명인', '🎬', '자리를 얻어 얼굴을 봅니다.'],
  ['선보기', '🍵', '양가 어른이 자리를 잡습니다.'],
  ['결혼정보회사', '📇', '가입하면 석 달마다 소개가 옵니다.'],
];

// ---------- 작은 조각 ----------
const lock = (why) => h('span', { className: 'chip lock', text: why === SLOT ? '칸 없음' : why });
function avatar(who, name, s, cls = '') {
  return h('span', { className: `lv-av ${cls}`, 'aria-hidden': 'true' }, h('span', { text: (name ?? '?').slice(0, 1) }), who ? photo(who, stageOf(s)) : null);
}
function slots(s) {
  const left = Math.max(0, s.capacity - s.used);
  return h('div', { className: 'lv-slots', 'aria-label': `이번 달 칸 ${left}칸 남음` },
    h('span', { className: 'lv-dots' }, Array.from({ length: s.capacity }, (_, i) => h('i', { className: i < left ? 'on' : '' }))),
    h('span', { className: 'small', text: left ? `${left}칸 남음` : '칸 없음' }));
}
function head(ctx, title, extra) {
  return h('header', { className: 'lv-head' },
    h('button', { type: 'button', className: 'lv-back', 'aria-label': '뒤로', text: '‹', on: { click: () => ctx.back() } }), h('h1', { text: title }), extra ?? null);
}
const sheetHead = (title, close) => h('div', { className: 'row between lv-sheet-head' }, h('h2', { text: title }), h('button', { type: 'button', className: 'lv-x', text: '닫기', on: { click: close } }));
function liveSheet(ctx, paint) {
  const body = h('div', { className: 'stack lv-sheet' });
  const close = ctx.sheet(body);
  const redraw = () => { body.replaceChildren(...[paint(redraw, close)].flat(Infinity).filter(Boolean)); };
  redraw();
  return close;
}
function confirmSheet(ctx, title, text, label, fn, cls = 'main') {
  ctx.sheet((close) => h('div', { className: 'stack lv-sheet' }, h('h2', { text: title }), h('p', { text }),
    h('button', { type: 'button', className: `btn ${cls}`, text: label, on: { click: () => { close(); fn(); } } }),
    h('button', { type: 'button', className: 'btn', text: '그만둔다', on: { click: close } })));
}
function moment(ctx, who, name, title, text) {
  ctx.sheet((close) => h('div', { className: 'stack lv-sheet lv-moment' }, who ? avatar(who, name, ctx.s, 'hero') : null, h('h2', { text: title }), h('p', { text }),
    h('button', { type: 'button', className: 'btn main', text: '확인', on: { click: close } })));
}

// ---------- 만남 장면 ----------
function ensureCss() {
  if (!document.querySelector(`link[href="${CSS}"]`)) document.head.append(h('link', { rel: 'stylesheet', href: CSS }));
}
// love.meet, network.enterGathering, network.meetCeleb, 인맥 관리의 met 결과를 모두 받는다.
export function showMet(ctx, met) {
  ensureCss();
  if (!met) return null;
  if (!met.ok) { ctx.toast(met.why ?? '만나지 못했습니다.'); return null; }
  ctx.save();
  const s = ctx.s; const p = met.person ?? null; const sc = met.scene ?? {};
  const place = [sc.시간대, sc.장소 ?? sc.모임 ?? p?.모임].filter(Boolean).join(' · ');
  const said = new Set(); const story = [];
  for (const t of [sc.왜_거기_있나, met.text, sc.첫_만남, p?.역할]) {
    if (!t || said.has(t) || (story.length && story.join(' ').includes(t))) continue;
    said.add(t); story.push(t);
  }
  const line = met.refused ? null : (met.line ?? sc.백제대사 ?? p?.백제대사);
  const nature = met.refused ? null : first(sc.성격 ?? p?.성격);
  const known = p && !met.refused && love.knownPeople(s).some((x) => x.person.id === p.id);
  return ctx.sheet((close) => h('div', { className: 'stack lv-sheet lv-met' },
    p ? avatar(p.id, p.이름, s, 'hero') : h('div', { className: 'lv-met-empty', 'aria-hidden': 'true', text: '🌙' }),
    place ? h('p', { className: 'lv-place', text: place }) : null,
    p ? h('h2', { text: p.이름 }) : null,
    story.map((t) => h('p', { text: t })),
    line ? h('blockquote', { className: 'lv-quote', text: line }) : null,
    nature ? h('p', { className: 'lv-hint' }, h('b', { text: '받은 느낌 ' }), nature) : null,
    !met.refused && sc.힌트 ? h('p', { className: 'lv-hint' }, h('b', { text: '눈에 띈 것 ' }), sc.힌트) : null,
    met.early ? h('p', { className: 'lv-remember', text: '이 사람 기억난다. 곧 이름이 알려질 사람이다.' }) : null,
    met.news ? h('p', { className: 'lv-news', text: met.news }) : null,
    known ? h('button', { type: 'button', className: 'btn rose', text: '이 사람을 더 알아 간다', on: { click: () => { close(); personSheet(ctx, p.id); } } }) : null,
    h('button', { type: 'button', className: 'btn', text: '닫기', on: { click: close } })), { onClose: () => ctx.refresh() });
}

// ---------- 길 ----------
function routeCard(ctx, [route, icon, text]) {
  const s = ctx.s; const R = love.ROUTES[route];
  let check; let price; let tap;
  const meet = (o = {}) => { const r = love.meet(s, route, o); ctx.save(); showMet(ctx, r); };
  if (route === '사교모임') { check = { ok: true }; price = '모임마다 다름'; tap = () => gatherSheet(ctx); }
  else if (route === '유명인') { check = love.canMeet(s, route); price = '사람마다 다름'; tap = () => celebSheet(ctx); }
  else if (route === '결혼정보회사' && !s.love.matchmaker) {
    check = dry(s, (x) => love.joinMatchmaker(x)); price = `가입비 ${won(R.joinCost)}`;
    tap = () => confirmSheet(ctx, '결혼정보회사', `가입비는 ${won(R.joinCost)}입니다. 석 달마다 소개가 옵니다.`, '가입한다', () => { const r = love.joinMatchmaker(s); ctx.result(r); if (r.ok) ctx.refresh(); }, 'rose');
  } else {
    check = love.canMeet(s, route); price = check.cost ?? R.cost; price = price ? won(price) : '돈 안 듦';
    tap = route === '동창' ? () => classmateSheet(ctx) : () => meet();
  }
  const cost = !!(route !== '결혼정보회사' || s.love.matchmaker);
  return h('button', { type: 'button', className: `lv-route ${check.ok ? '' : 'off'}`, disabled: !check.ok, on: { click: tap } },
    h('b', { className: 'lv-route-name', text: `${icon} ${route}` }), h('span', { className: 'lv-route-text', text }),
    h('span', { className: 'lv-route-cost num', text: `${price}${cost && route !== '사교모임' && route !== '유명인' ? ' · 1칸' : ''}` }), check.ok ? null : lock(check.why));
}
function classmateSheet(ctx) {
  const s = ctx.s; const list = love.candidates(s, '동창');
  ctx.sheet((close) => h('div', { className: 'stack lv-sheet' }, sheetHead('누구에게 연락할까', close),
    list.length ? null : h('p', { text: '지금 다시 닿을 동창이 없습니다.' }),
    list.map((p) => h('button', { type: 'button', className: 'lv-pick', on: { click: () => { close(); showMet(ctx, love.meet(s, '동창', { id: p.id })); } } },
      avatar(p.id, p.이름, s), h('span', {}, h('b', { text: p.이름 }), s.love.people[p.id] ? h('span', { className: 'small lv-dim', text: ' 아는 사이' }) : null), h('span', { className: 'small lv-dim', text: '1칸' })))));
}
function gatherSheet(ctx) {
  const s = ctx.s;
  ctx.sheet((close) => h('div', { className: 'stack lv-sheet' }, sheetHead('사교모임', close),
    h('p', { className: 'sub', text: '첫 입장에는 회비를 다 내고, 그 뒤로는 일부만 냅니다.' }),
    network.gatherings(s).map((g) => { const c = network.canEnter(s, g.모임);
      return h('article', { className: 'panel stack lv-gather' },
        h('div', { className: 'row between' }, h('b', { text: g.모임 }), g.입장함 ? h('span', { className: 'chip', text: '회원' }) : null),
        h('p', { className: 'small', text: `${g.성격 ?? ''}${g.인원 ? ` · ${g.인원}명 안팎` : ''}` }), g.입장조건 ? h('p', { className: 'small sub', text: g.입장조건 }) : null,
        h('button', { type: 'button', className: 'btn rose', disabled: !c.ok, on: { click: () => { close(); showMet(ctx, network.enterGathering(s, g.모임)); } } }, h('b', { text: g.입장함 ? '다시 간다' : '입장한다' }), h('span', { className: 'chip num', text: `${g.cost ? won(g.cost) : '돈 안 듦'} · 1칸` }), c.ok ? null : lock(c.why))); })));
}
function celebSheet(ctx) {
  const s = ctx.s; const all = network.celebrities(s);
  const open = all.filter((x) => x.ok).sort((a, b) => a.cost - b.cost); const shut = all.filter((x) => !x.ok).slice(0, 12);
  ctx.sheet((close) => h('div', { className: 'stack lv-sheet' }, sheetHead('유명인', close),
    all.length ? null : h('p', { text: '지금 소식이 들리는 사람이 없습니다.' }),
    [...open, ...shut].map((x) => { const p = x.person;
      return h('button', { type: 'button', className: 'lv-pick', disabled: !x.ok, on: { click: () => { close(); showMet(ctx, network.meetCeleb(s, p.id)); } } },
        avatar(p.id, p.이름, s), h('span', { className: 'lv-grow' }, h('b', { text: p.이름 }), h('span', { className: 'small lv-dim lv-block', text: [p.세부, p.직업].filter(Boolean).join(' · ') }), x.ok ? null : lock(x.why)), h('span', { className: 'small num lv-none', text: won(x.cost) })); }),
    all.length > open.length + shut.length ? h('p', { className: 'small sub', text: `잠긴 사람이 ${all.length - open.length - shut.length}명 더 있습니다.` }) : null));
}

// ---------- 아는 사람 ----------
function personSheet(ctx, id, firstNote) {
  const s = ctx.s; let result = firstNote ?? null;
  liveSheet(ctx, (redraw, close) => {
    const k = love.knownPeople(s).find((x) => x.person.id === id);
    const resultEl = result ? h('div', { className: `panel stack lv-result ${result.result ?? ''}`, role: 'status' }, h('p', { text: result.text }),
      result.reason ? h('p', { className: 'small', text: result.reason }) : null, result.news ? h('p', { className: 'small', text: result.news }) : null) : null;
    if (!k) return [sheetHead(love.personOf(id)?.이름 ?? '', close), resultEl, h('button', { type: 'button', className: 'btn', text: '닫기', on: { click: close } })];
    const p = k.person; const H = k.hints ?? {};
    return [sheetHead(p.이름, close), resultEl,
      h('div', { className: 'row lv-who' }, avatar(p.id, p.이름, s, 'big'), h('div', {}, h('span', { className: 'chip', text: k.관계 }), h('p', { className: 'lv-like', text: k.like }))),
      H.백제대사 ? h('blockquote', { className: 'lv-quote dark', text: H.백제대사 }) : null,
      H.성격 ? h('p', { className: 'small', text: H.성격 }) : null,
      H.좋아하는것?.length ? h('p', { className: 'small' }, h('b', { text: '좋아하는 것 ' }), H.좋아하는것.join(', ')) : null,
      H.끝나는경우 ? h('p', { className: 'small lv-warn' }, h('b', { text: '조심할 것 ' }), H.끝나는경우) : null,
      h('div', { className: 'row between' }, h('h3', { text: '같이 할 일' }), slots(s)),
      h('div', { className: 'grid3 lv-dates' }, love.dateOptions(s, id).map((o) => h('button', { type: 'button', className: 'btn lv-date', disabled: !o.ok, on: { click: () => { result = love.date(s, id, o.act); if (!result.ok) { ctx.toast(result.why); result = null; return; } ctx.refresh(); redraw(); } } },
        h('b', { text: o.act }), h('span', { className: 'small num', text: won(o.cost) }), o.ok ? null : lock(o.why)))),
      k.askOut ? h('button', { type: 'button', className: 'btn rose', disabled: !k.askOut.ok, on: { click: () => {
        const r = love.askOut(s, id); ctx.result(r.ok ? null : r); if (!r.ok) return;
        ctx.refresh(); close(); moment(ctx, id, p.이름, r.accepted ? '고백' : '거절', r.text);
      } } }, h('b', { text: '고백한다' }), k.askOut.ok ? h('span', { className: 'chip', text: '거절당하면 다시 찾아가지 않습니다.' }) : lock(k.askOut.why)) : null];
  });
}
function nextStep(ctx) {
  const s = ctx.s; const st = love.marriageStep(s); if (!st) return null;
  const P = s.partner; const fin = (title, r) => { ctx.result(r.ok ? null : r); if (r.ok) { ctx.refresh(); moment(ctx, P.id, P.이름, title, r.text); } };
  if (st.next === '가정') return h('button', { type: 'button', className: 'btn sun', text: '가족 돌보기', on: { click: () => ctx.go('family') } });
  if (st.next === '청혼') return h('button', { type: 'button', className: 'btn rose', disabled: !st.ok, on: { click: () => fin('청혼', love.propose(s)) } }, h('b', { text: '청혼한다' }), st.ok ? null : lock(st.why));
  if (st.next === '양가 인사') return h('button', { type: 'button', className: 'btn rose', on: { click: () => fin('양가 인사', love.meetFamilies(s, netWorth(s))) } }, h('b', { text: '양가에 인사드린다' }));
  return h('div', { className: 'stack lv-wed' }, h('p', { className: 'small', text: '어떤 결혼식을 올릴까요.' }),
    st.종류.map((w) => h('button', { type: 'button', className: 'btn rose', disabled: !w.ok, on: { click: () => fin('결혼식', love.wedding(s, w.kind)) } }, h('b', { text: `${w.kind} 결혼식` }), h('span', { className: 'chip num', text: won(w.cost) }), w.ok ? null : lock('돈이 모자랍니다.'))));
}
function partnerCard(ctx, k) {
  const s = ctx.s; const p = k.person; const married = k.관계 === '배우자';
  return h('section', { className: 'panel stack lv-partner' },
    h('div', { className: 'row' }, avatar(p.id, p.이름, s, 'big'), h('div', { className: 'lv-grow' }, h('span', { className: 'lv-tag', text: k.관계 }), h('h2', { text: p.이름 }), h('p', { className: 'small', text: k.like }))),
    nextStep(ctx),
    h('div', { className: `grid${married ? 1 : 2} lv-two` },
      h('button', { type: 'button', className: 'btn lv-paper', text: '같이 보낸다', on: { click: () => personSheet(ctx, p.id) } }),
      married ? null : h('button', { type: 'button', className: 'btn lv-paper', text: '헤어진다', on: { click: () => confirmSheet(ctx, '헤어집니다', `${p.이름}과(와) 끝냅니다. 다시 만날 수 없습니다.`, '헤어진다', () => { const r = love.breakUp(s); ctx.result(r); if (r.ok) ctx.refresh(); }) } })));
}
function sceneCard(ctx, sc, onResult) {
  const s = ctx.s;
  return h('section', { className: 'panel stack lv-scene' },
    h('div', { className: 'row' }, sc.who && sc.who !== '부모님' ? avatar(sc.who, love.personOf(sc.who)?.이름, s) : null, h('h3', { text: sc.title })), h('p', { text: sc.text }),
    sc.choices.map((ch, i) => h('button', { type: 'button', className: `btn ${i === 0 ? 'sun' : 'lv-paper'}`, disabled: ch.ok === false, on: { click: () => onResult(love.chooseScene(s, sc.id, i), sc) } },
      h('b', { text: ch.label }), ch.cost ? h('span', { className: 'chip num', text: won(ch.cost) }) : null, ch.ok === false ? lock(ch.why ?? '고를 수 없습니다.') : null)));
}
function loveScreen(ctx, params = {}) {
  const s = ctx.s; love.init(s); network.init(s);
  // 인물 시트에서 넘어오면 그 사람부터 연다.
  if (params.id && !params.opened && love.knownPeople(s).some((k) => k.person.id === params.id)) { params.opened = true; setTimeout(() => personSheet(ctx, params.id)); }
  const known = love.knownPeople(s);
  const mine = known.find((k) => k.관계 !== '아는 사이'); const others = known.filter((k) => k.관계 === '아는 사이');
  const onScene = (r) => {
    if (!r.ok) { ctx.toast(r.why); return; }
    if (r.person !== undefined || r.light) { showMet(ctx, r); return; }
    if (r.text) ctx.toast(r.text);
    ctx.refresh();
  };
  return h('div', { className: 'stack lv' },
    head(ctx, '만남', h('button', { type: 'button', className: 'lv-link', text: '가족', on: { click: () => ctx.go('family') } })),
    h('div', { className: 'row between lv-status' }, slots(s), h('span', { className: 'small num lv-dim', text: `내 돈 ${won(s.cash)}` })),
    love.pendingScenes(s).filter((x) => x.kind === '연애').map((sc) => sceneCard(ctx, sc, onScene)),
    mine ? partnerCard(ctx, mine) : null,
    others.length ? h('section', { className: 'stack' }, h('h3', { text: '알고 지내는 사람' }),
      others.map((k) => h('button', { type: 'button', className: 'lv-pick', on: { click: () => personSheet(ctx, k.person.id) } },
        avatar(k.person.id, k.person.이름, s), h('span', { className: 'lv-grow' }, h('b', { text: k.person.이름 }), h('span', { className: 'small lv-dim lv-block', text: k.like })), h('span', { className: 'lv-chev', 'aria-hidden': 'true', text: '›' })))) : null,
    h('section', { className: 'stack' }, h('h3', { text: '만나러 가기' }), h('div', { className: 'grid2 lv-routes' }, ROUTES.map((r) => routeCard(ctx, r)))));
}

// ---------- 가족 ----------
const parentMood = (s) => { const b = s.bonds?.부모님 ?? 50; if (s.flags?.부모_찻집) return b >= 70 ? '부모님 찻집 창가에 볕이 잘 듭니다. 어머니가 새 찻잎 이야기를 자주 하십니다.' : '부모님은 찻집 문을 닫고 산책을 다니십니다. 전화를 기다리십니다.'; return b >= 70 ? '부모님이 내 이야기를 자주 꺼내십니다.' : b >= 40 ? '부모님은 전화를 기다리십니다.' : '부모님과 연락이 뜸합니다.'; };
function nameForm(ctx, i, c) {
  const s = ctx.s;
  const input = h('input', { type: 'text', maxLength: 8, placeholder: '아이 이름', 'aria-label': '아이 이름', value: '' });
  return h('form', { className: 'row lv-nameform', on: { submit: (e) => { e.preventDefault(); const r = love.nameChild(s, i, input.value); ctx.result(r); if (r.ok) ctx.refresh(); } } }, input, h('button', { type: 'submit', className: 'btn sun lv-none', text: '짓기' }),
    h('button', { type: 'button', className: 'btn lv-none', text: '이대로', on: { click: () => { const r = love.chooseScene(s, `자녀:${i}:이름짓기`, 0); ctx.result(r); if (r.ok) ctx.refresh(); } } }));
}
function spouseCard(ctx, f) {
  const s = ctx.s; const P = s.partner;
  const childInput = h('input', { type: 'text', maxLength: 8, placeholder: '아이 이름 (나중에 지어도 됩니다)', 'aria-label': '아이 이름' });
  const can = love.canHaveChild(s); const time = dry(s, (x) => love.familyTime(x));
  return [
    h('section', { className: 'panel stack lv-partner' },
      h('div', { className: 'row' }, avatar(P.id, f.배우자, s, 'big'), h('div', { className: 'lv-grow' }, h('span', { className: 'lv-tag', text: '배우자' }), h('h2', { text: f.배우자 }), f.직업 ? h('p', { className: 'small', text: f.직업 }) : null, h('p', { className: 'small', text: f.사이문구 }))),
      f.멀어지는중 ? h('p', { className: 'small lv-warn', text: '한동안 같이 시간을 보내지 못했습니다.' }) : null,
      h('p', { className: 'small', text: f.칸안내 }),
      f.가족칸 ? h('p', { className: 'small num', text: `달마다 먼저 빠지는 가족 칸 ${f.가족칸}칸` }) : null,
      h('button', { type: 'button', className: 'btn main', disabled: !time.ok, on: { click: () => { const r = love.familyTime(s); ctx.result(r); if (r.ok) ctx.refresh(); } } }, h('b', { text: '가족과 시간을 보낸다' }), h('span', { className: 'chip', text: '1칸' }), time.ok ? null : lock(time.why))),
    h('section', { className: 'stack' }, h('h3', { text: '아이들' }),
      f.자녀.length ? null : h('p', { className: 'sub', text: '아직 아이가 없습니다. 없어도 괜찮습니다.' }),
      f.자녀.map((c, i) => h('div', { className: 'card stack lv-kid' }, h('div', { className: 'row between' }, h('b', { text: c.이름 }), h('span', { className: 'small num', text: `${c.나이}살` })), c.이름정함 ? null : nameForm(ctx, i, c))),
      h('div', { className: 'card stack' }, can.ok ? childInput : null,
        h('button', { type: 'button', className: 'btn', disabled: !can.ok, on: { click: () => { const r = love.haveChild(s, childInput.value); ctx.result(r); if (r.ok) ctx.refresh(); } } }, h('b', { text: '아이를 갖기로 한다' }), can.ok ? null : lock(can.why)))),
    f.자녀.length ? h('section', { className: 'stack' }, h('h3', { text: '교육비' }),
      h('div', { className: 'tabs' }, love.educationOptions(s).map((o) => h('button', { type: 'button', 'aria-pressed': String(o.selected), on: { click: () => { const r = love.setEducation(s, o.level); ctx.result(r.ok ? null : r); if (r.ok) ctx.refresh(); } } }, o.monthly ? `${o.label} · ${won(o.monthly)}` : o.label))),
      h('p', { className: 'small sub num', text: `아이들에게 매달 ${won(f.월양육비)} 듭니다. ${f.배우자수입 ? `배우자 수입이 매달 ${won(f.배우자수입)} 들어옵니다.` : ''}` })) : h('p', { className: 'small sub num', text: `배우자 수입이 매달 ${won(f.배우자수입)} 들어옵니다.` }),
  ];
}
function goHome(ctx, kind) {
  const s = ctx.s; const r = love.chooseHome(s, kind);
  ctx.result(r);
  if (!r.ok) return;
  if (r.openInvest) { ctx.save(); ctx.go('invest', { tab: r.openInvest, cat: r.openInvest }).catch(() => { ctx.toast('투자 화면을 열지 못했습니다.'); ctx.back(); }); return; }
  ctx.refresh();
}
function homeCard(ctx, f) {
  const s = ctx.s; const cur = f.집;
  return h('section', { className: 'stack' }, h('h3', { text: '집' }),
    h('p', { className: 'small sub', text: cur ? `${cur.since}년부터 ${cur.kind === '월세' ? '월세로 삽니다' : '우리 집에 삽니다'}.` : s.family?.homeWish ? '집을 알아보는 중입니다. 부동산에서 내가 살기로 사면 우리 집이 됩니다.' : '어디서 살지 아직 정하지 않았습니다.' }),
    h('div', { className: 'grid2' }, love.homeOptions(s).map((o) => h('button', { type: 'button', className: `btn ${cur?.kind === o.kind ? 'leaf' : ''}`, disabled: o.ok === false, on: { click: () => goHome(ctx, o.kind) } }, h('b', { text: o.label }), h('span', { className: 'chip num', text: o.monthly ? `매달 ${won(o.monthly)}` : (o.note ?? '') }), o.ok === false ? lock(o.why) : null))));
}
function divorceCard(ctx) {
  const s = ctx.s; const c = love.canDivorce(s);
  return h('section', { className: 'stack' },
    h('button', { type: 'button', className: 'btn', disabled: !c.ok, on: { click: () => confirmSheet(ctx, '이혼합니다', '재산 일부를 나눕니다. 새 만남은 1년 뒤에 다시 열립니다.', '이혼한다', () => { const r = love.divorce(s, netWorth(s)); ctx.result(r); if (r.ok) ctx.refresh(); }) } }, h('b', { text: '이혼' }), c.ok ? h('span', { className: 'chip', text: '사이가 오래 나빠 이야기를 꺼낼 수 있습니다.' }) : lock(c.why)));
}
function parentsCard(ctx) {
  const s = ctx.s; const visit = dry(s, (x) => love.parentVisit(x));
  return h('section', { className: 'stack' }, h('h3', { text: '부모님' }), h('p', { className: 'sub', text: parentMood(s) }),
    h('button', { type: 'button', className: 'btn main', disabled: !visit.ok, on: { click: () => { const r = love.parentVisit(s); ctx.result(r); if (r.ok) ctx.refresh(); } } }, h('b', { text: '안부 들르기' }), h('span', { className: 'chip num', text: `${won(50000)} · 1칸` }), visit.ok ? null : lock(visit.why)),
    love.parentOptions(s).map((o) => h('button', { type: 'button', className: 'btn', disabled: !o.ok, on: { click: () => { const r = love.parentAct(s, o.key); ctx.result(r); if (r.ok) ctx.refresh(); } } }, h('b', { text: o.label }), h('span', { className: 'chip num', text: won(o.cost) }), o.ok ? null : lock(o.why))));
}
function familyScreen(ctx) {
  const s = ctx.s; love.init(s);
  const f = love.familyPanel(s);
  const onScene = (r) => {
    if (!r.ok) { ctx.toast(r.why); return; }
    if (r.text) ctx.toast(r.text);
    if (r.openInvest) { ctx.save(); ctx.go('invest', { tab: r.openInvest, cat: r.openInvest }).catch(() => ctx.back()); return; }
    ctx.refresh();
  };
  const scenes = love.pendingScenes(s).filter((x) => ['부모', '가정', '자녀'].includes(x.kind) && x.id !== '집_고르기' && x.needName == null);
  return h('div', { className: 'stack lv' }, head(ctx, '가족', h('button', { type: 'button', className: 'lv-link', text: '만남', on: { click: () => ctx.go('love') } })),
    h('div', { className: 'row between lv-status' }, slots(s), h('span', { className: 'small num lv-dim', text: `내 돈 ${won(s.cash)}` })),
    scenes.map((sc) => sceneCard(ctx, sc, onScene)),
    f ? spouseCard(ctx, f) : h('section', { className: 'panel' }, h('p', { text: s.partner ? `${s.partner.이름}과(와) 아직 결혼 전입니다.` : '결혼하지 않아도 됩니다. 부모님은 언제든 찾아뵐 수 있습니다.' })),
    f ? homeCard(ctx, f) : null, parentsCard(ctx), f ? divorceCard(ctx) : null);
}

// ---------- 풋풋한 마음 (중·고등학생) ----------
// 고등학생 때 사진을 쓴다(사용자 지시 2026-11-16: 이니셜만 쓰던 규칙을 없앰). 사진이 없으면 이니셜이 보인다.
const teenAv = (id, name, cls = '') => h('span', { className: `lv-av teen ${cls}`, 'aria-hidden': 'true' }, h('span', { text: (name ?? '?').slice(0, 1) }), id ? photo(id, '고등') : null);
function teenMoment(ctx, id, name, title, text) {
  ctx.sheet((close) => h('div', { className: 'stack lv-sheet lv-moment' }, name ? teenAv(id, name, 'big lv-center') : null, h('h2', { text: title }), h('p', { text }),
    h('button', { type: 'button', className: 'btn main', text: '확인', on: { click: close } })));
}
function crushRun(ctx, r, id, name, title) {
  if (!r.ok) { ctx.toast(r.why); return; }
  ctx.save?.();
  teenMoment(ctx, id, name, r.title ?? title, r.text);
  ctx.refresh();
}
function crushCard(ctx, p, bare = false) {
  const s = ctx.s;
  const acts = crush.actKeys(s).map((k) => ({ k, label: crush.actLabel(s, k), ...crush.canAct(s, p.id, k) })).filter((a) => !(a.k === 'gift' && /특별한 날/.test(a.why ?? '')));
  const cf = crush.canConfess(s, p.id);
  const info = p.info ?? {};
  return h('section', { className: 'panel stack lv-teen' },
    bare ? h('div', { className: 'row lv-chips' }, h('span', { className: 'lv-tag', text: p.단계 }), p.first ? h('span', { className: 'lv-tag first', text: '첫 번째 인생의 그 아이' }) : null) : null,
    bare ? null : h('div', { className: 'row' }, teenAv(p.id, p.이름, 'big'), h('div', { className: 'lv-grow' },
      h('div', { className: 'row lv-chips' }, h('span', { className: 'lv-tag', text: p.단계 }), p.first ? h('span', { className: 'lv-tag first', text: '첫 번째 인생의 그 아이' }) : null),
      h('h2', { text: p.이름 }), h('p', { className: 'small', text: info.소개?.includes(p.학교 ?? '') ? info.소개 : [p.학교, info.소개 ?? p.길].filter(Boolean).join(' · ') }))),
    info.성격 ? h('p', { className: 'small', text: info.성격 }) : null,
    info.말버릇 ? h('p', { className: 'lv-quote', text: `"${info.말버릇}"` }) : null,
    h('div', { className: 'grid2 lv-dates' }, acts.map((a) => h('button', { type: 'button', className: 'btn lv-date', disabled: !a.ok, on: { click: () => crushRun(ctx, crush.act(s, p.id, a.k), p.id, p.이름, a.label) } },
      h('b', { text: a.label }), h('span', { className: 'chip num', text: a.ok ? (a.cost ? `${won(a.cost)} · 1칸` : '1칸') : '' }), a.ok ? null : lock(a.why)))),
    h('button', { type: 'button', className: `btn ${cf.ok ? 'main' : ''}`, disabled: !cf.ok, on: { click: () => confirmSheet(ctx, `${p.이름}에게 고백한다`, cf.good ? '특별한 날이라 용기가 난다. 거절당하면 한동안 어색해진다.' : '거절당하면 한동안 어색해진다. 축제나 기념일에는 조금 더 용기가 난다.', '고백한다', () => crushRun(ctx, crush.confess(s, p.id), p.id, p.이름, '고백')) } },
      h('b', { text: '고백하기' }), cf.ok ? h('span', { className: 'chip', text: '1칸' }) : lock(cf.why)));
}
// 사람 시트에 넣는 조각(사용자 지시 2026-11-16). 사귀기 전의 마음 쌓기와 고백은 그 사람 화면에서 한다. 사귀면 풋풋한 마음으로 넘어간다.
export function crushSection(ctx, id) {
  const s = ctx.s; if (!crush.isTeenStage(s)) return null;
  ensureCss(); crush.init(s);
  const d = crush.panel(s);
  if (d.partner?.id === id) return h('button', { type: 'button', className: 'btn rose', on: { click: () => ctx.go('crush') } }, '풋풋한 마음으로', h('span', { className: 'chip', text: '사귀는 사이' }));
  const p = d.people.find((x) => x.id === id);
  return p ? crushCard(ctx, p, true) : null;
}
function teenPartner(ctx, P) {
  const s = ctx.s;
  const opts = crush.dateOptions(s);
  return h('section', { className: 'panel stack lv-partner' },
    h('div', { className: 'row' }, teenAv(P.id, P.이름, 'big'), h('div', { className: 'lv-grow' },
      h('div', { className: 'row lv-chips' }, h('span', { className: 'lv-tag', text: '사귀는 사이' }), P.hand ? h('span', { className: 'lv-tag first', text: '손을 잡은 사이' }) : null),
      h('h2', { text: P.이름 }), h('p', { className: 'small', text: [P.학교, P.months ? `사귄 지 ${P.months}달` : '오늘부터'].filter(Boolean).join(' · ') }), h('p', { className: 'small', text: P.mood }))),
    P.far ? h('p', { className: 'small lv-dim', text: '학교가 달라서 주말에만 볼 수 있다. 자주 연락하지 않으면 금방 멀어진다.' }) : null,
    P.pause ? h('p', { className: 'small lv-dim', text: '수능이 끝날 때까지 잠깐 쉬기로 했다.' }) : null,
    h('h3', { text: '데이트' }),
    h('div', { className: 'grid2 lv-dates' }, opts.map((o) => h('button', { type: 'button', className: 'btn lv-date', disabled: !o.ok, on: { click: () => crushRun(ctx, crush.date(s, o.key), P.id, P.이름, o.label) } },
      h('b', { text: o.label }), h('span', { className: 'chip num', text: `${o.cost ? won(o.cost) : '돈 안 듦'} · 1칸` }), o.ok ? null : lock(o.why)))),
    h('div', { className: 'grid2 lv-dates' }, ['talk', 'gift'].map((k) => ({ k, label: crush.actLabel(s, k), ...crush.canAct(s, P.id, k) })).filter((a) => !(a.k === 'gift' && /특별한 날/.test(a.why ?? ''))).map((a) => h('button', { type: 'button', className: 'btn lv-date', disabled: !a.ok, on: { click: () => crushRun(ctx, crush.act(s, P.id, a.k), P.id, P.이름, a.label) } }, h('b', { text: a.label }), a.ok ? h('span', { className: 'chip', text: '1칸' }) : lock(a.why)))));
}
function crushScreen(ctx) {
  const s = ctx.s; crush.init(s);
  const d = crush.panel(s);
  const END = { 좋게: '좋게 헤어졌다', 나쁘게: '다투고 헤어졌다', 졸업: '졸업과 함께 각자의 길로', 멀어짐: '자연스럽게 멀어졌다' };
  return h('div', { className: 'stack lv' },
    head(ctx, '풋풋한 마음'),
    h('div', { className: 'row between lv-status' }, slots(s), h('span', { className: 'small num lv-dim', text: `용돈 ${won(s.cash)}` })),
    !d.open ? h('section', { className: 'panel' }, h('p', { text: ['초등', '중학'].includes(stageOf(s)) ? '고등학교에 가면 열린다. 지금은 친구들과 노는 게 제일 좋다.' : '학생 때 이야기는 추억으로 남았다. 동창회에서 다시 만날지도 모른다.' })) : null,
    d.partner ? teenPartner(ctx, d.partner) : null,
    d.open && !d.partner ? h('section', { className: 'panel stack' }, h('p', { text: '아직 사귀는 사람이 없다.' }),
      h('p', { className: 'small', text: d.people.length ? '사람들에서 그 아이를 열어 마음을 쌓고 고백한다. 받아 주면 여기에 보인다.' : `학교생활을 하다 보면 눈에 들어오는 아이가 생긴다. ${d.other ?? '다른 학교'} 축제, 연합 동아리, 학원에서 다른 학교 아이를 만날 수도 있다. 만난 아이는 사람들에 보인다.` }),
      d.people.length ? h('button', { type: 'button', className: 'btn', text: '사람들 보기', on: { click: () => ctx.go('people') } }) : null,
      d.other ? h('button', { type: 'button', className: 'btn', text: `${d.other}에 가 보기 (축제·연합 동아리·학원)`, on: { click: () => ctx.go('place', { id: 'other' }) } }) : null) : null,
    d.memories.length ? h('section', { className: 'stack' }, h('h3', { text: '추억' }), d.memories.map((m) => h('div', { className: 'lv-pick' }, teenAv(m.id, m.이름), h('span', { className: 'lv-grow' }, h('b', { text: m.이름 }), h('span', { className: 'small lv-dim lv-block', text: [m.학교, END[m.end] ?? '', m.hand ? '처음 잡은 손' : ''].filter(Boolean).join(' · ') }))))) : null);
}

export const screens = { love: loveScreen, family: familyScreen, crush: crushScreen };
