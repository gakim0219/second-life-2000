// 부모님의 찻집(사용자 지시 2026-11-09). 여유가 생기면 편의점을 정리하고 몸이 편한 찻집을 하시게 한다.
// 열리는 때: 부모님 집 이사 석 달 뒤, 또는 성인이 된 뒤 순자산이 넉넉할 때. 찻집 이름과 장소는 지어낸 것이다.
// 본문 규칙: 금액·능력치 숫자·구간 숫자를 쓰지 않는다.
import * as inv from '../src/invest.js';

const E = (id, title, when, text, rest = {}) => ({ id, title, when, text, ...rest });
const pick = (label, result, effect, when) => ({ label, result, ...(effect ? { effect } : {}), ...(when ? { when } : {}) });
const m12 = (s) => s.year * 12 + (s.month - 1);
const yyyymm = (s) => s.year * 100 + s.month;
const toM12 = (v) => Math.floor(v / 100) * 12 + (v % 100) - 1;
export const TEA_COST = 100000000;
export const TEA_NAME = '찻집 느티나무';
const net = (s) => { try { return inv.isLoaded() ? inv.netWorth(s) : s.cash; } catch { return s.cash; } };
const since = (s) => (s.teahouse ? m12(s) - toM12(s.teahouse.since) : -1);
// 제안이 나올 때: 이사 석 달 뒤, 또는 스무 살 이후 순자산이 넉넉할 때. 미루면 한 해 뒤에 다시 묻는다.
export function teaOfferReady(s) {
  if (s.flags.부모_찻집 || s.year > 2024 || s.ended) return false;
  if (s.flags.찻집_보류 && m12(s) < toM12(s.flags.찻집_보류) + 12) return false;
  if (s.flags.찻집_다시) return true;
  const moved = s.parentsHome && m12(s) >= toM12(s.parentsHome.ym) + 3;
  const rich = yyyymm(s) >= 200803 && net(s) >= 1e9;
  return !!(moved || rich);
}
const open = (s) => { s.flags.부모_찻집 = true; delete s.flags.찻집_다시; s.teahouse = { since: yyyymm(s), name: TEA_NAME }; };
const at = (n) => ({ test: (s) => !!s.flags.부모_찻집 && since(s) >= n });

