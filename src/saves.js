// 저장 칸: 자동 1칸과 직접 저장 3칸. 계정 저장소(게시본의 db)에 두어 게임을 고쳐 올려도 남고, 이 기기에도 함께 둔다.
// 칸마다 더 최근에 저장된 쪽을 읽는다. 로컬 개발이나 계정 저장소를 못 쓰는 화면에서는 기기 저장만 쓴다.
import { serialize, deserialize } from './state.js';
import { stageOf } from './rules.js';

export const SLOTS = [['auto', '자동 저장'], ['s1', '저장 1'], ['s2', '저장 2'], ['s3', '저장 3']];
const localKey = (slot) => `second-life-2000-slot-${slot}`;
const docId = (slot) => `save_${slot}`;
const WAIT = 10000;

let cloud = Promise.resolve(null);
let storage = () => globalThis.localStorage;
const local = (fn) => { try { return fn(storage()); } catch { return null; } };
const inTime = (p, ms, fallback = null) => Promise.race([p, new Promise((r) => setTimeout(() => r(fallback), ms))]);

// 내 칸이 들어 있는 모음을 찾는다. 못 쓰면 null.
export function connect(claude = globalThis.claude) {
  cloud = (async () => {
    if (!claude?.use) return null;
    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    const id = await user?.id?.();
    return db && id ? db.collection(`data/users/${id}`) : null;
  })().catch(() => null);
  return cloud;
}
export const cloudReady = () => inTime(cloud, WAIT).then((c) => !!c);
// 테스트용: 기기 저장소를 바꿔 끼운다.
export function useStorage(get) { storage = get; }

export const metaOf = (s, at = Date.now()) => ({ at, name: s.name, year: s.year, month: s.month, stage: stageOf(s) });

// 칸마다 한 번에 하나만 쓴다. 쓰는 중에 새 값이 오면 마지막 값만 남긴다.
const writing = new Map();
function pushCloud(slot, row) {
  const w = writing.get(slot);
  if (w) { w.next = row; return w.done; }
  const state = { next: row };
  state.done = (async () => {
    try {
      const col = await inTime(cloud, WAIT);
      if (!col) return false;
      while (state.next) { const r = state.next; state.next = null; await col.doc(docId(slot)).set(r); }
      return true;
    } catch (e) { console.warn('계정 저장 실패', e); return false; }
    finally { writing.delete(slot); }
  })();
  writing.set(slot, state);
  return state.done;
}
// 기기에는 바로 쓰고 계정 저장은 기다릴 수 있게 돌려준다. { device, account }
export function writeSlot(slot, s, at = Date.now()) {
  const row = { meta: metaOf(s, at), body: serialize(s) };
  const device = local((l) => { l.setItem(localKey(slot), JSON.stringify(row)); return true; }) === true;
  return pushCloud(slot, row).then((account) => ({ device, account }));
}
const readDevice = (slot) => local((l) => { const t = l.getItem(localKey(slot)); return t ? JSON.parse(t) : null; });
async function readAccount(slot) {
  try {
    const col = await inTime(cloud, WAIT);
    if (!col) return null;
    const snap = await inTime(col.doc(docId(slot)).get(), WAIT);
    return snap?.exists ? snap.data() : null;
  } catch { return null; }
}
const usable = (r) => (r?.body && Number.isFinite(r.meta?.at) ? r : null);
// 더 최근 것을 고른다. 없으면 null.
export async function readSlot(slot) {
  const d = usable(readDevice(slot)), a = usable(await readAccount(slot));
  if (!d && !a) return null;
  const row = !a || (d && d.meta.at > a.meta.at) ? d : a;
  return { slot, meta: row.meta, body: row.body, inAccount: !!a && a.meta.at >= row.meta.at };
}
export const readAll = () => Promise.all(SLOTS.map(([slot]) => readSlot(slot)));
export const open = (row) => deserialize(row.body);
export async function deleteSlot(slot) {
  local((l) => l.removeItem(localKey(slot)));
  try { const col = await inTime(cloud, WAIT); await col?.doc(docId(slot)).delete(); } catch (e) { console.warn('계정 저장 삭제 실패', e); }
}
export const metaText = (m) => `${m.name} · ${m.year}년 ${m.month}월 · ${m.stage}`;
export const whenText = (m) => { const d = new Date(m.at); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}에 저장`; };
