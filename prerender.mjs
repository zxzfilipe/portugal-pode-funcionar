// Escreve dist/ a partir dos componentes React: HTML estático, com o CSS dentro da página.
// No browser só corre src/cliente/site.js (o globo e as palavras que se acendem).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { render, rotas, redirecionamentos } from './.ssr/entry-server.js';

const OUT = 'dist', SITE = 'https://portugalpodefuncionar.pt';
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync('public', OUT, { recursive: true, filter: f => !f.includes(`${path.sep}_teste`) });

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const css = fs.readFileSync('src/site.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/ ?([{};,]) ?/g, '$1').replace(/;}/g, '}').trim();
const js = fs.readFileSync('.cliente/site.js');
const v = crypto.createHash('sha256').update(js).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(OUT, 'site.js'), js);
const tpl = fs.readFileSync('template.html', 'utf8');
const pagina = ({ title, desc, caminho, corpo, cabeca = '', script = '' }) => tpl
  .replaceAll('%TITLE%', esc(title)).replaceAll('%DESC%', esc(desc)).replaceAll('%PATH%', caminho)
  .replace('%HEAD%', cabeca).replace('%CSS%', () => css).replace('%APP%', () => corpo).replace('%SCRIPT%', script);

const dadosEstruturados = r => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Portugal Pode Funcionar', url: SITE + '/', inLanguage: 'pt-PT',
  description: r.desc, author: { '@type': 'Person', name: 'Filipe Ferreira' }, datePublished: '2026-10-26' })}</script>\n`;
for (const r of rotas) {
  const f = path.join(OUT, r.path, 'index.html');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, pagina({ title: r.title, desc: r.desc, caminho: r.path, corpo: render(r.page),
    cabeca: ['campo', 'titulo-leve', 'ondas'].map(f => `<link rel="preload" href="/assets/${f}.svg" as="image" type="image/svg+xml" fetchpriority="high">\n`).join('')
      + `<link rel="preload" href="/assets/globo.json" as="fetch" crossorigin fetchpriority="low">\n<link rel="modulepreload" href="/site.js?v=${v}">\n${dadosEstruturados(r)}`,
    script: `<script type="module" src="/site.js?v=${v}"></script>\n` }));
}
fs.writeFileSync(path.join(OUT, '404.html'), pagina({ title: 'Página não encontrada: Portugal Pode Funcionar', desc: 'Esta página não existe. O manifesto está todo numa só página.', caminho: '/', corpo: render('perdido'), cabeca: '<meta name="robots" content="noindex">\n' }));

// os endereços antigos de cada pilar (/pilar/1/ ...) levam à secção certa da página única
for (const r of redirecionamentos) {
  const f = path.join(OUT, r.path, 'index.html');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>${esc(r.title)}</title>
<link rel="canonical" href="${SITE}/"><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${r.para}"><script>location.replace(${JSON.stringify(r.para)})</script></head>
<body><p><a href="${r.para}">${esc(r.title)}</a></p></body></html>\n`);
}
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc></url>\n</urlset>\n`);

// verificação: o texto do manifesto entra todo, igual e pela ordem, e não há travessões em lado nenhum
const strip = h => h.replace(/<\/?strong>/g, '').replace(/<(script|style|noscript)[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ');
const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8'), texto = strip(html);
const linhas = fs.readFileSync('src/content/manifesto.txt', 'utf8').split('\n').map(l => l.trim().replace(/^#+\s+(\d+\.\s+)?/, '')).filter(Boolean);
let pos = texto.indexOf('Ao que vimos'), falta = 0;
for (const t of linhas) {
  const k = texto.indexOf(t, pos);
  if (k < 0) { falta++; console.error('FALTA ou FORA DE ORDEM:', t.slice(0, 70)); } else pos = k + (t.length > 40 ? t.length : 0);
}
const trav = (html.match(/[‒-―]/g) || []).length + (fs.readFileSync(path.join(OUT, '404.html'), 'utf8').match(/[‒-―]/g) || []).length;
console.log(`dist/: página única (${(html.length / 1024).toFixed(0)} KB), ${redirecionamentos.length} redirecionamentos; ${linhas.length} linhas do manifesto verificadas; em falta: ${falta}; travessões: ${trav}`);
if (falta || trav) process.exit(1);
