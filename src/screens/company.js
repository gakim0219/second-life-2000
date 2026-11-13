// 회사 화면: 창업, 운영, 면접, 직원, 돈, 위기, 인수 제안, 두 번째 회사.
import { h, won, pips, photo, bgInto } from '../ui.js';
import { stageOf } from '../rules.js';
import * as co from '../company.js';

const SLOT = '이번 달 활동 칸을 다 썼습니다.';
const target = (s, o = {}) => (o.second ? s.company2 : s.company);
// 조건을 묻는 함수가 없는 규칙은 복사본에 먼저 해 보고 결과만 읽는다.
const dry = (s, fn) => { try { return fn(structuredClone(s)); } catch { return { ok: false, why: '지금은 할 수 없습니다.' }; } };
const ym = (s) => s.year * 12 + s.month;

const INFO = {
  '뷰티·커머스': { icon: '🧴', bg: 'office1', tone: 'var(--rose)', 특징: '쇼핑몰에서 시작해 자체 브랜드와 해외 판매로 넓힙니다.', 위험: '많이 주문하고 안 팔리면 재고가 돈을 묶습니다.' },
  '외식 프랜차이즈': { icon: '🍲', bg: 'office1', tone: 'var(--coral)', 특징: '1호점에서 직영점, 가맹점으로 늘립니다. 체력과 매력을 많이 씁니다.', 위험: '임차료와 인건비가 큽니다. 나쁜 가맹점 하나가 평판을 깎습니다.' },
  게임회사: { icon: '🎮', bg: 'office2', tone: 'var(--sky)', 특징: '게임 하나가 프로젝트입니다. 출시 결과는 제품력과 플랫폼 시기로 정해집니다.', 위험: '출시 전에는 수입이 거의 없습니다.' },
  'IT 플랫폼': { icon: '📱', bg: 'office2', tone: 'var(--leaf)', 특징: '나중에 뜰 서비스 유형을 먼저 시작할 수 있습니다.', 위험: '사용자는 빨리 늘고 돈은 늦게 법니다.' },
  연예기획사: { icon: '🎤', bg: 'office3', tone: 'var(--sun)', 특징: '곧 뜰 사람을 무명 시절에 계약할 수 있습니다.', 위험: '연습생과 소속 팀에 매달 돈이 듭니다.' },
  투자자문사: { icon: '📈', bg: 'office3', tone: 'var(--line)', 특징: '맡은 돈의 수수료가 매출입니다. 규모가 커지면 성과가 시장 평균에 가까워집니다.', 위험: '시장이 무너지면 고객이 돈을 뺍니다.' },
};
const ACTS = [
  { name: '제품 만들기', sub: '제품을 손봅니다', done: '제품을 붙들고 밤을 보냈습니다. 고칠 곳이 조금 줄었습니다.' },
  { name: '영업·협상', sub: '이번 달 매출을 밀어 올립니다', done: '거래처를 돌았습니다. 명함이 한 장 더 늘었습니다.' },
  { name: '면접 보기', sub: '후보 세 사람을 만납니다', done: '면접 일정을 잡았습니다.' },
  { name: '직원 챙기기', sub: '떠날 마음을 붙잡습니다', done: '직원들과 점심을 먹었습니다. 불만 두 개를 적어 왔습니다.' },
  { name: '현장 돌기', sub: '위기를 미리 봅니다', done: '현장을 돌았습니다. 장부와 다른 것이 보입니다.' },
  { name: '투자자 만나기', sub: '투자 이야기를 이어 갑니다', done: '투자자와 차를 마셨습니다. 숫자를 더 가져오라고 합니다.' },
];
const SPECIAL = {
  '상품 고르기': ['팔 물건을 고릅니다', '샘플 상자를 뜯어 하나씩 써 봤습니다.'],
  '재고 주문': ['품절을 막습니다', '창고에 상자가 쌓였습니다.'],
  '해외 판로 열기': ['해외에서도 팝니다', '해외 배송 계약서에 도장을 찍었습니다.'],
  '메뉴 개발': ['새 메뉴를 만듭니다', '같은 국물을 열 번 끓였습니다.'],
  '매장 열기': ['직영점을 늘립니다', '새 매장 간판에 불을 켰습니다.'],
  '가맹점 모집': ['가맹 점주를 받습니다', '예비 점주 설명회를 열었습니다.'],
  기획: ['게임의 뼈대를 잡습니다', '기획서를 다시 썼습니다.'],
  '개발 스프린트': ['만드는 데 집중합니다', '이번 달은 다 같이 늦게 퇴근했습니다.'],
  '시험 서비스': ['먼저 해 보게 합니다', '시험 서비스를 열었습니다. 불만 글을 밤새 읽었습니다.'],
  운영: ['출시작을 오래 살립니다', '점검 공지를 쓰고 업데이트를 올렸습니다.'],
  '기능 출시': ['새 기능을 내놓습니다', '새 기능을 내보내고 지표를 봤습니다.'],
  '사용자 모으기': ['사용자를 늘립니다', '광고를 걸고 가입 수를 지켜봤습니다.'],
  '수익 모델 시험': ['돈 버는 길을 찾습니다', '유료 기능을 시험했습니다. 떠나는 사람도 있습니다.'],
  오디션: ['연습생을 뽑습니다', '오디션장에 하루 종일 앉아 있었습니다.'],
  데뷔: ['가장 준비된 연습생을 내보냅니다', '첫 무대를 객석 맨 뒤에서 봤습니다.'],
  공연: ['이번 달 공연을 엽니다', '공연장 불이 꺼지고 다시 켜졌습니다.'],
  '해외 진출': ['해외 무대에 나갑니다', '해외 에이전시와 계약했습니다.'],
  리서치: ['자료를 파고듭니다', '보고서 더미 속에서 한 달을 보냈습니다.'],
  '고객 설명회': ['돈을 맡길 고객을 만납니다', '설명회를 열고 질문을 받았습니다.'],
  '운용 원칙 정하기': ['운용 방식을 바꿉니다', '운용 원칙을 다시 적어 벽에 붙였습니다.'],
  '준법 점검': ['규정을 점검합니다', '서류를 하나하나 맞춰 봤습니다.'],
};
const GIG = { 연습: '이번 달은 연습실 불을 늦게까지 켰습니다.', 학업: '이번 달은 학교와 공부 시간을 먼저 챙겼습니다.', 쉼: '이번 달은 연습을 멈추고 쉬게 했습니다.' };
const RISK = { 낮음: '오래 있을 사람입니다.', 보통: '좋은 제안이 오면 흔들릴 수 있습니다.', 높음: '오래 붙잡기 어려운 사람입니다.' };

