import { hasLaptop } from './devices.js';
import * as ab from './abroad.js';
// 활동 세부 메뉴. 시기별 목록은 listActions(s), 실행은 doAction(s,id). 결과 문장에 상승량 숫자를 쓰지 않는다.
import { gain, raise, stageOf, restOf, labelOf, isOpen, ACTIVITIES, PAY, addStress, STATS, lockStat, tierOf, ageOf, growCapacity, stepsCrossed, effectText, statGains } from './rules.js';
export { effectText };
import { enrolled, inArmy, isVacation, isProjectSeason, studyGain, examOf, examPending, takeExam } from './school.js';
import { bump, bumpSmall, bondOf } from './bonds.js';
import { addSupport, shareOf } from './election.js';
import * as crush from './crush.js';
import { groupOf, HS_CLUBS, clubLevel } from '../data/events_youth.js';
import { OFFICE_ACTIONS, officeOpen, officeName } from '../data/events_island.js';

const up = (s, stat, base = 1) => { raise(s, stat, base); };
const ym = (s) => s.year * 100 + s.month;
const adult = (s) => ['대학', '사회인'].includes(stageOf(s));
const LOCK = (why) => ({ ok: false, why });
const noVac = (s) => (isVacation(s) ? LOCK('방학 중에는 학교에 가지 않습니다.') : null);
const need = (s, stat, min) => (s.stats[stat] >= min ? null : lockStat(s, stat, min));

// ───────── 기본 ─────────
const HOME_STUDY = 0.6; // 집 공부도 시험에 쌓인다. 수업보다는 덜 쌓인다.
const BASIC = [
  { id: 'study', group: '공부', label: '공부', stress: 3, army: true, run: (s) => { up(s, '지능'); if (enrolled(s)) s.study = Math.min(100, s.study + studyGain(s) * HOME_STUDY); return '책상에 오래 앉아 있었다. 어제 막힌 부분이 조금 풀렸다.'; } },
  { id: 'code_study', group: '공부', label: '코딩 공부', stress: 3, show: (s) => hasLaptop(s), run: (s) => { up(s, '지능'); s.codeStudy = (s.codeStudy ?? 0) + 1; return '노트북을 켜고 예제를 하나씩 따라 쳤다. 오류를 잡고 나니 화면에 글자가 떴다.'; } },
  { id: 'exercise', group: '운동', label: '운동', stress: 1, army: true, run: (s) => { up(s, '체력'); return '땀이 날 때까지 뛰었다. 숨이 차도 어제보다 덜 힘들다.'; } },
  // 찻집을 미뤘을 때 내가 먼저 다시 꺼낸다(사용자 지시 2026-11-11). 칸을 쓰지 않고 바로 그 장면을 띄운다.
  { id: 'tea_again', group: '휴식', label: '부모님께 찻집 이야기 다시 꺼내기', free: true, show: (s) => !!s.flags.찻집_보류 && !s.flags.부모_찻집 && s.year <= 2024 && !s.ended,
    run: (s) => { delete s.flags.찻집_보류; s.flags.찻집_다시 = true; if (!s.queue.includes('tea_offer')) s.queue.push('tea_offer'); return '저녁을 먹다가 찻집 이야기를 다시 꺼냈다. 어머니가 숟가락을 내려놓고 나를 보았다.'; } },
  { id: 'rest', group: '휴식', label: '휴식', army: true, run: (s) => { s.stress = Math.max(0, s.stress - restOf(s.stats.체력)); return '아무것도 하지 않고 푹 쉬었다. 머리가 맑아졌다.'; } },
];

// ───────── 알바 단계: 가게 돕기 → 고교 알바 → 대학 과외 → 프리랜서 ─────────
const paid = (s, amount, stat, text, base = 0.4) => { s.cash += amount; up(s, stat, base); return text; };
const WORK = [
  { id: 'shop_help', group: '과외 알바', label: '부모님 가게 돕기', stress: 3, show: (s) => ['초등', '중학'].includes(stageOf(s)), run: (s) => paid(s, PAY[stageOf(s)], '인맥', '계산대 옆에서 잔돈을 세고 손님에게 인사했다. 엄마가 고생했다며 용돈을 쥐여 주셨다.') },
  { id: 'shop_shelf', group: '과외 알바', label: '가게 진열 정리', stress: 3, show: (s) => stageOf(s) === '중학', run: (s) => paid(s, PAY.중학, '체력', '상자를 나르고 선반을 새로 채웠다. 팔이 뻐근하다.') },
  { id: 'job_snack', group: '과외 알바', label: '분식집 서빙', stress: 3, show: (s) => stageOf(s) === '고등', run: (s) => paid(s, PAY.고등, '인맥', '점심 손님이 몰려 정신이 없었다. 사장님이 떡볶이를 한 접시 더 주셨다.') },
  { id: 'job_flyer', group: '과외 알바', label: '전단 돌리기', stress: 3, show: (s) => stageOf(s) === '고등', run: (s) => paid(s, PAY.고등, '체력', '동네를 몇 바퀴 돌며 전단을 돌렸다. 다리가 묵직하다.') },
  { id: 'job_gas', group: '과외 알바', label: '주유소 일', stress: 3, show: (s) => stageOf(s) === '고등', run: (s) => paid(s, PAY.고등, '체력', '주말 내내 차를 맞았다. 손에서 기름 냄새가 오래 남았다.') },
  { id: 'tutor', group: '과외 알바', label: '과외', stress: 3, show: (s) => stageOf(s) === '대학', req: (s) => need(s, '지능', 51), run: (s) => paid(s, PAY.대학, '인맥', '학생이 오답 노트를 꺼냈다. 설명하다 보니 나도 정리가 됐다.') },
  { id: 'job_campus', group: '과외 알바', label: '학교 앞 식당 알바', stress: 3, show: (s) => stageOf(s) === '대학', run: (s) => paid(s, PAY.고등, '체력', '점심시간 내내 그릇을 날랐다. 끝나고 먹은 밥이 맛있었다.') },
  { id: 'freelance', group: '과외 알바', label: '프리랜서 활동', stress: 3, show: (s) => stageOf(s) === '사회인', run: (s) => paid(s, tierOf(Math.max(s.stats.지능, s.stats.인맥)) >= 2 ? PAY.사회인 : PAY.사회인 / 2, '인맥', '맡은 일을 마감에 맞춰 넘겼다. 다음 일을 소개받았다.') },
];

