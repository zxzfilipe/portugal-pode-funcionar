// Verifica o site construído em dist/ num browser a sério (o Chrome instalado), em vários ecrãs.
// Uso: node scripts/verificar.mjs [--rapido]      Capturas em verificacao/.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { servir } from './servir.mjs';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = 'verificacao';
const rapido = process.argv.includes('--rapido');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const { srv, url } = await servir('dist');
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] });
const falhas = [], avisos = [];
const falha = (onde, o_que) => { falhas.push(`${onde}: ${o_que}`); };
const espera = ms => new Promise(r => setTimeout(r, ms));
const linhas = fs.readFileSync('src/content/manifesto.txt', 'utf8').split('\n').map(l => l.trim().replace(/^#+\s+(\d+\.\s+)?/, '')).filter(Boolean);

async function abrir(nome, { w, h, dpr = 1, movel = false, calmo = false, js = true, semWebgl = false, caminho = '/' }) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: movel, hasTouch: movel });
  if (calmo) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (!js) await p.setJavaScriptEnabled(false);
  if (semWebgl) await p.evaluateOnNewDocument(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; });
  p.on('console', m => { if (m.type() === 'error') { if (!(caminho !== '/' && /404/.test(m.text()))) falha(nome, 'consola: ' + m.text()); } else if (m.type() === 'warning') avisos.push(`${nome}: ${m.text()}`); });
  p.on('pageerror', e => falha(nome, 'erro de script: ' + e.message));
  p.on('requestfailed', r => { if (js) falha(nome, 'pedido falhou: ' + r.url()); });
  p.on('response', r => { if (r.status() >= 400 && !(caminho !== '/' && r.url().endsWith(caminho))) falha(nome, `${r.status()} ${r.url()}`); });
  await p.goto(url + caminho, { waitUntil: 'networkidle0' });
  if (js) { await p.evaluate(() => document.fonts.ready); if (caminho === '/') await p.waitForFunction(() => document.documentElement.dataset.globo, { timeout: 15000 }).catch(() => falha(nome, 'o globo não arrancou')); await espera(1900); }
  return p;
}
const medidas = p => p.evaluate(() => {
  const s = document.querySelector('.abertura'), cs = s ? getComputedStyle(s) : null;
  return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, total: document.documentElement.scrollHeight, globo: document.documentElement.dataset.globo || '',
    cena: !!s && s.classList.contains('abertura--cena'), percurso: cs ? parseFloat(cs.getPropertyValue('--percurso')) || 0 : 0, topo: cs ? parseFloat(cs.getPropertyValue('--palco-top')) || 0 : 0,
    imgs: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src) };
});

// ---------------------------------------------------------------- 1. cada ecrã: sem transbordo, sem erros, a cena a correr
const ECRAS = [
  { nome: 'computador-1440', w: 1440, h: 900 }, { nome: 'portatil-1280', w: 1280, h: 720 }, { nome: 'grande-1920', w: 1920, h: 1080 },
  { nome: 'tablet-820', w: 820, h: 1180, movel: true }, { nome: 'tablet-deitado-1024', w: 1024, h: 768, movel: true },
  { nome: 'telemovel-390', w: 390, h: 844, dpr: 2, movel: true }, { nome: 'telemovel-360', w: 360, h: 640, dpr: 2, movel: true }, { nome: 'telemovel-320', w: 320, h: 568, dpr: 2, movel: true },
].filter(e => !rapido || ['computador-1440', 'telemovel-390'].includes(e.nome));
for (const e of ECRAS) {
  const p = await abrir(e.nome, e), m = await medidas(p);
  if (m.sw > m.iw + 1) falha(e.nome, `a página transborda para o lado (${m.sw} px num ecrã de ${m.iw})`);
  if (m.imgs.length) falha(e.nome, 'imagens por carregar: ' + m.imgs.join(', '));
  if (m.globo !== 'vivo' || !m.cena) falha(e.nome, `o globo devia estar vivo e a cena montada (globo: ${m.globo}, cena: ${m.cena})`);
  await p.screenshot({ path: `${OUT}/${e.nome}-0-chegada.png` });
  for (const [k, t] of [['1-centro', 0.5], ['2-mare', 0.64], ['3-fim', 1]]) {
    await p.evaluate(y => scrollTo(0, y), Math.round(-m.topo + t * m.percurso)); await espera(1300);
    await p.screenshot({ path: `${OUT}/${e.nome}-${k}.png` });
  }
  // a legenda da ZEE tem de estar à vista no fim da cena
  const leg = await p.evaluate(() => { const l = document.querySelector('.abertura__legenda'), r = l.getBoundingClientRect(); return { op: +getComputedStyle(l).opacity, dentro: r.top >= 0 && r.bottom <= innerHeight }; });
  if (leg.op < 0.95) falha(e.nome, `no fim da cena a legenda devia estar opaca (opacidade ${leg.op})`);
  if (!leg.dentro) avisos.push(`${e.nome}: no fim da cena a legenda da ZEE fica fora do ecrã (ecrã baixo)`);
  // o resto da página, de uma vez (em px reais 1:1 para caber numa imagem)
  if (e.dpr && e.dpr > 1) await p.setViewport({ width: e.w, height: e.h, deviceScaleFactor: 1, isMobile: !!e.movel, hasTouch: !!e.movel });
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await espera(900);
  const total = (await medidas(p)).total, ini = Math.round(-m.topo + m.percurso);
  for (let y = ini, i = 0; y < total; y += 12000, i++) await p.screenshot({ path: `${OUT}/${e.nome}-pagina-${i}.jpg`, type: 'jpeg', quality: 72, clip: { x: 0, y, width: e.w, height: Math.min(12000, total - y) }, captureBeyondViewport: true });
  await p.close();
  console.log(`  ${e.nome}: ${m.iw}x${m.ih}, página de ${total} px, cena de ${m.percurso} px`);
}

