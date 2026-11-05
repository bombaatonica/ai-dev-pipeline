import { runReview } from './reviewer.js';
runReview('review').catch(() => { console.error('Revisão de IA indisponível; fluxo segue normalmente.'); });
