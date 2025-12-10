# Documentação de Autenticação

## Visão Geral

Sistema de autenticação JWT (JSON Web Tokens) com bcrypt para hashing de senhas.

## Tecnologias

- **JWT**: Tokens stateless para autenticação
- **Passport**: Middleware de autenticação (JWT + Google OAuth2)
- **Bcrypt**: Hashing de senhas (10 salt rounds)
- **Google OAuth2**: Login social com Google
- **class-validator**: Validação de DTOs

## Configuração

### Variáveis de Ambiente

```env
JWT_SECRET="dev-secret-key-change-in-production-2024"
JWT_EXPIRES_IN="24h"
```

⚠️ **IMPORTANTE**: Altere `JWT_SECRET` em produção para uma chave forte e aleatória.

## Endpoints

### POST /auth/registro

Registra novo usuário no sistema.

**Request Body:**
```json
{
  "nome": "João Silva",
  "email": "joao@exemplo.com",
  "senha": "senha123"
}
```

**Validações:**
- `nome`: 3-100 caracteres
- `email`: formato válido
- `senha`: mínimo 6 caracteres

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@exemplo.com",
    "papelGlobal": "USUARIO",
    "fotoPerfilUrl": null
  }
}
```

**Erros:**
- `409 Conflict`: Email já cadastrado
- `400 Bad Request`: Dados inválidos

---

### POST /auth/login

Autentica usuário existente.

**Request Body:**
```json
{
  "email": "joao@exemplo.com",
  "senha": "senha123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@exemplo.com",
    "papelGlobal": "USUARIO",
    "fotoPerfilUrl": null
  }
}
```

**Erros:**
- `401 Unauthorized`: Email ou senha inválidos
- `400 Bad Request`: Dados inválidos

---

### GET /auth/perfil

Retorna dados do usuário autenticado.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "id": 1,
  "nome": "João Silva",
  "email": "joao@exemplo.com",
  "papelGlobal": "USUARIO",
  "fotoPerfilUrl": null
}
```

**Erros:**
- `401 Unauthorized`: Token inválido, expirado ou ausente

---

### GET /auth/verificar-email

Verifica o email do usuário usando o token enviado por email após o registro.

**Query Parameters:**
- `token`: Token de verificação (string, required)

**Exemplo:**
```
GET /auth/verificar-email?token=abc123def456...
```

**Response (200):**
```json
{
  "message": "Email verificado com sucesso!"
}
```

**Comportamento:**
1. Marca o email como verificado no banco de dados
2. Remove o token de verificação
3. Envia email de boas-vindas automaticamente

**Erros:**
- `400 Bad Request`: Token inválido ou email já verificado

---

### POST /auth/reenviar-verificacao

Reenvia o email de verificação para o usuário.

**Request Body:**
```json
{
  "email": "joao@exemplo.com"
}
```

**Response (200):**
```json
{
  "message": "Email de verificação reenviado com sucesso!"
}
```

**Validações:**
- Email deve estar cadastrado no sistema
- Email não pode estar verificado
- Usuário não pode ter feito login com Google

**Erros:**
- `400 Bad Request`:
  - Usuário não encontrado
  - Email já verificado
  - Usuário usa login com Google

---

## Verificação de Email

### Fluxo Completo

1. **Registro**: Usuário se cadastra com email/senha
2. **Token Gerado**: Sistema gera token único de 64 caracteres (hex)
3. **Email Enviado**: Email com link de verificação é enviado
4. **Verificação**: Usuário clica no link e verifica o email
5. **Boas-vindas**: Sistema envia email de boas-vindas automaticamente

### Template do Email de Verificação

O email de verificação contém:
- Saudação personalizada com nome do usuário
- Botão clicável para verificar email
- Link alternativo caso o botão não funcione
- Design responsivo e profissional

**Link de verificação:**
```
http://localhost:3000/auth/verificar-email?token=abc123def456...
```

### Template do Email de Boas-vindas

Enviado automaticamente após verificação bem-sucedida:
- Confirmação de email verificado
- Botão para acessar a plataforma
- Mensagem de boas-vindas

