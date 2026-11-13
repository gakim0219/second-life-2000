// 학교 달력, 학기별 공부, 시험과 성적, 인지도 단계. 달력은 design/00_학교달력_조사.md 확정값을 달 단위로 쓴다.
import { stageOf, tierOf, labelOf } from './rules.js';

// ───────── 방학 ─────────
// 달 단위 게임이라 한 달의 절반 넘게 쉬는 달만 방학 달로 친다. 표시용 날짜는 그대로 보여 준다.
const VACATION = {
  초등: { months: [1, 8], summer: '7/19~8/25', winter: '12월 하순~2월 초' },
  중학: { months: [1, 8], summer: '7/20~8/23', winter: '12월 하순~2월 초' },
  고등: { months: [1, 8], summer: '7/17~8/18', winter: '12/28~2/5' },
  대학: { months: [1, 2, 7, 8], summer: '6월 하순~8월 말', winter: '12월 하순~2월 말' },
};
const isMit = (s) => s.school?.대학 === 'MIT';
export const inArmy = (s) => !!s.flags?.군입대 && !s.flags?.전역;
// 학생인가: MIT는 2008.9 입학, 복무 중은 학교에 없다.
export function enrolled(s) {
  const st = stageOf(s);
  if (st === '사회인') return false;
  if (inArmy(s)) return false;
  if (st === '대학' && isMit(s) && s.year * 100 + s.month < 200809) return false;
  return true;
}
export function isVacation(s) {
  const st = stageOf(s);
  if (st === '사회인') return false;
  if (st === '대학' && isMit(s)) return [1, 6, 7, 8].includes(s.month);
  return VACATION[st].months.includes(s.month);
}
// 탐구 과제는 방학식이 있는 7월부터 할 수 있다.
export const isProjectSeason = (s) => stageOf(s) === '중학' && [1, 7, 8].includes(s.month);

// ───────── 놀토 ─────────
export function noltoOf(year, month) {
  const v = year * 100 + month;
  if (v < 200503) return 0;
  if (v < 200603) return 1;
  if (v < 201203) return 2;
  return 4;
}

// ───────── 명절 (용돈 연결 지점) ─────────
const SEOLLAL = { 2000: 2, 2001: 1, 2002: 2, 2003: 2, 2004: 1, 2005: 2, 2006: 1, 2007: 2, 2008: 2, 2009: 1, 2010: 2, 2011: 2, 2012: 1, 2013: 2, 2014: 1, 2015: 2, 2016: 2, 2017: 1, 2018: 2, 2019: 2, 2020: 1, 2021: 2, 2022: 2, 2023: 1, 2024: 2, 2025: 1, 2026: 2 };
const CHUSEOK = { 2000: 9, 2001: 10, 2002: 9, 2003: 9, 2004: 9, 2005: 9, 2006: 10, 2007: 9, 2008: 9, 2009: 10, 2010: 9, 2011: 9, 2012: 9, 2013: 9, 2014: 9, 2015: 9, 2016: 9, 2017: 10, 2018: 9, 2019: 9, 2020: 10, 2021: 9, 2022: 9, 2023: 9, 2024: 9, 2025: 10, 2026: 9 };
export function holidaysOf(s) {
  const out = [];
  if (SEOLLAL[s.year] === s.month) out.push('설날');
  if (CHUSEOK[s.year] === s.month) out.push('추석');
  if (s.birthMonth === s.month) out.push('생일');
  return out;
}

