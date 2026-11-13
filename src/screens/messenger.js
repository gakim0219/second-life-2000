// 연락 창. 규칙은 src/messenger.js. 시기마다 앱이 바뀌고, 앱마다 색과 모양만 다르다(로고·상표 그림은 쓰지 않는다).
import { h } from '../ui.js';
import * as mz from '../messenger.js';
import { bondStage } from '../bonds.js';
import { face, nameOf, abroadOf, heartsEl } from './people.js';

let chosen = null; // 고른 앱. 그 시기에 없으면 가장 새 앱으로 돌아간다.
const SEASON = (m) => (m <= 2 || m === 12 ? '겨울' : m <= 5 ? '봄' : m <= 8 ? '여름' : '가을');
const bytes = (t) => [...t].reduce((n, c) => n + (c.charCodeAt(0) > 127 ? 2 : 1), 0); // 그 시절 문자는 한글 2바이트, 80바이트까지
const lastOf = (s, id) => { const t = mz.threadOf(s, id); return t[t.length - 1] ?? null; };
const ymText = (at) => `${Math.floor(at / 100)}.${String(at % 100).padStart(2, '0')}`;

function head(s, app, title) {
  const apps = mz.appsAt(s);
  return [
    h('div', { className: 'section-heading' }, h('span', { className: 'eyebrow', text: 'MESSENGER' }), h('h1', { text: title }),
      h('p', { className: 'num', text: `${s.year}년 ${SEASON(s.month)} · 이번 달 남은 연락 ${mz.left(s)}/${mz.LIMIT}` })),
    apps.length > 1 ? h('div', { className: 'tabs', role: 'group', 'aria-label': '앱 고르기' }, apps.map((k) => h('button', { 'aria-pressed': String(k === app), text: mz.APPS[k].name, on: { click: () => { chosen = k; ctx0?.refresh(); } } }))) : null,
  ];
}
let ctx0 = null;

function renderList(ctx, s, app) {
  const ids = mz.contacts(s).sort((a, b) => (lastOf(s, b)?.at ?? 0) - (lastOf(s, a)?.at ?? 0) || (s.bonds[b] ?? 0) - (s.bonds[a] ?? 0));
  const rows = ids.map((id) => {
    const last = lastOf(s, id), gap = mz.gapOf(s, id), abroad = abroadOf(s, id), sent = mz.init(s).sent[id];
    return h('button', { className: 'mz-row', on: { click: () => ctx.go('messenger', { id }) } },
      face(id, s, 'lg', true),
      h('span', { className: 'mz-row-main' },
        h('span', { className: 'mz-row-top' }, h('b', { text: nameOf(id) }),
          abroad ? h('em', { className: 'mz-tag', text: abroad === '해외' ? '해외' : abroad }) : null,
          gap != null && gap >= 24 ? h('em', { className: 'mz-tag far', text: '오래 연락 없음' }) : null,
          sent ? h('em', { className: 'mz-tag done', text: '이번 달 연락함' }) : null),
        h('span', { className: 'mz-row-last', text: last ? last.text : '아직 주고받은 연락이 없다.' })),
      h('span', { className: 'mz-row-at num', text: last ? ymText(last.at) : '' }));
  });
  return h('div', { className: `mz mz-${app} stack` },
    ...head(s, app, '연락'),
    h('section', { className: 'mz-frame' },
      h('div', { className: 'mz-bar' }, h('span', { className: 'mz-app', text: mz.APPS[app].name }), h('span', { className: 'mz-count num', text: `친구 ${ids.length}` })),
      rows.length ? h('div', { className: 'mz-list' }, rows) : h('p', { className: 'mz-empty', text: '연락할 사람이 아직 없다. 학교나 동네에서 먼저 친해져 보자.' })),
    h('p', { className: 'sub small', text: '연락은 한 달에 세 번, 한 사람에게 한 번씩. 활동 칸은 쓰지 않는다. 2년 넘게 연락이 없으면 사이가 아주 천천히 멀어진다(평생 인연은 그대로).' }));
}

function renderThread(ctx, s, app, id) {
  const abroad = abroadOf(s, id), st = bondStage(s, id);
  const opts = { name: nameOf(id), me: s.name ?? '나', abroad: !!abroad };
  const msgs = mz.threadOf(s, id);
  const send = (act) => {
    const r = mz.send(s, id, app, act, opts);
    if (!r.ok) { ctx.toast(r.why); return; }
    ctx.toast(r.text); ctx.refresh();
  };
  const box = h('div', { className: 'mz-msgs', role: 'log', 'aria-label': `${nameOf(id)}와의 대화` },
    msgs.length ? msgs.map((m) => h('div', { className: `mz-msg ${m.me ? 'me' : 'them'}` },
      h('span', { className: 'mz-bubble', text: m.text }),
      h('span', { className: 'mz-meta num', text: `${ymText(m.at)} · ${mz.APPS[m.app]?.name ?? ''}` })))
      : h('p', { className: 'mz-empty', text: abroad ? `${nameOf(id)}은(는) 지금 ${abroad === '해외' ? '해외' : abroad}에 있다. 그래도 연락은 닿는다.` : '아직 주고받은 연락이 없다.' }));
  const draft = mz.lines(s, id, app, 'hello', opts).mine;
  return h('div', { className: `mz mz-${app} stack` },
    h('button', { className: 'nav-back', on: { click: () => ctx.back() } }, '‹ 연락 목록'),
    ...head(s, app, nameOf(id)),
    h('section', { className: 'mz-frame' },
      h('div', { className: 'mz-bar' }, face(id, s, '', true), h('b', { className: 'mz-who', text: nameOf(id) }), heartsEl(st.hearts), h('span', { className: 'mz-app', text: mz.APPS[app].name })),
      box,
      app === 'sms' ? h('p', { className: 'mz-bytes num', text: `${bytes(draft)}/80 byte` }) : null,
      h('div', { className: 'mz-acts' }, mz.ACTS.map((act) => {
        const c = mz.canSend(s, id, app, act, opts);
        return h('button', { className: `btn ${c.ok && act === 'hello' ? 'leaf' : ''}`, disabled: !c.ok, on: { click: () => send(act) } },
          mz.actLabel(app, act), h('span', { className: `chip ${c.ok ? '' : 'lock'}`, text: c.ok ? (act === 'plan' ? '다음 달 칸 하나를 쓴다' : act === 'worry' ? '마음이 가벼워진다' : '칸을 쓰지 않음') : c.why }));
      }))),
    h('p', { className: 'sub small', text: `${st.label} · ${mz.gapOf(s, id) == null ? '' : `마지막으로 본 지 ${mz.gapOf(s, id)}개월`}` }));
}

export function render(ctx, params = {}) {
  ctx0 = ctx;
  const s = ctx.s;
  const app = mz.appOf(s, chosen);
  if (!app) return h('div', { className: 'stack' }, h('button', { className: 'nav-back', on: { click: () => ctx.back() } }, '‹ 돌아가기'), h('p', { className: 'card', text: '지금은 연락할 방법이 없다.' }));
  if (params.id && mz.contactable(s, params.id)) return renderThread(ctx, s, app, params.id);
  return renderList(ctx, s, app);
}
