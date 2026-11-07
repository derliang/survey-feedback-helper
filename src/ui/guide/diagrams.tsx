import type { ComponentChildren } from 'preact';
import { dg } from '../strings-guide';
import './diagrams.css';

/**
 * 教學圖解（設計稿 5.32）：自畫的 HTML 方塊＋少量內嵌 SVG，全部走 tokens（淺色深色自動成立），沒有點陣圖、沒有外部資源。
 * 一律標「自畫示意，不是截圖」；沒核對過字樣的 Google 畫面用虛線框＋灰條，圖下標「待核對」，不編字樣。
 * 本檔與 diagrams.css 只在教學頁（GuideView chunk）與用到圖的提示被打開時才載入（見 LazyFig）。
 */

type Kids = { children?: ComponentChildren };

const Svg = (p: { d: string; size?: number }) => (
  <svg class="ic" viewBox="0 0 24 24" width={p.size ?? 16} height={p.size ?? 16} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d={p.d} />
  </svg>
);

/** 游標（「按這裡」）：實心箭頭，ink 填色、card 描邊，淺深色都看得到。 */
const Cur = () => (
  <svg class="dg-cur" viewBox="0 0 16 20" width="14" height="18" aria-hidden="true" focusable="false">
    <path d="M1 1v15l4-4 3 7 3-1.4-3-6.6h6z" fill="var(--ink)" stroke="var(--card)" stroke-width="1.4" stroke-linejoin="round" />
  </svg>
);

/** 一張圖：外框＋固定註記；alt 給螢幕報讀（圖內細節不重複報讀，步驟文字已說明）。 */
function Fig(p: Kids & { alt: string; tbc?: boolean }) {
  const D = dg();
  return (
    <figure class="dg" role="img" aria-label={D.alt(p.alt, !!p.tbc)}>
      {p.children}
      <figcaption class="dg-cap" aria-hidden="true">
        {D.cap}
        {p.tbc && <span class="tag warn sm">{D.tbc}</span>}
      </figcaption>
    </figure>
  );
}

/** 視窗：app＝本程式；ext＝外部服務（字樣已核對）；tbd＝外部且字樣未核對（虛線框）。 */
function Win(p: Kids & { title: string; kind?: 'app' | 'ext' | 'tbd' }) {
  const kind = p.kind ?? 'ext';
  return (
    <div class={`dg-w ${kind}`}>
      <div class="dg-wt">
        <span class="dg-dots" aria-hidden="true" />
        <span class="dg-wn">{p.title}</span>
        {kind === 'app' && <span class="dg-me">{dg().me}</span>}
      </div>
      <div class="dg-wb">{p.children}</div>
    </div>
  );
}

