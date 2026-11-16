// 연락 창 규칙(순수 함수). 화면은 src/screens/messenger.js. 설계: docs/2026-11-10_연락창_인연유지_설계.md
// 시기마다 쓰는 앱이 바뀐다. 한 달 3번까지 활동 칸을 쓰지 않고 연락한다. 사이는 직접 대화의 절반만 오른다.
import { stageOf, ageOf, charmTalk, addStress } from './rules.js';
import { personOf } from './network.js';
import { bumpSmall, bondOf, knows, promise, mateOf } from './bonds.js';
import { canAppear } from './cast.js';

export const LIMIT = 3;
const KEEP = 20; // 사람마다 남기는 대화 수
const ym = (s) => s.year * 100 + s.month;
const m12 = (s) => s.year * 12 + s.month;
const hash = (t) => { let x = 2166136261; for (const c of String(t)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } x ^= x >>> 13; x = Math.imul(x, 1597334677); x ^= x >>> 16; return x >>> 0; };
const minor = (s) => ['초등', '중학', '고등'].includes(stageOf(s));

// 앱: 이름, 열리는 때(YYYYMM), 조건.
export const APPS = {
  buddy: { name: '버디버디', from: 200001, to: 200412 },
  cy: { name: '싸이월드', from: 200301, to: 201112 },
  sms: { name: '문자', from: 200001, to: 201112, ok: (s) => !['초등', '중학'].includes(stageOf(s)), abroad: false },
  kakao: { name: '카톡', from: 201003, to: 999912 },
  insta: { name: '인스타그램', from: 201401, to: 999912 },
};
export const appsAt = (s) => Object.keys(APPS).filter((k) => { const a = APPS[k]; return ym(s) >= a.from && ym(s) <= a.to && (!a.ok || a.ok(s)); });
// 고른 앱이 지금 없으면 가장 새 앱.
export const appOf = (s, want) => { const list = appsAt(s); return list.includes(want) ? want : list[list.length - 1] ?? null; };

// 상태
export function init(s) {
  s.chat ??= { threads: {}, month: 0, n: 0, sent: {} };
  if (s.chat.month !== ym(s)) { s.chat.month = ym(s); s.chat.n = 0; s.chat.sent = {}; }
  return s.chat;
}
export const left = (s) => LIMIT - init(s).n;
export const threadOf = (s, id) => init(s).threads[id] ?? [];

// 연락할 수 있는 사람. 학생 때는 또래만, 성인이면 가족·선생님 말고 아는 사람 모두.
const isKin = (id) => ['부모님', '아버지', '어머니', '미영'].includes(id);
export function contactable(s, id) {
  if (isKin(id) || /^t\d/.test(id) || !knows(s, id)) return false;
  if (minor(s) && !/^c\d/.test(id)) return false;
  return id === s.partner?.id || canAppear(id, stageOf(s));
}
export const contacts = (s) => Object.keys(s.bonds ?? {}).filter((id) => contactable(s, id));
// 마지막으로 보거나 연락한 뒤 지난 달 수.
export const gapOf = (s, id) => (s.bondSeen?.[id] == null ? null : m12(s) - s.bondSeen[id]);

// 행동: 안부, 고민, 약속. 앱마다 이름이 다르다.
export const ACTS = ['hello', 'worry', 'plan'];
const LABEL = {
  buddy: { hello: '버디버디 쪽지 보내기', worry: '밤에 고민 털어놓기', plan: '만나자고 하기' },
  cy: { hello: '방명록 남기기', worry: '비밀 방명록 남기기', plan: '쪽지로 약속 잡기' },
  sms: { hello: '안부 문자', worry: '고민 문자', plan: '약속 문자' },
  kakao: { hello: '안부 카톡', worry: '고민 털어놓기', plan: '약속 잡기' },
  insta: { hello: '게시물에 댓글 달기', worry: 'DM으로 고민 털어놓기', plan: 'DM으로 약속 잡기' },
};
export const actLabel = (app, act) => LABEL[app]?.[act] ?? act;

