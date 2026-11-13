// O globo em calçada: o mundo visto de cima do mar português, com Portugal ao centro.
// As pedras têm a medida e os tons das de assets/campo.svg (fiadas de 12, cinco tons por cor) e assentam em
// anéis à volta do centro. A costa (Natural Earth) e a zona económica exclusiva (Marine Regions) cortam as
// pedras, como um calceteiro as cortaria.
//
// Sai em dois ficheiros que se sobrepõem: globo-base.svg (mar, terra, Portugal) e globo-zee.svg (a ZEE a vinho).
//
// Uso: node scripts/globo.mjs [pasta de saída]        (por omissão public/assets)
// Variáveis para experiências: GLOBO_P, GLOBO_LON, GLOBO_LAT, GLOBO_R, GLOBO_PT=tinta|vinho|claro, GLOBO_FIO=1|0

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { geoPath, geoArea } from 'd3-geo';
import { geoSatellite } from 'd3-geo-projection';
import { feature } from 'topojson-client';
import { compactaSvg } from './compactar.mjs';

const require = createRequire(import.meta.url);
const OUT = path.resolve(process.argv[2] || 'public/assets');
const env = (k, d) => (process.env[k] === undefined ? d : process.env[k]);

// ---------------------------------------------------------------- medidas e cores
const R = +env('GLOBO_R', 390);           // raio do medalhão, em px nativos (a escala das pedras do campo)
const FIADA = 12;                          // passo das fiadas
const RM = R - FIADA;                      // raio do mapa: o último anel é a moldura
const P = +env('GLOBO_P', 2);              // distância do olhar ao centro da Terra, em raios
const CENTRO = [+env('GLOBO_LON', -8.1306), +env('GLOBO_LAT', 39.6944)];   // o centro geodésico de Portugal continental (Vila de Rei)
const PT_COR = env('GLOBO_PT', 'tinta');
const FIO = env('GLOBO_FIO', '1') === '1';
const JUNTA = '#BDB6A6';
const TONS = {
  mar: ['#0E5560', '#0A434C', '#0B4A54', '#0F5A66', '#126572'],     // o primeiro pesa a dobrar, como no campo
  terra: ['#FBFAF6', '#F7F4EC', '#F3EFE6', '#EDE8DC', '#E9E3D5'],
  vinho: ['#7A1F3D', '#5F1830', '#691B34', '#812141', '#922549'],   // o vinho da marca com os mesmos degraus do petróleo
  tinta: ['#141414', '#0C0C0C', '#1B1B1A', '#232321', '#191918'],
};
const PTN = PT_COR === 'vinho' ? 'vinho' : PT_COR === 'claro' ? 'terra' : 'tinta';

// ---------------------------------------------------------------- acaso com semente (o desenho sai sempre igual)
let seed = 20261026;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- geografia
const land50 = require('world-atlas/land-50m.json');
const c10 = require('world-atlas/countries-10m.json');
const land = feature(land50, land50.objects.land);
const portugal = feature(c10, c10.objects.countries).features.find(f => f.id === '620');
const zeeFc = JSON.parse(fs.readFileSync(new URL('./dados/zee-portugal.json', import.meta.url), 'utf8'));
// d3 lê o lado de dentro pelo sentido do anel: o exterior de cada polígono tem de fechar a área pequena.
// Os buracos da ZEE são as ilhas, que a terra cobre por cima: ficam de fora.
const zee = { type: 'MultiPolygon', coordinates: zeeFc.features.flatMap(f => f.geometry.coordinates.map(poly => {
  let ring = poly[0];
  if (geoArea({ type: 'Polygon', coordinates: [ring] }) > 2 * Math.PI) ring = ring.slice().reverse();
  return [ring];
})) };

const projection = geoSatellite().distance(P).tilt(0)
  .rotate([-CENTRO[0], -CENTRO[1], 0])
  .clipAngle(Math.acos(1 / P) * 180 / Math.PI - 0.02)
  .scale(RM / Math.sqrt((P - 1) / (P + 1)))
  .translate([R, R]).precision(0.05);