### Configuração de Email

Adicione as seguintes variáveis ao `.env`:

```env
# Email Configuration (NodeMailer)
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USER="seu-email@gmail.com"
MAIL_PASS="sua-app-password"
MAIL_FROM="noreply@desbravaprovas.com"

# Application URL
APP_URL="http://localhost:3000"
```

**Para Gmail:**
1. Ative a verificação em duas etapas
2. Gere uma App Password: https://support.google.com/accounts/answer/185833
3. Use a App Password no `MAIL_PASS`

### Segurança do Token

- **Geração**: `crypto.randomBytes(32).toString('hex')` - 64 caracteres hexadecimais
- **Unicidade**: Garantida pelo Prisma (`@unique`)
- **Validade**: Sem expiração automática (pode ser implementado)
- **One-time use**: Token é removido após verificação

### Casos Especiais

**Usuários Google OAuth:**
- Não recebem email de verificação
- `emailVerificado` é automaticamente `true`
- Não podem reenviar verificação

**Alteração de Email:**
- Se usuário alterar email, `emailVerificado` volta para `false`
- Novo token é gerado automaticamente
- Novo email de verificação é enviado

---

## Recuperação de Senha

Sistema de recuperação de senha com tokens temporários que expiram em 1 hora.

### POST /auth/solicitar-recuperacao-senha

Solicita recuperação de senha enviando email com link.

**Request Body:**
```json
{
  "email": "usuario@exemplo.com"
}
```

**Response (200):**
```json
{
  "message": "Se o email existir, um link de recuperação será enviado."
}
```

**Comportamento:**
1. Verifica se email existe no banco
2. Valida que não é usuário Google (não tem senha)
3. Gera token de recuperação (64 caracteres hex)
4. Define expiração do token (1 hora)
5. Envia email com link de recuperação
6. Retorna mensagem genérica (segurança: não revela se email existe)

**Erros:**
- `400 Bad Request`: Usuário usa login com Google

---

### POST /auth/redefinir-senha

Redefine a senha usando o token recebido por email.

**Request Body:**
```json
{
  "token": "abc123def456...",
  "novaSenha": "novaSenha123"
}
```

**Validações:**
- `token`: string (required)
- `novaSenha`: mínimo 6 caracteres (required)

**Response (200):**
```json
{
  "message": "Senha redefinida com sucesso!"
}
```

**Comportamento:**
1. Busca usuário por `tokenRecuperacaoSenha`
2. Valida se token não expirou (1 hora)
3. Faz hash da nova senha com bcrypt
4. Atualiza senha no banco
5. Remove token de recuperação
6. Retorna mensagem de sucesso

**Erros:**
- `400 Bad Request`:
  - Token de recuperação inválido
  - Token de recuperação expirado

---

### Fluxo Completo de Recuperação

1. **Solicitação**: Usuário esquece senha e clica em "Esqueci minha senha"
2. **Formulário**: Usuário informa seu email
3. **Token Gerado**: Sistema gera token único de 64 caracteres
4. **Expiração**: Token válido por 1 hora
5. **Email Enviado**: Email com link de recuperação
6. **Redefinição**: Usuário clica no link e define nova senha
7. **Limpeza**: Token é removido após uso

### Template do Email de Recuperação

