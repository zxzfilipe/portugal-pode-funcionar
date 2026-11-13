import { renderToStaticMarkup } from 'react-dom/server';
import { Inicio, Perdido, rotas, redirecionamentos } from './App.jsx';

export { rotas, redirecionamentos };
export const render = page => renderToStaticMarkup(page === 'perdido' ? <Perdido /> : <Inicio />);
