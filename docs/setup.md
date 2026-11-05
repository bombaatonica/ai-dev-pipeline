# Configuração da demonstração

## GitHub

1. Crie um repositório público na conta escolhida e publique os arquivos; substitua o placeholder em `.github/CODEOWNERS` por um usuário ou time com acesso de escrita.
2. Proteja `main`: exija PR, ao menos uma aprovação, revisão de code owners e o check `validate` do CI. Ative as demais verificações de segurança como obrigatórias se desejado. Não torne a IA obrigatória. Restrinja permissões de bypass e criação de branches.
   O autor do PR não pode aprovar o próprio PR: em um repositório individual, é necessário outro revisor elegível para satisfazer essa regra.
3. Crie o environment `staging`. A entrega nesse único ambiente de demonstração é automática após o CI; a aprovação humana ocorre no PR.
4. Crie o label `ai-review`; configure o secret `ANTHROPIC_API_KEY` e opcionalmente a variável `ANTHROPIC_MODEL`. A revisão só roda em PRs internos, não rascunhos, sem bots, com o label e mudanças além de documentação. A action de Gitleaks requer `GITLEAKS_LICENSE` em organização, conforme a documentação atual.
5. Habilite Actions, packages e auto-merge nas configurações. Auto-merge de patch não ignora aprovação e checks. O CI suporta `merge_group`. A documentação do GitHub informa que a merge queue está disponível em repositórios públicos pertencentes a organizações, não em repositórios de conta pessoal. Para conta pessoal, exija que a branch esteja atualizada antes do merge; para organização, confirme também as condições de licença do Gitleaks.

## Render

O `render.yaml` representa **um** serviço e **um** banco de staging. Configure o repositório como Blueprint em um workspace dedicado, após verificar termos e limites gratuitos. Selecione `free` para ambos recursos; o YAML usa `autoDeployTrigger: 'off'` e `plan: free`. O banco expira após 30 dias e não possui backup no plano gratuito.

No workspace, obtenha a URL HTTPS do serviço e o Deploy Hook secreto. No environment GitHub `staging`, defina secret `RENDER_STAGING_HOOK` e variable `STAGING_URL`. Hooks não devem ser exibidos em logs ou compartilhados. O Render interpreta o parâmetro `ref` como commit Git e reconstrói a aplicação; não usa a imagem publicada no GHCR.

O Render pode levar cerca de um minuto para acordar. O smoke e a espera de versão toleram até aproximadamente 100 segundos cada. Limites de banda e build podem gerar cobrança quando há meio de pagamento; verifique limites e custos antes de ativar serviços. Os testes E2E de staging criam e alteram tarefas; o smoke é somente leitura.

## Validação

Abra um PR interno pequeno, revise o CI e, se quiser incorrer no custo da IA, aplique `ai-review`. Confira comentários e uso de tokens. O workflow `Avaliação manual da IA` é acionado manualmente e também usa a API paga. Após aprovação e merge, acompanhe o CI do commit mesclado, o deploy em staging e os testes. Falha após deploy aciona uma tentativa de rollback para o SHA anterior do push; confira o estado do Render manualmente porque esse SHA pode não ser o último deploy saudável e o hook é assíncrono.

Use as notificações do GitHub para acompanhar workflows malsucedidos e os logs do Render para diagnóstico. Não existe serviço de alertas externo configurado por este repositório. Confira [docs/decisions.md](decisions.md) antes de interpretar os resultados.
