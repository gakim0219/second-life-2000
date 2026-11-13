// 미성년 때 큰돈을 번 것을 부모님이 알게 되는 이야기와, 번 돈으로 부모님 집을 사는 흐름.
// 집은 부모님 명의다. 내 자산에 잡히지 않고 월세도 없다. 증여세와 취득세를 내가 함께 낸다.
import * as inv from './invest.js';
export const FOUND_LINE = 3e9, TRUST_RANK = 5;
const won = Math.round, ym = (s) => s.year * 100 + s.month;
const minor = (s) => ym(s) < inv.ADULT_YM;

// 최근 시험 네 번의 평균 등수. 시험 기록이 없으면 null.
export function avgRank(s) {
  const all = [...(s.terms ?? []).flatMap((t) => t.exams ?? []), ...(s.termExams ?? [])].filter((e) => e.rank).slice(-4);
  return all.length ? all.reduce((a, e) => a + e.rank, 0) / all.length : null;
}
const goodGrades = (s) => { const r = avgRank(s); return r != null && r <= TRUST_RANK; };

export function onMonth(s) {
  if (!inv.isLoaded()) return s;
  const f = s.flags;
  if (!f.부모_알게됨) {
    if (!minor(s) || inv.netWorth(s) < FOUND_LINE) return s;
    f.부모_알게됨 = true;
    s.queue.unshift(goodGrades(s) ? 'pa_found_good' : 'pa_found_worry');
  } else if (f.부모_성적요구 && !f.부모_믿음 && !f.부모_성적대화 && goodGrades(s)) {
    f.부모_성적대화 = true; s.queue.unshift('pa_trust');
  }
  return s;
}

// 증여세: 자녀가 부모에게 준다. 10년 공제 뒤 누진세율(2000년 이후 같은 구간).
const GIFT = [[1e8, 0.1, 0], [5e8, 0.2, 1e7], [1e9, 0.3, 6e7], [3e9, 0.4, 1.6e8], [Infinity, 0.5, 4.6e8]];
export const giftDeduct = (at) => (at < 201401 ? 3e7 : 5e7);
export function giftTax(amount, at) {
  const base = amount - giftDeduct(at); if (base <= 0) return 0;
  const [, rate, minus] = GIFT.find(([cut]) => base <= cut);
  return won(base * rate - minus);
}
// 서울 아파트. 그 달 시세가 있는 곳만, 싼 순서로.
export function seoulHomes(s) {
  const at = ym(s);
  return inv.idsOf('부동산').map((id) => {
    const a = inv.assetOf(id), price = inv.priceOf(s, id);
    if (!a.region?.startsWith('서울') || !price) return null;
    const acq = won(price * inv.acquisitionRate(price, at, 0, false)), gift = giftTax(price + acq, at), total = price + acq + gift;
    return { id, name: inv.nameOfAt(id, s), region: a.region, size: a.sector ?? a.sub ?? '', price, acq, gift, total, can: s.cash >= total };
  }).filter(Boolean).sort((x, y) => x.price - y.price);
}
export const canChoose = (s) => !!s.flags.부모_믿음 && !s.parentsHome;
// 이사를 상의하기로 했으면 장면이 끝나고 바로 집 고르기로 넘어간다. 한 번만.
export const moveDue = (s) => canChoose(s) && !!s.flags.부모_이사상의 && !s.flags.부모_이사안내;
// 성적 때문에 이야기가 멈춰 있으면 홈에 무엇을 해야 하는지 보여 준다.
export function promiseNote(s) {
  const f = s.flags; if (!f.부모_성적요구 || f.부모_믿음 || f.부모_성적대화) return null;
  const r = avgRank(s);
  return `아버지와의 약속: 최근 시험 평균 ${TRUST_RANK}등 안에 들면 다시 이야기합니다.${r != null ? ` 지금 평균 ${Math.round(r * 10) / 10}등.` : ''}`;
}
export function buyForParents(s, id) {
  if (!canChoose(s)) return { ok: false, why: '지금은 고를 수 없습니다.' };
  const h = seoulHomes(s).find((x) => x.id === id); if (!h) return { ok: false, why: '그 집은 지금 살 수 없습니다.' };
  if (!h.can) return { ok: false, why: '현금이 모자랍니다.' };
  inv.addMoney(s, `${h.name} 매매 대금`, -h.price);
  inv.payTax(s, h.acq, '부모님 집 취득세'); inv.payTax(s, h.gift, '부모님 집 증여세');
  s.parentsHome = { id, name: h.name, region: h.region, price: h.price, acq: h.acq, gift: h.gift, ym: ym(s) };
  s.log.push(`부모님과 ${h.name}로 이사했습니다. 집은 부모님 명의입니다.`);
  return { ok: true, ...h };
}
