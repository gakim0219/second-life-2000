// 사진 있는 인물만 등장한다. 그림 목록(art_manifest)과 학교 인물 이름표로 판단한다.
// 목록을 받기 전(테스트, 그림을 못 받았을 때)에는 아무도 가리지 않는다.
const STAGES = ['초등', '중학', '고등', '대학', '사회인'];
let PHOTOS = null;
let ROSTER = [];
const cache = new WeakMap();
export function setCastPhotos(photos) {
  PHOTOS = new Map(Object.values(photos ?? {}).flatMap((ids) => Object.entries(ids)));
}
export function setRoster(school) {
  ROSTER = Object.entries(school ?? {}).map(([id, name]) => ({ id, name: name.replace(/ 선생님$/, '') }));
}
export const resetCast = () => { PHOTOS = null; ROSTER = []; };
// 학생 때 사진이 없는 인물(새로 만든 학창 시절 인물). 학생 시기에는 사진 없이 이니셜로만 나온다.
const TEXT_ONLY = new Set();
export const allowTextOnly = (ids) => { for (const id of ids) TEXT_ONLY.add(id); };
// 학생 인물은 학창 시절에 그 시기까지의 사진이 있어야 나온다. 어른(선생님 등)과 대학 이후는 사진이 하나라도 있으면 된다.
export function canAppear(id, stage) {
  if (!PHOTOS) return true;
  // 이 인물들은 고등학교 때 처음 만난다. 초등·중학 때는 예전 저장에 관계가 남아 있어도 나오지 않는다.
  if (TEXT_ONLY.has(id) && STAGES.indexOf(stage) >= 0 && STAGES.indexOf(stage) < 2) return false;
  if (TEXT_ONLY.has(id) && STAGES.indexOf(stage) >= 0 && STAGES.indexOf(stage) < 3) return true;
  const names = PHOTOS.get(id);
  if (!names?.length) return false;
  const at = STAGES.indexOf(stage);
  if (!/^c\d/.test(id) || at < 0 || at >= 3) return true;
  return names.some((n) => { const k = STAGES.indexOf(n.split('_')[0]); return k >= 0 && k <= at; });
}
// 성인 사진(대학·사회인·대표 등)이 있는지. 연애 상대는 학생 때 사진만 있으면 후보로 쓰지 않는다(미성년 사진을 연애에 잇지 않는다).
export const hasAdultPhoto = (id) => !PHOTOS || (PHOTOS.get(id) ?? []).some((n) => !/^(초등|중학|고등)_/.test(n));
export const photoFits = (id, name, stage) => {
  const k = STAGES.indexOf(name.split('_')[0]), at = STAGES.indexOf(stage);
  return !(/^c\d/.test(id) && at >= 0 && at < 3 && k >= 3);
};
function mentioned(part) {
  let ids = cache.get(part);
  if (ids) return ids;
  const parts = part.choices ? { who: part.who, text: part.text, title: part.title } : part;
  const t = JSON.stringify(parts);
  ids = ROSTER.filter((r) => t.includes(r.name) || t.includes(`"${r.id}"`)).map((r) => r.id);
  cache.set(part, ids);
  return ids;
}
export const eventCastOK = (e, stage) => !PHOTOS || mentioned(e).every((id) => canAppear(id, stage));
export const choiceCastOK = (c, stage) => !PHOTOS || mentioned(c).every((id) => canAppear(id, stage));
