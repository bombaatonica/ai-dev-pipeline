import { runReview } from './reviewer.js';
runReview('test-gaps').catch(() => { console.error('Análise de testes indisponível; fluxo segue normalmente.'); });
