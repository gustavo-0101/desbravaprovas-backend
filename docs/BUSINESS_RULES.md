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

---

### Papéis dentro do Clube (PapelClube)

#### ADMIN_CLUBE
- Admin do clube específico
- Aprova novos membros (conselheiros, diretoria, desbravadores)
- Pode criar unidades
- Acesso total às provas do clube
- Pode editar provas de qualquer membro do clube

#### DIRETORIA
- **NÃO tem unidade fixa** (unidadeId = null)
- **Visualização**: Acessa TODAS as provas do clube, independente da visibilidade:
  - Provas PRIVADAS de outros conselheiros
  - Provas de UNIDADE de qualquer unidade
  - Provas de CLUBE
- **Edição**: Pode editar qualquer prova do clube (acesso total como co-autor)
- **Criação**: Pode criar provas próprias
- Função: supervisionar e auxiliar na criação de conteúdo do clube

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

#### DESBRAVADOR
- **Tem unidade fixa obrigatória** (unidadeId != null)
- **Visualização**:
  - Provas de UNIDADE da sua unidade (somente leitura para responder)
  - Provas de CLUBE (somente leitura para responder)
  - Provas PUBLICAS (somente leitura para responder)
- **Edição**: Não pode editar provas
- **Respostas**: Pode responder provas disponíveis
- Pode visualizar suas notas e histórico

---

## 🔒 Regras de Visibilidade de Provas

### PRIVADA
**Quem pode visualizar:**
- Criador da prova
- DIRETORIA do clube
- ADMIN_CLUBE
- MASTER (global)

**Quem pode editar:**
- Criador da prova
- DIRETORIA do clube
- ADMIN_CLUBE
- MASTER (global)

**Uso típico**: Rascunhos, provas em desenvolvimento

---

### UNIDADE
**Quem pode visualizar:**
- Criador da prova
- Membros da mesma unidade (CONSELHEIRO, DESBRAVADOR)
- DIRETORIA do clube (todas as unidades)
- ADMIN_CLUBE
- MASTER (global)

**Quem pode editar:**
- Criador da prova
- DIRETORIA do clube
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
- DIRETORIA do clube
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
- DIRETORIA do clube de origem
- ADMIN_CLUBE do clube de origem
- MASTER (global)

**Quem pode clonar:**
- Qualquer CONSELHEIRO ou DIRETORIA de qualquer clube
- Clonagem cria uma cópia independente no clube do clonador

**Uso típico**: Banco de provas compartilhadas entre clubes

---

## 🔐 Regras de Edição de Provas

### Quem pode editar uma prova?

1. **Autor da prova** (criadaPorId)
   - Acesso total: título, questões, valores, visibilidade

2. **DIRETORIA do clube do autor**
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

- CONSELHEIRO de outras unidades (mesmo clube)
- CONSELHEIRO de outros clubes
- DESBRAVADORES (nunca podem editar)

---

## 👥 Regras de Aprovação de Membros

### Fluxo de Cadastro

1. **Usuário cria conta**: PapelGlobal = USUARIO, status não vinculado
2. **Usuário solicita vínculo ao clube**: Escolhe papel desejado (CONSELHEIRO, DIRETORIA, DESBRAVADOR)
3. **StatusMembro = PENDENTE**: Aguarda aprovação
4. **Notificação ao ADMIN_CLUBE**: Email/notificação de nova solicitação

### Aprovação

**Quem pode aprovar:**
- ADMIN_CLUBE do clube
- MASTER (global)

**Processo:**
1. Admin revisa solicitação
2. Define/confirma papel (CONSELHEIRO, DIRETORIA, DESBRAVADOR)
3. Se CONSELHEIRO ou DESBRAVADOR: atribui unidade obrigatória
4. Se DIRETORIA: unidadeId permanece null
5. StatusMembro = ATIVO

### Rejeição/Bloqueio

- Rejeitar: Remove o vínculo MembroClube
- Bloquear: StatusMembro = BLOQUEADO (membro não pode acessar)

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

- Se `papel = CONSELHEIRO` ou `DESBRAVADOR`: `unidadeId` é **obrigatório**
- Se `papel = DIRETORIA` ou `ADMIN_CLUBE`: `unidadeId` deve ser **null**

### Ao criar Prova

- `clubeId` deve ser o clube do criador
- Se `visibilidade = UNIDADE`: `unidadeId` é **obrigatório**
- Criador deve ser CONSELHEIRO, DIRETORIA ou ADMIN_CLUBE

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

| Ação | DESBRAVADOR | CONSELHEIRO | DIRETORIA | ADMIN_CLUBE | MASTER |
|------|-------------|-------------|-----------|-------------|--------|
| Ver provas PRIVADAS (próprias) | ❌ | ✅ (só suas) | ✅ (todas do clube) | ✅ | ✅ |
| Ver provas UNIDADE | ✅ (só sua unidade) | ✅ (só sua unidade) | ✅ (todas) | ✅ | ✅ |
| Ver provas CLUBE | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver provas PUBLICAS | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar provas | ❌ | ✅ | ✅ | ✅ | ✅ |
| Editar provas próprias | ❌ | ✅ | ✅ | ✅ | ✅ |
| Editar provas de outros | ❌ | ❌ | ✅ (do clube) | ✅ (do clube) | ✅ |
| Responder provas | ✅ | ❌ | ❌ | ❌ | ❌ |
| Corrigir provas | ❌ | ✅ (só suas) | ✅ (todas do clube) | ✅ | ✅ |
| Aprovar membros | ❌ | ❌ | ❌ | ✅ | ✅ |
| Clonar provas públicas | ❌ | ✅ | ✅ | ✅ | ✅ |
| Gerar questões por IA | ❌ | ✅ | ✅ | ✅ | ✅ |

---

**Última atualização**: 2025-12-04
**Versão**: 1.1 - Adicionado papel DIRETORIA