// ───────── 학교 ─────────
const PE_TEXT = { 초등: '점심을 먹자마자 운동장으로 뛰어나가 피구를 했다. 종이 칠 때까지 공만 쫓았다.', 중학: '점심시간에 반 대항 축구를 했다. 교복 셔츠가 땀에 젖었다.', 고등: '점심시간에 농구 코트로 나갔다. 십 분만 뛰어도 머리가 맑아졌다.', 대학: '수업 사이에 운동장에서 공을 찼다. 다음 수업에 늦을 뻔했다.' };
const SCHOOL = [
  // 시험 달에만 교실에 나타난다. 칸을 쓰지 않는다.
  { id: 'exam', group: '학교', label: '시험 보기', free: true, show: (s) => examPending(s),
    run: (s) => { const kind = examOf(s), r = takeExam(s); return { text: `${kind}를 치렀다. 그동안 공부한 만큼 답을 적었다.`, exam: r }; } },
  { id: 'class', group: '학교', label: '수업 듣기', stress: 2, show: (s) => enrolled(s), req: noVac,
    run: (s) => { s.study = Math.min(100, s.study + studyGain(s)); s.fame += 0.5; up(s, '지능', 1.4); if (stageOf(s) === '대학') up(s, '인맥', 0.5); return '수업 내용을 공책에 정리했다. 다음 시험 범위가 눈에 들어온다.'; } },
  { id: 'help', group: '학교', label: '행사 돕기', stress: 1, show: (s) => enrolled(s), req: noVac,
    run: (s) => { s.fame += 2; up(s, '인맥', 1.3); return '행사 준비를 도왔다. 복도에서 내 이름을 부르는 사람이 늘었다.'; } },
  // 학교 활동은 집에서 혼자 하는 기본 활동보다 많이 오른다. 운동과 어울리는 활동은 피곤함도 풀린다.
  { id: 'pe', group: '학교', label: '점심시간 공놀이', stress: -3, show: (s) => enrolled(s), req: noVac, run: (s) => { up(s, '체력', 1.6); up(s, '인맥', 0.3); return PE_TEXT[stageOf(s)] ?? PE_TEXT.중학; } },
  { id: 'night_study', group: '학교', label: '야간 자율학습', stress: 4, show: (s) => stageOf(s) === '고등', req: noVac, run: (s) => { s.study = Math.min(100, s.study + studyGain(s)); up(s, '지능', 1.8); return '밤 열 시까지 교실에 남았다. 창밖이 어두워질수록 문제가 잘 풀렸다.'; } },
  { id: 'gym', group: '학교', label: '교양 체육', stress: -3, show: (s) => stageOf(s) === '대학' && enrolled(s), req: noVac, run: (s) => { up(s, '체력', 1.8); return '체육관을 몇 바퀴 돌고 배드민턴을 쳤다. 끝나고 마신 물이 달았다.'; } },
  { id: 'present', group: '학교', label: '수업 시간 발표', stress: 2, show: (s) => enrolled(s), req: noVac,
    run: (s) => { s.fame += 0.5; up(s, '매력', 1.4); return '손을 들고 앞에 나가 발표했다. 목소리가 떨렸지만 끝까지 말했다.'; } },
  { id: 'friend', group: '학교', label: '친구 사귀기', stress: -2, show: (s) => enrolled(s), req: noVac,
    run: (s) => { up(s, '매력', 1); up(s, '인맥', 0.6); const known = Object.keys(s.bonds).filter((k) => /^c\d/.test(k)).sort((a, b) => bondOf(s, a) - bondOf(s, b)); if (known[0]) bumpSmall(s, known[0], 1); return '쉬는 시간에 말을 걸었다. 같이 매점까지 걸어갔다.'; } },
  // 임시 결정: 초등 모임 내용은 합창·달리기 두 가지로 시작한다.
  { id: 'choir', group: '학교', label: '합창 모임', stress: -3, show: (s) => stageOf(s) === '초등', req: noVac, run: (s) => { s.fame += 0.5; up(s, '매력', 1.3); return '음악실에 모여 입을 맞췄다. 후렴에서 소리가 하나로 모였다.'; } },
  { id: 'runclub', group: '학교', label: '달리기 모임', stress: -4, show: (s) => stageOf(s) === '초등', req: noVac, run: (s) => { s.fame += 0.5; up(s, '체력', 1.8); return '방과 후 운동장을 함께 돌았다. 마지막 바퀴에서 서로 밀어 주었다.'; } },
  { id: 'work_office', group: '학교', label: '회사', show: (s) => stageOf(s) === '사회인', route: { tab: '회사' } },
];
// CA: 중학교 특별활동. 3월마다 바꾼다.
export const CA = {
  ca_sci: { name: '과학반', stat: '지능', text: '과학실에서 실험 순서를 적었다. 선반의 오래된 기록장도 한 권 빌렸다.' },
  ca_sport: { name: '운동부', stat: '체력', text: '운동장에서 몸을 풀고 달렸다. 흙먼지가 신발에 묻었다.' },
  ca_bcast: { name: '방송반', stat: '매력', text: '점심 방송 원고를 읽었다. 마이크 앞에서 호흡을 조절했다.' },
  ca_serve: { name: '봉사반', stat: '인맥', text: '복지관에서 일손을 도왔다. 어르신들이 이름을 물으셨다.' },
};
const caOf = (s) => Object.keys(CA).find((k) => s.flags[k]);
SCHOOL.push({ id: 'ca', group: '학교', label: '특별활동(CA)', stress: -2, show: (s) => enrolled(s) && stageOf(s) === '중학' && !!caOf(s), req: noVac,
  run: (s) => { const c = CA[caOf(s)]; s.fame += 0.5; up(s, c.stat, c.stat === '체력' ? 1.8 : 1.4); if (c.stat === '체력') s.stress = Math.max(0, s.stress - 2); return c.text; } });
// 대학 동아리 활동. 합격하면 열린다.
const CLUB = { 학술: ['학회 세미나', '지능', '자료를 읽고 발표를 맡았다. 질문이 길게 이어졌다.'], 운동: ['동아리 운동 연습', '체력', '연습이 끝나고 다 같이 국밥을 먹었다.'], 공연: ['공연 연습', '매력', '합주실에서 같은 부분을 여러 번 맞췄다.'], 연합: ['연합 모임', '인맥', '다른 학교 사람들과 명함 대신 이름표를 바꿨다.'] };
for (const [k, [label, stat, text]] of Object.entries(CLUB)) {
  SCHOOL.push({ id: `club_${k}`, group: '학교', label, stress: -2, show: (s) => enrolled(s) && stageOf(s) === '대학' && !!s.flags[`동아리:${k}`], req: noVac, run: (s) => { s.fame += 0.5; up(s, stat, stat === '체력' ? 1.8 : 1.4); if (stat === '체력') s.stress = Math.max(0, s.stress - 2); return text; } });
}

// ───────── 탐구 과제: 방학 칸으로 횟수를 채운다 ─────────
export function projectStatus(s) {
  const total = 4 - (s.flags.ca_sci ? 1 : 0) - (s.flags.초등입상 ? 1 : 0);
  return { done: !!s.flags.탐구과제, count: s.project ?? 0, total, started: !!s.flags.탐구시작 };
}
SCHOOL.push({ id: 'project', group: '학교', label: '탐구 과제 기록', stress: 2,
  show: (s) => stageOf(s) === '중학' && !!s.flags.탐구시작 && !s.flags.탐구과제,
  req: (s) => (isProjectSeason(s) ? null : LOCK('방학 때 이어서 할 수 있습니다.')),
  run: (s) => {
    s.project += 1; up(s, '지능', 1.2);
    if (s.project >= projectStatus(s).total) { s.flags.탐구과제 = true; up(s, '지능'); return '기록장 마지막 장을 채웠다. 탐구 과제를 끝냈다. 개학하면 제출한다.'; }
    return '오늘 치 기록을 적었다. 기록장이 조금 두꺼워졌다.';
  } });
// 시험처럼 알림만 준다(사용자 지시 2026-11-10): 탐구 과제를 시작했고 방학 달에 기록이 남아 있으면
// 할 일 맨 위에 뜨고, 기록하지 않고 달을 넘기려 하면 경고가 뜬다. 자동으로 채우지는 않는다.
export const projectPending = (s) => isProjectSeason(s) && !!s.flags.탐구시작 && !s.flags.탐구과제;

