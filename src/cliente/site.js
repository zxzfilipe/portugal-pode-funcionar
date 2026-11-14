// O que o site faz no browser: o globo conduzido pelo scroll e as palavras que se acendem no fim.
import { criarGlobo } from '../globo/globo.js';
import { estado } from '../globo/pedras.js';

const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- o globo
(async function globo() {
  const sec = document.querySelector('.abertura'), tela = sec && sec.querySelector('.globo__tela');
  if (!tela) return;
  const palco = sec.querySelector('.abertura__palco'), fig = sec.querySelector('.globo');
  // sem WebGL (ou se o modelo não chegar) fica o globo fixo, o mesmo que se vê sem JavaScript
  const marca = m => document.documentElement.setAttribute('data-globo', m);
  const fixo = () => { marca('fixo'); tela.remove(); fig.insertAdjacentHTML('beforeend', '<img class="globo__fixo" src="/assets/globo-base.svg" alt=""><img class="globo__fixo" src="/assets/globo-zee.svg" alt="">'); };
  let g = null;
  try { g = await criarGlobo(tela, await (await fetch(tela.dataset.modelo)).json()); } catch (e) { /* fica o fixo */ }
  if (!g) return fixo();

  // com "reduzir movimento": Portugal ao centro e a ZEE a vinho, sem cena
  if (calmo) { marca('calmo'); g.desenha(estado(0.8)); addEventListener('resize', () => g.desenha()); return; }

  // a cena: o palco fica preso ao ecrã ao longo de `percurso` px de scroll, e o progresso (0 a 1) conduz o globo
  let percurso = 1, topo = 0, alvo = 0, atual = 0, raf = 0, antes = 0, largura = 0, altura = 0;
  let inicio = 0;                                                          // o relógio da chegada começa na primeira imagem desenhada
  const sonda = document.createElement('div'); sonda.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;visibility:hidden;pointer-events:none';
  sonda.style.height = '100lvh'; document.body.append(sonda);
  const ondas = sec.querySelector('.pedra--ondas'), titulo = sec.querySelector('.pedra--titulo');
  function medir() {
    largura = innerWidth; altura = sonda.offsetHeight || innerHeight;      // a altura do ecrã com as barras do browser recolhidas
    const h = palco.offsetHeight;
    percurso = Math.round(altura * (largura < 900 ? 1.05 : 1.15));
    // se o palco não cabe no ecrã, prende-se pela base; mas nunca corta mais do que as ondas e a margem do título
    topo = Math.max(Math.min(0, altura - h), -(ondas.offsetHeight + titulo.offsetHeight * 0.05));
    sec.style.setProperty('--palco-h', h + 'px'); sec.style.setProperty('--percurso', percurso + 'px'); sec.style.setProperty('--palco-top', Math.round(topo) + 'px');
    sec.classList.add('abertura--cena');
    ler(); pedir();
  }
  function ler() { alvo = Math.min(1, Math.max(0, (-sec.getBoundingClientRect().top + topo) / percurso)); }
  function quadro(agora) {
    raf = 0;
    if (!inicio) inicio = agora;
    const dt = Math.min(64, agora - antes || 16); antes = agora;
    atual += (alvo - atual) * (1 - Math.exp(-dt / 65));                   // o globo segue o scroll com um nada de inércia
    if (Math.abs(alvo - atual) < 0.0004) atual = alvo;
    const a = Math.min(1, (agora - inicio) / 1600), e = estado(atual);
    e.assentar = 1 - Math.pow(1 - a, 3);                                   // à chegada, as pedras assentam de Portugal para fora
    g.desenha(e);
    sec.style.setProperty('--mare', e.mare.toFixed(3)); sec.style.setProperty('--t', atual.toFixed(3));
    if (atual !== alvo || a < 1) pedir();
  }
  function pedir() { if (!raf) raf = requestAnimationFrame(quadro); }
  addEventListener('scroll', () => { ler(); pedir(); }, { passive: true });
  // as barras do browser no telemóvel mudam a altura a meio do scroll: só se volta a medir se a largura mudar
  // (ou a altura mudar muito, como ao rodar o ecrã)
  addEventListener('resize', () => { if (innerWidth !== largura || Math.abs((sonda.offsetHeight || innerHeight) - altura) > 140) medir(); else { g.medir(); pedir(); } });
  // o palco muda de altura quando as fontes chegam: volta a medir
  if (window.ResizeObserver) new ResizeObserver(() => { if (palco.offsetHeight !== parseFloat(sec.style.getPropertyValue('--palco-h'))) medir(); }).observe(palco);
  medir(); marca('vivo');
})();

// ---------------------------------------------------------------- "O país que queremos": as palavras acendem-se com o scroll
(function acende() {
  const p = document.querySelector('[data-acende]');
  if (!p || calmo) return;
  const nos = [], percorre = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  while (percorre.nextNode()) nos.push(percorre.currentNode);
  for (const no of nos) {
    const frag = document.createDocumentFragment();
    for (const parte of no.nodeValue.split(/(\s+)/)) {
      if (!parte) continue;
      if (/^\s+$/.test(parte)) { frag.append(parte); continue; }
      const s = document.createElement('span'); s.className = 'w'; s.textContent = parte; frag.append(s);
    }
    no.replaceWith(frag);
  }
  const ws = p.querySelectorAll('.w');
  p.classList.add('acende');
  let raf = 0;
  const atualiza = () => {
    raf = 0;
    const r = p.getBoundingClientRect(), vh = innerHeight, k = Math.round((vh * 0.88 - r.top) / (r.height + vh * 0.4) * ws.length);
    ws.forEach((w, i) => w.classList.toggle('on', i < k));
  };
  const pedir = () => { if (!raf) raf = requestAnimationFrame(atualiza); };
  addEventListener('scroll', pedir, { passive: true }); addEventListener('resize', pedir);
  atualiza();
})();