// os anéis de um objeto geográfico, já em px; tira os pontos a menos de `min` px do anterior
function aneis(geo, min = 0.22) {
  const out = []; let cur = null;
  const ctx = { beginPath() {}, arc() {}, closePath() {}, moveTo(x, y) { cur = [[x, y]]; out.push(cur); },
    lineTo(x, y) { const l = cur[cur.length - 1]; if (Math.hypot(x - l[0], y - l[1]) >= min) cur.push([x, y]); } };
  geoPath(projection, ctx)(geo);
  return out.filter(r => r.length >= 3);
}
// Douglas-Peucker num anel fechado: tira os vértices que não mexem a linha mais do que `tol` px
function simplifica(ring, tol) {
  const n = ring.length; if (n < 8) return ring;
  let far = 0, dmax = -1;
  for (let i = 1; i < n; i++) { const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]); if (d > dmax) { dmax = d; far = i; } }
  const pts = ring.concat([ring[0]]), keep = new Uint8Array(n + 1); keep[0] = keep[far] = keep[n] = 1;
  const stack = [[0, far], [far, n]];
  while (stack.length) {
    const [a, b] = stack.pop(); if (b - a < 2) continue;
    const ax = pts[a][0], ay = pts[a][1], bx = pts[b][0], by = pts[b][1], L = Math.hypot(bx - ax, by - ay) || 1e-9;
    let idx = -1, dm = tol;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L; if (d > dm) { dm = d; idx = i; } }
    if (idx >= 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  const out = []; for (let i = 0; i < n; i++) if (keep[i]) out.push(ring[i]);
  return out.length >= 3 ? out : ring;
}
// Sutherland-Hodgman contra um retângulo [x0, y0, x1, y1]
function recorta(ring, [x0, y0, x1, y1]) {
  const lados = [[p => p[0] >= x0, (a, b) => [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])]], [p => p[0] <= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
    [p => p[1] >= y0, (a, b) => [a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0]], [p => p[1] <= y1, (a, b) => [a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1]]];
  let pts = ring;
  for (const [ok, corta] of lados) {
    const out = [];
    for (let i = 0, n = pts.length; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], ia = ok(a), ib = ok(b); if (ia) out.push(a); if (ia !== ib) out.push(corta(a, b)); }
    pts = out; if (pts.length < 3) return null;
  }
  return pts;
}
const area = r => { let a = 0; for (let i = 0, n = r.length; i < n; i++) { const p = r[i], q = r[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
const f1 = v => (Math.round(v * 10) / 10).toString();
const dAneis = rs => rs.map(r => 'M' + r.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z').join('');

const A = { terra: aneis(land).filter(r => area(r) > 1.2).map(r => simplifica(r, 0.3)), pt: aneis(portugal), zee: aneis(zee).map(r => simplifica(r, 0.2)) };
// Portugal: o continente é o anel grande; as ilhas são pequenas de mais para uma pedra cortada e levam uma pedra cada
const ptCont = A.pt.filter(r => area(r) > 60).map(r => simplifica(r, 0.15));
const ilhas = A.pt.filter(r => area(r) <= 60 && area(r) > 0.12);

// ---------------------------------------------------------------- máscaras (3 células por px): 1 ZEE, 2 terra, 4 Portugal
const S = 3, W = Math.ceil(2 * R * S);
const mask = new Uint8Array(W * W);
function pinta(rs, bit) {
  const rows = Array.from({ length: W }, () => []);
  for (const r of rs) for (let i = 0, n = r.length; i < n; i++) {
    let x0 = r[i][0] * S, y0 = r[i][1] * S, x1 = r[(i + 1) % n][0] * S, y1 = r[(i + 1) % n][1] * S;
    if (y0 === y1) continue;
    if (y0 > y1) { [x0, x1] = [x1, x0]; [y0, y1] = [y1, y0]; }
    for (let y = Math.max(0, Math.ceil(y0 - 0.5)); y < W && y + 0.5 < y1; y++) rows[y].push(x0 + (y + 0.5 - y0) * (x1 - x0) / (y1 - y0));
  }
  for (let y = 0; y < W; y++) {
    const xs = rows[y].sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.max(0, Math.ceil(xs[i] - 0.5)); x < W && x + 0.5 < xs[i + 1]; x++) mask[y * W + x] |= bit;
  }
}
pinta(A.zee, 1); pinta(A.terra, 2); pinta(ptCont, 4);
// classe de uma célula: 3 Portugal, 2 terra, 1 ZEE, 0 mar
const classe = m => (m & 4 ? 3 : m & 2 ? 2 : m & 1 ? 1 : 0);
const classeEm = (x, y) => { const cx = Math.floor(x * S), cy = Math.floor(y * S); return cx < 0 || cy < 0 || cx >= W || cy >= W ? 0 : classe(mask[cy * W + cx]); };

// ---------------------------------------------------------------- pedras em anéis
const pedras = [];
{
  // a pedra do centro
  const c = []; for (let i = 0; i < 7; i++) { const t = i / 7 * Math.PI * 2 + 0.3, r = 4.6 + rnd() * 0.7; c.push([R + r * Math.cos(t), R + r * Math.sin(t)]); }
  pedras.push({ pts: c, r: 0 });
  for (let rin = 6; rin < R - 1; rin += FIADA) {
    const a = rin + 1.05, b = rin + FIADA - 1.05, rm = (a + b) / 2;
    const n = Math.max(5, Math.round(2 * Math.PI * rm / 11.9));
    const w = Array.from({ length: n }, () => 0.64 + rnd() * 0.66), tot = w.reduce((s, v) => s + v, 0);
    let th = rnd() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const dth = w[i] / tot * Math.PI * 2, g = 0.75 / rm;
      const t0 = th + g, t1 = th + dth - g, sub = dth > 0.5 ? 3 : dth > 0.22 ? 2 : 1;   // perto do centro o arco leva mais vértices
      const pts = [];
      const pt = (r, t, canto) => { const jr = canto ? (rnd() - 0.5) * 0.7 : 0, jt = canto ? (rnd() - 0.5) * 1.5 / rm : 0; pts.push([R + (r + jr) * Math.cos(t + jt), R + (r + jr) * Math.sin(t + jt)]); };
      for (let s = 0; s <= sub; s++) pt(a, t0 + (t1 - t0) * s / sub, s === 0 || s === sub);
      for (let s = sub; s >= 0; s--) pt(b, t0 + (t1 - t0) * s / sub, s === 0 || s === sub);
      pedras.push({ pts, r: rm, moldura: rin + FIADA > RM + 1 });
      th += dth;
    }
  }
}

// o tom de cada pedra em cada cor, tirado uma só vez (a mesma pedra sai igual na base e na camada da ZEE).
// O mar clareia para o centro e escurece para a orla, para o disco ganhar volume sem deixar de ser calçada.
function tira(nome, r) {
  const t = Math.min(1, r / RM), pal = TONS[nome];
  let pesos;
  if (nome === 'mar') pesos = [2, 0.55 + 1.5 * t * t, 0.7 + 1.1 * t * t, 1.15 - 0.5 * t, 1.25 - 0.95 * t];
  else if (nome === 'terra') pesos = [2 - 0.9 * t, 1, 1, 0.9 + 0.5 * t, 0.8 + 0.9 * t];
  else pesos = [2, 1, 1, 1, 1];
  let x = rnd() * pesos.reduce((s, v) => s + v, 0);
  for (let i = 0; i < pal.length; i++) { x -= pesos[i]; if (x <= 0) return pal[i]; }
  return pal[0];
}
const tons = p => { p.tom = { mar: tira('mar', p.r), terra: tira('terra', p.r), vinho: tira('vinho', p.r), tinta: tira('tinta', p.r) }; return p; };
pedras.forEach(tons);

// que classes tem cada pedra por baixo (a pedra desenhada leva um traço de 1,3: conta-se um pouco para lá do polígono)
const dentro = (pts, x, y) => { let s = 0; for (let i = 0, n = pts.length; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; const c = (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]); if (c !== 0) { if (s === 0) s = Math.sign(c); else if (Math.sign(c) !== s) return false; } } return true; };
for (const p of pedras) {
  p.cls = [0, 0, 0, 0];
  if (p.moldura) continue;
  const cx = p.pts.reduce((s, q) => s + q[0], 0) / p.pts.length, cy = p.pts.reduce((s, q) => s + q[1], 0) / p.pts.length;
  const larga = p.pts.map(q => [cx + (q[0] - cx) * 1.15, cy + (q[1] - cy) * 1.15]);
  const xs = larga.map(q => q[0]), ys = larga.map(q => q[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs) * S)), x1 = Math.min(W - 1, Math.ceil(Math.max(...xs) * S));
  const y0 = Math.max(0, Math.floor(Math.min(...ys) * S)), y1 = Math.min(W - 1, Math.ceil(Math.max(...ys) * S));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (dentro(larga, (x + 0.5) / S, (y + 0.5) / S)) p.cls[classe(mask[y * W + x])]++;
}
const so = (p, k) => p.cls[k] > 0 && p.cls.every((v, i) => i === k || v === 0);
const mapa = pedras.filter(p => !p.moldura), moldura = pedras.filter(p => p.moldura);