// ───────── 놀기: 친구와 어울리기(초·중·고, 사용자 지시 2026-11-09) ─────────
// [id, 이름, 비용, 오르는 능력, 피곤함, 열리는 조건, 글]
const PLAY_GAIN = 0.6;
const PLAY = [
  ['play_pc', 'PC방', 2000, '인맥', -6, (s) => stageOf(s) !== '초등', '친구들과 PC방 구석 자리에 나란히 앉았다. 팀을 짜서 게임을 했다. 진 팀이 컵라면을 샀다.'],
  ['play_arcade', '오락실 리듬 게임', 1000, '체력', -6, (s) => s.year <= 2004, '오락실 발판 위에서 화살표를 따라 발을 굴렀다. 어느새 뒤에 구경꾼이 몰렸다.'],
  ['play_karaoke', '노래방', 5000, '매력', -7, () => true, '노래방에서 목이 쉬도록 불렀다. 만점이 뜨자 친구들이 탬버린을 흔들며 소리를 질렀다.'],
  ['play_comic', '만화방', 3000, '지능', -9, () => true, '만화방 소파에 파묻혀 완결된 시리즈를 몰아 봤다. 어디선가 라면 냄새가 났다.'],
  ['play_snack', '분식집', 3000, '인맥', -5, () => true, '분식집에서 떡볶이와 튀김을 시켰다. 국물에 튀김을 찍어 먹으며 반 소문을 다 들었다.'],
  ['play_ball', '농구·축구 한 판', 0, '체력', -6, () => true, '동네 코트에서 편을 갈라 공을 찼다. 해가 질 때까지 아무도 집에 가자고 하지 않았다.'],
  ['play_sticker', '스티커 사진', 3000, '매력', -4, (s) => stageOf(s) !== '초등', '좁은 부스에 우르르 끼어 스티커 사진을 찍었다. 다 같이 혀를 내민 사진이 제일 잘 나왔다.'],
  ['play_sauna', '찜질방', 6000, '체력', -10, (s) => stageOf(s) === '고등', '찜질방에서 양머리 수건을 쓰고 구운 달걀을 까먹었다. 식혜가 달았다.'],
  ['play_cy', '싸이월드 꾸미기', 3000, '매력', -4, (s) => s.year >= 2003 && stageOf(s) !== '초등', '도토리로 배경 음악을 바꾸고 사진첩을 정리했다. 일촌들이 방명록을 남겼다.'],
  ['play_gacha', '문방구 뽑기', 500, '인맥', -5, (s) => stageOf(s) === '초등', '문방구 앞 뽑기 기계를 돌렸다. 꽝이 나왔지만 친구가 뽑은 장난감을 같이 구경했다.'],
];
const PLAY_ACTIONS = PLAY.map(([id, label, cost, stat, stress, open, text]) => ({ id, group: '놀기', label, cost, stress, show: (s) => isOpen('놀기', stageOf(s)) && open(s),
  // 놀기는 스트레스를 푸는 일이다. 능력은 기본 활동(1)보다 덜 오른다. 만화방이 공부만큼 머리를 키우지는 않는다.
  run: (s) => { up(s, stat, PLAY_GAIN); const g = groupOf(s); if (g.length) bumpSmall(s, g[(s.month + s.used) % g.length], 2); return text; } }));

// 노래방 미니게임: 박자 맞추기 점수(0~100). 점수가 높으면 조금 더 오르고 더 풀린다. 점수가 없으면 평소처럼.
export function doKaraoke(s, score = null) {
  const r = doAction(s, 'play_karaoke');
  if (!r.ok || score == null) return r;
  const n = Math.max(0, Math.min(100, Math.round(score)));
  if (n >= 90) { raise(s, '매력', 0.6); s.stress = Math.max(0, s.stress - 3); }
  const line = n >= 90 ? '박자를 하나도 놓치지 않았다. 친구들이 기립 박수를 쳤다. 다음 주에 또 오자는 말이 나왔다.' : n >= 70 ? '중간에 한 번 박자를 놓쳤지만 후렴에서 다 같이 따라 불렀다.' : '박자가 자꾸 엇나갔다. 그래도 다 같이 웃느라 배가 아팠다.';
  return { ...r, text: `노래방 점수판에 ${n}점이 떴다. ${line}` };
}
// ───────── 다른 학교: 축제·연합 동아리·학원 ─────────
const otherName = (s) => crush.otherSchool(s) ?? '다른 학교';
const inClub = (s) => Object.keys(CA).some((k) => s.flags[k]) || !!s.flags.hs_club;
const meetText = (s, route, rate, none) => { if (crush.roll(s, `${route}${s.used}`) >= rate) return none; const id = crush.meetNear(s, route); return id ? `${crush.firstSceneOf(id)} 사람들에 ${crush.nameOf(id)}이(가) 생겼다.` : none; };
const OTHER = [
  { id: 'other_fest', group: '다른 학교', label: '축제 놀러 가기', cost: 3000, stress: -5, show: (s) => isOpen('다른 학교', stageOf(s)),
    req: (s) => (![9, 10].includes(s.month) ? LOCK('이웃 학교 축제는 가을(9~10월)에 열립니다.') : s.flags[`fest_go_${s.year}`] ? LOCK('올해 축제는 이미 다녀왔습니다.') : null),
    run: (s) => { s.flags[`fest_go_${s.year}`] = true; up(s, '매력', 1); return meetText(s, '축제', 0.9, `${otherName(s)} 축제를 구경했다. 운동장 무대에서 밴드 공연이 한창이었다. 친구들과 솜사탕을 들고 부스를 돌았다.`); } },
  { id: 'other_union', group: '다른 학교', label: '연합 동아리 모임', stress: -2, show: (s) => isOpen('다른 학교', stageOf(s)),
    req: (s) => (!inClub(s) ? LOCK('동아리(특별활동)에 들면 열립니다.') : null),
    run: (s) => { up(s, '인맥', 1.2); if (s.club) s.club.exp += 1; return meetText(s, '연합 동아리', 0.6, '여러 학교 동아리가 모인 연합 모임에 나갔다. 다른 학교 아이들과 연습 일정을 맞추고 연락처를 주고받았다.'); } },
  { id: 'other_academy', group: '다른 학교', label: '학원 수업', cost: (s) => (stageOf(s) === '고등' ? 80000 : 50000), stress: 3, show: (s) => isOpen('다른 학교', stageOf(s)),
    run: (s) => { if (enrolled(s)) s.study = Math.min(100, s.study + studyGain(s) * 0.8); up(s, '지능', 1.4); return meetText(s, '학원', 0.45, '학원 수업을 들었다. 쉬는 시간에 다른 학교 아이들과 매점 앞에서 컵떡볶이를 먹었다.'); } },
];

// ───────── 고등학교 동아리 연습 ─────────
const CLUB_TEXT = { 밴드부: '합주실에서 같은 소절을 열 번 넘게 맞췄다. 마지막에는 박자가 딱 맞았다.', 방송부: '점심 방송 대본을 쓰고 녹음했다. 내 목소리가 스피커로 나오니 어색했다.', 농구부: '코트를 몇 바퀴 돌고 슛 연습을 했다. 손바닥이 얼얼했다.', 댄스부: '거울 앞에서 동작을 맞췄다. 땀이 바닥에 떨어졌다.', 만화부: '콘티를 짜고 펜 선을 다듬었다. 선배가 이번 컷은 좋다고 했다.', 과학반: '실험 순서를 바꿔 다시 해 봤다. 이번에는 예상한 값이 나왔다.', 연극부: '대본 리딩을 했다. 대사가 조금씩 입에 붙었다.', 봉사부: '복지관 어르신들 말벗이 되어 드렸다. 돌아올 때 사탕을 한 줌 받았다.' };
SCHOOL.push({ id: 'club_hs', group: '학교', label: '동아리 연습', stress: -2, show: (s) => enrolled(s) && stageOf(s) === '고등' && !!s.club, req: noVac,
  run: (s) => { const n = s.club.name, before = clubLevel(s); s.club.exp += 1; s.fame += 0.5; up(s, HS_CLUBS[n] ?? '매력', 1.4); const after = clubLevel(s); return `${CLUB_TEXT[n] ?? '동아리방에서 연습했다.'}${after > before ? (after === 3 ? ' 이제 동아리의 에이스다.' : ' 이제 동아리에서 한몫을 한다.') : ''}`; } });