let note = null;
const setNote = (s, text) => { note = { text, at: ym(s) }; };

// ---------- 작은 조각 ----------
const lock = (why) => h('span', { className: 'chip lock', text: why === SLOT ? '칸 없음' : why });
function tile({ label, sub, check, onClick, cls = '', meta }) {
  const locked = check && !check.ok;
  return h('button', { type: 'button', className: `btn co-tile ${cls}`, disabled: !!locked, on: { click: onClick } },
    h('b', { text: label }), sub ? h('span', { className: 'co-tile-sub', text: sub }) : null, meta ? h('span', { className: 'co-tile-meta', text: meta }) : null, locked ? lock(check.why) : null);
}
function avatar(who, name, s, cls = '') {
  return h('span', { className: `co-av ${cls}`, 'aria-hidden': 'true' }, h('span', { text: (name ?? '?').slice(0, 1) }), who ? photo(who, stageOf(s)) : null);
}
const meter = (label, frac, tail) => h('div', { className: 'co-meter-row' }, h('span', { className: 'co-meter-label', text: label }),
  h('span', { className: 'co-meter' }, h('i', { style: `width:${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%` })), tail ? h('span', { className: 'small', text: tail }) : null);
function slots(s) {
  const left = Math.max(0, s.capacity - s.used);
  return h('div', { className: 'co-slots', 'aria-label': `이번 달 칸 ${left}칸 남음` },
    // 칸이 많으면 점 대신 막대로 그린다(홈 화면과 같은 기준).
    s.capacity > 12
      ? h('span', { className: 'co-slotbar' }, h('i', { style: `width:${Math.round((left / s.capacity) * 100)}%` }))
      : h('span', { className: 'co-dots' }, Array.from({ length: s.capacity }, (_, i) => h('i', { className: i < left ? 'on' : '' }))),
    h('span', { className: 'small', text: left ? `${left}칸 남음` : '칸 없음' }));
}
function head(ctx, title, right) {
  return h('header', { className: 'co-head' },
    h('button', { type: 'button', className: 'co-back', 'aria-label': '뒤로', text: '‹', on: { click: () => ctx.back() } }), h('h1', { text: title }), right ?? null);
}
function sheetHead(title, close) {
  return h('div', { className: 'row between co-sheet-head' }, h('h2', { text: title }), h('button', { type: 'button', className: 'co-x', text: '닫기', on: { click: close } }));
}
// 안의 내용을 다시 그릴 수 있는 시트
function liveSheet(ctx, paint) {
  const body = h('div', { className: 'stack co-sheet' });
  const close = ctx.sheet(body);
  const redraw = () => { body.replaceChildren(...[paint(redraw, close)].flat(Infinity).filter(Boolean)); };
  redraw();
  return close;
}
function confirmSheet(ctx, title, text, label, fn, cls = 'main') {
  ctx.sheet((close) => h('div', { className: 'stack co-sheet' }, h('h2', { text: title }), h('p', { text }),
    h('button', { type: 'button', className: `btn ${cls}`, text: label, on: { click: () => { close(); fn(); } } }),
    h('button', { type: 'button', className: 'btn', text: '그만둔다', on: { click: close } })));
}
const apply = (ctx, r) => { if (!r?.ok) { ctx.toast(r?.why ?? '할 수 없습니다.'); return false; } ctx.refresh(); return true; };