O email de recuperação contém:
- Saudação personalizada com nome do usuário
- Aviso de validade do link (1 hora)
- Botão call-to-action "Redefinir Senha"
- Mensagem de segurança (ignorar se não solicitou)
- Link alternativo em texto
- Design responsivo com cores de alerta (#dc2626 - vermelho)

**Link de recuperação:**
```
http://localhost:3000/auth/redefinir-senha?token=abc123def456...
```

### Segurança do Token de Recuperação

- **Geração**: `crypto.randomBytes(32).toString('hex')` - 64 caracteres hexadecimais
- **Unicidade**: Garantida pelo Prisma (`@unique`)
- **Expiração**: 1 hora (3600 segundos)
- **One-time use**: Token é removido após uso
- **Validação de expiração**: Comparação com `Date.now()`

### Casos Especiais

**Usuários Google OAuth:**
- Não podem solicitar recuperação de senha
- Lança erro: "Usuários que fazem login com Google não podem recuperar senha"
- Devem usar login do Google

**Múltiplas Solicitações:**
- Cada nova solicitação sobrescreve o token anterior
- Apenas o token mais recente é válido
- Tokens antigos são invalidados automaticamente

**Email Não Cadastrado:**
- Retorna mensagem genérica (não revela se email existe)
- Medida de segurança contra enumeração de usuários
- "Se o email existir, um link de recuperação será enviado."

**Token Expirado:**
- Usuário deve solicitar nova recuperação
- Mensagem clara: "Token de recuperação expirado"

---

## Google OAuth2

Sistema de autenticação com Google (Login Social).

### Configuração

#### 1. Obter Credenciais no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crie um novo projeto ou selecione existente
3. Vá em "Credenciais" → "Criar credenciais" → "ID do cliente OAuth 2.0"
4. Configure tela de consentimento se necessário
5. Tipo de aplicativo: "Aplicativo da Web"
6. Adicione URI de redirecionamento autorizado:
   ```
   http://localhost:3000/auth/google/callback
   ```
7. Copie "ID do cliente" e "Chave secreta do cliente"

#### 2. Configurar Variáveis de Ambiente

Adicione ao `.env`:

```env
GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="seu-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"
```

### Endpoints

#### GET /auth/google

Inicia o fluxo de autenticação com Google.

**Ação:**
- Redireciona usuário para tela de login do Google
- Solicita permissões: email, profile

**Uso no navegador:**
```
http://localhost:3000/auth/google
```

**Fluxo:**
1. Usuário acessa `/auth/google`
2. É redirecionado para tela de login do Google
3. Faz login com conta Google
4. Autoriza acesso ao email e perfil
5. É redirecionado para `/auth/google/callback`

---

#### GET /auth/google/callback

Recebe resposta do Google e retorna JWT.

**Query Parameters (automático):**
- `code`: código de autorização do Google
- `state`: token CSRF (opcional)

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 5,
    "nome": "Maria Santos",
    "email": "maria@gmail.com",
    "papelGlobal": "USUARIO",
    "fotoPerfilUrl": "https://lh3.googleusercontent.com/a/..."
  }
}
```

**Comportamentos:**

1. **Novo usuário Google:**
   - Cria conta automaticamente
   - Email marcado como verificado
   - Foto do Google salva
   - Retorna JWT

2. **Usuário existente (por email):**
   - Vincula `googleId` à conta existente
   - Atualiza foto se não tiver
   - Marca email como verificado
   - Retorna JWT

3. **Usuário Google existente:**
   - Login direto
   - Retorna JWT

**Erros:**
- `401 Unauthorized`: Falha na autenticação Google
- `500 Internal Server Error`: Erro ao processar dados do Google

### FindOrCreate Pattern

O sistema implementa o padrão **findOrCreate** para Google OAuth:

```typescript
// Pseudo-código
async loginComGoogle(googleUser) {
  // 1. Busca por googleId
  let usuario = buscarPorGoogleId(googleUser.googleId);

  // 2. Se não encontrou, busca por email
  if (!usuario) {
    usuario = buscarPorEmail(googleUser.email);

    // 3. Se encontrou por email, vincula Google
    if (usuario) {
      usuario.googleId = googleUser.googleId;
      usuario.emailVerificado = true;
    }
  }

  // 4. Se ainda não encontrou, cria novo
  if (!usuario) {
    usuario = criar({
      googleId: googleUser.googleId,
      email: googleUser.email,
      nome: googleUser.nome,
      fotoPerfilUrl: googleUser.foto,
      emailVerificado: true,
      senhaHash: null  // Sem senha
    });
  }

  // 5. Retorna JWT
  return gerarToken(usuario);
}
```

### Características

✅ **Sem senha** - Usuários Google não têm senha (campo `senhaHash` = null)
✅ **Email verificado** - Automaticamente marcado como verificado
✅ **Foto de perfil** - Importada do Google automaticamente
✅ **Vinculação automática** - Se email já existe, vincula conta Google
✅ **Criação automática** - Se novo usuário, cria sem intervenção

### Segurança

- **OAuth 2.0** - Protocolo padrão de autenticação
- **HTTPS obrigatório** em produção
- **Escopo mínimo** - Apenas email e profile
- **Sem armazenamento de tokens Google** - Apenas dados do perfil
- **Validação de email** pelo Google

### Uso no Frontend

#### React/Vue/Angular

```javascript
// Botão de login
<a href="http://localhost:3000/auth/google">
  <button>Login com Google</button>