// ───────── 선거 ─────────
export const ELECTIONS = {
  초6: { stage: '초등', on: (s) => (ym(s) === 200103 || ym(s) === 200104) && s.flags.el_run, term: (s) => (s.flags.초6당선 || s.flags.초6부회장) && ym(s) >= 200106 && ym(s) <= 200202,
    promo: [
      { key: 'poster', at: 'lab', label: '포스터 붙이기', fame: 4, stat: '매력', text: '스케치북 두 장을 이어 포스터를 만들었다. 복도 게시판에 붙이자 지나가던 아이들이 이름을 소리 내어 읽었다.' },
      { key: 'class', at: 'classroom', label: '반 돌며 인사', fame: 3, stat: '인맥', text: '교실 문을 열 때마다 심장이 뛰었다. 몇 반에서는 박수까지 나왔다.' },
      { key: 'speech', at: 'hall', label: '조회 연설 연습', fame: 2, fameHigh: 6, stat: '지능', stress: 2, text: '원고를 외워 거울 앞에서 읽었다. 아직은 목소리가 떨린다.', textHigh: '원고를 몇 번 읽었더니 문장이 입에 붙었다. 연습하는 걸 지나가던 선생님이 멈춰 서서 들었다.' },
      { key: 'crew', at: 'ground', label: '응원단 만들기', fame: 6, stat: '인맥', min: 51, text: '친구의 친구까지 불러 모아 응원단을 꾸렸다. 구호를 맞추느라 점심시간을 다 썼다.' },
      { key: 'snack', at: 'classroom', label: '사탕과 과자 돌리기', fame: 5, stat: '인맥', cost: 5000, risky: true, text: '쉬는 시간에 사탕을 몰래 나눠 주었다. 아무도 눈치채지 못했다.', caught: '복도에서 사탕을 돌리다 원종수 선생님과 눈이 마주쳤다. "그건 공정하지 않다"는 말을 듣고 모두 거둬들였다.' },
    ],
    duty: [
      { at: 'hall', label: '월례 조회 진행', stat: '매력', text: '마이크를 잡은 손이 떨렸지만 끝까지 읽었다. 뒷줄에서 민혁이 엄지를 들어 올렸다.' },
      { at: 'hall', label: '학교 행사 준비 도우미', stat: '인맥', text: '의자와 현수막을 나르며 선생님들과 얼굴을 텄다.' },
      { at: 'classroom', label: '급식·청소 점검 순회', stat: '체력', text: '복도를 한 바퀴 돌며 점검표에 체크했다. 다리가 뻐근했다.' },
      { at: 'classroom', label: '후배 반 돌며 인사', stat: '인맥', text: '저학년 교실에서 아이들이 몰려와 내 이름을 불렀다.' },
    ] },
  중2: { stage: '중학', on: (s) => (ym(s) === 200303 || ym(s) === 200304) && s.flags.me_run, term: (s) => (s.flags.중2당선 || s.flags.중2부회장) && ym(s) >= 200306 && ym(s) <= 200402,
    promo: [
      { key: 'poster', at: 'hall', label: '포스터 붙이기', fame: 4, stat: '매력', text: '복도마다 포스터를 붙였다. 다음 날 포스터 귀퉁이에 누군가 응원 낙서를 달아 놓았다.' },
      { key: 'class', at: 'classroom', label: '반 돌며 인사', fame: 3, stat: '인맥', text: '쉬는 시간마다 반을 돌며 인사를 했다. 이름을 외우는 데 시간이 걸렸지만 얼굴을 익혔다.' },
      { key: 'speech', at: 'lab', label: '교내 방송 연설 연습', fame: 2, fameHigh: 6, stat: '지능', stress: 2, text: '방송실에서 서은비 선배가 호흡을 가르쳐 줬다. 아직 목소리가 갈라진다.', textHigh: '원고를 두 번 읽었더니 말이 입에 붙었다. 방송이 끝나자 복도에서 박수가 쏟아졌다.' },
      { key: 'crew', at: 'ground', label: '선거 운동원 꾸리기', fame: 6, stat: '인맥', min: 51, text: '친구들에게 부탁해 운동원 팀을 만들었다. 교문 앞에 피켓을 든 아이들이 줄을 섰다.' },
      { key: 'pledge', at: 'lab', label: '급식·축제 공약 만들기', fame: 4, stat: '지능', stress: 2, text: '급식 개선과 축제 부스 확대를 약속하는 공약을 적었다. 허미란 선생님이 지킬 수 있는 건지 한 번 더 보라고 했다.' },
    ],
    duty: [
      { at: 'lab', label: '학생회의 진행', stat: '매력', text: '안건을 하나씩 읽고 손을 들게 했다. 회의가 예정보다 일찍 끝났다.' },
      { at: 'ground', label: '체육대회·축제 기획 돕기', stat: '인맥', text: '반마다 돌며 신청서를 모았다. 아는 얼굴이 늘었다.' },
      { at: 'ground', label: '아침 교문 맞이', stat: '체력', text: '일찍 나와 교문 앞에 섰다. 후배들이 꾸벅 인사했다.' },
      { at: 'classroom', label: '후배 반 돌며 인사', stat: '인맥', text: '1학년 교실에 들어가 건의 사항을 받아 적었다.' },
    ] },
  고2: { stage: '고등', on: (s) => (ym(s) === 200603 || ym(s) === 200604) && s.flags.hs_run, term: (s) => (s.flags.hs_won || s.flags.hs_vice_won) && ym(s) >= 200606 && ym(s) <= 200612,
    promo: [
      { key: 'poster', at: 'hall', label: '포스터·현수막 붙이기', fame: 4, stat: '매력', text: '교문 앞과 복도에 현수막을 붙였다. 아침 등교길에 아이들이 이름을 읽어 내려갔다.' },
      { key: 'gate', at: 'ground', label: '교문 앞 아침 인사', fame: 3, stat: '체력', text: '이른 아침 교문 앞에 서서 인사했다. 다리가 시렸지만 선생님들이 흐뭇해하셨다.' },
      { key: 'class', at: 'classroom', label: '반 돌며 공약 설명', fame: 3, stat: '인맥', text: '쉬는 시간마다 반을 돌며 공약을 풀어 설명했다. 질문이 쏟아져 땀이 났다.' },
      { key: 'speech', at: 'lab', label: '공약 발표회 준비', fame: 2, fameHigh: 6, stat: '지능', stress: 2, text: '공약을 정리해 발표 자료를 만들었다. 아직은 말이 매끄럽지 않다.', textHigh: '공약의 근거와 순서를 또렷하게 정리했다. 질문에도 막힘없이 답했다.' },
      { key: 'snack', at: 'classroom', label: '간식 돌리기', fame: 5, stat: '인맥', cost: 8000, risky: true, text: '쉬는 시간에 간식을 나눠 주었다. 아무도 눈치채지 못했다.', caught: '복도에서 간식을 나눠 주다 선생님과 눈이 마주쳤다. 모두 거둬들였다. 소문이 순식간에 퍼졌다.' },
    ],
    duty: [
      { at: 'lab', label: '학생회 회의 진행', stat: '지능', text: '건의 사항을 표로 정리해 돌렸다. 회의가 길어지지 않았다.' },
      { at: 'hall', label: '축제 기획', stat: '인맥', text: '동아리마다 찾아가 무대 순서를 맞췄다.' },
      { at: 'ground', label: '체육대회 운영', stat: '체력', text: '운동장을 뛰어다니며 진행표를 챙겼다.' },
      { at: 'ground', label: '등굣길 캠페인', stat: '매력', text: '교문 앞에서 팻말을 들고 인사했다. 아는 후배가 손을 흔들었다.' },
    ] },
  대학: { stage: '대학', on: (s) => s.month === 10 && s.flags.출마 && !s.flags.당선 && !s.flags.부당선 && !s.flags.낙선,
    term: (s) => { const y = s.sex === '남' ? 2013 : 2011; return (s.flags.당선 || s.flags.부당선) && s.year === y; },
    promo: [
      { key: 'poster', at: 'hall', label: '자보·포스터 붙이기', fame: 5, stat: '매력', stress: 1, text: '밤마다 복도에 포스터를 붙였다. 아침이면 누가 떼어 간 자리가 있었다.' },
      { key: 'class', at: 'classroom', label: '강의실 돌며 인사', fame: 5, stat: '인맥', stress: 1, text: '수업 시작 전 오 분씩 허락을 받고 강의실을 돌았다. 이름을 기억하는 학생이 늘었다.' },
      { key: 'speech', at: 'lab', label: '공약 토론회 준비', fame: 3, fameHigh: 7, stat: '지능', stress: 2, text: '예산표를 직접 짜 보았다. 몇몇 질문에는 답을 못 했다.', textHigh: '예산표를 직접 짜 보았다. 식당 단가를 묻는 질문에 대답할 수 있게 되었다.' },
      { key: 'lawn', at: 'ground', label: '잔디밭에서 유세하기', fame: 4, stat: '매력', stress: 1, text: '점심시간 잔디밭에 올라섰다. 처음엔 몇 명뿐이었는데 말이 끝날 즈음엔 앉아서 듣는 사람이 늘었다.' },
      { key: 'crew', at: 'lab', label: '선거운동본부 꾸리기', fame: 7, stat: '인맥', min: 51, stress: 1, text: '사람을 모아 역할을 나눴다. 동아리방이 임시 본부가 됐다.' },
    ],
    duty: [
      { at: 'lab', label: '학교 측과 면담', stat: '지능', text: '식당 대기 시간 기록을 표로 만들어 갔다. 담당자가 메모를 시작했다.' },
      { at: 'hall', label: '축제 기획', stat: '매력', text: '주점 위치와 무대 순서를 칠판에 그렸다. 회의가 두 시간을 넘겼다.' },
      { at: 'classroom', label: '학생 의견 모으기', stat: '인맥', text: '의견함을 열고 강의실을 돌았다. 같은 불만이 세 번 이상 나온 것만 추렸다.' },
      { at: 'lab', label: '총학 예산 정리', stat: '지능', text: '영수증을 항목별로 붙이고 공개 자료를 만들었다.' },
    ] },
};
const ELECTION_ACTIONS = [];
for (const [key, e] of Object.entries(ELECTIONS)) {
  for (const p of e.promo) {
    ELECTION_ACTIONS.push({ id: `promo_${key}_${p.key}`, group: '학교', label: `선거 홍보: ${p.label}`, stress: p.stress ?? 1, cost: p.cost, kind: 'promo', at: p.at,
      show: (s) => stageOf(s) === e.stage && !!e.on(s),
      req: (s) => {
        if (!p.risky && s.promo[key]?.includes(p.key)) return LOCK('이번 선거에서 이미 했습니다.');
        return p.min ? need(s, p.stat, p.min) : null;
      },
      run: (s) => {
        const list = (s.promo[key] ??= []);
        const again = list.includes(p.key);
        list.push(p.key);
        const before = shareOf(s);
        const moved = (text) => `${text} (지지도 ${before}% → ${shareOf(s)}%)`;
        if (p.risky && again) { addSupport(s, -3); up(s, p.stat, 0.3); return moved(p.caught); }
        const high = p.fameHigh && tierOf(s.stats[p.stat]) >= 2;
        addSupport(s, high ? p.fameHigh : p.fame);
        if (p.stat) up(s, p.stat, 1.3);
        return moved(high ? p.textHigh : p.text);
      } });
  }
  e.duty.forEach((d, i) => ELECTION_ACTIONS.push({ id: `duty_${key}_${i}`, group: '학교', label: `임기 활동: ${d.label}`, stress: 1, kind: 'duty', at: d.at,
    show: (s) => stageOf(s) === e.stage && !!e.term(s), req: noVac,
    run: (s) => { s.fame += 3; up(s, d.stat, 1.3); return d.text; } }));
}