// ---------- 창업 ----------
function founding(ctx, params) {
  const s = ctx.s; const second = !!params.second;
  const cards = co.INDUSTRY_NAMES.map((name) => {
    const def = co.INDUSTRIES[name]; const info = INFO[name];
    const r = dry(s, (c) => co.startCompany(c, name, '회사', { second }));
    return h('button', { type: 'button', className: `co-ind ${r.ok ? '' : 'off'}`, disabled: !r.ok, on: { click: () => foundSheet(ctx, name, second) } },
      h('span', { className: 'row between' }, h('b', { className: 'co-ind-name', text: `${info.icon} ${name}` }), h('span', { className: 'co-ind-money num', text: won(def.start) })),
      h('span', { className: 'co-ind-text', text: info.특징 }),
      h('span', { className: 'co-ind-risk', text: info.위험 }),
      r.ok ? h('span', { className: 'chip co-open', text: '세울 수 있습니다' }) : lock(r.why));
  });
  return h('div', { className: 'stack co' }, head(ctx, second ? '두 번째 회사' : '회사 세우기'),
    h('p', { className: 'sub', text: `내 돈 ${won(s.cash)}. 시작 돈은 내 돈에서 나갑니다. 업종을 고르면 이름을 짓습니다.` }), cards);
}
function foundSheet(ctx, name, second) {
  const s = ctx.s;
  const input = h('input', { type: 'text', maxLength: 20, placeholder: '회사 이름', autocomplete: 'off', 'aria-label': '회사 이름' });
  const submit = (e, close) => {
    e.preventDefault();
    const r = co.startCompany(s, name, input.value, { second });
    if (!r.ok) { ctx.toast(r.why); return; }
    note = null; close();
    ctx.save(); ctx.go('company', second ? { second: true } : {}, { replace: true });
  };
  ctx.sheet((close) => h('form', { className: 'stack co-sheet', on: { submit: (e) => submit(e, close) } },
    sheetHead(`${INFO[name].icon} ${name}`, close), h('p', { className: 'sub', text: `시작 돈 ${won(co.INDUSTRIES[name].start)}` }), input,
    h('button', { type: 'submit', className: 'btn main', text: '이 이름으로 세운다' })));
  input.focus();
}