// 내가 보내는 글과 상대 답은 나이대(그때 말투)로 고르고, 앱에 맞는 말을 몇 개 더 섞는다. {n}은 상대 이름, {me}는 내 이름.
// 선배·연상에게는 존댓말을 쓴다(honorOf). 학생 때 글에는 술·연애 이야기를 넣지 않는다.
export const BANDS = ['kid', 'teen', 'hs', 'uni', 'twenties', 'thirties'];
export function bandOf(s) {
  const st = stageOf(s), age = ageOf(s);
  if (st === '초등') return 'kid';
  if (st === '중학') return 'teen';
  if (st === '고등') return 'hs';
  if (st === '대학' || age < 24) return 'uni';
  return age < 30 ? 'twenties' : 'thirties';
}
const MINE = {
  kid: {
    hello: ['{n}! 뭐 해? 나 숙제 다 했다', '내일 학교 끝나고 놀이터에서 놀자', '어제 만화 봤어? 완전 웃겼어', '{n} 나 새 게임 생겼다!'],
    worry: ['나 오늘 엄마한테 혼났어 ㅠㅠ', '받아쓰기 망했어… 어떡하지', '나 요즘 친구랑 좀 싸웠어'],
    plan: ['토요일에 우리 집에 놀러 올래?', '다음에 문방구 같이 가자', '방학 때 같이 수영장 가자!'],
  },
  teen: {
    hello: ['ㅎㅇ 뭐함?', '오늘 담임 쌤 완전 웃기지 않았냐 ㅋㅋ', '{n} 너 그 노래 들어 봤어? 대박임', '심심하다… 뭐하냐'],
    worry: ['나 시험 완전 망함 ㅠㅠ', '요즘 학원 너무 많아서 죽겠다', '아 진짜 고민 있는데 들어 줄 거지?'],
    plan: ['주말에 시내 갈래?', '시험 끝나면 노래방 가자', '다음 달에 같이 영화 보러 가자'],
  },
  hs: {
    hello: ['야자 끝났냐', '{n} 모의고사 어떻게 봤어?', '오늘 급식 뭐 나왔냐 ㅋㅋ', '졸려 죽겠다… 넌 아직 공부 중?'],
    worry: ['나 요즘 성적 때문에 머리 아프다', '진로 때문에 고민이야. 넌 정했어?', '부모님이랑 좀 부딪혔어'],
    plan: ['시험 끝나면 떡볶이 먹으러 가자', '주말에 독서실 같이 갈래?', '수능 끝나면 진짜 놀러 가자'],
  },
  uni: {
    hello: ['과제 지옥이다 진짜 ㅋㅋ', '{n} 종강했어?', '요즘 학교생활 어때?', '갑자기 생각나서 연락해 봤어'],
    worry: ['학점이 너무 안 나와서 고민이다', '휴학할까 생각 중이야', '진로를 아직도 모르겠어'],
    plan: ['종강하면 술 한잔 하자', '다음 달에 밥 한번 먹자', '방학 때 여행 갈래?'],
  },
  twenties: {
    hello: ['회사 어때? 할 만해?', '{n} 야근 중이야? ㅋㅋ', '요즘 잘 지내지? 바빠 보이더라', '월급날만 기다린다…'],
    worry: ['나 이직 고민 중이야', '요즘 회사에서 좀 지친다', '사는 게 생각보다 빡세다 ㅎ'],
    plan: ['주말에 밥 먹자. 진짜로', '퇴근하고 한잔 할래?', '다음 달에 시간 맞춰 보자'],
  },
  thirties: {
    hello: ['잘 지내지? 요즘 많이 바쁘지', '{n} 건강은 괜찮아? 우리도 이제 챙겨야 돼', '문득 옛날 생각나서 연락해 봤어', '집은 다들 별일 없지?'],
    worry: ['요즘 일이랑 집안일 사이에서 정신이 없다', '나이 드니까 고민이 다르네', '너한테만 하는 얘긴데 요즘 좀 힘들다'],
    plan: ['언제 한번 꼭 보자. 진짜로', '다음 달에 날 잡아서 밥 먹자', '시간 될 때 연락 줘. 한번 보자'],
  },
  // 선배(한두 살에서 다섯 살 위): 내가 해요체로 말한다. 학생 때와 대학·사회인 때 말이 다르다.
  senStudent: {
    hello: ['선배 안녕하세요! 뭐 하세요?', '{n} 선배, 오늘 복도에서 봤는데 인사 못 했어요 ㅎㅎ', '선배 그 노래 들어 보셨어요? 완전 좋아요', '선배 시험 잘 보셨어요?'],
    worry: ['선배… 저 고민이 있는데 들어 주실 수 있어요?', '선배는 시험 기간에 어떻게 버티셨어요?', '요즘 진로 때문에 머리 아파요. 선배는 어떻게 정하셨어요?'],
    plan: ['선배, 다음에 떡볶이 사 주세요 ㅎㅎ', '시험 끝나면 선배랑 밥 먹고 싶어요', '주말에 시간 되시면 같이 가요!'],
  },
  senUni: {
    hello: ['선배 잘 지내세요? 학교에서 통 못 뵀네요', '{n} 선배, 과제는 좀 끝나셨어요?', '선배 요즘 바쁘세요? 갑자기 생각나서 연락드려요'],
    worry: ['선배, 학점 때문에 고민인데 조언 좀 해 주세요', '휴학할까 고민 중인데 선배 생각은 어떠세요?', '진로를 아직 못 정했어요. 선배는 언제 정하셨어요?'],
    plan: ['선배, 종강하면 밥 한번 사 주세요 ㅎㅎ', '다음 달에 시간 되시면 커피 한잔해요', '선배 이번에 학회 끝나고 같이 가요'],
  },
  senAdult: {
    hello: ['선배 잘 지내시죠? 요즘 많이 바쁘세요?', '{n} 선배, 오랜만에 연락드려요', '선배 회사는 좀 어떠세요?', '문득 생각나서 연락드렸어요. 건강하시죠?'],
    worry: ['선배, 요즘 일 때문에 고민이 많아요. 잠깐 얘기 들어 주실 수 있어요?', '이직 고민 중인데 선배 생각이 궁금해요', '선배한테만 드리는 얘긴데 요즘 좀 지쳐요'],
    plan: ['선배, 다음 달에 밥 한번 사 드릴게요', '시간 괜찮으실 때 한번 뵈어요', '퇴근하고 한잔 어떠세요? 제가 살게요'],
  },
  polite: {
    hello: ['잘 지내셨어요? 오랜만에 인사드려요', '{n}님, 요즘 어떻게 지내세요?', '날이 많이 바뀌었네요. 건강 잘 챙기세요'],
    worry: ['여쭤보고 싶은 게 있어서 연락드렸어요', '요즘 고민이 있는데 조언 좀 들을 수 있을까요?'],
    plan: ['다음 달에 식사 한번 대접할게요', '시간 괜찮으실 때 찾아뵐게요'],
  },
};
// 앱에 맞는 말(나이와 상관없이 그 앱이라서 하는 말).
const APP_EXTRA = {
  buddy: { hello: ['{n} 접속했네? 반가워 ^^'] },
  cy: { hello: ['미니홈피 놀러 왔다 가~ 사진 잘 봤어!', '파도타고 왔어 ㅋㅋ 잘 지내지?'], worry: ['(비밀글) 너한테만 말하는 건데 요즘 좀 힘들어'] },
  insta: { hello: ['사진 분위기 너무 좋다', '여기 어디야? 나도 가 보고 싶다'] },
};
const REPLY = {
  kid: {
    hello: { mid: ['나도 다 했어! ㅎㅎ', '응 좋아!', '진짜? 나도 보여 줘'], warm: ['우와 나도 너 생각하고 있었는데!', '너랑 노는 게 제일 재밌어 ㅎㅎ'] },
    worry: { mid: ['괜찮아? 나도 그런 적 있어', '내일 학교에서 얘기해'], warm: ['내가 편 들어 줄게!', '울지 마. 내가 있잖아'] },
    plan: { mid: ['좋아! 엄마한테 물어볼게', '그래 놀자'], warm: ['꼭이다! 약속!', '완전 좋아! 손가락 걸어'] },
    far: ['우와 {me}다! 진짜 오랜만이다', '나 기억해? 반가워!'], cold: ['응', '어… 그래'],
  },
  teen: {
    hello: { mid: ['ㅋㅋ 그냥 있음', 'ㅇㅇ 들어 봄 좋더라', '나도 심심 ㅠ'], warm: ['ㅋㅋㅋ 안 그래도 너한테 말 걸려고 했는데', '역시 {me} ㅋㅋ 통한다'] },
    worry: { mid: ['헐 왜? 말해 봐', '나도 망함 ㅋㅋ 같이 힘내자'], warm: ['무슨 일인데. 다 말해. 비밀 지킴', '야 너 혼자 끙끙대지 마'] },
    plan: { mid: ['콜', 'ㅇㅋ 시간 봐서'], warm: ['무조건 콜!!', '오 대박 좋아'] },
    far: ['헐 {me}? 완전 오랜만이다 ㅋㅋ', '와 연락 끊긴 줄 알았잖아'], cold: ['ㅇㅇ', '아 그래?'],
  },
  hs: {
    hello: { mid: ['방금 끝남. 죽겠다', '그냥 그랬어. 넌?', '아직 공부 중… 힘들다'], warm: ['ㅋㅋㅋ 너 문자 기다렸다', '너랑 얘기하니까 좀 살 것 같다'] },
    worry: { mid: ['다들 그래. 너무 걱정 마', '나도 정한 거 없어. 같이 고민하자'], warm: ['야 너 잘하고 있어. 진짜로', '힘들면 언제든 말해. 다 들어 줄게'] },
    plan: { mid: ['좋아 시험 끝나면', 'ㅇㅋ 그때 보자'], warm: ['무조건 간다', '그날만 보고 버틴다 ㅋㅋ'] },
    far: ['와 {me}? 진짜 오랜만이다. 잘 지냈어?', '연락 줘서 고맙다. 보고 싶었어'], cold: ['응 그래', '아 그렇구나'],
  },
  uni: {
    hello: { mid: ['ㅋㅋ 나도 과제 중', '아직 시험 하나 남음 ㅠ', '그럭저럭 다니고 있어'], warm: ['오 안 그래도 연락하려 했는데!', '너 연락 오니까 반갑다 ㅎㅎ'] },
    worry: { mid: ['다들 그런 시기인 듯. 천천히 생각해', '휴학도 나쁘지 않아. 이유만 확실하면'], warm: ['야 너라면 뭘 해도 잘할 거야', '밥 사 줄 테니까 만나서 얘기하자'] },
    plan: { mid: ['좋아 날짜 맞춰 보자', 'ㅇㅋ 종강하고 보자'], warm: ['콜! 내가 쏜다', '드디어 ㅋㅋ 기다린다'] },
    far: ['와 진짜 오랜만이다. 연락 줘서 고마워', '{me}? 잘 지냈어? 너무 반갑다'], cold: ['어 그래', '응 ㅎㅎ'],
  },
  twenties: {
    hello: { mid: ['그냥 버티는 중 ㅋㅋ', '응 야근 중… 넌?', '나도 월급날만 본다'], warm: ['ㅋㅋㅋ 너밖에 없다 진짜', '너 연락에 힘이 난다'] },
    worry: { mid: ['신중하게 생각해. 급할 거 없어', '다들 한 번씩 그렇더라'], warm: ['언제든 얘기해. 내가 들을게', '너 진짜 잘 버티고 있어'] },
    plan: { mid: ['좋아 이번엔 진짜 보자', '퇴근 시간 맞춰 보자'], warm: ['무조건! 날 잡자', '오 좋다. 내가 맛집 찾아 놓을게'] },
    far: ['와 이게 얼마 만이야. 잘 지냈어?', '연락 끊긴 줄 알았는데 반갑다'], cold: ['어 그래', '응 잘 지내'],
  },
  thirties: {
    hello: { mid: ['그럭저럭 지내. 너도 잘 지내지?', '응 나도 요즘 몸 좀 챙긴다 ㅎㅎ', '다들 별일 없어. 고마워'], warm: ['너 연락 오면 그날 기분이 좋아', '역시 오래된 친구가 최고다'] },
    worry: { mid: ['다들 비슷하게 사는 것 같아. 너무 무리하지 마', '천천히 하나씩 하자'], warm: ['혼자 짊어지지 마. 나 있잖아', '언제든 전화해. 밤이어도 괜찮아'] },
    plan: { mid: ['좋지. 날 잡자', '이번엔 꼭 보자'], warm: ['무조건 보자. 내가 시간 뺄게', '오랜만에 옛날 얘기나 하자'] },
    far: ['이게 몇 년 만이야. 연락 줘서 정말 고맙다', '{me} 맞지? 너무 반갑다'], cold: ['응 잘 지내', '그래 고마워'],
  },
  // 선배의 답은 편한 반말이다.
  senStudent: {
    hello: { mid: ['어 안녕 ㅎㅎ 그냥 있지', '아 봤구나 ㅋㅋ 다음엔 인사해', '그럭저럭 봤어. 넌?'], warm: ['ㅋㅋ 너 연락 오니까 좋다', '역시 우리 {me}밖에 없다'] },
    worry: { mid: ['무슨 일인데? 말해 봐', '나도 그때 힘들었어. 다 지나가더라'], warm: ['언제든 말해. 선배가 들어 줄게', '너무 혼자 끙끙대지 마. 내가 있잖아'] },
    plan: { mid: ['그래 시간 맞춰 보자', 'ㅋㅋ 알았어 사 줄게'], warm: ['당연하지. 내가 쏜다', '좋아! 맛있는 데 데려갈게'] },
    far: ['어 {me}? 진짜 오랜만이다', '와 연락 줘서 반갑다. 잘 지냈어?'], cold: ['응', '어 그래'],
  },
  senUni: {
    hello: { mid: ['응 그럭저럭 ㅎㅎ 넌 잘 지내?', '과제는 끝이 없다 ㅋㅋ', '바쁘긴 한데 괜찮아'], warm: ['오 {me}! 안 그래도 생각났는데', '너 연락은 늘 반갑다 ㅎㅎ'] },
    worry: { mid: ['다들 한 번씩 겪어. 너무 조급해하지 마', '나도 그 고민 했었어. 만나서 얘기하자'], warm: ['넌 잘할 거야. 내가 장담해', '밥 사 줄 테니까 편하게 와'] },
    plan: { mid: ['그래 종강하고 보자', '좋아 날 잡자'], warm: ['콜! 선배가 쏜다', '오 좋다. 맛집 알아 둘게'] },
    far: ['와 {me}? 진짜 오랜만이다', '연락 줘서 고맙다. 잘 지냈어?'], cold: ['어 그래', '응 ㅎㅎ'],
  },
  senAdult: {
    hello: { mid: ['응 그럭저럭 지내. 너는?', '회사야 늘 똑같지 뭐 ㅎㅎ', '오랜만이네. 잘 지내지?'], warm: ['너 연락 오면 괜히 기분 좋다', '역시 {me}밖에 없다'] },
    worry: { mid: ['천천히 생각해. 급하게 정할 거 없어', '다들 그래. 너무 무리하지 마'], warm: ['언제든 연락해. 선배가 밥 사 줄게', '혼자 짊어지지 마. 나도 다 겪어 봤어'] },
    plan: { mid: ['좋지. 날 잡자', '그래 시간 맞춰 보자'], warm: ['무슨 소리야, 내가 사야지', '좋다. 오랜만에 제대로 보자'] },
    far: ['이게 얼마 만이야. 연락 줘서 고맙다', '{me} 맞지? 너무 반갑다'], cold: ['응 잘 지내', '그래 고마워'],
  },
  polite: {
    hello: { mid: ['그래, 잘 지내지? 연락 고맙다', '오랜만이구나. 반갑다'], warm: ['네 연락 받으니 기분이 좋구나', '잘 크고 있구나. 대견하다'] },
    worry: { mid: ['그래, 뭐든 물어보렴', '천천히 얘기해 보자'], warm: ['언제든 찾아오너라. 도와줄게', '혼자 고민하지 말고 얘기해'] },
    plan: { mid: ['그래 시간 맞춰 보자', '좋지, 연락하렴'], warm: ['그래 꼭 보자. 기다리마', '좋구나. 밥은 내가 사마'] },
    far: ['이게 얼마 만이냐. 반갑다', '{me}구나! 잘 지냈니?'], cold: ['그래', '응, 그래'],
  },
};
// 사귀는 사람과 주고받는 글(사용자 지시 2026-11-16). 고등학생 때는 풋풋한 선을 지킨다.
const MATE = {
  teen: {
    mine: {
      hello: ['{n} 뭐 해? 그냥 생각나서', '집에 잘 들어갔어? 오늘 재밌었어', '야자 끝났어? 오늘 못 봐서 아쉽다', '잘 자. 내일 학교에서 보자'],
      worry: ['나 오늘 좀 힘들었어. 너한테는 말하고 싶었어', '성적 때문에 걱정이야. 네 목소리 들으면 좀 나을 것 같아', '부모님이랑 좀 다퉜어… 그냥 네 생각이 났어'],
      plan: ['주말에 같이 영화 볼래?', '시험 끝나면 둘이 놀러 가자', '토요일에 독서실 끝나고 떡볶이 먹자. 내가 살게'],
    },
    reply: {
      hello: ['나도 방금 네 생각 했는데 ㅎㅎ', '응 잘 들어왔어. 너도 얼른 자', '나도 아쉬웠어. 내일은 꼭 보자', '{me}도 잘 자. 내 꿈 꿔 ㅋㅋ'],
      worry: ['무슨 일인데? 다 말해 줘. 끝까지 들을게', '괜찮아. 너 잘하고 있어. 내가 알아', '내일 만나서 얘기하자. 초콜릿 가져갈게'],
      plan: ['좋아! 벌써 기다려진다', '응 약속이야. 그날 비워 둘게', '완전 좋아 ㅎㅎ 뭐 입고 가지'],
    },
    far: ['{me}… 왜 이제 연락해. 기다렸잖아', '진짜 오랜만이다. 나 잊은 줄 알았어'],
  },
  lover: {
    mine: {
      hello: ['{n}, 밥은 먹었어?', '오늘 하루 어땠어? 보고 싶다', '퇴근했어? 조심히 들어가', '자기 전에 목소리 듣고 싶어서'],
      worry: ['나 오늘 좀 지쳤어. 네 생각이 제일 먼저 나더라', '요즘 고민이 있는데 너랑 얘기하고 싶어', '별일은 아닌데 마음이 좀 가라앉네'],
      plan: ['이번 주말에 데이트하자', '다음 달에 어디 좀 다녀올까? 둘이서', '금요일 저녁 비워 둬. 맛있는 거 먹자'],
    },
    reply: {
      hello: ['나도 보고 싶어. 오늘 유난히', '방금 먹었어. 너는? 거르지 마', '응 이제 집이야. 전화할까?', '나도 네 목소리 듣고 싶었어'],
      worry: ['무슨 일이야? 지금 전화해도 돼?', '고생했어. 오늘은 아무 생각 말고 쉬어. 내가 옆에 있잖아', '주말에 만나서 천천히 얘기하자. 맛있는 거 사 줄게'],
      plan: ['좋아! 어디 갈지 내가 찾아볼게', '응, 벌써 설렌다', '당연히 비워 두지. 기대할게'],
    },
    far: ['연락이 너무 뜸했잖아. 걱정했어', '이제야 연락하네. 그래도 반갑다'],
  },
  spouse: {
    mine: {
      hello: ['{n}, 점심은 챙겨 먹었어?', '오늘 좀 늦을 것 같아. 먼저 먹어', '퇴근길에 뭐 사 갈까?', '오늘도 고생 많아. 저녁에 봐'],
      worry: ['오늘 회사에서 좀 힘들었어. 집에 가서 얘기할게', '요즘 고민이 있는데 저녁에 시간 좀 내 줘', '당신한테만 하는 얘긴데 좀 지치네'],
      plan: ['주말에 둘이 바람 쐬러 갈까?', '다음 달에 하루 날 잡아서 외식하자', '이번 기념일에는 어디 좀 다녀오자'],
    },
    reply: {
      hello: ['응 먹었어. 당신은?', '알았어. 조심히 와', '과일 좀 사 와. 고마워', '당신도 고생해. 저녁에 맛있는 거 해 놓을게'],
      worry: ['무슨 일인데. 일찍 와, 얘기 들어 줄게', '너무 혼자 끌어안지 마. 같이 생각해 보자', '오늘은 푹 쉬어. 집안일은 내가 할게'],
      plan: ['좋지. 오랜만이네', '그래, 내가 예약해 둘게', '좋아. 그날은 일 얘기 하지 말자'],
    },
    far: ['연락이 왜 이렇게 없었어', '바빴구나. 그래도 가끔은 연락해'],
  },
};
const ABROAD = ['여기 지금 새벽이야 ㅋㅋ 그래도 반가워', '시차 때문에 늦게 봤다. 한국 그립다', '여기 있으니까 이런 연락이 제일 반가워'];
const pick = (s, id, salt, list) => list[hash(`${s.seed ?? 1}:${s.year}:${s.month}:${id}:${salt}`) % list.length];
const fill = (t, n, me) => t.replaceAll('{n}', n).replaceAll('{me}', me);
// 높임말(사용자 지시 2026-11-12): 선배나 나이 많은 사람에게는 존댓말을 쓴다.
// 선배 = 출생연도가 나보다 빠른 사람, 또는 인물 이름표(src/screens/people.js ROSTER)에 '선배'로 적힌 사람.
// 다섯 살 넘게 위면 어른(polite)으로 대한다. 외국인 친구는 높임말 없이 또래처럼 말한다.
export const SENIOR_IDS = new Set(['c10', 'c13', 'c18', 'c22', 'c25', 'c35', 'c53', 'c63', 'c64', 'c66', 'c69', 'c87', 'c92']);
const foreign = (id) => /[A-Za-z]/.test(personOf(id)?.이름 ?? '');
export function honorOf(s, id) {
  if (foreign(id)) return null;
  const y = personOf(id)?.출생연도, me = s.birthYear ?? 1989;
  if (y != null && me - y > 5) return 'polite';
  if ((y != null && me - y >= 1) || SENIOR_IDS.has(id)) return 'senior';
  return null;
}
const SEN_BAND = { kid: 'senStudent', teen: 'senStudent', hs: 'senStudent', uni: 'senUni', twenties: 'senAdult', thirties: 'senAdult' };
export function speechOf(s, id) {
  const h = honorOf(s, id);
  return h === 'polite' ? 'polite' : h === 'senior' ? SEN_BAND[bandOf(s)] : bandOf(s);
}
export function lines(s, id, app, act, { name = '', me = '나', abroad = false } = {}) {
  const v = bondOf(s, id), gap = gapOf(s, id);
  const L = MATE[mateOf(s, id)];
  if (L) { // 내 글과 답은 같은 번호끼리 짝이다.
    const i = pick(s, id, 'me', L.mine[act].map((_, k) => k));
    return { mine: fill(L.mine[act][i], name, me), reply: fill(gap != null && gap >= 24 ? pick(s, id, 're', L.far) : L.reply[act][i], name, me) };
  }
  const band = speechOf(s, id), plain = BANDS.includes(band);
  const mine = fill(pick(s, id, 'me', [...MINE[band][act], ...(plain ? APP_EXTRA[app]?.[act] ?? [] : [])]), name, me);
  const R = REPLY[band];
  let pool;
  if (gap != null && gap >= 24) pool = R.far;
  else if (v < 3) pool = R.cold;
  else if (abroad && act !== 'worry' && plain) pool = ABROAD;
  else pool = R[act][v >= 25 ? 'warm' : 'mid'];
  return { mine, reply: fill(pick(s, id, 're', pool), name, me) };
}

