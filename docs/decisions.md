# Decisões e limites

## IA consultiva

A análise determinística e os testes antecedem a IA. O modelo pode errar, omitir problemas ou obedecer instruções maliciosas inseridas no código; seus apontamentos são hipóteses para revisão humana, nunca um check obrigatório. Há limite de contexto, 1.200 tokens de saída por chamada, seleção por confiança e máximo de cinco resultados por comentário. Confiança declarada pelo modelo não é probabilidade calibrada. A avaliação manual usa exemplos conhecidos e é uma triagem pequena, não uma garantia de qualidade.

O código, diff e contexto são enviados à Anthropic. A redação por padrões cobre alguns formatos conhecidos e pode falhar; não envie informações sensíveis ou segredos. A avaliação manual e cada chamada em PR têm custo variável. O teto de tokens por chamada não limita o gasto agregado; configure orçamento e alertas no fornecedor. O workflow usa a base para o script, mas um colaborador capaz de alterar workflows em um PR interno pode modificar o próprio workflow executado por `pull_request`; restrinja acesso de escrita e proteja `.github/workflows`, scripts e regras. Forks são excluídos.

## Como medir valor

Após usar o fluxo em PRs reais, registre para cada sugestão: identificador do PR, ferramenta, classificação humana de útil/falso positivo/incerta e se houve mudança. Registre também tempo de revisão apenas quando houver método consistente de medição. Compare proporções com denominadores e tamanho da amostra; não atribua causalidade sem comparação adequada. Uma comparação com ferramentas prontas, como CodeRabbit, pode usar os mesmos PRs e critérios, observando preços e política de dados vigentes. Nenhum resultado é alegado aqui.

## Deploy e recuperação

O GHCR recebe uma imagem por SHA, mas o Render reconstrói o Dockerfile a partir do commit enviado no hook `ref`; a imagem publicada não é a implantada. A versão usa `GIT_SHA` ou `RENDER_GIT_COMMIT`. A tentativa de rollback usa `github.event.before`: esse commit pode não ser o último deploy válido, não restaura alterações de dados e pode não existir no primeiro push. O hook aceita uma solicitação, não prova que o rollback terminou. Alterações de schema irreversíveis precisam de estratégia própria. Concorrência limita execuções simultâneas, mas não garante uma fila durável de cada push.

O ambiente de CI com banco efêmero não é um preview remoto. Há um workflow separado para criar um serviço e um banco de preview, sujeito à configuração e validação descritas em `preview.md`. Não há teste de carga ou alertas externos. Consultar logs dos jobs e do Render e habilitar notificações de falhas nas configurações do GitHub são medidas manuais, não monitoramento operacional completo.

O Render oferece [service previews](https://render.com/docs/service-previews), mas eles copiam inicialmente as variáveis do serviço base, inclusive a conexão com o banco. Os [Preview Environments](https://render.com/docs/preview-environments) completos exigem workspace Pro. A API permite criar um serviço independente com variáveis definidas na criação. O workflow proposto usa essa abordagem e ainda precisa ser validado em contas isoladas; simplesmente ativar service previews poderia expor ou alterar dados do ambiente base.

Um projeto Neon Free dedicado pode fornecer branches de banco isoladas para PRs, sujeito às cotas atuais. Branches são cópias da branch pai; ela deve conter apenas dados de demonstração. A documentação consultada sobre expiração automática diverge: o guia apresenta `expires_at`, enquanto a referência da API descreve disponibilidade limitada a acesso antecipado. Não presumir TTL funcional sem verificar a conta; implementar limpeza explícita e reconciliação de recursos órfãos.

## Planos e disponibilidade

O briefing original pedia Node 20, mas essa versão chegou ao fim do suporte. O projeto foi atualizado para Node 24 LTS. A imagem final atualiza pacotes Debian e não inclui npm, utilizado somente nas etapas de build; o Trivy continua bloqueando vulnerabilidades HIGH e CRITICAL corrigíveis.

Na documentação Render consultada, há um Postgres gratuito por workspace, expiração após 30 dias, hibernação de web service e franquias compartilhadas. Dois workspaces são necessários para dois bancos gratuitos isolados. A permanência no plano gratuito depende de limites de uso e das condições do fornecedor. A action Gitleaks pede licença para organizações; sua documentação descreve licença gratuita, e contas pessoais não precisam dela. Verifique preços e condições ao configurar.

A documentação do GitHub restringe a merge queue em repositórios públicos aos que pertencem a organizações. Em conta pessoal, o suporte a `merge_group` permanece no CI, mas não ativa a funcionalidade; exigir branch atualizada é uma alternativa de configuração.