// ---------- 운영 ----------
function hero(ctx, c, p) {
  const s = ctx.s; const info = INFO[c.industry];
  const el = h('section', { className: 'co-hero' },
    h('div', { className: 'co-hero-top' },
      h('div', { className: 'row wrap co-hero-chips' }, h('span', { className: 'chip', text: `${p.stage}단계 · ${p.단계이름}` }), h('span', { className: 'chip', text: c.industry }), p.상장 ? h('span', { className: 'chip', text: '상장사' }) : null, p.물러남 ? h('span', { className: 'chip', text: '회장' }) : null),
      h('h2', { className: 'co-name', text: p.name })),
    h('div', { className: 'co-team' },
      h('div', { className: 'co-mate' }, h('span', { className: 'co-av big me', 'aria-hidden': 'true' }, h('span', { text: '나' }), photo('me', stageOf(s), s.sex)), h('span', { className: 'co-mate-name', text: '대표' })),
      c.staff.map((m) => { const hr = co.hireById(m.id); const g = hr ? co.gradeAt(hr, s.year) : null;
        return h('button', { type: 'button', className: 'co-mate', on: { click: () => staffSheet(ctx, c) } }, avatar(m.id, hr?.이름, s, 'big'), h('span', { className: 'co-mate-name', text: hr?.이름 ?? '직원' }), h('span', { className: 'co-grade', text: g?.등급 ?? '' })); }),
      c.staff.length < p.직원칸 ? h('button', { type: 'button', className: 'co-mate', 'aria-label': '직원 보기', on: { click: () => staffSheet(ctx, c) } }, h('span', { className: 'co-av big empty', 'aria-hidden': 'true' }, h('span', { text: '＋' })), h('span', { className: 'co-mate-name', text: `${c.staff.length}/${p.직원칸}자리` })) : null));
  bgInto(el, info.bg, `linear-gradient(165deg,color-mix(in srgb,${info.tone} 55%,var(--bg)),var(--bg2) 70%)`);
  return el;
}
function numbers(ctx, c, p, opts) {
  const s = ctx.s; const profit = p.월매출 - p.월비용; const rb = co.revenueBreakdown(s, c);
  return h('section', { className: 'panel stack co-nums' },
    h('div', { className: 'row between' }, h('span', { className: 'sub', text: '회사 현금' }), h('b', { className: `num co-cash ${c.cash < 0 ? 'minus' : ''}`, text: won(c.cash) })),
    h('div', { className: 'grid2' },
      h('div', {}, h('span', { className: 'sub', text: '이번 달 매출' }), h('div', { className: 'num co-val', text: won(p.월매출) })),
      h('div', {}, h('span', { className: 'sub', text: '이번 달 비용' }), h('div', { className: 'num co-val', text: won(p.월비용) }))),
    h('p', { className: 'small co-flow', text: profit >= 0 ? `이대로면 이번 달에 ${won(profit)} 남습니다.` : `이대로면 이번 달에 ${won(-profit)} 모자랍니다.` }),
    rb.note ? h('p', { className: 'small co-warn', text: `${rb.note}: 물건이 모자라 매출이 줄고 있습니다.` }) : null,
    c.warned ? h('p', { className: 'small co-warn', text: '다음 달 현금이 모자랄 조짐이 보입니다.' }) : null,
    h('div', { className: 'grid3 co-mini' },
      h('div', {}, h('span', { className: 'sub', text: '제품력' }), h('div', {}, pips(p.제품력))),
      h('div', {}, h('span', { className: 'sub', text: '평판' }), h('b', { text: p.평판 })),
      h('div', {}, h('span', { className: 'sub', text: '내 지분' }), h('b', { className: 'num', text: `${Math.round(p.지분 * 10) / 10}%` }))),
    p.다음승급매출 ? meter('다음 단계', p.최근12개월매출 / p.다음승급매출) : null);
}
function sceneCards(ctx) {
  const s = ctx.s;
  return co.pendingScenes(s).filter((x) => !x.id.startsWith('offer:')).map((sc) => h('section', { className: 'panel stack co-scene' },
    h('h3', { text: sc.title }), h('p', { text: sc.text }),
    h('button', { type: 'button', className: 'btn sun', text: sc.choices[0].label, on: { click: () => apply(ctx, co.chooseScene(s, sc.id, 0)) } })));
}
function crisisCard(ctx, c, opts) {
  const s = ctx.s; if (!c.crisis) return null;
  const run = (ch, arg = {}) => { const r = co.resolveCrisis(s, ch, { ...opts, ...arg }); if (apply(ctx, r)) setNote(s, ch === '폐업' ? `${c.name}의 문을 닫았습니다.` : ch === '매각' ? `${c.name}을(를) 헐값에 넘기고 ${won(r.price ?? 0)}을 받았습니다.` : ch === '구조조정' ? '자리를 줄였습니다. 마지막으로 온 사람이 짐을 쌌습니다.' : '내 돈을 회사 통장에 넣었습니다.'); };
  const inject = dry(s, (x) => co.resolveCrisis(x, '내 돈 넣기', opts));
  return h('section', { className: 'panel stack co-crisis' },
    h('h3', { text: '돈이 석 달째 모자랍니다' }), h('p', { text: '월급날이 다가옵니다. 지금 정해야 합니다.' }),
    h('button', { type: 'button', className: 'btn', on: { click: () => run('구조조정') } }, h('b', { text: '구조조정' }), h('span', { className: 'chip', text: '비용이 줄고 평판과 사람을 잃습니다' })),
    h('button', { type: 'button', className: 'btn', disabled: !inject.ok, on: { click: () => run('내 돈 넣기') } }, h('b', { text: '내 돈 넣기' }), inject.ok ? h('span', { className: 'chip', text: `내 돈 ${won(s.cash)}` }) : lock(inject.why)),
    h('button', { type: 'button', className: 'btn', on: { click: () => confirmSheet(ctx, '헐값에 넘깁니다', '위기 중에는 제값을 받지 못합니다.', '넘긴다', () => run('매각')) } }, h('b', { text: '매각' })),
    h('button', { type: 'button', className: 'btn', on: { click: () => confirmSheet(ctx, '문을 닫습니다', '남은 빚의 일부는 대표 보증으로 내게 옵니다. 1년 뒤에 다시 창업할 수 있습니다.', '닫는다', () => run('폐업')) } }, h('b', { text: '폐업' })));
}
function offerCard(ctx, c, opts) {
  const s = ctx.s; const o = co.pendingOffer(s, opts); if (!o) return null;
  const go = (yes) => { const r = co.answerOffer(s, yes, opts); if (apply(ctx, r)) setNote(s, r.text); };
  return h('section', { className: 'panel stack co-scene' }, h('h3', { text: '인수 제안' }),
    h('p', {}, `${o.buyer}에서 ${c.name}을(를) 사고 싶다고 합니다. 값은 `, h('b', { className: 'num', text: won(o.price) }), '입니다.'),
    h('div', { className: 'grid2' }, h('button', { type: 'button', className: 'btn sun', text: '넘긴다', on: { click: () => go(true) } }), h('button', { type: 'button', className: 'btn', text: '거절한다', on: { click: () => go(false) } })));
}
function activities(ctx, c, opts) {
  const s = ctx.s;
  const run = (a) => {
    const r = co.companyAct(s, a.name, opts);
    if (!apply(ctx, r)) return;
    setNote(s, a.done);
    if (a.name === '면접 보기') interviewSheet(ctx, opts);
  };
  return h('section', { className: 'stack' }, h('div', { className: 'row between' }, h('h3', { text: '대표가 할 일' }), slots(s)),
    h('div', { className: 'grid2' }, ACTS.map((a) => tile({ label: a.name, sub: a.sub, check: co.canCompanyDo(s, a.name, opts), onClick: () => run(a) }))));
}
function specialTile(ctx, c, key, opts) {
  const s = ctx.s; const o = { ...opts, key };
  const check = co.canCompanyDo(s, '업종 전용', o);
  let meta = null;
  if (check.ok) { const spent = dry(s, (x) => { const before = target(x, opts).cash; const r = co.companyAct(x, '업종 전용', o); return r.ok ? before - target(x, opts).cash : 0; }); if (spent > 0) meta = `회사 돈 ${won(spent)}`; }
  const run = () => {
    if (key === '출시') return launchSheet(ctx, c, opts);
    if (key === '연습생 관리') return traineeSheet(ctx, c, opts);
    if (apply(ctx, co.companyAct(s, '업종 전용', o))) setNote(s, SPECIAL[key]?.[1] ?? '');
    return null;
  };
  const sub = key === '출시' ? '플랫폼을 고르고 내놓습니다' : key === '연습생 관리' ? '이번 달을 어떻게 보낼지 정합니다' : SPECIAL[key]?.[0];
  return tile({ label: key, sub, check, onClick: run, cls: 'co-special', meta });
}
function indState(ctx, c, opts) {
  const s = ctx.s; const x = c.x;
  const line = (a, b) => h('div', { className: 'row between small' }, h('span', { text: a }), h('b', { className: 'num', text: b }));
  switch (c.industry) {
    case '뷰티·커머스': return [line('창고 재고', x.stock > 0 ? won(x.stock) : '없음'), meter('자체 브랜드', x.brand ?? 0), x.overseas ? h('span', { className: 'chip', text: '해외 판매 중' }) : null];
    case '외식 프랜차이즈': return [line('직영 매장', `${x.stores}곳`), line('가맹점', x.franchise ? `${x.franchise}곳` : '아직 없음')];
    case '게임회사': return [
      meter('기획', x.proj.plan / 100), meter('개발', x.proj.dev / 100, x.proj.dev >= 70 ? '출시 가능' : null),
      x.proj.beta ? h('span', { className: 'chip', text: '시험 서비스 끝남' }) : null,
      x.games.length ? h('div', { className: 'stack co-list' }, x.games.map((g) => meter(`${g.year}년 ${g.platform}작`, g.cur))) : h('p', { className: 'small', text: '아직 내놓은 게임이 없습니다.' })];
    case 'IT 플랫폼': return [meter('사용자', x.traction / 2), meter('수익 모델', x.monet)];
    case '연예기획사': return [
      h('div', { className: 'small', text: `연습생 ${x.trainees.length}명 · 소속 팀 ${x.artists.length}개` }),
      x.trainees.map((t, i) => meter(t.이름 ?? `연습생 ${i + 1}`, t.pop / 100, t.minor ? '미성년' : null)),
      x.artists.map((t, i) => meter(t.이름 ?? `소속 ${i + 1}`, t.pop / 100, '소속')),
      x.overseas ? h('span', { className: 'chip', text: '해외 활동 중' }) : null,
      h('button', { type: 'button', className: 'btn sun', text: '계약할 사람 찾기', on: { click: () => scoutSheet(ctx, opts) } })];
    case '투자자문사': return [line('맡은 돈', won(x.aum)), meter('리서치', x.research / 100), meter('준법', x.compliance / 100), line('운용 원칙', x.rule > 1 ? '공격적으로' : x.rule < 1 ? '조심스럽게' : '시장 따라'), x.ret.length ? line('최근 시장', x.ret.reduce((a, v) => (1 + a) * (1 + v) - 1, 0) >= 0 ? '오르는 중' : '내리는 중') : null];
    default: return [];
  }
}
function industryCard(ctx, c, p, opts) {
  return h('section', { className: 'stack' }, h('h3', { text: `${INFO[c.industry].icon} ${c.industry} 일` }),
    h('div', { className: 'card stack co-state' }, indState(ctx, c, opts).flat().filter(Boolean)),
    h('div', { className: 'grid2' }, p.전용활동.map((k) => specialTile(ctx, c, k, opts))));
}
function secondCard(ctx) {
  const s = ctx.s; if (s.company2 || !s.company) return null;
  const other = co.INDUSTRY_NAMES.find((n) => n !== s.company.industry);
  const r = dry(s, (x) => co.startCompany(x, other, '회사', { second: true }));
  const blocked = s.company.stage < 4;
  return h('button', { type: 'button', className: 'card co-second', disabled: blocked, on: { click: () => ctx.go('company', { found: true, second: true }) } },
    h('b', { text: '두 번째 회사' }), h('span', { className: 'small', text: '다른 업종으로 하나 더 세웁니다. 대표 칸이 두 회사에서 함께 빠집니다.' }), blocked ? lock(r.why) : null);
}
function running(ctx, opts) {
  const s = ctx.s; const c = target(s, opts); const p = co.companyPanel(s, opts);
  const tabs = s.company2 ? h('div', { className: 'tabs' }, [[s.company, {}], [s.company2, { second: true }]].map(([x, o]) => h('button', { type: 'button', 'aria-pressed': String(x === c), text: x.name, on: { click: () => ctx.go('company', o, { replace: true }) } }))) : null;
  const list = c.interview.list.length;
  return h('div', { className: 'stack co' }, head(ctx, '회사', h('span', { className: 'small co-mine num', text: `내 돈 ${won(s.cash)}` })), tabs,
    hero(ctx, c, p), sceneCards(ctx), crisisCard(ctx, c, opts), offerCard(ctx, c, opts), numbers(ctx, c, p, opts),
    note && note.at === ym(s) ? h('p', { className: 'co-note', role: 'status', text: note.text }) : null,
    activities(ctx, c, opts), industryCard(ctx, c, p, opts), secondCard(ctx),
    h('div', { className: 'bar' }, h('div', {},
      h('button', { type: 'button', className: 'btn sun', text: '돈', on: { click: () => moneySheet(ctx, opts) } }),
      h('button', { type: 'button', className: 'btn', text: `직원 ${c.staff.length}`, on: { click: () => staffSheet(ctx, c) } }),
      h('button', { type: 'button', className: 'btn', text: list ? `면접 ${list}` : '면접', on: { click: () => interviewSheet(ctx, opts) } }))));
}

