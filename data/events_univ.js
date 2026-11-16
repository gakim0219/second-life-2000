// 대학(한성대·NIT)과 사회인 이야기. 태산대·신라전문대는 이야기가 없다.
// 대학 이름과 인물·사건은 모두 가상이다. 능력 상승 숫자는 문구에 쓰지 않는다.
//
// 달력 약속
// - 한성대는 3월 학기 시작. 남자는 대2를 마치고 2010.3 입대, 2011.12 전역, 2012.3 복학이라 대3·대4가 2012·2013년이다.
// - NIT는 9월 학기 시작. 남자는 2010.6 입대, 2012.3 전역, 2012.9 복학.
// - 졸업: 한성대 여 2012.2, 남 2014.2 / NIT 여 2012.6, 남 2014.6. 진로에서 '1년 더'를 고르면 한 해 뒤.
// 플래그 약속
// - '이야기대학': 한성대·NIT 이야기에 들어왔다는 표시(입학 장면에서 켜짐).
// - '군입대' / '전역': 군 복무 중 = 군입대가 있고 전역이 없음.
// - '진로:창업|대학원|프리랜서|1년더', '졸업:한성대|NIT'.
const SNU = '한성대';
const NIT = 'NIT';
const SEX_KEY = { 여: 'f', 남: 'm' };
const SNU_YEAR = { 1: { 여: 2008, 남: 2008 }, 2: { 여: 2009, 남: 2009 }, 3: { 여: 2010, 남: 2012 }, 4: { 여: 2011, 남: 2013 } };
const NIT_SPRING = { 1: { 여: 2009, 남: 2009 }, 2: { 여: 2010, 남: 2010 }, 3: { 여: 2011, 남: 2013 }, 4: { 여: 2012, 남: 2014 } };
// 대동제 무대 큰 박수 기준: 학년마다 76/101/126/151.
const STAGE_NEED = { 1: 76, 2: 101, 3: 126, 4: 151 };

// ---------- A. 동아리·학회 ----------
const CLUB = {
  학술: { stat: '지능', name: '학술 학회' },
  운동: { stat: '체력', name: '운동 동아리' },
  공연: { stat: '매력', name: '공연 동아리' },
  연합: { stat: '인맥', name: '연합·봉사 동아리' },
};
const CLUB_RESULT = {
  학술: ['합격 문자가 왔다. 첫 세미나에서 발표 순서를 받았고, 선배가 읽을 자료 목록을 건넸다.',
    '불합격 문자가 왔다. 학회실 앞에서 만난 선배가 그냥 놀러 와도 된다고 했다. 그날은 같이 학식을 먹었다.'],
  운동: ['합격이다. 첫 연습에서 주장이 이름을 불러 주었고, 끝나고 다 같이 국밥을 먹었다.',
    '탈락이다. 주장이 어깨를 두드리며 구경은 와도 된다고 했다. 운동장 옆에서 연습을 보다가 간식만 얻어먹었다.'],
  공연: ['합격 연락이 왔다. 첫 합주실에서 악기 소리가 한꺼번에 울렸고, 무대 이야기가 바로 시작됐다.',
    '오디션에서 떨어졌다. 연습실 문 앞에서 누군가 캔커피를 건네며 같이 놀자고 했다. 무대 뒤 정리는 도왔다.'],
  연합: ['받아 준다는 연락이 왔다. 첫 모임에 다른 학교 사람이 여럿 와서 이름표부터 다시 만들었다.',
    '이번에는 자리가 없다고 했다. 다음 행사 때 오라는 말을 들었다. 뒤풀이 자리에는 따라갔다.'],
};
const clubEvents = [];
for (const [k, c] of Object.entries(CLUB)) {
  clubEvents.push({
    id: `u_club_res_${k}_y`, title: `${c.name} 합격`, text: CLUB_RESULT[k][0],
    when: { flag: `지원:${k}`, tier: { [c.stat]: 2 } },
    effect: { set: ['동아리가입', `동아리:${k}`], fame: 3, stats: { [c.stat]: 1 } },
  });
  clubEvents.push({
    id: `u_club_res_${k}_n`, title: `${c.name} 불합격`, text: CLUB_RESULT[k][1],
    when: { flag: `지원:${k}`, tierBelow: { [c.stat]: 2 } },
    effect: { set: ['동아리불합'], stress: 2, stats: { 인맥: 1 } },
  });
}
// 2학년 재도전: 기준이 높아져 조건에 맞는 선택지만 열린다.
function clubRetry(school, year, month) {
  const key = school === SNU ? 'snu' : 'mit';
  return {
    id: `u_club_fair_${key}_2`, title: '동아리 박람회 (두 번째)',
    text: school === SNU
      ? '2학년 3월이다. 박람회 부스가 작년 그 자리에 다시 섰다. 올해는 후배들 사이에서 면접 기준이 한층 높아졌다는 말이 돈다.'
      : '2학년 개강 첫 주다. 잔디밭에 학생 단체 부스가 다시 열렸다. 지난해보다 지원자가 많다는 말이 돈다.',
    when: { year, month, school, notFlag: '동아리가입' },
    choices: [
      ...Object.entries(CLUB).map(([k, c]) => ({
        label: `${c.name}에 다시 지원한다`, when: { statMin: { [c.stat]: 76 } },
        effect: { set: ['동아리가입', `동아리:${k}`], fame: 3, stats: { [c.stat]: 1 } },
        result: '면접에서 지난해보다 말이 훨씬 잘 나왔다. 합격 연락은 그날 밤에 왔다.',
      })),
      { label: '올해도 동아리 없이 지낸다', effect: { stress: -3 }, result: '수업과 과외로 시간표가 이미 빽빽하다. 부스 앞을 지나 도서관으로 갔다.' },
    ],
  };
}
const clubYear2 = (school, year, month) => ({
  id: `u_club_year2_${school === SNU ? 'snu' : 'mit'}`, title: '동아리 2년차',
  text: '신입 후배들이 첫 모임에 들어온다. 이름표를 다시 써 주고, 작년에 선배에게 받은 자료를 건넨다. 후배 하나가 어디에 앉아야 하는지 묻는다.',
  when: { year, month, school, flag: '동아리가입' },
  choices: [
    { label: '후배 옆에 앉아 설명해 준다', effect: { stats: { 인맥: 1 }, fame: 1 }, result: '설명이 길어졌지만 후배는 끝까지 받아 적었다.' },
    { label: '인사만 하고 자기 일을 한다', effect: { stress: -2 }, result: '조용히 구석 자리에 앉았다. 모임은 평소처럼 끝났다.' },
  ],
});

// ---------- B. 총학생회 선거 ----------
const pairId = (pair) => (pair === '문혜원' ? 'c59' : pair === '탁경민' ? 'c26' : 'c82');
function election(school, sex) {
  const snu = school === SNU;
  const year = snu ? SNU_YEAR[3][sex] : (sex === '여' ? 2010 : 2012);
  const pair = snu ? (sex === '여' ? '문혜원' : '탁경민') : 'Marcus';
  const rival = snu && sex === '여' ? '문혜원' : null;
  return {
    id: `u_elect_${snu ? 'snu' : 'mit'}_${SEX_KEY[sex]}`, title: snu ? '총학생회 선거' : '학생회 선거',
    text: snu
      ? `10월 마지막 주에 후보 등록이 열렸다. 학생회관 게시판에 식당 메뉴, 도서관 개방 시간, 심야 셔틀 같은 공약이 붙기 시작한다. 졸업하고도 학교에 들르는 성태규가 말한다. "선거는 포스터가 아니야. 사람 이름부터 외워. 오늘 몇 명 외웠어?" ${rival ? '법대 후보로 문혜원이 나온다. "공약 3번, 예산 어디서 나와요? 대답 못 하면 그 표는 제가 가져갑니다."' : '법대 4학년 후보가 질문부터 던진다. "공약 3번, 예산 어디서 나와요?"'}`
      : `10월에 학생회 선거 후보 등록이 열렸다. 기숙사 복도마다 셔틀 시간표와 도서관 개방 시간을 고치겠다는 포스터가 붙는다. 졸업하고도 학생 단체 사무실에 들르는 Marcus가 말한다. "아이디어 없어도 돼. 일단 피자 먹으러 와."`,
    when: { year, month: 10, school, sex },
    choices: [
      { label: `${snu ? '과 동기 고승현' : '기숙사 친구 Alex Kim'}과 한 조로 출마한다`, effect: { set: ['출마'], stress: 3, pair: { id: null, name: snu ? '고승현' : 'Alex Kim', fame: 0 }, next: 'u_vote_role' }, result: '함께 나가 달라고 부탁해 이름을 나란히 적었다. 이번 달 남은 시간을 홍보에 얼마나 쓸지는 내 몫이다.' },
      { label: `${pair}와 한 조로 출마한다`, when: { flag: `친구:${pair}`, bondMin: { [pairId(pair)]: 2 } }, effect: { set: ['출마', '짝출마'], pair: { id: pairId(pair), name: pair, fame: 12 }, stress: 3, next: 'u_vote_role', bond: { [pairId(pair)]: 2 } }, result: `${pair}가 이름을 나란히 적자고 했다. 홍보 날짜를 둘이 나눠 맡았다.` },
      { label: '나서지 않는다', effect: { stress: -3 }, result: '이번에는 투표만 하기로 했다. 후보들 포스터를 읽으며 학교 앞을 걸었다.' },
    ],
  };
}
const electEvents = [
  {
    id: 'u_elect_win_vice', title: '부회장 당선',
    text: '개표 결과가 학생회관 앞에 붙었다. 내 이름과 짝의 이름 옆에 표가 가장 많다. 회장이 된 짝과 악수를 나눴다. 예산과 회의 준비는 내 몫이 되었다. 임기는 다음 해 한 해다.',
    when: { month: 11, flag: '부출마', leading: true, notFlags: ['부당선', '낙선'] }, tally: true,
    effect: { set: ['부당선'], fame: 5, stats: { 인맥: 1 }, stress: -3 },
  },
  {
    id: 'u_vote_role', title: '누가 앞에 설까', when: { from: 999912 },
    text: '후보 등록 서류에는 회장 칸과 부회장 칸이 하나씩 있다. 당선되면 조가 함께 자리에 오른다. 내 이름을 어느 칸에 적을까?',
    effect: { next: 'u_camp_debate' },
    choices: [
      { label: '내가 회장 후보로 선다', result: '회장 칸에 내 이름을 적었다. 서류가 조금 무겁게 느껴졌다.' },
      { label: '짝을 회장 후보로 세우고 내가 부회장 후보가 된다', effect: { set: ['부출마'] }, result: '짝의 이름을 위 칸에 적었다. 표를 모으기는 쉬워진다. 대신 회장은 내가 아니다.' },
    ],
  },
  {
    id: 'u_camp_debate', title: '공약 토론회', when: { from: 999912 },
    text: '학생회관 강당에서 후보 토론회가 열렸다. 뒷줄 학생이 일어나 묻는다. "식당 대기 줄과 심야 셔틀, 예산은 어디서 나옵니까?" 답을 기다리는 눈이 많다.',
    effect: { next: 'u_camp_night' },
    choices: [
      { label: '꼭 해결하겠다고 약속한다', effect: { support: 4 }, result: '박수가 나왔다. 뒷줄 학생은 앉으면서 고개를 갸웃했다.' },
      { label: '작년 예산표를 펴고 항목을 짚는다', when: { statMin: { 지능: 101 } }, effect: { support: 8, stats: { 지능: 1 } }, result: '항목별 금액까지 답했다. 토론회가 끝나고 질문하던 학생이 먼저 인사를 건넸다.' },
      { label: '내가 겪은 불편부터 이야기한다', when: { statMin: { 매력: 101 } }, effect: { support: 8, stats: { 매력: 1 } }, result: '강당에 작은 웃음이 돌았다. 어려운 숫자 없이도 사람들이 끝까지 들었다.' },
    ],
  },
  {
    id: 'u_camp_night', title: '밤의 게시판', when: { from: 999912 },
    text: '밤늦게 게시판 앞에 섰다. 비가 와서 다른 후보의 자보까지 젖어 흘러내린다. 혼자서 다 고치려면 막차를 놓친다.',
    choices: [
      { label: '내 것과 남의 것을 함께 다시 붙인다', effect: { support: 5, stats: { 인맥: 1 }, stress: 2 }, result: '걸어서 돌아왔다. 다음 날 상대 캠프 사람이 고맙다며 커피를 건넸고, 그 이야기가 과방을 돌았다.' },
      { label: '내 자보만 고치고 막차를 탄다', effect: { support: 1 }, result: '막차에 앉아 젖은 손을 닦았다.' },
    ],
  },
  {
    id: 'u_elect_win', title: '당선',
    text: '개표 결과가 학생회관 앞에 붙었다. 이름 옆에 가장 많은 표가 적혀 있다. 선거본부 사람들이 서로 어깨를 두드렸다. 임기는 다음 해 한 해다.',
    when: { month: 11, flag: '출마', leading: true, notFlags: ['당선', '부출마', '낙선'] }, tally: true,
    effect: { set: ['당선'], fame: 8, stats: { 인맥: 1 }, stress: -4 },
  },
  {
    id: 'u_elect_lose', title: '낙선',
    text: '12월에 결과를 정리한 안내문이 붙었다. 이번에는 낙선이다. 득표 차이는 크지 않았다. 홍보하며 만난 사람들 얼굴은 이름과 함께 남았다.',
    when: { month: 12, flag: '출마', notFlags: ['당선', '부당선'] }, tally: true,
    effect: { set: ['낙선'], stress: 3 },
  },
];
const electTerm = (sex) => ({
  id: `u_elect_term_${SEX_KEY[sex]}`, title: '학생회 임기',
  text: '임기 첫 달이다. 학생 의견함에 식당 줄이 길다는 글이 가장 많다. 학교 측과 면담 일정을 잡고, 축제 기획 회의도 곧 열린다.',
  when: { year: SNU_YEAR[4][sex], month: 3, sex, flag: '당선' },
  choices: [
    { label: '학교 측과 면담을 준비한다', effect: { stats: { 지능: 1 }, fame: 2 }, result: '식당 대기 시간 기록을 표로 만들어 갔다. 담당자가 메모를 시작했다.' },
    { label: '학생 의견을 모으러 다닌다', effect: { stats: { 인맥: 1 }, fame: 2 }, result: '의견함을 열고 강의실을 돌았다. 같은 불만이 세 번 이상 나온 것만 추렸다.' },
    { label: '축제 기획 회의를 먼저 연다', effect: { stats: { 매력: 1 }, fame: 2 }, result: '주점 위치와 무대 순서를 칠판에 그렸다. 회의가 두 시간을 넘겼다.' },
  ],
});

// ---------- C. 대동제(봄 무대) ----------
const STAGE_KIND = {
  노래: { label: '노래·밴드 무대에 지원한다', need: ['매력'], y: '첫 소절부터 목소리가 안정됐다. 후렴에서 객석이 따라 불렀다.', n: '가사를 한 줄 놓쳤다. 다음 소절에서 숨을 고르고 끝까지 불렀다.' },
  춤: { label: '춤 무대에 지원한다', need: ['매력', '체력'], y: '동작이 끝까지 맞았다. 마지막 자세에서 환호가 터졌다.', n: '한 박자 늦게 시작했다. 마지막에는 맞췄지만 아쉬움이 남았다.' },
  개그: { label: '장기자랑·개그 무대에 지원한다', need: ['인맥'], y: '첫 농담에 웃음이 터졌고 끝까지 이어졌다.', n: '농담이 한 박자 어긋났다. 앞줄 몇 명만 웃었다.' },
  퀴즈: { label: '퀴즈 대회에 나간다', need: ['지능'], y: '마지막 문제를 먼저 맞혔다. 답을 말하자 객석이 술렁였다.', n: '마지막 문제에서 답을 놓쳤다. 박수는 예의 바르게 나왔다.' },
};
const STAGE_G_Y = { 1: '신입생 무대인데 객석이 먼저 일어났다.', 2: '작년보다 객석이 가깝게 느껴졌다.', 3: '무대 뒤에서 후배들이 이름을 불렀다.', 4: '마지막 무대였다. 끝나자 박수가 오래 이어졌다.' };
const STAGE_G_N = { 1: '무난하게 내려왔다. 같이 선 동기가 어깨를 두드렸다.', 2: '무난하게 내려왔다. 무대 뒤에서 물을 마시니 손이 떨렸다.', 3: '무난하게 내려왔다. 후배가 수건을 건넸다.', 4: '무난하게 내려왔다. 마지막이라는 생각에 객석을 한 번 더 둘러봤다.' };
const stageEvents = [];
for (let g = 1; g <= 4; g++) {
  const T = STAGE_NEED[g];
  for (const [k, c] of Object.entries(STAGE_KIND)) {
    const statMin = Object.fromEntries(c.need.map((s) => [s, T]));
    const flag = `무대${g}:${k}`;
    stageEvents.push({
      id: `u_stage_res_${g}_${k}_y`, title: `${k} 무대: 큰 박수`, text: `${c.y} ${STAGE_G_Y[g]}`,
      when: { flag, statMin },
      effect: { set: ['무대기록', '큰박수', `큰박수${g}`], fame: 4, stats: Object.fromEntries(c.need.map((s) => [s, 1])) },
    });
    if (c.need.length === 1) {
      stageEvents.push({
        id: `u_stage_res_${g}_${k}_n`, title: `${k} 무대: 무난`, text: `${c.n} ${STAGE_G_N[g]}`,
        when: { flag, statBelow: statMin }, effect: { set: ['무대기록'], fame: 1 },
      });
    } else {
      stageEvents.push({
        id: `u_stage_res_${g}_${k}_n1`, title: `${k} 무대: 무난`, text: `${c.n} ${STAGE_G_N[g]}`,
        when: { flag, statBelow: { 매력: T } }, effect: { set: ['무대기록'], fame: 1 },
      });
      stageEvents.push({
        id: `u_stage_res_${g}_${k}_n2`, title: `${k} 무대: 무난`, text: `${c.n} ${STAGE_G_N[g]}`,
        when: { flag, statMin: { 매력: T }, statBelow: { 체력: T } }, effect: { set: ['무대기록'], fame: 1 },
      });
    }
  }
}
function stageApply(school, g, sex) {
  const snu = school === SNU;
  const year = (snu ? SNU_YEAR : NIT_SPRING)[g][sex ?? '여'];
  const when = { year, month: snu ? 4 : 3, school };
  if (sex) when.sex = sex;
  const ord = ['', '1학년', '2학년', '3학년', '4학년'][g];
  const text = snu
    ? `${ord} 4월이다. 대동제 무대 신청서가 학생회관에 붙었다. 접수는 이번 주까지고, 연습은 남은 시간에 알아서 해야 한다.${g === 1 ? ' 피아노과 기소정이 합주실 앞에서 말한다. "방금 박자 틀렸지? 괜찮아, 나만 알아. 한 번 더."' : ''}`
    : `${ord} 3월이다. 봄 학생 행사의 무대 신청이 열렸다. 기숙사 휴게실마다 연습 시간표가 붙는다.${g === 1 ? ' 즉흥 코미디 선배 Micah가 대본을 넘기다 말한다. "네 영어 틀렸는데 더 웃겨. 그 문장 무대에서 써도 돼?"' : ''}`;
  return {
    id: `u_stage_${snu ? 'snu' : 'mit'}_${g}${sex ? '_' + SEX_KEY[sex] : ''}`, title: snu ? '대동제 무대 신청' : '봄 행사 무대 신청',
    text, when,
    choices: [
      ...Object.entries(STAGE_KIND).map(([k, c]) => ({
        label: c.label, effect: { set: [`무대${g}:${k}`], stress: 2 }, result: '신청서를 냈다. 연습은 남는 시간에 한다.',
      })),
      { label: '이번에는 관객으로 즐긴다', effect: { stress: -3 }, result: '돗자리를 펴고 앉아 무대를 처음부터 끝까지 봤다.' },
    ],
  };
}
const stageApplyEvents = [];
for (const school of [SNU, NIT]) {
  stageApplyEvents.push(stageApply(school, 1), stageApply(school, 2));
  for (const g of [3, 4]) for (const sex of ['여', '남']) stageApplyEvents.push(stageApply(school, g, sex));
}

