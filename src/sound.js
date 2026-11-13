// 배경음악과 효과음. 소리 파일 없이 Web Audio로 합성한다. 판단은 sound_rules.js.
// 바깥에 내는 것: unlock, music, sfx, prefs, setPrefs. 소리 장치가 없는 곳(node 등)에서는 아무것도 하지 않는다.
import { MOODS, loadPrefs, savePrefs, nextNote } from './sound_rules.js';

const KEY = 'second-life-2000:sound';
const store = globalThis.localStorage;
let P = loadPrefs(() => store.getItem(KEY));
let ac = null, master, musicBus, sfxBus, wet;
let want = null, playing = null; // 원하는 분위기, 지금 흐르는 분위기
let timer = null, nextAt = 0, step = 0, bar = 0, prevNote = null;
const lastSfx = new Map();

const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function build() {
  if (ac || !AC) return !!ac;
  try { ac = new AC(); } catch { ac = null; return false; }
  // 휴대폰 스피커에서도 들리게 크게 키우고, 압축기로 찢어지지 않게 누른다.
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2; comp.connect(ac.destination);
  master = ac.createGain(); master.gain.value = 2.2; master.connect(comp);
  musicBus = ac.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
  sfxBus = ac.createGain(); sfxBus.gain.value = P.sfxVol; sfxBus.connect(master);
  // 음악에만 거는 짧은 울림(지연 되먹임). 소리를 부드럽게 뭉갠다.
  const d = ac.createDelay(1); d.delayTime.value = 0.23;
  const fb = ac.createGain(); fb.gain.value = 0.32;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  wet = ac.createGain(); wet.gain.value = 0.28;
  wet.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(musicBus);
  ac.onstatechange = () => { if (ac?.state === 'running' && want && P.music && !playing) startMusic(); };
  return true;
}
// 소리 장치가 닫혔으면(사파리가 오래 쉬게 한 경우) 버리고 새로 만든다.
function revive() { if (ac && ac.state === 'closed') { clearInterval(timer); timer = null; playing = null; level = 0; ac = null; } }

// 아이폰 사파리: 무음 스위치가 켜져 있으면 Web Audio가 조용해진다. 재생용 오디오 세션으로 바꿔 음악 앱처럼 들리게 한다.
// audioSession이 없는 옛 버전은 소리 없는 <audio>를 한 번 틀어 같은 효과를 낸다.
let sessionSet = false;
function silentWav() {
  const n = 800, b = new ArrayBuffer(44 + n), v = new DataView(b), w = (o, s) => [...s].forEach((c, k) => v.setUint8(o + k, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  for (let k = 0; k < n; k++) v.setUint8(44 + k, 128);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}
let silentEl = null;
function playbackSession() {
  if (sessionSet) return; sessionSet = true;
  try { if (navigator.audioSession) { navigator.audioSession.type = 'playback'; return; } } catch { /* 지원 안 함 */ }
  try {
    if (!silentEl) { silentEl = new Audio(silentWav()); silentEl.setAttribute('playsinline', ''); silentEl.loop = true; silentEl.volume = 0.01; }
    silentEl.play().catch(() => { sessionSet = false; });
  } catch { sessionSet = false; }
}
// 누를 때마다 부른다(첫 누름에 켜고, 사파리가 멈춘 컨텍스트도 다시 깨운다). 반드시 누름 처리 안에서 불러야 한다.
export function unlock() {
  if (!AC) return;
  if (P.music || P.sfx) playbackSession();
  revive();
  if (!build()) return;
  if (ac.state !== 'running') {
    // 사파리는 누름 안에서 소리를 한 번 내야 풀린다. 아주 짧은 무음 버퍼를 튼다.
    try { const s = ac.createBufferSource(); s.buffer = ac.createBuffer(1, 1, 22050); s.connect(ac.destination); s.start(0); } catch { /* 무시 */ }
    ac.resume?.().then(() => { if (want && P.music) { if (!playing) startMusic(); else nextAt = ac.currentTime + 0.05; } }).catch(() => {});
  }
  if (want && !playing) startMusic();
}

// ---------- 악기 ----------
function env(g, t, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}
function osc(type, f, t, end, dest, detune = 0) {
  const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
  o.connect(dest); o.start(t); o.stop(end + 0.05); return o;
}
// 음량 마디 하나(필요하면 저역 필터를 거쳐) dest로 보낸다.
function voice(dest, vel, filter) {
  const g = ac.createGain();
  if (filter) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; g.connect(f); f.connect(dest); }
  else g.connect(dest);
  return { g };
}
const INST = {
  musicbox(t, f, dur, vel, dest) { const { g } = voice(dest, vel, 5000); env(g, t, 0.005, 0.22 * vel, 1.3); osc('sine', f, t, t + 1.4, g); osc('sine', f * 4, t, t + 0.4, g).frequency.value = f * 4.01; },
  pluck(t, f, dur, vel, dest) { const { g } = voice(dest, vel, 2400); env(g, t, 0.006, 0.18 * vel, 0.45); osc('triangle', f, t, t + 0.5, g); },
  epiano(t, f, dur, vel, dest) { const { g } = voice(dest, vel, 3000); env(g, t, 0.01, 0.2 * vel, 1.6); osc('sine', f, t, t + 1.7, g); osc('sine', f * 2, t, t + 0.6, g, 4); },
  pad(kind, t, f, dur, vel, dest) {
    const cut = kind === 'dark' ? 1100 : kind === 'airy' ? 2600 : 1800, type = kind === 'airy' ? 'triangle' : 'sawtooth';
    const { g } = voice(dest, vel, cut); const peak = (kind === 'airy' ? 0.07 : 0.045) * vel;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.35); g.gain.setValueAtTime(peak, t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.05);
    osc(type, f, t, t + dur * 1.05, g, -7); osc(type, f, t, t + dur * 1.05, g, 7);
  },
  bass(kind, t, f, dur, vel, dest) {
    const type = kind === 'pulse' ? 'square' : kind === 'round' ? 'triangle' : 'sine';
    const { g } = voice(dest, vel, kind === 'pulse' ? 900 : 1400); env(g, t, 0.01, (kind === 'pulse' ? 0.09 : 0.18) * vel, Math.min(dur, 0.9));
    osc(type, f, t, t + dur, g); osc('sine', f * 2, t, t + dur, g); osc('sine', f * 3, t, t + dur * 0.6, g);
  },
};