</a>

// Processar callback
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('access_token');

  if (token) {
    localStorage.setItem('token', token);
    // Redirecionar para dashboard
  }
}, []);
```

#### Mobile (React Native)

```javascript
import { WebBrowser } from 'expo-web-browser';

async function loginComGoogle() {
  const result = await WebBrowser.openAuthSessionAsync(
    'http://localhost:3000/auth/google',
    'myapp://callback'
  );

  if (result.type === 'success') {
    const token = extractToken(result.url);
    await AsyncStorage.setItem('token', token);
  }
}
```

### Limitações de Usuários Google

Usuários que fazem login com Google:

❌ **Não podem** alterar senha (não têm senha)
❌ **Não podem** fazer login com email/senha
✅ **Podem** atualizar nome e dados do perfil
✅ **Podem** deletar conta normalmente

**Tentativa de alterar senha:**
```json
PATCH /usuarios/5/senha
{
  "senhaAtual": "qualquer",
  "novaSenha": "nova123"
}

Response: 401 Unauthorized
{
  "message": "Usuários que fazem login com Google não possuem senha"
}
```

### Troubleshooting

#### "Redirect URI mismatch"

- Verifique se o URI no Google Console é exatamente:
  ```
  http://localhost:3000/auth/google/callback
  ```
- Em produção, adicione o domínio real

#### "Access blocked: This app's request is invalid"

- Tela de consentimento não configurada
- Configure em "APIs e Serviços" → "Tela de consentimento OAuth"

#### "Error: The OAuth client was not found"

- `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET` incorretos
- Verifique credenciais no `.env`

---

## Papéis de Clube e Permissões

A partir da **Sessão 04**, o sistema implementa um modelo hierárquico de permissões com **Papéis Globais** e **Papéis de Clube**.

### Papéis Globais (PapelGlobal)

Definidos no modelo `Usuario`:

| Papel | Descrição | Permissões |
|-------|-----------|------------|
| **USUARIO** | Usuário comum | Pode participar de clubes |
| **MASTER** | Administrador do sistema | Acesso total, pode criar clubes ilimitados |

### Papéis de Clube (PapelClube)

Definidos no modelo `MembroClube`:

| Papel | Descrição | Unidade Fixa | Criação de Clubes |
|-------|-----------|--------------|-------------------|
| **ADMIN_CLUBE** | Administrador do clube | Não | Pode criar 1 clube (requer aprovação MASTER) |
| **DIRETORIA** | Diretoria do clube | Depende do cargo* | Não |
| **CONSELHEIRO** | Conselheiro de unidade | Sim | Não |
| **INSTRUTOR** | Instrutor (não batizado, 18+) | Sim | Não |
| **DESBRAVADOR** | Desbravador | Sim | Não |

*\*Cargos da DIRETORIA:*
- **Diretor, Secretário**: Não têm unidade fixa, acesso total às provas do clube
- **Demais cargos** (Diretor Associado, Tesoureiro, Capelão): Têm unidade fixa, permissões de CONSELHEIRO

### Regras de Negócio

#### Criação de Clubes

```typescript
// Apenas MASTER e ADMIN_CLUBE podem criar clubes
POST /clubes
Authorization: Bearer <token>