// ───────── 꾸미기 6종 (수치는 임시) ─────────
const DRESS = [
  { id: 'dress_manner', label: '말투·매너 연습', cost: 10000, base: 1.2, stressOf: 1, text: '말끝을 어떻게 맺을지 연습했다. 인사가 전보다 자연스럽다.' },
  { id: 'dress_hair', label: '헤어샵', cost: 30000, base: 1.2, stressOf: -3, text: '머리를 다듬었다. 집에 오는 길에 가게 유리에 비친 내가 어색했다.' },
  { id: 'dress_clothes', label: '옷 쇼핑', cost: 50000, base: 1.3, stressOf: -4, text: '옷을 몇 벌 입어 보고 하나를 골랐다. 내일 입을 옷이 정해졌다.' },
  { id: 'dress_style', label: '스타일링 상담', cost: 100000, base: 1.5, stressOf: -3, text: '직원이 내 옷장 얘기를 듣고 어울리는 조합을 적어 주었다.' },
  { id: 'dress_skin', label: '피부과', cost: 150000, base: 2, stressOf: -3, text: '진료를 받고 관리법을 들었다. 생활 습관부터 고치기로 했다.' },
  { id: 'dress_surgery', label: '성형', cost: 3000000, base: 6, stressOf: 10, adult: true, once: true, text: '수술을 받았다. 회복하는 동안 한 달을 조심해서 지냈다.' },
];
const DRESS_ACTIONS = DRESS.map((d) => ({ id: d.id, group: '꾸미기', label: d.label, cost: d.cost, stress: d.stressOf ?? 0,
  show: (s) => isOpen('꾸미기', stageOf(s)),
  req: (s) => { if (d.adult && !adult(s)) return LOCK('대학생부터 열립니다.'); if (d.once && s.flags[d.id]) return LOCK('이미 했습니다.'); return null; },
  run: (s) => { if (d.once) s.flags[d.id] = true; up(s, '매력', d.base); return d.text; } }));

// ───────── 인맥 관리 ─────────
let networkHook = null;
// life 담당의 network.js가 등록하면 doAction 결과의 met 칸으로 만난 사람이 전달된다.
export const onNetwork = (fn) => { networkHook = fn; };
let dry = false; // 미리보기 중에는 사람을 만나지 않는다
const net = (s, base, text, kind) => { up(s, '인맥', base); return { text, met: networkHook && !dry ? networkHook(s, { kind, tier: tierOf(s.stats.인맥) }) : null }; };
const NETWORK = [
  { id: 'net_meet', group: '인맥 관리', label: '사람 만나기', cost: 20000, stress: 2, show: (s) => isOpen('인맥 관리', stageOf(s)), run: (s) => net(s, 1.3, '소개받은 사람과 저녁을 먹었다. 명함이 한 장 늘었다.', '일반') },
  { id: 'net_club', group: '인맥 관리', label: '동아리 선배 만나기', cost: 30000, stress: 2, show: (s) => isOpen('인맥 관리', stageOf(s)) && !!s.flags.동아리가입, req: (s) => need(s, '인맥', 51), run: (s) => net(s, 1.5, '동아리 선배가 회사 이야기를 들려줬다. 다음에 또 보자고 했다.', '동아리') },
  { id: 'net_intern', group: '인맥 관리', label: '회사 선배 만나기', cost: 50000, stress: 2, show: (s) => isOpen('인맥 관리', stageOf(s)) && !!s.flags.인턴수료, req: (s) => need(s, '인맥', 101), run: (s) => net(s, 1.8, '인턴 때 선배가 자리를 마련했다. 업계 사람을 하나 소개받았다.', '회사') },
];

// ───────── 만남 (실제 처리는 love.js, 여기는 메뉴와 잠금) ─────────
const MEET = [
  { way: '미팅', label: '미팅', cost: (s) => (stageOf(s) === '고등' ? 10000 : 30000), show: (s) => isOpen('만남', stageOf(s)) },
  { way: '소개팅', label: '소개팅', cost: () => 50000, show: (s) => adult(s), req: (s) => need(s, '인맥', 51) },
  { way: '헌팅', label: '헌팅', cost: () => 30000, show: (s) => adult(s), req: (s) => need(s, '매력', 51) },
  { way: '클럽', label: '클럽', cost: () => 200000, show: (s) => adult(s), req: (s) => need(s, '매력', 101) },
  { way: '선보기', label: '선보기', cost: () => 300000, show: (s) => adult(s), req: (s) => (ageOf(s) >= 30 ? null : LOCK('서른부터 열립니다.')) },
  { way: '결혼정보회사', label: '결혼정보회사 상담', cost: () => 3000000, show: (s) => adult(s), req: (s) => (ageOf(s) >= 25 ? null : LOCK('스물다섯부터 가입할 수 있습니다.')) },
];
const MEET_ACTIONS = MEET.map((m) => ({ id: `meet_${m.way}`, group: '만남', label: m.label, cost: m.cost, show: m.show, req: m.req, route: { tab: '만남', way: m.way } }));