// ---------- D. 공모전(연구 참여)과 인턴 ----------
const CONTEST = {
  논문: { stat: '지능', y: '결과 발표 날이다. 입상 명단 둘째 줄에 이름이 있다. 심사평에는 근거를 끝까지 따라간 점이 좋았다고 적혔다.', n: '결과 발표 날이다. 입상 명단에 이름이 없다. 심사평 한 줄이 마음에 남았다. 근거가 중간에서 끊겼다는 내용이다.' },
  영상: { stat: '매력', y: '결과 발표 날이다. 상영회에서 마지막 장면이 끝나자 박수가 먼저 나왔다. 입상 명단에 이름이 올랐다.', n: '결과 발표 날이다. 상영회에서 반응은 조용했다. 입상은 못 했고, 편집본을 다시 돌려 보며 아쉬운 장면을 적어 두었다.' },
  창업: { stat: '인맥', y: '결과 발표 날이다. 발표 뒤 질문이 길게 이어졌고 입상 명단에 이름이 올랐다. 심사위원석에서 연락처를 물어 왔다.', n: '결과 발표 날이다. 입상은 못 했다. 발표 중 비어 있던 고객 이야기가 지적됐고, 팀원들과 식당에서 아이디어를 다시 적었다.' },
};
const contestEvents = [];
for (const [k, c] of Object.entries(CONTEST)) {
  contestEvents.push({
    id: `u_contest_res_${k}_y`, title: '입상', text: c.y,
    when: { flag: `공모${k}`, tier: { [c.stat]: 3 } },
    effect: { set: ['공모전입상'], fame: 4, stats: { [c.stat]: 1 } },
  });
  contestEvents.push({
    id: `u_contest_res_${k}_n`, title: '낙선', text: c.n,
    when: { flag: `공모${k}`, tierBelow: { [c.stat]: 3 } },
    effect: { stress: 3, stats: { 지능: 1 } },
  });
}
function contestApply(school, sex) {
  const snu = school === SNU;
  const year = snu ? SNU_YEAR[3][sex] : (sex === '여' ? 2010 : 2012);
  return {
    id: `u_contest_${snu ? 'snu' : 'mit'}_${SEX_KEY[sex]}`, title: snu ? '여름 공모전' : '여름 연구·프로젝트 참여',
    text: snu
      ? '여름방학 공모전 모집 공고가 학과 게시판에 붙었다. 통계 조교 도경환이 덧붙인다. "질문 환영합니다. 다만 시험에 나와요는 빼고요." 논문 팀에는 생명과학과 태은정이 있다. "이 데이터 세 번 돌렸어요. 네 번째는 같이 볼래요?" 영상 팀에는 민아영이, 창업 아이디어 팀에는 손재윤이 있다. "말로 하지 말고 잠깐만. 그거 지금 만들어 볼게."'
      : '여름방학 연구 참여와 프로젝트 모집이 시작됐다. 대학원 조교 나혜원이 게시판 앞에서 말한다. "한국어로 설명해도 점수는 똑같아요. 다시 풀어 오세요." 영상 제작 팀과 창업 경진 팀도 사람을 구한다.',
    when: { year, month: snu ? 7 : 5, school, sex },
    choices: [
      { label: snu ? '논문·기획안 팀에 들어간다' : '연구 참여를 신청한다', effect: { set: ['공모논문'], stress: 3 }, result: '자료 목록을 받았다. 방학 동안 활동 칸을 이 일에 쓰기로 했다.' },
      { label: snu ? '광고·영상 팀에 들어간다' : '영상 프로젝트에 들어간다', effect: { set: ['공모영상'], stress: 3 }, result: '콘티를 그리는 것부터 시작했다. 촬영 일정은 아직 비어 있다.' },
      { label: snu ? '창업 아이디어 팀에 들어간다' : '창업 경진 팀에 들어간다', effect: { set: ['공모창업'], stress: 3 }, result: '고객이 누구인지 한 줄로 쓰는 일부터 했다. 첫 회의에서 세 번 고쳤다.' },
      { label: '이번 여름은 나가지 않는다', effect: { stress: -4 }, result: '방학 계획표를 다시 짰다. 과외와 여행 사이에서 하루를 비워 두었다.' },
    ],
  };
}
const internEvents = [
  {
    id: 'u_intern_res_y', title: '인턴 합격',
    text: '합격 메일이 도착했다. 이번 여름은 인턴 근무로 보낸다. 첫 출근 안내에는 복장과 점심 시간이 적혀 있다. 첫 월급 이야기가 벌써 동기들 사이에서 오간다.',
    when: { flag: '인턴지원', tier: { 지능: 3 } },
    effect: { set: ['인턴수료'], cash: 1200000, stats: { 지능: 1, 인맥: 1 }, fame: 2 },
  },
  {
    id: 'u_intern_res_n', title: '인턴 탈락',
    text: '불합격 메일이 왔다. 이유는 적혀 있지 않았다. 그 여름은 과외와 짧은 여행으로 채우기로 했다. 자소서를 다시 읽어 보니 같은 말이 세 번 반복돼 있었다.',
    when: { flag: '인턴지원', tierBelow: { 지능: 3 } },
    effect: { cash: 300000, stress: 2 },
  },
];
function internApply(school, sex) {
  const snu = school === SNU;
  const year = snu ? SNU_YEAR[4][sex] : (sex === '여' ? 2011 : 2013);
  return {
    id: `u_intern_${snu ? 'snu' : 'mit'}_${SEX_KEY[sex]}`, title: '인턴 지원',
    text: snu
      ? '6월이다. 학과 사무실 앞에 여름 인턴 지원 안내가 붙었다. 4학년 여름은 마지막 기회라서 다들 자기소개서를 들고 다닌다. 학회 선배 변선영이 메신저로 말한다. "자소서 보내. 첫 문단만 먼저 봐 줄게."'
      : '5월이다. 학교 진로 센터에 여름 인턴 공고가 올라왔다. 3학년을 마치고 가는 여름이 마지막 기회라서 다들 이력서를 고친다. 한인 학생 모임 선배 Grace가 말한다. "어서 와! 이력서는 나한테 먼저 보여 줘."',
    when: { year, month: snu ? 6 : 5, school, sex },
    choices: [
      { label: '지원서를 낸다', effect: { set: ['인턴지원'], stress: 3 }, result: '자소서를 세 번 고쳐서 냈다. 결과는 한 달 안에 나온다.' },
      { label: '이번 여름은 다른 일을 한다', effect: { stress: -4, cash: 400000 }, result: '인턴 대신 과외 자리를 늘렸다. 여행 계획도 하나 세웠다.' },
    ],
  };
}
const contestApplyEvents = [];
for (const school of [SNU, NIT]) for (const sex of ['여', '남']) contestApplyEvents.push(contestApply(school, sex), internApply(school, sex));

// ---------- 진로 선택과 졸업 ----------
function career(sex) {
  const year = SNU_YEAR[4][sex];
  return {
    id: `u_career_${SEX_KEY[sex]}`, title: '진로 선택',
    text: '4학년 겨울이다. 진로 상담 신청서에 네 칸이 적혀 있다. 창업, 대학원, 프리랜서, 한 해 더. 맨 위 칸에는 취업이라고 적혀 있지만 글씨가 흐리다. 상담실 앞에서 동기들이 서로 어디로 가는지 묻는다.',
    when: { year, month: 12, sex, flag: '이야기대학' },
    choices: [
      { label: '창업', effect: { set: ['진로:창업'] }, result: '노트에 적어 둔 아이디어 중 가장 오래 남은 것을 골랐다. 첫 달 월세부터 계산했다.',
        // 이미 회사를 세웠으면 새로 차리는 이야기가 아니다
        resultOf: (s) => (s.company ? `${s.company.name ?? '내 회사'} 일은 이미 굴러가고 있다. 졸업하면 회사 일에 온종일 매달리기로 했다.` : '노트에 적어 둔 아이디어 중 가장 오래 남은 것을 골랐다. 첫 달 월세부터 계산했다.') },
      { label: '대학원', when: { tier: { 지능: 3 } }, effect: { set: ['진로:대학원'] }, result: '지도교수에게 추천서를 부탁하러 연구실 문을 두드렸다.' },
      { label: '프리랜서', effect: { set: ['진로:프리랜서'] }, result: '과외와 번역 의뢰처를 적어 보았다. 출근 시간이 없는 대신 마감이 매달 온다.' },
      { label: '한 해 더', effect: { set: ['진로:1년더'], graduateYear: sex === '여' ? 2013 : 2015 }, result: '휴학 신청서를 냈다. 한 해 더 준비하기로 했다.' },
      { label: '아직 열리지 않은 길', when: { flag: '__닫힘' }, result: '이 길은 아직 열리지 않았다.' },
    ],
  };
}
function graduation(school, sex, extra) {
  const snu = school === SNU;
  const base = snu ? (sex === '여' ? 2012 : 2014) : (sex === '여' ? 2012 : 2014);
  const when = { year: base + (extra ? 1 : 0), month: snu ? 2 : 6, school, sex };
  if (extra) when.flag = '진로:1년더'; else when.notFlag = '진로:1년더';
  return {
    id: `u_grad_${snu ? 'snu' : 'mit'}_${SEX_KEY[sex]}${extra ? '_x' : ''}`, title: snu ? '졸업식' : 'NIT 졸업식',
    text: snu
      ? `${extra ? '한 해 늦은 ' : ''}졸업식 날이다. 체육관에서 학사모를 받고, 정문 앞에서 가족이 사진을 찍는다. 학과 동기들과 명찰을 바꿔 달았다. 석정란 교수가 악수하며 말한다. "늦지 않았군요. 그럼 시작합시다."`
      : `${extra ? '한 해 늦은 ' : ''}6월 졸업식이다. 잔디밭에 흰 의자가 줄지어 놓였다. 가운 소매가 길어서 사진 속 손이 보이지 않는다. 룸메이트 Daniel이 먼저 달려와 어깨를 쳤다.`,
    when,
    effect: { set: ['졸업', snu ? '졸업:한성대' : '졸업:NIT'] },
    choices: [
      { label: '가족 사진을 찍는다', effect: { stress: -5 }, result: '가족이 번갈아 사진을 찍었다. 마지막 한 장은 다 같이 웃었다.' },
      { label: '동기들과 마지막으로 캠퍼스를 걷는다', effect: { stats: { 인맥: 1 }, stress: -3 }, result: '도서관, 학생 식당, 동아리방을 차례로 지나갔다. 말은 많이 하지 않았다.' },
    ],
  };
}
const careerEvents = [career('여'), career('남')];
const gradEvents = [];
for (const school of [SNU, NIT]) for (const sex of ['여', '남']) gradEvents.push(graduation(school, sex, false), graduation(school, sex, true));