// MASTER: clubes ilimitados
// ADMIN_CLUBE: máximo 1 clube (validado no backend)
```

#### Vinculação a Clubes

```typescript
// Qualquer usuário autenticado pode solicitar vínculo
POST /membros/solicitar-vinculo
{
  "clubeId": 1,
  "papelDesejado": "CONSELHEIRO",
  "dataNascimento": "2000-01-15",
  "batizado": true,
  "unidadeId": 1,          // obrigatório para CONSELHEIRO/INSTRUTOR/DESBRAVADOR
  "cargoEspecifico": null  // obrigatório para DIRETORIA/DESBRAVADOR
}
```

**Ajustes Automáticos:**
- Se **não batizado** + **18+ anos** → papel alterado para **INSTRUTOR** automaticamente
- Solicitação fica com `status: PENDENTE` aguardando aprovação

#### Aprovação de Membros

```typescript
// Apenas ADMIN_CLUBE do clube ou MASTER podem aprovar
POST /membros/:id/aprovar
Authorization: Bearer <token>
{
  "papel": "CONSELHEIRO",
  "unidadeId": 1,
  "cargoEspecifico": null
}
```

**Validações:**
- **CONSELHEIRO**: idade mínima 16 anos, deve ser batizado
- **DIRETORIA**: deve ser batizado
- **INSTRUTOR**: NÃO deve ser batizado, idade mínima 18 anos

**Notificações por Email:**
- ADMIN_CLUBE recebe email quando há nova solicitação
- Membro recebe email quando aprovado ou rejeitado

#### Permissões por Papel

**MASTER:**
- ✅ Criar clubes ilimitados
- ✅ Aprovar/rejeitar membros de qualquer clube
- ✅ Editar/remover membros de qualquer clube
- ✅ Acesso total ao sistema

**ADMIN_CLUBE:**
- ✅ Criar 1 clube (campo `clubeCriadoId` no Usuario)
- ✅ Aprovar/rejeitar membros do seu clube
- ✅ Editar/remover membros do seu clube
- ✅ Gerenciar unidades do seu clube
- ❌ Não pode aprovar membros de outros clubes

**DIRETORIA (Diretor, Secretário):**
- ✅ Visualizar todas as provas do clube
- ✅ Sem unidade fixa (`unidadeId = null`)
- ❌ Não aprovam/rejeitam membros

**DIRETORIA (outros cargos):**
- ✅ Mesmas permissões de CONSELHEIRO
- ✅ Vinculado a uma unidade específica

**CONSELHEIRO/INSTRUTOR:**
- ✅ Visualizar provas da sua unidade
- ✅ Vinculado a uma unidade específica
- ❌ Não gerenciam membros

**DESBRAVADOR:**
- ✅ Participar de atividades da unidade
- ✅ Vinculado a uma unidade específica
- ❌ Sem permissões administrativas

### Hierarquia de Verificação

```typescript
// Pattern triple-check implementado nos services
const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;
const ehAdminClube = await prisma.membroClube.findFirst({
  where: {
    usuarioId: usuario.id,
    clubeId: clube.id,
    papel: PapelClube.ADMIN_CLUBE,
    status: StatusMembro.ATIVO
  }
});

if (!ehMaster && !ehAdminClube) {
  throw new ForbiddenException('Sem permissão');
}
```

### Status de Membros

| Status | Descrição |
|--------|-----------|
| **PENDENTE** | Aguardando aprovação do ADMIN_CLUBE |
| **ATIVO** | Membro aprovado e ativo no clube |
| **BLOQUEADO** | Membro bloqueado (não implementado) |

### Endpoints de Clubes

```typescript
// Criar clube (MASTER ou ADMIN_CLUBE)
POST /clubes
Authorization: Bearer <token>

// Listar clubes (público)
GET /clubes

// Buscar clube (público)
GET /clubes/:id

// Atualizar clube (MASTER ou criador)
PATCH /clubes/:id