// ───────── 학기 ─────────
export function termOf(s) {
  const st = stageOf(s);
  if (st === '대학' && isMit(s)) return s.month <= 8 ? '봄학기' : '가을학기';
  if (st === '대학') return s.month <= 8 ? '1학기' : '2학기';
  return s.month <= 7 ? '1학기' : '2학기';
}
// 학기별 공부 %가 0으로 돌아가는 달. 사용자 지시: 해가 바뀌면 1학기, 여름이 지나면 2학기다.
// 1·2월은 새 학기 준비로 치고, 여기서 쌓은 공부는 1학기 시험에 들어간다.
function isTermStart(s) {
  if (stageOf(s) === '대학') return [1, 9].includes(s.month);
  return [1, 8].includes(s.month);
}
// 등록금은 실제 개강 달에 낸다.
const isTuitionMonth = (s) => (isMit(s) ? [2, 9] : [3, 9]).includes(s.month);
// 지능 구간이 높을수록 빨리 오른다. 서울대·MIT는 폭이 조금 작다.
const STUDY_RATE = [6, 7, 8, 9, 10, 11, 12];
export function studyGain(s) {
  const st = stageOf(s);
  let g = STUDY_RATE[tierOf(s.stats.지능) - 1];
  if (st === '대학' && ['서울대', 'MIT'].includes(s.school?.대학)) g *= 0.8;
  if (st === '대학' && s.flags?.['수강:많이']) g *= 1.2;
  if (st === '대학' && s.flags?.['수강:적게']) g *= 0.8;
  return g;
}
export function capacityBonus(s) {
  if (stageOf(s) !== '대학' || !enrolled(s)) return 0;
  return s.flags?.['수강:적게'] ? 1 : s.flags?.['수강:많이'] ? -1 : 0;
}

// ───────── 시험 ─────────
export function examOf(s) {
  if (!enrolled(s)) return null;
  const st = stageOf(s); const m = s.month;
  if (st === '초등') return [4, 6, 10, 12].includes(m) ? '단원평가' : null;
  if (st === '대학' && isMit(s)) return m === 3 || m === 10 ? '중간고사' : m === 5 || m === 12 ? '기말고사' : null;
  if (st === '중학' && s.year === 2002) { // 2002 월드컵으로 기말을 7월 초로 미뤘다.
    if (m === 6) return null;
    if (m === 7) return '기말고사';
  }
  return m === 4 || m === 10 ? '중간고사' : m === 6 || m === 12 ? '기말고사' : null;
}
const CLASS_SIZE = 35;
const DEPT_SIZE = 40; // 대학은 학과 석차
const rankOf = (percent, size) => 1 + Math.round(((100 - Math.min(100, percent)) / 100) * (size - 1));
// 시험 기록 하나를 '반 11등' 꼴로. 옛 저장의 초등 기록에는 등수가 없다.
export const rankText = (x) => (x.rank ? `${x.gpa != null ? '학과' : '반'} ${x.rank}등` : null);
export const sizeOfRank = (x) => (x.gpa != null ? DEPT_SIZE : CLASS_SIZE);
export function gradeOf(p) { return p >= 85 ? '수' : p >= 70 ? '우' : p >= 50 ? '미' : p >= 30 ? '양' : '가'; }
export function gpaOf(p) {
  const lerp = (a, b, x, y) => a + ((p - x) / (y - x)) * (b - a);
  const v = p >= 90 ? lerp(4.3, 4.5, 90, 100) : p >= 75 ? lerp(3.7, 4.2, 75, 89.99) : p >= 55 ? lerp(3.0, 3.6, 55, 74.99) : p >= 35 ? lerp(2.0, 2.9, 35, 54.99) : lerp(0, 1.9, 0, 34.99);
  return Math.round(Math.min(4.5, v) * 10) / 10;
}
const ELEM_NOTE = { 수: '꼼꼼하게 익혔습니다.', 우: '대부분 잘 이해했습니다.', 미: '기본은 잘 따라왔습니다.', 양: '조금 더 살펴보면 좋겠습니다.', 가: '함께 다시 짚어 보면 좋겠습니다.' };
// 시험 판정. 학기별 공부 %만으로 정한다. pct를 주면 그 값으로 미리 볼 수 있다.
export function examResult(s, pct = s.study, kind = examOf(s)) {
  const percent = Math.round(pct);
  const st = stageOf(s);
  const grade = gradeOf(percent);
  const band = percent >= 70 ? '상' : percent >= 40 ? '중' : '하';
  if (st === '초등') return { stage: st, kind: kind ?? '단원평가', percent, grade: null, rank: rankOf(percent, CLASS_SIZE), classSize: CLASS_SIZE, note: ELEM_NOTE[grade], band };
  if (st === '대학') {
    const gpa = gpaOf(percent);
    return { stage: st, kind: kind ?? '시험', percent, gpa, grade: null, rank: rankOf(percent, DEPT_SIZE), classSize: DEPT_SIZE, scholarship: percent >= 90 ? 1 : percent >= 75 ? 0.5 : 0, warning: percent < 35, band };
  }
  const rank = rankOf(percent, CLASS_SIZE);
  return { stage: st, kind: kind ?? '시험', percent, grade, rank, classSize: CLASS_SIZE, band };
}
const line = (r, term, year) => (r.stage === '초등'
  ? `${year}년 ${term} ${r.kind}: 반 ${r.rank}등. ${r.note}`
  : r.stage === '대학'
    ? `${year}년 ${term} ${r.kind}: 평점 ${r.gpa}, 학과 ${r.rank}등.`
    : `${year}년 ${term} ${r.kind}: ${r.grade}, 반 ${r.rank}등.`);