// ───────── 플렉스 6갈래 ─────────
// 확정: 갈래별 고정 능력 상승 + 스트레스 해소뿐이다. 비쌀수록 더 오르되 구간 비율을 적용한다.
export const FLEX_STAT = { 밤문화: '인맥', 쇼핑: '매력', 수집: '지능', 소유: '인맥', 건강: '체력', 기부: '인맥' }; // 기부는 인맥(사용자 지시 2026-11-08)
// 가장 싼 단계도 돈 안 드는 기본 활동(운동·공부 1)보다 많이 오른다(사용자 지시 2026-11-10: 헬스장이 그냥 운동보다 낫게).
const FLEX_BASE = [1.3, 1.6, 2, 2.5, 3, 4, 5, 6, 8, 10];
const FLEX_RELIEF = [6, 8, 10, 12, 15, 18, 22, 26, 30, 35];
const 만 = 10000; const 억 = 100000000;
export const FLEX = {
  밤문화: [['동네 호프집 한 턱', 5 * 만], ['노래방 뒤풀이', 10 * 만], ['라이브 바 저녁', 20 * 만], ['클럽 테이블', 50 * 만], ['호텔 바 모임', 100 * 만], ['옥상 파티', 300 * 만], ['회원제 라운지 연회비', 800 * 만], ['요트 파티', 2000 * 만], ['섬을 빌린 파티', 억], ['세계 도시 순회 파티', 5 * 억]],
  쇼핑: [['티셔츠 한 벌', 3 * 만], ['새 운동화', 10 * 만], ['맞춤 정장', 30 * 만], ['가죽 가방', 100 * 만], ['기계식 시계', 300 * 만], ['수입 만년필 세트', 800 * 만], ['보석 한 점', 2000 * 만], ['맞춤 드레스룸', 5000 * 만], ['스포츠카', 3 * 억], ['옷장 전체 맞춤 컬렉션', 10 * 억]],
  수집: [['만화 전집', 3 * 만], ['초판 소설', 10 * 만], ['옛 우표 묶음', 30 * 만], ['오래된 지도', 100 * 만], ['고서 한 질', 300 * 만], ['판화 한 점', 1000 * 만], ['신진 작가 회화', 3000 * 만], ['공룡 화석', 억], ['희귀 고문서', 3 * 억], ['거장의 유화', 20 * 억]],
  // 소유: 사는 값과 매달 유지비. 구단·팀은 전부 가상이다.
  소유: [['동네 야구단 후원', 200 * 만, 10 * 만], ['주말 농장', 500 * 만, 20 * 만], ['캠핑카', 3000 * 만, 50 * 만], ['작은 요트', 2 * 억, 300 * 만], ['경주마 한 마리', 3 * 억, 500 * 만], ['레이싱팀 스폰서', 10 * 억, 2000 * 만], ['지역 축구 구단', 50 * 억, 2 * 억], ['골프장', 200 * 억, 5 * 억], ['개인 스키장', 500 * 억, 10 * 억], ['개인 섬', 1000 * 억, 20 * 억]],
  건강: [['헬스장 일일권', 만], ['한의원 보약', 10 * 만], ['종합 검진', 30 * 만], ['개인 트레이닝 한 달', 100 * 만], ['정밀 검진', 300 * 만], ['전담 트레이너 일 년', 1000 * 만], ['재활 리조트', 3000 * 만], ['전담 주치의 일 년', 억], ['개인 체육관', 5 * 억], ['개인 병동 회원권', 20 * 억]],
  기부: [['동전 모금함', 만], ['연탄 나르기 후원', 5 * 만], ['결식 아동 후원', 10 * 만], ['장학금 한 명', 100 * 만], ['복지관 물품', 500 * 만], ['도서관 책장', 2000 * 만], ['아동 병동 후원', 억], ['학교 강당', 5 * 억], ['장학 재단', 20 * 억], ['공익 재단 설립', 100 * 억]],
};
// 그림 대신 쓰는 표시. 이름(label)과 따로 두어 저장된 소유 목록과 기록 문장은 그대로다.
export const FLEX_BRANCH_ICON = { 밤문화: '🌃', 쇼핑: '🛍️', 수집: '🏺', 소유: '🔑', 건강: '❤️', 기부: '🤝' };
export const FLEX_ICON = {
  밤문화: ['🍺', '🎤', '🎷', '🪩', '🍸', '🎆', '🥂', '🛥️', '🏝️', '🌍'],
  쇼핑: ['👕', '👟', '🤵', '👜', '⌚', '🖋️', '💎', '👗', '🏎️', '🧥'],
  수집: ['📚', '📖', '📮', '🗺️', '📕', '🖌️', '🎨', '🦖', '📜', '🖼️'],
  소유: ['⚾', '🌱', '🚐', '⛵', '🐎', '🏁', '⚽', '⛳', '🎿', '🏖️'],
  건강: ['🏋️', '🍵', '🩺', '💪', '🔬', '🏃', '🧖', '🧑‍⚕️', '🏟️', '🏥'],
  기부: ['🪙', '🔥', '🍚', '✏️', '📦', '📚', '🧸', '🏫', '🎓', '🕊️'],
};
// 미성년이 현실적으로 할 수 있는 단계(사용자 지시 2026-11-08). 숫자는 앞에서부터 몇 단계까지, 배열은 그 단계만.
// 밤문화는 술이 없는 노래방만, 소유는 후원·주말 농장만. 면허·계약·집이 필요한 것은 성인부터.
const MINOR_LEVELS = {
  중학: { 쇼핑: 2, 수집: 2, 건강: 1, 기부: 3 },
  고등: { 쇼핑: 7, 수집: 7, 건강: 6, 기부: 6, 밤문화: [1], 소유: 2 },
};
const minorOk = (st, branch, i) => { const v = MINOR_LEVELS[st]?.[branch]; return Array.isArray(v) ? v.includes(i) : i < (v ?? 0); };
const BIG_MINOR = 100 * 10000; // 미성년이 이 값 이상을 쓰려면 부모님이 내 돈을 아셔야 한다.
const FLEX_TEXT = { 밤문화: '사람들과 밤늦게까지 어울렸다. 연락처가 몇 개 늘었다.', 쇼핑: '한참 고르다 값을 치렀다. 기분이 한결 나아졌다.', 수집: '가져온 것을 책상 위에 놓고 오래 들여다봤다. 찾아볼 것이 늘었다.', 소유: '서류에 이름을 적었다. 관리해 줄 사람들과 인사를 나눴다.', 건강: '몸을 살피는 데 돈을 썼다. 며칠이 지나자 몸이 가벼워졌다.', 기부: '후원한 곳에서 감사 인사 자리에 불렀다. 그 자리에서 몇 사람과 연락처를 나눴다.' };
const FLEX_ACTIONS = [];
for (const [branch, items] of Object.entries(FLEX)) items.forEach(([label, cost, upkeep], i) => {
  const id = `flex_${branch}_${i}`;
  const owned = branch === '소유';
  FLEX_ACTIONS.push({ id, group: '플렉스', branch, level: i + 1, icon: FLEX_ICON[branch][i], label, cost, upkeep: owned ? upkeep : undefined,
    show: (s) => {
      const st = stageOf(s);
      if (!isOpen('플렉스', st)) return false;
      return adult(s) || minorOk(st, branch, i);
    },
    req: (s) => {
      if (owned && s.owned.some((o) => o.id === id)) return LOCK('이미 가지고 있습니다. 번화가 소유 탭에서 정리할 수 있습니다.');
      if (!adult(s) && cost >= BIG_MINOR && !s.flags?.부모_알게됨) return LOCK('큰돈이라 부모님이 내 돈을 아셔야 쓸 수 있습니다.');
      return null;
    },
    run: (s) => {
      up(s, FLEX_STAT[branch], FLEX_BASE[i]);
      s.stress = Math.max(0, s.stress - FLEX_RELIEF[i]);
      s.flexCount[branch] = (s.flexCount[branch] ?? 0) + 1;
      if (owned) s.owned.push({ id, label, upkeep, since: ym(s) });
      return FLEX_TEXT[branch];
    } });
});

