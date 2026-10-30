import fs from 'node:fs';
const [,, file, ...keys] = process.argv;
const h = fs.readFileSync(file,'utf8');
const figs = h.match(/<figure class="fig"[\s\S]*?<\/figure>/g)||[];
for (const f of figs) {
  const cap=(f.match(/<figcaption[^>]*><b>([^<]*)<\/b>/)||[])[1]||'';
  if (keys.length && !keys.some(k=>cap.startsWith(k+' '))) continue;
  const body=f.replace(/<figcaption[\s\S]*<\/figcaption>/,'').replace(/<svg[\s\S]*?<\/svg>/g,'').replace(/<[^>]+>/g,'|').replace(/\|+/g,'|').replace(/\s+/g,' ');
  console.log('### '+cap+'\n'+body+'\n');
}
