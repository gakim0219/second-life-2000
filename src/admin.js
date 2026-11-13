// 관리자 모드(사용자 지시 2026-11-12). 켜면 인물 시트에 사이·호감 수치가 숫자로 보인다. 값은 이 기기에만 남는다.
const KEY = 'sl2000.admin';
const store = (fn) => { try { return fn(globalThis.localStorage); } catch { return null; } };
let on = store((ls) => ls.getItem(KEY) === '1') ?? false;
export const isAdmin = () => on;
export function setAdmin(v) { on = !!v; store((ls) => ls.setItem(KEY, on ? '1' : '0')); }