// ---------- 면접 ----------
// 겸용 후보의 영입 설명 칸에는 자료 메모가 들어 있어 화면에 내지 않는다.
const wants = (t) => (/겸용|추정한/.test(t ?? '') ? '' : t);
function interviewSheet(ctx, opts) {
  const s = ctx.s;
  liveSheet(ctx, (redraw, close) => {
    const list = co.interviewList(s, opts);
    const c = target(s, opts);
    return [sheetHead('면접', close),
      h('p', { className: 'sub', text: `자리 ${c.staff.length}/${co.STAGES[c.stage - 1].칸}. 회사 현금 ${won(c.cash)}.` }),
      list.length ? null : h('p', { text: '아직 만날 사람이 없습니다. 면접 보기를 하면 후보가 옵니다.' }),
      list.map((x) => h('article', { className: 'panel stack co-cand' },
        h('div', { className: 'row' }, avatar(x.id, x.이름, s, 'big'), h('div', {}, h('b', { text: x.이름 }), h('div', { className: 'sub', text: `${x.직군} · ${x.등급}` }), pips(x.실력구간))),
        x.기억난다 ? h('p', { className: 'co-remember', text: '이 사람 기억난다. 나중에 크게 될 사람이다.' }) : null,
        x.특기 ? h('p', { className: 'small' }, h('b', { text: '특기 ' }), x.특기) : null, x.약점 ? h('p', { className: 'small' }, h('b', { text: '약점 ' }), x.약점) : null,
        h('p', { className: 'small', text: RISK[x.이직_위험] ?? '' }),
        wants(x.설명) ? h('p', { className: 'small co-wants', text: wants(x.설명) }) : null,
        h('div', { className: 'stack co-offers' }, co.offerOptions(s, x.id, opts).map((o) => {
          const sal = Math.round(x.연봉 * (o.offer.pay ?? 1));
          return h('button', { type: 'button', className: `btn ${o.fit ? 'leaf' : ''}`, disabled: !o.fit, on: { click: () => {
            const r = co.makeOffer(s, x.id, o.offer, opts);
            if (!r.ok) { ctx.toast(r.why); return; }
            setNote(s, `${x.이름}이(가) ${x.직군} 자리에 합류했습니다.`); ctx.toast(`${x.이름}이(가) 함께하기로 했습니다.`); ctx.refresh(); redraw();
          } } }, h('b', { text: o.label }), h('span', { className: 'chip', text: `연봉 ${won(sal)}${o.offer.equity ? ` · 지분 ${o.offer.equity}%` : ''}` }), o.fit ? null : lock(o.hint ?? '이 사람이 원하는 조건이 아닙니다.'));
        })))) ];
  });
}

