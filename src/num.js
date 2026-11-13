// 사용자 지시 2026-11-08: 큰 수는 경·조·억·만 단위를 붙여 1원 단위까지 보인다. 예) 1조9483억9307만9384
const UNITS = ['', '만', '억', '조', '경'];
export function krNum(n) {
  let a = BigInt(Math.abs(Math.round(Number(n) || 0)));
  const sign = n < 0 && a > 0n ? '-' : '';
  if (a === 0n) return '0';
  const parts = [];
  for (let i = 0; a > 0n; i++) {
    const r = a % 10000n; a /= 10000n;
    if (i >= UNITS.length - 1 && a > 0n) { parts.unshift(`${(a * 10000n + r).toString()}${UNITS[UNITS.length - 1]}`); a = 0n; break; }
    if (r > 0n) parts.unshift(`${r}${UNITS[i]}`);
  }
  return sign + parts.join('');
}
