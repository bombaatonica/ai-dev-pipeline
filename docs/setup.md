# Configuração da demonstração

## GitHub

1. Crie um repositório público na conta escolhida e publique os arquivos; substitua o placeholder em `.github/CODEOWNERS` por um usuário ou time com acesso de escrita.
2. Proteja `main`: exija PR, ao menos uma aprovação, revisão de code owners e o check `validate` do CI. Ative as demais verificações de segurança como obrigatórias se desejado. Não torne a IA obrigatória. Restrinja permissões de bypass e criação de branches.
   O autor do PR não pode aprovar o próprio PR: em um repositório individual, é necessário outro revisor elegível para satisfazer essa regra.
3. Crie o environment `staging`. A entrega nesse único ambiente de demonstração é automática após o CI; a aprovação humana ocorre no PR.
4. Crie o label `ai-review`; configure o secret `AI_API_KEY` com uma chave dedicada do provedor escolhido. Por padrão, é usada a API da OpenAI com o modelo `gpt-4.1-mini`; `AI_MODEL` permite alterá-lo. A revisão só roda em PRs internos, não rascunhos, sem bots, com o label e mudanças além de documentação. A action de Gitleaks requer `GITLEAKS_LICENSE` em organização, conforme a documentação atual.
5. Habilite Actions, packages e auto-merge nas configurações. Auto-merge de patch não ignora aprovação e checks. O CI suporta `merge_group`. A documentação do GitHub informa que a merge queue está disponível em repositórios públicos pertencentes a organizações, não em repositórios de conta pessoal. Para conta pessoal, exija que a branch esteja atualizada antes do merge; para organização, confirme também as condições de licença do Gitleaks.

### Escolher provedor de IA

- **OpenAI:** crie uma chave de API dedicada na plataforma OpenAI e cadastre-a como secret `AI_API_KEY`. A autenticação do ChatGPT no OpenCode não é transferida para o GitHub Actions; assinatura ChatGPT e API têm faturamento distinto.
- **Outro serviço compatível:** use `AI_PROVIDER=openai-compatible`, `AI_BASE_URL` com a URL base HTTPS até a versão da API, por exemplo `https://openrouter.ai/api/v1`, e `AI_MODEL` com um modelo oferecido por esse serviço. Cadastre sua chave em `AI_API_KEY`. Se o serviço aceitar `max_tokens` mas não `max_completion_tokens`, configure `AI_TOKEN_PARAM=max_tokens`. Confirme compatibilidade e preços do provedor escolhido.
- **Anthropic nativa:** configure `AI_PROVIDER=anthropic`, o secret `AI_API_KEY` e `AI_MODEL`. Instalações anteriores também podem usar `ANTHROPIC_API_KEY` e `ANTHROPIC_MODEL`; na ausência de `AI_PROVIDER` e `AI_API_KEY`, uma chave Anthropic anterior seleciona esse provedor.

Não inclua credenciais em `AI_BASE_URL`. Cada PR elegível faz até duas chamadas; a avaliação manual também usa a API e pode gerar custo. Defina orçamento na plataforma do fornecedor. Nunca cole chaves em comentários, arquivos do repositório ou conversas.

## Render

O `render.yaml` representa **um** serviço e **um** banco de staging. Configure o repositório como Blueprint em um workspace dedicado, após verificar termos e limites gratuitos. Selecione `free` para ambos recursos; o YAML usa `autoDeployTrigger: 'off'` e `plan: free`. O banco expira após 30 dias e não possui backup no plano gratuito.

No workspace, obtenha a URL HTTPS do serviço e o Deploy Hook secreto. No environment GitHub `staging`, defina secret `RENDER_STAGING_HOOK` e variable `STAGING_URL`. Hooks não devem ser exibidos em logs ou compartilhados. O Render interpreta o parâmetro `ref` como commit Git e reconstrói a aplicação; não usa a imagem publicada no GHCR.

O Render pode levar cerca de um minuto para acordar. O smoke e a espera de versão toleram até aproximadamente 100 segundos cada. Limites de banda e build podem gerar cobrança quando há meio de pagamento; verifique limites e custos antes de ativar serviços. Os testes E2E de staging criam e alteram tarefas; o smoke é somente leitura.

## Validação

Abra um PR interno pequeno, revise o CI e, se quiser incorrer no custo da IA, aplique `ai-review`. Confira comentários e uso de tokens. O workflow `Avaliação manual da IA` é acionado manualmente e também usa a API paga. Após aprovação e merge, acompanhe o CI do commit mesclado, o deploy em staging e os testes. Falha após deploy aciona uma tentativa de rollback para o SHA anterior do push; confira o estado do Render manualmente porque esse SHA pode não ser o último deploy saudável e o hook é assíncrono.

Use as notificações do GitHub para acompanhar workflows malsucedidos e os logs do Render para diagnóstico. Não existe serviço de alertas externo configurado por este repositório. Confira [docs/decisions.md](decisions.md) antes de interpretar os resultados.