// ---------- 한성대 2008~2009 ----------
const snuScenes = [
  {
    id: 'u_snu_0802_saeteo', title: '새터', who: '탁경민',
    text: '새터 버스가 학교 앞에서 출발한다. 옆자리 남학생이 먼저 말을 건다. "니 서울 토박이가? 내 하숙집 밥 억수로 맛있다, 한번 온나." 부산에서 올라왔다고 한다.',
    when: { year: 2008, month: 2, school: SNU },
    effect: { set: ['이야기대학'] },
    choices: [
      { label: '하숙집 밥 이야기를 더 듣는다', effect: { bond: { c26: 2 }, set: ['친구:탁경민'], stats: { 인맥: 1 } }, result: '도착할 때까지 학과 사람 이름을 셋이나 알려 줬다. 두 시간이 짧았다.' },
      { label: '창밖만 본다', effect: { stress: -2 }, result: '버스가 두 시간을 달렸다. 숙소에 도착해서야 이름표를 처음 읽었다.' },
    ],
  },
  {
    id: 'u_snu_0802_enter', title: '입학식과 학생증',
    text: '입학식은 체육관에서 한 시간쯤 걸렸다. 학생증 사진은 앞머리가 눌린 채로 찍혔다. 정문 앞에서 가족이 사진을 찍었고, 아버지가 정문 글씨를 한참 올려다봤다.',
    when: { year: 2008, month: 2, school: SNU },
    effect: { set: ['이야기대학'], stress: -3 },
  },
  {
    id: 'u_snu_0803_course', title: '수강 신청',
    text: '수강 신청은 새벽 두 시에 열린다. PC방 자리는 이미 찼고, 접속자가 몰려 화면이 계속 멈춘다. 인기 교양은 일 분 만에 마감됐다.',
    when: { year: 2008, month: 3, school: SNU },
    choices: [
      { label: '학점을 꽉 채운다', effect: { set: ['수강:많이'], stats: { 지능: 1 }, stress: 3 }, result: '시간표에 빈칸이 거의 없다. 월요일부터 금요일까지 점심시간이 십 분이다.' },
      { label: '수업을 적게 듣는다', effect: { set: ['수강:적게'], stress: -3 }, result: '시간표에 빈칸이 남았다. 그 자리에 동아리와 과외를 넣을 수 있다.' },
    ],
  },
  {
    id: 'u_snu_0803_gaekang', title: '개강총회와 첫 MT', who: '함진우',
    text: '개강총회가 끝나고 학과 첫 MT를 간다. 경춘선 기차가 대성리에 선다. 숙소로 가는 길이 헷갈릴 때 지리학과 함진우가 앞장선다. "거기 지름길 있어요. 제가 앞에 갈게요."',
    when: { year: 2008, month: 3, school: SNU },
    choices: [
      { label: '함진우를 따라간다', effect: { bond: { c73: 1 }, stats: { 인맥: 1 } }, result: '지름길은 논둑길이었다. 신발이 젖었지만 제일 먼저 도착했다.' },
      { label: '일행과 천천히 걷는다', effect: { stress: -2 }, result: '강가를 따라 돌아갔다. 늦게 도착했지만 이야기는 길어졌다.' },
    ],
  },
  {
    id: 'u_snu_0803_advisor', title: '지도교수 면담', who: 't08',
    text: '지도교수 면담은 연구실에서 십 분이다. 석정란 교수가 시간표를 훑어보고 고개를 끄덕인다. "늦지 않았군요. 그럼 시작합시다."',
    when: { year: 2008, month: 3, school: SNU },
    choices: [
      { label: '학점 계획을 묻는다', effect: { stats: { 지능: 1 } }, result: '교수는 필수 과목 순서를 종이에 적어 주었다. 글씨가 작고 정확했다.' },
      { label: '고민을 털어놓는다', effect: { stress: -4 }, result: '교수는 끝까지 듣고 한 가지만 물었다. 지금 가장 미루고 있는 일이 무엇이냐고.' },
    ],
  },
  {
    id: 'u_club_fair_snu_1', title: '동아리 박람회', who: '변선영',
    text: '3월 첫 주 본관 앞에 동아리 부스가 줄지어 섰다. 학술 학회, 운동 동아리, 공연 동아리, 연합·봉사 동아리가 신입생을 부른다. 학회장 변선영이 말한다. "학회 지원했지? 면접 때 긴장하지 말고, 아는 만큼만 말해." 옆 부스에서 사범대 위다인이 손을 흔든다. "봉사 동아리 오늘 회의예요. 사람 모자라니까 일단 오세요." 지원하면 이번 달 활동 칸 하나를 면접이나 오디션에 쓴다.',
    when: { year: 2008, month: 3, school: SNU },
    choices: [
      { label: '학술 학회에 지원한다', effect: { set: ['지원:학술'], bond: { c25: 1 } }, result: '지원서를 냈다. 면접은 이번 달 안에 본다.' },
      { label: '운동 동아리에 지원한다', effect: { set: ['지원:운동'] }, result: '지원서를 냈다. 첫 연습 날짜를 받았다.' },
      { label: '공연 동아리에 지원한다', effect: { set: ['지원:공연'] }, result: '오디션 곡을 정해서 냈다. 일정은 이번 주 안이다.' },
      { label: '연합·봉사 동아리에 지원한다', effect: { set: ['지원:연합'], bond: { c51: 1 } }, result: '첫 회의 시간을 받아 적었다. 다른 학교 사람도 온다고 한다.' },
      { label: '구경만 하고 돌아온다', effect: { stress: -2 }, result: '부스를 한 바퀴 돌고 전단지만 한 움큼 받았다.' },
    ],
  },
  {
    id: 'u_snu_0804_blossom', title: '벚꽃 아래 도시락', who: '연서인',
    text: '벚꽃이 떨어지는 잔디밭에서 도시락을 편다. 옆 벤치에서 인문계열 학생이 책을 읽다 고개를 든다. "그 책, 아직 대출 중이래요. …아, 제가 빌렸어요."',
    when: { year: 2008, month: 4, school: SNU },
    choices: [
      { label: '책 제목을 묻는다', effect: { bond: { c45: 2 }, set: ['친구:연서인'], stats: { 지능: 1 } }, result: '두 사람은 반납일을 맞춰 한 권을 돌려 읽기로 했다.' },
      { label: '도시락을 나눠 먹자고 한다', effect: { bond: { c45: 1 }, stats: { 인맥: 1 } }, result: '김밥을 한 줄 나눠 먹었다. 책 이야기는 다음으로 미뤘다.' },
    ],
  },
  {
    id: 'u_snu_0804_midterm', title: '중간고사 밤샘', who: '권태성',
    text: '도서관 열람실 불이 새벽까지 켜져 있다. 수학과 권태성이 칠판 대신 냅킨에 풀이를 쓴다. "이 문제 3분이면 돼. 칠판 있어? 없으면 냅킨."',
    when: { year: 2008, month: 4, school: SNU },
    choices: [
      { label: '풀이를 따라 쓴다', effect: { stats: { 지능: 1 }, study: 5, stress: 3 }, result: '세 번째 줄에서 막혔다. 그 줄만 다시 설명을 들었다.' },
      { label: '먼저 자러 간다', effect: { stress: -4 }, result: '새벽 두 시에 나왔다. 기숙사 불은 꺼져 있었고 편의점 라면으로 끝냈다.' },
    ],
  },
  {
    id: 'u_invest_account', title: '증권 계좌',
    text: '만 열아홉이 지났다. 이제 부모님 없이 혼자 은행에 가도 내 이름으로 증권 계좌를 열 수 있다. 은행 앞을 지나다 창구 안내문을 읽었다. 신분증만 챙겨 오면 된다고 적혀 있다.',
    when: { year: 2008, month: 4, flag: '이야기대학', notFlag: '계좌열림' },
    effect: { set: ['투자시작'] },
  },
  {
    id: 'u_snu_0805_sports', title: '학과 체육대회', who: '주민호',
    text: '학과 체육대회가 운동장에서 열린다. 줄다리기에서 졌다. 기계공학과 주민호가 신발 끈을 고쳐 매며 말한다. "오늘 진 건 2번 실수 때문이야. 다음엔 내가 뒤로 빠질게."',
    when: { year: 2008, month: 5, school: SNU },
    choices: [
      { label: '다음 경기에 같이 뛴다', effect: { stats: { 체력: 1 }, bond: { c71: 1 } }, result: '이어달리기에서 바통을 놓칠 뻔했지만 받아 냈다. 주민호가 소리를 질렀다.' },
      { label: '응원석에서 음료를 나눈다', effect: { stats: { 인맥: 1 } }, result: '음료수 상자를 돌렸다. 이름을 처음 듣는 사람이 반이었다.' },
    ],
  },
  {
    id: 'u_snu_0806_rain', title: '비 오는 날', who: '맹지수',
    text: '교양 수업이 끝나자 창밖에 비가 쏟아진다. 자연과학계열 맹지수가 우산을 펴며 말한다. "내일 비 와요. 72퍼센트. 근거 보여 드릴까요?" 휴대폰 화면에 기상 자료 그래프가 떠 있다.',
    when: { year: 2008, month: 6, school: SNU },
    choices: [
      { label: '그래프를 같이 본다', effect: { bond: { c47: 1 }, stats: { 지능: 1 } }, result: '강수 확률이 무엇을 뜻하는지 십 분 동안 들었다. 우산은 둘이 같이 썼다.' },
      { label: '우산을 빌려 달라고 한다', effect: { stress: -1 }, result: '우산은 빌렸다. 내일 돌려주기로 했다.' },
    ],
  },
  {
    id: 'u_snu_0806_end', title: '종강총회와 계절학기',
    text: '1학기 종강총회가 학교 앞 호프집에서 열린다. 한쪽 테이블에는 계절학기 신청서가 돌아다닌다. 방학 석 달을 어떻게 쓸지 다들 한마디씩 한다.',
    when: { year: 2008, month: 6, school: SNU },
    choices: [
      { label: '계절학기를 듣는다', effect: { study: 8, stress: 4 }, result: '여름에도 매일 학교에 간다. 강의실 에어컨이 약하다.' },
      { label: '과외 자리를 구한다', effect: { cash: 300000, stats: { 인맥: 1 } }, result: '학과 선배에게 학부모를 소개받았다. 첫 수업은 다음 주 화요일이다.' },
      { label: '방학에는 쉰다', effect: { stress: -6 }, result: '일주일은 늦잠만 잤다. 어머니가 밥 먹고 자라고 했다.' },
    ],
  },
  {
    id: 'u_snu_0807_trip', title: '첫 여름방학', who: '부민규',
    text: '7월이다. 농활을 같이 가자고 농생명과 부민규가 말한다. "무거운 건 나 줘. 이거 우리 집 귤 상자보다 가벼워." 한쪽 게시판에는 배낭여행 모집 글이 붙어 있다.',
    when: { year: 2008, month: 7, school: SNU },
    choices: [
      { label: '농활을 간다', effect: { stats: { 체력: 1, 인맥: 1 }, bond: { c60: 2 }, set: ['친구:부민규'] }, result: '마늘밭에서 하루 종일 일했다. 저녁에 마을 어른들이 수박을 내주셨다.' },
      { label: '배낭여행을 간다', effect: { cash: -400000, stress: -8, stats: { 매력: 1 } }, result: '짧은 일정으로 다녀왔다. 낯선 역 이름을 처음으로 소리 내어 읽었다.' },
      { label: '집에서 쉰다', effect: { stress: -5 }, result: '에어컨 앞에서 책 한 권을 끝까지 읽었다.' },
    ],
  },
  {
    id: 'u_snu_0808_olympic', title: '올림픽 단체 시청',
    text: '베이징 올림픽 경기를 과방 TV로 같이 본다. 과자 봉지가 돌고, 응원 구호가 어느새 하나로 모인다. 결과가 나오는 순간 과방 문이 열리고 다른 과 사람들까지 들어온다.',
    when: { year: 2008, month: 8, school: SNU },
    effect: { stats: { 인맥: 1 }, stress: -4 },
  },
  {
    id: 'u_snu_0808_tutor', title: '과외 학생 성적표',
    text: '과외 학생이 모의고사 성적표를 내민다. 점수가 지난달보다 올랐다. 어머니가 간식을 챙겨 주시며 다음 달에도 부탁한다고 했다.',
    when: { year: 2008, month: 8, school: SNU },
    choices: [
      { label: '칭찬하고 넘어간다', effect: { cash: 100000, stats: { 인맥: 1 } }, result: '학생 얼굴이 환해졌다. 다음 수업은 숙제를 한 장 늘렸다.' },
      { label: '틀린 문제를 같이 다시 푼다', effect: { cash: 100000, stats: { 지능: 1 } }, result: '오답 노트를 새로 짰다. 학생이 같은 유형을 두 번째에는 맞혔다.' },
    ],
  },
  {
    id: 'u_snu_0809_chuseok', title: '추석과 뉴스',
    text: '추석 연휴에 집에 내려간다. 거실 TV에서 미국 대형 투자은행이 문을 닫았다는 뉴스가 나온다. 부모님이 말없이 채널을 돌렸다 되돌린다. 환율이라는 말이 저녁 식탁에 두 번 나온다.',
    when: { year: 2008, month: 9, school: SNU },
    choices: [
      { label: '뉴스를 같이 본다', effect: { stress: 3, stats: { 지능: 1 } }, result: '아버지가 환율을 설명하다 말았다. 어머니가 과일을 깎아 왔다.' },
      { label: '과일을 깎는다', effect: { stress: -3 }, result: '사과 껍질을 끊기지 않게 깎았다. 어머니가 웃었다.' },
    ],
  },
  {
    id: 'u_snu_0810_tutorcut', title: '과외 횟수',
    text: '과외 학부모가 수업 횟수를 줄여 달라고 전화했다. 이유는 길게 말하지 않았다. 학교 앞 PC방 화면에는 환율 그래프가 떠 있다.',
    when: { year: 2008, month: 10, school: SNU },
    choices: [
      { label: '횟수를 줄이는 데 동의한다', effect: { cash: -100000, stress: -1 }, result: '주 두 번에서 한 번이 되었다. 수업 준비 시간이 남았다.' },
      { label: '다른 자리를 알아본다', effect: { stats: { 인맥: 1 }, stress: 3 }, result: '선배에게 연락해 대기 중인 학생 둘을 소개받았다. 시간표를 새로 짰다.' },
    ],
  },
  {
    id: 'u_snu_0810_stats', title: '교양 통계 조교', who: '도경환',
    text: '교양 통계 시간에 박사과정 조교 도경환이 숙제 답을 나눠 준다. 질문 시간에 손을 드는 학생이 없자 그가 말한다. "질문 환영합니다. 다만 \'시험에 나와요?\'는 빼고요."',
    when: { year: 2008, month: 10, school: SNU },
    choices: [
      { label: '질문을 한다', effect: { stats: { 지능: 1 }, bond: { c79: 1 } }, result: '표본이 작다는 말을 처음으로 이해했다. 조교가 칠판에 점을 세 개 찍었다.' },
      { label: '필기만 한다', effect: { study: 3 }, result: '필기를 깔끔하게 정리했다. 질문은 다음으로 미뤘다.' },
    ],
  },
  {
    id: 'u_snu_0811_suneung', title: '수능일 아침',
    text: '수능일 아침에 후배들이 다니는 고사장 교문 앞에 선다. 따뜻한 음료를 건네고 한 명씩 손을 흔든다. 교문이 닫히자 작은 한숨이 나왔다.',
    when: { year: 2008, month: 11, school: SNU },
    effect: { stress: -2, stats: { 인맥: 1 } },
  },
  {
    id: 'u_snu_0812_party', title: '학과 송년회',
    text: '학과 송년회가 학교 앞 식당에서 열린다. 올해 있었던 일을 한 사람씩 말한다. 순서가 가까워진다.',
    when: { year: 2008, month: 12, school: SNU },
    choices: [
      { label: '한 해를 웃기게 정리한다', effect: { stats: { 매력: 1 }, stress: -3 }, result: '수강 신청 새벽 이야기를 했다. 테이블 전체가 웃었다.' },
      { label: '짧게 말하고 넘긴다', effect: { stress: -1 }, result: '한 문장으로 끝냈다. 다음 사람이 더 길게 말했다.' },
    ],
  },
  {
    id: 'u_snu_0901_winter', title: '겨울방학',
    text: '겨울방학이다. 과외 성수기라 학부모 연락이 줄을 잇는다. 학교 게시판에는 어학연수 설명회 포스터도 붙어 있다.',
    when: { year: 2009, month: 1, school: SNU },
    choices: [
      { label: '과외를 늘린다', effect: { cash: 500000, stress: 4 }, result: '주 네 번 수업을 잡았다. 퇴근길 지하철에서 졸았다.' },
      { label: '설명회에 가 본다', effect: { stats: { 지능: 1 }, stress: -2 }, result: '비용표를 받아 왔다. 지금은 형편에 맞지 않아 서랍에 넣었다.' },
      { label: '집에서 쉰다', effect: { stress: -6 }, result: '이불 속에서 한 주를 보냈다. 눈이 많이 내렸다.' },
    ],
  },
  {
    id: 'u_snu_0903_mt', title: '선배가 되는 MT',
    text: '2학년 3월 MT다. 올해는 후배 이름표를 직접 나눠 준다. 작년에 자신이 서 있던 자리에 후배가 어색하게 서 있다.',
    when: { year: 2009, month: 3, school: SNU },
    choices: [
      { label: '후배에게 먼저 말을 건다', effect: { stats: { 인맥: 1 } }, result: '이름과 출신 지역을 외웠다. 밤에는 후배들이 먼저 인사를 했다.' },
      { label: '고기를 굽는다', effect: { stress: -2, stats: { 체력: 1 } }, result: '불판 앞에 서 있다 보니 어느새 한 상이 비었다.' },
    ],
  },
  {
    id: 'u_snu_0904_senior', title: '늦깎이 선배', who: '우미경',
    text: '학생 식당에서 간호학과 우미경과 마주친다. 스물여덟에 입학한 그는 늘 도시락을 싸 온다. "밥은 먹었어? 그럼 됐어. 나머지는 내일 걱정해."',
    when: { year: 2009, month: 4, school: SNU },
    choices: [
      { label: '알바와 생활 정보를 묻는다', effect: { bond: { c64: 2 }, stats: { 인맥: 1 }, set: ['친구:우미경'] }, result: '학교 근처 싼 식당과 야간 알바 자리를 알려 줬다. 메모하기에 바빴다.' },
      { label: '밥만 먹고 간다', effect: { stress: -2 }, result: '반찬을 나눠 먹었다. 계란말이가 맛있었다.' },
    ],
  },
  {
    id: 'u_snu_0908_flu', title: '개강과 신종플루',
    text: '개강 안내 문자가 바뀌었다. 학생 확진 소식이 늘고 단체 행사는 자제하라는 공지가 뜬다. 강의실 입구에 손 소독제가 놓였다.',
    when: { year: 2009, month: 8, school: SNU },
    choices: [
      { label: '마스크와 손 소독제를 챙긴다', effect: { stress: 1 }, result: '가방에 마스크를 두 장씩 넣었다. 수업 사이마다 손을 씻었다.' },
      { label: '집에서 지내는 날을 늘린다', effect: { stress: -3, study: -3 }, result: '꼭 필요한 수업만 나갔다. 나머지는 자료로 따라갔다.' },
    ],
  },
  {
    id: 'u_snu_0910_cancel', title: '가을 행사 취소',
    text: '가을 학과 답사와 연합 행사가 취소됐다는 공지가 올라왔다. 건물 입구에서 발열 체크를 위해 줄을 선다. 취소 소식에 다들 아쉬운 표정이었지만 불평은 없었다.',
    when: { year: 2009, month: 10, school: SNU },
    effect: { stress: 2 },
  },
  {
    id: 'u_snu_0910_startup', title: '작은 창업 제안', who: '지태준',
    text: '경영학과 지태준이 학생 식당에서 노트를 펼친다. 과외 중개 사이트 구상이다. "딱 3분만 들어 봐. 이번 건 진짜야. 저번 건 잊고." 이전 구상 이야기는 학과에 이미 소문이 났다.',
    when: { year: 2009, month: 10, school: SNU },
    choices: [
      { label: '3분 동안 끝까지 듣는다', effect: { stats: { 인맥: 1, 지능: 1 }, bond: { c69: 1 } }, result: '아이디어는 그럴듯했지만 학생과 학부모를 어떻게 모을지가 비어 있었다. 그 말을 했더니 지태준이 노트에 한 줄을 적었다.' },
      { label: '정중히 거절한다', effect: { stress: -1 }, result: '시간이 없다고 말했다. 지태준은 노트를 덮으며 웃었다.' },
    ],
  },
  {
    id: 'u_snu_0911_debate', title: '교양 토론', who: '문혜원',
    text: '교양 수업 조별 토론에서 법대 문혜원과 반대편이 되었다. 질문이 날카롭다. 토론이 끝나자 강의실이 조용해졌다.',
    when: { year: 2009, month: 11, school: SNU },
    choices: [
      { label: '근거를 들어 끝까지 맞선다', effect: { stats: { 지능: 1 }, bond: { c59: 1 }, set: ['라이벌:문혜원'] }, result: '마지막 반론에서 문혜원이 필기를 멈추고 웃었다. 말이 막힌 건 이쪽도 두 번이었다.' },
      { label: '토론 뒤 같이 밥을 먹자고 한다', effect: { bond: { c59: 2 }, set: ['친구:문혜원'], stats: { 인맥: 1 } }, result: '학식 줄에서 토론 이야기를 이어 갔다. 마지막에 서로 점수를 매겨 주기로 했다.' },
    ],
  },
  {
    id: 'u_snu_0911_phone', title: '새 스마트폰',
    text: '아이폰이 국내에서 처음 판매되는 주말이다. 과 동기 몇이 휴대폰 이야기만 한다. 요금제와 약정 기간이 화제다.',
    when: { year: 2009, month: 11, school: SNU },
    choices: [
      { label: '새 스마트폰을 산다', effect: { cash: -600000, stats: { 매력: 1 } }, result: '화면을 쓸어 넘기는 감각이 낯설었다. 동기들이 돌아가며 구경했다.' },
      { label: '지금 폰을 더 쓴다', effect: { stress: -1 }, result: '약정이 아직 남아 있다. 지금 폰도 불편하지 않았다.' },
    ],
  },
  {
    id: 'u_snu_0912_year', title: '한 해를 보내며',
    text: '기말고사가 끝나고 학과 송년회가 열린다. 올해는 행사가 몇 번 취소됐다. 빈 달력을 다시 보다가 내년 계획을 한 줄 적었다.',
    when: { year: 2009, month: 12, school: SNU },
    effect: { stress: -3 },
  },
];