const Row = (p: Kids) => <div class="dg-row">{p.children}</div>;
const Sp = () => <span class="dg-sp" />;
const Ph = (p: { w?: number }) => <span class="dg-ph" style={{ width: `${p.w ?? 60}%` }} />;
const T = (p: Kids & { b?: boolean; m?: boolean }) => <span class={`dg-t${p.b ? ' b' : ''}${p.m ? ' m' : ''}`}>{p.children}</span>;
/** 示意按鈕（不可點）；hot＝要按的元件（外框＋游標）。 */
const B = (p: Kids & { pri?: boolean; hot?: boolean; ghost?: boolean }) => (
  <span class={`dg-b${p.pri ? ' pri' : ''}${p.hot ? ' hot' : ''}${p.ghost ? ' ghostb' : ''}`}>
    {p.children}
    {p.hot && <Cur />}
  </span>
);
const Arrow = () => (
  <div class="dg-ar" aria-hidden="true">
    <Svg d="M12 4v15M6 13l6 6 6-6" size={18} />
  </div>
);
const Flow = (p: { items: ComponentChildren[] }) => (
  <div class="dg-flow">
    {p.items.map((x, i) => (
      <>
        {i > 0 && <Arrow />}
        {x}
      </>
    ))}
  </div>
);
/** 選單項目：sel＝要選的；ok／no＝能讀／讀不了（一律寫字）；sub＝有子選單。 */
function Mi(p: { t?: string; sel?: boolean; ok?: boolean; no?: boolean; sub?: boolean; cur?: boolean; ph?: number }) {
  const D = dg();
  return (
    <div class={`dg-mi${p.sel ? ' sel' : ''}${p.no ? ' no' : ''}`}>
      <span class="mt">{p.ph ? <Ph w={p.ph} /> : p.t}</span>
      {p.ok && <span class="dg-ok">{D.canRead}</span>}
      {p.no && <span class="dg-no">{D.cantRead}</span>}
      {p.sub && <span class="dg-sub">›</span>}
      {p.sel && p.cur !== false && <Cur />}
    </div>
  );
}
const Menu = (p: Kids) => <div class="dg-m">{p.children}</div>;
const Msep = () => <div class="dg-msep" />;
const Dlg = (p: Kids & { title: string }) => (
  <div class="dg-dlg">
    <b class="dh">{p.title}</b>
    {p.children}
  </div>
);
const Radio = (p: { t: string; on?: boolean }) => (
  <div class={`dg-rd${p.on ? ' on' : ''}`}>
    <span class="dot" aria-hidden="true" />
    {p.t}
  </div>
);
const Tabs = (p: { items: ComponentChildren[]; on: number }) => (
  <div class="dg-tabs">
    {p.items.map((x, i) => (
      <span class={`dg-tab${i === p.on ? ' on hot' : ''}`}>
        {x}
        {i === p.on && <Cur />}
      </span>
    ))}
  </div>
);
const Good = (p: Kids) => (
  <div class="dg-v ok">
    <b class="dg-ok">{dg().doThis}</b>
    {p.children}
  </div>
);
const Bad = (p: Kids) => (
  <div class="dg-v no">
    <b class="dg-no">{dg().dontThis}</b>
    {p.children}
  </div>
);
const Q = (p: Kids & { title: string; type: string }) => (
  <div class="dg-q">
    <Row>
      <b>{p.title}</b>
      <Sp />
      <span class="dg-type">{p.type}</span>
    </Row>
    {p.children}
  </div>
);
const File = (p: Kids) => (
  <span class="dg-file">
    <Svg d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
    {p.children}
  </span>
);
const Acct = (p: Kids & { hot?: boolean }) => (
  <div class={`dg-acct${p.hot ? ' hot' : ''}`}>
    {p.children}
    {p.hot && <Cur />}
  </div>
);
const Scale = (p: { left: string; right: string }) => (
  <div class="dg-scale">
    <span>{p.left}</span>
    {[1, 2, 3, 4, 5].map((n) => (
      <b key={n}>{n}</b>
    ))}
    <span>{p.right}</span>
  </div>
);

export type FigId =
  | 'pre1' | 'pre2' | 'pre3' | 'pre4' | 'pre5'
  | 'm1a' | 'm1b' | 'm1c' | 'm1d' | 'm1e' | 'case1'
  | 'm2a' | 'm2b' | 'm2alt'
  | 'tip1' | 'tip2' | 'tip3' | 'tip5' | 'types'
  | 'fdT1' | 'fdT2' | 'fdT3' | 'fdD1' | 'fdD2'
  | 'tq1' | 'tq2' | 'tq3'
  | 'cs1' | 'cs2';

