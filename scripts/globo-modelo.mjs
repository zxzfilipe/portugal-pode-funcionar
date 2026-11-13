// Constrói o modelo do globo animado: public/assets/globo.json.
// As pedras assentam na esfera em anéis à volta de Portugal (src/globo/pedras.js). Aqui decide-se a cor de cada
// uma (mar, ZEE, terra, Portugal) e cortam-se pela costa e pelo limite da ZEE as que ficam a meio. O browser
// só tem de rodar a esfera e desenhar.
//
// Dados: Natural Earth (via world-atlas) e Marine Regions (scripts/dados/zee-portugal.json).
// Uso: node scripts/globo-modelo.mjs [ficheiro de saída]

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { geoAzimuthalEquidistant, geoArea } from 'd3-geo';
import { feature } from 'topojson-client';
import { CENTRO, K, FIADA, R0, pedrasNoAnel, gerarPedras, estado, acaso } from '../src/globo/pedras.js';

const require = createRequire(import.meta.url);
const OUT = path.resolve(process.argv[2] || 'public/assets/globo.json');
const rad = Math.PI / 180;
const t0 = Date.now();

// ---------------------------------------------------------------- pedras e o que alguma vez se vê
const ANEIS_MAX = Math.floor((Math.PI * 0.72 * K - R0) / FIADA);          // até 130 graus de Portugal
let aneis = Array.from({ length: ANEIS_MAX }, (_, k) => pedrasNoAnel(k));
let pedras = gerarPedras(aneis);
// o referencial de Portugal na esfera: e (leste), n (norte), u (para fora)
const [l0, f0] = [CENTRO[0] * rad, CENTRO[1] * rad];
const E = [-Math.sin(l0), Math.cos(l0), 0], N = [-Math.sin(f0) * Math.cos(l0), -Math.sin(f0) * Math.sin(l0), Math.cos(f0)], U = [Math.cos(f0) * Math.cos(l0), Math.cos(f0) * Math.sin(l0), Math.sin(f0)];
const naEsfera = (x, y) => { const r = Math.hypot(x, y) || 1e-9, c = r / K, s = Math.sin(c) / r, cc = Math.cos(c); const a = x * s, b = -y * s; return [E[0] * a + N[0] * b + U[0] * cc, E[1] * a + N[1] * b + U[1] * cc, E[2] * a + N[2] * b + U[2] * cc]; };
function visiveis(p) {
  const vis = new Uint8Array(p.n);
  const passos = Array.from({ length: 81 }, (_, i) => estado(i / 80));
  for (let i = 0; i < p.n; i++) {
    const v = naEsfera(p.cx[i], p.cy[i]);
    for (const e of passos) if (v[0] * e.centro[0] + v[1] * e.centro[1] + v[2] * e.centro[2] >= 1 / e.P - 0.035) { vis[i] = 1; break; }
  }
  return vis;
}
let vis = visiveis(pedras);
let ultimo = 0; for (let i = 0; i < pedras.n; i++) if (vis[i]) ultimo = Math.max(ultimo, pedras.anel[i]);
aneis = aneis.slice(0, ultimo); pedras = gerarPedras(aneis); vis = visiveis(pedras);
const RMAX = R0 + aneis.length * FIADA;

// ---------------------------------------------------------------- geografia, na carta
const proj = geoAzimuthalEquidistant().rotate([-CENTRO[0], -CENTRO[1], 0]).scale(K).translate([0, 0]);
const land50 = require('world-atlas/land-50m.json'), c10 = require('world-atlas/countries-10m.json');
const land = feature(land50, land50.objects.land);
const portugal = feature(c10, c10.objects.countries).features.find(f => f.id === '620');
const zeeFc = JSON.parse(fs.readFileSync(new URL('./dados/zee-portugal.json', import.meta.url), 'utf8'));

