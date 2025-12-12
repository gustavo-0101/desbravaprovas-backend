# Regras de Negócio - Backend Desbrava Provas

## 📋 Papéis e Permissões

### Papéis Globais (PapelGlobal)

#### USUARIO (padrão)
- Papel padrão ao criar conta
- Precisa se vincular a um clube para ter acesso às funcionalidades
- Aguarda aprovação do admin do clube

#### MASTER
- Admin global da plataforma
- Acesso total a todos os clubes e provas
- Pode aprovar/bloquear qualquer membro
- Pode criar/editar/deletar qualquer entidade
- **Pode criar provas sem ser membro de um clube** ⭐ (Sessão 07)
  - Fornece `clubeId` explicitamente no body da requisição
  - Ou usa clube onde é membro (se for membro)
- **Pode copiar provas para qualquer clube** ⭐ (Sessão 07)
  - Parâmetro `clubeIdDestino` via query
- **Pode listar provas de qualquer clube** ⭐ (Sessão 07)
  - Parâmetro `clubeId` via query

---

### Papéis dentro do Clube (PapelClube)

#### ADMIN_CLUBE
- Admin do clube específico
- **Criação de Clube**: Pode criar UM clube apenas (necessita aprovação do MASTER)
- Aprova novos membros (conselheiros, diretoria, desbravadores, instrutores)
- Recebe notificações por email de novas solicitações de membros
- Pode criar unidades
- Acesso total às provas do clube
- Pode editar provas de qualquer membro do clube
- **Requisito**: Usuário deve ser aprovado como ADMIN_CLUBE pelo MASTER antes de criar o clube

#### DIRETORIA
- **Cargos Específicos**: Diretor, Diretor Associado, Secretário, Tesoureiro, Capelão
- **Unidade Fixa**:
  - **Diretor e Secretário**: NÃO têm unidade fixa (unidadeId = null)
  - **Demais cargos** (Diretor Associado, Tesoureiro, Capelão): TÊM unidade fixa e atuam também como conselheiros
- **Visualização de Provas**:
  - **Diretor e Secretário**: Acesso total a TODAS as provas do clube (PRIVADAS, UNIDADE, CLUBE, PUBLICA)
  - **Demais cargos**: Mesmas permissões de CONSELHEIRO (apenas provas da sua unidade)
- **Edição**:
  - **Diretor e Secretário**: Podem editar qualquer prova do clube (acesso total como co-autor)
  - **Demais cargos**: Apenas suas próprias provas
- **Criação**: Todos podem criar provas próprias
- **Requisito**: Deve ser batizado

#### CONSELHEIRO
- **Tem unidade fixa obrigatória** (unidadeId != null)
- **Visualização**:
  - Suas próprias provas (PRIVADAS)
  - Provas de UNIDADE da sua unidade
  - Provas de CLUBE
  - Provas PUBLICAS de qualquer clube
- **Edição**: Apenas suas próprias provas
- **Criação**: Cria provas para sua unidade ou clube
- Pode gerar questões automaticamente por IA
- Pode solicitar aprovação para se tornar DIRETORIA
- **Requisito de Idade**: Mínimo 16 anos
- **Nomenclatura Especial**: Se menor de 18 anos = CONSELHEIRO_ASSOCIADO (apenas nomenclatura, sem diferença de permissões)
- **Requisito**: Deve ser batizado

#### INSTRUTOR
- **Tem unidade fixa obrigatória** (unidadeId != null)
- **Atribuição Automática**: Membros NÃO batizados com 18+ anos tornam-se INSTRUTOR automaticamente
- **Permissões**: Similares ao CONSELHEIRO
- **Restrição**: NÃO pode ter cargo de liderança (Diretor, Capitão, etc.)
- **Visualização**: Mesmas regras do CONSELHEIRO
- **Edição**: Apenas suas próprias provas
- **Requisito**: Não batizado + 18+ anos

#### DESBRAVADOR
- **Tem unidade fixa obrigatória** (unidadeId != null)
- **Visualização**:
  - Provas de UNIDADE da sua unidade (somente leitura para responder)
  - Provas de CLUBE (somente leitura para responder)
  - Provas PUBLICAS (somente leitura para responder)
- **Edição**: Não pode editar provas
- **Respostas**: Pode responder provas disponíveis
- Pode visualizar suas notas e histórico
- **Cargos na Unidade**: Capitão, Secretário, Tesoureiro, Padioleiro, Almoxarife, Capelão
- **Requisito de Idade**: Tipicamente entre 10-15 anos

---

## 🔒 Regras de Visibilidade de Provas

