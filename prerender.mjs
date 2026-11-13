// Escreve dist/ a partir dos componentes React: uma página HTML por rota, sem React no browser.
import fs from 'node:fs';
import path from 'node:path';
import { render, rotas } from './.ssr/entry-server.js';

const OUT = 'dist';
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync('public', OUT, { recursive: true });
const tpl = fs.readFileSync('template.html', 'utf8');
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const MOMENTO = `<script>document.documentElement.classList.add('mo-js');setTimeout(()=>document.documentElement.classList.add('mo-safe'),2500)</script>
<link rel="modulepreload" href="/assets/moments/moments.js">
<link rel="modulepreload" href="/assets/moments/lib.js">
<link rel="modulepreload" href="/assets/moments/word-highlight/moment.js">
`;
for (const r of rotas) {
  const html = tpl
    .replaceAll('%TITLE%', esc(r.title)).replaceAll('%DESC%', esc(r.desc)).replaceAll('%PATH%', r.path)
    .replace('%EXTRA%', r.page === 'inicio' ? MOMENTO : '')
    .replace('%APP%', () => render(r.page));
  const f = path.join(OUT, r.path, 'index.html');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
}
fs.copyFileSync(path.join(OUT, 'index.html'), path.join(OUT, '404.html'));

// verificação: o texto do manifesto entra todo, igual e pela ordem, e não há travessões
const strip = h => h.replace(/<\/?strong>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ');
const paginas = rotas.map(r => strip(fs.readFileSync(path.join(OUT, r.path, 'index.html'), 'utf8')));
const todo = paginas.join(' ');
const linhas = fs.readFileSync('src/content/manifesto.txt', 'utf8').split('\n').map(l => l.trim().replace(/^#+\s+(\d+\.\s+)?/, '')).filter(Boolean);
const finalIdx = linhas.indexOf('O país que queremos');
let pos = 0, falta = 0;
for (const [i, t] of linhas.entries()) {
  if (i >= finalIdx) { if (!paginas[0].includes(t)) { falta++; console.error('FALTA:', t.slice(0, 70)); } continue; }
  const k = todo.indexOf(t, pos);
  if (k < 0) { falta++; console.error('FALTA ou FORA DE ORDEM:', t.slice(0, 70)); } else pos = k;
}
const trav = paginas.reduce((n, t) => n + (t.match(/[‒-―]/g) || []).length, 0);
console.log(`${rotas.length} páginas em ${OUT}/; ${linhas.length} linhas do manifesto verificadas; em falta: ${falta}; travessões: ${trav}`);
if (falta || trav) process.exit(1);
