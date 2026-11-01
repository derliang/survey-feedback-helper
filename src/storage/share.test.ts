import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveFile } from './share';

function stubEnv(opts: { touch: boolean; share?: (d: ShareData) => Promise<void>; canShare?: boolean }) {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: opts.touch }) });
  vi.stubGlobal('navigator', { maxTouchPoints: opts.touch ? 5 : 0, share: opts.share, canShare: opts.share ? () => opts.canShare ?? true : undefined });
  vi.stubGlobal(
    'File',
    class {
      constructor(
        public parts: unknown[],
        public name: string,
        public opts: unknown,
      ) {}
    },
  );
}

describe('saveFile（手機走分享、其餘下載）', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('觸控裝置且支援分享檔案：開分享選單，不下載', async () => {
    const share = vi.fn(async () => {});
    stubEnv({ touch: true, share });
    const download = vi.fn();
    expect(await saveFile('a.sfh', '{}', 'application/json', download)).toBe('shared');
    expect(share).toHaveBeenCalledOnce();
    expect(download).not.toHaveBeenCalled();
  });

  it('使用者關掉分享選單：視為取消，不重複下載', async () => {
    stubEnv({ touch: true, share: async () => Promise.reject(new DOMException('x', 'AbortError')) });
    const download = vi.fn();
    expect(await saveFile('a.sfh', '{}', 'application/json', download)).toBe('cancelled');
    expect(download).not.toHaveBeenCalled();
  });

  it('不支援分享檔案或分享失敗：退回下載', async () => {
    stubEnv({ touch: true, share: async () => {}, canShare: false });
    const d1 = vi.fn();
    expect(await saveFile('a.sfh', '{}', 'application/json', d1)).toBe('downloaded');
    expect(d1).toHaveBeenCalledOnce();
    stubEnv({ touch: true, share: async () => Promise.reject(new DOMException('x', 'NotAllowedError')) });
    const d2 = vi.fn();
    expect(await saveFile('a.sfh', '{}', 'application/json', d2)).toBe('downloaded');
    expect(d2).toHaveBeenCalledOnce();
  });

  it('桌機（非觸控）一律下載，行為不變', async () => {
    const share = vi.fn(async () => {});
    stubEnv({ touch: false, share });
    const download = vi.fn();
    expect(await saveFile('a.sfh', '{}', 'application/json', download)).toBe('downloaded');
    expect(share).not.toHaveBeenCalled();
  });
});
