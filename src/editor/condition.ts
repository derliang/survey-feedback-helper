import type { Condition, ReportVersion } from './types';

export interface CondContext {
  version: ReportVersion;
  vars: Record<string, string | number | undefined>;
}

/** 條件成立回傳 true；沒有條件視為成立。數字比較時兩邊都轉成數字，轉不了就不成立。 */
export function evalCondition(c: Condition | undefined, ctx: CondContext): boolean {
  if (!c) return true;
  switch (c.kind) {
    case 'version':
      return c.is.includes(ctx.version);
    case 'not':
      return !evalCondition(c.cond, ctx);
    case 'all':
      return c.conds.every((x) => evalCondition(x, ctx));
    case 'any':
      return c.conds.some((x) => evalCondition(x, ctx));
    case 'var': {
      const v = ctx.vars[c.name];
      const empty = v === undefined || v === null || String(v).trim() === '';
      switch (c.op) {
        case 'nonEmpty':
          return !empty;
        case 'empty':
          return empty;
        case 'eq':
          return !empty && String(v) === String(c.value ?? '');
        case 'neq':
          return empty || String(v) !== String(c.value ?? '');
        case 'gt':
        case 'lt': {
          const a = Number(v),
            b = Number(c.value);
          if (empty || !Number.isFinite(a) || !Number.isFinite(b)) return false;
          return c.op === 'gt' ? a > b : a < b;
        }
      }
    }
  }
}

/** 條件的白話描述（編輯器面板與清單上顯示）。 */
export function describeCondition(c: Condition | undefined): string {
  if (!c) return '一律顯示';
  const V: Record<ReportVersion, string> = { teacher: '教師版', student: '學生版', parent: '家長版' };
  switch (c.kind) {
    case 'version':
      return `只在${c.is.map((x) => V[x]).join('、')}顯示`;
    case 'not':
      return `不符合「${describeCondition(c.cond)}」時顯示`;
    case 'all':
      return c.conds.map(describeCondition).join('，而且');
    case 'any':
      return c.conds.map(describeCondition).join('，或');
    case 'var': {
      const n = `{${c.name}}`;
      const ops = { nonEmpty: `${n} 有內容時顯示`, empty: `${n} 沒有內容時顯示`, eq: `${n} 等於 ${c.value} 時顯示`, neq: `${n} 不等於 ${c.value} 時顯示`, gt: `${n} 大於 ${c.value} 時顯示`, lt: `${n} 小於 ${c.value} 時顯示` };
      return ops[c.op];
    }
  }
}