// as ilhas: uma pedrinha cada, um pouco maior do que a ilha para se ver
const pedrasIlhas = ilhas.map(r => {
  const xs = r.map(p => p[0]), ys = r.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const w = Math.max(3.4, (Math.max(...xs) - Math.min(...xs)) * 1.15), h = Math.max(3.4, (Math.max(...ys) - Math.min(...ys)) * 1.15);
  const j = () => (rnd() - 0.5) * 0.7;
  return tons({ pts: [[cx - w / 2 + j(), cy - h / 2 + j()], [cx + w / 2 + j(), cy - h / 2 + j()], [cx + w / 2 + j(), cy + h / 2 + j()], [cx - w / 2 + j(), cy + h / 2 + j()]], r: Math.hypot(cx - R, cy - R) });
});

// o limite marítimo da ZEE: só onde de um lado é ZEE e do outro mar alto (a costa e as linhas entre as três zonas ficam de fora).
// Com fio: uma fiada estreita de pedra clara assente numa cama de junta. Sem fio: só a junta.
const limite = [];   // troços [p, q]
for (const r of A.zee) {
  const pts = r.concat([r[0]]);
  let acc = 0, alvo = 5 + rnd() * 4, ini = pts[0];
  for (let k = 1; k < pts.length; k++) {
    let a = pts[k - 1]; const b = pts[k]; let L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (acc + L >= alvo) {
      const t = (alvo - acc) / L, fim = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      limite.push([ini, fim]);
      ini = fim; a = fim; L = Math.hypot(b[0] - a[0], b[1] - a[1]); acc = 0; alvo = 5 + rnd() * 4;
    }
    acc += L;
  }
}
const LARG = 4.2;
const fioPedras = [], cama = [];
for (const [p, q] of limite) {
  const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); if (L < 2.2) continue;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
  if (Math.hypot(mx - R, my - R) > RM - 3) continue;                       // o que cai na moldura não se desenha
  const c1 = classeEm(mx + nx * 2.2, my + ny * 2.2), c2 = classeEm(mx - nx * 2.2, my - ny * 2.2);
  if (!((c1 === 0 && c2 === 1) || (c1 === 1 && c2 === 0))) continue;       // só ZEE de um lado e mar alto do outro
  cama.push([p, q]);
  const g = 0.75, h = LARG / 2 - 0.65, j = () => (rnd() - 0.5) * 0.5;
  fioPedras.push(tons({ pts: [
    [p[0] + ux * g + nx * h + j(), p[1] + uy * g + ny * h + j()], [q[0] - ux * g + nx * h + j(), q[1] - uy * g + ny * h + j()],
    [q[0] - ux * g - nx * h + j(), q[1] - uy * g - ny * h + j()], [p[0] + ux * g - nx * h + j(), p[1] + uy * g - ny * h + j()]], r: Math.hypot(mx - R, my - R) }));
}
const dCama = cama.map(([p, q]) => `M${f1(p[0])} ${f1(p[1])}L${f1(q[0])} ${f1(q[1])}`).join('');

