import { aoQueVimos, final, pilares, subtitulo, autor, data, slug } from './content/manifesto.js';

const Paras = ({ list, abre = false }) => list.map((t, i) => <p key={i} className={abre && i === 0 ? 'abre' : undefined}>{t}</p>);

function Rodape({ atual = null }) {
  return (
    <footer className="rodape">
      <div className="calcada-tira rodape__tira" aria-hidden="true" style={{ '--tira-x': `${atual ? -137 * atual.n : 0}px` }} />
      <div className="wrap rodape__grelha">
        <div className="rodape__marca">
          <a className="rodape-nome" href="/">Portugal Pode Funcionar</a>
          <p className="rodape__lede">{subtitulo}</p>
        </div>
        <ul className="rodape-lista" aria-label="Os oito pilares">
          {pilares.map(p => (
            <li key={p.n}><a href={p.href} aria-current={p === atual ? 'page' : undefined}>{p.n}. {p.nome}</a></li>
          ))}
        </ul>
        <p className="rodape__legal">© 2026 Portugal Pode Funcionar. {autor}, {data}.</p>
      </div>
    </footer>
  );
}

function Inicio() {
  const [antes, depois] = final.intro[0].split('vai escolher ficar');
  return (
    <>
      <main id="top">
        <section className="hero hero--pedra" data-enter aria-labelledby="hero-h">
          <img className="layer pedra pedra--hero" src="/assets/pedra-hero.svg" alt="" aria-hidden="true" data-enter-media width="4800" height="768" fetchPriority="high" />
          <div className="wrap">
            <div className="hero-text">
              <h1 id="hero-h" className="hero__h1">
                <span className="sr">Portugal Pode Funcionar</span>
              </h1>
              <div className="hero__base">
                <p className="hero__sub">{subtitulo}</p>
                <p className="hero__autor">{autor}<br />{data}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section fluxo" id="ao-que-vimos" aria-labelledby="ao-que-vimos-h">
          <div className="wrap">
            <div className="leitura">
              <h2 id="ao-que-vimos-h">{aoQueVimos.title}</h2>
              <div className="texto"><Paras list={aoQueVimos.intro} abre /></div>
            </div>
          </div>
        </section>

        <section className="section fluxo" id="pilares" aria-labelledby="pilares-h">
          <div className="wrap">
            <div className="section-head"><h2 id="pilares-h">Os oito pilares</h2></div>
            <div className="pilares">
              {pilares.map((p, i) => (
                <a key={p.n} className="pilar-card" href={p.href}>
                  <span className="calcada-tira" aria-hidden="true" style={{ '--tira-x': `${-137 * (i + 1)}px` }} />
                  <span className="pilar-card__corpo">
                    <span className="pilar-n" aria-hidden="true">{p.n}</span>
                    <span><span className="pilar-card__t">{p.nome}</span><span className="pilar-card__r">{p.resumo}</span></span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="section fluxo statement mar" id="o-pais-que-queremos" data-moment="word-highlight" aria-labelledby="futuro-h">
          <img className="layer pedra pedra--mar" src="/assets/pedra-ondas.svg" alt="" aria-hidden="true" width="4800" height="252" loading="lazy" />
          <div className="wrap">
            <div className="leitura">
              <h2 id="futuro-h">{final.title}</h2>
              <p className="mo-wh__text">{antes}<strong>vai escolher ficar</strong>{depois}</p>
            </div>
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}

function Pilar({ n }) {
  const i = n - 1;
  const p = pilares[i];
  const ant = pilares[i - 1];
  const seg = pilares[i + 1];
  return (
    <>
      <header className="topo"><div className="wrap"><a className="topo__nome" href="/">Portugal Pode Funcionar</a></div></header>
      <main id="top">
        <section className="abertura" aria-labelledby="hero-h">
          <div className="wrap">
            <div>
              <p className="pilar-meta">Pilar {n} de 8</p>
              <h1 id="hero-h"><span className="pilar-n">{n}</span><span>{p.nome}</span></h1>
              <p className="hero__lead">{p.resumo}</p>
              {p.subs.length > 0 && (
                <ul className="pilar-indice" aria-label="Neste pilar">
                  {p.subs.map(s => <li key={s.title}><a href={`#${slug(s.title)}`}>{s.title}</a></li>)}
                </ul>
              )}
            </div>
          </div>
          <div className="calcada-tira abertura__chao" aria-hidden="true" style={{ '--tira-x': `${-137 * n}px` }} />
        </section>

        {p.intro.length > 0 && (
          <section className="section fluxo" id="texto" aria-label={p.nome}>
            <div className="wrap">
              <div className="leitura">
                <p className="leitura__marca" aria-hidden="true">{n}</p>
                <div className="texto"><Paras list={p.intro} abre /></div>
              </div>
            </div>
          </section>
        )}

        {p.subs.map(s => (
          <section key={s.title} className="section fluxo" id={slug(s.title)} aria-labelledby={`${slug(s.title)}-h`}>
            <div className="wrap">
              <div className="leitura">
                <h2 id={`${slug(s.title)}-h`}>{s.title}</h2>
                <div className="texto"><Paras list={s.paras} /></div>
              </div>
            </div>
          </section>
        ))}
      </main>
      <nav className="vizinhos wrap" aria-label="Outros pilares">
        {ant
          ? <a className="vizinho" href={ant.href}><span className="vizinho__r">Pilar anterior</span><span className="vizinho__t">{ant.n}. {ant.nome}</span></a>
          : <a className="vizinho" href="/#ao-que-vimos"><span className="vizinho__r">Voltar ao início</span><span className="vizinho__t">{aoQueVimos.title}</span></a>}
        {seg
          ? <a className="vizinho vizinho--seg" href={seg.href}><span className="vizinho__r">Pilar seguinte</span><span className="vizinho__t">{seg.n}. {seg.nome}</span></a>
          : <a className="vizinho vizinho--seg" href="/#o-pais-que-queremos"><span className="vizinho__r">Para terminar</span><span className="vizinho__t">{final.title}</span></a>}
      </nav>
      <Rodape atual={p} />
    </>
  );
}

export const rotas = [
  { path: '/', page: 'inicio', title: 'Portugal Pode Funcionar: manifesto em oito pilares', desc: `${subtitulo} Um manifesto de ${autor}, de ${data}.` },
  ...pilares.map(p => ({ path: p.href, page: `pilar-${p.n}`, title: `${p.nome}: pilar ${p.n} de Portugal Pode Funcionar`, desc: p.resumo })),
];

export default function App({ page }) {
  if (page === 'inicio') return <Inicio />;
  return <Pilar n={Number(page.replace('pilar-', ''))} />;
}