export function canSend(s, id, app, act, { abroad = false } = {}) {
  init(s);
  if (s.ended) return { ok: false, why: '이야기가 끝났습니다.' };
  if (s.flags?.군입대 && !s.flags?.전역) return { ok: false, why: '복무 중에는 연락할 수 없습니다.' };
  if (!appsAt(s).includes(app)) return { ok: false, why: '지금은 쓸 수 없는 앱입니다.' };
  if (!contactable(s, id)) return { ok: false, why: '연락처를 모르는 사람입니다.' };
  if (abroad && APPS[app].abroad === false) return { ok: false, why: '해외라 문자를 보낼 수 없습니다.' };
  if (!ACTS.includes(act)) return { ok: false, why: '없는 행동입니다.' };
  if (s.chat.n >= LIMIT) return { ok: false, why: '이번 달 연락을 다 썼습니다.' };
  if (s.chat.sent[id]) return { ok: false, why: '이번 달에는 이미 연락했습니다.' };
  if (act === 'plan' && s.promises?.some((p) => p.id === id)) return { ok: false, why: '이미 약속이 있습니다.' };
  return { ok: true };
}
// 보내기. 대화에 두 줄(나, 상대)이 쌓인다.
export function send(s, id, app, act, opts = {}) {
  const c = canSend(s, id, app, act, opts);
  if (!c.ok) return c;
  const { mine, reply } = lines(s, id, app, act, opts); // 사이가 바뀌기 전에 답을 정한다
  s.chat.n += 1; s.chat.sent[id] = true;
  bumpSmall(s, id, 1.5 * charmTalk(s)); // 연락은 사소한 일: 한 사람에게 한 달 +3까지
  if (act === 'worry') addStress(s, -3);
  if (act === 'plan') promise(s, id);
  const t = (s.chat.threads[id] ??= []);
  t.push({ me: true, text: mine, at: ym(s), app }, { me: false, text: reply, at: ym(s), app });
  if (t.length > KEEP) t.splice(0, t.length - KEEP);
  return { ok: true, text: act === 'plan' ? '다음 달에 만나기로 했다. 달력에 작게 적어 두었다.' : act === 'worry' ? '털어놓고 나니 마음이 조금 가벼워졌다.' : '연락을 주고받았다.', mine, reply };
}
