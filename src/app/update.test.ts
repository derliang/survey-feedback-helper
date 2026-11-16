import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getState, set } from './store';
import { applyUpdateNow, hasUnsavedWork, onUpdateWaiting } from './update';

describe('有新版本', () => {
  beforeEach(() => set({ session: null, reviewUnsaved: false, courseUnsaved: false, route: 'home', updateReady: false, updateDismissed: false }));

  it('沒有載入資料就直接更新，不跳對話框', () => {
    const apply = vi.fn();
    onUpdateWaiting(apply);
    expect(apply).toHaveBeenCalledOnce();
    expect(getState().updateReady).toBe(false);
  });

  it('有載入資料時不自動更新，改成顯示對話框，按「現在更新」才套用', () => {
    set({ reviewUnsaved: true });
    expect(hasUnsavedWork()).toBe(true);
    const apply = vi.fn();
    onUpdateWaiting(apply);
    expect(apply).not.toHaveBeenCalled();
    expect(getState().updateReady).toBe(true);
    applyUpdateNow();
    expect(apply).toHaveBeenCalledOnce();
  });
});

describe('sw.js 換版規則', () => {
  it('安裝時不自動 skipWaiting，只在收到 SKIP_WAITING 訊息時才換版', async () => {
    const { readFileSync } = await import('node:fs');
    const sw = readFileSync('public/sw.js', 'utf8');
    const install = sw.slice(sw.indexOf("'install'"), sw.indexOf("'message'"));
    expect(install).not.toMatch(/skipWaiting\(\)\s*;/);
    expect(sw).toMatch(/SKIP_WAITING[\s\S]*skipWaiting\(\)/);
  });
});