// ───────── 미국 대학 유학 준비 (src/abroad.js) ─────────
const ABROAD = [
  { id: 'ab_status', group: '공부', label: '유학 준비 현황', free: true, show: (s) => !!s.abroad && ab.preparing(s), run: (s) => ab.summary(s) },
  { id: 'ab_toefl_study', group: '공부', label: '토플 공부', stress: 3, show: ab.preparing, run: (s) => { up(s, '지능', 0.6); return ab.studyEnglish(s); } },
  { id: 'ab_sat_study', group: '공부', label: 'SAT 문제집', stress: 3, show: (s) => ab.preparing(s) && ym(s) >= 200503, run: (s) => { up(s, '지능', 0.6); return ab.studySat(s); } },
  { id: 'ab_toefl', group: '공부', label: '토플 응시', stress: 4, cost: ab.toeflFee, show: ab.preparing,
    req: (s) => (s.abroad.toeflAt === ym(s) ? LOCK('이번 달에는 이미 봤습니다.') : null),
    run: (s) => { s.abroad.toeflAt = ym(s); const r = ab.takeToefl(s); if (r.refund) s.cash += ab.toeflFee(s); return r.text; } },
  { id: 'ab_sat', group: '공부', label: 'SAT 응시', stress: 4, cost: ab.SAT_FEE, show: (s) => ab.preparing(s) && ym(s) >= 200505,
    req: (s) => (!ab.satOpen(s) ? LOCK('SAT는 1·5·6·10·11·12월에만 봅니다.') : s.abroad.satAt === ym(s) ? LOCK('이번 달에는 이미 봤습니다.') : null),
    run: (s) => { s.abroad.satAt = ym(s); return ab.takeSat(s).text; } },
  { id: 'ab_essay', group: '공부', label: '유학 에세이 쓰기', stress: 3, show: (s) => ab.preparing(s) && ab.essayOpen(s), run: (s) => { up(s, '매력', 0.5); return ab.writeEssay(s); } },
  { id: 'ab_serve', group: '공부', label: '봉사 활동', stress: 1, show: ab.preparing, req: (s) => (s.abroad.serveAt === ym(s) ? LOCK('이번 달에는 이미 했습니다.') : null),
    run: (s) => { s.abroad.serveAt = ym(s); s.abroad.serve += 1; up(s, '인맥', 0.6); return '주말에 복지관에서 아이들 숙제를 봐 주었다. 봉사 시간 확인서에 도장을 받았다.'; } },
  { id: 'ab_camp', group: '공부', label: '미국 서머캠프 (3주)', stress: -2, cost: 600 * 10000,
    show: (s) => ab.preparing(s) && [7, 8].includes(s.month) && !s.abroad.camp,
    req: (s) => (!s.flags.부모_알게됨 ? LOCK('큰돈이라 부모님이 내 돈을 아셔야 쓸 수 있습니다.') : null),
    run: (s) => { s.abroad.camp = true; up(s, '인맥', 1.5); up(s, '매력', 1); s.abroad.eng = Math.min(100, s.abroad.eng + 8); return '미국 대학 기숙사에서 3주를 지냈다. 여러 나라에서 온 학생들과 같은 방을 썼고, 마지막 날 서로 메일 주소를 적어 주었다.'; } },
];
const ALL = [...BASIC, ...ABROAD, ...WORK, ...SCHOOL, ...ELECTION_ACTIONS, ...DRESS_ACTIONS, ...NETWORK, ...MEET_ACTIONS, ...FLEX_ACTIONS, ...PLAY_ACTIONS, ...OTHER, ...OFFICE_ACTIONS];
const BY_ID = new Map(ALL.map((a) => [a.id, a]));
const costOf = (a, s) => (typeof a.cost === 'function' ? a.cost(s) : a.cost ?? 0);

function check(s, a) {
  if (s.ended) return LOCK('이야기가 끝났습니다.');
  if (a.show && !a.show(s)) return LOCK('지금은 할 수 없습니다.');
  if (inArmy(s) && !a.army) return LOCK('복무 중에는 할 수 없습니다.');
  const r = a.req?.(s);
  if (r) return r;
  if (a.route) return { ok: true };
  if (!a.free && s.used >= s.capacity) return LOCK('이번 달 활동 칸을 다 썼습니다.');
  if (costOf(a, s) > s.cash) return LOCK('돈이 모자랍니다.');
  return { ok: true };
}
// 지금 보일 항목 전부. 잠긴 것은 ok:false와 why/need가 붙는다. 화면은 why를 칩으로 그린다.
export function listActions(s, group) {
  return ALL.filter((a) => (!group || a.group === group) && (!a.show || a.show(s))).map((a) => {
    const c = check(s, a);
    return { id: a.id, group: a.group, label: a.label, cost: costOf(a, s), upkeep: a.upkeep ?? null, branch: a.branch ?? null, level: a.level ?? null, icon: a.icon ?? null, kind: a.kind ?? null, at: a.at ?? null, route: a.route ?? null, free: !!a.free, ok: c.ok, why: c.why ?? null, need: c.need ?? null };
  });
}
export const canAction = (s, id) => { const a = BY_ID.get(id); return a ? check(s, a) : LOCK('없는 활동입니다.'); };
// 활동 칸 1개와 비용을 쓰고 결과 문장을 돌려준다. route가 있으면 칸을 쓰지 않고 그 화면으로 보낸다.
export function doAction(s, id) {
  const a = BY_ID.get(id);
  if (!a) return LOCK('없는 활동입니다.');
  const c = check(s, a);
  if (!c.ok) return c;
  if (a.route) return { ok: true, id, route: a.route, text: '' };
  if (!a.free) s.used += 1;
  s.cash -= costOf(a, s);
  const { out, effects } = runWithEffects(s, a);
  return { ok: true, id, label: a.label, icon: a.icon ?? null, text: typeof out === 'string' ? out : out.text, met: typeof out === 'string' ? null : out.met, exam: out.exam ?? null, effects };
}
function runWithEffects(s, a) {
  const stats = { ...s.stats }, stress = s.stress;
  const out = a.run(s);
  if (a.stress) addStress(s, a.stress);
  const slots = growCapacity(s, stats.체력);
  return { out, effects: { stats: STATS.filter((k) => s.stats[k] > stats[k]), gains: statGains(stats, s.stats), stress: Math.round((s.stress - stress) * 10) / 10, slots, marks: stepsCrossed(stats, s.stats) } };
}
// 활동을 고르기 전에 보여 줄 효과. 실제 상태는 건드리지 않는다. 화면 이동 항목은 null.
export function previewAction(s, id) {
  const a = BY_ID.get(id);
  if (!a || a.route) return null;
  const c = JSON.parse(JSON.stringify(s));
  c.stress = 50; // 0이나 100에 걸려 변화가 잘리지 않게 가운데서 잰다
  dry = true;
  try { const f = runWithEffects(c, a).effects; return { stats: f.stats, gains: f.gains, stress: f.stress }; } finally { dry = false; }
}
const GROUP_WHY = { 놀기: '학생 때만 열립니다.', '다른 학교': '고등학교부터 열립니다.', 꾸미기: '고등학교부터 열립니다.', 만남: '고등학교부터 열립니다.', 플렉스: '고등학교부터 열립니다.', '인맥 관리': '대학부터 열립니다.' };
// 홈의 9개 버튼: 이름, 시기별 이름, 잠금, 세부 목록.
export function groups(s) {
  const st = stageOf(s);
  return ACTIVITIES.map((name) => {
    const open = isOpen(name, st);
    const actions = open ? listActions(s, name) : [];
    const blocked = open && inArmy(s) && !actions.some((a) => a.ok);
    return { name, label: inArmy(s) && name === '학교' ? '부대' : labelOf(name, st), open: open && !blocked, why: !open ? GROUP_WHY[name] ?? null : blocked ? '복무 중에는 할 수 없습니다.' : null, actions };
  });
}
// 옛 버튼(act)용: 그 갈래에서 지금 할 수 있는 첫 항목. 없으면 첫 항목.
export function defaultAction(s, group) {
  const list = listActions(s, group);
  return (list.find((a) => a.ok) ?? list[0])?.id ?? null;
}
// 소유 플렉스.
export const ownedList = (s) => s.owned.map((o) => ({ ...o }));
export function releaseOwned(s, id) {
  const before = s.owned.length;
  s.owned = s.owned.filter((o) => o.id !== id);
  return s.owned.length < before ? { ok: true, text: '정리하기로 했다. 매달 나가던 돈이 멈췄다.' } : LOCK('가지고 있지 않습니다.');
}
export const upkeepOf = (s) => s.owned.reduce((a, o) => a + o.upkeep, 0);
// 달이 바뀔 때 호출. 유지비가 모자라면 그 항목을 놓는다.
export function monthly(s) {
  for (const o of [...s.owned]) {
    if (s.cash >= o.upkeep) s.cash -= o.upkeep;
    else { s.owned = s.owned.filter((x) => x !== o); s.log.push(`유지비를 낼 수 없어 ${o.label}을(를) 정리했습니다.`); }
  }
}