// ---------- NIT 2008~2009 ----------
const mitScenes = [
  {
    id: 'u_mit_0803_prep', title: '출국 준비',
    text: '고등학교를 마친 봄이다. NIT 입학은 9월이라서 그때까지 반년이 비어 있다. 영어 회화 모임, 서류 정리, 과외를 번갈아 하며 보낸다.',
    when: { year: 2008, month: 3, school: NIT },
    effect: { set: ['이야기대학'] },
    choices: [
      { label: '영어 회화 모임에 나간다', effect: { stats: { 인맥: 1, 지능: 1 } }, result: '외국인 강사 앞에서 기숙사 생활 이야기를 연습했다. 단어보다 억양이 더 어려웠다.' },
      { label: '과외를 늘린다', effect: { cash: 400000, stress: 3 }, result: '출국 비용을 조금 더 모았다. 학생들에게 곧 떠난다고 말했다.' },
      { label: '쉬면서 준비한다', effect: { stress: -6 }, result: '서류를 차례로 정리하고 남는 시간은 산책했다.' },
    ],
  },
  {
    id: 'u_mit_0807_pack', title: '짐 싸는 날',
    text: '출국 일주일 전이다. 캐리어 두 개에 겨울옷을 넣었더니 한 개가 넘쳤다. 어머니가 컵라면과 김을 몰래 넣어 놓았다. 친구들이 송별 모임을 연다.',
    when: { year: 2008, month: 7, school: NIT },
    choices: [
      { label: '송별 모임에 간다', effect: { stats: { 인맥: 1 }, stress: -4 }, result: '친구들이 편지를 한 장씩 썼다. 가방 안쪽 주머니에 넣었다.' },
      { label: '짐을 다시 꾸린다', effect: { stress: 2 }, result: '필요 없는 옷을 덜어내고 다시 쌌다. 가방 지퍼가 겨우 닫혔다.' },
    ],
  },
  {
    id: 'u_mit_0808_arrive', title: '공항과 기숙사', who: 'Daniel Okafor',
    text: '인천공항 출국장에서 가족과 인사한다. 어머니가 마지막으로 가방 지퍼를 확인한다. 보스턴에 도착한 날 기숙사 방에는 침대가 두 개 있다. 아래층 침대 위에 농구공이 놓여 있고, 룸메이트가 일어나 손을 내민다. "Hey, roomie! 농구 할 줄 알아? 몰라도 괜찮아, 내가 알려 줄게."',
    when: { year: 2008, month: 8, school: NIT },
    choices: [
      { label: '농구를 해 본다', effect: { bond: { c27: 2 }, stats: { 체력: 1 }, set: ['친구:Daniel'] }, result: '첫 슛은 림에 닿지도 않았다. 세 번째에 들어가자 룸메이트가 소리를 질렀다.' },
      { label: '짐부터 푼다', effect: { bond: { c27: 1 }, stress: -2 }, result: '옷장 자리를 반으로 나눴다. 룸메이트가 밤에 컵라면을 하나 나눠 줬다.' },
    ],
  },
  {
    id: 'u_mit_0809_class', title: '첫 수업', who: '경수연',
    text: '첫 수업은 강당에서 시작한다. 교수의 영어가 빠르다. 필기의 절반을 놓쳤다. 옆자리 학생이 노트를 힐끔 보다 말한다. "저도 오늘 왔어요. 방금 뭐라고 했는지 하나도 못 들었어요. 같이 가요."',
    when: { year: 2008, month: 9, school: NIT },
    choices: [
      { label: '같이 점심을 먹으러 간다', effect: { bond: { c52: 2 }, set: ['친구:경수연'], stats: { 인맥: 1 } }, result: '식당에서 서로 놓친 부분을 맞춰 보니 합쳐서 거의 전부였다.' },
      { label: '혼자 노트를 정리한다', effect: { stats: { 지능: 1 }, stress: 2 }, result: '도서관에서 교재를 찾아 빠진 부분을 채웠다.' },
    ],
  },
  {
    id: 'u_club_fair_mit_1', title: '학생 단체 박람회', who: 'Isaiah Whitfield',
    text: '개강 첫 주 잔디밭에 학생 단체 부스가 열렸다. 로켓 단체, 농구와 운동 모임, 합창과 즉흥 코미디 팀, 국제 학생 모임이 있다. 로켓 단체 회장이 말한다. "볼트 세어 봤어? 한 번 더 세. 그다음 얘기하자." 합창 부스에서는 화학과 Ethan이 말한다. "Sorry, 한국말 천천히요. 아, 오늘 연습 올래요? 듣기만 해도 돼요."',
    when: { year: 2008, month: 9, school: NIT },
    choices: [
      { label: '로켓 단체에 지원한다', effect: { set: ['지원:학술'], bond: { c102: 1 } }, result: '지원서를 냈다. 면접은 작업실에서 본다고 한다.' },
      { label: '운동 모임에 지원한다', effect: { set: ['지원:운동'] }, result: '농구 시범 경기에 나가기로 했다.' },
      { label: '합창과 즉흥 코미디 팀에 지원한다', effect: { set: ['지원:공연'], bond: { c84: 1 } }, result: '오디션 날짜를 받았다. 노래를 하나 골라야 한다.' },
      { label: '국제 학생 모임에 지원한다', effect: { set: ['지원:연합'] }, result: '첫 모임에 음식 하나씩 들고 오라는 안내를 받았다.' },
      { label: '구경만 한다', effect: { stress: -2 }, result: '부스를 돌며 전단지만 모았다.' },
    ],
  },
  {
    id: 'u_mit_0809_korean', title: '한인 학생 모임', who: 'Grace 이은지',
    text: '한인 학생 모임 환영회가 열린다. 3학년 선배가 문 앞에서 맞아 준다. "어서 와요! 아, 아니, 어서 와! 김치 먹고 싶으면 언제든 말해." 식탁에는 한국 라면과 김밥이 놓여 있다.',
    when: { year: 2008, month: 9, school: NIT },
    choices: [
      { label: '모임에 계속 나간다', effect: { bond: { c28: 2 }, set: ['친구:Grace'], stats: { 인맥: 1 }, stress: -3 }, result: '선배가 이 학교에서 꼭 챙길 것들을 적어 주었다. 첫 줄이 잠자기였다.' },
      { label: '인사만 하고 돌아간다', effect: { stress: -1 }, result: '라면 한 그릇을 먹고 일찍 나왔다. 기숙사 복도가 조용했다.' },
    ],
  },
  {
    id: 'u_mit_0809_crisis', title: '학생 라운지 TV',
    text: '학생 라운지 TV에서 미국 대형 투자은행이 파산했다는 보도가 나온다. 경영 전공 학생들의 말수가 줄었다. 저녁에 한국에서 어머니가 전화로 환율 이야기를 꺼낸다.',
    when: { year: 2008, month: 9, school: NIT },
    effect: { stress: 3 },
  },
  {
    id: 'u_mit_0810_mentor', title: '2학년 멘토', who: '어진호',
    text: '한국인 2학년 어진호 선배가 기숙사 앞에서 기다리고 있다. "보스턴 처음이지? 첫 달은 다들 힘들어. 막히면 바로 연락해." 손에는 학교 주변 지도가 들려 있다.',
    when: { year: 2008, month: 10, school: NIT },
    choices: [
      { label: '수업 요령을 묻는다', effect: { bond: { c53: 1 }, stats: { 지능: 1 } }, result: '과제를 시작하는 순서를 배웠다. 선배는 첫 주에 내는 질문이 제일 중요하다고 했다.' },
      { label: '식당 정보를 묻는다', effect: { bond: { c53: 1 }, stress: -2 }, result: '한국식 국밥집이 지하철로 두 정거장 거리에 있다고 한다.' },
    ],
  },
  {
    id: 'u_mit_0811_thanks', title: '추수감사절', who: 'Josie Halvorsen',
    text: '추수감사절 연휴에 기숙사 복도가 조용하다. 몬타나에서 온 Josie가 부엌 앞에서 말한다. "Thanksgiving? 비행기 값 보고 웃었어. 여기 남는 사람끼리 뭐 해 먹자."',
    when: { year: 2008, month: 11, school: NIT },
    choices: [
      { label: '남아서 같이 요리한다', effect: { bond: { c85: 2 }, stats: { 인맥: 1 }, stress: -4 }, result: '칠면조 대신 닭을 구웠다. 소금을 두 번 넣어서 모두 물을 많이 마셨다.' },
      { label: '한국에 영상 통화를 건다', effect: { stress: -3 }, result: '가족은 아침이었고 이쪽은 저녁이었다. 화면이 끊길 때마다 서로 웃었다.' },
    ],
  },
  {
    id: 'u_mit_0812_home', title: '겨울방학 귀국',
    text: '겨울방학에 한국으로 돌아온다. 동네 편의점 간판이 바뀌었고, 고교 친구들은 군대 이야기를 한다. 공항 입국장에서 가족이 손을 흔든다.',
    when: { year: 2008, month: 12, school: NIT },
    choices: [
      { label: '고교 친구들을 만난다', effect: { stats: { 인맥: 1 }, stress: -4 }, result: '술집 대신 분식집에 모였다. 서로 억양이 변했다고 놀렸다.' },
      { label: '가족과 지낸다', effect: { stress: -6 }, result: '어머니가 해 준 밥을 매일 먹었다. 침대가 낯설 만큼 편했다.' },
    ],
  },
  {
    id: 'u_mit_0901_iap', title: '1월 짧은 강좌', who: '함재혁',
    text: '1월 독립 활동 기간이다. 짧은 강좌와 프로젝트가 캠퍼스 곳곳에서 열린다. 기계 전공 희망생 함재혁이 로봇 부품을 들고 서 있다. "이거 농담인데요. …방금 웃으라고 한 말이에요." 옆 강의실에서는 인도에서 온 Meera가 말소리 프로젝트에 사람을 구한다. "방금 \'괜찮아요\'는 yes예요, no예요? 적어 둘게요."',
    when: { year: 2009, month: 1, school: NIT },
    choices: [
      { label: '로봇 제작에 참여한다', effect: { bond: { c80: 2 }, stats: { 지능: 1, 체력: 1 } }, result: '납땜을 하다 손가락을 데었다. 로봇은 사흘 만에 한 걸음을 걸었다.' },
      { label: '말소리 프로젝트에 참여한다', effect: { bond: { c83: 2 }, stats: { 지능: 1, 인맥: 1 } }, result: '같은 문장을 열 가지 억양으로 말했다. 기록지에 \'괜찮아요\'가 가장 길게 적혔다.' },
    ],
  },
  {
    id: 'u_mit_0902_snow', title: '눈 오는 캠퍼스', who: 'Solveig Aarvik',
    text: '2월에 눈이 사흘째 내린다. 기숙사 옆방 Solveig가 장갑을 내민다. "추워? 이거 써. 남는 거야."',
    when: { year: 2009, month: 2, school: NIT },
    effect: { bond: { c97: 1 }, stress: -2 },
  },
  {
    id: 'u_mit_0903_break', title: '봄방학',
    text: '3월 말 봄방학이다. 기숙사 절반이 비었다. 뉴욕으로 당일치기 여행을 가자는 제안과, 기숙사에서 쉬자는 제안이 동시에 나온다.',
    when: { year: 2009, month: 3, school: NIT },
    choices: [
      { label: '뉴욕에 다녀온다', effect: { cash: -200000, stress: -6, stats: { 매력: 1 } }, result: '버스로 네 시간을 달렸다. 박물관 앞 계단에 앉아 샌드위치를 먹었다.' },
      { label: '기숙사에서 쉰다', effect: { stress: -5 }, result: '복도가 조용해서 처음으로 숙제 없는 밤을 보냈다.' },
    ],
  },
  {
    id: 'u_mit_0904_guest', title: '낯익은 목소리', who: '윤하나',
    text: '봄 학생 행사를 구경하러 근처 대학 학생이 왔다. 뒤에서 낯익은 목소리가 들린다. "…너 맞지? 역삼동. 나 기억해?" 몇 년 전 미국으로 떠난 동네 친구였다.',
    when: { year: 2009, month: 4, school: NIT },
    choices: [
      { label: '반갑게 안부를 묻는다', effect: { bond: { c08: 2 }, set: ['친구:윤하나'], stress: -3 }, result: '둘 다 영어 억양이 섞인 한국어를 썼다. 연락처를 서로 휴대폰에 저장했다.' },
      { label: '짧게 인사만 한다', effect: { bond: { c08: 1 } }, result: '그가 다음 약속이 있다고 했다. 인사를 하고 헤어졌다.' },
    ],
  },
  {
    id: 'u_mit_0906_summer', title: '여름 귀국',
    text: '6월 졸업식 철이 지나고 여름방학이 시작됐다. 한국행 비행기에서 창밖으로 구름이 길게 깔려 있다. 한국에서는 아침 햇빛이 먼저 반겼다.',
    when: { year: 2009, month: 6, school: NIT },
    effect: { stress: -5 },
  },
  {
    id: 'u_mit_0909_flu', title: '개강과 손 씻기',
    text: '개강 주에 기숙사 게시판에 손 씻기 안내가 붙었다. 신종플루가 미국에서도 번지고 있다. 한국에서도 개학이 늦춰진다는 소식을 가족에게서 듣는다.',
    when: { year: 2009, month: 9, school: NIT },
    effect: { stress: 2 },
  },
  {
    id: 'u_mit_0911_guest', title: '룸메이트 집 초대', who: 'Daniel Okafor',
    text: '추수감사절에 Daniel이 가족 집에 초대한다. 식탁에는 음식이 한 가지 더 놓여 있고, 어머니가 그것이 무엇인지 설명해 준다. 설거지를 맡으니 그가 웃으며 수건을 건넨다.',
    when: { year: 2009, month: 11, school: NIT },
    choices: [
      { label: '초대에 응한다', effect: { bond: { c27: 2 }, stats: { 인맥: 1 }, stress: -4 }, result: '식구들이 이름을 외우려고 세 번씩 불러 주었다. 돌아오는 차에서 졸았다.' },
      { label: '기숙사에서 공부한다', effect: { stats: { 지능: 1 }, stress: 2 }, result: '기숙사가 텅 비었다. 도서관 불이 밤새 켜져 있었다.' },
    ],
  },
  {
    id: 'u_mit_0910_marcus', title: '창업 동아리 선배', who: 'Marcus Thibodeaux',
    text: '창업 동아리 피자 모임에 갔다. 경영 전공 3학년 Marcus가 접시를 돌린다. "아이디어 없어도 돼. 일단 피자 먹으러 와." 칠판에는 다른 사람들이 쓴 아이디어가 가득하다.',
    when: { year: 2009, month: 10, school: NIT },
    choices: [
      { label: '아이디어를 하나 적는다', effect: { bond: { c82: 2 }, set: ['친구:Marcus'], stats: { 지능: 1 } }, result: '칠판 모서리에 한 줄을 적었다. Marcus가 그 줄에 동그라미를 쳤다.' },
      { label: '피자만 먹고 나온다', effect: { bond: { c82: 1 }, stress: -2 }, result: '피자가 맛있었다. 다음 모임 날짜만 적어 왔다.' },
    ],
  },
];