// ---------- 직원 ----------
function staffSheet(ctx, c) {
  const s = ctx.s; const core = co.INDUSTRIES[c.industry].core;
  ctx.sheet((close) => h('div', { className: 'stack co-sheet' }, sheetHead('직원', close),
    h('div', { className: 'card stack co-state' }, h('b', { className: 'small', text: '이 업종에 꼭 필요한 자리' }), core.map((r) => h('div', { className: 'row between small' }, h('span', { text: r }), pips(co.teamLevel(s, c, r))))),
    c.staff.length ? null : h('p', { text: '아직 이름 있는 직원이 없습니다.' }),
    c.staff.map((m) => { const x = co.hireById(m.id); if (!x) return null; const g = co.gradeAt(x, s.year);
      return h('article', { className: 'panel stack' },
        h('div', { className: 'row' }, avatar(m.id, x.이름, s, 'big'), h('div', {}, h('b', { text: x.이름 }), h('div', { className: 'sub', text: `${x.직군} · ${g.등급} · ${m.joined.year}년 합류` }), pips(g.실력구간))),
        x.특기 ? h('p', { className: 'small' }, h('b', { text: '특기 ' }), x.특기) : null, x.약점 ? h('p', { className: 'small' }, h('b', { text: '약점 ' }), x.약점) : null,
        h('div', { className: 'row wrap' }, h('span', { className: 'small num', text: `연봉 ${won(m.salary)}` }), m.equity ? h('span', { className: 'small num', text: `지분 ${m.equity}%` }) : null),
        m.unpaid ? h('p', { className: 'small co-warn', text: '시세만큼 못 올려 줘서 서운해합니다.' }) : null,
        h('p', { className: 'small', text: RISK[x.이직_위험] ?? '' })); })));
}

// ---------- 게임 출시 ----------
function launchSheet(ctx, c, opts) {
  const s = ctx.s;
  liveSheet(ctx, (redraw, close) => {
    const list = co.platformOptions(s, opts); const sel = list.find((x) => x.selected);
    return [sheetHead('어디에 내놓을까', close),
      list.map((x) => h('button', { type: 'button', className: `btn ${x.selected ? 'sky' : ''}`, 'aria-pressed': String(!!x.selected), disabled: !x.ok, on: { click: () => { const r = co.setPlatform(s, x.platform, opts); if (!r.ok) ctx.toast(r.why); else { ctx.save(); redraw(); } } } },
        h('b', { text: x.platform }), h('span', { className: 'chip', text: x.시기 }), x.ok ? null : lock(x.why))),
      h('button', { type: 'button', className: 'btn main', text: '출시한다 (1칸)', on: { click: () => {
        const r = co.companyAct(s, '업종 전용', { ...opts, key: '출시', platform: sel?.platform });
        if (apply(ctx, r)) { setNote(s, `${sel?.platform ?? ''} 게임을 내놓았습니다. 첫날 접속 수를 지켜봅니다.`); close(); }
      } } })];
  });
}

