// 장면 플레이어. 이벤트(params.event)와 love 장면(params.love)을 같은 틀로 튼다.
// 배경 전체 위에 인물 카드와 이름표, 아래에 대사 상자. 어디를 눌러도 다음 대사로 간다. 표정 사진이 없어 카드는 살짝 움직이기만 한다.
import { h, won } from '../ui.js';
import { stageOf } from '../rules.js';
import { IOI_CAST } from '../coding.js';
import { bgInto, sceneInto } from '../ui.js';
import { beatsOf, choicesOf, choose, eventById, sceneEvent } from '../events.js';
import { effectText } from '../rules.js';
import * as love from '../love.js';
import { storyPlaceOf } from '../activities.js';
import { backdrop, portrait, whoName, advance, deferScenes, storyBg, mePic, kinOf, kinCard } from './common.js';

const statCond = (w) => !!w && (w.tier || w.statMin);
const GLYPH = { bold: '➜', quiet: '…', heart: '♥', insight: '✦', skip: '↷' };
// 선택지 종류: 연애는 하트, 능력 조건은 별. 나머지는 문구로 고른다. 값에는 영향이 없다.
const toneOf = (c, k) => (c.tone === 'rose' ? 'heart' : c.tone === 'sun' ? 'insight' : /넘어|그만|않는다|안 한다|미룬|지나친|모른 척|거절|나중에/.test(c.label) ? 'skip' : /돕|함께|같이|옆에|챙긴|위로|고맙|사과|안아|편을|손을|듣는다/.test(c.label) ? 'heart' : k === 0 ? 'bold' : 'quiet');
function loadScene(ctx, params) {
  const s = ctx.s;
  if (params.event) {
    const base = eventById(params.event); if (!base) return null;
    const e = sceneEvent(s, base);
    const list = choicesOf(s, e).filter((c) => !c.hidden).map((c) => ({ ...c, tone: statCond(e.choices[c.i].when) ? 'sun' : '' }));
    return { title: e.title, who: e.who, text: e.text, bg: e.bg, cast: e.cast, kin: e.kin, place: storyPlaceOf(s, e), canDefer: true, beats: beatsOf(e), choices: list, had: !!e.choices?.length, pick: (i) => { const r = choose(s, e.id, i); return r.ok ? { ok: true, text: r.result, fx: effectText(r.effects) } : r; } };
  }
  const sc = love.pendingScenes(s).find((x) => x.id === params.love); if (!sc) return null;
  const list = (sc.choices ?? []).map((c, i) => ({ i, label: c.label, ok: c.ok !== false, why: c.why, cost: c.cost, tone: sc.kind === '연애' ? 'rose' : '' }));
  return { title: sc.title, who: sc.who, look: sc.look ?? null, text: sc.text, beats: beatsOf(sc), choices: list, had: list.length > 0, needName: sc.needName, pick: (i, name) => {
    if (sc.needName != null && name) return love.nameChild(s, sc.needName, name); // 이름을 지으면 장면이 그대로 끝난다
    return love.chooseScene(s, sc.id, i);
  } };
}
// 연인 장면의 배경: black 검은 화면, hotel 인물 폴더의 호텔 그림(없으면 어두운 색).
function lookBackdrop(d) {
  const el = h('div', { className: `backdrop look-${d.look}`, 'aria-hidden': 'true' });
  if (d.look === 'hotel') sceneInto(el, d.who, '호텔', undefined, '불'); else el.style.background = '#000'; // 불.png가 있으면 호텔 위에 겹친다
  return el;
}
function scene(ctx, params) {
  const s = ctx.s, d = loadScene(ctx, params);
  if (!d) { setTimeout(() => advance(ctx)); return h('div'); }
  const name = whoName(d.who), given = name && !/ /.test(name) && name.length >= 3 ? name.slice(1) : name;
  const meets = d.beats.findIndex((b) => b.includes('"') || (name && (b.includes(name) || b.includes(given))));
  const showFrom = Math.max(0, meets), st = stageOf(s);
  let i = 0, result = null, chosen = null, resultFx = '';
  const hasCard = d.who && d.who !== '부모님' && !d.look; // 검은 화면·호텔 장면은 인물 사진 없이 글과 대사만
  const card = (pic, label) => h('div', { className: 'portrait-wrap' }, h('div', { className: 'portrait' }, pic), label ? h('span', { className: 'nametag', text: label }) : null);
  const mainCard = hasCard ? card(portrait(d.who, st), name) : null;
  const stageEl = h('div', { className: 'sc-stage' });
  const box = h('div', { className: 'sc-low' });
  const dots = d.beats.length > 1 && d.beats.length <= 8 ? h('span', { className: 'sc-dots', 'aria-hidden': 'true' }, d.beats.map(() => h('i'))) : null;
  const count = d.beats.length > 8 ? h('span', { className: 'sc-count num' }) : null;
  const end = () => advance(ctx);
  const nameInput = d.needName != null ? h('input', { maxLength: 8, placeholder: '아이 이름 (8자까지)', 'aria-label': '아이 이름' }) : null;
  const pickAndGo = (i2, c) => {
    const r = d.pick(i2, nameInput?.value.trim()); ctx.save();
    if (!r.ok) { ctx.toast(r.why); return; }
    if (r.text) { result = r.text; chosen = c ?? null; resultFx = r.fx ?? ''; draw(); } else { if (r.fx) ctx.toast(r.fx); end(); }
  };
  const choiceBtn = (c, k) => {
    const tone = c.ok ? toneOf(c, k) : 'locked';
    const chips = [c.cost && c.ok ? h('span', { className: 'chip', text: won(c.cost) }) : null,
      ...(!c.ok ? (c.chips?.length ? c.chips : [c.why ?? '지금은 고를 수 없습니다.']).map((t) => h('span', { className: 'chip lock', text: t })) : [])].filter(Boolean);
    return h('button', { className: `choice tone-${tone}`, disabled: !c.ok, on: { click: (e) => { e.stopPropagation(); pickAndGo(c.i, { ...c, tone }); } } },
      h('span', { className: 'glyph', 'aria-hidden': 'true', text: c.ok ? GLYPH[tone] : '' }),
      h('span', { className: 'clabel', text: c.label }),
      chips.length ? h('span', { className: 'cchips' }, chips) : null);
  };
  const forward = () => {
    if (result != null) return;
    if (i < d.beats.length - 1) { i += 1; draw(); } else if (!d.had) pickAndGo(undefined);
  };
  let shownFor = null;
  // 대회 카드 인물: 그림이 있으면 그림, 없으면 이름과 소속만 보인다.
  const castCards = (d.cast ?? []).slice(0, 3).map((id) => {
    const p = IOI_CAST[id]; if (!p) return null;
    const pic = h('div', { className: 'ioi-card' }, h('small', { text: p.team }));
    bgInto(pic, [p.art], 'radial-gradient(circle at 50% 30%,#55617a,#2b3346 62%,#1c2330)');
    return card(pic, p.name);
  }).filter(Boolean);
  function paintCards(beat) {
    if (castCards.length) {
      if (shownFor === 'cast') return;
      shownFor = 'cast'; stageEl.classList.toggle('pair', castCards.length > 1); stageEl.classList.toggle('trio', castCards.length > 2); stageEl.replaceChildren(...castCards); return;
    }
    const kin = !hasCard ? kinOf(beat, d.who, d.kin).map((n) => [n, kinCard(n, st)]).filter(([, c]) => c) : [];
    const key = kin.length ? kin.map(([n]) => n).join() : mainCard && (result != null || i >= showFrom) ? 'main' : '';
    if (key === shownFor) return;
    shownFor = key;
    const cards = key === 'main' ? [mainCard] : kin.map(([n, c]) => card(c, n));
    stageEl.classList.toggle('pair', cards.length > 1);
    stageEl.replaceChildren(...cards);
  }
  function draw() {
    const last = i >= d.beats.length - 1, beat = d.beats[i] ?? '';
    paintCards(beat);
    if (dots) [...dots.children].forEach((e, k) => { e.className = k === i ? 'on' : k < i ? 'past' : ''; });
    if (count) count.textContent = `${i + 1}/${d.beats.length}`;
    if (result != null) {
      const g = chosen ? GLYPH[chosen.tone] : null;
      box.replaceChildren(
        chosen ? h('p', { className: `chosen tone-${chosen.tone}` }, g && chosen.tone !== 'locked' ? `${g} ` : '', chosen.label) : null,
        h('div', { className: 'beat-box result' }, h('p', { text: result }), resultFx ? h('p', { className: 'small num sc-fx', text: resultFx }) : null),
        h('button', { className: 'btn main sc-go', text: '계속', on: { click: end } }));
      return;
    }
    const talks = beat.startsWith('"') && name; // 지문 안의 인용은 누가 말했는지 문장에 적혀 있다
    const mono = /^\s*[(（]/.test(beat);
    const showName = talks && !shownFor;
    const textEl = h('button', { className: `beat-box${mono ? ' monologue' : talks ? '' : ' narration'}`, 'aria-label': last ? '대사' : '다음 대사', on: { click: (e) => { e.stopPropagation(); forward(); } } },
      showName ? h('b', { className: 'speaker', text: name }) : null,
      h('p', { text: beat }),
      !last || !d.had ? h('span', { className: 'beat-more', 'aria-hidden': 'true', text: '›' }) : null);
    const line = h('div', { className: 'beat-line' }, mono ? h('span', { className: 'self-face' }, mePic(s)) : null, textEl);
    const kids = [line];
    if (last && d.had) {
      const usable = d.choices.filter((c) => c.ok);
      const wrap = h('div', { className: 'choices', role: 'group', 'aria-label': '어떻게 할까?' }, nameInput, d.choices.map(choiceBtn));
      if (!usable.length) wrap.append(h('button', { className: 'btn', text: '지금은 넘어간다', on: { click: () => (params.event ? pickAndGo(undefined) : end()) } }));
      kids.push(wrap);
    }
    box.replaceChildren(...kids);
  }
  draw();
  const skip = () => { i = Math.max(i, d.beats.length - 1); draw(); };
  return h('div', { className: 'scene', on: { click: forward } },
    d.look ? lookBackdrop(d) : backdrop(s, storyBg(s, d), d.place ? `at-${d.place}` : ''),
    h('span', { className: 'stage-shade', 'aria-hidden': 'true' }),
    h('header', { className: 'sc-top', on: { click: (e) => e.stopPropagation() } },
      h('div', { className: 'sc-head' }, h('span', { className: 'eyebrow', text: 'A MOMENT TO REMEMBER' }), h('h2', { text: d.title ?? `${s.year}년 ${s.month}월` })),
      d.canDefer ? h('button', { className: 'sc-skip', text: '나중에', on: { click: () => { deferScenes(true); advance(ctx); } } }) : null,
      h('button', { className: 'sc-skip round', 'aria-label': '대사 넘기기', text: '»', on: { click: skip } })),
    dots || count ? h('div', { className: 'sc-prog' }, dots, count) : null,
    stageEl, box);
}
export const screens = { scene };
