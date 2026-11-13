// Compõe as faixas de calçada de MARCA.md numa só imagem por secção (a camada de fundo de cada uma).
// Cada ficheiro tem 5 ladrilhos de 960 de largura; a origem do título fica em x = 960.
import fs from 'node:fs';
const A = 'public/assets';
const inner = f => fs.readFileSync(`${A}/${f}.svg`, 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const sym = (id, f, w, h) => `<symbol id="${id}" viewBox="0 0 ${w} ${h}">${inner(f)}</symbol>`;
const uses = (id, w, h, y, n = 5) => Array.from({ length: n }, (_, i) => `<use href="#${id}" x="${i * 960}" y="${y}" width="${w}" height="${h}"/>`).join('');
const svg = (h, defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="4800" height="${h}" viewBox="0 0 4800 ${h}"><defs>${defs}</defs>${body}</svg>\n`;

fs.writeFileSync(`${A}/pedra-hero.svg`, svg(768,
  sym('o', 'ondas', 960, 252) + sym('c', 'campo', 960, 516) + sym('t', 'titulo', 1920, 516),
  uses('o', 960, 252, 0) + uses('c', 960, 516, 252) + '<use href="#t" x="960" y="252" width="1920" height="516"/>'));
fs.writeFileSync(`${A}/pedra-ondas.svg`, svg(252, sym('o', 'ondas', 960, 252), uses('o', 960, 252, 0)));
fs.writeFileSync(`${A}/pedra-calcada.svg`, svg(504, sym('k', 'calcada', 960, 504), uses('k', 960, 504, 0)));
console.log('calçada composta: pedra-hero.svg, pedra-ondas.svg, pedra-calcada.svg');
