// 코딩 이야기. 코딩 공부 횟수가 쌓이면 하나씩 열린다. 장면은 data/events_school.js의 code_* 이다.
// 국내 대회 입상 -> 국가대표 선발 -> 국제정보올림피아드(그해 실제 개최지) 순서로 이어진다.
import { stageOf } from './rules.js';
export const IOI = { 2002: 8, 2003: 8, 2004: 9, 2005: 8, 2006: 8, 2007: 8 }; // 해마다 열린 달
export const CONTEST_MONTH = 9, SELECT_MONTH = 5;
const school = (s) => ['중학', '고등'].includes(stageOf(s));
const once = (s, flag, id) => { s.flags[flag] = true; s.queue.unshift(id); };
// 대회 카드 인물. 게임 안 명단에 넣지 않고 대회 장면에만 나온다. 라이벌 그림은 실사가 아닌 일러스트만 쓴다.
export const IOI_CAST = {
  prof: { name: '남궁현 교수', team: '대표팀 지도 교수', art: 'ioi-p-prof' },
  seoha: { name: '윤서하', team: '대표팀 조교 선배', art: 'ioi-p-seoha' },
  hyunsoo: { name: '도현수', team: '한국 대표 · 라이벌', art: 'ioi-p-hyunsoo' },
  seah: { name: '임세아', team: '한국 대표 · 조용한 천재', art: 'ioi-p-seah' },
  taeo: { name: '곽태오', team: '한국 대표 · 분위기 메이커', art: 'ioi-p-taeo' },
  dmitri: { name: '드미트리', team: '러시아 대표', art: 'ioi-p-dmitri' },
  chenhao: { name: '천하오', team: '중국 대표', art: 'ioi-p-chenhao' },
  emily: { name: '에밀리', team: '미국 대표', art: 'ioi-p-emily' },
  // 성인이 되어 다시 만날 때의 모습. 실사 그림은 이쪽에만 쓴다.
  hyunsoo_a: { name: '도현수', team: '스타트업 대표', art: 'ioi-a-hyunsoo' },
  seah_a: { name: '임세아', team: 'AI 연구자', art: 'ioi-a-seah' },
  taeo_a: { name: '곽태오', team: '게임회사 개발자', art: 'ioi-a-taeo' },
  dmitri_a: { name: '드미트리', team: '실리콘밸리 엔지니어', art: 'ioi-a-dmitri' },
  chenhao_a: { name: '천하오', team: '상하이 창업가', art: 'ioi-a-chenhao' },
  emily_a: { name: '에밀리', team: '테크 기업 임원', art: 'ioi-a-emily' },
};
// 최종 점수: 지능 + 대회에서 고른 전략. 같은 지능이어도 메달이 달라진다.
export function scoreOf(s) {
  const f = s.flags, iq = s.stats.지능;
  let v = iq + (f.코딩전략 ? 12 : 0);
  if (f.코딩1일차넘김) v += 8; else if (f.코딩1일차집착) v += iq >= 140 ? 8 : -4;
  if (f.코딩2일차수정) v += iq >= 126 ? 15 : -10;
  return v;
}
export const medalOf = (score) => (score >= 165 ? 'gold' : score >= 135 ? 'silver' : score >= 110 ? 'bronze' : 'none');
// 2일 차 선택 뒤 부른다. 한 번 나가면 다시 나가지 않는다.
export function finishIoi(s) {
  const id = `code_ioi_${s.year}_${medalOf(scoreOf(s))}`;
  for (const k of ['코딩전략', '코딩1일차넘김', '코딩1일차집착', '코딩2일차수정']) delete s.flags[k];
  s.flags.코딩출전완료 = true; s.queue.unshift(id);
  return id;
}

export function onMonth(s) {
  const n = s.codeStudy ?? 0, f = s.flags, iq = s.stats.지능;
  if (s.queue.some((q) => q.startsWith('code_'))) return s;
  // 결과가 먼저다. 출전이나 합숙 다음 달에 나온다.
  if (f.코딩대회출전) { delete f.코딩대회출전; s.queue.unshift(iq >= 76 ? 'code_contest_win' : 'code_contest_lose'); return s; }
  if (f.코딩합숙) {
    delete f.코딩합숙; s.used = Math.max(s.used, Math.ceil(s.capacity / 2));
    if (iq >= 101) { f.코딩대표 = s.year; s.queue.unshift('code_select_win'); } else s.queue.unshift('code_select_lose');
    return s;
  }
  if (f.코딩대표 === s.year && IOI[s.year] === s.month) { delete f.코딩대표; s.queue.unshift(`code_ioi_open_${s.year}`); return s; }
  if (f.코딩대표 && f.코딩대표 !== s.year) delete f.코딩대표;
  if (n >= 3 && !f.코딩첫프로그램) { once(s, '코딩첫프로그램', 'code_first'); return s; }
  if (n >= 6 && !f.코딩홈페이지) { once(s, '코딩홈페이지', 'code_home'); return s; }
  if (n >= 10 && school(s) && !f.코딩성적표) { once(s, '코딩성적표', 'code_grade'); return s; }
  if (n >= 15 && school(s) && s.month === CONTEST_MONTH && !f.코딩입상) { s.queue.unshift('code_contest'); return s; }
  if (n >= 20 && school(s) && f.코딩입상 && s.month === SELECT_MONTH && IOI[s.year] && !f.코딩대표 && !f.코딩출전완료) { s.queue.unshift('code_select'); return s; }
  return s;
}