// Remover clube (MASTER ou criador)
DELETE /clubes/:id
```

### Endpoints de Unidades

```typescript
// Criar unidade (MASTER ou ADMIN_CLUBE)
POST /unidades
Authorization: Bearer <token>

// Listar unidades (público, filtro por clubeId)
GET /unidades?clubeId=1

// Buscar unidade (público)
GET /unidades/:id

// Atualizar unidade (MASTER ou ADMIN_CLUBE)
PATCH /unidades/:id

// Remover unidade (MASTER ou ADMIN_CLUBE)
// Falha se unidade tiver membros vinculados
DELETE /unidades/:id
```

### Endpoints de Membros

```typescript
// Solicitar vínculo (autenticado)
POST /membros/solicitar-vinculo
Authorization: Bearer <token>

// Aprovar membro (MASTER ou ADMIN_CLUBE)
POST /membros/:id/aprovar
Authorization: Bearer <token>

// Rejeitar membro (MASTER ou ADMIN_CLUBE)
DELETE /membros/:id/rejeitar
Authorization: Bearer <token>

// Listar solicitações pendentes (MASTER ou ADMIN_CLUBE)
GET /membros/solicitacoes/:clubeId
Authorization: Bearer <token>

// Listar membros (público, filtro por clubeId)
GET /membros?clubeId=1

// Buscar membro (público)
GET /membros/:id

// Atualizar membro (MASTER ou ADMIN_CLUBE)
PATCH /membros/:id
Authorization: Bearer <token>

// Remover membro (MASTER, ADMIN_CLUBE ou próprio membro)
DELETE /membros/:id
Authorization: Bearer <token>
```

### Decorator GetUser

Novo decorator para extrair dados do usuário autenticado:

```typescript
import { GetUser } from '../common/decorators/get-user.decorator';

@Post('solicitar-vinculo')
@UseGuards(JwtAuthGuard)
solicitarVinculo(
  @Body() dto: SolicitarVinculoDto,
  @GetUser('sub') usuarioId: number  // Extrai apenas o ID
) {
  return this.membrosService.solicitarVinculo(dto, usuarioId);
}

// Ou extrair usuário completo
@Get('perfil')
@UseGuards(JwtAuthGuard)
getPerfil(@GetUser() user: any) {
  return user;
}
```

### Emails de Notificação

**Nova Solicitação (para ADMIN_CLUBE):**
```
Assunto: Nova solicitação de membro - [Nome do Clube]
Cor: #7c3aed (roxo)
Conteúdo:
- Nome e email do solicitante
- Papel desejado
- Unidade (se aplicável)
- Link para painel de gerenciamento
```

**Solicitação Aprovada (para membro):**
```
Assunto: Bem-vindo ao [Nome do Clube]! - Desbrava Provas
Cor: #10b981 (verde)
Conteúdo:
- Confirmação de aprovação
- Papel aprovado
- Unidade (se aplicável)
- Link para acessar plataforma
```

**Solicitação Rejeitada (para membro):**
```
Assunto: Atualização sobre sua solicitação - [Nome do Clube]
Cor: #f59e0b (laranja/amarelo)
Conteúdo:
- Informação de não aprovação
- Mensagem de encorajamento
- Link para voltar à plataforma
```

---

## Arquitetura

### Fluxo de Autenticação

```
1. Cliente envia credenciais para /auth/login
2. AuthService valida email e senha (bcrypt)
3. Se válido, gera token JWT
4. Cliente recebe token
5. Cliente envia token no header Authorization em requisições futuras
6. JwtAuthGuard valida token
7. JwtStrategy extrai e valida usuário
8. Request.user é populado com dados do usuário
```

### Componentes

#### DTOs (Data Transfer Objects)

**LoginDto**
- `email`: string (required, email format)
- `senha`: string (required)

**RegistroDto**
- `nome`: string (required, 3-100 chars)
- `email`: string (required, email format)
- `senha`: string (required, min 6 chars)

#### Guards

**JwtAuthGuard**
- Protege rotas que requerem autenticação
- Respeita decorator `@Public()`
- Valida token JWT automaticamente

**RolesGuard**
- Autoriza acesso baseado em papéis globais
- Usado em conjunto com `@Roles()`
- Deve ser aplicado APÓS JwtAuthGuard

#### Decorators

**@Public()**
```typescript
@Public()
@Get('public-info')
getInfo() { ... }
```

**@Roles(...roles)**
```typescript
@Roles('MASTER', 'ADMIN_CLUBE')
@Post('admin-only')
adminAction() { ... }
```

**@CurrentUser(field?)**
```typescript
// Usuário completo
verPerfil(@CurrentUser() user: CurrentUserType) { ... }