// 이번 달 시험을 이미 봤는가.
export const examTaken = (s) => s.termExams.some((e) => e.year === s.year && e.month === s.month);
export const examPending = (s) => !!examOf(s) && !examTaken(s);
// 교실의 '시험 보기'. 그동안 쌓은 공부 %로 성적이 정해진다. 활동 칸을 쓰지 않는다.
export function takeExam(s) {
  if (!examPending(s)) return null;
  const kind = examOf(s);
  const r = examResult(s, s.study, kind);
  const term = termOf(s);
  s.termExams.push({ year: s.year, month: s.month, term, kind, percent: r.percent, grade: r.grade, rank: r.rank, gpa: r.gpa ?? null });
  // 성적표 장면은 학기말에만 나온다.
  if (kind === '기말고사' || s.month === 6 || s.month === 12) s.lastExam = { at: s.year * 12 + s.month + 1, band: r.band };
  s.log.push(line(r, term, s.year));
  if (r.stage === '대학' && kind === '기말고사') {
    s.scholarship = r.scholarship;
    if (r.warning) { s.warnings += 1; s.flags.학사경고 = true; s.log.push(s.warnings >= 3 ? '학사 경고가 세 번째입니다. 학과 사무실에서 제적 이야기를 꺼냈습니다.' : '학사 경고를 받았습니다.'); }
    if (r.scholarship === 1) s.log.push('다음 학기 성적 장학금 전액이 나옵니다.');
    else if (r.scholarship > 0) s.log.push('다음 학기 성적 장학금 절반이 나옵니다.');
  }
  return { ...r, line: line(r, term, s.year) };
}
// 달을 넘기기 직전에 호출. 시험을 안 보고 넘기면 그때까지의 공부 %로 치른 것으로 친다.
export const closeMonth = (s) => takeExam(s);
// 이번 학기 마지막 시험까지 봤는가.
export const termExamsDone = (s) => s.termExams.some((e) => e.kind === '기말고사' || e.month === 6 || e.month === 12);
function archiveTerm(s, stage) {
  if (!s.termExams.length) return;
  const avg = Math.round(s.termExams.reduce((a, b) => a + b.percent, 0) / s.termExams.length);
  const last = s.termExams[s.termExams.length - 1];
  s.terms.push({ stage, year: s.termExams[0].year, term: last.term, percent: avg, exams: s.termExams, grade: stage === '중학' || stage === '고등' ? gradeOf(avg) : null, rank: last.rank, gpa: last.gpa });
  s.termExams = [];
}
// 고교 3년 공부 평균. 서울대 보조 기록에 쓴다. 기록이 없으면 지금 %를 본다.
export function studyAvg(s) {
  const list = (s.terms ?? []).filter((t) => t.stage === '고등');
  if (!list.length) return s.study;
  return list.reduce((a, b) => a + b.percent, 0) / list.length;
}
// ───────── 등록금 (임시값) ─────────
const TUITION = { 서울대: 2500000, MIT: 20000000, 한빛대: 3800000, 새길실무대: 2900000 };
function payTuition(s) {
  const due = TUITION[s.school?.대학];
  if (!due) return;
  const bill = Math.round(due * (1 - (s.scholarship ?? 0)));
  s.scholarship = 0;
  const paid = Math.min(Math.max(0, s.cash), bill);
  s.cash -= paid; s.lastTuition = { school: s.school.대학, ym: s.year * 100 + s.month, paid };
  s.log.push(paid < bill ? '등록금 고지서가 왔습니다. 모자란 만큼은 부모님이 보태 주셨습니다.' : bill < due ? '장학금 덕분에 등록금 부담이 줄었습니다.' : '등록금을 냈습니다.');
}
// 날짜가 바뀐 직후 호출. 학기·학교가 바뀌면 %와 인지도를 정리한다.
export function rollTerm(s, before, after) {
  const changed = before !== after;
  // 옛 저장은 3월에 넘어가던 지난 학기 시험을 들고 있을 수 있다. 학기가 달라졌으면 함께 정리한다.
  const stale = s.termExams.length > 0 && s.termExams[0].term !== termOf(s);
  if (changed || isTermStart(s) || stale) {
    if (before !== '사회인') archiveTerm(s, before);
    if (s.study > 0 && before !== '사회인' && !changed) s.log.push('학기가 끝났습니다. 공부는 새 학기에 처음부터 다시 쌓입니다.');
    s.study = 0;
    delete s.flags?.학사경고;
  }
  if (changed) { s.fame = 0; s.pair = null; s.stageStats = null; }
  // 새길실무대는 2년제다. 남자는 입대 뒤 2012년에 사회로 나간다.
  if (after === '대학' && changed && s.school?.대학 === '새길실무대') s.graduateYear = s.sex === '남' ? 2012 : 2010;
  if (after === '대학' && enrolled(s) && isTuitionMonth(s)) payTuition(s);
}
// 성적표 화면 자료.
export function reportCard(s) {
  const st = stageOf(s);
  const gpas = (s.terms ?? []).filter((t) => t.stage === '대학' && t.gpa != null).map((t) => t.gpa);
  return {
    stage: st,
    current: enrolled(s) ? { term: termOf(s), percent: Math.round(s.study), exams: s.termExams, taken: examTaken(s), done: termExamsDone(s), preview: examResult(s, s.study, examOf(s) ?? '시험') } : null,
    history: s.terms ?? [],
    gpa: gpas.length ? Math.round((gpas.reduce((a, b) => a + b, 0) / gpas.length) * 100) / 100 : null,
    warnings: s.warnings ?? 0,
    scholarship: s.scholarship ?? 0,
  };
}
// 홈과 학교 화면의 달력 표시.
export function calendar(s) {
  const st = stageOf(s);
  const vac = st === '사회인' ? null : VACATION[st];
  const v = isVacation(s);
  const notes = [];
  const n = noltoOf(s.year, s.month);
  if (['고등'].includes(st) && n === 1) notes.push('이번 달 넷째 토요일은 놀토');
  if (['고등'].includes(st) && n === 2) notes.push('둘째·넷째 토요일은 놀토');
  const exam = examOf(s);
  if (exam) notes.push(`이번 달 ${exam}`);
  return {
    stage: st, label: labelOf('학교', st), school: s.school?.[st] ?? null, term: enrolled(s) ? termOf(s) : null, vacation: v,
    vacationName: v ? (s.month <= 2 ? '겨울방학' : '여름방학') : null,
    vacationPeriod: v && vac ? (s.month <= 2 ? vac.winter : vac.summer) : null,
    nolto: ['초등', '중학', '고등'].includes(st) ? n : 0, exam, holidays: holidaysOf(s), notes,
  };
}

// ───────── 인지도 ─────────
// 상대 후보 인지도. 클수록 어렵다. 대학 총학은 고교보다 훨씬 높다.
export const RIVAL = { 초6: 30, 중2: 50, 고2: 70, 고2과학고: 55, 대학: 90 };
function rivalOf(s) {
  const st = stageOf(s);
  if (st === '초등') return RIVAL.초6;
  if (st === '중학') return RIVAL.중2;
  if (st === '고등') return Object.values(s.school).includes('서울과학고') ? RIVAL.고2과학고 : RIVAL.고2;
  return RIVAL.대학;
}
export const fameTotal = (s) => (s.fame ?? 0) + (s.pair?.fame ?? 0);
// 숫자는 숨기고 3단계로만 보여 준다.
export function fameLevel(s) {
  const f = fameTotal(s); const r = rivalOf(s);
  return f >= r ? '높음' : f >= r / 2 ? '중간' : '낮음';
}
