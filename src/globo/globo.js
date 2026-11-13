// O globo em calçada, desenhado em WebGL: uma esfera assente em pedra que roda e se aproxima.
// As pedras e a sua cor vêm do modelo (scripts/globo-modelo.mjs); aqui monta-se a esfera uma vez e depois
// só mudam quatro números por imagem (para onde se olha, de que distância, a maré e os anéis assentes).
import earcut from 'earcut';
import { CENTRO, K, FIADA, R0, gerarPedras } from './pedras.js';

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const TONS = [
  ['#0E5560', '#0A434C', '#0B4A54', '#0F5A66', '#126572'],   // 0 mar
  ['#7A1F3D', '#5F1830', '#691B34', '#812141', '#922549'],   // 1 ZEE, a vinho
  ['#FBFAF6', '#F7F4EC', '#F3EFE6', '#EDE8DC', '#E9E3D5'],   // 2 terra
  ['#141414', '#0C0C0C', '#1B1B1A', '#232321', '#191918'],   // 3 Portugal, a basalto
].map(l => l.map(hex));
const JUNTA = hex('#BDB6A6'), CAMA = hex('#34322E');         // a junta entre pedras; a cama escura por baixo do basalto
const RN = 390, RMN = RN - FIADA;      // raio do medalhão e do mapa, em px nativos (a moldura é a última fiada)
const rad = Math.PI / 180;
const folga = () => new Promise(ok => setTimeout(ok));       // devolve a vez ao browser entre passos, para não o prender

