// Faz a imagem de partilha (share.jpg, 1200x630) e o ícone para telemóvel (apple-touch-icon.png) a partir do site
// construído: a abertura em calçada com o globo já centrado em Portugal e o mar a vinho.
// Uso: npm run build && node scripts/partilha.mjs      (precisa do Chrome instalado)
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { servir } from './servir.mjs';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { srv, url } = await servir('dist');
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] });
const p = await b.newPage();
// com 758 px de altura, as ondas e o campo ocupam exatamente os 630 de cima (os 128 de baixo são a tira do subtítulo)
await p.setViewport({ width: 1200, height: 758, deviceScaleFactor: 1 });
await p.goto(url + '/', { waitUntil: 'networkidle0' });
await p.evaluate(() => document.fonts.ready);
await p.waitForFunction(() => document.documentElement.dataset.globo === 'vivo', { timeout: 15000 });
const y = await p.evaluate(() => { const s = getComputedStyle(document.querySelector('.abertura')); return Math.round(-parseFloat(s.getPropertyValue('--palco-top')) + 0.985 * parseFloat(s.getPropertyValue('--percurso'))); });
await p.evaluate(y => scrollTo(0, y), y);
await new Promise(r => setTimeout(r, 2600));
// o recorte conta a partir do topo da página, não do ecrã: desce com o scroll
await p.screenshot({ path: 'public/share.jpg', type: 'jpeg', quality: 86, clip: { x: 0, y: await p.evaluate(() => scrollY), width: 1200, height: 630 } });

const i = await b.newPage();
await i.setViewport({ width: 180, height: 180, deviceScaleFactor: 1 });
await i.goto(url + '/favicon.svg', { waitUntil: 'load' });       // o SVG do ícone enche a janela
await i.screenshot({ path: 'public/apple-touch-icon.png', clip: { x: 0, y: 0, width: 180, height: 180 } });
await b.close(); srv.close();
for (const f of ['share.jpg', 'apple-touch-icon.png']) console.log(`public/${f}: ${(fs.statSync('public/' + f).size / 1024).toFixed(0)} KB`);