### PRIVADA
**Quem pode visualizar:**
- Criador da prova
- DIRETORIA do clube (apenas Diretor e Secretário)
- ADMIN_CLUBE
- MASTER (global)

**Quem pode editar:**
- Criador da prova
- DIRETORIA do clube (apenas Diretor e Secretário)
- ADMIN_CLUBE
- MASTER (global)

**Uso típico**: Rascunhos, provas em desenvolvimento

---

### UNIDADE
**Quem pode visualizar:**
- Criador da prova
- Membros da mesma unidade (CONSELHEIRO, INSTRUTOR, DESBRAVADOR)
- DIRETORIA do clube com cargo Diretor ou Secretário (acesso a todas as unidades)
- ADMIN_CLUBE
- MASTER (global)

**Quem pode editar:**
- Criador da prova
- DIRETORIA do clube (apenas Diretor e Secretário)
- ADMIN_CLUBE
- MASTER (global)

**Quem pode responder:**
- DESBRAVADORES da mesma unidade

**Uso típico**: Provas específicas para uma unidade

---

### CLUBE
**Quem pode visualizar:**
- Todos os membros do clube (qualquer papel, qualquer unidade)

**Quem pode editar:**
- Criador da prova
- DIRETORIA do clube (apenas Diretor e Secretário)
- ADMIN_CLUBE
- MASTER (global)

**Quem pode responder:**
- DESBRAVADORES do clube

**Uso típico**: Provas gerais do clube, avaliações em massa

---

### PUBLICA
**Quem pode visualizar:**
- Qualquer usuário autenticado de qualquer clube

**Quem pode editar:**
- Criador da prova
- DIRETORIA do clube de origem (apenas Diretor e Secretário)
- ADMIN_CLUBE do clube de origem
- MASTER (global)

**Quem pode clonar:**
- Qualquer CONSELHEIRO, INSTRUTOR ou DIRETORIA de qualquer clube
- Clonagem cria uma cópia independente no clube do clonador

**Uso típico**: Banco de provas compartilhadas entre clubes

---

## 🔐 Regras de Edição de Provas

### Quem pode editar uma prova?

1. **Autor da prova** (criadaPorId)
   - Acesso total: título, questões, valores, visibilidade

2. **DIRETORIA do clube (apenas Diretor e Secretário)**
   - Acesso total às provas do clube
   - Pode adicionar/editar/remover questões
   - Pode alterar visibilidade
   - Atua como co-autor

3. **ADMIN_CLUBE**
   - Acesso total às provas do clube
   - Pode moderar conteúdo

4. **MASTER (global)**
   - Acesso total a todas as provas

### Quem NÃO pode editar?

- DIRETORIA com outros cargos (Diretor Associado, Tesoureiro, Capelão) - podem editar apenas suas próprias provas
- CONSELHEIRO de outras unidades (mesmo clube)
- CONSELHEIRO de outros clubes
- INSTRUTOR de outras unidades
- DESBRAVADORES (nunca podem editar)

---

## 🏢 Regras de Criação de Clubes

### Quem pode criar clubes?

**MASTER (Papel Global)**
- Pode criar quantos clubes quiser
- Não precisa de aprovação
- Acesso total a todos os clubes

**ADMIN_CLUBE (Papel no Clube)**
- Pode criar **UM clube apenas**
- **Fluxo de criação:**
  1. Usuário (PapelGlobal = USUARIO) solicita ser ADMIN_CLUBE
  2. MASTER recebe notificação e aprova a solicitação
  3. Após aprovação, o usuário pode criar seu clube
  4. Uma vez criado o clube, não pode criar outro

### Dados obrigatórios do Clube

- **Nome**: Nome completo do clube
- **Slug**: Identificador único (gerado automaticamente ou customizado)
- **Cidade**: Cidade de origem do clube
- **Estado**: Estado/província
- **País**: País
- **Localização no Mapa**: Latitude e Longitude (opcional, mas recomendado)

---

## 👥 Regras de Aprovação de Membros

### Fluxo de Cadastro e Solicitação de Vínculo

1. **Usuário cria conta**: PapelGlobal = USUARIO, status não vinculado
2. **Usuário preenche dados de membro**:
   - Nome completo
   - Data de nascimento
   - Batizado (Sim/Não)
   - Unidade (se CONSELHEIRO, INSTRUTOR ou DESBRAVADOR)
   - Papel desejado (DIRETORIA, CONSELHEIRO, DESBRAVADOR)
   - Cargo específico (se aplicável):
     - DIRETORIA: Diretor, Diretor Associado, Secretário, Tesoureiro, Capelão
     - DESBRAVADOR: Capitão, Secretário, Tesoureiro, Padioleiro, Almoxarife, Capelão