// ---------------------------------------------------------------- SVG
const dPedra = p => 'M' + p.pts.map(q => f1(q[0]) + ' ' + f1(q[1])).join('L') + 'Z';
// junta as pedras por tom num só caminho cada (como nos SVG da marca)
function camada(lista, nome) {
  const por = new Map();
  for (const p of lista) { const c = p.tom[nome]; por.set(c, (por.get(c) || '') + dPedra(p)); }
  return [...por].map(([c, d]) => `<path fill="${c}" stroke="${c}" d="${d}"/>`).join('');
}
const cab = `<svg xmlns="http://www.w3.org/2000/svg" width="${2 * R}" height="${2 * R}" viewBox="0 0 ${2 * R} ${2 * R}">`;
const g = (inner, clip) => `<g${clip ? ` clip-path="url(#${clip})"` : ''}>${inner}</g>`;
const pedra = inner => `<g stroke-width="1.3" stroke-linejoin="round">${inner}</g>`;
// cada contorno entra uma só vez e serve de recorte e de junta
const defs = (terra, extra = '') => `<defs><path id="T" d="${dAneis(terra)}"/><path id="P" d="${dAneis(ptCont)}"/><path id="Z" d="${dAneis(A.zee)}"/>`
  + `<clipPath id="t"><use href="#T"/></clipPath><clipPath id="p"><use href="#P"/></clipPath><clipPath id="z"><use href="#Z"/></clipPath>`
  + `<clipPath id="m"><circle cx="${R}" cy="${R}" r="${RM + 0.4}"/></clipPath>${extra}</defs>`;