// ---------- 음악 스케줄러 ----------
function scheduleStep(t) {
  const m = MOODS[playing]; if (!m) return;
  const eighth = 30 / m.bpm, barLen = eighth * 8, chord = m.chords[bar % m.chords.length], v = m.vol;
  if (step === 0) {
    if (m.pad) for (const c of chord) INST.pad(m.pad, t, hz(m.root - 12 + c), barLen, v, wet);
    if (m.pad) for (const c of chord) INST.pad(m.pad, t, hz(m.root - 12 + c), barLen, v * 0.6, musicBus);
  }
  if (m.bass && (step === 0 || step === 4 || (m.bass === 'pulse' && step % 2 === 0))) INST.bass(m.bass, t, hz(m.root - 24 + chord[0]), eighth * (m.bass === 'pulse' ? 1.6 : 3.5), v, musicBus);
  const a = m.arp[step], arpInst = INST[m.lead ?? 'epiano'];
  if (a >= 0) { const f = hz(m.root + chord[a % chord.length]); arpInst(t, f, eighth, v * 0.55, musicBus); arpInst(t, f, eighth, v * 0.25, wet); }
  if (m.lead && step % 2 === 0 && Math.random() < m.melody) {
    prevNote = nextNote(playing, chord, prevNote, Math.random());
    INST[m.lead](t, hz(m.root + 12 + prevNote), eighth * 2, v * 0.8, musicBus); INST[m.lead](t, hz(m.root + 12 + prevNote), eighth * 2, v * 0.4, wet);
  }
  step = (step + 1) % 8; if (step === 0) bar++;
  nextAt = t + eighth;
}
let lastErr = null;
function tick() {
  if (!ac || !playing) return;
  if (ac.state !== 'running') return; // 멈춘 동안 쌓지 않는다. 다음 누름(unlock)이나 화면 복귀에서 깨운다.
  if (nextAt < ac.currentTime) nextAt = ac.currentTime + 0.05;
  let guard = 0;
  while (nextAt < ac.currentTime + 0.15 && guard++ < 16) {
    try { scheduleStep(nextAt); } catch (e) { lastErr = String(e?.message ?? e); step = (step + 1) % 8; nextAt += 0.1; }
  }
}
let level = 0;
function fadeTo(v, sec) { const t = ac.currentTime, g = musicBus.gain; g.cancelScheduledValues(t); g.setValueAtTime(level, t); g.linearRampToValueAtTime(v, t + sec); level = v; }
let swapTimer = null;
function startMusic() {
  if (!ac || !P.music || !want || ac.state === 'closed') return;
  clearTimeout(swapTimer);
  const begin = () => { playing = want; step = 0; bar = 0; prevNote = null; nextAt = ac.currentTime + 0.05; if (!timer) timer = setInterval(tick, 30); fadeTo(P.musicVol * 0.8, 1.2); };
  if (playing && playing !== want) { fadeTo(0, 0.7); swapTimer = setTimeout(begin, 750); } else if (!playing) begin();
}
function stopMusic() { if (!ac) return; clearTimeout(swapTimer); fadeTo(0, 0.5); playing = null; setTimeout(() => { if (!playing) { clearInterval(timer); timer = null; } }, 600); }

