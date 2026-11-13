import { setCastPhotos, photoFits } from './cast.js';
import { krNum } from './num.js';
export const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
    else if (v === false || v == null) continue;
    else if (k === 'text') e.textContent = v;
    else if (k in e && k !== 'list') e[k] = v;
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c);
  return e;
};
export const won = (n) => {
  // 사용자 지시 2026-11-06·11-08: 줄이지 않고 1원 단위까지, 경·조·억·만을 붙여 보인다.
  return `${krNum(n)}원`;
};
export const pips = (n, max = 5) => h('span', { className: 'pips', 'aria-label': `${n}구간` }, Array.from({ length: max }, (_, j) => j + 1).map((i) => h('i', { className: `${i <= n ? 'on' : ''}${i > 5 ? ' x' : ''}`.trim() })));

// ---------- 그림 ----------
// data/art_manifest.json이 있는 파일 목록이다. scripts/build_art.py가 만든다. 파일을 넣고 스크립트만 돌리면 화면이 쓴다.
// 게시본은 packs에 base64 묶음 파일이 적혀 있고, 시작 뒤 천천히 받아 쓴다.
let ART = { me: [], bg: [], photos: {}, scene: {}, packs: null };
let index = new Map(); // id -> {group, names}
const packData = {}, packLoads = {};
export function setArt(m) {
  ART = { me: m?.me ?? [], bg: m?.bg ?? [], photos: m?.photos ?? {}, scene: m?.scene ?? {}, packs: m?.packs ?? null };
  setCastPhotos(ART.photos);
  index = new Map(Object.entries(ART.photos).flatMap(([group, ids]) => Object.entries(ids).map(([id, names]) => [id, { group, names }])));
  return ART;
}
export async function loadArt() {
  try { const r = await fetch('data/art_manifest.json'); if (r.ok) setArt(await r.json()); } catch { /* 그림 없이도 돈다 */ }
  return ART;
}
const packOf = (path) => (path.startsWith('photos/') ? path.split('/')[1] : 'art');
function loadPack(group) {
  const files = ART.packs?.[group]; if (!files?.length) return Promise.resolve();
  return (packLoads[group] ??= Promise.all(files.map((f) => fetch(f).then((r) => r.json()))).then((list) => { for (const d of list) Object.assign(packData, d); }).catch(() => { delete packLoads[group]; }));
}
// 게시본 지연 로드. 배경·주인공 묶음부터 차례로 받는다.
export async function preloadArt() { if (!ART.packs) return; for (const g of Object.keys(ART.packs)) await loadPack(g); }
const pathUrl = (path) => (ART.packs ? (packData[path] ? `data:image/webp;base64,${packData[path]}` : null) : `images/${path}.webp`);
// 주소가 바로 있으면 바로, 묶음을 받아야 하면 받은 뒤에 fn을 부른다.
function withUrl(path, fn) {
  const u = pathUrl(path); if (u) { fn(u); return; }
  if (ART.packs) loadPack(packOf(path)).then(() => { const v = pathUrl(path); if (v) fn(v); });
}
// 화면이 부르는 장소 키를 실제 파일 이름 후보로 바꾸는 표. src/screens/common.js가 넣는다.
let bgTable = (key) => [key];
export const setBgTable = (fn) => { bgTable = fn; };
const firstBg = (key) => (Array.isArray(key) ? key : bgTable(key)).find((k) => ART.bg.includes(k)) ?? null;
export const hasBg = (key) => !!firstBg(key);
export const hasMe = (key) => ART.me.includes(key);
// 인물 폴더의 장면 그림(예: 호텔). 사람 사진이 아니라 배경으로만 쓴다. 없으면 null.
export const sceneKey = (id, name) => ART.scene?.[id]?.[name] ?? null;
// over: 위에 겹칠 그림 이름(예: '불'). 둘 다 받은 뒤에 한 번에 그린다.
export function sceneInto(el, id, name, fallback = 'linear-gradient(160deg,#1a1f2c,#0b0d13)', over = null) {
  el.style.backgroundImage = fallback;
  const k = sceneKey(id, name), o = over ? sceneKey(id, over) : null; if (!k) return false;
  const got = {}, paint = () => { if (!got.base || (o && !got.over)) return; el.style.backgroundImage = [got.over, got.base].filter(Boolean).map((u) => `url("${u}")`).concat(fallback).join(', '); };
  withUrl(`scene/${k}`, (u) => { got.base = u; paint(); });
  if (o) withUrl(`scene/${o}`, (u) => { got.over = u; paint(); });
  return true;
}
export const meKeys = () => ART.me;
// 주인공 말고 art/me에 있는 사람(아버지, 어머니, 할머니). 이름 뒤에 시기가 붙어 있으면 지금 시기에 가까운 것을 고른다.
export function kinPhoto(name, stage) {
  const list = ART.me.filter((k) => k === name || k.startsWith(`${name}_`));
  if (!list.length) return null;
  const at = STAGES.indexOf(stage);
  const rank = (k) => { const i = STAGES.indexOf(k.split('_')[1]); return i < 0 ? 20 : i <= at ? at - i : 10 + i; };
  return imgFrom(`me/${[...list].sort((a, b) => rank(a) - rank(b))[0]}`);
}
export const hasPhoto = (id) => !!index.get(id)?.names.some((n) => !n.includes('전신'));
// el의 배경을 그림으로. 그림이 없거나 아직 안 왔으면 fallback이 그대로 보인다.
export function bgInto(el, key, fallback = 'linear-gradient(150deg,#344055,#1c2432 56%,#2e2a22)') {
  el.style.backgroundImage = fallback;
  const hit = firstBg(key);
  if (hit) withUrl(`bg/${hit}`, (u) => { el.style.backgroundImage = `url("${u}"), ${fallback}`; });
  return el;
}
const STAGES = ['초등', '중학', '고등', '대학', '사회인'];
// 지금 시기에 가장 가까운 사진. 지난 시기 사진을 먼저, 없으면 뒤 시기. 대표·처음·2026은 시기를 모르는 사진이다.
function rankPhoto(name, stage) {
  const head = name.split('_')[0], k = STAGES.indexOf(head), at = STAGES.indexOf(stage);
  if (k >= 0) return k <= at ? at - k : 10 + k;
  return head === '대표' ? 20 : head === '처음' ? 21 : 22;
}
function pickPhoto(id, stage, full) {
  const e = index.get(id); if (!e) return null;
  const list = e.names.filter((n) => n.includes('전신') === full && photoFits(id, n, stage));
  const name = [...list].sort((a, b) => rankPhoto(a, stage) - rankPhoto(b, stage))[0];
  return name ? `photos/${e.group}/${id}/${name}` : null;
}
function imgFrom(path) {
  const img = h('img', { alt: '', loading: 'lazy' });
  img.onerror = () => img.remove();
  if (pathUrl(path)) img.src = pathUrl(path);
  else { img.hidden = true; withUrl(path, (u) => { img.src = u; img.hidden = false; }); }
  return img;
}
export function photo(who, stage, sex) {
  if (who === 'me') { const key = `${sex}_${stage}`; return hasMe(key) ? imgFrom(`me/${key}`) : null; }
  if (!who) return null;
  const path = pickPhoto(who, stage, false);
  return path ? imgFrom(path) : null;
}
// 전신 사진. 없으면 null. 초·중 시절은 어깨 위 사진만 있다(사용자 가이드: 고등학교부터 상반신과 전신).
export function fullPhoto(who, stage) {
  const e = index.get(who); if (!e) return null;
  const list = e.names.filter((n) => n.includes('전신') && !['초등', '중학'].includes(n.split('_')[0]) && photoFits(who, n, stage));
  const name = [...list].sort((a, b) => rankPhoto(a, stage) - rankPhoto(b, stage))[0];
  return name ? imgFrom(`photos/${e.group}/${who}/${name}`) : null;
}
