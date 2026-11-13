# Portugal Pode Funcionar

O site do manifesto, em portugalpodefuncionar.pt.

- O texto vem de `src/content/manifesto.txt` e não é alterado: o build verifica que entra todo, pela ordem, e sem travessões.
- A marca (cores, tipos de letra, calçada) está em `src/content/MARCA.md`, `public/site.css` e `public/assets/*.svg`.
- As páginas são componentes React (`src/App.jsx`) renderizados para HTML estático em `dist/` (`npm run build`).
- `npm run publicar` constrói e publica `dist/` no ramo `gh-pages` (GitHub Pages).

```
npm install
npm run build
npm run preview
```
