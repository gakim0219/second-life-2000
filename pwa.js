// 오프라인 준비 상태를 작은 알림으로 보여 주고, 새 버전이 받아지면 적용 단추를 낸다.
(() => {
  if (!('serviceWorker' in navigator)) return;
  const box = document.getElementById('pwa'), text = box.firstElementChild, btn = box.lastElementChild;
  let timer = 0, waiting = null, claimed = false; const first = !navigator.serviceWorker.controller;
  const show = (t, ms) => { text.textContent = t; box.hidden = false; clearTimeout(timer); if (ms) timer = setTimeout(() => { box.hidden = true; }, ms); };
  const offer = (w) => { waiting = w; btn.hidden = false; show('새 버전을 받았습니다.'); };
  btn.addEventListener('click', () => { waiting?.postMessage('skip'); });
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (first && !claimed) { claimed = true; return; } if (!reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.addEventListener('message', (e) => {
    const m = e.data; if (!m?.sl) return;
    if (m.type === 'progress' && m.done < m.total) show(`${first ? '오프라인 준비' : '새 버전 받는 중'} ${Math.floor((m.done / m.total) * 100)}%`);
    if (m.type === 'failed') show('일부 파일을 받지 못했습니다. 인터넷이 될 때 다시 열면 이어서 받습니다.', 8000);
    if (m.type === 'ready' && first) show('오프라인 준비가 끝났습니다. 이제 인터넷 없이 열립니다.', 6000);
  });
  navigator.serviceWorker.register('sw.js').then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing; if (!w) return;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller && !first) offer(w); });
    });
    navigator.storage?.persist?.();
  }).catch(() => {});
})();
