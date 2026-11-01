import { beforeEach, describe, expect, it, vi } from "vitest";

const saveToDrive = vi.fn();
vi.mock("./cloud", () => ({
  saveToDrive: (...a: unknown[]) => saveToDrive(...a),
  setCloudToken: vi.fn(),
  hasCloudToken: () => true,
}));

import { backupToDrive, getState, set, setCloudBackup } from "./store";

vi.stubGlobal("document", {
  documentElement: { setAttribute() {}, removeAttribute() {} },
});

describe("雲端自動備份（DESIGN.md 5.28）", () => {
  beforeEach(() => {
    saveToDrive.mockReset();
    set({
      toast: null,
      cloudAlert: null,
      cloud: { lastSaved: null, paused: null },
      prefs: { ...getState().prefs, cloudBackup: false },
    });
  });

  it("開關預設關：不送任何請求", async () => {
    await backupToDrive();
    expect(saveToDrive).not.toHaveBeenCalled();
  });

  it("開著且已登入：存一次、記下時間；成功提示每次開啟只跳第一次", async () => {
    saveToDrive.mockResolvedValue({ status: "saved", at: 123 });
    set({ prefs: { ...getState().prefs, cloudBackup: true } });
    await backupToDrive();
    expect(getState().cloud.lastSaved).toBe(123);
    expect(getState().toast).toContain("Google");
    set({ toast: null });
    await backupToDrive();
    expect(getState().toast).toBeNull();
  });

  it("同種失敗只跳一次，之後只更新設定頁狀態；換一種失敗會再跳", async () => {
    set({ prefs: { ...getState().prefs, cloudBackup: true } });
    saveToDrive.mockResolvedValue({ status: "failed", kind: "rate" });
    await backupToDrive();
    expect(getState().cloudAlert).toBe("rate");
    set({ cloudAlert: null });
    await backupToDrive();
    expect(getState().cloudAlert).toBeNull();
    expect(getState().cloud.paused).toBe("rate");
    saveToDrive.mockResolvedValue({ status: "failed", kind: "storage" });
    await backupToDrive();
    expect(getState().cloudAlert).toBe("storage");
  });

  it("關閉開關：清掉狀態與提示，不再存", async () => {
    set({
      prefs: { ...getState().prefs, cloudBackup: true },
      cloudAlert: "network",
      cloud: { lastSaved: 1, paused: "network" },
    });
    setCloudBackup(false);
    expect(getState().prefs.cloudBackup).toBe(false);
    expect(getState().cloudAlert).toBeNull();
    await backupToDrive();
    expect(saveToDrive).not.toHaveBeenCalled();
  });
});
