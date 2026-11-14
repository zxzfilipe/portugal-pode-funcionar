# Portugal Pode Funcionar

O site do manifesto, em [portugalpodefuncionar.pt](https://portugalpodefuncionar.pt).

Uma só página, lida de corrido: a abertura em calçada portuguesa (ondas, título em pedra e um globo), "Ao que vimos",
o índice dos oito pilares, os oito pilares por inteiro e "O país que queremos".

## O que há aqui

| Onde | O quê |
|---|---|
| `src/content/manifesto.txt` | O texto do manifesto. O site mostra-o tal e qual: o build falha se faltar uma linha, se a ordem mudar ou se houver travessões. |
| `src/content/MARCA.md`, `marca/` | A marca: cores, tipos de letra e os SVG originais da calçada. |
| `src/App.jsx` | A página, em componentes React. O build transforma-a em HTML estático (`prerender.mjs`); no browser não corre React. |
| `src/site.css` | Todo o CSS, escrito para esta página. Vai dentro do HTML. |
| `src/cliente/site.js` | O que corre no browser: o globo conduzido pelo scroll e as palavras que se acendem no fim. |
| `src/globo/` | O globo: as pedras assentes na esfera em anéis à volta de Portugal (`pedras.js`) e o desenho em WebGL (`globo.js`). |
| `scripts/globo-modelo.mjs` | Decide a cor de cada pedra (mar, ZEE, terra, Portugal) e corta pela costa as que ficam a meio. Sai `public/assets/globo.json`. |
| `scripts/globo.mjs` | O globo fixo (dois SVG), para quem não tem JavaScript ou WebGL. |
| `scripts/pedra-leve.mjs`, `scripts/compactar.mjs` | Versões leves dos SVG da marca para o site, sem mudar o desenho. |
| `scripts/verificar.mjs` | Abre o site construído no Chrome, em oito ecrãs, e confere tudo (ver abaixo). |

## O globo

Uma esfera em calçada, com as fiadas a irradiar do centro geodésico de Portugal continental (Vila de Rei). Com o scroll,
o mundo roda até Portugal ficar ao centro, a zona económica exclusiva tinge-se de vinho da costa até ao limite das 200
milhas, e a vista aproxima-se do mar português. Com "reduzir movimento" ligado fica parado, já com Portugal ao centro;
sem JavaScript ou sem WebGL aparece o globo fixo.

Dados: costas do [Natural Earth](https://www.naturalearthdata.com/) (domínio público, via `world-atlas`) e zona económica
exclusiva do [Marine Regions](https://www.marineregions.org/) (Flanders Marine Institute, 2023, Maritime Boundaries
Geodatabase v12, CC BY 4.0), guardada em `scripts/dados/zee-portugal.json`. O rodapé do site dá o crédito.

## Comandos

```
npm install
npm run build       # constrói dist/ (globo, script do browser, HTML) e confere o texto
npm run preview     # serve dist/ em http://127.0.0.1:4173
npm run verificar   # abre dist/ no Chrome em oito ecrãs: transbordos, erros, ligações, a cena do globo,
                    # sem movimento, sem JavaScript, sem WebGL; deixa capturas em verificacao/
npm run partilha    # refaz a imagem de partilha (public/share.jpg) e o ícone, depois de um build
npm run publicar    # constrói e publica dist/ no ramo gh-pages (GitHub Pages)
```

`npm run verificar` e `npm run partilha` precisam do Google Chrome instalado.

## Mudar o texto

Edita `src/content/manifesto.txt` (`##` marca secções, `###` subsecções) e corre `npm run publicar`.

As fontes em `public/fonts/` só trazem as letras do português (e a pontuação corrente), para pesarem menos.
Uma letra de fora desse conjunto aparece no tipo de letra de recurso.