// ---------- 동아리 활동 맛보기(합격한 사람만) ----------
const clubFlavor = [
  { id: 'u_flavor_snu_학술', who: '변선영', school: SNU, kind: '학술', year: 2008, month: 5,
    text: '첫 학회 세미나다. 변선영 학회장이 발제 순서를 칠판에 쓴다. 후배 질문을 끝까지 듣고 한 문장으로 답한다. 감정을 드러내지 않아서 처음에는 차갑게 보인다.',
    a: ['발제에 질문을 한다', { stats: { 지능: 1 }, bond: { c25: 1 } }, '질문이 짧아서 오히려 선배가 한 번 더 되물었다. 답을 찾느라 세미나가 십 분 길어졌다.'],
    b: ['메모만 한다', { stress: -1 }, '노트에 용어를 열 개 적었다. 집에 가서 하나씩 찾아봤다.'] },
  { id: 'u_flavor_snu_운동', who: '전호석', school: SNU, kind: '운동', year: 2008, month: 5,
    text: '연습에 십 분 늦었다. 체육교육과 4학년 주장 전호석이 호루라기를 입에서 뗀다. "늦었네. 벌은 없어. 대신 나랑 한 바퀴 더."',
    a: ['한 바퀴 더 돈다', { stats: { 체력: 1 }, bond: { c65: 1 } }, '운동장을 한 바퀴 더 돌았다. 마지막 바퀴에서는 둘이 보폭이 맞았다.'],
    b: ['스트레칭만 한다', { stress: -1 }, '무릎을 풀고 앉았다. 주장이 물을 건넸다.'] },
  { id: 'u_flavor_snu_공연', who: '유보람', school: SNU, kind: '공연', year: 2008, month: 5,
    text: '연극 연습실 문 앞에서 국문과 유보람이 소식을 전한다. "그거 들었어? 아, 나쁜 얘기 아니야. 좋은 소식이야." 대동제 때 작은 극을 올린다는 이야기다.',
    a: ['대사 맞추기에 참여한다', { stats: { 매력: 1 }, bond: { c74: 1 } }, '짧은 대사를 열 번 되풀이했다. 목소리가 갈라졌지만 박수는 받았다.'],
    b: ['소품 정리를 돕는다', { stats: { 인맥: 1 } }, '박스를 나르다 보니 연습이 끝났다. 뒷자리에 앉아 대본을 읽었다.'] },
  { id: 'u_flavor_snu_연합', who: '배민지', school: SNU, kind: '연합', year: 2008, month: 5,
    text: '연합 동아리 총무 배민지가 장부를 펴 놓고 말한다. "회비 3천 원 비어요. 누구예요. 혼내진 않을게요, 아마." 다른 학교 사람들이 줄줄이 고개를 숙인다.',
    a: ['총무를 도와 장부를 맞춘다', { stats: { 인맥: 1, 지능: 1 }, bond: { c76: 1 } }, '영수증을 날짜순으로 정리하니 3천 원의 행방이 나왔다. 모두가 한숨을 쉬며 웃었다.'],
    b: ['회비를 내고 자리를 뜬다', { cash: -3000 }, '회비를 냈다. 총무가 영수증을 써 주었다.'] },
  { id: 'u_flavor_mit_학술', who: 'Isaiah Whitfield', school: NIT, kind: '학술', year: 2008, month: 11,
    text: '로켓 단체 작업실에서 볼트를 센다. 4학년 회장이 말한다. "볼트 세어 봤어? 한 번 더 세. 그다음 얘기하자." 세 번째에 빠진 하나가 나왔다.',
    a: ['빠진 볼트를 찾는다', { stats: { 지능: 1 }, bond: { c102: 1 } }, '상자 바닥에 있었다. 회장이 짧게 고개를 끄덕였다.'],
    b: ['조립을 지켜본다', { stress: -1 }, '공구 이름을 외웠다. 다음엔 내가 들어 볼 차례다.'] },
  { id: 'u_flavor_mit_운동', who: 'Caleb Wojcik', school: NIT, kind: '운동', year: 2008, month: 11,
    text: '농구 모임에 해군 복무를 마치고 입학한 Caleb이 나온다. "다들 몇 살이야? …난 그냥 형이라고 불러. 라면 있어." 경기가 끝나자 라면 냄비가 나왔다.',
    a: ['경기에 계속 뛴다', { stats: { 체력: 1 }, bond: { c87: 1 } }, '숨이 가쁜 채로 한 골을 넣었다. 형이라고 부르게 됐다.'],
    b: ['라면만 얻어먹는다', { stress: -2 }, '라면이 짰다. 국물은 다 마셨다.'] },
  { id: 'u_flavor_mit_공연', who: 'Ruth Pelletier', school: NIT, kind: '공연', year: 2008, month: 11,
    text: '합창 연습실에서 수학과 음악을 같이 하는 Ruth가 지휘봉을 든다. "음이 틀렸어요. 수학도요. 둘 다 고쳐 드릴게요." 네 번째 마디부터 다시 시작한다.',
    a: ['음을 다시 잡는다', { stats: { 매력: 1 }, bond: { c105: 1 } }, '세 번째 시도에서 화음이 맞았다. 연습실이 잠시 조용했다.'],
    b: ['듣기만 한다', { stress: -2 }, '뒷자리에서 화음을 들었다. 숙제 풀이가 머릿속에서 잠깐 멀어졌다.'] },
  { id: 'u_flavor_mit_연합', who: 'Tan Wei Jie', school: NIT, kind: '연합', year: 2008, month: 11,
    text: '국제 학생 모임에서 경제학 3학년 Tan이 쪽지를 건넨다. "이번 달 알바 자리 넘길게. 아, 나? 요즘 좀 바빠서." 도서관 서가 정리 알바다.',
    a: ['알바 자리를 받는다', { cash: 200000, bond: { c96: 1 } }, '서가 정리는 생각보다 힘들었다. 월급 대신 도서관 지름길을 알게 됐다.'],
    b: ['고맙다고 하고 거절한다', { stats: { 인맥: 1 } }, '시간이 안 된다고 말했다. Tan이 다른 사람에게 넘겼다.'] },
].map((f) => ({
  id: f.id, title: '동아리 첫 모임', who: f.who, text: f.text,
  when: { year: f.year, month: f.month, school: f.school, flag: `동아리:${f.kind}` },
  choices: [{ label: f.a[0], effect: f.a[1], result: f.a[2] }, { label: f.b[0], effect: f.b[1], result: f.b[2] }],
}));

// ---------- 2학년·3학년 한성대/NIT 사람 장면 ----------
const peopleScenes = [
  {
    id: 'u_snu_0905_group', title: '조별 과제', who: '사공진',
    text: '조별 과제 첫 모임이다. 경영학과 사공진이 달력을 펴고 말한다. "일단 일정표부터 맞춰 보자. 넌 언제 비어?" 경제학과 은다솔은 집안 이야기가 나오자 화제를 돌린다. "그 얘기 어디서 들었어? …아니야, 그냥. 밥이나 먹으러 가자."',
    when: { year: 2009, month: 5, school: SNU },
    choices: [
      { label: '일정표를 먼저 정리한다', effect: { bond: { c48: 1 }, stats: { 지능: 1 }, set: ['친구:사공진'] }, result: '일정표는 이틀 만에 끝났다. 사공진이 칸마다 색을 칠했다.' },
      { label: '밥을 먹으며 이야기한다', effect: { bond: { c49: 1 }, stats: { 인맥: 1 } }, result: '은다솔이 식당을 골랐다. 집 이야기는 나오지 않았다.' },
    ],
  },
  {
    id: 'u_snu_0907_grade', title: '학점 발표', who: '황보준',
    text: '학기 학점이 발표된 날, 의예과 황보준이 복도에서 말한다. "학점 나왔어? 비교는 하지 말자. 어차피 내가 볼 거니까." 말투는 가벼운데 눈은 성적표를 읽고 있다.',
    when: { year: 2009, month: 7, school: SNU },
    choices: [
      { label: '학점을 솔직히 말한다', effect: { bond: { c46: 1 }, stats: { 지능: 1 } }, result: '숫자를 말하자 황보준이 잠깐 계산하는 얼굴이 되었다. 그러곤 어깨를 으쓱했다.' },
      { label: '다음 학기 이야기로 돌린다', effect: { stress: -1 }, result: '수강 신청 팁을 묻자 황보준이 진지하게 대답했다.' },
    ],
  },
  {
    id: 'u_snu_0902_alumni', title: '졸업 선배의 말', who: '변선영',
    text: '2월 학생회관 앞에서 졸업생들이 사진을 찍는다. 학회장이던 변선영이 학사모를 쓴 채 다가온다. "맡은 일은 끝까지 하는 게 제일 편해. 나는 그걸 늦게 알았어." 그 뒤로는 컨설팅 회사 이야기를 하지 않았다.',
    when: { year: 2009, month: 2, school: SNU, flag: '동아리:학술' },
    effect: { bond: { c25: 1 }, stats: { 지능: 1 } },
  },
  {
    id: 'u_mit_0902_ta', title: '수업 조교', who: 'Deniz Karaosman',
    text: '전기전산 수업 조교 Deniz의 사무실 시간이다. 그는 박사과정이고 늘 눈이 충혈되어 있다. "새벽 2시 메일이 제일 빨라요. 농담 아닙니다." 질문 목록을 들고 온 학생이 줄을 섰다.',
    when: { year: 2009, month: 2, school: NIT },
    choices: [
      { label: '질문을 가지고 찾아간다', effect: { bond: { c94: 1 }, stats: { 지능: 1 } }, result: '문제 풀이 말고 풀이 방식을 물었다. 조교가 칠판에 선을 세 개 그었다.' },
      { label: '멀리서 지켜본다', effect: { stress: -1 }, result: '질문하는 학생들의 순서를 세어 봤다. 열 명이 넘었다.' },
    ],
  },
  {
    id: 'u_mit_0905_rocket', title: '로켓 단체 계산', who: 'Lesedi Molefhe',
    text: '보츠와나에서 온 항공우주 희망생 Lesedi가 칠판에 계산을 쓴다. "Okay, 계산 다시. 말로 할 테니까 틀리면 바로 끊어요." 둘러선 사람들이 한 줄씩 따라 쓴다.',
    when: { year: 2009, month: 5, school: NIT },
    choices: [
      { label: '계산을 끝까지 따라간다', effect: { bond: { c81: 1 }, stats: { 지능: 1 } }, result: '세 번째 줄에서 부호를 놓쳤다. Lesedi가 끊었고 다 같이 웃었다.' },
      { label: '필기만 해 둔다', effect: { stress: -1 }, result: '계산 과정을 노트에 옮겼다. 나중에 혼자 풀어 보기로 했다.' },
    ],
  },
  {
    id: 'u_mit_1002_prof', title: '연구실 방문', who: 't09',
    text: '2학년 겨울 연구 참여를 앞두고 Wrenfield 교수의 연구실을 찾았다. 교수는 서류를 보지 않고 눈을 본다. "Good. Now tell me what you don\'t know."',
    when: { year: 2010, month: 2, school: NIT },
    choices: [
      { label: '모르는 것을 솔직히 말한다', effect: { bond: { c95: 1 }, stats: { 지능: 1 } }, result: '교수는 고개를 끄덕이고 모른다고 말한 항목 세 개에 동그라미를 쳤다.' },
      { label: '아는 것부터 설명한다', effect: { stress: 2 }, result: '교수는 중간에 말을 끊지 않았다. 설명이 끝난 뒤 한 번 더 물었다.' },
    ],
  },
];

// ---------- 한성대 여/남 공통: 2010~2013 ----------
const midScenes = [
  {
    id: 'u_f_2010_worldcup', title: '월드컵 단체 응원',
    text: '2010 월드컵 기간이다. 한국이 원정 16강에 오르는 달이라 학교 곳곳에 단체 응원 자리가 마련됐다. 밤늦게까지 응원 구호가 이어졌다.',
    when: { year: 2010, month: 6, sex: '여', flag: '이야기대학' },
    effect: { stress: -4, stats: { 인맥: 1 } },
  },
  {
    id: 'u_f_2010_chat', title: '단체 대화방',
    text: '학과 단체 대화방이 생겼다. 휴강 공지가 밤에도 오고, 수업 자료는 사진으로 돈다. 대화방 알림이 하루에도 몇 십 개씩 쌓인다.',
    when: { year: 2010, month: 9, sex: '여', flag: '이야기대학' },
    choices: [
      { label: '대화방에 적극적으로 참여한다', effect: { stats: { 인맥: 1 }, stress: 2 }, result: '자료를 올리자 답이 금방 왔다. 알림은 끄지 못했다.' },
      { label: '알림을 끄고 필요할 때만 본다', effect: { stress: -2 }, result: '하루에 두 번만 확인하기로 했다. 놓친 공지는 하나였다.' },
    ],
  },
  {
    id: 'u_job_season_f', title: '채용 설명회 철',
    text: '3월 학교 게시판에 채용 설명회 포스터가 빼곡하다. 4학년 선배들 얼굴이 어둡고, 자소서 첨삭 모임이 하루 두 번 열린다.',
    when: { year: 2011, month: 3, sex: '여', flag: '이야기대학' },
    effect: { stress: 3 },
  },
  {
    id: 'u_job_apply_f', title: '원서 철',
    text: '9월이다. 학교 앞 카페마다 자소서 쓰는 학생이 앉아 있다. 진로 상담실 게시판에 취업이라는 칸이 있지만 아직 열리지 않았다는 안내가 붙어 있다.',
    when: { year: 2011, month: 9, sex: '여', flag: '이야기대학' },
    choices: [
      { label: '자기소개서를 정리해 둔다', effect: { stats: { 지능: 1 }, stress: 3 }, result: '지난 활동을 시간순으로 적었다. 쓸 만한 문장은 많지 않았다.' },
      { label: '진로 상담을 예약한다', effect: { stress: -1 }, result: '상담 일정은 12월로 잡혔다. 그때까지 생각을 정리하기로 했다.' },
    ],
  },
  {
    id: 'u_job_season_m', title: '채용 설명회 철',
    text: '4학년 3월이다. 학교 게시판에 채용 설명회 포스터가 빼곡하다. 복학생 모임에서는 군대 이야기를 자소서 첫 줄에 넣어도 되는지 묻는 사람이 많다.',
    when: { year: 2013, month: 3, sex: '남', flag: '이야기대학' },
    effect: { stress: 3 },
  },
  {
    id: 'u_job_apply_m', title: '원서 철',
    text: '9월이다. 학교 앞 카페마다 자소서 쓰는 학생이 앉아 있다. 진로 상담실 게시판에 취업이라는 칸이 있지만 아직 열리지 않았다는 안내가 붙어 있다.',
    when: { year: 2013, month: 9, sex: '남', flag: '이야기대학' },
    choices: [
      { label: '자기소개서를 정리해 둔다', effect: { stats: { 지능: 1 }, stress: 3 }, result: '군 복무 이야기를 한 문단으로 줄였다. 남은 분량은 학교 활동으로 채웠다.' },
      { label: '진로 상담을 예약한다', effect: { stress: -1 }, result: '상담 일정은 12월로 잡혔다. 그때까지 생각을 정리하기로 했다.' },
    ],
  },
];

// ---------- 군 복무(남자) ----------
const armyScenes = [
  {
    id: 'u_army_farewell_snu', title: '송별회', who: '탁경민',
    text: '입대 한 달 전이다. 학과 동기들이 학교 앞 식당에서 송별회를 열어 준다. 탁경민이 먼저 잔을 든다. "내도 다음 주에 간다. 우리 둘 다 머리 밀고 보자."',
    when: { year: 2010, month: 2, school: SNU, sex: '남' },
    choices: [
      { label: '동기들과 끝까지 앉아 있다', effect: { stats: { 인맥: 1 }, stress: -4 }, result: '동기들이 돌아가며 한마디씩 했다. 마지막에는 누군가 노래를 불렀다.' },
      { label: '일찍 일어나 짐을 정리한다', effect: { stress: 1 }, result: '책상 서랍을 비웠다. 사물함 열쇠를 후배에게 넘겼다.' },
    ],
  },
  {
    id: 'u_army_farewell_mit', title: '송별 모임', who: 'Daniel Okafor',
    text: '2학년을 마치고 입대를 앞둔 5월이다. 기숙사 친구들이 부엌에 모였다. Daniel이 한국식 인사를 배워 왔다며 어색한 억양으로 말한다. 모두 박수를 쳤다.',
    when: { year: 2010, month: 5, school: NIT, sex: '남' },
    effect: { bond: { c27: 1 }, stats: { 인맥: 1 }, stress: -3 },
  },
  {
    id: 'u_army_enlist_snu', title: '입대',
    text: '입대 날 아침이다. 훈련소 앞에서 가족과 인사한다. 머리를 밀고, 사복을 상자에 담아 부쳤다. 그날부터 달력 칸을 하나씩 지우기 시작했다.',
    when: { year: 2010, month: 3, school: SNU, sex: '남' },
    effect: { set: ['군입대'], stress: 5 },
  },
  {
    id: 'u_army_enlist_mit', title: '입대',
    text: '귀국한 6월에 입대한다. 훈련소 앞에서 가족과 인사하고 머리를 밀었다. 영어로 하던 생각이 하루 만에 한국어 구호로 바뀌었다.',
    when: { year: 2010, month: 6, school: NIT, sex: '남' },
    effect: { set: ['군입대'], stress: 5 },
  },
  {
    id: 'u_army_letter', title: '편지',
    text: '가족이 보낸 편지가 도착했다. 어머니의 글씨가 평소보다 커서 두 줄만 읽었는데도 눈이 뜨거워졌다. 침상 옆자리 선임이 편지가 왔다고 장난으로 놀렸다.',
    when: { flag: '군입대', notFlag: '전역', notSchool: ['태산대', '신라전문대'] },
    effect: { stress: -3 },
  },
  {
    id: 'u_army_worldcup', title: '내무반 월드컵',
    text: '월드컵 경기가 있는 밤, 내무반에서 단체로 TV를 본다. 규칙상 목소리를 낮춰야 하지만 골이 들어가면 참기 어렵다. 한국이 원정 16강에 올랐다는 소식이 병영 전체에 퍼진다.',
    when: { year: 2010, month: 6, sex: '남', flag: '군입대', notFlag: '전역', notSchool: ['태산대', '신라전문대'] },
    effect: { stress: -4, stats: { 인맥: 1 } },
  },
  {
    id: 'u_army_leave', title: '첫 휴가',
    text: '첫 휴가를 나온다. 집 앞 편의점 간판이 그대로인 게 신기하다. 친구에게 연락을 돌렸는데 시간이 맞는 사람은 둘뿐이다.',
    when: { flag: '군입대', notFlag: '전역', from: 201009, to: 201112, notSchool: ['태산대', '신라전문대'] },
    choices: [
      { label: '가족과 하루를 보낸다', effect: { stress: -6 }, result: '어머니가 밥상을 세 번 차렸다. 마지막 날에는 말없이 가방을 같이 쌌다.' },
      { label: '친구들을 만난다', effect: { stress: -4, stats: { 인맥: 1 }, cash: -80000 }, result: '고깃집에서 군대 얘기만 두 시간을 했다. 막차를 놓칠 뻔했다.' },
    ],
  },
  {
    id: 'u_army_junior', title: '후임',
    text: '3월이다. 새 후임이 들어왔다. 어깨가 굳은 그를 보며 작년의 자신을 떠올린다. 식사 시간에 반찬을 덜어 주니 후임이 크게 고개를 숙인다.',
    when: { year: 2011, month: 3, flag: '군입대', notFlag: '전역', notSchool: ['태산대', '신라전문대'] },
    choices: [
      { label: '먼저 말을 걸어 준다', effect: { stats: { 인맥: 1 }, stress: -2 }, result: '후임이 부산 출신이라고 했다. 사투리가 낯익어서 웃었다.' },
      { label: '규정을 정확히 알려 준다', effect: { stats: { 지능: 1 } }, result: '자주 틀리는 부분만 짚어 줬다. 후임이 수첩에 적었다.' },
    ],
  },
  {
    id: 'u_army_discharge_snu', title: '전역',
    text: '12월 전역 날이다. 정문을 나오니 가족이 기다린다. 군복을 벗고 입은 사복이 어색하게 헐렁하다. 휴대폰 속 학과 대화방에는 복학 이야기가 올라와 있다.',
    when: { year: 2011, month: 12, school: SNU, sex: '남', flag: '군입대' },
    effect: { set: ['전역'], stress: -8 },
  },
  {
    id: 'u_army_discharge_mit', title: '전역',
    text: '3월 전역 날이다. 정문을 나오니 가족이 기다린다. 군복을 벗고 입은 사복이 어색하게 헐렁하다. 기숙사 룸메이트가 보낸 메시지에는 복학 날짜를 알려 달라고 적혀 있다.',
    when: { year: 2012, month: 3, school: NIT, sex: '남', flag: '군입대' },
    effect: { set: ['전역'], stress: -8 },
  },
  {
    id: 'u_army_return_snu', title: '복학', who: '성태규',
    text: '3월 복학 첫날이다. 후배들이 선배님이라고 부른다. 수강 신청 화면은 그대로인데 이름 모를 시스템이 몇 개 늘었다. 졸업한 성태규가 건물 앞에서 말한다. "복학생은 첫 학기에 사람 이름부터 다시 외워."',
    when: { year: 2012, month: 3, school: SNU, sex: '남', flag: '전역' },
    choices: [
      { label: '후배들과 점심을 먹는다', effect: { stats: { 인맥: 1 }, bond: { c63: 1 } }, result: '후배 다섯과 학식을 먹었다. 이름을 두 명만 외웠다.' },
      { label: '도서관에서 감을 되찾는다', effect: { stats: { 지능: 1 }, study: 5 }, result: '두 시간 만에 졸았다. 감은 아직 군대에 남아 있었다.' },
    ],
  },
  {
    id: 'u_army_return_mit', title: '복학', who: 'Daniel Okafor',
    text: '9월 복학이다. 룸메이트가 같은 방을 쓰도록 신청해 두었다. Daniel이 침대 아래 칸에 농구공을 놓고 말한다. "Welcome back. 이제 한국식 군대 이야기 들려줘."',
    when: { year: 2012, month: 9, school: NIT, sex: '남', flag: '전역' },
    choices: [
      { label: '군대 이야기를 들려준다', effect: { bond: { c27: 1 }, stress: -4 }, result: '내무반 이야기를 영어로 하려니 단어가 모자랐다. 몸짓이 도움이 됐다.' },
      { label: '수업 이야기부터 묻는다', effect: { stats: { 지능: 1 } }, result: '그동안 바뀐 수업 방식을 물었다. Daniel이 노트 한 권을 건넸다.' },
    ],
  },
  {
    id: 'u_extra_year_f', title: '한 해 더',
    text: '동기들이 졸업하고 난 학교는 조용하다. 한 해 더 다니는 가을이다. 도서관 열람실 자리가 넉넉하고 학생 식당 줄이 짧다.',
    when: { year: 2012, month: 9, sex: '여', flag: '진로:1년더' },
    effect: { stress: -2 },
  },
  {
    id: 'u_extra_year_m', title: '한 해 더',
    text: '동기들이 졸업하고 난 학교는 조용하다. 한 해 더 다니는 가을이다. 도서관 열람실 자리가 넉넉하고 학생 식당 줄이 짧다.',
    when: { year: 2014, month: 9, sex: '남', flag: '진로:1년더' },
    effect: { stress: -2 },
  },
];

