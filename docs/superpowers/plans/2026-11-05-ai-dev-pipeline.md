# Plano de implementação: ai-dev-pipeline

> Atualização posterior: o requisito original de Node 20 foi substituído por Node 24 LTS após o fim do suporte do Node 20.
> Atualização posterior: o escopo atual usa apenas um staging; referências posteriores a dois ambientes registram o plano original.

**Objetivo:** entregar uma demonstração verificável de API, revisão consultiva por IA e pipeline de entrega.

**Arquitetura:** API Express sobre interface de armazenamento, ferramentas de revisão isoladas e workflows GitHub Actions. Dois serviços Render de demonstração usam bancos separados.

**Stack:** TypeScript strict, Node 20, Express, pg, Vitest, Supertest, Playwright, ESLint, esbuild e GitHub Actions.

**Especificação:** `docs/superpowers/specs/2026-11-05-ai-dev-pipeline-design.md`.

## Restrições globais

- Não iniciar Docker nem provisionar serviços remotos sem autorização.
- IA é consultiva, sujeita a limites de contexto e tokens, e executada a partir de código confiável.
- Documentação em português, sem alegações de testes ou resultados não executados.
- Não criar commits nem publicar repositório sem solicitação explícita.

## Etapas

1. Estruturar Node, lint e build; implementar armazenamento, API e testes de comportamento, integração e E2E.
2. Implementar lógica pura de revisão e testes; adicionar cliente HTTP com timeout/retry e integração com GitHub e Anthropic usando código da base.
3. Construir CI, segurança, revisão IA, publicação, promoção, rollback e Dependabot, fixando actions por SHA.
4. Definir Docker e blueprints independentes para os workspaces Render; documentar configuração, limitações e acompanhamento.
5. Rodar verificações locais leves e sequenciais, actionlint se disponível, e relatar testes dependentes de infraestrutura não executados.
