# Preview remoto por PR

O workflow `.github/workflows/preview.yml` contém o fluxo de provisionamento e limpeza para PRs internos. Os clientes e componentes de ciclo de vida têm testes com APIs simuladas, mas **o fluxo ainda não foi exercitado contra APIs reais ou em GitHub Actions**. Não torne o status obrigatório antes de validar o funcionamento na conta escolhida.

## Fluxo implementado

1. Identificar o PR interno, seu SHA e o repositório por dados da API do GitHub, sem executar arquivos do PR num job que possua credenciais de gerenciamento.
2. Criar uma branch Neon de um projeto exclusivamente de demonstração, com nome que identifica o PR e um endpoint read-write. A branch pai não pode conter dados sensíveis: a cópia inclui dados por padrão.
3. Obter a URL da branch pelo ID explícito e criar um serviço Render separado no plano `free`, já com essa URL de banco. A API do Render permite fornecer variáveis ao criar o serviço; isso evita copiar a configuração de staging. O serviço é ligado à branch do PR.
4. Aguardar e conferir `/version` contra o SHA exato do PR antes de executar E2E e smoke. Como a criação recebe uma branch, e não um SHA, a branch pode avançar durante o deploy: nesse caso a verificação deve falhar, nunca aceitar outro commit.
5. Tentar remover serviço e branch ao fechar o PR. As operações destrutivas conferem nome, ID e proprietário antes de apagar; POSTs não são repetidos automaticamente. Há um acionamento manual de recuperação para PR fechado, mas **não há reconciliador periódico**: falhas, eventos perdidos e respostas ambíguas podem deixar recursos órfãos. Confira-os nas duas plataformas e execute `Preview remoto` por `workflow_dispatch` com o número do PR fechado quando necessário.
6. Publicar o status `preview-render` no SHA de head do PR. Os testes HTTP são os da branch base; o código do PR só é executado no serviço isolado, não no runner privilegiado. Esse status ainda não cobre `merge_group`; não o exija em merge queue até implementar e validar essa integração.

O workflow de preview usa `pull_request_target` para obter o workflow e os scripts confiáveis da base. Nunca faz checkout nem executa código do PR no runner com os segredos Neon e Render. O serviço criado, por sua vez, executa o código do PR e recebe a credencial de seu banco de demonstração. Restrinja os PRs a branches do mesmo repositório e use contas dedicadas sem dados reais. A revisão de IA permanece em `pull_request`, separadamente.

## Configuração

Crie antecipadamente um projeto Neon Free **dedicado a previews**, com branch pai somente de dados fictícios, e um workspace Render **dedicado a previews**. A criação dos serviços de preview utiliza franquias e pode estar sujeita a custos por uso conforme as condições da conta. Não reutilize os bancos ou credenciais de outros projetos.

Em Settings → Secrets and variables → Actions, adicione os secrets `NEON_API_KEY` e `RENDER_PREVIEW_API_KEY`, e as variables `NEON_PROJECT_ID`, `NEON_PARENT_ID`, `NEON_DATABASE`, `NEON_ROLE` e `RENDER_PREVIEW_OWNER_ID`. As chaves precisam ter permissões para criar, listar e excluir recursos nos respectivos projetos/workspaces. Não as coloque no código ou no chat. O projeto Neon Free tem limite de branches, incluindo a principal; vários PRs simultâneos ou órfãos podem esgotá-lo.

Publique primeiro o workflow e os scripts na branch base, abra um PR interno de teste e acompanhe criação, status, SHA, E2E e limpeza. Após validação real, configure `preview-render` como status obrigatório se não usar merge queue. Forks são ignorados e não recebem esse status; se ele for obrigatório, um PR de fork não poderá ser mesclado sem uma política alternativa de validação. Repositório ou base ainda não configurados podem deixar o status ausente ou em falha.

O GitHub também restringe secrets em workflows acionados por Dependabot. Dependendo da configuração da conta, PRs do bot podem falhar no preview ou não conseguir publicá-lo; exigir o status para todos pode impedir o auto-merge. Não configure bypass de proteção como solução automática: valide uma política adequada para o repositório antes de tornar esse status obrigatório.

## Restrições verificadas

- [Preview Environments do Render](https://render.com/docs/preview-environments) exigem workspace Pro. A proposta usa serviços independentes, não esse recurso pago.
- A [API Render de criação](https://api-docs.render.com/reference/create-service) aceita `plan: free` e `envVars`; é necessário validar o fluxo completo na conta e região antes de ativar automação.
- [Neon Free](https://neon.com/pricing) limita branches por projeto e uso de recursos. Confira as cotas antes de ativar e não reutilize um projeto que contenha dados reais.
- O guia Neon documenta expiração de branches, mas a [referência de criação](https://neon.com/docs/reference/api/branches/create-project-branch) informa acesso limitado antecipado para `expires_at`. O fluxo não pode depender desse TTL como única limpeza.
- A API Neon de [connection URI](https://neon.com/docs/reference/api/projects/get-connection-uri) devolve credencial de banco. Não gravá-la em logs, comentários, artefatos ou outputs não mascarados.

Até a configuração e validação real, o CI existente continua usando Postgres efêmero no runner. O serviço Render é público; não inclua dados sensíveis no banco de demonstração.