// ---------------------------------------------------------------- 2. conteúdo, ligações e estrutura (num ecrã de computador)
{
  const p = await abrir('conteudo', { w: 1440, h: 900 });
  const d = await p.evaluate(() => ({
    texto: document.querySelector('main').innerText.replace(/\s+/g, ' '), tudo: document.body.innerText,
    h1: [...document.querySelectorAll('h1')].map(h => h.textContent), niveis: [...document.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1]),
    lang: document.documentElement.lang, titulo: document.title, desc: document.querySelector('meta[name=description]')?.content || '',
    og: document.querySelector('meta[property="og:image"]')?.content || '', canon: document.querySelector('link[rel=canonical]')?.href || '',
    ancoras: [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.getElementById(h.slice(1))),
    semNome: [...document.querySelectorAll('a,button')].filter(a => !(a.innerText || a.getAttribute('aria-label') || '').trim()).length,
    semAlt: [...document.images].filter(i => !i.hasAttribute('alt')).length,
    externos: [...document.querySelectorAll('a[href^="http"]')].map(a => a.href),
    cartoes: document.querySelectorAll('.pilar-card').length, pilares: document.querySelectorAll('section.pilar').length,
  }));
  let pos = 0;
  for (const t of linhas) { const k = d.texto.indexOf(t, pos); if (k < 0) falha('conteudo', 'falta ou está fora de ordem: ' + t.slice(0, 60)); else pos = k + (t.length > 40 ? t.length : 0); }
  if (/[‒-―]/.test(d.tudo)) falha('conteudo', 'há travessões no texto');
  if (d.h1.length !== 1) falha('conteudo', `devia haver um só h1 (há ${d.h1.length})`);
  for (let i = 1; i < d.niveis.length; i++) if (d.niveis[i] > d.niveis[i - 1] + 1) falha('conteudo', `os títulos saltam de nível (h${d.niveis[i - 1]} para h${d.niveis[i]})`);
  if (d.lang !== 'pt-PT') falha('conteudo', 'lang devia ser pt-PT');
  if (!d.titulo || !d.desc || d.titulo === d.desc) falha('conteudo', 'título ou descrição em falta');
  if (d.ancoras.length) falha('conteudo', 'ligações internas sem destino: ' + d.ancoras.join(', '));
  if (d.semNome) falha('conteudo', `${d.semNome} ligações sem nome`);
  if (d.semAlt) falha('conteudo', `${d.semAlt} imagens sem alt`);
  if (d.cartoes !== 8 || d.pilares !== 8) falha('conteudo', `deviam ser 8 cartões e 8 pilares (há ${d.cartoes} e ${d.pilares})`);
  for (const f of ['share.jpg', 'favicon.svg', 'apple-touch-icon.png', 'robots.txt', 'sitemap.xml', 'CNAME']) if (!fs.existsSync(path.join('dist', f))) falha('conteudo', 'falta dist/' + f);
  // clicar num pilar do índice leva a essa parte da página
  for (const n of [1, 5, 8]) {
    await p.evaluate(n => document.querySelector(`.pilar-card[href="#pilar-${n}"]`).click(), n); await espera(900);
    const r = await p.evaluate(n => ({ top: Math.round(document.getElementById('pilar-' + n).getBoundingClientRect().top), hash: location.hash }), n);
    if (Math.abs(r.top) > 4 || r.hash !== '#pilar-' + n) falha('conteudo', `clicar no pilar ${n} não levou à secção (ficou a ${r.top} px, ${r.hash})`);
  }
  // as palavras de "O país que queremos" acendem-se todas quando lá se chega
  await p.evaluate(() => document.getElementById('o-pais-que-queremos').scrollIntoView()); await espera(700);
  await p.evaluate(() => scrollBy(0, innerHeight * 0.5)); await espera(700);
  const ac = await p.evaluate(() => { const ws = document.querySelectorAll('[data-acende] .w'); return { n: ws.length, on: [...ws].filter(w => w.classList.contains('on')).length }; });
  if (!ac.n || ac.on !== ac.n) falha('conteudo', `as palavras do fim não se acenderam todas (${ac.on} de ${ac.n})`);
  await p.screenshot({ path: `${OUT}/fim.png` });
  console.log(`  conteúdo: ${linhas.length} linhas do manifesto pela ordem, ${d.cartoes} cartões, ligações externas: ${d.externos.join(' ')}`);
  await p.close();
}

