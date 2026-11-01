import { describe, expect, it, vi } from "vitest";
import {
  createDriveApi,
  createSheetsApi,
  quoteDriveName,
  quoteSheetTitle,
} from "./api";
import {
  createGoogleAuth,
  SignInCancelled,
  SignInPopupBlocked,
} from "./browser";
import { readGoogleConfig } from "./config";
import type { FetchLike } from "./http";
import { classifyGoogleError, failureMessage } from "./quota";
import {
  connectGoogle,
  pickAndRead,
  POPUP_BLOCKED_MESSAGE,
  readSpreadsheet,
} from "./session";
import { GoogleApiError, type GoogleServices } from "./types";

interface Over {
  rows?: string[][];
  signIn?: () => Promise<string>;
}

function fakeServices(over: Over = {}) {
  const revoke = vi.fn<(t: string) => Promise<void>>(async () => {});
  const values = vi.fn(
    async () =>
      over.rows ?? [
        ["姓名", "回饋"],
        ["小明", "好"],
      ],
  );
  const svc: GoogleServices = {
    auth: {
      preload: async () => {},
      isReady: () => true,
      signIn: over.signIn ?? (async () => "tok"),
      revoke,
    },
    sheets: {
      info: async () => ({ title: "問卷", sheets: ["A", "B"] }),
      values,
    },
    drive: { saveText: async () => "fid" },
    picker: { pickSpreadsheet: async () => ({ id: "sid", name: "我的問卷" }) },
  };
  return { svc, revoke, values };
}

describe("connectGoogle", () => {
  it("任何 Google 帳號都放行並回傳權杖，不撤銷、不取信箱", async () => {
    const { svc, revoke } = fakeServices();
    expect(await connectGoogle(svc)).toEqual({ status: "ok", token: "tok" });
    expect(revoke).not.toHaveBeenCalled();
  });
  it("使用者關掉登入視窗：cancelled，說明可能是管理員限制", async () => {
    const { svc } = fakeServices({
      signIn: async () => Promise.reject(new SignInCancelled()),
    });
    const r = await connectGoogle(svc);
    expect(r.status).toBe("cancelled");
    if (r.status === "cancelled") expect(r.message).toContain("Excel");
  });
  it("彈窗沒開起來：popup-blocked，中文說明含再按一次、換瀏覽器、允許彈出視窗與 Excel 出口", async () => {
    const { svc } = fakeServices({
      signIn: async () => Promise.reject(new SignInPopupBlocked()),
    });
    const r = await connectGoogle(svc);
    expect(r).toEqual({
      status: "popup-blocked",
      message: POPUP_BLOCKED_MESSAGE,
    });
    for (const w of ["再按一次", "Safari", "彈出式視窗", "Excel"])
      expect(POPUP_BLOCKED_MESSAGE).toContain(w);
  });
});

describe("直讀", () => {
  it("Picker 選檔後讀第一個有資料的工作表", async () => {
    const { svc } = fakeServices();
    const r = await pickAndRead(svc, "tok");
    expect(r).toMatchObject({
      status: "ok",
      spreadsheetId: "sid",
      name: "我的問卷",
      sheetTitle: "A",
    });
    if (r.status === "ok") expect(r.table.headers).toEqual(["姓名", "回饋"]);
  });
  it("全是空白工作表", async () => {
    const { svc } = fakeServices({ rows: [] });
    expect(await readSpreadsheet(svc, "tok", "sid")).toEqual({
      status: "empty",
      name: "問卷",
    });
  });
  it("配額用完給友善提示並建議 Excel 檔", async () => {
    const { svc } = fakeServices();
    svc.sheets.values = async () =>
      Promise.reject(new GoogleApiError(429, "RESOURCE_EXHAUSTED"));
    const r = await readSpreadsheet(svc, "tok", "sid");
    expect(r).toMatchObject({ status: "failed", failure: "quota" });
    if (r.status === "failed") expect(r.message).toContain("Excel");
  });
});

