import { describe, expect, it, vi } from 'vitest';
import { checkAccount, maskedAccount } from './account';
import { createDriveApi, createSheetsApi, quoteSheetTitle } from './api';
import { createGoogleAuth, SignInCancelled } from './browser';
import { readGoogleConfig } from './config';
import type { FetchLike } from './http';
import { classifyGoogleError, failureMessage } from './quota';
import { connectGoogle, pickAndRead, readSpreadsheet } from './session';
import { GoogleApiError, type GoogleServices } from './types';

interface Over {
  email?: string | null;
  rows?: string[][];
  emailErr?: unknown;
  signIn?: () => Promise<string>;
}

function fakeServices(over: Over = {}) {
  const revoke = vi.fn<(t: string) => Promise<void>>(async () => {});
  const values = vi.fn(async () => over.rows ?? [['姓名', '回饋'], ['小明', '好']]);
  const svc: GoogleServices = {
    auth: { signIn: over.signIn ?? (async () => 'tok'), revoke },
    drive: {
      userEmail: async () => {
        if (over.emailErr) throw over.emailErr;
        return over.email === undefined ? 'a@gmail.com' : over.email;
      },
    },
    sheets: { info: async () => ({ title: '問卷', sheets: ['A', 'B'] }), values },
    picker: { pickSpreadsheet: async () => ({ id: 'sid', name: '我的問卷' }) },
  };
  return { svc, revoke, values };
}

describe('帳號判斷', () => {
  it('gmail 與 googlemail 放行，其他一律擋下', () => {
    expect(checkAccount('a@gmail.com').allowed).toBe(true);
    expect(checkAccount('A@GoogleMail.com').allowed).toBe(true);
    expect(checkAccount('t@school.edu.tw')).toEqual({ allowed: false, domain: 'school.edu.tw', reason: 'not-gmail' });
    expect(checkAccount('x@yahoo.com.tw').allowed).toBe(false);
    expect(checkAccount('x@gmail.com.evil.tw').allowed).toBe(false);
  });
  it('取不到信箱也擋下，畫面只露網域', () => {
    expect(checkAccount(null)).toEqual({ allowed: false, domain: null, reason: 'no-email' });
    expect(checkAccount('bad@')).toMatchObject({ allowed: false });
    expect(maskedAccount('school.edu.tw')).toBe('○○○@school.edu.tw');
  });
});

describe('connectGoogle', () => {
  it('Gmail 通過並回傳權杖', async () => {
    const { svc } = fakeServices();
    expect(await connectGoogle(svc)).toEqual({ status: 'ok', token: 'tok', email: 'a@gmail.com' });
  });
  it('學校帳號：撤銷權杖並擋下，不讀任何檔案', async () => {
    const { svc, revoke, values } = fakeServices({ email: 't@school.edu.tw' });
    expect(await connectGoogle(svc)).toEqual({ status: 'blocked', domain: 'school.edu.tw', reason: 'not-gmail' });
    expect(revoke).toHaveBeenCalledWith('tok');
    expect(values).not.toHaveBeenCalled();
  });
  it('取不到信箱或 about.get 失敗都不放行', async () => {
    const a = fakeServices({ email: null });
    expect((await connectGoogle(a.svc)).status).toBe('blocked');
    const b = fakeServices({ emailErr: new GoogleApiError(403, 'insufficientPermissions') });
    expect((await connectGoogle(b.svc)).status).toBe('failed');
    expect(b.revoke).toHaveBeenCalled();
  });
  it('使用者取消登入', async () => {
    const { svc } = fakeServices({ signIn: async () => Promise.reject(new SignInCancelled()) });
    expect(await connectGoogle(svc)).toEqual({ status: 'cancelled' });
  });
});

describe('直讀', () => {
  it('Picker 選檔後讀第一個有資料的工作表', async () => {
    const { svc } = fakeServices();
    const r = await pickAndRead(svc, 'tok');
    expect(r).toMatchObject({ status: 'ok', spreadsheetId: 'sid', name: '我的問卷', sheetTitle: 'A' });
    if (r.status === 'ok') expect(r.table.headers).toEqual(['姓名', '回饋']);
  });
  it('全是空白工作表', async () => {
    const { svc } = fakeServices({ rows: [] });
    expect(await readSpreadsheet(svc, 'tok', 'sid')).toEqual({ status: 'empty', name: '問卷' });
  });
  it('配額用完給友善提示並建議 Excel 檔', async () => {
    const { svc } = fakeServices();
    svc.sheets.values = async () => Promise.reject(new GoogleApiError(429, 'RESOURCE_EXHAUSTED'));
    const r = await readSpreadsheet(svc, 'tok', 'sid');
    expect(r).toMatchObject({ status: 'failed', failure: 'quota' });
    if (r.status === 'failed') expect(r.message).toContain('Excel');
  });
});

