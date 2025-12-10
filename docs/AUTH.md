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
