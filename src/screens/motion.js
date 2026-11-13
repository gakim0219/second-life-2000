// 움직임 도우미. 움직임 줄이기 설정이면 달 넘김 막은 건너뛴다. 코치 안내는 움직임 없이 그대로 나온다.
const hasDom = () => typeof document !== 'undefined' && typeof window !== 'undefined';
export function reduced() { try { return !hasDom() || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; } }
// 달 넘김 막: 들어오기 250ms, 머물기 450ms, 나가기 300ms. 막이 걷히기 시작할 때 끝나는 약속을 돌려준다. 건너뛰면 null.
export function veil({ year, month, season }) {
  if (reduced()) return null;
  let v = document.getElementById('veil');
  if (!v) { v = document.createElement('div'); v.id = 'veil'; v.setAttribute('aria-hidden', 'true'); document.body.append(v); }
  v.dataset.season = season;
  v.innerHTML = `<b>${year}. ${String(month).padStart(2, '0')}</b><span>${season}</span>`;
  v.classList.remove('on'); void v.offsetWidth; v.classList.add('on');
  setTimeout(() => v.classList.remove('on'), 1000);
  return new Promise((r) => setTimeout(r, 700));
}
// 코치 안내: 대상에 고리, 말풍선에 다음·건너뛰기. steps: [{ target, title, text }]. 대상이 없는 칸은 건너뛴다.
export function coach(steps, onEnd) {
  if (!hasDom()) { onEnd?.(); return; }
  let box = document.getElementById('coach');
  if (!box) { box = document.createElement('div'); box.id = 'coach'; document.body.append(box); }
  const finish = () => { box.hidden = true; box.innerHTML = ''; onEnd?.(); };
  const show = (i) => {
    if (i >= steps.length) { finish(); return; }
    const c = steps[i], target = document.querySelector(c.target);
    if (!target) { show(i + 1); return; }
    target.scrollIntoView?.({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    setTimeout(() => {
      const r = target.getBoundingClientRect(), vh = window.innerHeight || 800, below = r.top + r.height / 2 < vh / 2;
      box.innerHTML = `<div class="coach-ring" style="left:${Math.max(4, r.left - 6)}px;top:${Math.max(4, r.top - 6)}px;width:${r.width + 12}px;height:${r.height + 12}px"></div><div class="coach-bubble" role="dialog" aria-live="polite" style="${below ? `top:${Math.min(vh - 190, r.bottom + 14)}px` : `bottom:${Math.max(14, vh - r.top + 14)}px`}"><h3></h3><p></p><div class="coach-row"><span>${i + 1} / ${steps.length}</span><button type="button" data-skip>건너뛰기</button><button type="button" class="btn main" data-next>${i + 1 < steps.length ? '다음' : '시작하기'}</button></div></div>`;
      box.querySelector('h3').textContent = c.title; box.querySelector('p').textContent = c.text;
      box.hidden = false;
      box.querySelector('[data-next]').onclick = () => show(i + 1);
      box.querySelector('[data-skip]').onclick = finish;
      box.querySelector('[data-next]').focus?.({ preventScroll: true });
    }, reduced() ? 0 : 280);
  };
  show(0);
}
