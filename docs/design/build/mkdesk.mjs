// 只含桌機的成品頁（第 2 輪）：由 mk.mjs artifact 產生的 survey-pages.html 裁出桌機區，加上「等你決定」摘要
import fs from 'node:fs';
import { sp } from './lib.mjs';
let h = fs.readFileSync(sp + '/survey-pages.html', 'utf8');
const a = h.indexOf('<section class="dev-view" id="v-phone"');
const b = h.indexOf('<section class="dev-view" id="v-desktop"');
const end = h.indexOf('</section>\n</div>\n<script>');
let desk = h.slice(b, end + '</section>'.length).replace(' hidden>', '>');
h = h.slice(0, a) + desk + h.slice(end + '</section>'.length);
h = h.replace(/<div class="seg devsw"[\s\S]*?<\/div><\/header>/, '</header>');
h = h.replace('<title>問卷回饋小幫手畫面設計</title>', '<title>桌機設計稿</title>');
h = h.replace('<h1>問卷回饋小幫手畫面設計</h1>', '<h1>桌機設計稿 · 第 2 輪</h1>');
h = h.replace('畫面設計 · 規範見 docs/design/DESIGN.md', '2026-11-01 · 已套用邊界條件、審稿意見、頁面裁示 · 手機與平板尚未套用 · 規範見 docs/design/DESIGN.md');
const todo = `<section class="qcard" style="padding:16px 18px;gap:8px"><h3>等你決定（點連結跳到畫面）</h3><ul style="margin:0;padding-left:1.2em;line-height:1.9"><li><b>首頁三方案</b>：甲雙欄（穩妥）、乙卡片牆、丙接續優先 → <a href="#d-open">開啟問卷</a></li><li><b>投影唱票</b>：A 單一候選人大字、B 全部候選人同列 → <a href="#d-vote">票選</a></li><li><b>Logo 三案</b>：甲、乙、丙 → <a href="#d-set">設定、隱私與品牌</a></li><li><b>預設常用評語草稿</b>（六類，請修改）→ <a href="#d-out">審稿與輸出</a>最後一張</li><li><b>隱私句定稿</b>：D54 的三句 → <a href="#d-set">設定</a></li></ul></section>`;
h = h.replace('</header>', '</header>' + todo);
h = h.replace("['phone','tablet','desktop'].indexOf(h)>=0?h:'phone'", "'desktop'");
fs.writeFileSync(sp + '/survey-desktop-r2.html', h);
console.log(h.length, (h.match(/class="fig"/g) || []).length);
