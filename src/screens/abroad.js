import { h } from '../ui.js';
import * as ab from '../abroad.js';

// 유학 준비 현황: 시험 점수, 기록, 학교별 가능성.
export function abroadSheet(ctx, s) {
  const rows = ab.summary(s).split('\n');
  ctx.sheet((close) => h('div', { className: 'stack' }, h('h2', { text: '🇺🇸 유학 준비 현황' }),
    rows.map((r) => { const [k, ...v] = r.split(': '); return h('div', { className: 'row between' }, h('span', { text: k.trim() }), h('b', { className: 'num', text: v.join(': ') })); }),
    h('p', { className: 'sub small', text: '가능성은 지금 기록으로 본 것이라, 에세이와 추천서가 채워지면 오릅니다. 조기 지원은 2007년 11월 1일(NIT 한 곳), 정규 지원은 2008년 1월 1일입니다. 다닐 수 있는 미국 대학은 NIT뿐이고, 다른 네 곳은 지어낸 학교로 합격장만 받습니다.' }),
    h('button', { className: 'btn', text: '닫기', on: { click: close } })));
}