const area = r => { let a = 0; for (let i = 0, n = r.length; i < n; i++) { const p = r[i], q = r[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
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
// os anéis exteriores de um MultiPolygon, projetados; fora os que caem todos para lá das pedras
function aneisDe(geom, tol, minArea) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates, out = [];
  let buracos = 0;
  for (const poly of polys) {
    buracos += poly.length - 1;
    let ring = poly[0].slice(0, -1).map(p => proj(p)).filter(p => p && isFinite(p[0]) && isFinite(p[1]));
    if (ring.length < 3 || ring.every(p => Math.hypot(p[0], p[1]) > RMAX + 40)) continue;
    ring = simplifica(ring, tol);
    if (Math.abs(area(ring)) >= minArea) out.push(ring);
  }
  return { aneis: out, buracos };
}
const landGeom = { type: 'MultiPolygon', coordinates: (land.features || [land]).flatMap(f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) };
const terra = aneisDe(landGeom, 0.3, 1.2);
const pt = aneisDe(portugal.geometry, 0.15, 0.12);
const zee = aneisDe({ type: 'MultiPolygon', coordinates: zeeFc.features.flatMap(f => f.geometry.coordinates.map(poly => [poly[0]])) }, 0.2, 1);
const ptCont = pt.aneis.filter(r => Math.abs(area(r)) > 60), ilhas = pt.aneis.filter(r => Math.abs(area(r)) <= 60);

// ---------------------------------------------------------------- máscara (2 células por px): 1 ZEE, 2 terra, 4 Portugal
const S = 2, EXT = RMAX + 16, W = Math.ceil(2 * EXT * S);
const mask = new Uint8Array(W * W);
function pinta(rs, bit) {
  const rows = Array.from({ length: W }, () => []);
  for (const r of rs) for (let i = 0, n = r.length; i < n; i++) {
    let x0 = (r[i][0] + EXT) * S, y0 = (r[i][1] + EXT) * S, x1 = (r[(i + 1) % n][0] + EXT) * S, y1 = (r[(i + 1) % n][1] + EXT) * S;
    if (y0 === y1) continue;
    if (y0 > y1) { [x0, x1] = [x1, x0]; [y0, y1] = [y1, y0]; }
    for (let y = Math.max(0, Math.ceil(y0 - 0.5)); y < W && y + 0.5 < y1; y++) rows[y].push(x0 + (y + 0.5 - y0) * (x1 - x0) / (y1 - y0));
  }
  for (let y = 0; y < W; y++) {
    const xs = rows[y].sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.max(0, Math.ceil(xs[i] - 0.5)); x < W && x + 0.5 < xs[i + 1]; x++) mask[y * W + x] |= bit;
  }
}
pinta(zee.aneis, 1); pinta(terra.aneis, 2); pinta(ptCont, 4);
const classe = m => (m & 4 ? 3 : m & 2 ? 2 : m & 1 ? 1 : 0);                 // 3 Portugal, 2 terra, 1 ZEE, 0 mar
const classeEm = (x, y) => { const cx = Math.floor((x + EXT) * S), cy = Math.floor((y + EXT) * S); return cx < 0 || cy < 0 || cx >= W || cy >= W ? 0 : classe(mask[cy * W + cx]); };

// ---------------------------------------------------------------- a cor de cada pedra e as peças cortadas
// os cantos de uma pedra (um quadrilátero convexo: é com ele que se corta)
function cantos(i) {
  const a = pedras.ini[i], nv = pedras.ini[i + 1] - a;
  const idx = i === 0 ? Array.from({ length: nv }, (_, k) => k) : [0, nv / 2 - 1, nv / 2, nv - 1];
  let q = idx.map(k => [pedras.vx[a + k], pedras.vy[a + k]]);
  if (area(q) < 0) q.reverse();
  return q;
}
const dentro = (q, x, y) => { for (let i = 0, n = q.length; i < n; i++) { const p = q[i], r = q[(i + 1) % n]; if ((r[0] - p[0]) * (y - p[1]) - (r[1] - p[1]) * (x - p[0]) < 0) return false; } return true; };
// Sutherland-Hodgman: o anel (qualquer) cortado pela pedra (convexa, no sentido em que a área é positiva)
function corta(subj, q) {
  let out = subj;
  for (let i = 0; i < q.length && out.length; i++) {
    const A = q[i], B = q[(i + 1) % q.length], ex = B[0] - A[0], ey = B[1] - A[1], inp = out; out = [];
    const lado = p => ex * (p[1] - A[1]) - ey * (p[0] - A[0]);
    let P = inp[inp.length - 1], lp = lado(P);
    for (const Q of inp) {
      const lq = lado(Q);
      if ((lp >= 0) !== (lq >= 0)) { const t = lp / (lp - lq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
      if (lq >= 0) out.push(Q);
      P = Q; lp = lq;
    }
  }
  return out;
}
const caixas = rs => rs.map(r => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of r) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return [x0, y0, x1, y1]; });
const REG = { 1: { aneis: zee.aneis, cx: caixas(zee.aneis) }, 2: { aneis: terra.aneis, cx: caixas(terra.aneis) }, 3: { aneis: ptCont, cx: caixas(ptCont) } };

const cls = new Uint8Array(pedras.n).fill(4);          // 4: nunca se vê, não entra
const pecas = [];                                       // [pedra, classe, pontos relativos ao centro da pedra x10]
const temZee = new Uint8Array(pedras.n);
let mistas = 0;
for (let i = 0; i < pedras.n; i++) {
  if (!vis[i]) continue;
  const q = cantos(i), mx = q.reduce((s, p) => s + p[0], 0) / q.length, my = q.reduce((s, p) => s + p[1], 0) / q.length;
  const larga = q.map(p => [mx + (p[0] - mx) * 1.12, my + (p[1] - my) * 1.12]);
  const xs = larga.map(p => p[0]), ys = larga.map(p => p[1]);
  const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
  const n = [0, 0, 0, 0];
  for (let y = Math.floor((by0 + EXT) * S); y <= Math.ceil((by1 + EXT) * S); y++) for (let x = Math.floor((bx0 + EXT) * S); x <= Math.ceil((bx1 + EXT) * S); x++) {
    if (x < 0 || y < 0 || x >= W || y >= W) continue;
    if (dentro(larga, (x + 0.5) / S - EXT, (y + 0.5) / S - EXT)) n[classe(mask[y * W + x])]++;
  }
  const presentes = [0, 1, 2, 3].filter(k => n[k] > 0);
  const base = presentes.length ? presentes[0] : classeEm(mx, my);
  cls[i] = base;
  if (n[1] > 0) temZee[i] = 1;
  if (presentes.length < 2) continue;
  mistas++;
  for (const k of presentes.slice(1)) {
    const reg = REG[k];
    for (let j = 0; j < reg.aneis.length; j++) {
      const c = reg.cx[j]; if (c[0] > bx1 || c[2] < bx0 || c[1] > by1 || c[3] < by0) continue;
      const pc = corta(reg.aneis[j], q);
      if (pc.length < 3 || Math.abs(area(pc)) < 0.7) continue;
      const pts = []; let lx = null, ly = null;
      for (const p of pc) { const X = Math.round((p[0] - pedras.cx[i]) * 10), Y = Math.round((p[1] - pedras.cy[i]) * 10); if (X !== lx || Y !== ly) { pts.push(X, Y); lx = X; ly = Y; } }
      if (pts.length >= 6) pecas.push([i, k, pts]);
    }
  }
}

// ---------------------------------------------------------------- a maré: a que distância da costa portuguesa fica cada pedra da ZEE
const costaPt = [...ptCont.flat(), ...ilhas.flat()];
const mare = []; let dmax = 0;
for (let i = 0; i < pedras.n; i++) if (temZee[i] && cls[i] !== 4) {
  let d = 1e9; for (const p of costaPt) { const dd = Math.hypot(p[0] - pedras.cx[i], p[1] - pedras.cy[i]); if (dd < d) d = dd; }
  mare.push([i, d]); if (d > dmax) dmax = d;
}

// ---------------------------------------------------------------- o fio da ZEE e as ilhas
const rnd = acaso(7);
const fio = [];
for (const r of zee.aneis) {
  const pts = r.concat([r[0]]);
  let acc = 0, alvo = 5 + rnd() * 4, ini = pts[0];
  for (let k = 1; k < pts.length; k++) {
    let a = pts[k - 1]; const b = pts[k]; let L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (acc + L >= alvo) {
      const t = (alvo - acc) / L, fim = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const dx = fim[0] - ini[0], dy = fim[1] - ini[1], D = Math.hypot(dx, dy);
      if (D >= 2.2) {
        const ux = dx / D, uy = dy / D, nx = -uy, ny = ux, mx = (ini[0] + fim[0]) / 2, my = (ini[1] + fim[1]) / 2;
        const c1 = classeEm(mx + nx * 2.2, my + ny * 2.2), c2 = classeEm(mx - nx * 2.2, my - ny * 2.2);
        if ((c1 === 0 && c2 === 1) || (c1 === 1 && c2 === 0)) {              // só ZEE de um lado e mar alto do outro
          const g = 0.6, h = 1.9, j = () => (rnd() - 0.5) * 0.5;
          fio.push([ini[0] + ux * g + nx * h + j(), ini[1] + uy * g + ny * h + j(), fim[0] - ux * g + nx * h + j(), fim[1] - uy * g + ny * h + j(),
            fim[0] - ux * g - nx * h + j(), fim[1] - uy * g - ny * h + j(), ini[0] + ux * g - nx * h + j(), ini[1] + uy * g - ny * h + j()].map(v => Math.round(v * 10)));
        }
      }
      ini = fim; a = fim; L = Math.hypot(b[0] - a[0], b[1] - a[1]); acc = 0; alvo = 5 + rnd() * 4;
    }
    acc += L;
  }
}
const pedrasIlhas = ilhas.map(r => {
  const xs = r.map(p => p[0]), ys = r.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const w = Math.max(3.6, (Math.max(...xs) - Math.min(...xs)) * 1.15), h = Math.max(3.6, (Math.max(...ys) - Math.min(...ys)) * 1.15), j = () => (rnd() - 0.5) * 0.7;
  return [cx - w / 2 + j(), cy - h / 2 + j(), cx + w / 2 + j(), cy - h / 2 + j(), cx + w / 2 + j(), cy + h / 2 + j(), cx - w / 2 + j(), cy + h / 2 + j()].map(v => Math.round(v * 10));
});

// ---------------------------------------------------------------- saída
const rle = []; for (let i = 0; i < cls.length;) { let j = i; while (j < cls.length && cls[j] === cls[i]) j++; rle.push(cls[i], j - i); i = j; }
const modelo = {
  fonte: 'Natural Earth (domínio público); Flanders Marine Institute (2023), Maritime Boundaries Geodatabase v12, marineregions.org, CC BY 4.0',
  aneis, n: pedras.n, cls: rle,
  pecas: pecas.flatMap(([i, k, pts]) => [i, k, pts.length / 2, ...pts]),
  mare: mare.flatMap(([i, d]) => [i, Math.round(d / dmax * 255)]),
  fio: fio.flat(), ilhas: pedrasIlhas.flat(),
  pt: ptCont.map(r => r.flatMap(q => [Math.round(q[0] * 10), Math.round(q[1] * 10)])),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(modelo));
const vistas = vis.reduce((s, v) => s + v, 0);
console.log(`modelo do globo: ${aneis.length} anéis, ${pedras.n} pedras (${vistas} alguma vez à vista), ${mistas} cortadas em ${pecas.length} peças, ${mare.length} na ZEE (até ${(dmax * 6371 / K).toFixed(0)} km da costa), ${fio.length} no fio, ${pedrasIlhas.length} ilhas`);
console.log(`terra: ${terra.aneis.length} anéis, ${terra.aneis.reduce((s, r) => s + r.length, 0)} pontos, ${terra.buracos} buracos ignorados; ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