// ---------- 동창 모임 ----------
// 초·중 동창(한솔초): 2015, 2019, 2024. 고교 동창: 2014, 2018, 2023. 근황은 design/08_인물_인생흐름.md를 따른다.
const mixer = (label, effect, result) => ({ label, effect, result });
const reunions = [
  {
    id: 'w_reunion_2015_chodeung', title: '초·중 동창 모임 (2015)',
    text: '한솔초와 청솔중 동창 모임이 역삼동 고깃집에서 열렸다. 정민혁은 호텔 주방에서 일한다. 한유진은 은행에 다니며 퇴근 뒤에 소설을 쓴다고 했다. 오정우는 의대를 졸업하고 병원에서 수련 중이다. "그때 같이 공부할걸." 김혜린은 소극장 무대에 단역으로 선다. 이소영은 강남의 큰 미용실 디자이너가 되었다. 최동현은 아버지 도장에서 사범 일을 한다. 서은비는 방송 작가, 임재민은 제약 회사 영업을 한다.',
    when: { year: 2015, month: 2, school: '한솔초' },
    choices: [
      mixer('한유진의 원고를 읽어 주겠다고 한다', { set: ['원고:한유진'], bond: { c02: 2 }, stats: { 지능: 1 } }, '한유진이 가방에서 출력물을 꺼냈다. 첫 장 맨 위에 제목이 없었다.'),
      mixer('정민혁 옆에 앉아 주방 이야기를 듣는다', { bond: { c01: 2 }, stress: -3 }, '정민혁은 칼을 쥔 손의 굳은살을 보여 줬다. 밤 열한 시에 퇴근한다고 했다.'),
      mixer('자리를 돌며 안부를 묻는다', { stats: { 인맥: 1 }, bond: { c11: 1, c06: 1 } }, '임재민이 모두의 근황을 줄줄 외우고 있었다. 이소영이 머리 모양을 슬쩍 봐 주었다.'),
    ],
  },
  {
    id: 'w_reunion_2019_chodeung', title: '초·중 동창 모임 (2019)',
    text: '동창 모임이 다시 열렸다. 정민혁은 지난해 아버지가 은퇴하면서 대출을 내 넓은 식당을 열었다. 한유진은 은행에 다니며 장편을 쓰고 있다. 오정우는 결혼해 딸이 하나이고 올해부터 군의관으로 간다. 김혜린은 3년째 쇼호스트다. 박도영은 처음 모임에 나왔다. 2016년에 창업했다가 2018년에 문을 닫았고, 지금은 대구의 부품 회사에 다닌다. 이소영은 2018년에 어머니의 미용실을 이어받아 원장이 되었다. 최동현은 헬스 트레이너로 일하며 소방공무원인 아내와 산다. 서은비는 메인 작가가 되었고 올해 작은 오피스텔을 샀다. 임재민은 부모님 PC방이 문을 닫았다고 했다. 코인 이야기가 나오자 그는 말을 돌렸다.',
    when: { year: 2019, month: 2, school: '한솔초' },
    choices: [
      mixer('박도영에게 창업 이야기를 묻는다', { bond: { c05: 2 }, stats: { 지능: 1 } }, '박도영은 폐업한 날 짐을 직접 쌌다고 했다. 말투가 가볍지만 숫자는 정확히 기억하고 있었다.'),
      mixer('정민혁의 새 식당 이야기를 듣는다', { bond: { c01: 1 }, stress: -2 }, '정민혁은 좌석이 서른 개라고 자랑했다. 자랑 끝에 월 이자 이야기를 조용히 덧붙였다.'),
      mixer('임재민 옆에 앉아 말없이 술잔을 채운다', { bond: { c11: 2 }, stress: -2 }, '임재민은 한참 있다가 고맙다고 했다. 더 묻지는 않았다.'),
    ],
  },
  {
    id: 'w_reunion_2024_chodeung', title: '초·중 동창 모임 (2024)',
    text: '2024년 동창 모임은 인원이 줄었다. 정민혁은 2021년에 큰 식당을 접고 작은 배달 전문점으로 다시 시작했다. 딸이 하나다. 한유진은 지난해 첫 책을 냈고, 은행에 다니며 두 번째 원고를 쓴다. 오정우는 아버지 의원에서 일하고 지난해 이혼해 주말마다 딸을 만난다. 이소영은 2020년부터 예약제 소형 샵을 운영한다. 홍석규가 2022년 구의원 선거에 한 번 나갔다가 낙선했다는 이야기도 돌았다.',
    when: { year: 2024, month: 2, school: '한솔초' },
    choices: [
      mixer('한유진의 첫 책을 사 왔다고 말한다', { bond: { c02: 2 }, stats: { 인맥: 1 } }, '한유진이 책 표지를 손으로 가렸다가 웃으며 풀었다. 첫 장에 이름을 써 주었다.'),
      mixer('오정우에게 쉬는 날 어떻게 지내는지 묻는다', { bond: { c03: 2 }, stress: -2 }, '오정우는 주말마다 놀이터에서 그네만 민다고 했다. 그것이 요즘 가장 좋은 시간이라고 했다.'),
      mixer('정민혁의 배달 전문점 이야기를 듣는다', { bond: { c01: 2 }, stress: -2 }, '정민혁은 빚을 거의 갚았다고 했다. 메뉴는 여섯 가지로 줄였다고 한다.'),
    ],
  },
  // --- 한빛고
  {
    id: 'w_reunion_2014_seoulgo', title: '한빛고 동창 모임 (2014)',
    text: '한빛고 동창 모임이 열렸다. 노현우는 한성대 경영을 졸업하고 증권회사에 들어갔다. 남궁찬은 광고 회사에 들어갔다. 설태주는 세션 연주자로 밤마다 합주실에 있다. 강태윤은 지난해 대학 동기와 앱 창업을 했고 올해 졸업한다. 임재민은 제약 회사 영업을 한다. 최동현은 아버지 도장에서 사범을 한다.',
    when: { year: 2014, month: 2, school: '한빛고' },
    choices: [
      mixer('강태윤의 앱 이야기를 듣는다', { bond: { c09: 2 }, stats: { 지능: 1 } }, '강태윤은 휴대폰 화면 하나로 설명을 끝냈다. 버튼이 두 개뿐이라고 했다.'),
      mixer('노현우와 근황을 나눈다', { bond: { c14: 1 }, stats: { 지능: 1 } }, '노현우는 월급 날짜와 계획표를 한 번에 말했다. 계획표에는 칸마다 색이 있었다.'),
      mixer('설태주의 합주 이야기를 듣는다', { bond: { c36: 1 }, stress: -2 }, '설태주는 연주비가 들쭉날쭉하다고 웃었다. 악기를 만지면 걱정이 줄어든다고 했다.'),
    ],
  },
  {
    id: 'w_reunion_2018_seoulgo', title: '한빛고 동창 모임 (2018)',
    text: '한빛고 동창 모임이 열렸다. 노현우는 2016년에 증권회사를 나와 금융 앱을 만들었다. 2017년 코인 열풍 때 잠깐 크게 알려졌지만 접을 때를 놓쳤다고 한다. 남궁찬은 올해 행사 대행 회사를 차렸다. 강태윤은 2016년에 앱을 소액에 넘기고, 올해 기업용 소프트웨어 회사를 다시 시작했다. 임재민은 2017년에 코인에 대출까지 넣었다가 올해 큰 손실을 보았다. 봉기훈은 출판사 편집자가 되었다.',
    when: { year: 2018, month: 2, school: '한빛고' },
    choices: [
      mixer('노현우에게 지금 접는 게 낫다고 말한다', { bond: { c14: 2 }, set: ['조언:노현우'] }, '노현우가 오래 침묵했다. 손에 든 잔이 비어 있다는 걸 그제야 알아챘다.'),
      mixer('남궁찬의 창업 소식을 축하한다', { bond: { c34: 2 }, stats: { 인맥: 1 } }, '남궁찬이 명함을 건넸다. 명함에 행사장 사진이 들어 있었다.'),
      mixer('임재민의 말을 조용히 들어 준다', { bond: { c11: 2 }, stress: -2 }, '손실 금액은 말하지 않았다. 대신 아내 이야기를 꺼냈다.'),
    ],
  },
  {
    id: 'w_reunion_2023_seoulgo', title: '한빛고 동창 모임 (2023)',
    text: '한빛고 동창 모임은 분위기가 조용했다. 노현우는 2019년에 사업을 접고 빚을 졌고, 2021년부터 중소기업 재무팀에서 일한다. 남궁찬은 2020년에 행사가 전부 취소돼 2021년에 폐업했고 올해 이혼했다. 설태주는 2020년에 공연이 끊겨 레슨으로 버텼고 올해 공연이 돌아왔다. 임재민은 올해 영업 팀장이 되었다.',
    when: { year: 2023, month: 2, school: '한빛고' },
    choices: [
      mixer('노현우의 근황을 천천히 묻는다', { bond: { c14: 2 }, stress: -2 }, '노현우는 빚 갚는 계획표를 다시 보여 주었다. 칸의 색깔이 하나로 줄어 있었다.'),
      mixer('남궁찬에게 안부를 전한다', { bond: { c34: 2 }, stress: -2 }, '남궁찬은 어머니 서점에서 일한다고 했다. 서점 전화번호를 불러 주었다.'),
      mixer('설태주의 공연 소식에 축하한다', { bond: { c36: 2 }, stats: { 매력: 1 } }, '설태주가 공연 날짜를 휴대폰 달력에 바로 적어 주었다.'),
    ],
  },
  // --- 한빛과학고
  {
    id: 'w_reunion_2014_scigo', title: '한빛과학고 동창 모임 (2014)',
    text: '한빛과학고 동창 모임이 열렸다. 류승현은 올해 대학을 졸업하고 반도체 장비 회사에 다닌다. 엄주희는 2년 차 초등 교사다. 권나래는 석사를 마치고 화학 회사 연구원이 되었다. 선우혁은 대학원에서 아직 논문을 쓰고 있다. 고재석은 미국에 있어 메일로 안부만 전했다.',
    when: { year: 2014, month: 2, school: '한빛과학고' },
    choices: [
      mixer('엄주희의 학교 이야기를 듣는다', { bond: { c17: 2 }, stress: -2 }, '엄주희는 회의를 잘 끌던 버릇이 학교에서도 쓸모 있다고 웃었다.'),
      mixer('선우혁과 문제를 하나 주고받는다', { bond: { c42: 1 }, stats: { 지능: 1 } }, '선우혁은 풀이를 줄이는 사람이다. 한 줄로 푼 답이 더 길게 이어질 것 같았다.'),
      mixer('권나래의 연구실 이야기를 듣는다', { bond: { c19: 1 }, stats: { 인맥: 1 } }, '권나래는 실험실에서 쓰는 장갑 이야기부터 꺼냈다.'),
    ],
  },
  {
    id: 'w_reunion_2018_scigo', title: '한빛과학고 동창 모임 (2018)',
    text: '한빛과학고 동창 모임이 다시 열렸다. 류승현은 여전히 어떻게든 된다고 말한다. 엄주희는 2016년에 결혼해 아이가 둘이다. 권나래는 올해 화학 회사를 그만두었다. 천도훈은 올해 결혼했다. 국은채는 아버지 동물병원에서 진료를 본다.',
    when: { year: 2018, month: 2, school: '한빛과학고' },
    choices: [
      mixer('권나래에게 앞으로 계획을 묻는다', { bond: { c19: 2 }, stats: { 지능: 1 } }, '권나래는 미술품 보존 공부를 해 볼까 한다고 했다. 말하는 동안 눈이 밝았다.'),
      mixer('국은채에게 동물병원 이야기를 듣는다', { bond: { c44: 1 }, stress: -2 }, '국은채는 곤충 표본을 모으던 버릇이 진료에도 남았다고 했다.'),
      mixer('류승현과 가볍게 안부를 나눈다', { bond: { c16: 1 }, stress: -2 }, '기숙사 라면 이야기를 하자 류승현이 그 맛이 그립다고 했다.'),
    ],
  },
  {
    id: 'w_reunion_2023_scigo', title: '한빛과학고 동창 모임 (2023)',
    text: '한빛과학고 동창 모임이 열렸다. 엄주희는 2021년에 집을 샀고 이자 부담이 크다. 학년 부장을 맡았다. 선우혁은 연구소에서 5년째 계약직으로 일한다. 재계약 때마다 이력서를 다시 쓴다고 했다. 천도훈은 올해 처음으로 특허에 자기 이름을 올렸다.',
    when: { year: 2023, month: 2, school: '한빛과학고' },
    choices: [
      mixer('선우혁에게 어려운 문제를 낸다', { bond: { c42: 2 }, stats: { 지능: 1 } }, '선우혁이 식탁 냅킨에 풀이를 적었다. 마지막 줄에는 질문이 하나 더 있었다.'),
      mixer('천도훈의 특허를 축하한다', { bond: { c43: 2 }, stats: { 인맥: 1 } }, '천도훈은 처음으로 자기 이름이 앞에 적혔다고 했다. 말하는 동안 손이 떨렸다.'),
      mixer('엄주희의 학교 일을 듣는다', { bond: { c17: 1 }, stress: -2 }, '엄주희는 학년 회의에서 말을 줄이는 법을 배우고 있다고 했다.'),
    ],
  },
  // --- 푸른여고
  {
    id: 'w_reunion_2014_nteeyo', title: '푸른여고 동창 모임 (2014)',
    text: '푸른여고 동창 모임이 열렸다. 마수정은 법학전문대학원에 다니고 있다. 명소라는 임용 시험에서 두 번째로 떨어졌다. 오세라는 프랜차이즈 본사에서 일하고, 제갈윤아는 게임 개발자가 되었다. 백가영이 그룹 활동을 접고 혼자 솔로로 나선다는 기사가 났다는 이야기도 나왔다.',
    when: { year: 2014, month: 2, school: '푸른여고' },
    choices: [
      mixer('명소라를 위로한다', { bond: { c39: 2 }, stress: -2 }, '명소라는 아침 운동장을 계속 돈다고 했다. 다시 도전한다고 했다.'),
      mixer('마수정에게 공부 요령을 묻는다', { bond: { c38: 1 }, stats: { 지능: 1 } }, '마수정은 색깔별 오답 노트를 지금도 쓴다고 했다. 법전에도 색이 있었다.'),
      mixer('오세라가 하는 일을 듣는다', { bond: { c40: 1 }, stats: { 인맥: 1 } }, '오세라는 분식 가게 아이디어를 휴대폰 메모장으로 보여 주었다.'),
    ],
  },
  {
    id: 'w_reunion_2018_nteeyo', title: '푸른여고 동창 모임 (2018)',
    text: '푸른여고 동창 모임이 다시 열렸다. 마수정은 2017년에 결혼했고 법률 사무소에서 일한다. 명소라는 중학교 체육 교사이고 육상부 코치도 맡는다. 오세라는 분식 체인 가맹점이 스무 곳이 되었다. 제갈윤아는 2017년에 코인을 사서 올해 초에 팔았다. 본인도 운이 좋았다고 말했다.',
    when: { year: 2018, month: 2, school: '푸른여고' },
    choices: [
      mixer('오세라의 가맹점 이야기를 듣는다', { bond: { c40: 2 }, stats: { 인맥: 1 } }, '오세라는 직원 교육용 영상을 직접 찍는다고 했다. 말이 빨라졌다.'),
      mixer('명소라의 육상부 이야기를 듣는다', { bond: { c39: 2 }, stats: { 체력: 1 } }, '명소라는 아침 운동장 습관이 학생들에게도 번졌다고 했다.'),
      mixer('제갈윤아에게 운이었다는 말을 다시 묻는다', { bond: { c41: 1 }, stats: { 지능: 1 } }, '제갈윤아는 다시 해도 같은 결과일지 모르겠다고 했다. 그 말이 솔직했다.'),
    ],
  },
  {
    id: 'w_reunion_2023_nteeyo', title: '푸른여고 동창 모임 (2023)',
    text: '푸른여고 동창 모임은 인원이 적었다. 오세라가 먼저 와서 앉아 있었다. 2022년에 이혼했고, 올해 가맹 사업을 정리해 직영 두 곳만 남겼다. 아들은 혼자 키운다고 했다. 모임 내내 휴대폰은 엎어 둔 채였다.',
    when: { year: 2023, month: 2, school: '푸른여고' },
    choices: [
      mixer('오세라의 이야기를 끝까지 듣는다', { bond: { c40: 2 }, stress: -2 }, '말이 끝나자 오세라가 숨을 길게 쉬었다. 그리고 밥을 먹기 시작했다.'),
      { label: '업계 아는 사람을 소개해 주겠다고 한다', when: { tier: { 인맥: 3 } }, effect: { bond: { c40: 2 }, set: ['소개:오세라'] }, result: '오세라가 명함 케이스를 꺼냈다. 이름을 하나 적어 주었다.' },
    ],
  },
  // --- 새길특성화고
  {
    id: 'w_reunion_2014_saegil', title: '새길특성화고 동창 모임 (2014)',
    text: '새길특성화고 동창 모임이 열렸다. 조대호는 올해 전기 기사 자격을 땄다. 차은영은 낮에는 경리로 일하고 밤에는 야간 대학에 다니며 자격증을 하나씩 딴다. 마형준은 군대를 다녀와 택배 기사로 일한다. 안기범은 아버지의 카센터를 이어받았다.',
    when: { year: 2014, month: 2, school: '새길특성화고' },
    choices: [
      mixer('조대호의 자격증 이야기를 듣는다', { bond: { c20: 2 }, stats: { 지능: 1 } }, '조대호는 자격증 시험장에서 손이 떨려 도면을 거꾸로 봤다고 웃었다.'),
      mixer('차은영에게 야간 대학 이야기를 묻는다', { bond: { c23: 2 }, stats: { 지능: 1 } }, '차은영은 장부를 꿰는 일이 즐겁다고 했다. 시험 일정은 달력에 빨갛게 쳐 있었다.'),
      mixer('마형준의 택배 일 이야기를 듣는다', { bond: { c24: 2 }, stats: { 체력: 1 } }, '마형준은 새벽 네 시에 일어나 분류장으로 간다고 했다. 농담은 변함이 없었다.'),
    ],
  },
  {
    id: 'w_reunion_2023_saegil', title: '새길특성화고 동창 모임 (2023)',
    text: '새길특성화고 동창 모임이 열렸다. 조대호는 2019년에 작은 전기 공사 회사를 열었다. 2022년에 공사 대금이 늦어져 한 번 위기를 넘겼다. 차은영은 2019년에 세무 사무소를 열었고 2021년에 결혼했다. 아이 없이 살기로 했다. 마형준은 직원 서른 명의 물류 회사를 운영한다. 2021년에 결혼해 2022년에 아들을 얻었다.',
    when: { year: 2023, month: 2, school: '새길특성화고' },
    choices: [
      mixer('조대호의 위기를 어떻게 넘겼는지 묻는다', { bond: { c20: 2 }, stats: { 지능: 1 } }, '조대호는 공사 대금 장부를 처음부터 다시 썼다고 했다. 차은영이 옆에서 고개를 끄덕였다.'),
      mixer('차은영에게 사무소 이야기를 듣는다', { bond: { c23: 2 }, stats: { 인맥: 1 } }, '차은영은 대학 간 친구들을 이제 부러워하지 않는다고 말했다.'),
      mixer('마형준의 아들 사진을 구경한다', { bond: { c24: 2 }, stress: -3 }, '마형준은 사진을 스무 장 넘기고서야 다음 이야기를 시작했다.'),
    ],
  },
];

