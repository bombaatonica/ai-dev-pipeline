const [base, expected] = process.argv.slice(2);
if (!base || !/^[a-f0-9]{40}$/.test(expected || '')) throw new Error('URL ou SHA inválido');
const deadline = Date.now() + 100_000;
while (Date.now() < deadline) {
  try {
    const response = await fetch(new URL('/version', base), { signal: AbortSignal.timeout(5000) });
    if (response.ok && (await response.json()).sha === expected) process.exit(0);
  } catch { /* serviço em inicialização */ }
  await new Promise((resolve) => setTimeout(resolve, 4000));
}
throw new Error('Versão esperada não ficou disponível');
