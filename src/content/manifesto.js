// O texto vem tal e qual de manifesto.txt: nada é alterado, resumido ou reordenado.
import fonte from './manifesto.txt?raw';
import marca from './MARCA.md?raw';

const secs = [];
let cur = null;
let sub = null;
for (const raw of fonte.replace(/\r\n/g, '\n').split('\n')) {
  const l = raw.trim();
  if (!l) continue;
  if (l.startsWith('## ')) { cur = { title: l.slice(3), intro: [], subs: [] }; secs.push(cur); sub = null; continue; }
  if (l.startsWith('### ')) { sub = { title: l.slice(4), paras: [] }; cur.subs.push(sub); continue; }
  (sub ? sub.paras : cur.intro).push(l);
}

// resumos dos pilares: texto do autor, da versão para partilhar (MARCA.md)
const resumos = [...marca.matchAll(/^(\d)\.\s+(.+)$/gm)].map(m => m[2]);

// Para onde o formulário "Acreditas na visão?" envia o nome e o email (por exemplo um endereço do Formspree).
// Vazio: o formulário não aparece no site.
export const formulario = '';

export const subtitulo = 'Um país do futuro precisa de instituições do futuro.';
export const autor = 'Filipe Ferreira';
export const data = '26 de outubro de 2026';

export const aoQueVimos = secs[0];
export const final = secs[secs.length - 1];
export const pilares = secs.slice(1, -1).map((s, i) => {
  const m = s.title.match(/^(\d+)\.\s+(.*)$/);
  const n = Number(m[1]);
  return { ...s, n, nome: m[2], href: `/pilar/${n}/`, resumo: resumos[i] };
});

export const slug = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

if (aoQueVimos.title !== 'Ao que vimos' || final.title !== 'O país que queremos' || pilares.length !== 8) {
  throw new Error('manifesto.txt: estrutura inesperada');
}