// Apenas ID
criar(@CurrentUser('id') userId: number) { ... }
```

#### Strategies

**JwtStrategy**
- Extende PassportStrategy
- Valida token JWT
- Busca usuário no banco
- Popula `request.user`

**GoogleStrategy**
- Extende PassportStrategy (Strategy 'google')
- Redireciona para login do Google
- Recebe dados do perfil Google
- Implementa findOrCreate pattern
- Popula `request.user` com dados do Google

**Payload JWT:**
```typescript
{
  sub: number;        // ID do usuário
  email: string;
  papelGlobal: string;
  iat?: number;       // issued at
  exp?: number;       // expiration
}
```

## Uso em Controllers

### Proteção Básica (Autenticação)

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards';
import { CurrentUser } from './auth/decorators';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)  // Todas as rotas requerem autenticação
export class UsuariosController {

  @Get('me')
  getMe(@CurrentUser() user: CurrentUserType) {
    return user;
  }
}
```

### Proteção com Papéis (Autorização)

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from './auth/guards';
import { Roles } from './auth/decorators';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)  // Ordem importa!
export class AdminController {

  @Post('action')
  @Roles('MASTER')  // Apenas MASTER
  masterAction() { ... }

  @Post('clube-action')
  @Roles('MASTER', 'ADMIN_CLUBE')  // MASTER OU ADMIN_CLUBE
  clubeAction() { ... }
}
```

### Rotas Públicas

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators';

@Controller('info')
export class InfoController {

  @Public()  // Não requer autenticação
  @Get('status')
  getStatus() {
    return { status: 'ok' };
  }
}
```

## Segurança

### Boas Práticas Implementadas

✅ Senhas nunca armazenadas em texto plano (bcrypt)
✅ Senhas nunca retornadas em respostas
✅ Tokens com expiração (24h padrão)
✅ Validação de entrada com class-validator
✅ Whitelist de propriedades (ValidationPipe)
✅ Logging de tentativas de login

### Melhorias Futuras (Produção)

- [ ] Rate limiting em endpoints de auth
- [ ] Refresh tokens
- [ ] Blacklist de tokens (logout)
- [ ] 2FA (Two-Factor Authentication)
- [ ] Account lockout após X tentativas
- [ ] Auditoria de logins
- [ ] Tokens curtos + refresh token longo

## Testes

### Unitários

```bash
npm test -- auth.service.spec.ts
```

Cobre:
- Login com credenciais válidas
- Login com email inexistente
- Login com senha incorreta
- Registro de novo usuário
- Registro com email duplicado
- Verificação de token

### E2E

```bash
npm run test:e2e -- auth.e2e-spec.ts
```

Cobre:
- Fluxo completo: Registro → Login → Perfil
- Validação de DTOs
- Códigos de status HTTP
- Proteção de rotas

## Troubleshooting

### "Token inválido ou expirado"

- Verifique se o token está no formato: `Bearer <token>`
- Token pode ter expirado (24h padrão)
- Faça login novamente para obter novo token

### "Email já cadastrado"

- Email deve ser único no sistema
- Use endpoint GET /auth/perfil para verificar se já está logado

### "Email ou senha inválidos"

- Verifique credenciais
- Email é case-sensitive no banco
- Senha deve ter no mínimo 6 caracteres

## Swagger

Documentação interativa disponível em:
```
http://localhost:3000/api-docs
```

Use o botão "Authorize" no Swagger para testar endpoints protegidos.
