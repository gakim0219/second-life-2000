// 시작: 프롤로그 그림 7컷, 그다음 이름·성별·다짐.
import { h, bgInto } from '../ui.js';
import { newGame } from '../state.js';
import { startGame } from '../core.js';
import { resumeFlow } from './common.js';
import { DISCLAIMER } from '../invest.js';
import { loadLink } from './saves.js';

const CUTS = [
  { art: ['prologue-2026'], when: '2026년 겨울', text: ['서른일곱의 나는 편의점 앞 의자에 앉아 있다.', '커피가 다 식었다. 일어날 이유가 딱히 없다.'] },
  { art: ['moment-down'], when: '2026년 겨울', text: ['휴대폰에 부재중 전화가 세 통 찍혀 있다. 엄마다.', '부모님 가게 간판이 내려간 뒤로 나는 전화를 잘 받지 않았다.'] },
  { art: ['moment-down'], dim: true, when: '2026년 겨울', text: ['그때 다르게 했더라면.', '그 돈을 모아 뒀더라면. 그 친구에게 연락했더라면.', '입김만 나오고 대답은 없다.'] },
  { art: ['prologue-2026'], when: '그날 밤', text: ['집에 와서 오래된 상자를 열었다.', '초등학교 공책, 접힌 쪽지 하나, 2000년 달력.', '달력을 펴 든 채로 잠이 들었다.'] },
  { art: ['prologue-light', 'home-winter'], when: '2000년 1월', text: ['아침 냄새가 났다. 부엌에서 라디오 소리가 들렸다.', '이불 밖으로 나온 내 손이 너무 작았다.'] },
  // 회귀를 깨닫고 회귀노트를 적는다(사용자 지시 2026-11-10). 노트는 회귀자의 기억 화면에서 다시 펼친다.
  { art: ['home-winter'], when: '2000년 1월', text: ['벽에 걸린 달력이 2000년 1월에 멈춰 있다.', '꿈이 아니었다.', '아… 나, 회귀했구나.'] },
  { art: ['home-winter'], dim: true, when: '그날 아침', text: ['기억이 흐려지기 전에 공책을 폈다.', '2026년까지, 해마다 달마다 가장 많이 올랐던 주식을 떠오르는 대로 적었다.', '몇 장을 빼곡히 채우고 표지에 썼다. 회귀노트.'] },
];
// 다짐 3장. 하나를 고르면 앨범 이정표에 남고 값에는 손대지 않는다.
const PLEDGES = [
  { id: '가족', title: '가족을 먼저', text: '이번에는 전화를 먼저 건다. 가게 불이 꺼지기 전에.' },
  { id: '사람', title: '사람을 놓치지 않기', text: '그때 연락하지 못한 친구들에게 먼저 말을 건다.' },
  { id: '돈', title: '돈을 모르고 지나치지 않기', text: '신문을 읽고, 작게 시작하고, 큰돈 앞에서 서두르지 않는다.' },
];
function begin(ctx, form, vow) {
  const s = newGame({ name: form.name, sex: form.sex, seed: Date.now() % 100000 });
  if (vow) s.flags[`다짐:${vow}`] = true;
  ctx.s = s; startGame(s); ctx.save(); ctx.autosave();
  return resumeFlow(ctx);
}
const head = () => h('header', { className: 'pro-head' }, h('span', { className: 'eyebrow', text: 'PROLOGUE' }), h('h2', { text: '다시 시작되는 나의 삶' }));
// 이름, 성별, 다짐을 한 장에서 고른다.
function form(ctx) {
  const f = { name: '', sex: '남', vow: PLEDGES[0].id };
  const err = h('p', { className: 'start-err', role: 'alert' });
  const name = h('input', { id: 'hero-name', maxLength: 8, placeholder: '이름을 입력하세요', autocomplete: 'off', value: '' });
  const sexBtn = (v) => h('button', { type: 'button', className: 'start-sex', text: v === '남' ? '남자' : '여자', 'aria-pressed': String(f.sex === v), on: { click: () => { f.sex = v; sexRow.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-pressed', String(['남', '여'][k] === v))); } } });
  const sexRow = h('div', { className: 'start-seg' }, sexBtn('남'), sexBtn('여'));
  const card = (p) => h('label', { className: 'pledge' },
    h('input', { type: 'radio', name: 'vow', value: p.id, checked: p.id === f.vow, on: { change: () => { f.vow = p.id; } } }),
    h('span', {}, h('b', { text: p.title }), h('small', { text: p.text })));
  const go = (e) => {
    e.preventDefault();
    f.name = name.value.trim();
    if (!f.name) { err.textContent = '이름을 적어 주세요.'; name.focus(); return; }
    begin(ctx, f, f.vow);
  };
  return h('form', { className: 'pro-sheet start', on: { submit: go } }, head(),
    h('p', { className: 'pro-serif', text: '이름을 적고, 이번 생에서 지키고 싶은 것을 하나 고른다.' }),
    h('label', { className: 'start-label', htmlFor: 'hero-name', text: '이번 생에서 불릴 이름' }), name, err,
    h('span', { className: 'start-label', text: '성별' }), sexRow,
    h('fieldset', { className: 'pledges' }, h('legend', { className: 'start-label', text: '이번 생에서 지키고 싶은 것' }), PLEDGES.map(card)),
    h('button', { className: 'btn main', type: 'submit', text: '두 번째 인생 시작하기 →' }), loadLink(ctx),
    h('p', { className: 'small sub start-note', text: DISCLAIMER }));
}
const backdropArt = () => bgInto(h('div', { className: 'pro-back', 'aria-hidden': 'true' }), ['home-winter'], 'none');
function prologue(ctx) {
  let i = 0;
  const when = h('p', { className: 'pro-when num' }), lines = h('div', { className: 'pro-lines' }), dots = h('div', { className: 'pro-dots', 'aria-hidden': 'true' }, CUTS.map(() => h('i')));
  const hint = h('span', { className: 'pro-hint' });
  const bg = h('div', { className: 'pro-bg', 'aria-hidden': 'true' });
  const show = () => {
    const c = CUTS[i];
    when.textContent = c.when;
    lines.replaceChildren(...c.text.map((t, k) => { const p = h('p', { text: t }); p.style.animationDelay = `${k * 0.3}s`; return p; }));
    bgInto(bg, c.art, 'linear-gradient(170deg,#2b3446,#10141d)');
    bg.classList.remove('swap'); void bg.offsetWidth; bg.classList.add('swap');
    bg.classList.toggle('dim', !!c.dim);
    [...dots.children].forEach((d, k) => { d.className = k === i ? 'on' : k < i ? 'past' : ''; });
    hint.textContent = i === CUTS.length - 1 ? '눌러서 시작 ›' : '눌러서 계속 ›';
  };
  const toForm = () => document.getElementById('app').replaceChildren(h('div', { className: 'pro' }, backdropArt(), form(ctx)));
  const next = () => { i += 1; if (i >= CUTS.length) toForm(); else show(); };
  show();
  return h('div', { className: 'pro' }, backdropArt(), h('div', { className: 'pro-sheet' }, head(),
    h('button', { className: 'pro-cut', 'aria-label': '다음 컷', on: { click: next } }, bg, h('span', { className: 'pro-shade' }), h('span', { className: 'pro-inner' }, when, lines, hint)),
    h('div', { className: 'pro-foot' }, dots, h('button', { className: 'pro-skip', text: '건너뛰기', on: { click: toForm } })), loadLink(ctx)));
}
// 다시 시작할 때는 프롤로그 없이 이름 입력부터 연다.
export const screens = { start: (ctx, p = {}) => (p.form ? h('div', { className: 'pro' }, backdropArt(), form(ctx)) : prologue(ctx)) };