// ---------- 연습생 ----------
function traineeSheet(ctx, c, opts) {
  const s = ctx.s;
  ctx.sheet((close) => h('div', { className: 'stack co-sheet' }, sheetHead('연습생 관리', close),
    h('p', { className: 'sub', text: '이번 달을 어떻게 보낼지 정합니다. 학업과 쉬는 시간을 지키면 평판도 지킵니다.' }),
    c.x.trainees.map((t, i) => meter(t.이름 ?? `연습생 ${i + 1}`, t.pop / 100, t.minor ? '미성년' : null)),
    Object.entries({ 연습: '연습시킨다', 학업: '학업을 챙기게 한다', 쉼: '쉬게 한다' }).map(([k, label]) => {
      const check = co.canCompanyDo(s, '업종 전용', { ...opts, key: '연습생 관리', option: k });
      return h('button', { type: 'button', className: 'btn', disabled: !check.ok, on: { click: () => { if (apply(ctx, co.companyAct(s, '업종 전용', { ...opts, key: '연습생 관리', option: k }))) { setNote(s, GIG[k]); close(); } } } }, h('b', { text: label }), check.ok ? null : lock(check.why));
    })));
}
function scoutSheet(ctx, opts) {
  const s = ctx.s;
  liveSheet(ctx, (redraw, close) => {
    const list = co.scoutList(s, opts);
    return [sheetHead('계약할 사람', close),
      list.length ? null : h('p', { text: '지금 계약할 수 있는 사람이 없습니다.' }),
      list.map((x) => h('article', { className: 'panel stack co-cand' },
        h('div', { className: 'row' }, avatar(x.id, x.이름, s, 'big'), h('div', {}, h('b', { text: x.이름 }), h('div', { className: 'sub', text: x.분류 ?? '' }))),
        x.기억난다 ? h('p', { className: 'co-remember', text: '이 사람 기억난다. 곧 이름이 알려질 사람이다.' }) : null,
        x.성격 ? h('p', { className: 'small', text: x.성격 }) : null,
        x.미성년 ? h('span', { className: 'chip co-guard', text: '미성년 · 보호자 동의가 먼저입니다' }) : null,
        h('button', { type: 'button', className: 'btn sun', on: { click: () => sign(ctx, x, opts, redraw) } }, h('b', { text: '계약 이야기를 꺼낸다' }), h('span', { className: 'chip', text: `회사 돈 ${won(x.비용)}` }))))];
  });
}
function sign(ctx, x, opts, redraw) {
  const s = ctx.s;
  const finish = (r) => { if (!r.ok) { ctx.toast(r.why); return; } setNote(s, `${x.이름}과(와) 계약했습니다.`); ctx.toast(`${x.이름}과(와) 계약했습니다.`); ctx.refresh(); redraw(); };
  const r = co.signArtist(s, x.id, opts);
  if (!r.needGuardian) { finish(r); return; }
  const sc = r.scene;
  ctx.sheet((close) => h('div', { className: 'stack co-sheet' }, h('h2', { text: sc.title }), h('p', { text: sc.text }),
    sc.choices.map((ch, i) => h('button', { type: 'button', className: `btn ${i === 0 ? 'sun' : ''}`, text: ch.label, on: { click: () => {
      close();
      if (ch.guardian) finish(co.signArtist(s, x.id, { ...opts, guardian: true })); else { ctx.toast('졸업 뒤에 다시 오기로 했습니다.'); }
    } } }))));
}

