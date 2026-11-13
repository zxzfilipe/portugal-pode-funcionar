import { renderToStaticMarkup } from 'react-dom/server';
import App, { rotas } from './App.jsx';

export { rotas };
export const render = page => renderToStaticMarkup(<App page={page} />);