// ───────── 계산대 미니게임 자료 (화면이 문제를 내고, 맞힌 수를 doShop으로 넘긴다) ─────────
export function cashierRound(s, n = 0) {
  const k = (s.year * 13 + s.month * 7 + n * 31) % 9;
  const price = (k + 2) * 700;
  const paid = price <= 5000 ? 5000 : 10000;
  return { price, paid, answer: paid - price, choices: [paid - price, paid - price + 500, Math.max(100, paid - price - 300)] };
}
export function doShop(s, correct = 0, total = 0) {
  const r = doAction(s, 'shop_help');
  if (!r.ok || !total) return r;
  const bonus = Math.round((PAY[stageOf(s)] * correct) / total / 2 / 100) * 100; // 용돈은 100원에서 끊는다.
  s.cash += bonus;
  return { ...r, text: correct === total ? '거스름돈을 한 번도 틀리지 않았다. 엄마가 용돈을 조금 더 얹어 주셨다.' : r.text };
}

// ───────── 지도 자료: 장소별로 할 수 있는 활동 ─────────
const PLACES = [
  { id: 'home', name: '집', groups: ['공부', '휴식'] }, { id: 'park', name: '공원', groups: ['운동'] },
  { id: 'work', name: '일터', groups: ['과외 알바'] }, { id: 'school', name: '학교', groups: ['학교'] },
  { id: 'shop', name: '상가', groups: ['꾸미기'] }, { id: 'cafe', name: '카페', groups: ['인맥 관리', '만남'] }, { id: 'town', name: '번화가', groups: ['플렉스', '놀기'] },
  { id: 'other', name: '다른 학교', groups: ['다른 학교'] },
];
// 운동장에는 학교 운동 활동과 평범한 운동(group '운동')을 함께 둔다. 어느 학교든 운동장에서 할 일이 있어야 한다.
const IN_SCHOOL = [
  { id: 'classroom', name: '교실', match: /^(exam|class|present|friend|night_study)/ },
  { id: 'lab', name: '특별실', match: /^(project|choir|club_(?!운동))/, ca: ['ca_sci', 'ca_bcast', 'ca_serve'] },
  { id: 'hall', name: '강당', match: /^help/ },
  { id: 'ground', name: '운동장', match: /^(runclub|pe|gym|club_운동|exercise)/, ca: ['ca_sport'] },
];
export function placesOf(s) {
  const all = groups(s);
  const list = PLACES.map((p) => { const g = all.filter((x) => p.groups.includes(x.name)); return { id: p.id, name: p.id === 'other' ? otherName(s) : p.id === 'home' && s.parentsHome && !s.family?.home ? s.parentsHome.name : p.name, open: g.some((x) => x.open), actions: g.flatMap((x) => x.actions) }; });
  // 서울 지도의 광화문 사무소. 힐아일랜드에 계좌를 맡긴 뒤에만 있다.
  if (officeOpen(s)) list.push({ id: 'hill', name: officeName(s), seoul: true, open: !inArmy(s), actions: listActions(s, '광화문') });
  return list;
}
export function schoolPlacesOf(s) {
  const list = [...listActions(s, '학교'), ...listActions(s, '운동')];
  const hit = (p, a) => (a.at ? a.at === p.id : a.id === 'ca' ? !!p.ca?.some((k) => s.flags[k]) : p.match.test(a.id));
  const promoFirst = (a, b) => (b.kind === 'promo') - (a.kind === 'promo'); // 선거 홍보를 맨 위에 둔다
  return IN_SCHOOL.map((p) => ({ id: p.id, name: p.name, actions: list.filter((a) => hit(p, a)).sort(promoFirst) }));
}
// ───────── 이야기가 벌어지는 곳 ─────────
// 이벤트에 place 칸이 있으면 그것을 쓴다. 없으면 제목, 다음은 본문으로 나눈다. 같은 이벤트는 언제나 같은 곳에 놓인다.
const STORY_PLACE = [
  [/알바|아르바이트|현장실습|출근|창업|폐업|개업|프리랜서|과외/, 'work'],
  [/운동회|체육대회|계주|달리기|체력검사|신체검사|육상|축구|이어달리기/, 'ground'],
  [/선거|당선|낙선|투표 날|후보|입학식|졸업식|축제|무대|학예회|종업식|학생회|회장|총회|새터|MT|박람회|개강/, 'hall'],
  [/과학|탐구|실험|경시|망원경|방송|동아리|특별활동|퀴즈|물로켓|학회|연구|로켓|컴퓨터|밴드|합창|피아노/, 'lab'],
  [/시험|성적|상담|원서|첫날|자율학습|수강|통지표|수능|모의|조교|라이벌|수업/, 'classroom'],
  [/설날|추석|일기|뉴스|월드컵|올림픽|속보|편지|메일|미니홈피|문자|이사|전세|건강|부모님|생신|신문|휴업|휴일|방학|놀토|독일전|투표/, 'home'],
];
const STORY_TEXT = [
  [/운동장|체육 시간|계주/, 'ground'], [/강당|체육관|조회/, 'hall'], [/과학실|실험실|음악실|방송실|도서실|연구실/, 'lab'],
  [/교실|쉬는 시간|칠판|담임/, 'classroom'], [/부엌|식탁|안방|저녁을 먹/, 'home'], [/카페|커피/, 'cafe'], [/공원|한강/, 'park'], [/가게|식당|사무실/, 'work'],
];
const SCHOOL_SPOTS = ['classroom', 'lab', 'hall', 'ground'];
export const STORY_PLACES = [...SCHOOL_SPOTS, ...PLACES.map((p) => p.id), 'hill'];
// 이벤트 하나의 기본 자리(시기와 무관한 값).
export const basePlaceOf = (e) => e.place ?? STORY_PLACE.find(([re]) => re.test(e.title ?? ''))?.[1] ?? STORY_TEXT.find(([re]) => re.test(e.text ?? ''))?.[1] ?? null;
// 지금 갈 수 있는 곳으로 맞춘다. 학교 칸은 학기 중만, 그 밖의 칸은 열린 곳만. 못 가면 집에서 본다(이야기는 못 보는 일이 없어야 한다).
export function storyPlaceOf(s, e) {
  const atSchool = enrolled(s) && !isVacation(s), base = basePlaceOf(e);
  if (!base) return atSchool ? 'classroom' : 'home';
  if (SCHOOL_SPOTS.includes(base)) return atSchool ? base : 'home';
  if (base === 'home') return base;
  return placesOf(s).find((p) => p.id === base)?.open ? base : atSchool ? 'classroom' : 'home';
}

// 활동 칸 무료 충전(사용자 지시 2026-11-11): 칸을 다 쓴 달에 한 번, 1칸을 되돌려 준다.
const ymNow = (s) => s.year * 100 + s.month;
export const canRefill = (s) => !s.ended && s.capacity - s.used <= 0 && s.flags?.칸충전 !== ymNow(s);
export function refill(s) {
  if (!canRefill(s)) return { ok: false, why: s.flags?.칸충전 === ymNow(s) ? '이번 달 충전은 이미 썼습니다.' : '아직 남은 칸이 있습니다.' };
  s.flags.칸충전 = ymNow(s); s.used = Math.max(0, s.used - 1);
  return { ok: true, text: '숨을 돌리고 다시 힘을 냈다. 활동 칸이 하나 생겼다.' };
}
// 홈 자료: 남은 칸과 이번 달 할 일.
export function homeBrief(s) {
  const list = listActions(s);
  const todo = [];
  if (list.some((a) => a.kind === 'promo' && a.ok)) todo.push('선거 홍보');
  if (list.some((a) => a.id === 'project' && a.ok)) todo.push('탐구 과제 기록');
  if (s.promises.length) todo.push('약속 있음');
  const left = s.capacity - s.used;
  const birth = s.birthYear ?? 1989;
  return { slotsLeft: left, capacity: s.capacity, tired: Math.floor(s.stress), tiredFull: s.stress >= 100, todo, finishPrompt: left <= 0, age: s.year - birth, monthsLeft: (2026 - s.year) * 12 + 12 - s.month };
}