// ---------- 돈 ----------
function amountField(presets) {
  const input = h('input', { type: 'number', inputMode: 'numeric', min: '0', step: '1', placeholder: '금액 (만 원)', 'aria-label': '금액, 만 원 단위' });
  const row = h('div', { className: 'co-presets' }, presets.map(([label, v]) => h('button', { type: 'button', className: 'chip', text: label, on: { click: () => { input.value = String(Math.floor(v / 1e4)); } } })));
  return { input, row, value: () => Math.floor(Number(input.value) || 0) * 1e4 };
}
function moneySheet(ctx, opts) {
  const s = ctx.s;
  liveSheet(ctx, (redraw, close) => {
    const c = target(s, opts);
    if (!c) { close(); return []; }
    const p = co.companyPanel(s, opts);
    const after = (r, text, leave) => { if (!r.ok) { ctx.toast(r.why); return; } setNote(s, text); ctx.toast(text); ctx.refresh(); if (leave) close(); else redraw(); };
    const cash = amountField([['100만', 1e6], ['1천만', 1e7], ['1억', 1e8]]);
    const loan = amountField([['1천만', 1e7], ['1억', 1e8], ['한도까지', p.대출한도]]);
    const venture = dry(s, (x) => co.raiseVenture(x, opts));
    const ipo = dry(s, (x) => co.goPublic(x, opts));
    const offer = co.acquisitionOffer(s, opts);
    const cost = p.비용;
    return [sheetHead('돈', close),
      h('div', { className: 'panel stack co-nums' },
        h('div', { className: 'row between small' }, h('span', { text: '회사 현금' }), h('b', { className: 'num', text: won(c.cash) })),
        h('div', { className: 'row between small' }, h('span', { text: '내 돈' }), h('b', { className: 'num', text: won(s.cash) })),
        h('details', {}, h('summary', { className: 'small', text: `이번 달 비용 ${won(p.월비용)}` }),
          [['이름 있는 직원', cost.payroll], ['나머지 직원', cost.anon], ['임대료', cost.rent], ['운영비', cost.fixed], ['대출 이자', cost.interest], ['공시 비용', cost.listed]].filter(([, v]) => v > 0).map(([k, v]) => h('div', { className: 'row between small' }, h('span', { text: k }), h('span', { className: 'num', text: won(v) }))))),
      h('section', { className: 'card stack' }, h('h3', { text: '내 돈과 회사 돈' }), cash.input, cash.row,
        h('div', { className: 'grid2' },
          h('button', { type: 'button', className: 'btn', text: '회사에 넣기', on: { click: () => after(co.injectCash(s, cash.value(), opts), '내 돈을 회사 통장에 넣었습니다.') } }),
          h('button', { type: 'button', className: 'btn', text: '내 돈으로 빼기', on: { click: () => { const r = co.withdrawCash(s, cash.value(), opts); after(r, r.ok ? `회사에서 빼서 ${won(r.got)}이 내 몫으로 왔습니다.` : ''); } } })),
        c.equity < 100 ? h('p', { className: 'small', text: '뺄 때는 내 지분만큼만 내 몫이 됩니다.' }) : null),
      h('section', { className: 'card stack' }, h('h3', { text: '은행 대출' }),
        h('p', { className: 'small num', text: `빌린 돈 ${won(p.대출)} · 더 빌릴 수 있는 돈 ${won(p.대출한도)}` }), loan.input, loan.row,
        h('div', { className: 'grid2' },
          h('button', { type: 'button', className: 'btn', text: '빌리기', on: { click: () => after(co.takeLoan(s, loan.value(), opts), '은행에서 돈을 빌렸습니다.') } }),
          h('button', { type: 'button', className: 'btn', text: '갚기', disabled: !(p.대출 > 0), on: { click: () => { const r = co.repayLoan(s, loan.value(), opts); after(r, r.ok ? `대출 ${won(r.paid)}을 갚았습니다.` : ''); } } }))),
      h('section', { className: 'card stack' }, h('h3', { text: '벤처 투자' }), h('p', { className: 'small', text: '돈을 받고 지분을 내줍니다. 평판이 좋을수록 덜 내줍니다.' }),
        h('button', { type: 'button', className: 'btn sky', disabled: !venture.ok, on: { click: () => confirmSheet(ctx, '투자를 받습니다', `${won(venture.amount)}을 받고 지분 ${venture.pct}%를 내줍니다.`, '받는다', () => { const r = co.raiseVenture(s, opts); after(r, r.ok ? `${r.who}에서 ${won(r.amount)}을 받았습니다. 지분 ${r.pct}%를 내줬습니다.` : ''); }) } }, h('b', { text: '투자 받기' }), venture.ok ? null : lock(venture.why))),
      h('section', { className: 'card stack' }, h('h3', { text: '끝내는 길' }),
        c.listed ? null : h('button', { type: 'button', className: 'btn sun', disabled: !ipo.ok, on: { click: () => confirmSheet(ctx, '상장합니다', `${won(ipo.raise)}이 회사로 들어오고 내 지분이 줄어듭니다. 공시 부담이 생깁니다.`, '상장한다', () => { const r = co.goPublic(s, opts); after(r, r.ok ? `${c.name}이(가) 상장했습니다.` : ''); }) } }, h('b', { text: '상장' }), ipo.ok ? null : lock(ipo.why)),
        c.listed && !c.retired ? h('button', { type: 'button', className: 'btn', on: { click: () => confirmSheet(ctx, '회장으로 물러납니다', '대표 칸이 빠지지 않고 제품은 직원에게 맡깁니다.', '물러난다', () => { const r = co.retire(s, opts); after(r, r.text ?? ''); }) } }, h('b', { text: '회장으로 물러나기' })) : null,
        h('button', { type: 'button', className: 'btn', disabled: !offer.ok, on: { click: () => confirmSheet(ctx, `${offer.buyer}에 넘깁니다`, `내 몫으로 ${won(offer.price)}을 받습니다. 회사는 내 손을 떠납니다.`, '넘긴다', () => { const r = co.sellCompany(s, opts); after(r, r.ok ? `${c.name}을(를) 넘기고 ${won(r.price)}을 받았습니다.` : '', true); }) } }, h('b', { text: '매각' }), offer.ok ? h('span', { className: 'chip num', text: `${offer.buyer} · ${won(offer.price)}` }) : lock(offer.why)),
        h('button', { type: 'button', className: 'btn', on: { click: () => confirmSheet(ctx, '문을 닫습니다', '남은 돈에서 빚을 갚습니다. 모자라면 일부가 대표 보증으로 내게 옵니다. 1년 뒤에 다시 창업할 수 있습니다.', '닫는다', () => { const r = co.closeCompany(s, opts); after(r, `${c.name}의 문을 닫았습니다.`, true); }) } }, h('b', { text: '폐업' })))];
  });
}

export const screens = {
  company(ctx, params = {}) {
    const s = ctx.s; co.init(s);
    if (params.found || !s.company) return founding(ctx, params);
    return running(ctx, params.second && s.company2 ? { second: true } : {});
  },
};
