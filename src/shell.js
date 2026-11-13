// 화면 공통 틀. 화면 파일은 export function render(ctx, params) { return Element } 하나를 낸다.
import { h } from './ui.js';
import { serialize, deserialize } from './state.js';
import { statGains, gainText } from './rules.js';
import { writeSlot, deleteSlot } from './saves.js';
import { sfx } from './sound.js';
import { toneOf } from './sound_rules.js';
let lastCash = null; // 알림 때 돈이 바뀌었으면 동전 소리
const KEY = 'second-life-2000-v3'; // 화면 개편 때 저장 키를 바꿔 이름 입력부터 새로 시작한다.
const OLD_KEY = 'second-life-2000';
const AT_KEY = `${KEY}:at`; // 마지막 저장 시각. 계정에 있는 자동 저장과 어느 쪽이 최근인지 비교한다.
let autoWarned = false;
const store = (fn) => { try { return fn(localStorage); } catch { return null; } };
const screens = new Map(); const cssLoads = new Map();
// 화면 전용 CSS를 다 받은 뒤에 그린다. 안 그러면 새 화면이 스타일 없이 한 번 번쩍이고 가로로 넘친다.
function ensureCss(href) {
  if (!cssLoads.has(href)) cssLoads.set(href, new Promise((res) => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = l.onerror = () => res();
    document.head.append(l); setTimeout(res, 4000); // 느린 망에서 영영 멈추지 않게
  }));
  return cssLoads.get(href);
}
let drawSeq = 0, lastDrawn = null;
export const ctx = {
  s: null, stack: [],
  register(name, loader) { screens.set(name, loader); },
  async go(name, params = {}, opt = {}) { ctx.markStats(); if (!opt.replace && ctx.cur) ctx.stack.push(ctx.cur); ctx.cur = { name, params }; await ctx.draw(); window.scrollTo?.(0, 0); },
  async back() { ctx.cur = ctx.stack.pop() ?? { name: 'home', params: {} }; await ctx.draw(); },
  async refresh() {
    ctx.save();
    // 토스트를 띄우지 않는 화면(회사, 대화 등)도 능력치가 변했으면 알려 준다.
    if (ctx.s && ctx.lastStats) { const g = gainText(statGains(ctx.lastStats, ctx.s.stats)); if (g) { ctx.markStats(); ctx.toast(g); } }
    await ctx.draw();
  },
  async draw() {
    const { name, params } = ctx.cur; const load = screens.get(name); if (!load) throw new Error('없는 화면: ' + name);
    const seq = ++drawSeq, mod = await load(); if (mod.css) await ensureCss(mod.css);
    if (seq !== drawSeq) return; // 그 사이 다른 화면으로 넘어갔다
    const el = await mod.render(ctx, params); if (seq !== drawSeq) return;
    const app = document.getElementById('app');
    app.replaceChildren(el);
    // 화면이 바뀔 때만 살짝 나타난다. 같은 화면을 다시 그릴 때는 그대로 둔다. transform을 쓰면 안의 고정 줄이 흔들려 불투명도만 쓴다.
    if (name !== lastDrawn) { app.classList.remove('swap'); void app.offsetWidth; app.classList.add('swap'); lastDrawn = name; }
    ctx.afterDraw?.(ctx);
  },
  // 지난 표시 뒤로 달라진 능력치를 글에 붙인다. 이미 숫자가 적힌 글이면 그대로 둔다.
  markStats() { ctx.lastStats = ctx.s ? { ...ctx.s.stats } : null; },
  withGains(t) {
    if (!ctx.s || !ctx.lastStats) { ctx.markStats(); return t; }
    const g = gainText(statGains(ctx.lastStats, ctx.s.stats)); ctx.markStats();
    return g && !/(지능|체력|매력|인맥) [+-]/.test(t) ? `${t} (${g})` : t;
  },
  toast(t) { if (!t) return; t = ctx.withGains(t);
    { const tone = toneOf(t), cash = ctx.s?.cash ?? null; if (tone) sfx(tone); else if (lastCash != null && cash != null && cash !== lastCash) sfx('coin'); lastCash = cash; }
    let b = document.querySelector('.toast-box'); if (!b) { b = h('div', { className: 'toast-box', role: 'status' }); document.body.append(b); } const e = h('div', { className: 'toast', text: t }); b.replaceChildren(e); /* 알림은 하나만: 새 알림이 이전 것을 바꾼다(사용자 지시 2026-11-12) */ setTimeout(() => e.remove(), Math.max(2600, Math.min(7000, t.length * 70))); },
  result(r) { ctx.toast(r?.text ?? r?.why ?? ''); return r; },
  sheet(el, { onClose } = {}) { sfx('open'); let closed = false; const close = () => { if (closed) return; closed = true; sfx('close'); onClose?.(); w.classList.add('closing'); setTimeout(() => w.remove(), window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 180); }; const w = h('div', { className: 'sheet-wrap', on: { click: (e) => { if (e.target === w) close(); } } }, h('div', { className: 'sheet', role: 'dialog', 'aria-modal': 'true' }, typeof el === 'function' ? el(close) : el)); document.body.append(w); return close; },
  save() { store((l) => { l.setItem(KEY, serialize(ctx.s)); l.setItem(AT_KEY, String(Date.now())); }); },
  savedAt() { return Number(store((l) => l.getItem(AT_KEY))) || 0; },
  // 달이 넘어갈 때 자동 칸에 저장한다. 계정 저장은 뒤에서 끝나고, 실패하면 한 번만 알린다.
  autosave() {
    if (!ctx.s) return;
    writeSlot('auto', ctx.s).then((r) => { if (!r.account && !r.device && !autoWarned) { autoWarned = true; ctx.toast('자동 저장을 하지 못했습니다.'); } }).catch(() => {});
  },
  load() { const t = store((l) => l.getItem(KEY)); if (t) try { ctx.s = deserialize(t); } catch { ctx.s = null; } return ctx.s; },
  hadOldSave() { return !!store((l) => l.getItem(OLD_KEY)); },
  // 처음부터 시작: 지금 게임과 자동 칸을 지운다. 직접 저장한 칸은 남긴다.
  wipe() { store((l) => { l.removeItem(KEY); l.removeItem(AT_KEY); }); ctx.s = null; return deleteSlot('auto'); },
};
