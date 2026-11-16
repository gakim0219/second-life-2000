import { loadFriends } from './friends.js';
import { loadProfiles } from './profiles.js';
import { ctx } from './shell.js';
import * as saves from './saves.js';
import { deserialize } from './state.js';
import { h, loadArt, preloadArt } from './ui.js';
import { loadEvents } from './events.js';
import { updateChrome } from './screens/chrome.js';
import './screens/common.js'; // 장소 키 표를 ui.js에 넣는다
import * as invest from './invest.js'; import * as company from './company.js'; import * as love from './love.js'; import * as network from './network.js'; import * as review from './review.js';
import { onMonth } from './core.js';
import * as sound from './sound.js'; import { moodOf } from './sound_rules.js'; import { stageOf } from './rules.js';
import schoolEvents from '../data/events_school.js'; import univEvents from '../data/events_univ.js'; import beyondEvents from '../data/events_beyond.js';
import youthEvents, { onReunion, setAdultCheck } from '../data/events_youth.js'; import teaEvents from '../data/events_teahouse.js'; import islandEvents, { HAYEON, onMonth as islandMonth } from '../data/events_island.js'; import chairEvents from '../data/events_chair.js'; import { TEEN_ADULTS, TEEN_NAMES, TEEN_FRIENDS } from '../data/teens.js';
import familyEvents from '../data/events_family.js'; import bondEvents from '../data/events_bonds.js';
import * as crush from './crush.js'; import * as disclose from './disclose.js'; import discloseEvents from '../data/events_disclose.js'; import { allowTextOnly } from './cast.js';
const SCREENS = { crush: 'love', start: 'start', home: 'home', scene: 'scene', stat: 'stat', paper: 'paper', yearend: 'paper', ending: 'ending', invest: 'invest', asset: 'invest', account: 'invest', map: 'map', place: 'map', person: 'people', people: 'people', album: 'people', company: 'company', love: 'love', family: 'love', settings: 'home', tax: 'tax', movehome: 'parents', messenger: 'messenger' };
for (const [n, f] of Object.entries(SCREENS)) ctx.register(n, () => import(`./screens/${f}.js`).then((m) => ({ css: `src/screens/${f}.css`, render: m.screens?.[n] ?? m.render })));
// 화면을 그릴 때마다 분위기를 맞춘다. 같은 분위기면 음악은 끊기지 않는다.
ctx.afterDraw = (c) => { updateChrome(c); sound.music(moodOf(c.cur?.name, c.s ? stageOf(c.s) : null)); };
// 첫 누름에서 소리를 켜고, 버튼마다 짧은 소리. 버튼 처리 뒤에 온다(sound.js가 겹침을 거른다).
// 아이폰 사파리는 touchend와 click 안에서만 소리를 풀어 준다. 여러 신호에 모두 건다.
for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) document.addEventListener(ev, () => sound.unlock(), { capture: true, passive: true });
document.addEventListener('click', (e) => { if (e.target.closest?.('button, [role=button], .btn')) sound.sfx('tap'); });
async function boot() {
  const app = document.getElementById('app'); app.textContent = '불러오는 중입니다.';
  loadEvents([...schoolEvents, ...univEvents, ...beyondEvents, ...youthEvents, ...teaEvents, ...islandEvents, ...chairEvents, ...discloseEvents, ...familyEvents, ...bondEvents]);
  allowTextOnly(Object.keys(TEEN_NAMES)); onReunion(love.reunite); setAdultCheck(love.canReunite);
  await loadArt();
  const j = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(p); return r.json(); });
  const files = ['kospi', 'kosdaq', 'global', 'etf', 'coins', 'fx', 'land', 're_kr', 're_world', 'macro', 'rates'];
  const m = Object.fromEntries(await Promise.all(files.map(async (f) => [f, await j(`data/market/${f}.json`)])));
  invest.loadMarket(m); company.loadHires(await j('data/hires.json')); company.loadRates(m.rates); love.loadDates([...(await j('data/dates.json')), ...(await j('data/dates_more.json')), ...TEEN_ADULTS, HAYEON]);
  const people = await j('data/people.json'); people.school = { ...people.school, ...TEEN_NAMES }; network.loadPeople(people); crush.setNames(people.school); loadFriends({ ...(await j('data/friends.json')), ...TEEN_FRIENDS }); loadProfiles(await j('data/profiles.json'));
  company.configure({ index: (year, month) => invest.indices({ year, month })?.코스피 ?? null });
  review.install(); onMonth(islandMonth); onMonth(love.onMonth); onMonth(crush.onMonth); company.install(); disclose.install();
  saves.connect();
  ctx.load();
  // 계정의 자동 저장이 기기 저장보다 최근이면 그것으로 시작한다. 업데이트로 기기 저장이 사라져도 여기서 이어진다.
  const useAuto = (row) => { ctx.s = deserialize(row.body); ctx.save(); };
  const newer = (row) => row && row.meta.at > ctx.savedAt();
  const autoRow = saves.readSlot('auto');
  const first = await Promise.race([autoRow, new Promise((r) => setTimeout(() => r(undefined), ctx.s ? 2000 : 8000))]);
  if (newer(first)) { try { useAuto(first); } catch (e) { console.warn(e); } }
  await ctx.go(ctx.s ? 'home' : 'start', { form: ctx.hadOldSave() }, { replace: true });
  // 늦게 도착했으면 바꿔치지 않고 묻는다.
  if (first === undefined) autoRow.then((row) => {
    if (!newer(row)) return;
    ctx.sheet((close) => h('div', { className: 'stack' }, h('h2', { text: '더 최근 저장이 있습니다' }), h('p', { className: 'sub', text: saves.metaText(row.meta) }),
      h('button', { className: 'btn', text: '지금 게임 계속', on: { click: close } }),
      h('button', { className: 'btn main', text: '불러오기', on: { click: () => { close(); try { useAuto(row); ctx.stack.length = 0; ctx.go('home', {}, { replace: true }); } catch { ctx.toast('이 저장은 읽을 수 없습니다.'); } } } })));
  });
  setTimeout(preloadArt, 400); // 게시본의 그림 묶음은 시작 뒤에 받는다
}
// 저장 때문에 첫 화면을 못 그려도 갇히지 않게 한다. 지우기는 두 번 눌러야 한다.
function bootFailed(e) {
  console.error(e);
  const app = document.getElementById('app'); app.textContent = '';
  const p = document.createElement('p'); p.textContent = `불러오지 못했습니다: ${e.message}`;
  const again = document.createElement('button'); again.className = 'btn main'; again.textContent = '새로고침'; again.onclick = () => location.reload();
  app.append(p, again);
  if (!ctx.s) return;
  const wipe = document.createElement('button'); wipe.className = 'btn'; wipe.textContent = '저장을 지우고 처음부터';
  wipe.onclick = () => { if (wipe.dataset.sure) { ctx.wipe(); location.reload(); } else { wipe.dataset.sure = '1'; wipe.textContent = '정말 지웁니다. 한 번 더 누르세요'; } };
  app.append(wipe);
}
boot().catch(bootFailed);