3. **Sistema valida automaticamente**:
   - Se NÃO batizado + 18+ anos → papel = INSTRUTOR (automático)
   - Se CONSELHEIRO solicitado → idade ≥ 16 anos
   - Se CONSELHEIRO + idade < 18 anos → nomenclatura = CONSELHEIRO_ASSOCIADO
4. **StatusMembro = PENDENTE**: Aguarda aprovação
5. **Notificação ao ADMIN_CLUBE**: Email de solicitação de novo membro

### Aprovação

**Quem pode aprovar:**
- ADMIN_CLUBE do clube (recebe email de notificação)
- MASTER (global)

**Processo:**
1. ADMIN_CLUBE revisa solicitação via painel (futuro frontend)
2. Confirma dados do membro
3. Define/confirma papel (CONSELHEIRO, DIRETORIA, DESBRAVADOR, INSTRUTOR)
4. Se CONSELHEIRO, INSTRUTOR ou DESBRAVADOR: confirma unidade obrigatória
5. Se DIRETORIA: unidadeId permanece null
6. StatusMembro = ATIVO
7. Membro recebe email de aprovação

### Validações Automáticas

**Idade mínima para CONSELHEIRO:**
- Deve ter 16+ anos
- Se < 18 anos: exibe como "CONSELHEIRO_ASSOCIADO" (nomenclatura apenas)

**Papel INSTRUTOR (automático):**
- Membro NÃO batizado + 18+ anos = INSTRUTOR
- INSTRUTOR não pode ter cargo de liderança
- Sistema atribui automaticamente este papel

**Batismo:**
- DIRETORIA: Deve ser batizado (obrigatório)
- CONSELHEIRO: Deve ser batizado (obrigatório)
- INSTRUTOR: NÃO batizado (critério de atribuição)
- DESBRAVADOR: Batismo não é obrigatório

### Rejeição/Bloqueio

- **Rejeitar**: Remove o vínculo MembroClube, envia email de rejeição
- **Bloquear**: StatusMembro = BLOQUEADO (membro não pode acessar recursos do clube)

---

## 📝 Regras de Questões

### Questões de Múltipla Escolha

- Campo `tipo` = MULTIPLA_ESCOLHA
- Campo `alternativas` (JSON): { "A": "texto...", "B": "texto...", "C": "...", "D": "...", "E": "..." }
- Campo `respostaCorreta` (String): "A", "B", "C", "D" ou "E"
- Campo `valor` (Int): pontos da questão
- Campo `geradaPorIA` (Boolean): indica se foi gerada automaticamente

### Questões Dissertativas

- Campo `tipo` = DISSERTATIVA
- Campo `alternativas` = null
- Campo `respostaCorreta` = null (não há gabarito automático)
- Campo `valor` (Int): pontos da questão
- **Requer correção manual**: Um conselheiro/diretoria precisa atribuir nota

### Geração por IA

- Apenas CONSELHEIRO, DIRETORIA, ADMIN_CLUBE podem solicitar
- Baseado na especialidade selecionada
- Gera N questões (padrão: 10)
- Marca `geradaPorIA = true`
- Permite edição posterior

---

## 🎯 Regras de Respostas e Correção

### Quem pode responder provas?

- Apenas DESBRAVADORES
- Provas visíveis conforme regras de visibilidade
- Uma resposta por desbravador por prova (não pode refazer)

### Correção Automática

**Quando ocorre:**
- Imediatamente após submissão
- Se a prova contém APENAS questões de múltipla escolha

**Cálculo:**
- Compara resposta com `respostaCorreta`
- Soma valores das questões corretas
- `notaObjetiva` = soma dos valores corretos
- `notaFinal` = notaObjetiva (se não há dissertativas)
- `corrigidaAutomaticamente = true`

### Correção Manual

**Quando necessária:**
- Prova contém pelo menos 1 questão dissertativa
- `precisaCorrecaoManual = true`

**Quem pode corrigir:**
- Autor da prova
- DIRETORIA do clube
- ADMIN_CLUBE
- MASTER

**Processo:**
1. Sistema calcula `notaObjetiva` automaticamente
2. Corretor atribui `notaDissertativa` manualmente
3. Sistema calcula `notaFinal = notaObjetiva + notaDissertativa`
4. `precisaCorrecaoManual = false`

---

## 📸 Regras de OCR (Leitura de Provas Físicas)

### Fluxo

