// 소리 판단(순수 함수). 소리를 내는 쪽은 src/sound.js. 설계: docs/2026-11-09_소리_설계.md

const SPECIAL = {
  love: 'love', family: 'love', crush: 'love',
  invest: 'tense', asset: 'tense', account: 'tense', company: 'tense', tax: 'tense',
  scene: 'story', ending: 'ending', start: 'title',
};
const BY_STAGE = { 초등: 'child', 중학: 'child', 고등: 'youth', 대학: 'youth', 사회인: 'adult' };
// 화면 이름과 인생 시기(stageOf)로 분위기 키를 고른다. 상태가 없으면(시작 전) title.
export function moodOf(screen, stage) {
  if (SPECIAL[screen]) return SPECIAL[screen];
  return BY_STAGE[stage] ?? 'title';
}

const GOOD = /(합격|당선|성공|우승|입상|수상|축하|승진|고백.*받|사귀|결혼)/;
const BAD = /(떨어졌|불합격|낙선|실패|탈락|잃었|손해|헤어)/;
// 알림 글에서 좋은 소식(good), 나쁜 소식(bad), 그 밖(null)을 가른다.
export function toneOf(text) {
  if (!text) return null;
  const t = String(text);
  const ups = (t.match(/(지능|체력|매력|인맥) \+\d/g) ?? []).length, downs = (t.match(/(지능|체력|매력|인맥) -\d/g) ?? []).length;
  if (ups || downs) return ups >= downs ? 'good' : 'bad';
  if (BAD.test(t)) return 'bad';
  if (GOOD.test(t)) return 'good';
  return null;
}

export const DEFAULT_PREFS = Object.freeze({ music: true, sfx: true, musicVol: 0.35, sfxVol: 0.5 });
const clamp01 = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
const clean = (o) => ({
  music: typeof o?.music === 'boolean' ? o.music : DEFAULT_PREFS.music,
  sfx: typeof o?.sfx === 'boolean' ? o.sfx : DEFAULT_PREFS.sfx,
  musicVol: clamp01(o?.musicVol, DEFAULT_PREFS.musicVol),
  sfxVol: clamp01(o?.sfxVol, DEFAULT_PREFS.sfxVol),
});
export function loadPrefs(get) {
  try { const t = get(); return t ? clean(JSON.parse(t)) : { ...DEFAULT_PREFS }; } catch { return { ...DEFAULT_PREFS }; }
}
export function savePrefs(set, prefs) { try { set(JSON.stringify(clean(prefs))); } catch { /* 저장이 막힌 곳 */ } }

// 곡 규칙. root는 MIDI 음 번호(휴대폰 스피커는 300Hz 아래를 거의 못 내서 반주도 G4(67) 근처 위로 둔다), scale과 chords는 root에서의 반음 거리.
// lead/pad/bass는 sound.js의 악기 이름. arp는 마디 안 8분음표 자리마다 화음의 몇 번째 음을 칠지(-1은 쉼).
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], PENTA = [0, 2, 4, 7, 9];
const I = [0, 4, 7], IV = [5, 9, 12], V = [7, 11, 14], vi = [9, 12, 16], ii = [2, 5, 9], iii = [4, 7, 11];
const i = [0, 3, 7], iv = [5, 8, 12], VI = [8, 12, 15], VII = [10, 14, 17], III = [3, 7, 10];
export const MOODS = {
  child: { bpm: 84, root: 72, scale: PENTA, chords: [I, IV, I, V, vi, IV, V, I], lead: 'musicbox', pad: null, bass: 'soft', arp: [0, 1, 2, 1, 0, 1, 2, 1], melody: 0.55, vol: 0.8 },
  youth: { bpm: 104, root: 69, scale: MAJ, chords: [I, V, vi, IV], lead: 'pluck', pad: 'warm', bass: 'soft', arp: [0, 2, 1, 2, 0, 2, 1, 2], melody: 0.5, vol: 0.75 },
  adult: { bpm: 76, root: 67, scale: MAJ, chords: [ii, V, I, vi, ii, V, iii, vi], lead: 'epiano', pad: 'warm', bass: 'round', arp: [0, -1, 1, 2, -1, 1, 0, -1], melody: 0.4, vol: 0.75 },
  love: { bpm: 66, root: 69, scale: MAJ, chords: [IV, V, iii, vi, ii, V, I, I], lead: 'epiano', pad: 'airy', bass: 'round', arp: [0, -1, 2, -1, 1, -1, 2, -1], melody: 0.45, vol: 0.7 },
  tense: { bpm: 92, root: 69, scale: MIN, chords: [i, VI, III, VII], lead: 'pluck', pad: 'dark', bass: 'pulse', arp: [0, -1, 0, 1, -1, 0, 2, -1], melody: 0.35, vol: 0.75 },
  story: { bpm: 64, root: 67, scale: PENTA, chords: [I, vi, IV, V], lead: 'musicbox', pad: 'airy', bass: null, arp: [0, -1, 1, -1, 2, -1, 1, -1], melody: 0.3, vol: 0.65 },
  ending: { bpm: 58, root: 67, scale: MAJ, chords: [IV, I, V, vi, IV, I, V, I], lead: 'epiano', pad: 'warm', bass: 'round', arp: [0, 1, 2, 1, 2, 1, 0, -1], melody: 0.5, vol: 0.75 },
  title: { bpm: 80, root: 64, scale: MAJ, chords: [I, iii, IV, V], lead: 'musicbox', pad: 'airy', bass: null, arp: [0, -1, 1, -1, 2, -1, 1, -1], melody: 0.35, vol: 0.6 },
};
// 다음 멜로디 음 고르기. 지난 음 가까이, 화음 음을 더 자주. rnd는 0~1 난수.
export function nextNote(mood, chord, prev, rnd) {
  const m = MOODS[mood]; const pool = [];
  for (let o = 0; o <= 12; o += 12) for (const s of m.scale) pool.push(s + o);
  const weight = (n) => { const near = prev == null ? 1 : 1 / (1 + Math.abs(n - prev) / 3); return near * (chord.some((c) => (c - n) % 12 === 0) ? 3 : 1); };
  const ws = pool.map(weight), sum = ws.reduce((a, b) => a + b, 0);
  let r = rnd * sum;
  for (let k = 0; k < pool.length; k++) { r -= ws[k]; if (r <= 0) return pool[k]; }
  return pool[pool.length - 1];
}
