// 編譯：範本 ＋ 某位學生的資料 → 輸出器讀的 DocModel。條件、變數、單一學生覆寫都在這裡套用。
import { A4_LANDSCAPE, A4_PORTRAIT, fillVars, type Block, type DocModel, type PageSetup } from '../export/model';
import { evalCondition } from './condition';
import { applyOverrides, type StudentOverride } from './overrides';
import { PAGE_SIZES, type BulletsEB, type DataEB, type EBlock, type EditorTemplate, type PageSpec, type ReportVersion } from './types';

export interface CompileContext {
  version: ReportVersion;
  vars: Record<string, string | number | undefined>;
  /** 統計資料槽：應用層依 slot 名稱與區塊設定（圖表類型、顏色）回傳要放的區塊；回傳空陣列 = 沒有資料（區塊略過）。 */
  slot: (slot: string, block: DataEB | BulletsEB) => Block[];
  /** 圖片參照 → PNG 位元組；找不到就略過該圖片。 */
  image?: (src: string) => Uint8Array | undefined;
  /** 這位學生的覆寫。 */
  override?: StudentOverride;
  title?: string;
}

export function pageSetup(p: PageSpec): PageSetup {
  const base = PAGE_SIZES[p.size];
  const landscape = p.orientation === 'landscape';
  const w = landscape ? base.h : base.w;
  const h = landscape ? base.w : base.h;
  const ref = landscape ? A4_LANDSCAPE : A4_PORTRAIT;
  return { w, h, mx: p.mx, mt: p.mt, mb: p.mb, footerFromBottom: ref.footerFromBottom };
}

export function compile(template: EditorTemplate, ctx: CompileContext): DocModel {
  const t = applyOverrides(template, ctx.override);
  const vars = { ...ctx.vars, ...(ctx.override?.vars ?? {}) };
  const cond = { version: ctx.version, vars };
  const fill = (s: string) => fillVars(s, vars);
  const spacing = (b: EBlock) => ({ ...(b.before !== undefined ? { before: b.before } : {}), ...(b.after !== undefined ? { after: b.after } : {}) });

  const out: Block[] = [];
  const emit = (list: EBlock[]): void => {
    for (const b of list) {
      if (!evalCondition(b.when, cond)) continue;
      switch (b.kind) {
        case 'heading':
          out.push({ type: 'heading', text: fill(b.text), size: b.size, ...(b.color ? { color: b.color } : {}), ...spacing(b) });
          break;
        case 'text':
          out.push({ type: 'text', text: fill(b.text), size: b.size, ...(b.color ? { color: b.color } : {}), ...spacing(b) });
          break;
        case 'bullets': {
          const items = (b.slot ? ctx.slot(b.slot, b).flatMap((x) => (x.type === 'bullets' ? x.items : [])) : b.items).map(fill);
          if (items.length) out.push({ type: 'bullets', items, size: b.size, ...spacing(b) });
          break;
        }
        case 'data': {
          const blocks = ctx.slot(b.slot, b);
          blocks.forEach((x, i) => out.push(i === blocks.length - 1 && b.after !== undefined ? { ...x, after: b.after } : x));
          break;
        }
        case 'image': {
          const png = ctx.image?.(b.src);
          if (png) out.push({ type: 'image', png, w: b.w, h: b.h, ...spacing(b) });
          break;
        }
        case 'divider':
          out.push({ type: 'rule', ...spacing(b) });
          break;
        case 'pageBreak':
          out.push({ type: 'pagebreak' });
          break;
        case 'columns':
          // 輸出器目前不支援並排：各欄依序（由左到右）上下排列。並排版面見 todo（輸出器加欄位排版後再改）。
          b.cols.forEach(emit);
          break;
      }
    }
  };
  emit(t.blocks);

  const doc: DocModel = { blocks: out, footerText: fill(t.page.footerText), lineH: t.lineH, page: pageSetup(t.page) };
  const title = ctx.title ?? (t.page.headerText ? fill(t.page.headerText) : undefined);
  if (title) doc.title = title;
  return doc;
}
