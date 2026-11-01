import { describe, expect, it } from 'vitest';
import { type DirHandleLike, storeFromHandle } from './fsa';

/** 記憶體內的假資料夾：getFileHandle 找不到檔案時丟 NotFoundError，與瀏覽器一致。 */
function fakeDir(): DirHandleLike {
  const files = new Map<string, string>();
  return {
    name: '問卷小幫手',
    async getFileHandle(name, opts) {
      if (!files.has(name)) {
        if (!opts?.create) throw new DOMException('missing', 'NotFoundError');
        files.set(name, '');
      }
      return {
        async getFile() {
          return { text: async () => files.get(name) ?? '' };
        },
        async createWritable() {
          let buf = '';
          return {
            write: async (d: string) => void (buf += d),
            close: async () => void files.set(name, buf),
          };
        },
      };
    },
  };
}

describe('資料夾儲存提供者', () => {
  it('檔案不存在回傳 null，寫入後讀得回來', async () => {
    const store = storeFromHandle(fakeDir());
    expect(store.name).toBe('問卷小幫手');
    expect(await store.read('a.sfh')).toBeNull();
    await store.write('a.sfh', '{"x":1}');
    expect(await store.read('a.sfh')).toBe('{"x":1}');
    await store.write('a.sfh', '{"x":2}');
    expect(await store.read('a.sfh')).toBe('{"x":2}');
  });
  it('其他錯誤照常丟出', async () => {
    const dir = fakeDir();
    dir.getFileHandle = async () => {
      throw new DOMException('no', 'NotAllowedError');
    };
    await expect(storeFromHandle(dir).read('a')).rejects.toThrow();
  });
});
