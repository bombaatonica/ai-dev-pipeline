# Plano de implementação: provedores de IA

**Objetivo:** permitir OpenAI, endpoints compatíveis e Anthropic sem depender da sessão OAuth local.

**Arquitetura:** `askAI` seleciona o protocolo configurado e normaliza texto e uso; revisão e avaliação consomem a mesma função.

**Stack:** Node 24, TypeScript, `fetch` nativo, Vitest e GitHub Actions.

**Especificação:** `docs/superpowers/specs/2026-11-05-ai-providers-design.md`.

## Restrições

- Não copiar credenciais OAuth nem fazer chamadas pagas sem autorização.
- Não alterar `.github/CODEOWNERS` existente; não usar Docker local.
- Secret `AI_API_KEY`; variáveis `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL`.
- IA permanece consultiva, limitada e não bloqueante.

## Etapas

1. Adicionar testes com `fetch` simulado para OpenAI, endpoint compatível, Anthropic, autenticação ausente e erro HTTP; confirmar falha antes da implementação.
2. Implementar `askAI(prompt)` em `scripts/lib.ts`, validar URL HTTPS, limitar saída a 1.200 tokens, manter retry e normalizar texto/uso; executar testes.
3. Substituir chamadas de revisão e avaliação, ligar variáveis nos dois workflows e atualizar documentação. Conferir que nenhum segredo é impresso.
4. Rodar lint, typecheck, testes com cobertura, build e actionlint sequencialmente; verificar mudanças e relatar que o teste real depende de chave e autorização.