const junta = (id, clip) => `<use href="#${id}" fill="none" stroke="${JUNTA}" stroke-width="1" stroke-linejoin="round"${clip ? ` clip-path="url(#${clip})"` : ''}/>`;

// a base: mar em todo o mapa (a ZEE ainda é mar), terra por cima, Portugal por cima da terra, a moldura clara
const base = cab + defs(A.terra) + `<circle cx="${R}" cy="${R}" r="${R}" fill="${JUNTA}"/>` + pedra(
  camada(mapa.filter(p => p.cls[0] + p.cls[1] > 0), 'mar')
  + g(camada(mapa.filter(p => p.cls[2] > 0 && !so(p, 2)), 'terra'), 't') + camada(mapa.filter(p => so(p, 2)), 'terra')
  + g(camada(mapa.filter(p => p.cls[3] > 0), PTN), 'p')
  + camada(moldura, 'terra')) + junta('T', 'm') + junta('P') + pedra(camada(pedrasIlhas, PTN)) + '</svg>\n';

// a ZEE: as pedras que a tocam, a vinho; por cima delas volta a terra e Portugal, para a costa ficar como na base.
// Só entra a terra à volta da ZEE (recortada por um retângulo com folga), para o ficheiro ficar leve.
const tocaZee = mapa.filter(p => p.cls[1] > 0);
const zx = A.zee.flatMap(r => r.map(p => p[0])), zy = A.zee.flatMap(r => r.map(p => p[1]));
const caixa = [Math.min(...zx) - 30, Math.min(...zy) - 30, Math.max(...zx) + 30, Math.max(...zy) + 30];
const terraPerto = A.terra.map(r => recorta(r, caixa)).filter(Boolean);
const zeeSvg = cab + defs(terraPerto, `<clipPath id="q"><rect x="${f1(caixa[0] + 2)}" y="${f1(caixa[1] + 2)}" width="${f1(caixa[2] - caixa[0] - 4)}" height="${f1(caixa[3] - caixa[1] - 4)}"/></clipPath>`) + pedra(
  g(camada(tocaZee.filter(p => !so(p, 1)), 'vinho'), 'z') + camada(tocaZee.filter(p => so(p, 1)), 'vinho')
  + g(camada(tocaZee.filter(p => p.cls[2] > 0), 'terra'), 't')
  + g(camada(tocaZee.filter(p => p.cls[3] > 0), PTN), 'p'))
  + junta('T', 'q') + junta('P')
  + (FIO ? `<path d="${dCama}" fill="none" stroke="${JUNTA}" stroke-width="${LARG + 1.5}" stroke-linecap="round"/>` + pedra(camada(fioPedras, 'terra'))
         : `<path d="${dCama}" fill="none" stroke="${JUNTA}" stroke-width="1.1" stroke-linecap="round"/>`)
  + pedra(camada(pedrasIlhas, PTN)) + '</svg>\n';

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'globo-base.svg'), compactaSvg(base));
fs.writeFileSync(path.join(OUT, 'globo-zee.svg'), compactaSvg(zeeSvg));
const kb = f => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + ' KB';
console.log(`globo: ${pedras.length} pedras, ${tocaZee.length} na ZEE, ${pedrasIlhas.length} ilhas, ${fioPedras.length} no fio; base ${kb('globo-base.svg')}, zee ${kb('globo-zee.svg')}`);
console.log(`centro ${CENTRO}, P ${P}, 1 px = ${(6371 / (RM / Math.sqrt((P - 1) / (P + 1)))).toFixed(1)} km no centro`);
