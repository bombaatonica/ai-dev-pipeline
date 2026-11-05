# Pipeline de desenvolvimento com IA — especificação

> Atualização posterior: o requisito original de Node 20 foi substituído por Node 24 LTS após o fim do suporte do Node 20.

## Objetivo e limites

Criar um repositório público de portfólio que demonstra um fluxo de desenvolvimento com CI/CD, segurança, revisão consultiva por IA e promoção de uma aplicação de exemplo. Staging e produção são ambientes de demonstração, não um serviço de produção real. Não declarar resultados ou métricas não medidos.

## Aplicação

Implementar API de tarefas em TypeScript strict, Node 20 e Express 4. `TaskStore` define operações de persistência; `MemoryStore` atende testes e uso sem banco, enquanto `PgStore` usa `pg` e migração idempotente com CHECK de comprimento. Rotas: health, readiness com verificação da dependência, versão com SHA, listagem, criação validada e conclusão de tarefa com ID validado. Erros assíncronos passam por wrapper e erros 5xx não expõem detalhes. O processo fecha o servidor e pool em SIGTERM/SIGINT.

## Validação e segurança

Vitest e Supertest verificam a aplicação e os componentes de revisão, com limites de cobertura de 85% para linhas, funções e statements e 75% para branches. Integração usa PostgreSQL real e é pulada apenas quando `DATABASE_URL` estiver ausente. Playwright usa API HTTP sem browser, servidor buildado localmente ou `BASE_URL` remoto. Smoke é somente leitura, verifica health, readiness, SHA e listagem, com polling tolerante à hibernação. Hooks locais verificam qualidade; CI executa lint, tipos, auditoria de dependências de produção, testes, build e análise de imagem. CodeQL e Gitleaks rodam em PR e por agendamento. Actions são fixadas em SHA e usam permissões mínimas.

O CI fornece um ambiente isolado e efêmero por execução usando serviço PostgreSQL e aplicação local ao runner. Um ambiente remoto de preview por PR é uma capacidade adicional desejada: sua implementação depende da confirmação de viabilidade e custos dos serviços gratuitos, inclusive banco e limpeza no fechamento. Não alegar que o runner é um preview remoto.

## Revisão por IA

O workflow usa `pull_request`, apenas PRs internos não rascunho e não bots com label `ai-review` e alterações além de documentação. As regras vêm da branch base; diff e conteúdos de arquivos são dados não confiáveis. Filtrar arquivos gerados, limitar contexto e tokens e redigir padrões conhecidos de segredos; a redação é parcial e não constitui garantia de ausência de segredos. A resposta estruturada é validada, selecionando no máximo cinco achados de confiança mínima 0,7, ordenados por severidade. Comentários com marker são atualizados em vez de duplicados. A revisão e as lacunas de teste são consultivas e falhas não impedem merge. Usar timeout e retry limitado para 429 e 5xx, sem repetir outros 4xx; registrar uso de tokens. Avaliações manuais incluem SQL concatenado, erro assíncrono e diff limpo; os resultados só podem ser divulgados após execução real.

Executar lógica e dependências do revisor a partir de código confiável da base, não do PR com acesso ao segredo. A avaliação é manual e requer chave; limites de tokens não constituem por si só um teto financeiro agregado.

## Entrega

Após push em main, executar o CI reutilizável sobre o commit mesclado e publicar imagem no GHCR com tag do SHA. Deploy de staging via hook Render com `ref` do commit, esperar SHA e executar E2E e smoke. Promoção para produção usa environment protegido com aprovação humana e smoke. Falhas pós-deploy disparam tentativa de redeploy do SHA anterior quando válido; `github.event.before` não garante corresponder ao último deploy validado, e o primeiro push pode não ter rollback válido. Serializar deploys para reduzir corridas e documentar limites.

Render reconstrói a partir do Git: a imagem GHCR é publicada para demonstração, mas não é o artefato implantado. `GIT_SHA` deve identificar o commit real também em builds Render. Cada ambiente usa banco isolado; Render permite um banco gratuito por workspace e bancos gratuitos expiram em 30 dias. Configuração de dois workspaces exige blueprints separados ou instruções equivalentes, sem criar ambos os bancos no mesmo workspace.

Dependabot cobre npm, actions e Docker; auto-merge limita-se a atualizações patch e mantém proteções e aprovação humana. Logs e alertas devem se apoiar em mecanismos gratuitos verificáveis, com instruções e limites explícitos, sem afirmar que serviços externos já foram configurados.

## Infraestrutura e documentação

Dockerfile multi-stage, runtime não-root com dependências de produção e healthcheck; compose para uso opcional, sem iniciar containers localmente sem pedido explícito. README, decisões e setup em português, com Mermaid, configurações, secrets, limites, riscos de transmissão à API de terceiros e método para medir utilidade e falsos positivos. Incluir template de PR e CODEOWNERS placeholder. Documentar que regras de branch, reviewers de environment e permissões são configurados no GitHub e não são garantidos apenas por arquivos do repositório.

## Verificação e limites operacionais

Executar lint, typecheck, cobertura, build e E2E local de forma leve e sequencial. Integração PostgreSQL, build Docker e testes de infraestrutura ficam pendentes sem serviço remoto isolado autorizado. Validar workflows com actionlint se disponível; relatar bloqueios e não presumir resultados. Conferir documentação oficial de Render, GitHub, Gitleaks e preços atuais. Não provisionar serviços, criar custos, usar credenciais de outros projetos, criar repositório remoto ou fazer commits sem autorização específica.