1. **Desbravador tira foto da prova física** preenchida
2. **Sistema processa OCR**:
   - Detecta marcações (X, círculos, etc.)
   - Identifica qual alternativa foi marcada por questão
3. **Sistema preenche RespostaProva automaticamente**
4. **Sistema executa correção automática** (se múltipla escolha)
5. **Desbravador revisa e confirma** antes de submeter definitivamente

### Requisitos

- Foto legível, bem iluminada
- Prova deve ter marcações de alternativas claras
- Gabarito deve estar associado à prova no sistema

---

## 🔄 Regras de Clonagem de Provas

### Quando clonar?

- Prova é PUBLICA
- Conselheiro/Diretoria de outro clube quer usar

### Processo

1. Usuário visualiza prova pública de outro clube
2. Clica "Clonar para meu clube"
3. Sistema cria nova Prova:
   - `clubeId` = clube do clonador
   - `criadaPorId` = usuário que clonou
   - `provaOriginalId` = ID da prova original
   - `visibilidade` = CLUBE (padrão, clonador pode alterar)
4. Copia todas as questões com mesmo conteúdo
5. Prova clonada é **independente** (edições não afetam original)

### Rastreabilidade

- Campo `provaOriginalId` mantém vínculo com original
- Útil para estatísticas e reconhecimento de autores

---

## 🚫 Validações Importantes

### Ao criar MembroClube

- Se `papel = CONSELHEIRO`, `INSTRUTOR` ou `DESBRAVADOR`: `unidadeId` é **obrigatório**
- Se `papel = ADMIN_CLUBE`: `unidadeId` deve ser **null**
- Se `papel = DIRETORIA`:
  - Se `cargoEspecifico = "Diretor"` ou `"Secretário"`: `unidadeId` deve ser **null**
  - Se `cargoEspecifico = "Diretor Associado"`, `"Tesoureiro"` ou `"Capelão"`: `unidadeId` é **obrigatório**

### Ao criar Prova

- **Usuários normais (não MASTER):**
  - `clubeId` é automático (clube onde é membro)
  - Precisa ser membro de um clube
  - Precisa ser CONSELHEIRO, DIRETORIA, ADMIN_CLUBE ou INSTRUTOR
- **MASTER:**
  - Pode fornecer `clubeId` explicitamente (opcional)
  - Se não fornecer `clubeId`: usa clube onde é membro
  - Se não for membro de nenhum clube: precisa fornecer `clubeId`
  - Não precisa ter papel de clube específico
- Se `visibilidade = UNIDADE`: `unidadeId` é **obrigatório**

### Ao responder Prova

- Usuário deve ser DESBRAVADOR
- Deve ter acesso à prova conforme regras de visibilidade
- Não pode ter respondido essa prova antes

### Ao editar Prova

- Validar permissão (autor, diretoria do clube, admin)
- Se já foi respondida: não pode mudar gabarito (evitar fraude)
- Pode adicionar/editar questões, mas avisar que afetará correções futuras

---

## 📊 Resumo de Permissões

| Ação | DESBRAVADOR | INSTRUTOR | CONSELHEIRO | DIRETORIA¹ | DIRETORIA² | ADMIN_CLUBE | MASTER |
|------|-------------|-----------|-------------|-----------|-----------|-------------|--------|
| Ver provas PRIVADAS (próprias) | ❌ | ✅ (só suas) | ✅ (só suas) | ✅ (só suas) | ✅ (todas do clube) | ✅ | ✅ |
| Ver provas UNIDADE | ✅ (só sua unidade) | ✅ (só sua unidade) | ✅ (só sua unidade) | ✅ (só sua unidade) | ✅ (todas) | ✅ | ✅ |
| Ver provas CLUBE | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver provas PUBLICAS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar provas | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar provas próprias | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar provas de outros | ❌ | ❌ | ❌ | ❌ | ✅ (do clube) | ✅ (do clube) | ✅ |
| Responder provas | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Corrigir provas | ❌ | ✅ (só suas) | ✅ (só suas) | ✅ (só suas) | ✅ (todas do clube) | ✅ | ✅ |
| Aprovar membros | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Criar clubes | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (1 clube) | ✅ (ilimitado) |
| Clonar provas públicas | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gerar questões por IA | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ter cargo de liderança | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legenda:**
- **DIRETORIA¹**: Diretor Associado, Tesoureiro, Capelão (têm unidade fixa)
- **DIRETORIA²**: Diretor, Secretário (sem unidade fixa, acesso total)

---

**Última atualização**: 2025-12-11
**Versão**: 1.3 - Sessão 07: MASTER pode criar/copiar/listar provas sem ser membro de clube