/** 29 張圖。字樣取自 strings-guide.ts；每張回傳一個 <Fig>。 */
const FIGS: Record<FigId, () => ComponentChildren> = {
  // ---- 共同前置 ----
  pre1: () => {
    const D = dg();
    return (
      <Fig alt={D.a.pre1}>
        <Win title={D.gForms}>
          <Row>
            <T b>{D.formName}</T>
            <Sp />
            <Ph w={30} />
          </Row>
          <div class="dg-pop">
            <Row>
              <T b>{D.gemini}</T>
              <Sp />
              <B hot>✕</B>
            </Row>
            <Ph w={90} />
            <Ph w={70} />
          </div>
        </Win>
      </Fig>
    );
  },
  pre2: () => {
    const D = dg();
    return (
      <Fig alt={D.a.pre2}>
        <Flow
          items={[
            <Win title={D.gForms}>
              <Row>
                <T b>{D.formName}</T>
                <Sp />
                <B hot pri>
                  {D.publish}
                </B>
              </Row>
            </Win>,
            <Dlg title={D.publishDlg}>
              <Row>
                <T>{D.responders}</T>
                <T m>{D.anyoneLink}</T>
              </Row>
              <Row>
                <Sp />
                <B>{D.close}</B>
                <B hot pri>
                  {D.publish}
                </B>
              </Row>
            </Dlg>,
            <Row>
              <T>{D.rightTop}</T>
              <B>{D.published}</B>
            </Row>,
          ]}
        />
      </Fig>
    );
  },
  pre3: () => {
    const D = dg();
    return (
      <Fig alt={D.a.pre3}>
        <Win title={D.gForms}>
          <Tabs
            on={1}
            items={[
              D.tabQ,
              <>
                {D.tabR} <span class="dg-badge">2</span>
              </>,
              D.tabS,
            ]}
          />
          <T b>{D.responses2}</T>
          <Ph w={80} />
        </Win>
      </Fig>
    );
  },
  pre4: () => {
    const D = dg();
    return (
      <Fig alt={D.a.pre4}>
        <Flow
          items={[
            <Win title={D.gForms}>
              <Row>
                <T b>{D.responses2}</T>
                <Sp />
                <B hot>{D.linkSheet}</B>
                <B>{D.moreMenu}</B>
              </Row>
            </Win>,
            <Dlg title={D.destDlg}>
              <Radio t={D.newSheet} on />
              <Radio t={D.existingSheet} />
              <Row>
                <Sp />
                <B>{D.cancel}</B>
                <B hot pri>
                  {D.create}
                </B>
              </Row>
            </Dlg>,
          ]}
        />
      </Fig>
    );
  },
  pre5: () => {
    const D = dg();
    return (
      <Fig alt={D.a.pre5}>
        <Win title={D.sheet}>
          <div class="dg-grid">
            <span class="h">{D.timestamp}</span>
            <span class="h">{D.overall}</span>
            <Ph w={90} />
            <Ph w={30} />
            <Ph w={90} />
            <Ph w={30} />
          </div>
          <Row>
            <span class="dg-sheettab mark">{D.sheetTab}</span>
          </Row>
        </Win>
      </Fig>
    );
  },
  // ---- 做法一 ----
  m1a: () => {
    const D = dg();
    return (
      <Fig alt={D.a.m1a}>
        <Win title={D.app} kind="app">
          <T b>{D.homeTitle}</T>
          <Row>
            <B hot pri>
              {D.openSheet}
            </B>
            <B>{D.pickFile}</B>
          </Row>
        </Win>
      </Fig>
    );
  },
  m1b: () => {
    const D = dg();
    return (
      <Fig alt={D.a.m1b}>
        <Win title={D.app} kind="app">
          <T b>{D.beforeLogin}</T>
          <Ph w={90} />
          <Ph w={60} />
          <Row>
            <Sp />
            <B>{D.cancel}</B>
            <B hot pri>
              {D.goGoogle}
            </B>
          </Row>
        </Win>
      </Fig>
    );
  },
  m1c: () => {
    const D = dg();
    return (
      <Fig alt={D.a.m1c} tbc>
        <Win title={D.gWindow} kind="tbd">
          <T m>{D.pickAccount}</T>
          <Acct>
            <T>{D.initial}</T>
            <span>teacher.wang@gmail.com</span>
          </Acct>
          <Acct hot>
            <T>{D.initial}</T>
            <span>wang@school.edu.tw</span>
          </Acct>
          <Row>
            <Sp />
            <B ghost>{D.agreeBtn}</B>
          </Row>
        </Win>
      </Fig>
    );
  },
  m1d: () => {
    const D = dg();
    return (
      <Fig alt={D.a.m1d} tbc>
        <Win title={D.gPicker} kind="tbd">
          <Acct>
            <File>{D.otherSheet}</File>
          </Acct>
          <Acct hot>
            <File>{D.sheet}</File>
          </Acct>
          <Acct>
            <File>{D.otherSheet}</File>
          </Acct>
        </Win>
      </Fig>
    );
  },
  m1e: () => {
    const D = dg();
    return (
      <Fig alt={D.a.m1e}>
        <Flow
          items={[
            <Win title={D.app} kind="app">
              <T b>{D.reading}</T>
              <span class="dg-prog">
                <span />
              </span>
            </Win>,
            <Win title={D.app} kind="app">
              <div class="dg-step4">
                {D.stepsApp.map((s, i) => (
                  <span key={s} class={i === 1 ? 'on' : ''}>
                    {s}
                  </span>
                ))}
              </div>
            </Win>,
          ]}
        />
      </Fig>
    );
  },
  case1: () => {
    const D = dg();
    return (
      <Fig alt={D.a.case1}>
        <Flow
          items={[
            <div class="dg-v no">
              <b class="dg-no">✕ {D.popBlocked}</b>
              {D.popBlockedWho}
            </div>,
            <div class="dg-v ok">
              <b class="dg-ok">✓ {D.useInstead}</b>
              {D.useBrowser}
            </div>,
          ]}
        />
      </Fig>
    );
  },
  // ---- 做法二 ----
  m2a: () => {
    const D = dg();
    return (
      <Fig alt={D.a.m2a}>
        <Win title={D.sheet}>
          <Row>
            <B hot>{D.menuFile}</B>
            <T>{D.menuEdit}</T>
            <T>{D.menuView}</T>
            <T>{D.menuInsert}</T>
            <Ph w={15} />
          </Row>
          <div class="dg-cas">
            <Menu>
              <Mi ph={50} />
              <Msep />
              <Mi t={D.menuShare} />
              <Mi t={D.menuEmail} />
              <Mi t={D.menuDownload} sel sub cur={false} />
              <Msep />
              <Mi ph={40} />
            </Menu>
            <Menu>
              <Mi t={D.fmtXlsx} sel ok />
              <Mi t={D.fmtOds} no />
              <Mi t={D.fmtPdf} no />
              <Mi t={D.fmtHtml} no />
              <Mi t={D.fmtCsv} ok />
              <Mi t={D.fmtTsv} ok />
            </Menu>
          </div>
        </Win>
      </Fig>
    );
  },
  m2b: () => {
    const D = dg();
    return (
      <Fig alt={D.a.m2b}>
        <Win title={D.app} kind="app">
          <T b>{D.homeTitle}</T>
          <div class="dg-drop">
            <File>{D.justDownloaded}</File>
            <T m>{D.dropHere}</T>
          </div>
          <Row>
            <B pri>{D.openSheet}</B>
            <B hot>{D.pickFile}</B>
          </Row>
        </Win>
      </Fig>
    );
  },
  m2alt: () => {
    const D = dg();
    return (
      <Fig alt={D.a.m2alt}>
        <Win title={D.gForms}>
          <Row>
            <T b>{D.responses2}</T>
            <Sp />
            <B>{D.viewInSheet}</B>
            <B hot>{D.moreMenu}</B>
          </Row>
          <Menu>
            <Mi t={D.mNotify} />
            <Mi t={D.mDest} />
            <Mi t={D.mUnlink} />
            <Mi t={D.mCsv} sel />
            <Mi t={D.mPrint} />
            <Mi t={D.mDelete} />
          </Menu>
        </Win>
      </Fig>
    );
  },
  // ---- 表單怎麼設計 ----
  tip1: () => {
    const D = dg();
    return (
      <Fig alt={D.a.tip1}>
        <Good>
          <Q title={D.qClass} type={D.tShort} />
          <Q title={D.qSeat} type={D.tShort} />
          <Q title={D.qName} type={D.tShort} />
        </Good>
        <Bad>
          <Q title={D.qAll} type={D.tShort} />
        </Bad>
      </Fig>
    );
  },
  tip2: () => {
    const D = dg();
    return (
      <Fig alt={D.a.tip2}>
        <Good>
          <Q title={D.qLeader} type={D.tChoice}>
            <Radio t={D.candA} />
            <Radio t={D.candD} />
          </Q>
        </Good>
        <Bad>
          <Q title={D.qLeader} type={D.tShort}>
            <Row>
              <B>{D.candA}</B>
              <B>{D.candB}</B>
              <B>{D.candC}</B>
            </Row>
          </Q>
        </Bad>
      </Fig>
    );
  },
  tip3: () => {
    const D = dg();
    return (
      <Fig alt={D.a.tip3}>
        <Good>
          <Scale left={D.scaleBad} right={D.scaleGood} />
          <T m>{D.scaleOk}</T>
        </Good>
        <Bad>
          <Scale left={D.scaleBadRev} right={D.scaleGoodRev} />
          <T m>{D.scaleReversed}</T>
        </Bad>
      </Fig>
    );
  },
  tip5: () => {
    const D = dg();
    return (
      <Fig alt={D.a.tip5}>
        <Flow
          items={[
            <Win title={D.gFormsAnswer}>
              <Ph w={80} />
              <Ph w={50} />
              <Row>
                <B hot pri>
                  {D.submit}
                </B>
              </Row>
            </Win>,
            <Win title={D.sheet}>
              <div class="dg-grid">
                <span class="h mark">{D.timestamp}</span>
                <span class="h mark">{D.overall}</span>
                <Ph w={90} />
                <Ph w={30} />
              </div>
              <T m>{D.headerOk}</T>
            </Win>,
          ]}
        />
      </Fig>
    );
  },
  types: () => {
    const D = dg();
    return (
      <Fig alt={D.a.types}>
        <Menu>
          <Mi t={D.tShort} sel cur={false} />
          <Mi t={D.tPara} sel cur={false} />
          <Msep />
          <Mi t={D.tChoice} sel cur={false} />
          <Mi t={D.tCheck} sel cur={false} />
          <Mi t={D.tDrop} />
          <Msep />
          <Mi t={D.tUpload} />
          <Msep />
          <Mi t={D.tScale} sel cur={false} />
          <Mi t={D.tRating} />
          <Mi t={D.tGrid} sel cur={false} />
          <Mi t={D.tCheckGrid} />
          <Msep />
          <Mi t={D.tDate} />
          <Mi t={D.tTime} />
        </Menu>
      </Fig>
    );
  },
  // ---- 資料夾：怎麼手動存取（手機、平板） ----
  fdT1: () => {
    const D = dg();
    return (
      <Fig alt={D.a.fdT1}>
        <Win title={D.app} kind="app">
          <T b>{D.dirtyTitle}</T>
          <Row>
            <B hot pri>
              {D.saveToFiles}
            </B>
          </Row>
        </Win>
      </Fig>
    );
  },
  fdT2: () => {
    const D = dg();
    return (
      <Fig alt={D.a.fdT2} tbc>
        <Win title={D.shareMenu} kind="tbd">
          <Row>
            <Ph w={20} />
            <Ph w={20} />
            <Ph w={20} />
          </Row>
          <Acct hot>
            <File>{D.saveToFiles}</File>
          </Acct>
          <T m>{D.pickWhere}</T>
        </Win>
      </Fig>
    );
  },
  fdT3: () => {
    const D = dg();
    return (
      <Fig alt={D.a.fdT3}>
        <Win title={D.app} kind="app">
          <T b>{D.homeTitle}</T>
          <Row>
            <B pri>{D.openSheet}</B>
            <B>{D.pickFile}</B>
            <B hot>{D.openConfig}</B>
          </Row>
          <T m>{D.pickBack}</T>
        </Win>
      </Fig>
    );
  },
  // ---- 資料夾：怎麼手動存取（桌機，Safari、Firefox） ----
  fdD1: () => {
    const D = dg();
    return (
      <Fig alt={D.a.fdD1}>
        <Flow
          items={[
            <Win title={D.app} kind="app">
              <T b>{D.dirtyTitle}</T>
              <Row>
                <B hot pri>
                  {D.download}
                </B>
              </Row>
            </Win>,
            <Row>
              <File>{D.configFile}</File>
              <T m>{D.saveToPc}</T>
            </Row>,
          ]}
        />
      </Fig>
    );
  },
  fdD2: () => {
    const D = dg();
    return (
      <Fig alt={D.a.fdD2}>
        <Win title={D.app} kind="app">
          <T b>{D.homeTitle}</T>
          <Row>
            <B pri>{D.openSheet}</B>
            <B>{D.pickFile}</B>
            <B hot>{D.openConfig}</B>
          </Row>
          <Row>
            <File>{D.configFile}</File>
          </Row>
        </Win>
      </Fig>
    );
  },
  // ---- 快速範本 ----
  tq1: () => {
    const D = dg();
    return (
      <Fig alt={D.a.tq1}>
        <Win title={D.app} kind="app">
          <div class="dg-cards">
            <span class="dg-card hot">
              {D.tplA}
              <Cur />
            </span>
            <span class="dg-card">{D.tplB}</span>
            <span class="dg-card">{D.tplC}</span>
            <span class="dg-card">{D.tplD}</span>
          </div>
        </Win>
      </Fig>
    );
  },
  tq2: () => {
    const D = dg();
    return (
      <Fig alt={D.a.tq2}>
        <Win title={D.app} kind="app">
          <T b>{D.tplDefaults}</T>
          <Ph w={90} />
          <Ph w={70} />
          <Row>
            <B hot pri>
              {D.copyList}
            </B>
          </Row>
          <Ph w={50} />
        </Win>
      </Fig>
    );
  },
  tq3: () => {
    const D = dg();
    return (
      <Fig alt={D.a.tq3}>
        <Win title={D.gForms}>
          <Q title={D.qSatisfied} type={D.tScale} />
          <T m>{D.autoGuess}</T>
          <T m b>
            {D.typeByDrop}
          </T>
        </Win>
      </Fig>
    );
  },
  // ---- 選課分組志願 ----
  cs1: () => {
    const D = dg();
    return (
      <Fig alt={D.a.cs1}>
        <Win title={D.gForms}>
          <Q title={D.qFirst} type={D.tGrid} />
          <Menu>
            <Mi t={D.tScale} />
            <Mi t={D.tRating} />
            <Mi t={D.tGrid} sel />
            <Mi t={D.tCheckGrid} />
          </Menu>
        </Win>
      </Fig>
    );
  },
  cs2: () => {
    const D = dg();
    return (
      <Fig alt={D.a.cs2}>
        <Win title={D.gForms}>
          <Q title={D.qRank} type={D.tGrid}>
            <Ph w={80} />
            <Ph w={60} />
            <Row>
              <Sp />
              <B hot>{D.moreMenu}</B>
            </Row>
          </Q>
          <Menu>
            <Mi ph={70} />
            <div class="dg-mi sel">
              <span class="mt">{D.onlyOne}</span>
              <Cur />
            </div>
          </Menu>
        </Win>
      </Fig>
    );
  },
};

/** 單張圖。 */
export function Diagram(props: { id: FigId }) {
  return <>{FIGS[props.id]()}</>;
}

/** 圖解步驟：每一步＝一張圖（可省略）＋編號＋一兩句短字。欄數跟著卡片寬度自動排（CSS）。 */
export function DSteps(props: { steps: { fig?: FigId; text: ComponentChildren }[]; class?: string }) {
  return (
    <ol class={`dsteps${props.class ? ` ${props.class}` : ''}`}>
      {props.steps.map((s, i) => (
        <li class="dstep" key={i}>
          {s.fig && <Diagram id={s.fig} />}
          <div class="dtx">
            <span class="num" aria-hidden="true">
              {i + 1}
            </span>
            <p>{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
