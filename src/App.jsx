import { aoQueVimos, final, pilares, subtitulo, autor, data, slug } from './content/manifesto.js';

// Uma só página, lida de corrido: a abertura em calçada com o globo, Ao que vimos, o índice,
// os oito pilares por inteiro e O país que queremos. O texto vem tal e qual de manifesto.txt.

const Paras = ({ list, abre = false }) => list.map((t, i) => <p key={i} className={abre && i === 0 ? 'abre' : undefined}>{t}</p>);
const ancora = p => `pilar-${p.n}`;
const Seta = () => <span aria-hidden="true">↑</span>;

function Abertura() {
  return (
    <section className="abertura" aria-labelledby="titulo">
      <div className="abertura__palco">
        <div className="wrap abertura__pedra">
          <div className="pedra pedra--ondas" aria-hidden="true" />
          <div className="pedra pedra--campo" aria-hidden="true" />
          <div className="pedra pedra--titulo" aria-hidden="true" />
          <h1 id="titulo" className="sr">Portugal Pode Funcionar</h1>
          <figure className="globo" role="img" aria-label="Globo em calçada portuguesa: o mundo roda até Portugal ficar ao centro, entre a Europa, a África e as Américas, com a zona económica exclusiva portuguesa demarcada a vinho.">
            <canvas className="globo__tela" data-modelo="/assets/globo.json" aria-hidden="true" />
            <noscript>
              <img className="globo__fixo" src="/assets/globo-base.svg" alt="" width="780" height="780" />
              <img className="globo__fixo" src="/assets/globo-zee.svg" alt="" width="780" height="780" />
            </noscript>
          </figure>
        </div>
        <div className="wrap abertura__base">
          <p className="abertura__legenda"><span className="amostra" aria-hidden="true" />Zona económica exclusiva de Portugal</p>
          <span className="abertura__deixa" aria-hidden="true"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 2v11M3.5 8.5 8 13l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <p className="abertura__sub">{subtitulo}</p>
          <p className="abertura__autor"><span>{autor}</span> <span>{data}</span></p>
        </div>
      </div>
    </section>
  );
}

function Pilar({ p }) {
  const id = ancora(p);
  return (
    <section className="seccao pilar" id={id} aria-labelledby={`${id}-h`}>
      <div className="wrap">
        <div className="calcada-tira pilar__tira" aria-hidden="true" style={{ '--tira-x': `${-137 * p.n}px` }} />
        <div className="leitura">
          <div className="lado pilar__cabeca">
            <span className="numero" aria-hidden="true">{p.n}</span>
            <h2 id={`${id}-h`}>{p.nome}</h2>
          </div>
          <div className="texto"><Paras list={p.intro} abre /></div>
        </div>
        {p.subs.map(s => (
          <div key={s.title} className="leitura pilar__parte" id={`${id}-${slug(s.title)}`}>
            <h3 className="lado">{s.title}</h3>
            <div className="texto"><Paras list={s.paras} /></div>
          </div>
        ))}
        <div className="leitura">
          <p className="pilar__voltar"><a href="#pilares"><u>Voltar aos oito pilares</u><Seta /></a></p>
        </div>
      </div>
    </section>
  );
}

function Rodape() {
  return (
    <footer className="rodape">
      <div className="wrap rodape__grelha">
        <div className="rodape__marca">
          <a className="rodape__nome" href="#top">Portugal Pode Funcionar</a>
          <p className="rodape__lede">{subtitulo}</p>
        </div>
        <ul className="rodape__lista" aria-label="Os oito pilares">
          {pilares.map(p => <li key={p.n}><a href={`#${ancora(p)}`}>{p.n}. {p.nome}</a></li>)}
        </ul>
        <div className="rodape__legal">
          <p>© 2026 Portugal Pode Funcionar. {autor}, {data}.</p>
          <p>Globo em calçada feito com dados do <a href="https://www.naturalearthdata.com/" rel="noopener">Natural Earth</a> e do <a href="https://www.marineregions.org/" rel="noopener">Marine Regions</a> (Flanders Marine Institute, CC BY 4.0).</p>
        </div>
      </div>
    </footer>
  );
}

export function Inicio() {
  const [antes, depois] = final.intro[0].split('vai escolher ficar');
  return (
    <>
      <main id="top">
        <Abertura />

        <section className="seccao" id="ao-que-vimos" aria-labelledby="ao-que-vimos-h">
          <div className="wrap leitura">
            <h2 className="lado" id="ao-que-vimos-h">{aoQueVimos.title}</h2>
            <div className="texto"><Paras list={aoQueVimos.intro} abre /></div>
          </div>
        </section>

        <section className="seccao" id="pilares" aria-labelledby="pilares-h">
          <div className="wrap">
            <h2 id="pilares-h">Os oito pilares</h2>
            <div className="pilares">
              {pilares.map(p => (
                <a key={p.n} className="pilar-card" href={`#${ancora(p)}`}>
                  <span className="calcada-tira" aria-hidden="true" style={{ '--tira-x': `${-137 * p.n}px` }} />
                  <span className="pilar-card__corpo">
                    <span className="numero" aria-hidden="true">{p.n}</span>
                    <span><span className="pilar-card__t">{p.nome}</span><span className="pilar-card__r">{p.resumo}</span></span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {pilares.map(p => <Pilar key={p.n} p={p} />)}

        <section className="mar" id="o-pais-que-queremos" aria-labelledby="futuro-h">
          <div className="wrap leitura">
            <h2 className="lado" id="futuro-h">{final.title}</h2>
            <p className="mar__texto" data-acende="">{antes}<strong>vai escolher ficar</strong>{depois}</p>
          </div>
          <div className="mar__ondas" aria-hidden="true" />
        </section>
      </main>
      <Rodape />
    </>
  );
}

export function Perdido() {
  return (
    <main className="wrap perdido">
      <div className="calcada-tira" aria-hidden="true" />
      <h1 className="sr">Portugal Pode Funcionar</h1>
      <h2>Esta página não existe</h2>
      <p>O manifesto está todo numa só página.</p>
      <p><a href="/">Ir para o início</a></p>
    </main>
  );
}

export const rotas = [
  { path: '/', page: 'inicio', title: 'Portugal Pode Funcionar: manifesto em oito pilares', desc: `${subtitulo} Um manifesto de ${autor}, de ${data}.` },
];

// os endereços antigos de cada pilar levam à sua secção na página única
export const redirecionamentos = pilares.map(p => ({ path: p.href, para: `/#${ancora(p)}`, title: `${p.nome}: Portugal Pode Funcionar` }));
