// Escreve os caminhos de um SVG de pedras em coordenadas relativas (m dx dy l dx dy ... z), sem mudar o desenho:
// os números ficam mais curtos e repetem-se mais, e o ficheiro comprimido sai muito mais leve.
// Só mexe em caminhos feitos de polígonos fechados (M x y L x y ... Z), com uma casa decimal.

const num = v => { let s = (Math.round(v * 10) / 10).toString(); if (s.startsWith('0.')) s = s.slice(1); else if (s.startsWith('-0.')) s = '-' + s.slice(2); return s; };
const r1 = v => Math.round(v * 10) / 10;

export function compacta(d) {
  if (!/^(M[^MZz]+Z)+$/.test(d)) return d;
  let out = '', ox = 0, oy = 0;                          // o ponto corrente (onde o subcaminho anterior começou)
  for (const sub of d.split('Z')) {
    if (!sub) continue;
    const pts = sub.slice(1).split('L').map(t => t.trim().split(/[ ,]+/).map(Number));
    let px = ox, py = oy, ultimo = '';
    pts.forEach((p, i) => {
      for (const [k, v] of [[0, r1(p[0] - px)], [1, r1(p[1] - py)]]) {
        const t = num(v);
        // entre dois números só é preciso espaço se o segundo não começar por "-" nem por "." a seguir a um decimal
        const sep = k === 0 ? (i === 0 ? 'm' : i === 1 ? 'l' : (t.startsWith('-') ? '' : ' ')) : (t.startsWith('-') || (t.startsWith('.') && ultimo.includes('.')) ? '' : ' ');
        out += sep + t; ultimo = t;
      }
      px = r1(p[0]); py = r1(p[1]);
    });
    out += 'z'; ox = r1(pts[0][0]); oy = r1(pts[0][1]);
  }
  return out;
}

// volta a pôr um caminho compactado em absoluto (só para conferir que nada mudou)
export function expande(d) {
  const out = []; let x = 0, y = 0, sx = 0, sy = 0;
  for (const m of d.matchAll(/([mlz])([^mlz]*)/g)) {
    if (m[1] === 'z') { x = sx; y = sy; continue; }
    const ns = (m[2].match(/-?(?:\d+\.?\d*|\.\d+)/g) || []).map(Number);
    for (let i = 0; i < ns.length; i += 2) { x = r1(x + ns[i]); y = r1(y + ns[i + 1]); if (m[1] === 'm' && i === 0) { sx = x; sy = y; } out.push(x, y); }
  }
  return out;
}

export function compactaSvg(svg) {
  return svg.replace(/ d="(M[^"]+)"/g, (tudo, d) => {
    const c = compacta(d);
    if (c !== d) {
      const a = (d.match(/-?\d+\.?\d*/g) || []).map(v => r1(+v)), b = expande(c);
      if (a.length !== b.length || a.some((v, i) => v !== b[i])) throw new Error('a compactação mudou o desenho');
    }
    return ` d="${c}"`;
  });
}