// ---------------------------------------------------------------- 3. sem movimento, sem JavaScript, sem WebGL, endereços antigos e página perdida
{
  let p = await abrir('reduzir-movimento', { w: 1440, h: 900, calmo: true }), m = await medidas(p);
  if (m.cena || m.globo !== 'calmo') falha('reduzir-movimento', `não devia haver cena (globo: ${m.globo})`);
  await p.screenshot({ path: `${OUT}/reduzir-movimento.png` }); await p.close();
  p = await abrir('sem-javascript', { w: 1440, h: 900, js: false });
  const sj = await p.evaluate(() => ({ imgs: document.querySelectorAll('.globo__fixo').length, texto: document.body.innerText.length }));
  if (sj.imgs !== 2 || sj.texto < 20000) falha('sem-javascript', 'sem JavaScript devia ver-se o globo fixo e o texto todo');
  await p.screenshot({ path: `${OUT}/sem-javascript.png` }); await p.close();
  p = await abrir('sem-webgl', { w: 390, h: 844, dpr: 2, movel: true, semWebgl: true }); m = await medidas(p);
  if (m.globo !== 'fixo' || m.cena) falha('sem-webgl', `sem WebGL devia ficar o globo fixo (globo: ${m.globo})`);
  await p.screenshot({ path: `${OUT}/sem-webgl.png` }); await p.close();
  p = await abrir('pilar-antigo', { w: 1440, h: 900, caminho: '/pilar/3/' }); await espera(600);
  if (!(await p.url()).endsWith('/#pilar-3')) falha('pilar-antigo', '/pilar/3/ devia levar a /#pilar-3, ficou em ' + p.url());
  await p.close();
  p = await abrir('perdida', { w: 1440, h: 900, caminho: '/nao-existe' });
  if (!(await p.evaluate(() => document.body.innerText)).includes('Esta página não existe')) falha('perdida', 'a página 404 não apareceu');
  await p.screenshot({ path: `${OUT}/perdida.png` }); await p.close();
  console.log('  reduzir movimento, sem JavaScript, sem WebGL, /pilar/3/ e página perdida: vistos');
}

// ---------------------------------------------------------------- 4. peso e rapidez da chegada
{
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.setCacheEnabled(false);
  const cdp = await p.createCDPSession(); await cdp.send('Network.enable');
  const pesos = new Map(); cdp.on('Network.responseReceived', e => pesos.set(e.requestId, { url: e.response.url, n: 0 })); cdp.on('Network.loadingFinished', e => { const r = pesos.get(e.requestId); if (r) r.n = e.encodedDataLength; });
  await p.evaluateOnNewDocument(() => { window.__lcp = 0; window.__cls = 0;
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
  await p.goto(url + '/', { waitUntil: 'networkidle0' }); await espera(2500);
  const v = await p.evaluate(() => ({ lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(4) }));
  const lista = [...pesos.values()].sort((a, c) => c.n - a.n), bruto = lista.reduce((s, r) => s + r.n, 0);
  console.log(`  chegada (telemóvel, comprimido como no GitHub Pages): ${lista.length} pedidos, ${(bruto / 1024).toFixed(0)} KB; LCP ${v.lcp} ms; CLS ${v.cls}`);
  for (const r of lista.slice(0, 6)) console.log(`     ${(r.n / 1024).toFixed(0).padStart(5)} KB  ${r.url.replace(url, '')}`);
  if (v.cls > 0.1) falha('rapidez', `a página salta ao carregar (CLS ${v.cls})`);
  await p.close();
}

await b.close(); srv.close();
for (const a of [...new Set(avisos)]) console.log('  aviso: ' + a);
if (falhas.length) { console.log(`\n${falhas.length} FALHAS:`); for (const f of [...new Set(falhas)]) console.log('  ✗ ' + f); process.exit(1); }
console.log('\ntudo certo. Capturas em ' + OUT + '/');
