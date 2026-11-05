# Provedores de IA configuráveis

## Objetivo

Desacoplar revisão consultiva, análise de lacunas de teste e avaliação manual da Anthropic. OpenAI será a opção inicial; outros serviços compatíveis com Chat Completions podem ser escolhidos por configuração. O projeto continua sendo uma demonstração e não garante suporte a todas as APIs ou modelos.

## Interface e configuração

Criar uma interface comum que recebe um prompt e devolve texto e uso de tokens. Selecionar o adaptador por `AI_PROVIDER`: `openai-compatible` para OpenAI e outros endpoints que implementem o formato Chat Completions; `anthropic` para a API nativa existente. Variáveis comuns `AI_MODEL`, `AI_BASE_URL` e `AI_API_KEY` determinam modelo, endereço e credencial; `AI_TOKEN_PARAM` escolhe entre `max_completion_tokens` e `max_tokens` para fornecedores compatíveis. Documentar o endereço e o modelo padrão OpenAI e que compatibilidade de cada fornecedor deve ser verificada. O endpoint personalizável usa HTTPS e não aceita credenciais embutidas na URL. O adaptador Anthropic mantém compatibilidade com as variáveis anteriores quando a configuração nova não for fornecida.

Usar apenas APIs por HTTP e recursos nativos do Node, sem adicionar SDK. Não copiar a autenticação OAuth da sessão OpenCode. A configuração do GitHub Actions usa secret `AI_API_KEY` e variáveis `AI_PROVIDER`, `AI_MODEL` e `AI_BASE_URL`; a avaliação manual usa os mesmos parâmetros. A chave de API OpenAI é separada da assinatura ChatGPT e deve ser dedicada ao projeto.

## Limites e comportamento

Ambos adaptadores mantêm timeout, backoff para 429 e 5xx, teto de tokens de saída, contabilização de uso disponível e falha consultiva. As respostas são interpretadas e validadas antes de publicar; respostas inesperadas não se tornam apontamentos. Os dados do PR continuam não confiáveis, sujeitos a filtragem, redação de segredos e limites de contexto existentes. Não prometer que tais filtros eliminem todos os dados sensíveis. Permitir endpoints configurados apenas por administradores do repositório; o PR não pode alterar o código que recebe a chave, pois os scripts são carregados da branch base. A IA continua opcional e não bloqueia merge.

## Testes e documentação

Usar testes locais de `fetch` simulado para os dois adaptadores, parâmetros, extração de texto e uso, ausência de credencial, respostas inválidas e erros HTTP. Preservar testes de retry e de revisão. Atualizar workflows, README e documentação em português; incluir configuração OpenAI e exemplo genérico para serviço compatível, limites de compatibilidade, privacidade e cobrança variável. Nenhuma chamada paga real é feita sem chave e autorização. Executar lint, typecheck, testes com cobertura, build e actionlint de forma leve e sequencial. Não alterar a modificação já existente em `.github/CODEOWNERS`.
