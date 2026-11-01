import{strToU8 as e,zipSync as t}from"./browser-RwCGrwT9.js";var n={title:1,header:2,text:3,num:4,emphText:5,emphNum:6},r=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts>
<fonts count="4">
<font><sz val="11"/><name val="Microsoft JhengHei"/><family val="2"/></font>
<font><b/><sz val="14"/><color rgb="FF1F4E79"/><name val="Microsoft JhengHei"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft JhengHei"/><family val="2"/></font>
<font><b/><sz val="11"/><name val="Microsoft JhengHei"/><family val="2"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F4E79"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFDCE8F4"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFC9D6E3"/></left><right style="thin"><color rgb="FFC9D6E3"/></right><top style="thin"><color rgb="FFC9D6E3"/></top><bottom style="thin"><color rgb="FFC9D6E3"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,i=e=>e.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`);function a(e){let t=``;for(let n=e+1;n>0;n=Math.floor((n-1)/26))t=String.fromCharCode(65+(n-1)%26)+t;return t}function o(e,t){let n=(e.replace(/[[\]:*?/\\]/g,`_`).trim()||`工作表`).slice(0,31),r=n,i=2;for(;t.has(r.toLowerCase());){let e=` (${i++})`;r=n.slice(0,31-e.length)+e}return t.add(r.toLowerCase()),r}function s(e){let t=e.rows.map((e,t)=>{let r=e.map((e,r)=>{let o=typeof e==`object`&&e?e:{v:e,s:void 0},s=`${a(r)}${t+1}`,c=o.s?` s="${n[o.s]}"`:``;return o.v===null||o.v===void 0||o.v===``?c?`<c r="${s}"${c}/>`:``:typeof o.v==`number`?Number.isFinite(o.v)?`<c r="${s}"${c}><v>${o.v}</v></c>`:`<c r="${s}"${c}/>`:`<c r="${s}"${c} t="inlineStr"><is><t xml:space="preserve">${i(o.v)}</t></is></c>`}).join(``);return`<row r="${t+1}">${r}</row>`}).join(``),r=e.colWidths?.length?`<cols>${e.colWidths.map((e,t)=>`<col min="${t+1}" max="${t+1}" width="${e}" customWidth="1"/>`).join(``)}</cols>`:``;return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${e.freezeRows?`<sheetViews><sheetView workbookViewId="0"><pane ySplit="${e.freezeRows}" topLeftCell="A${e.freezeRows+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`:``}${r}<sheetData>${t}</sheetData></worksheet>`}function c(n){if(n.length===0)throw Error(`至少要有一個工作表`);let a=new Set,c=n.map(e=>o(e.name,a)),l={"[Content_Types].xml":e(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${n.map((e,t)=>`<Override PartName="/xl/worksheets/sheet${t+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join(``)}</Types>`),"_rels/.rels":e(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),"xl/workbook.xml":e(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${c.map((e,t)=>`<sheet name="${i(e)}" sheetId="${t+1}" r:id="rId${t+1}"/>`).join(``)}</sheets></workbook>`),"xl/_rels/workbook.xml.rels":e(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${n.map((e,t)=>`<Relationship Id="rId${t+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${t+1}.xml"/>`).join(``)}<Relationship Id="rId${n.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),"xl/styles.xml":e(r)};return n.forEach((t,n)=>{l[`xl/worksheets/sheet${n+1}.xml`]=e(s(t))}),t(l,{level:6})}function l(e){let t=e=>({v:e,s:`num`}),n=e=>({v:e,s:`emphNum`});return c([{name:`班級總表`,rows:[[{v:`${e.className} ${e.topic} 班級總表`,s:`title`}],[],[`座號`,`姓名`,...e.items,`平均`].map(e=>({v:e,s:`header`})),...e.students.map(e=>[{v:String(e.seat),s:`text`},{v:e.name,s:`text`},...e.values.map(t),t(e.mean)]),[{v:``,s:`emphText`},{v:`班級平均`,s:`emphText`},...e.classMeans.map(n),n(e.classOverall)]],colWidths:[8,14,...e.items.map(()=>14),10],freezeRows:3}])}export{c as buildXlsx,l as classSummaryXlsx,a as colName,o as safeSheetName};