const VS = `
attribute vec3 aPos; attribute vec3 aCorA; attribute vec3 aCorB; attribute vec3 aExtra;   // aExtra: maré, anel, plano
uniform vec3 uP, uE, uN; uniform float uDist, uRaio, uMare;
varying vec3 vCor; varying float vProf; varying vec2 vXY; varying float vAnel;
void main() {
  if (aExtra.z > 0.5) {                                   // a moldura: já em coordenadas de ecrã
    gl_Position = vec4(aPos.x, -aPos.y, 0.0, 1.0); vCor = aCorA; vProf = 9.0; vXY = vec2(0.0); vAnel = -1.0; return;
  }
  float d = dot(aPos, uP);
  float k = uRaio * sqrt((uDist + 1.0) / (uDist - 1.0)) * (uDist - 1.0) / (uDist - d);
  vec2 xy = vec2(dot(aPos, uE), dot(aPos, uN)) * k;
  gl_Position = vec4(xy, 0.0, 1.0);
  vProf = d; vXY = xy / uRaio; vAnel = aExtra.y;
  vCor = uMare >= aExtra.x ? aCorB : aCorA;
}`;
const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float uLim, uAnel;
varying vec3 vCor; varying float vProf; varying vec2 vXY; varying float vAnel;
void main() {
  if (vProf < uLim || vAnel > uAnel) discard;             // para lá do horizonte, ou ainda por assentar
  float r = length(vXY);
  float sombra = vProf > 5.0 ? 0.0 : 0.16 * smoothstep(0.62, 0.92, r) + 0.36 * smoothstep(0.9, 1.0, r);
  gl_FragColor = vec4(mix(vCor, vec3(0.027, 0.176, 0.204), sombra), 1.0);   // a orla escurece: dá volume à esfera
}`;

// Monta o globo. Devolve null se o browser não tiver WebGL (fica então o globo fixo).
export async function criarGlobo(canvas, modelo) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;

  // ---------------------------------------------------------------- 1. as pedras
  const n = modelo.n, cls = new Uint8Array(n);                     // 0 mar, 1 ZEE, 2 terra, 3 Portugal, 4 nunca se vê
  for (let i = 0, p = 0; i < modelo.cls.length; i += 2) { cls.fill(modelo.cls[i], p, p + modelo.cls[i + 1]); p += modelo.cls[i + 1]; }
  // a maré: a distância à costa portuguesa (0 a 1) de cada pedra da ZEE, com um nada de acaso para a frente não ser uma régua
  const mare = new Float32Array(n).fill(-1);
  for (let i = 0; i < modelo.mare.length; i += 2) { const k = modelo.mare[i]; mare[k] = modelo.mare[i + 1] / 255 * 0.9 + ((k * 2654435761 >>> 0) % 97) / 97 * 0.1; }
  const pedras = gerarPedras(modelo.aneis, i => cls[i] !== 4);
  await folga();

  // ---------------------------------------------------------------- 2. da carta para a esfera
  // o referencial de Portugal: leste, norte, para fora
  const l0 = CENTRO[0] * rad, f0 = CENTRO[1] * rad;
  const Ex = -Math.sin(l0), Ey = Math.cos(l0), Nx = -Math.sin(f0) * Math.cos(l0), Ny = -Math.sin(f0) * Math.sin(l0), Nz = Math.cos(f0), Ux = Math.cos(f0) * Math.cos(l0), Uy = Math.cos(f0) * Math.sin(l0), Uz = Math.sin(f0);
  const esfera = (x, y, out, o) => {
    const r = Math.hypot(x, y) || 1e-9, c = r / K, s = Math.sin(c) / r, cc = Math.cos(c), u = x * s, v = -y * s;
    out[o] = Ex * u + Nx * v + Ux * cc; out[o + 1] = Ey * u + Ny * v + Uy * cc; out[o + 2] = Nz * v + Uz * cc;
  };
  const S = new Float32Array(pedras.vx.length * 3);
  for (let i = 0, m = pedras.vx.length; i < m; i++) esfera(pedras.vx[i], pedras.vy[i], S, i * 3);

  // as peças cortadas pela costa e pelo limite da ZEE: [pedra, classe, nº de pontos, pontos x10 relativos ao centro da pedra]
  const pecas = []; let triPecas = 0;
  for (let i = 0, P = modelo.pecas; i < P.length;) {
    const k = P[i], c = P[i + 1], m = P[i + 2]; i += 3;
    const xy = new Float32Array(m * 2);
    for (let j = 0; j < m * 2; j += 2, i += 2) { xy[j] = pedras.cx[k] + P[i] / 10; xy[j + 1] = pedras.cy[k] + P[i + 1] / 10; }
    const tri = earcut(xy); triPecas += tri.length;
    pecas.push({ k, c, xy, tri });
  }
  const camas = (modelo.pt || []).map(anel => { const xy = Float32Array.from(anel, v => v / 10); return { xy, tri: earcut(xy) }; });
  await folga();

  // ---------------------------------------------------------------- 3. os triângulos
  let nTri = 0;
  for (let i = 0; i < n; i++) if (cls[i] !== 4) nTri += pedras.ini[i + 1] - pedras.ini[i] - 2;
  const nMold = Math.round(2 * Math.PI * (RMN + FIADA / 2) / 11.9);
  const nVert = nTri * 3 + triPecas + camas.reduce((s, c) => s + c.tri.length, 0) + (modelo.fio.length + modelo.ilhas.length) / 8 * 12 + nMold * 6;
  const pos = new Float32Array(nVert * 3), cor = new Uint8Array(nVert * 8), ext = new Float32Array(nVert * 3);
  let v = 0;
  const pinta = (a, b, m, anel, plano) => { const o = v * 8; cor[o] = a[0]; cor[o + 1] = a[1]; cor[o + 2] = a[2]; cor[o + 4] = b[0]; cor[o + 5] = b[1]; cor[o + 6] = b[2]; ext[v * 3] = m; ext[v * 3 + 1] = anel; ext[v * 3 + 2] = plano; v++; };
  const deS = (j, a, b, m, anel) => { pos[v * 3] = S[j * 3]; pos[v * 3 + 1] = S[j * 3 + 1]; pos[v * 3 + 2] = S[j * 3 + 2]; pinta(a, b, m, anel, 0); };
  const deXY = (x, y, a, b, m, anel) => { esfera(x, y, pos, v * 3); pinta(a, b, m, anel, 0); };

  // a cama de Portugal continental: entre pedras de basalto a junta é escura, e o país lê-se inteiro
  for (const c of camas) for (const t of c.tri) deXY(c.xy[t * 2], c.xy[t * 2 + 1], CAMA, CAMA, -1, 0);
  // as pedras inteiras, em tira (lado de dentro, lado de fora), para o arco de dentro não sair torto
  for (let i = 0; i < n; i++) {
    if (cls[i] === 4) continue;
    const o = pedras.ini[i], nv = pedras.ini[i + 1] - o, t = pedras.tom[i], an = pedras.anel[i];
    const a = cls[i] === 1 ? TONS[0][t] : TONS[cls[i]][t], b = TONS[cls[i]][t], m = cls[i] === 1 ? mare[i] : -1;
    if (i === 0) { for (let k = 1; k < nv - 1; k++) { deS(o, a, b, m, an); deS(o + k, a, b, m, an); deS(o + k + 1, a, b, m, an); } continue; }
    for (let s = 0, sub = nv / 2 - 1; s < sub; s++) {
      const i0 = o + s, i1 = o + s + 1, o1 = o + nv - 2 - s, o0 = o + nv - 1 - s;
      deS(i0, a, b, m, an); deS(i1, a, b, m, an); deS(o1, a, b, m, an); deS(i0, a, b, m, an); deS(o1, a, b, m, an); deS(o0, a, b, m, an);
    }
  }
  for (const p of pecas) {
    const t = pedras.tom[p.k], a = p.c === 1 ? TONS[0][t] : TONS[p.c][t], b = TONS[p.c][t], m = p.c === 1 ? mare[p.k] : -1, an = pedras.anel[p.k];
    for (const q of p.tri) deXY(p.xy[q * 2], p.xy[q * 2 + 1], a, b, m, an);
  }
  // o fio da ZEE (pedra clara) e as ilhas (uma pedrinha de basalto cada), cada pedra sobre a sua cama de junta
  const pedrinhas = (flat, tons, larga) => {
    for (let q = 0; q < flat.length; q += 8) {
      let mx = 0, my = 0; for (let j = 0; j < 8; j += 2) { mx += flat[q + j] / 40; my += flat[q + j + 1] / 40; }
      const an = Math.max(1, Math.round((Math.hypot(mx, my) - R0) / FIADA) + 1), c = tons[(q / 8) % tons.length];
      for (const [f, tom] of [[larga, JUNTA], [1, c]]) for (const j of [0, 1, 2, 0, 2, 3]) deXY(mx + (flat[q + j * 2] / 10 - mx) * f, my + (flat[q + j * 2 + 1] / 10 - my) * f, tom, tom, -1, an);
    }
  };
  pedrinhas(modelo.fio, [TONS[2][0], TONS[2][1], TONS[2][2]], 1.45);
  pedrinhas(modelo.ilhas, [TONS[3][0]], 1.4);
  // a moldura: uma fiada de pedra clara à volta do disco, fixa no ecrã
  { let s = 99; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const a = (RMN - 0.8) / RN, b = (RN - 0.5) / RN;
    const w = Array.from({ length: nMold }, () => 0.64 + rnd() * 0.66), tot = w.reduce((x, y) => x + y, 0); let th = 0;
    for (let i = 0; i < nMold; i++) {
      const d = w[i] / tot * Math.PI * 2, g = 0.55 / RMN, c = TONS[2][[0, 0, 1, 2, 3, 4][Math.floor(rnd() * 6)]];
      const q = [[a, th + g], [a, th + d - g], [b, th + d - g], [b, th + g]].map(([r, t]) => { const jt = t + (rnd() - 0.5) * 0.004; return [r * Math.cos(jt), r * Math.sin(jt)]; });
      for (const j of [0, 1, 2, 0, 2, 3]) { pos[v * 3] = q[j][0]; pos[v * 3 + 1] = q[j][1]; pos[v * 3 + 2] = 0; pinta(c, c, -1, -1, 1); }
      th += d;
    } }
  await folga();

  // ---------------------------------------------------------------- 4. WebGL
  let loc;
  function montar() {
    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    const atributo = (nome, tam, tipo, norm, passo, desl) => { const l = gl.getAttribLocation(prog, nome); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, tam, tipo, norm, passo, desl); };
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW); atributo('aPos', 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, cor, gl.STATIC_DRAW);
    atributo('aCorA', 3, gl.UNSIGNED_BYTE, true, 8, 0); atributo('aCorB', 3, gl.UNSIGNED_BYTE, true, 8, 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, ext, gl.STATIC_DRAW); atributo('aExtra', 3, gl.FLOAT, false, 0, 0);
    loc = {}; for (const u of ['uP', 'uE', 'uN', 'uDist', 'uRaio', 'uMare', 'uLim', 'uAnel']) loc[u] = gl.getUniformLocation(prog, u);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    return true;
  }
  if (!montar()) return null;

  let lado = 0, ultimo = null;
  function medir() {
    const css = canvas.clientWidth || 780, l = Math.round(css * Math.min(window.devicePixelRatio || 1, 2));
    if (l !== lado && l > 0) { lado = l; canvas.width = canvas.height = l; }
  }
  // centro: vetor unitário do ponto ao centro da vista; P: distância do olhar, em raios;
  // mare: 0 a 1, até onde o vinho já chegou; assentar: 0 a 1, quantos anéis já estão assentes
  function desenha(e = ultimo) {
    if (!e || gl.isContextLost()) return;
    ultimo = e; medir();
    const [px, py, pz] = e.centro, lon = Math.atan2(py, px), lat = Math.asin(Math.max(-1, Math.min(1, pz)));
    gl.viewport(0, 0, lado, lado);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3f(loc.uP, px, py, pz);
    gl.uniform3f(loc.uE, -Math.sin(lon), Math.cos(lon), 0);
    gl.uniform3f(loc.uN, -Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat));
    gl.uniform1f(loc.uDist, e.P); gl.uniform1f(loc.uRaio, RMN / RN); gl.uniform1f(loc.uLim, 1 / e.P);
    gl.uniform1f(loc.uMare, (e.mare ?? 1) * 1.02 - 0.01);
    const a = e.assentar ?? 1; gl.uniform1f(loc.uAnel, a >= 1 ? 1e6 : a * (modelo.aneis.length + 2));
    gl.drawArrays(gl.TRIANGLES, 0, v);
  }
  canvas.addEventListener('webglcontextlost', ev => ev.preventDefault());
  canvas.addEventListener('webglcontextrestored', () => { if (montar()) desenha(); });

  return { desenha, medir, vertices: v };
}
