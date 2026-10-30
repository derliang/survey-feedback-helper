import fs from 'node:fs';
const pages = JSON.parse(fs.readFileSync('pages.json','utf8'));
for (const p of pages) {
  if (!p.frag) continue;
  const h = fs.readFileSync(p.frag,'utf8');
  const figs = h.match(/<figure class="fig"[\s\S]*?<\/figure>/g)||[];
  console.log('## '+p.id+' '+p.title+' ('+figs.length+')');
  figs.forEach(f=>{const m=f.match(/data-w="(\d+)" data-h="(\d+)"/);const c=(f.match(/<figcaption[^>]*><b>([^<]*)<\/b>([^<]*)/)||[]);console.log('  '+(m?m[1]+'x'+m[2]:'')+' '+c[1]+' '+(c[2]||'').slice(0,50));});
}