export default [
  E('tea_offer', '셔터를 내리던 밤', { test: teaOfferReady },
    '밤 열한 시, 편의점 셔터를 내리던 아버지가 허리를 짚고 한참 서 있었다. 집에 오는 길에 어머니가 지나가듯 말했다. "나 시집오기 전에는 작은 찻집 하는 게 꿈이었다. 볕 잘 드는 창가에 화분 두고." 아버지가 웃었다. "이 나이에 무슨." 그래도 어머니는 그 말을 하고 오래 창밖을 보았다.',
    { once: false, place: 'home', bg: ['tea-night'], choices: [
      pick('편의점을 정리하고 찻집을 차려 드린다', '다음 날 부동산을 돌았다. 학교 앞 골목, 볕이 잘 드는 일 층 자리를 찾았다. 어머니가 가게 안을 한 바퀴 돌고 창가에 오래 서 있었다. 아버지는 편의점 열쇠를 꺼내 들고 한참 만지작거렸다.',
        { cash: -TEA_COST, run: open, bond: { 부모님: 8 }, stats: { 인맥: 1 } }, { cash: TEA_COST }),
      pick('조금 더 생각해 보시라고 한다', '"천천히 생각해 보세요." 어머니는 고개를 끄덕였다. 아버지는 다음 날도 새벽에 물건을 받으러 나갔다.', { run: (s) => { s.flags.찻집_보류 = yyyymm(s); delete s.flags.찻집_다시; } }),
    ] }),
  E('tea_open', '찻집 느티나무 개업', at(1),
    '찻집 느티나무가 문을 열었다. 아버지는 앞치마를 두르고 어색하게 문 앞에 섰다. 편의점 단골들이 화분을 들고 찾아왔다. 어머니가 첫 잔을 따르며 손을 조금 떨었다. 문은 오전 열한 시에 열고 오후 다섯 시에 닫는다. 일요일과 월요일은 쉰다.',
    { place: 'home', bg: ['tea-open'], choices: [
      pick('친구들을 데리고 첫 손님이 된다', '친구들이 창가 자리를 다 차지했다. 어머니가 서비스로 떡을 내왔다. 아버지가 계산대에서 처음으로 크게 웃었다.', { stats: { 인맥: 1 }, bond: { 부모님: 4 } }),
      pick('조용히 구석 자리에서 차를 마신다', '구석 자리에서 차를 마시며 가게를 지켜봤다. 오후 다섯 시, 아버지가 불을 끄며 말했다. "벌써 끝이냐." 처음 해 보는 저녁 퇴근이었다.', { stress: -6, bond: { 부모님: 4 } }),
    ] }),
  E('tea_regular', '첫 단골', at(4),
    '찻집에 매일 오후 두 시면 오는 할머니가 생겼다. 어머니는 그 자리를 비워 두고 할머니가 좋아하는 대추차를 미리 끓여 놓는다. 아버지는 요즘 화분에 물 주는 시간을 정해 두었다. 편의점 할 때보다 얼굴빛이 좋아졌다는 말을 동네에서 자주 듣는다.',
    { place: 'home', bg: ['tea-inside'], choices: [
      pick('메뉴판을 새로 써 드린다', '손글씨로 메뉴판을 다시 썼다. 어머니가 액자에 끼워 계산대 옆에 걸었다.', { stats: { 지능: 1 }, bond: { 부모님: 3 } }),
      pick('찻집 사진을 찍어 올린다', '창가 사진을 찍어 올렸다. 주말에 처음 보는 손님들이 사진을 보고 왔다며 찾아왔다.', { stats: { 매력: 1 }, fame: 1, bond: { 부모님: 3 } }),
    ] }),
  E('tea_year1', '찻집 한 돌', at(12),
    '찻집이 문을 연 지 한 해가 됐다. 아버지는 그사이 차 공부를 시작해 찻잎 이름을 줄줄 외운다. 어머니가 저녁을 차리며 말했다. "편의점 할 때는 저녁을 서서 먹었는데." 식탁에 처음으로 네 시간 넘게 앉아 있었다.',
    { place: 'home', bg: ['tea-inside'], choices: [
      pick('한 돌 축하 케이크를 들고 간다', '케이크에 초를 하나 꽂았다. 단골 할머니가 박수를 쳤다. 아버지가 사진을 찍어 달라고 먼저 말했다.', { stress: -5, bond: { 부모님: 5 } }),
      pick('부모님과 차 한 잔을 마신다', '문을 닫은 찻집에서 셋이 차를 마셨다. 아버지가 편의점 하던 시절 새벽 이야기를 꺼냈다. 나는 듣기만 했다.', { stress: -6, bond: { 부모님: 5 } }),
    ] }),
  E('tea_covid', '문을 닫은 찻집', { year: 2020, month: 3, flag: '부모_찻집' },
    '거리에 사람이 끊겼다. 찻집 창가 자리가 며칠째 비어 있다. 어머니가 전화로 괜찮다고 했지만 목소리가 작았다. 기억대로라면 이 시기는 꽤 오래간다.',
    { place: 'home', bg: ['tea-inside'], choices: [
      pick('몇 달 치 월세를 대신 내 드린다', '건물 주인에게 몇 달 치를 미리 보냈다. 어머니가 한참 말이 없다가 고맙다고 했다. 찻집은 문을 연 채 버텼다.', { cash: -10000000, bond: { 부모님: 6 } }, { cash: 10000000 }),
      pick('포장 차와 선물 상자를 권해 드린다', '찻잎을 작은 상자에 담아 팔자고 했다. 아버지가 상자에 직접 붓글씨를 썼다. 동네 사람들이 선물용으로 사 갔다.', { stats: { 지능: 1 }, bond: { 부모님: 5 } }),
      pick('잠시 쉬시라고 한다', '부모님은 찻집 문을 잠시 닫고 집에서 쉬었다. 아버지는 그동안 화분만 챙기러 나갔다.', { stress: -2, bond: { 부모님: 2 } }),
    ] }),
  E('tea_tenth', '찻집 열 돌', at(120),
    '찻집 느티나무가 열 돌을 맞았다. 벽에는 단골들과 찍은 사진이 빼곡하다. 어머니의 머리는 하얘졌지만 오후 다섯 시면 어김없이 불을 끄고 산책을 나간다. 아버지가 사진 한 장을 가리켰다. 개업 날, 앞치마가 어색하던 자신이다.',
    { place: 'home', bg: ['tea-inside'], choices: [
      pick('열 돌 잔치를 열어 드린다', '단골들이 다 모였다. 아버지가 찻잔을 들고 짧게 인사했다. "덕분에 늘그막에 호강합니다." 박수가 오래 이어졌다.', { stats: { 인맥: 1 }, bond: { 부모님: 6 } }),
      pick('셋이 사진 한 장을 더 남긴다', '창가에 셋이 나란히 섰다. 새 사진이 개업 날 사진 옆에 걸렸다.', { stress: -6, bond: { 부모님: 6 } }),
    ] }),
];