// ---------- 사회인 일상 장면 (회사·연애는 다른 모듈이 맡는다) ----------
// 실제 사건은 data/news.js에 있는 사실만 배경으로 쓴다. 실존 인물 대사 없음.
const S = '사회인';
const life = [
  { id: 'w_army_enlist', title: '입대', text: '3월, 머리를 짧게 자르고 훈련소 앞에 섰다. 부모님이 손을 흔들었다. 이제 한동안 할 수 있는 일이 많지 않다.',
    when: { year: 2010, month: 3, sex: '남', stage: '대학', notSchool: ['한성대', 'NIT'] }, effect: { set: ['군입대'], stress: 5 } },
  { id: 'w_army_leave', title: '첫 휴가', text: '첫 휴가를 나왔다. 집 밥이 이렇게 맛있는 줄 몰랐다. 친구들에게 연락을 돌리는데 나흘이 금방 갔다.',
    when: { year: 2010, month: 10, flag: '군입대', notFlag: '전역', notSchool: ['한성대', 'NIT'] }, effect: { stress: -6 } },
  { id: 'w_army_discharge', title: '전역', text: '12월, 위병소를 걸어 나왔다. 군복을 벗으니 어색하다. 달력에는 복학과 앞으로의 일이 비어 있다.',
    when: { year: 2011, month: 12, flag: '군입대', notSchool: ['한성대', 'NIT'] }, effect: { set: ['전역'], stress: -8 } },
  // 졸업 직후 진로별 첫 달
  { id: 'w_first_month', title: '학교를 떠난 첫 달',
    text: '학교를 떠나 맞는 첫 달이다. 학생증 대신 신분증을 꺼내는 날이 늘었다. 통장에는 등록금도 과외비도 찍히지 않는다. 월세와 교통비를 처음으로 한 장의 종이에 적어 보았다.',
    when: { stage: S, from: 201203 },
    choices: [
      { label: '지출을 꼼꼼히 적는다', effect: { stats: { 지능: 1 }, stress: 1 }, result: '식비가 예상보다 컸다. 다음 달 칸에 숫자를 하나 줄여 적었다.' },
      { label: '일단 며칠 쉰다', effect: { stress: -5 }, result: '아침에 알람을 끄고 늦게까지 잤다. 불안은 점심 무렵에야 올라왔다.' },
    ] },
  { id: 'w_path_창업', title: '창업의 첫 주', text: '빌린 책상 하나와 노트북이 전부다. 아침에 가장 먼저 통장 잔액을 확인한다. 명함에 적을 이름을 사흘째 고민 중이다.',
    textOf: (s) => (s.company ? `졸업장을 서랍에 넣고 ${s.company.name ?? '회사'} 사무실로 출근했다. 이제 수업 핑계는 없다. 대표 명함을 새로 찍었다. 학생 대표라는 말이 빠지니 어깨가 조금 무거워졌다.` : '빌린 책상 하나와 노트북이 전부다. 아침에 가장 먼저 통장 잔액을 확인한다. 명함에 적을 이름을 사흘째 고민 중이다.'),
    when: { stage: S, flag: '진로:창업' }, effect: { stress: 2, stats: { 인맥: 1 } } },
  { id: 'w_path_대학원', title: '연구실 첫 출근', text: '연구실 첫 출근 날이다. 지도교수와 일정표를 맞춘다. 학부 때와 달리 질문이 먼저 온다. 실험 노트 첫 장에 날짜를 적었다.',
    when: { stage: S, flag: '진로:대학원' }, effect: { stats: { 지능: 1 }, stress: 2 } },
  { id: 'w_path_프리랜서', title: '프리랜서의 달력', text: '의뢰 일정을 달력에 색으로 나눴다. 출근 시간은 없는데 마감이 매달 온다. 입금일을 빨간 동그라미로 쳐 두었다.',
    when: { stage: S, flag: '진로:프리랜서' }, effect: { stats: { 인맥: 1 }, stress: 1 } },

  // 2012~2013
  { id: 'w_2012_07_london', title: '새벽 올림픽', text: '런던 올림픽 경기가 새벽에 열린다. 휴대폰 화면을 이불 속에서 본다. 경기가 끝나자 창밖이 밝아졌다.',
    when: { stage: S, year: 2012, month: 7 }, effect: { stress: -2 } },
  { id: 'w_2012_09_chuseok', title: '추석 귀향', text: '추석에 부모님 집에 간다. 현관에 신발이 많다. 어머니가 일은 힘들지 않냐고 묻고, 아버지는 월급 날짜를 묻는다. 둘 다 같은 걱정이다.',
    when: { stage: S, year: 2012, month: 9 },
    choices: [
      { label: '솔직하게 말한다', effect: { stress: -3 }, result: '힘든 날도 있다고 말했다. 어머니가 반찬을 한 통 더 쌌다.' },
      { label: '잘 지낸다고만 말한다', effect: { stress: 1 }, result: '웃으며 대답했다. 돌아오는 길에 거울을 한 번 더 봤다.' },
    ] },
  { id: 'w_2012_12_vote', title: '투표소 줄', text: '대통령 선거일이다. 아침 일찍 투표소 앞에 줄이 길게 섰다. 앞사람이 신분증을 못 찾아 잠시 지체됐다. 도장을 찍고 나오니 이른 겨울 해가 밝았다.',
    when: { stage: S, year: 2012, month: 12 }, effect: { stress: -1 } },

  // 2014~2017
  { id: 'w_2014_06_worldcup', title: '브라질 월드컵', text: '월드컵 경기가 새벽에 열린다. 동네 치킨집에 사람들이 모였다. 한국은 조별리그에서 탈락했다. 경기가 끝나자 한동안 아무도 말이 없다가 누군가 계산서를 집었다.',
    when: { stage: S, year: 2014, month: 6 }, effect: { stress: 1, stats: { 인맥: 1 } } },
  { id: 'w_2014_09_asiad', title: '아시안게임', text: '인천 아시안게임이 한창이다. 점심시간마다 식당 TV 앞에 사람들이 모인다. 한국이 종합 2위를 한다는 소식에 다들 한 번씩 웃었다.',
    when: { stage: S, year: 2014, month: 9 }, effect: { stress: -2 } },
  { id: 'w_2014_c08_return', title: '귀국 소문', who: '윤하나',
    text: '역삼동 골목에 소문이 돈다. 미국에서 공부하던 윤하나가 한국으로 돌아와 아버지 회사에 들어갔다는 이야기다. 어릴 적 피아노 소리가 나던 집 창문을 지나쳤다.',
    when: { stage: S, year: 2014, month: 11 }, effect: { set: ['소식:윤하나귀국'] } },
  { id: 'w_2015_03_rent', title: '전세 계약', text: '전세 계약서를 쓰는 날이다. 부동산 사무실 의자가 낮다. 집주인이 도장을 찍기 전에 보증금을 한 번 더 말했다. 숫자를 입으로 따라 읽었다.',
    when: { stage: S, year: 2015, month: 3 },
    choices: [
      { label: '계약서 조항을 하나씩 읽는다', effect: { stats: { 지능: 1 }, stress: 2 }, result: '특약 한 줄을 고쳐 달라고 말했다. 중개인이 잠시 놀란 얼굴을 했다.' },
      { label: '중개인을 믿고 서명한다', effect: { stress: -1 }, result: '서명은 금방 끝났다. 열쇠를 받고 나서야 손에 땀이 났다.' },
    ] },
  { id: 'w_2015_05_mers', title: '마스크 유행', text: '메르스 확진 소식이 이어진다. 지하철에서 마스크를 쓴 사람이 눈에 띄게 늘었다. 병원 방문을 미루는 사람도 많다. 퇴근길 약국 앞에 손 소독제가 쌓여 있다.',
    when: { stage: S, year: 2015, month: 5 }, effect: { stress: 2 } },
  { id: 'w_2015_10_wedding', title: '청첩장', text: '친구가 청첩장을 건넸다. 날짜는 내년 봄이다. 식사 자리에서 신랑이 신부 이름을 말할 때 눈이 가늘어졌다. 축의금 봉투를 고르는 일이 의외로 어렵다.',
    when: { stage: S, year: 2015, month: 10 },
    choices: [
      { label: '축의금과 함께 편지를 쓴다', effect: { cash: -100000, stats: { 인맥: 1 } }, result: '편지는 세 줄이었다. 친구가 읽다가 크게 웃었다.' },
      { label: '봉투만 준비한다', effect: { cash: -50000 }, result: '봉투에 이름을 적고 접수대에 놓았다. 식은 짧고 따뜻했다.' },
    ] },
  { id: 'w_2016_03_go', title: '바둑 대국', text: '서울에서 인공지능과 사람의 바둑 대국이 열린다. 점심 식당 TV 앞에서 모두 숨을 죽인다. 바둑을 모르는 사람도 수 하나가 놓일 때마다 탄성을 낸다.',
    when: { stage: S, year: 2016, month: 3 }, effect: { stats: { 지능: 1 } } },
  { id: 'w_2016_04_gym', title: '헬스장 등록', text: '건강검진 결과지에 노란 칸이 늘었다. 퇴근길에 헬스장 간판을 올려다본다. 상담 직원이 몇 개월 등록할지 묻는다.',
    when: { stage: S, year: 2016, month: 4 },
    choices: [
      { label: '석 달을 끊는다', effect: { cash: -150000, stats: { 체력: 1 } }, result: '첫 주에는 다섯 번 갔다. 둘째 주에는 세 번 갔다.' },
      { label: '근처 공원을 걷는다', effect: { stress: -2 }, result: '저녁마다 공원을 한 바퀴 걸었다. 돈은 들지 않았다.' },
    ] },
  { id: 'w_2016_06_c15', title: '낯익은 이름', who: '백가영',
    text: '택시 라디오에서 낯익은 이름의 가수가 부른 곡이 나온다. 푸른여고 시절 축제 무대에서 보았던 사람이다. 기사님이 이 노래가 요즘 어디서나 들린다고 한다.',
    when: { stage: S, year: 2016, month: 6 }, effect: { stress: -1 } },
  { id: 'w_2016_09_quake', title: '지진', text: '경주에서 지진이 났다. 책상 위 컵이 한 번 흔들렸다. 가족에게 안부 문자를 보냈고 답은 금방 왔다. 퇴근길에 다들 휴대폰을 보며 걸었다.',
    when: { stage: S, year: 2016, month: 9 }, effect: { stress: 2 } },
  { id: 'w_2016_09_law', title: '식사 약속', text: '청탁금지법이 시행된 지 열흘쯤 지났다. 점심 약속을 미루는 사람이 늘었다. 식당에서 계산서를 각자 나누는 풍경이 낯설다. 영수증을 챙기는 손이 평소보다 조심스럽다.',
    when: { stage: S, year: 2016, month: 10 }, effect: { stress: 1 } },
  { id: 'w_2017_05_vote', title: '선거일', text: '대통령 선거일이다. 투표소 앞에 가족 단위로 온 사람이 많다. 투표를 마치고 나오는 길에 어린아이가 투표 도장이 찍힌 손등을 자랑한다.',
    when: { stage: S, year: 2017, month: 5 }, effect: { stress: -1 } },
  { id: 'w_2017_08_move', title: '이사하는 날', text: '이사 트럭이 오전에 도착했다. 상자마다 이름을 적어 놓았는데 한 상자만 이름이 없다. 새집 열쇠를 처음 꽂을 때 손끝이 떨렸다.',
    when: { stage: S, year: 2017, month: 8 },
    choices: [
      { label: '상자를 풀며 집을 정리한다', effect: { stress: 2, stats: { 체력: 1 } }, result: '저녁이 되어서야 침대 자리를 잡았다. 창밖 불빛이 처음 보는 색이다.' },
      { label: '짜장면부터 시켜 먹는다', effect: { stress: -3, cash: -10000 }, result: '상자 위에 앉아 면을 먹었다. 이사 첫날의 맛이었다.' },
    ] },
  { id: 'w_2017_12_coin', title: '모임의 코인 이야기', text: '송년 모임에서 누군가 코인 이야기를 꺼낸다. 앞자리에서 숫자가 크게 오갔다. 옆자리 사람은 말없이 휴대폰 화면을 한참 본다. 대화가 오래 끊기지 않았다.',
    when: { stage: S, year: 2017, month: 12 }, effect: { stress: 1 } },

  // 2018~2019
  { id: 'w_2018_02_pyeongchang', title: '평창 올림픽', text: '평창 동계올림픽이 열린다. 점심시간에 식당 TV로 같이 본다. 경기가 끝나면 사람들이 서로 몇 번 박수를 친다.',
    when: { stage: S, year: 2018, month: 2 }, effect: { stress: -2 } },
  { id: 'w_2018_04_summit', title: '정상회담 생중계', text: '남북 정상회담이 생중계된다. 식당 TV 앞에서 수저가 멈췄다. 옆 테이블 어른이 오래 보다가 말없이 국물을 마셨다.',
    when: { stage: S, year: 2018, month: 4 }, effect: { stress: -1 } },
  { id: 'w_2018_05_c01_open', title: '개업식', who: '정민혁',
    text: '역삼동에 큰 중식당이 문을 열었다. 정민혁이 주방 앞에서 앞치마를 두르고 손님을 맞는다. 홀은 서른 석이 넘는다. 아버지의 은퇴 뒤 대출을 내 넓혔다고 한다.',
    when: { stage: S, year: 2018, month: 5 },
    choices: [
      { label: '크게 하지 말라고 말한다', effect: { bond: { c01: 2 }, set: ['조언:정민혁'] }, result: '정민혁은 웃으며 대답을 피했다. 그러다 나중에 한 번 더 이야기를 꺼냈다.' },
      { label: '축하만 한다', effect: { bond: { c01: 1 }, stress: -2 }, result: '짜장면 곱빼기를 시켰다. 면발이 어릴 적 먹던 맛 그대로였다.' },
    ] },
  { id: 'w_2018_06_germany', title: '독일전', text: '월드컵 조별리그 독일전이 열린 날이다. 한국이 2대 0으로 이겼다. 동네 호프집 앞까지 함성이 터져 나왔다. 모르는 사람과 손바닥을 맞췄다.',
    when: { stage: S, year: 2018, month: 6 }, effect: { stress: -4, stats: { 인맥: 1 } } },
  { id: 'w_2018_07_52h', title: '퇴근 시간', text: '주 52시간제가 시행됐다. 저녁 시간대 동네 식당에 손님이 일찍 들어온다. 퇴근 시간이 같은 사람끼리 모임이 늘었다.',
    when: { stage: S, year: 2018, month: 7 }, effect: { stress: -2 } },
  { id: 'w_2019_04_5g', title: '요금제 문자', text: '5G 서비스가 시작됐다는 문자가 왔다. 요금제 이름이 길어서 두 번 읽어야 했다. 매장 앞에서 직원이 설명을 해 주는데 용어가 낯설다.',
    when: { stage: S, year: 2019, month: 4 }, effect: { stress: 1 } },
  { id: 'w_2019_05_film', title: '영화관 앞 줄', text: '칸에서 한국 영화가 큰 상을 받았다는 소식이 나온 뒤 영화관 앞에 줄이 길다. 상영 시간표에 빈 자리가 거의 없다. 영화관을 나오는 사람들이 한참 말이 없다.',
    when: { stage: S, year: 2019, month: 6 },
    choices: [
      { label: '혼자 보러 간다', effect: { cash: -12000, stress: -3 }, result: '혼자 앉은 자리가 의외로 편했다. 끝나고 한동안 극장 앞에 서 있었다.' },
      { label: '친구와 같이 본다', effect: { cash: -24000, stats: { 인맥: 1 } }, result: '영화 끝나고 저녁 먹는 동안 장면 이야기만 했다.' },
    ] },
  { id: 'w_2019_10_checkup', title: '건강검진', text: '건강검진 결과지가 집으로 왔다. 혈압 칸에 작은 별표가 하나 있다. 수치를 인터넷에서 찾아보다가 그만두었다. 내일 병원에 전화하기로 했다.',
    when: { stage: S, year: 2019, month: 10 },
    choices: [
      { label: '병원에 다시 간다', effect: { stats: { 체력: 1 }, stress: 2 }, result: '의사가 약은 필요 없고 생활을 조금 바꾸자고 했다. 소금 이야기를 길게 들었다.' },
      { label: '결과지를 서랍에 넣는다', effect: { stress: -1 }, result: '그 서랍은 한동안 열지 않았다.' },
    ] },
  { id: 'w_2019_12_delivery', title: '야식 배달', text: '퇴근하고 배달 앱을 켠다. 한 시간 걸린다는 안내가 뜬다. 현관 앞에서 배달 오토바이 소리가 멈추면 괜히 문을 연다.',
    when: { stage: S, year: 2019, month: 12 }, effect: { stress: -2, cash: -15000 } },

  // 2020~2021 코로나
  { id: 'w_2020_02_mask', title: '약국 앞 줄', text: '코로나 확진자가 급증했다. 약국 앞에 마스크를 사려는 줄이 길게 섰다. 맨 뒤에 서서 차례를 기다린다. 앞사람이 이름을 대자 점원이 고개를 저었다.',
    when: { stage: S, year: 2020, month: 2 }, effect: { stress: 4 } },
  { id: 'w_2020_03_video', title: '화상 모임', text: '모임이 화상 대화로 바뀌었다. 화면에 얼굴이 작은 네모로 뜬다. 누군가 마이크를 끄지 않아 부엌 소리가 다 들린다. 끝나고 나니 오히려 더 피곤하다.',
    when: { stage: S, year: 2020, month: 3 }, effect: { stats: { 인맥: 1 }, stress: 1 } },
  { id: 'w_2020_05_street', title: '텅 빈 거리', text: '평소 줄이 길던 골목 식당이 한산하다. 불이 꺼진 가게도 눈에 띈다. 사장님이 문 앞에 내놓은 메뉴판을 괜히 한 번 읽었다.',
    when: { stage: S, year: 2020, month: 5 },
    choices: [
      { label: '단골 식당에서 포장해 온다', effect: { cash: -12000, stress: -2 }, result: '사장님이 반찬을 하나 더 넣어 주었다. 고맙다는 말을 두 번 했다.' },
      { label: '그냥 지나친다', effect: { stress: 1 }, result: '집에서 라면을 끓였다. 창밖이 조용했다.' },
    ] },
  { id: 'w_2020_06_c06', title: '예약제 미용실', who: '이소영',
    text: '동네 미용실이 예약제로 바뀌었다. 문 앞에 손 소독제와 예약표가 붙어 있다. 이소영이 가운을 두르며 말한다. "오늘은 손님이 한 분씩만 와요. 조용해서 이야기하기 좋아요."',
    when: { stage: S, year: 2020, month: 6 }, effect: { bond: { c06: 1 }, stress: -3 } },
  { id: 'w_2020_11_distance', title: '거리두기', text: '거리두기 단계가 올라갔다. 저녁 약속이 줄줄이 취소된다. 단체 대화방에서 다음 만남을 정하자는 말만 오가고 날짜는 정해지지 않는다.',
    when: { stage: S, year: 2020, month: 11 }, effect: { stress: 3 } },
  { id: 'w_2021_01_kospi', title: '부모님 전화', text: '부모님이 전화로 주식 이야기를 꺼낸다. 뉴스에서 지수가 처음으로 높은 값을 넘었다고 한다. 전화를 끊고 나서도 어머니의 말투가 마음에 남는다.',
    when: { stage: S, year: 2021, month: 1 },
    choices: [
      { label: '조심하시라고 말한다', effect: { stress: 1, stats: { 지능: 1 } }, result: '아버지가 걱정 말라고 하며 웃었다. 어머니는 통화를 짧게 끝냈다.' },
      { label: '안부만 묻고 끊는다', effect: { stress: -1 }, result: '요즘 날씨 이야기를 했다. 어머니가 감기 조심하라고 했다.' },
    ] },
  { id: 'w_2021_05_birthday', title: '작은 생신 상', text: '부모님 생신에 작은 식당을 예약했다. 모일 수 있는 인원이 정해져 있어서 식구 모두 오지는 못했다. 영상 통화로 케이크 촛불을 같이 불었다.',
    when: { stage: S, year: 2021, month: 5 }, effect: { stress: -3, cash: -60000 } },
  { id: 'w_2021_06_c01_close', title: '폐업하는 날', who: '정민혁',
    text: '정민혁의 큰 식당이 문을 닫는 날이다. 의자를 쌓아 올리는 소리만 들린다. 정민혁은 주방 불을 끄고 나서야 의자에 앉는다. 아내가 월급으로 버티며 배달 전문점을 준비한다고 했다.',
    when: { stage: S, year: 2021, month: 6, notFlag: '조언:정민혁' },
    choices: [
      { label: '의자 옮기는 것을 돕는다', effect: { bond: { c01: 2 }, stats: { 체력: 1 }, stress: 2 }, result: '말없이 의자를 쌓았다. 마지막 의자를 올리자 정민혁이 고맙다고 한 번 말했다.' },
      { label: '짜장면 한 그릇을 먹고 간다', effect: { bond: { c01: 1 }, cash: -8000 }, result: '마지막 손님이 되었다. 계산하려는데 정민혁이 손을 저었다.' },
    ] },
  { id: 'w_2021_07_two', title: '둘만의 약속', text: '거리두기 4단계다. 저녁 모임이 두 사람까지만 가능하다. 친구와 단둘이 마주 앉으니 어색하게 말이 길어졌다. 식당 문이 일찍 닫혔다.',
    when: { stage: S, year: 2021, month: 7 }, effect: { stats: { 인맥: 1 }, stress: -1 } },
  { id: 'w_2021_09_drama', title: '모두가 보는 드라마', text: '점심시간마다 같은 드라마 이야기가 나온다. 안 본 사람은 줄거리를 얻어 듣는다. 놀이터에서 아이들이 드라마 속 놀이를 따라 한다고 한다.',
    when: { stage: S, year: 2021, month: 9 }, effect: { stress: -2 } },
  { id: 'w_2021_11_withcorona', title: '일상 회복', text: '단계적 일상회복이 시작됐다. 오랜만에 저녁 모임이 열린다. 마스크를 벗고 얼굴을 보는 일이 이상하게 쑥스럽다. 한쪽에서 박수가 터졌다.',
    when: { stage: S, year: 2021, month: 11 }, effect: { stress: -4, stats: { 인맥: 1 } } },

  // 2022~2023
  { id: 'w_2022_03_vote', title: '투표소와 거리두기', text: '대통령 선거일이다. 투표소 앞 줄이 길다. 같은 주에 거리두기 완화 소식도 나왔다. 줄 선 사람들 마스크 위로 눈이 오래 마주쳤다.',
    when: { stage: S, year: 2022, month: 3 }, effect: { stress: -1 } },
  { id: 'w_2022_11_cup', title: '카타르 월드컵', text: '월드컵 경기가 새벽과 밤에 열린다. 직장 사람들과 단체 대화방에서 응원을 주고받는다. 경기가 끝나면 다음 날 출근길에 서로 졸린 얼굴로 인사한다.',
    when: { stage: S, year: 2022, month: 11 }, effect: { stress: -2, stats: { 인맥: 1 } } },
  { id: 'w_2022_11_rate', title: '이자 이야기', text: '기준금리가 또 올랐다는 뉴스가 나온다. 점심 자리에서 대출 이자 이야기가 길어진다. 집을 산 사람은 숫자를 말하고, 전세인 사람은 월세를 말한다. 다들 계산기를 두드린다.',
    when: { stage: S, year: 2022, month: 11 }, effect: { stress: 3 } },
  { id: 'w_2023_01_mask', title: '마스크를 벗은 날', text: '실내 마스크 착용 의무가 풀렸다. 지하철 안에서도 맨얼굴이 늘었다. 마스크 없이 보는 동료의 얼굴이 낯설어서 잠깐 말이 끊겼다.',
    when: { stage: S, year: 2023, month: 1 }, effect: { stress: -3 } },
  { id: 'w_2023_05_alert', title: '모임이 돌아왔다', text: '코로나 위기 경보 단계가 낮아졌다. 동창과 친구 모임 일정이 한꺼번에 잡힌다. 주말마다 약속이 두 개씩 겹친다.',
    when: { stage: S, year: 2023, month: 5 }, effect: { stats: { 인맥: 1 }, stress: -2 } },
  { id: 'w_2023_08_ai', title: '대화형 AI', text: '직장 동료가 대화형 AI 서비스를 써 보라고 한다. 질문 몇 개를 입력해 본다. 답이 그럴듯하게 이어지는 게 신기하면서도 불안하다.',
    when: { stage: S, year: 2023, month: 8 },
    choices: [
      { label: '업무에 써 본다', effect: { stats: { 지능: 1 } }, result: '초안은 빨리 나왔다. 틀린 부분을 찾는 데 시간이 걸렸다.' },
      { label: '궁금한 것만 물어본다', effect: { stress: -1 }, result: '요리법을 물었다. 간장 양이 이상해서 직접 맛을 보고 고쳤다.' },
    ] },
  { id: 'w_2023_10_c02_book', title: '신간 코너', who: '한유진',
    text: '서점 신간 코너에 낯익은 이름의 소설책이 놓여 있다. 한유진의 첫 책이다. 1인 출판사 이름이 속표지에 작게 적혀 있다.',
    when: { stage: S, year: 2023, month: 10 },
    choices: [
      { label: '한 권 산다', effect: { cash: -15000, bond: { c02: 1 }, stress: -2 }, result: '카페에서 첫 장을 읽었다. 문장이 짧았다. 한참 뒤에 책을 덮었다.' },
      { label: '표지만 보고 나온다', effect: { stress: -1 }, result: '표지 사진을 찍어 두었다. 나중에 사야겠다고 생각했다.' },
    ] },

  // 2024~2026
  { id: 'w_2024_04_vote', title: '총선 투표', text: '국회의원 선거일이다. 투표소 가는 길에 동네 가게들이 평소처럼 열려 있다. 투표를 마치고 나오니 점심시간이다.',
    when: { stage: S, year: 2024, month: 4 }, effect: { stress: -1 } },
  { id: 'w_2024_07_paris', title: '파리 올림픽', text: '올림픽 경기를 새벽에 본다. 단체 대화방에 경기 소식이 올라온다. 출근길에 모두 졸리지만 표정은 밝다.',
    when: { stage: S, year: 2024, month: 7 }, effect: { stress: -2 } },
  { id: 'w_2024_10_nobel', title: '서점 진열대', text: '소설가의 노벨 문학상 수상 소식이 나온 뒤 동네 서점 진열대가 달라졌다. 책이 한꺼번에 팔렸다고 주인이 말한다. 계산대 앞에 선 사람들이 서로 책 이름을 확인한다.',
    when: { stage: S, year: 2024, month: 10 },
    choices: [
      { label: '한 권 산다', effect: { cash: -14000, stats: { 지능: 1 } }, result: '첫 장을 넘기고 한 문장을 소리 내어 읽었다. 천천히 읽어야 할 책이었다.' },
      { label: '주인과 이야기만 나눈다', effect: { stats: { 인맥: 1 }, stress: -1 }, result: '주인은 이번 주가 서점을 열고 가장 바쁜 주라고 했다.' },
    ] },
  { id: 'w_2025_03_fire', title: '산불 소식', text: '경북 산불 소식이 계속 들려온다. 대피한 사람들 이야기가 뉴스에 이어진다. 회사 게시판에 모금 안내가 올라왔다.',
    when: { stage: S, year: 2025, month: 3 },
    choices: [
      { label: '성금을 낸다', effect: { cash: -50000, stress: -1 }, result: '이체를 하고 영수증 문자를 받았다. 작은 숫자라는 생각이 들었다.' },
      { label: '소식을 끝까지 읽는다', effect: { stress: 2 }, result: '기사를 하나씩 읽었다. 밤이 되도록 휴대폰을 놓지 못했다.' },
    ] },
  { id: 'w_2025_06_vote', title: '이른 투표', text: '대통령 선거일이다. 아침 일찍 투표소가 붐볐다. 투표를 마치고 나오는 길에 편의점에서 커피를 샀다.',
    when: { stage: S, year: 2025, month: 6 }, effect: { stress: -1 } },
  { id: 'w_2025_10_kospi', title: '지수 속보', text: '지수가 처음으로 큰 숫자를 넘었다는 속보가 뜬다. 점심 자리에서 그 이야기만 한다. 주식을 하는 사람과 하지 않는 사람이 말을 섞지 못하고 웃는다. 경주에서는 정상회의가 열리고 있다.',
    when: { stage: S, year: 2025, month: 10 }, effect: { stress: 1 } },
  { id: 'w_2026_01_kospi', title: '새해 속보', text: '새해 첫 주 지수가 또 새로운 숫자를 넘겼다. 부모님은 무덤덤하게 뉴스를 본다. 아버지는 이럴 때가 제일 조심할 때라고 말했다.',
    when: { stage: S, year: 2026, month: 1 }, effect: { stress: 1 } },
  { id: 'w_2026_02_olympic', title: '밀라노 동계올림픽', text: '동계올림픽 경기를 밤늦게 본다. 한국이 메달을 딴 날이면 출근길 표정이 밝다. 폐막식이 끝난 뒤 휴대폰 알림이 한꺼번에 잠잠해졌다.',
    when: { stage: S, year: 2026, month: 2 }, effect: { stress: -2 } },
  { id: 'w_2026_03_wbc', title: '야구 대표팀', text: '야구 국가대표팀이 호주를 꺾고 8강에 올랐다. 회사 복도에서 만난 사람마다 어제 경기 이야기를 한다. 17년 만이라는 말을 여러 번 들었다.',
    when: { stage: S, year: 2026, month: 3 }, effect: { stress: -3, stats: { 인맥: 1 } } },
  { id: 'w_2026_06_local', title: '지방선거', text: '지방선거일이다. 투표소 앞 현수막이 여름 햇빛에 반짝인다. 지나가던 아이가 어른들 틈에서 도장 찍는 흉내를 낸다.',
    when: { stage: S, year: 2026, month: 6 }, effect: { stress: -1 } },
  { id: 'w_2026_06_cup', title: '월드컵 조별리그', text: '월드컵 조별리그 한국전이 열린 밤이다. 마지막 경기에서 한국은 남아공에 졌다. 다들 한숨을 쉬고 치킨 접시를 비웠다. 동네 호프집에서 박수 소리가 잠깐 났다.',
    when: { stage: S, year: 2026, month: 6 }, effect: { stress: 2, stats: { 인맥: 1 } } },
];

const clubFairRetry = [clubRetry(SNU, 2009, 3), clubRetry(NIT, 2009, 9)];
const clubYear2Events = [clubYear2(SNU, 2009, 4), clubYear2(NIT, 2009, 10)];
const electionEvents = [election(SNU, '여'), election(SNU, '남'), election(NIT, '여'), election(NIT, '남')];
const electTermEvents = [electTerm('여'), electTerm('남')];

export default [
  ...snuScenes, ...mitScenes,
  ...clubFairRetry, ...clubEvents, ...clubFlavor, ...clubYear2Events,
  ...peopleScenes, ...midScenes,
  ...electionEvents, ...electEvents, ...electTermEvents,
  ...stageApplyEvents, ...stageEvents,
  ...contestApplyEvents, ...contestEvents, ...internEvents,
  ...armyScenes, ...careerEvents, ...gradEvents,
  ...reunions, ...life,
];
