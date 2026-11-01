// 選帳號示意圖（第四輪，2026-11-01）：桌機、手機、平板共用。
// 參考 teacher-notes 的「選帳號前先看一下」（唯讀參考，未沿用其暖色 tokens），改用本專案 tokens。
// 自畫簡化示意，不是 Google 截圖；「使用其他帳戶」是 Google 視窗字樣，尚未在本專案核對，圖上一律標「待核對」。
import { ic } from './lib.mjs';

const verdict = (ok, text) => `<span style="flex:none;white-space:nowrap;font-size:var(--fs-xs);font-weight:700;padding:2px 10px;border-radius:999px;border:1px solid var(--${ok ? 'ok' : 'bad'});color:var(--${ok ? 'ok' : 'bad'});background:var(--${ok ? 'ok' : 'bad'}-soft)">${text}</span>`;
const you = '<span style="flex:none;white-space:nowrap;font-size:var(--fs-xs);font-weight:700;padding:2px 10px;border-radius:999px;background:var(--ink);color:var(--card)">你剛才選的</span>';
const avatar = (c) => `<span aria-hidden="true" style="flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-weight:700;background:var(--sunk);color:var(--ink2)">${c}</span>`;
const row = (c, nm, em, ok, kind, mark) => `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border-top:1px solid var(--line-soft)${mark ? ';background:var(--bad-soft)' : ''}">${avatar(c)}<span style="flex:1;min-width:140px;display:flex;flex-direction:column;line-height:1.4"><span style="font-weight:600">${nm}</span><span class="small" style="color:var(--ink2);overflow-wrap:anywhere${ok ? '' : ';text-decoration:line-through;text-decoration-color:var(--bad)'}">${em}</span><span class="small" style="color:var(--ink2)">${kind}${mark ? " " + you : ''}</span></span>${verdict(ok, ok ? '✓ 選這個' : '✕ 不要選')}</div>`;

/** 選帳號示意：Gmail 一列「選這個」、學校帳號與其他信箱註冊的帳號各一列「不要選」，最後一列「使用其他帳戶」。
 *  mark：擋下畫面用，標出使用者剛才選到的是 'school'（學校帳號）還是 'other'（其他信箱註冊的個人帳號）。 */
export const chooser = (mark = '') => `<div role="group" aria-label="Google 選帳號視窗示意（自畫簡化，不是 Google 截圖）" style="margin:0;display:flex;flex-direction:column;gap:6px">`
  + `<div style="border:1px solid var(--ctl);border-radius:var(--r-md);overflow:hidden;background:var(--card)">`
  + `<div class="small" style="padding:8px 12px;color:var(--ink2);background:var(--sunk);font-weight:600">Google 選帳號視窗（示意）</div>`
  + row('王', '王老師', 'teacher.wang@gmail.com', true, '私人 Gmail（@gmail.com 結尾）', false)
  + row('王', '王老師', 'wang@school.edu.tw', false, '學校帳號', mark === 'school')
  + row('王', '王老師', 'wang@mail.example.tw', false, '用其他信箱註冊的 Google 帳號', mark === 'other')
  + `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-top:1px solid var(--line-soft)"><span aria-hidden="true" style="flex:none;width:32px;height:32px;display:grid;place-items:center;color:var(--accent-ink)">${ic('plus')}</span><span style="flex:1;min-width:0;line-height:1.4"><span style="font-weight:600">使用其他帳戶</span><br><span class="small" style="color:var(--ink2)">沒看到 Gmail 帳號時，按這裡再登入</span></span><span class="small" style="flex:none;color:var(--warn);font-weight:700">字樣待核對</span></div>`
  + `</div><div class="small" style="color:var(--ink2)">自畫示意，不是 Google 截圖；帳號都是虛構的。只有 <b>@gmail.com</b> 結尾的帳號能用，其餘一律擋下。</div></div>`;
