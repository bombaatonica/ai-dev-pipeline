import { readFile } from 'node:fs/promises';
import { askClaude } from './lib.js';
import { parseReview, selectFindings } from './review-core.js';
import { buildPrompt } from './reviewer.js';

async function main(): Promise<void> {
  const cases = JSON.parse(await readFile('evals/cases.json', 'utf8')) as Array<{ name: string; diff: string; expected: boolean }>;
  const rules = await readFile('REVIEW_RULES.md', 'utf8');
  let failures = 0;
  for (const item of cases) {
    const prompt = buildPrompt('review', rules, item.diff, '');
    const response = await askClaude(prompt);
    if (!Array.isArray(JSON.parse(response.text))) throw new Error('Resposta inválida da IA');
    const found = selectFindings(parseReview(response.text)).length > 0;
    const passed = found === item.expected;
    console.log(`${item.name}: ${passed ? 'PASSOU' : 'FALHOU'}; tokens entrada=${response.inputTokens}, saída=${response.outputTokens}`);
    if (!passed) failures++;
  }
  if (failures) process.exitCode = 1;
}
main().catch(() => { console.error('Avaliação indisponível'); process.exitCode = 1; });
