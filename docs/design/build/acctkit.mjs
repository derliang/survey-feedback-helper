// 選帳號示意圖（第七輪改寫，2026-11-01）：桌機、手機、平板共用。
// 使用者 2026-11-01 取消「只限私人 Gmail」：任何 Google 帳號都能用，示意圖不再分「選／不要選」的帳號類型，
// 只提醒「選放著這份試算表、或有權限開它的那一個」。第四輪「Gmail 一列選、學校帳號不要選」的版本已作廢。
// 自畫簡化示意，不是 Google 截圖；「使用其他帳戶」是 Google 視窗字樣，尚未在本專案核對，圖上一律標「待核對」。
import { ic } from './lib.mjs';

const pick = '<span style="flex:none;white-space:nowrap;font-size:var(--fs-xs);font-weight:700;padding:2px 10px;border-radius:999px;border:1px solid var(--ok);color:var(--ok);background:var(--ok-soft)">✓ 選這個</span>';
const avatar = (c) => `<span aria-hidden="true" style="flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-weight:700;background:var(--sunk);color:var(--ink2)">${c}</span>`;
const row = (c, nm, em, kind, ok) => `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border-top:1px solid var(--line-soft)${ok ? ';background:var(--ok-soft)' : ''}">${avatar(c)}<span style="flex:1;min-width:140px;display:flex;flex-direction:column;line-height:1.4"><span style="font-weight:600">${nm}</span><span class="small" style="color:var(--ink2);overflow-wrap:anywhere">${em}</span><span class="small" style="color:var(--ink2)">${kind}</span></span>${ok ? pick : ''}</div>`;

/** 選帳號示意：兩個不同帳號（個人與學校，皆可用），放著那份試算表的那一列標「選這個」，最後一列「使用其他帳戶」。 */
export const chooser = () => `<div role="group" aria-label="Google 選帳號視窗示意（自畫簡化，不是 Google 截圖）" style="margin:0;display:flex;flex-direction:column;gap:6px">`
  + `<div style="border:1px solid var(--ctl);border-radius:var(--r-md);overflow:hidden;background:var(--card)">`
  + `<div class="small" style="padding:8px 12px;color:var(--ink2);background:var(--sunk);font-weight:600">Google 選帳號視窗（示意）</div>`
  + row('王', '王老師', 'teacher.wang@gmail.com', '個人帳號 · 沒有放這份試算表', false)
  + row('王', '王老師', 'wang@school.edu.tw', '學校帳號 · 「讀書報告回饋 (回覆)」放在這裡', true)
  + `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-top:1px solid var(--line-soft)"><span aria-hidden="true" style="flex:none;width:32px;height:32px;display:grid;place-items:center;color:var(--accent-ink)">${ic('plus')}</span><span style="flex:1;min-width:0;line-height:1.4"><span style="font-weight:600">使用其他帳戶</span><br><span class="small" style="color:var(--ink2)">想用的帳號沒出現在清單時，按這裡再登入</span></span><span class="small" style="flex:none;color:var(--warn);font-weight:700">字樣待核對</span></div>`
  + `</div><div class="small" style="color:var(--ink2)">自畫示意，不是 Google 截圖；帳號都是虛構的。個人帳號、學校帳號都能用，選放著這份試算表的那一個。</div></div>`;