describe("錯誤分類", () => {
  it("429、403 rateLimit 是配額；一般 403 是沒權限", () => {
    expect(classifyGoogleError(new GoogleApiError(429))).toBe("quota");
    expect(
      classifyGoogleError(new GoogleApiError(403, "userRateLimitExceeded")),
    ).toBe("quota");
    expect(classifyGoogleError(new GoogleApiError(403, "forbidden"))).toBe(
      "no-access",
    );
    expect(classifyGoogleError(new GoogleApiError(401))).toBe("auth");
    expect(classifyGoogleError(new GoogleApiError(404))).toBe("not-found");
    expect(classifyGoogleError(new TypeError("x"))).toBe("network");
    expect(failureMessage("network")).toContain("網路");
  });
});

describe("設定", () => {
  it("缺任何一項就停用", () => {
    expect(
      readGoogleConfig({
        VITE_GOOGLE_CLIENT_ID: "a",
        VITE_GOOGLE_API_KEY: "b",
      }),
    ).toEqual({
      ok: false,
      missing: ["VITE_GOOGLE_APP_ID"],
    });
    expect(
      readGoogleConfig({
        VITE_GOOGLE_CLIENT_ID: "a",
        VITE_GOOGLE_API_KEY: "b",
        VITE_GOOGLE_APP_ID: " c ",
      }),
    ).toEqual({ ok: true, config: { clientId: "a", apiKey: "b", appId: "c" } });
  });
});

describe("REST 封裝", () => {
  const ok = (body: unknown) =>
    vi.fn<FetchLike>(async () => ({
      ok: true,
      status: 200,
      json: async () => body,
    }));
  it("values 讀取：工作表名稱加引號、儲存格轉字串", async () => {
    const f = ok({
      values: [
        ["a", 1],
        ["b", null],
      ],
    });
    const rows = await createSheetsApi(f).values("T", "id", "表單回應 1's");
    expect(rows).toEqual([
      ["a", "1"],
      ["b", ""],
    ]);
    expect(quoteSheetTitle("it's")).toBe("'it''s'");
    expect(f.mock.calls[0]?.[0]).toContain(
      encodeURIComponent("'表單回應 1''s'"),
    );
  });
  it("失敗時丟 GoogleApiError 帶狀態與 reason", async () => {
    const f: FetchLike = async () => ({
      ok: false,
      status: 403,
      json: async () => ({
        error: { errors: [{ reason: "rateLimitExceeded" }] },
      }),
    });
    await expect(createSheetsApi(f).info("T", "id")).rejects.toMatchObject({
      status: 403,
      reason: "rateLimitExceeded",
    });
  });
});

describe("雲端硬碟存檔", () => {
  const okJson = (body: unknown) => ({
    ok: true,
    status: 200,
    json: async () => body,
  });

  it("找不到同名檔案就新建（multipart），帶權杖與內容", async () => {
    const calls: { url: string; init?: Parameters<FetchLike>[1] }[] = [];
    const f: FetchLike = async (url, init) => {
      calls.push({ url, init });
      return okJson(init?.method === "POST" ? { id: "new1" } : { files: [] });
    };
    const id = await createDriveApi(f).saveText("tok", "設定.sfh", '{"a":1}');
    expect(id).toBe("new1");
    expect(calls[0]?.url).toContain("trashed%20%3D%20false");
    const post = calls[1];
    if (!post) throw new Error("沒有送出建立請求");
    expect(post.init?.method).toBe("POST");
    expect(post.url).toContain("uploadType=multipart");
    expect(post.init?.headers?.Authorization).toBe("Bearer tok");
    expect(post.init?.body).toContain('"name":"設定.sfh"');
    expect(post.init?.body).toContain('{"a":1}');
  });

  it("已有同名檔案就覆蓋內容（PATCH），不新建", async () => {
    const calls: { url: string; init?: Parameters<FetchLike>[1] }[] = [];
    const f: FetchLike = async (url, init) => {
      calls.push({ url, init });
      return okJson(init?.method ? { id: "old" } : { files: [{ id: "old" }] });
    };
    const id = await createDriveApi(f).saveText("tok", "設定.sfh", "新內容");
    expect(id).toBe("old");
    expect(calls).toHaveLength(2);
    expect(calls[1]?.init?.method).toBe("PATCH");
    expect(calls[1]?.url).toContain("/old?uploadType=media");
    expect(calls[1]?.init?.body).toBe("新內容");
  });

  it("配額用完（429）丟 GoogleApiError，可分類為 quota", async () => {
    const f: FetchLike = async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { status: "RESOURCE_EXHAUSTED" } }),
    });
    const err = await createDriveApi(f)
      .saveText("tok", "x", "y")
      .catch((e) => e);
    expect(classifyGoogleError(err)).toBe("quota");
  });

  it("檔名裡的單引號與反斜線會跳脫", () => {
    expect(quoteDriveName(String.raw`a'b\c`)).toBe(String.raw`'a\'b\\c'`);
  });
});