describe('錯誤分類', () => {
  it('429、403 rateLimit 是配額；一般 403 是沒權限', () => {
    expect(classifyGoogleError(new GoogleApiError(429))).toBe('quota');
    expect(classifyGoogleError(new GoogleApiError(403, 'userRateLimitExceeded'))).toBe('quota');
    expect(classifyGoogleError(new GoogleApiError(403, 'forbidden'))).toBe('no-access');
    expect(classifyGoogleError(new GoogleApiError(401))).toBe('auth');
    expect(classifyGoogleError(new GoogleApiError(404))).toBe('not-found');
    expect(classifyGoogleError(new TypeError('x'))).toBe('network');
    expect(failureMessage('network')).toContain('網路');
  });
});

describe('設定', () => {
  it('缺任何一項就停用', () => {
    expect(readGoogleConfig({ VITE_GOOGLE_CLIENT_ID: 'a', VITE_GOOGLE_API_KEY: 'b' })).toEqual({
      ok: false,
      missing: ['VITE_GOOGLE_APP_ID'],
    });
    expect(
      readGoogleConfig({ VITE_GOOGLE_CLIENT_ID: 'a', VITE_GOOGLE_API_KEY: 'b', VITE_GOOGLE_APP_ID: ' c ' }),
    ).toEqual({ ok: true, config: { clientId: 'a', apiKey: 'b', appId: 'c' } });
  });
});

describe('REST 封裝', () => {
  const ok = (body: unknown) => vi.fn<FetchLike>(async () => ({ ok: true, status: 200, json: async () => body }));
  it('about.get 取信箱，帶 Bearer', async () => {
    const f = ok({ user: { emailAddress: 'a@gmail.com' } });
    expect(await createDriveApi(f).userEmail('T')).toBe('a@gmail.com');
    expect(f).toHaveBeenCalledWith(expect.stringContaining('fields=user(emailAddress)'), {
      headers: { Authorization: 'Bearer T' },
    });
  });
  it('values 讀取：工作表名稱加引號、儲存格轉字串', async () => {
    const f = ok({ values: [['a', 1], ['b', null]] });
    const rows = await createSheetsApi(f).values('T', 'id', "表單回應 1's");
    expect(rows).toEqual([['a', '1'], ['b', '']]);
    expect(quoteSheetTitle("it's")).toBe("'it''s'");
    expect(f.mock.calls[0]?.[0]).toContain(encodeURIComponent("'表單回應 1''s'"));
  });
  it('失敗時丟 GoogleApiError 帶狀態與 reason', async () => {
    const f: FetchLike = async () => ({
      ok: false,
      status: 403,
      json: async () => ({ error: { errors: [{ reason: 'rateLimitExceeded' }] } }),
    });
    await expect(createSheetsApi(f).info('T', 'id')).rejects.toMatchObject({
      status: 403,
      reason: 'rateLimitExceeded',
    });
  });
});

describe('GIS 登入（假全域物件）', () => {
  it('只要求 drive.file；使用者關視窗時取消', async () => {
    let cfg: { scope: string; error_callback?: () => void } | undefined;
    const gis = {
      accounts: {
        oauth2: {
          initTokenClient: (c: { scope: string; error_callback?: () => void }) => {
            cfg = c;
            return { requestAccessToken: () => cfg?.error_callback?.() };
          },
          revoke: (_t: string, done: () => void) => done(),
        },
      },
    };
    const auth = createGoogleAuth({ clientId: 'x' }, async () => {}, () => gis as never);
    await expect(auth.signIn()).rejects.toBeInstanceOf(SignInCancelled);
    expect(cfg?.scope).toBe('https://www.googleapis.com/auth/drive.file');
    await expect(auth.revoke('t')).resolves.toBeUndefined();
  });
});
