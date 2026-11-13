// 저장·불러오기 칸 목록. 설정과 시작 화면에서 함께 쓴다.
import { h } from '../ui.js';
import * as saves from '../saves.js';

function confirm(ctx, title, text, yes, run) {
  ctx.sheet((close) => h('div', { className: 'stack' }, h('h2', { text: title }), h('p', { className: 'sub', text }),
    h('button', { className: 'btn', text: '그만두기', on: { click: close } }),
    h('button', { className: 'btn main', text: yes, on: { click: () => { close(); run(); } } })));
}
function loadRow(ctx, row) {
  let s;
  try { s = saves.open(row); } catch { ctx.toast('이 저장은 읽을 수 없습니다.'); return; }
  ctx.s = s; ctx.save(); ctx.stack.length = 0; ctx.toast('불러왔습니다.');
  ctx.go('home', {}, { replace: true });
}
// canSave가 거짓이면 불러오기만 보인다(시작 화면).
export function slotPanel(ctx, { canSave = true } = {}) {
  const list = h('div', { className: 'slots' }, h('p', { className: 'sub', text: '저장을 찾는 중입니다.' }));
  const note = h('p', { className: 'small sub' });
  const paint = async () => {
    const [rows, online] = await Promise.all([saves.readAll(), saves.cloudReady()]);
    note.textContent = online ? '계정에 저장되어 게임이 업데이트되어도 남고, 다른 기기에서도 이어 할 수 있습니다.' : '지금은 이 기기에만 저장됩니다. 오래 보관하려면 저장 코드도 꺼내 두세요.';
    list.replaceChildren(...saves.SLOTS.map(([slot, label], i) => {
      const row = rows[i];
      const save = async () => {
        const run = async () => {
          const r = await saves.writeSlot(slot, ctx.s);
          ctx.toast(r.account ? `${label}에 저장했습니다.` : r.device ? `${label}에 이 기기에만 저장했습니다.` : '저장하지 못했습니다.');
          paint();
        };
        if (row) confirm(ctx, `${label}에 덮어쓸까요?`, `지금 들어 있는 저장: ${saves.metaText(row.meta)}`, '덮어쓰기', run); else run();
      };
      const load = () => confirm(ctx, `${label}을 불러올까요?`, `${saves.metaText(row.meta)}. 지금 진행 중인 내용은 저장하지 않았다면 사라집니다.`, '불러오기', () => loadRow(ctx, row));
      return h('div', { className: 'slot' },
        h('div', { className: 'slot-info' }, h('b', { text: label }),
          h('span', { className: 'small', text: row ? saves.metaText(row.meta) : '비어 있음' }),
          row ? h('span', { className: 'small sub', text: `${saves.whenText(row.meta)}${row.inAccount ? '' : ' · 이 기기에만 있음'}` }) : slot === 'auto' ? h('span', { className: 'small sub', text: '달이 넘어갈 때마다 저장됩니다.' }) : null),
        h('div', { className: 'slot-btns' },
          canSave && slot !== 'auto' ? h('button', { className: 'btn', text: '저장', on: { click: save } }) : null,
          row ? h('button', { className: 'btn', text: '불러오기', on: { click: load } }) : null));
    }));
  };
  paint();
  return h('div', { className: 'stack' }, list, note);
}
// 저장이 하나라도 있을 때만 나타나는 시작 화면 단추.
export function loadLink(ctx) {
  const b = h('button', { type: 'button', className: 'btn', text: '저장한 게임 불러오기', hidden: true, on: { click: () => ctx.sheet(() => h('div', { className: 'stack' }, h('h2', { text: '불러오기' }), slotPanel(ctx, { canSave: false }))) } });
  saves.readAll().then((rows) => { b.hidden = !rows.some(Boolean); });
  return b;
}
