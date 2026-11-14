// As pedras do globo, assentes na esfera em anéis à volta do centro geodésico de Portugal continental.
// Este módulo é partilhado: o script que constrói o modelo (Node) e o desenho no browser geram exatamente
// as mesmas pedras, pela mesma ordem, a partir da mesma semente.
//
// Carta: azimutal equidistante centrada em Portugal, em "px de carta" (K px por radiano). No centro, 1 px de
// carta é 1 px do desenho final (a escala das pedras de assets/campo.svg: fiadas de 12).

export const CENTRO = [-8.1306, 39.6944];   // Vila de Rei
export const K = 654.7;                     // px por radiano ao centro, na vista final
export const FIADA = 12;
export const R0 = 6;                        // raio da pedra do centro
const SEMENTE = 20261026;
const TAU = Math.PI * 2;

export function acaso(seed = SEMENTE) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// quantas pedras leva o anel k: o perímetro do paralelo (na esfera, não na carta) a dividir pela largura de uma pedra
export const pedrasNoAnel = k => { const rm = R0 + (k + 0.5) * FIADA; return Math.max(5, Math.round(TAU * K * Math.sin(rm / K) / 11.9)); };

// aneis: nº de pedras por anel (vem do modelo, para o browser não ter de o recalcular).
// quer(i): opcional; diz se a pedra i interessa. As outras não se calculam, mas gastam os mesmos números do
// acaso, para a sequência (e portanto todas as outras pedras) sair exatamente igual.
// Devolve as pedras em vetores planos: vértices (vx, vy) em px de carta, início dos vértices de cada pedra
// (ini[i] a ini[i + 1]), centro, anel e tom (0 a 4; o 0 pesa a dobrar, como nos SVG da marca).
export function gerarPedras(aneis, quer) {
  const rnd = acaso();
  let total = 1; for (let k = 0; k < aneis.length; k++) total += aneis[k];
  const ini = new Uint32Array(total + 1), cx = new Float32Array(total), cy = new Float32Array(total);
  const anel = new Uint16Array(total), tom = new Uint8Array(total);
  let cap = total * 4 + 4096, vx = new Float32Array(cap), vy = new Float32Array(cap), nv = 0;
  const cabe = m => { if (nv + m > cap) { cap = Math.ceil((cap + m) * 1.3); const a = new Float32Array(cap), b = new Float32Array(cap); a.set(vx); b.set(vy); vx = a; vy = b; } };
  const tira = () => { const x = rnd() * 6; return x < 2 ? 0 : 1 + Math.min(3, Math.floor(x - 2)); };
  // a pedra do centro
  for (let i = 0; i < 7; i++) { const t = i / 7 * TAU + 0.3, r = R0 - 1.4 + rnd() * 0.7; vx[nv] = r * Math.cos(t); vy[nv++] = r * Math.sin(t); }
  tom[0] = tira(); ini[1] = nv;
  let p = 1;
  const w = new Float64Array(Math.max(...aneis, 1));
  for (let k = 0; k < aneis.length; k++) {
    const n = aneis[k], rin = R0 + k * FIADA, a = rin + 0.55, b = rin + FIADA - 0.55, rm = (a + b) / 2;
    const sc = Math.max(Math.sin(rm / K) * K, 1e-3);          // raio do paralelo na esfera, em px
    let tot = 0; for (let i = 0; i < n; i++) { w[i] = 0.64 + rnd() * 0.66; tot += w[i]; }
    let th = rnd() * TAU;
    for (let i = 0; i < n; i++, p++) {
      const dth = w[i] / tot * TAU;
      anel[p] = k + 1;
      if (quer && !quer(p)) { for (let q = 0; q < 8; q++) rnd(); tom[p] = tira(); ini[p + 1] = nv; th += dth; continue; }
      const g = 0.55 / sc, t0 = th + g, t1 = th + dth - g;
      const sub = dth > 0.24 ? Math.ceil(dth / 0.2) : 1;       // perto do centro o arco leva mais vértices
      cabe(2 * sub + 2);
      // lado de dentro (de t0 a t1) e depois lado de fora (de t1 a t0); só os cantos levam um nada de acaso
      for (let lado = 0; lado < 2; lado++) for (let s = 0; s <= sub; s++) {
        const f = (lado ? sub - s : s) / sub, canto = s === 0 || s === sub;
        const r = (lado ? b : a) + (canto ? (rnd() - 0.5) * 0.7 : 0), t = t0 + (t1 - t0) * f + (canto ? (rnd() - 0.5) * 1.3 / sc : 0);
        vx[nv] = r * Math.cos(t); vy[nv++] = r * Math.sin(t);
      }
      const tm = th + dth / 2; cx[p] = rm * Math.cos(tm); cy[p] = rm * Math.sin(tm);
      tom[p] = tira(); ini[p + 1] = nv;
      th += dth;
    }
  }
  return { n: total, ini, vx: vx.subarray(0, nv), vy: vy.subarray(0, nv), cx, cy, anel, tom };
}

// ---------------------------------------------------------------- a câmara
// Três vistas: A (ao largo: o Atlântico inteiro, com Portugal na periferia), C (Portugal ao centro do mundo)
// e Z (mais perto, a enquadrar o mar português todo, dos Açores ao continente).
export const VISTAS = { a: { lon: -66, lat: 8, P: 4.4 }, c: { lon: CENTRO[0], lat: CENTRO[1], P: 2 }, z: { lon: -17.5, lat: 37.2, P: 1.33 } };
const rad = Math.PI / 180;
const vec = v => [Math.cos(v.lat * rad) * Math.cos(v.lon * rad), Math.cos(v.lat * rad) * Math.sin(v.lon * rad), Math.sin(v.lat * rad)];
const suave = x => { x = Math.min(1, Math.max(0, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
// de um ponto da esfera a outro pelo caminho mais curto
function entre(a, b, t) {
  const w = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  if (w < 1e-6 || t <= 0) return a; if (t >= 1) return b;
  const s0 = Math.sin((1 - t) * w) / Math.sin(w), s1 = Math.sin(t * w) / Math.sin(w);
  return [a[0] * s0 + b[0] * s1, a[1] * s0 + b[1] * s1, a[2] * s0 + b[2] * s1];
}
const VA = vec(VISTAS.a), VC = vec(VISTAS.c), VZ = vec(VISTAS.z);

// O estado do globo para um progresso t de 0 a 1:
//   0 a 0,5: o mundo roda e a vista desce, de A para C;   0,44 a 0,78: o mar tinge-se de vinho (maré de 0 a 1);
//   0,74 a 1: a vista aproxima-se, de C para Z.
export function estado(t) {
  const r = suave(t / 0.5), z = suave((t - 0.74) / 0.26);
  return { centro: entre(entre(VA, VC, r), VZ, z), P: VISTAS.a.P + (VISTAS.c.P - VISTAS.a.P) * r + (VISTAS.z.P - VISTAS.c.P) * z, mare: Math.min(1, Math.max(0, (t - 0.44) / 0.34)) };
}
