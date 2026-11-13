import { aoQueVimos, final, pilares, subtitulo, autor, data, slug } from './content/manifesto.js';

const Seta = () => (
  <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true">
    <path className="m-arrow__stem" d="M1 6h8" /><path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
  </svg>
);

const Paras = ({ list, abre = false }) => list.map((t, i) => <p key={i} className={abre && i === 0 ? 'abre' : undefined}>{t}</p>);

function Nav({ inicio }) {
  const h = inicio ? '' : '/';
  return (
    <header className="nav nav--split">
      <div className="wrap nav__bar">
        <a className="skip-link" href="#top">Saltar para o conteúdo</a>
        <a className="nav__logo" href={inicio ? '#top' : '/'}>Portugal Pode Funcionar</a>
        <nav className="nav__links" aria-label="Principal">
          <div className="nav__item"><a className="nav__link" href={`${h}#ao-que-vimos`}>Manifesto</a></div>
          <div className="nav__item"><a className="nav__link" href={`${h}#pilares`} aria-current={inicio ? undefined : 'page'}>Pilares</a></div>
          <div className="nav__item"><a className="nav__link" href={`${h}#o-pais-que-queremos`}>Futuro</a></div>
        </nav>
        <div className="nav__actions">
          <a className="btn btn--primary" href={inicio ? '#pilares' : '/pilar/1/'}>{inicio ? 'Ler os pilares' : 'Ler do início'}</a>
        </div>
        <button className="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      </div>
    </header>
  );
}

function Rodape({ children, tira = 0, atual = null }) {
  return (
    <footer className="footer closing" id="contact" aria-labelledby="close-h">
      <div className="wrap">
        <div className="closing__cta close--type">{children}</div>
        <div className="closing__links">
          <div className="calcada-tira rodape-tira" aria-hidden="true" style={{ '--tira-x': `${tira}px` }} />
          <div className="grid">
            <div className="span-4 stack-4">
              <a className="rodape-nome" href="/">Portugal Pode Funcionar</a>
              <p className="footer__lede">{subtitulo}</p>
            </div>
            <div className="span-7 start-6 footer__col">
              <h3>Os oito pilares</h3>
              <ul className="rodape-lista">
                {pilares.map(p => (
                  <li key={p.n}><a href={p.href} aria-current={p === atual ? 'page' : undefined}>{p.n}. {p.nome}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="footer__legal"><span>© 2026 Portugal Pode Funcionar. {autor}, {data}.</span></div>
        </div>
      </div>
    </footer>
  );
}

function Inicio() {
  const [antes, depois] = final.intro[0].split('vai escolher ficar');
  return (
    <>
      <Nav inicio />
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
                <div className="hero__lado">
                  <p className="hero__autor">{autor}<br />{data}</p>
                  <a className="btn btn--primary" href="#pilares">Ler os oito pilares<Seta /></a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section longo longo-2" id="ao-que-vimos" aria-labelledby="ao-que-vimos-h">
          <div className="wrap">
            <div className="leitura">
              <h2 id="ao-que-vimos-h">{aoQueVimos.title}</h2>
              <div className="texto"><Paras list={aoQueVimos.intro} abre /></div>
            </div>
          </div>
        </section>

        <section className="section pilares-sec" id="pilares" aria-labelledby="pilares-h">
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

        <section className="section statement mar" id="o-pais-que-queremos" data-moment="word-highlight" aria-labelledby="futuro-h">
          <img className="layer pedra pedra--mar" src="/assets/pedra-ondas.svg" alt="" aria-hidden="true" width="4800" height="252" loading="lazy" />
          <div className="wrap">
            <div className="leitura">
              <h2 id="futuro-h">{final.title}</h2>
              <p className="mo-wh__text">{antes}<strong>vai escolher ficar</strong>{depois}</p>
            </div>
          </div>
        </section>
      </main>
      <Rodape>
        <div className="section-head">
          <h2 id="close-h">Ler o manifesto pilar a pilar</h2>
          <p>Cada pilar tem a sua página, do Estado que constrói a Portugal no mundo.</p>
        </div>
        <a className="btn btn--primary" href="/pilar/1/">Ler os oito pilares<Seta /></a>
      </Rodape>
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
      <Nav />
      <main id="top">
        <section className="hero hero--pilar" data-enter aria-labelledby="hero-h">
          <img className="layer pedra pedra--chao" src="/assets/pedra-calcada.svg" alt="" aria-hidden="true" width="4800" height="504" style={{ '--chao-x': `${-137 * n}px` }} />
          <div className="wrap">
            <div className="hero-text">
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
      <Rodape tira={-137 * n} atual={p}>
        <div className="section-head">
          <h2 id="close-h">{seg ? `Pilar ${seg.n}: ${seg.nome}` : final.title}</h2>
          <p>{seg ? seg.resumo : final.intro[0]}</p>
        </div>
        <div className="vizinhos">
          {seg
            ? <a className="btn btn--primary" href={seg.href}>Ler o pilar seguinte<Seta /></a>
            : <a className="btn btn--primary" href="/#o-pais-que-queremos">Ler O país que queremos<Seta /></a>}
          {ant
            ? <a className="btn btn--secondary" href={ant.href}>Pilar anterior: {ant.nome}</a>
            : <a className="btn btn--secondary" href="/#ao-que-vimos">Voltar a Ao que vimos</a>}
        </div>
      </Rodape>
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