// 분위기를 정한다. 같은 분위기면 그대로 흐른다.
export function music(mood) {
  if (!MOODS[mood]) return;
  want = mood;
  if (!ac || !P.music) return;
  if (playing !== want) startMusic();
}

// ---------- 효과음 ----------
function blip(t, type, f0, f1, dur, peak, filter) {
  const { g } = voice(sfxBus, 1, filter);
  env(g, t, 0.004, peak, dur);
  const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  o.connect(g); o.start(t); o.stop(t + dur + 0.05);
}
const SFX = {
  tap: (t) => blip(t, 'sine', 900, 700, 0.05, 0.12),
  open: (t) => blip(t, 'triangle', 320, 640, 0.14, 0.08, 2000),
  close: (t) => blip(t, 'triangle', 560, 300, 0.12, 0.07, 2000),
  good: (t) => { [72, 76, 79, 84].forEach((n, k) => blip(t + k * 0.07, 'triangle', hz(n), hz(n), 0.35, 0.13)); },
  bad: (t) => { blip(t, 'sine', 240, 150, 0.4, 0.2); blip(t + 0.12, 'sine', 200, 120, 0.45, 0.14); },
  month: (t) => { for (const [r, p, d] of [[1, 0.16, 2], [2.76, 0.06, 1.2], [5.4, 0.03, 0.7]]) blip(t, 'sine', 660 * r, 660 * r, d, p); },
  coin: (t) => { blip(t, 'square', 988, 988, 0.08, 0.05, 3500); blip(t + 0.08, 'square', 1319, 1319, 0.3, 0.05, 3500); },
};
const LOUD = ['good', 'bad', 'open', 'close', 'month', 'coin'];
export function sfx(name) {
  if (!ac || !P.sfx || !SFX[name] || ac.state !== 'running') return;
  const now = performance.now();
  if (now - (lastSfx.get(name) ?? -1e9) < 80) return;
  // 문서 클릭(tap)은 버튼 처리 뒤에 온다. 방금 다른 소리가 났으면 tap은 생략한다.
  if (name === 'tap' && LOUD.some((n) => now - (lastSfx.get(n) ?? -1e9) < 120)) return;
  lastSfx.set(name, now);
  try { SFX[name](ac.currentTime + 0.01); } catch { /* 소리 실패는 게임을 멈추지 않는다 */ }
}

// ---------- 설정 ----------
export const prefs = () => ({ ...P });
// 지금 원하는 분위기와 흐르는 분위기(점검용).
export const current = () => ({ want, playing, level, state: ac?.state ?? null, error: lastErr });
export function setPrefs(p) {
  const was = P; P = loadPrefs(() => JSON.stringify({ ...P, ...p }));
  savePrefs((v) => store.setItem(KEY, v), P);
  if (!ac) return;
  sfxBus.gain.setTargetAtTime(P.sfxVol, ac.currentTime, 0.05);
  if (!P.music) stopMusic();
  else if (!was.music || !playing) startMusic();
  else fadeTo(P.musicVol * 0.8, 0.2);
}

// 화면이 숨으면 멈추고 돌아오면 다시 켠다.
globalThis.document?.addEventListener?.('visibilitychange', () => {
  if (!ac) return;
  if (document.hidden) ac.suspend?.().catch(() => {}); else { sessionSet = false; ac.resume?.().catch(() => {}); }
});
