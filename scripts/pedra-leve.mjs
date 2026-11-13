// Versões leves de dois SVG da marca, sem mudar o desenho:
//   titulo-leve.svg: só as pedras de titulo.svg que diferem do campo (as letras e as que as contornam). O resto
//                    do campo já está por baixo (campo.svg, com a mesma origem), por isso não precisa de vir duas vezes.
//   tira.svg:        as três últimas fiadas de calcada.svg, que é o que as tiras e separadores mostram.
// Uso: node scripts/pedra-leve.mjs
import fs from 'node:fs';
import { compactaSvg } from './compactar.mjs';
const A = 'public/assets', JUNTA = '#BDB6A6';
fs.mkdirSync(A, { recursive: true });
const ORIG = { titulo: 'marca', calcada: 'marca', campo: 'marca' };   // os originais da marca ficam em marca/; para o site vão versões leves
const ler = f => {
  const s = fs.readFileSync(`${ORIG[f]}/${f}.svg`, 'utf8'), out = [];
  for (const m of s.matchAll(/<path fill="(#[0-9A-Fa-f]+)"[^>]*d="([^"]+)"/g)) for (const d of m[2].split('Z')) if (d.trim()) out.push({ cor: m[1], d: d.trim() + 'Z', pts: d.replace(/^M/, '').split('L').map(t => t.trim().split(/[ ,]+/).map(Number)) });
  return out;
};
const porCor = pedras => { const m = new Map(); for (const p of pedras) m.set(p.cor, (m.get(p.cor) || '') + p.d); return [...m].map(([c, d]) => `<path fill="${c}" stroke="${c}" d="${d}"/>`).join(''); };

// ---- o título: tira as pedras iguais às do campo (nos dois ladrilhos que o título cobre)
const chave = (cor, pts, dx = 0) => cor + '|' + pts.map(q => `${(q[0] + dx).toFixed(1)},${q[1].toFixed(1)}`).join(' ');
const campo = new Map();
for (const p of ler('campo')) for (const dx of [0, 960]) campo.set(chave(p.cor, p.pts, dx), 'M' + p.pts.map(q => `${+(q[0] + dx).toFixed(1)} ${q[1]}`).join('L') + 'Z');
const titulo = ler('titulo'), noTitulo = new Set(titulo.map(p => chave(p.cor, p.pts)));
const proprias = titulo.filter(p => !campo.has(chave(p.cor, p.pts)));
// as pedras do campo que o título substitui: apagam-se (pintam-se de junta) antes de assentar as do título
const apagar = [...campo].filter(([k]) => !noTitulo.has(k)).map(([, d]) => d).join('');
fs.writeFileSync(`${A}/titulo-leve.svg`, compactaSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="516" viewBox="0 0 1920 516">`
  + `<path fill="${JUNTA}" stroke="${JUNTA}" stroke-width="2.4" stroke-linejoin="round" d="${apagar}"/>`
  + `<g stroke-width="1.3" stroke-linejoin="round">${porCor(proprias)}</g></svg>\n`));

// ---- a tira: as últimas fiadas da calçada
const ALT = 36, calcada = ler('calcada').filter(p => Math.max(...p.pts.map(q => q[1])) > 504 - ALT - 2);
fs.writeFileSync(`${A}/tira.svg`, compactaSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${ALT}" viewBox="0 ${504 - ALT} 960 ${ALT}">`
  + `<rect y="${504 - ALT}" width="960" height="${ALT}" fill="${JUNTA}"/><g stroke-width="1.3" stroke-linejoin="round">${porCor(calcada)}</g></svg>\n`));
// ---- o campo e as ondas: os mesmos ficheiros da marca, só com os caminhos escritos de forma mais curta
for (const f of ['campo', 'ondas']) fs.writeFileSync(`${A}/${f}.svg`, compactaSvg(fs.readFileSync(`marca/${f}.svg`, 'utf8')));
const kb = f => (fs.statSync(`${A}/${f}`).size / 1024).toFixed(0) + ' KB';
console.log(`calçada leve: título com ${proprias.length} de ${titulo.length} pedras (${kb('titulo-leve.svg')}), tira ${kb('tira.svg')}, campo ${kb('campo.svg')}, ondas ${kb('ondas.svg')}`);