describe("GIS 登入（假全域物件）", () => {
  type Cfg = {
    scope: string;
    callback: (r: { access_token?: string }) => void;
    error_callback?: (e: { type?: string }) => void;
  };
  function fakeGis(onRequest: (cfg: Cfg) => void) {
    return {
      accounts: {
        oauth2: {
          initTokenClient: (c: Cfg) => ({
            requestAccessToken: () => onRequest(c),
          }),
          revoke: (_t: string, done: () => void) => done(),
        },
      },
    };
  }

  it("只要求 drive.file；使用者關視窗時取消", async () => {
    let scope = "";
    const gis = fakeGis((c) => {
      scope = c.scope;
      c.error_callback?.({ type: "popup_closed" });
    });
    const auth = createGoogleAuth(
      { clientId: "x" },
      async () => {},
      () => gis as never,
    );
    await expect(auth.signIn()).rejects.toBeInstanceOf(SignInCancelled);
    expect(scope).toBe("https://www.googleapis.com/auth/drive.file");
    await expect(auth.revoke("t")).resolves.toBeUndefined();
  });

  it("popup_failed_to_open 與 popup_closed 分開處理", async () => {
    const gis = fakeGis((c) =>
      c.error_callback?.({ type: "popup_failed_to_open" }),
    );
    const auth = createGoogleAuth(
      { clientId: "x" },
      async () => {},
      () => gis as never,
    );
    await expect(auth.signIn()).rejects.toBeInstanceOf(SignInPopupBlocked);
  });

  it("腳本慢載：沒載好前 isReady 為 false、signIn 不開彈窗；載好後點擊同步就開彈窗（像 iOS Safari 只准點擊內開）", async () => {
    let gisGlobal: ReturnType<typeof fakeGis> | undefined;
    let resolveLoad: () => void = () => {};
    let clickActive = false;
    const opened: boolean[] = [];
    const real = fakeGis((c) => {
      opened.push(clickActive);
      // 彈窗不是在點擊同步呼叫內開的就失敗
      if (clickActive) c.callback({ access_token: "T" });
      else c.error_callback?.({ type: "popup_failed_to_open" });
    });
    const load = () =>
      new Promise<void>((r) => {
        resolveLoad = () => {
          gisGlobal = real;
          r();
        };
      });
    const auth = createGoogleAuth(
      { clientId: "x" },
      load,
      () => gisGlobal as never,
    );
    expect(auth.isReady()).toBe(false);
    // 載好前按下去：不得呼叫 Google 的彈窗
    await expect(auth.signIn()).rejects.toBeInstanceOf(SignInPopupBlocked);
    expect(opened).toEqual([]);

    const pre = auth.preload();
    resolveLoad();
    await pre;
    expect(auth.isReady()).toBe(true);

    // 載好後的點擊：signIn 必須在同一個同步呼叫內就開彈窗
    clickActive = true;
    const p = auth.signIn();
    clickActive = false;
    expect(opened).toEqual([true]);
    await expect(p).resolves.toBe("T");
  });
});
