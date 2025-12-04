# API Reference - Desbrava Provas

## 📍 Base URL

```
Development: http://localhost:3000
Production: https://api.desbravaprovas.com (futuro)
```

## 📖 Documentação Interativa

**Swagger UI**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

A documentação Swagger é gerada automaticamente e contém todos os endpoints, schemas, e exemplos de requisição/resposta.

---

## 🔐 Autenticação

A API usa **JWT (JSON Web Tokens)** para autenticação.

### Obter Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "senha": "senha123"
}
```

**Resposta**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "usuario@exemplo.com",
    "papelGlobal": "USUARIO"
  }
}
```

### Usar Token

Inclua o token no header `Authorization` de todas as requisições protegidas:

```http
GET /provas
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🚀 Exemplos de Uso

### 1. Cadastro e Login

#### Criar Conta

```bash
curl -X POST http://localhost:3000/auth/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "email": "joao@exemplo.com",
    "senha": "senha123"
  }'
```

**Resposta**: `201 Created`
```json
{
  "id": 1,
  "nome": "João Silva",
  "email": "joao@exemplo.com",
  "papelGlobal": "USUARIO",
  "criadoEm": "2025-12-04T20:00:00.000Z"
}
```

#### Fazer Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@exemplo.com",
    "senha": "senha123"
  }'
```

**Resposta**: `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@exemplo.com",
    "papelGlobal": "USUARIO"
  }
}
```

---

### 2. Solicitar Vínculo a um Clube

#### Listar Clubes Disponíveis

```bash
curl -X GET http://localhost:3000/clubes \
  -H "Authorization: Bearer <seu_token>"
```

**Resposta**: `200 OK`
```json
[
  {
    "id": 1,
    "nome": "Águias da Serra",
    "slug": "aguias-da-serra"
  },
  {
    "id": 2,
    "nome": "Leões de Judá",
    "slug": "leoes-de-juda"
  }
]
```

#### Solicitar Vínculo

```bash
curl -X POST http://localhost:3000/membros/solicitar \
  -H "Authorization: Bearer <seu_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clubeId": 1,
    "papelDesejado": "CONSELHEIRO",
    "unidadeId": 3
  }'
```

**Resposta**: `201 Created`
```json
{
  "id": 10,
  "usuarioId": 1,
  "clubeId": 1,
  "unidadeId": 3,
  "papel": "CONSELHEIRO",
  "status": "PENDENTE",
  "mensagem": "Aguardando aprovação do admin do clube"
}
```

---

### 3. Criar uma Prova (Conselheiro)

```bash
curl -X POST http://localhost:3000/provas \
  -H "Authorization: Bearer <token_conselheiro>" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Prova de Primeiros Socorros",
    "especialidadeId": 5,
    "visibilidade": "UNIDADE",
    "valorTotal": 100
  }'
```

**Resposta**: `201 Created`
```json
{
  "id": 1,
  "titulo": "Prova de Primeiros Socorros",
  "clubeId": 1,
  "unidadeId": 3,
  "especialidadeId": 5,
  "criadaPorId": 1,
  "valorTotal": 100,
  "visibilidade": "UNIDADE",
  "criadoEm": "2025-12-04T20:30:00.000Z"
}
```

---

### 4. Adicionar Questões à Prova

#### Questão de Múltipla Escolha

```bash
curl -X POST http://localhost:3000/questoes \
  -H "Authorization: Bearer <token_conselheiro>" \
  -H "Content-Type: application/json" \
  -d '{
    "provaId": 1,
    "tipo": "MULTIPLA_ESCOLHA",
    "enunciado": "Qual é o número da emergência no Brasil?",
    "alternativas": {
      "A": "190",
      "B": "192",
      "C": "193",
      "D": "194",
      "E": "Nenhuma das anteriores"
    },
    "respostaCorreta": "B",
    "valor": 10
  }'
```

#### Questão Dissertativa

```bash
curl -X POST http://localhost:3000/questoes \
  -H "Authorization: Bearer <token_conselheiro>" \
  -H "Content-Type: application/json" \
  -d '{
    "provaId": 1,
    "tipo": "DISSERTATIVA",
    "enunciado": "Explique os passos básicos para realizar RCP em um adulto.",
    "valor": 20
  }'
```

---

### 5. Gerar Questões por IA

```bash
curl -X POST http://localhost:3000/questoes/gerar-ia \
  -H "Authorization: Bearer <token_conselheiro>" \
  -H "Content-Type: application/json" \
  -d '{
    "provaId": 1,
    "especialidadeId": 5,
    "quantidade": 10,
    "tipo": "MULTIPLA_ESCOLHA"
  }'
```

**Resposta**: `201 Created`
```json
{
  "questoesCriadas": 10,
  "provaId": 1,
  "questoes": [
    {
      "id": 1,
      "enunciado": "O que significa a sigla RCP?",
      "alternativas": {
        "A": "Reanimação Cardiopulmonar",
        "B": "Respiração Cardíaca Pulmonar",
        "C": "Reação Cardiovascular Positiva",
        "D": "Registro Clínico do Paciente",
        "E": "Resgate de Casos Prioritários"
      },
      "respostaCorreta": "A",
      "valor": 10,
      "geradaPorIA": true
    }
    // ... mais 9 questões
  ]
}
```

---

### 6. Responder uma Prova (Desbravador)

#### Listar Provas Disponíveis

```bash
curl -X GET http://localhost:3000/provas/disponiveis \
  -H "Authorization: Bearer <token_desbravador>"
```

#### Enviar Respostas

```bash
curl -X POST http://localhost:3000/respostas \
  -H "Authorization: Bearer <token_desbravador>" \
  -H "Content-Type: application/json" \
  -d '{
    "provaId": 1,
    "respostas": {
      "1": "A",
      "2": "B",
      "3": "C",
      "4": "Texto da resposta dissertativa aqui..."
    }
  }'
```

**Resposta**: `201 Created`
```json
{
  "id": 1,
  "provaId": 1,
  "usuarioId": 5,
  "notaObjetiva": 70,
  "notaDissertativa": null,
  "notaFinal": null,
  "corrigidaAutomaticamente": true,
  "precisaCorrecaoManual": true,
  "mensagem": "Questões objetivas corrigidas. Aguardando correção manual das dissertativas."
}
```

---

### 7. OCR - Escanear Prova Física

```bash
curl -X POST http://localhost:3000/ocr/scan \
  -H "Authorization: Bearer <token_desbravador>" \
  -F "provaId=1" \
  -F "imagem=@/caminho/para/prova_escaneada.jpg"
```

**Resposta**: `200 OK`
```json
{
  "provaId": 1,
  "respostasDetectadas": {
    "1": "A",
    "2": "C",
    "3": "B",
    "4": null,
    "5": "D"
  },
  "confianca": 0.92,
  "mensagem": "Revise as respostas antes de submeter"
}
```

---

## 📊 Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| `200 OK` | Requisição bem-sucedida |
| `201 Created` | Recurso criado com sucesso |
| `204 No Content` | Ação bem-sucedida sem conteúdo de resposta |
| `400 Bad Request` | Dados inválidos ou mal formatados |
| `401 Unauthorized` | Token ausente ou inválido |
| `403 Forbidden` | Sem permissão para acessar o recurso |
| `404 Not Found` | Recurso não encontrado |
| `409 Conflict` | Conflito (ex: email duplicado) |
| `422 Unprocessable Entity` | Dados semanticamente inválidos |
| `500 Internal Server Error` | Erro no servidor |

---

## 🔒 Permissões por Endpoint

### Endpoints Públicos (sem autenticação)

- `POST /auth/registro` - Criar conta
- `POST /auth/login` - Fazer login
- `GET /clubes` - Listar clubes (opcional)

### Endpoints Autenticados

Todos os outros endpoints requerem token JWT.

### Permissões por Papel

| Endpoint | DESBRAVADOR | CONSELHEIRO | DIRETORIA | ADMIN_CLUBE | MASTER |
|----------|-------------|-------------|-----------|-------------|--------|
| `GET /provas` | ✅ (filtrado) | ✅ (filtrado) | ✅ (todas do clube) | ✅ (todas do clube) | ✅ (todas) |
| `POST /provas` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `PATCH /provas/:id` | ❌ | ✅ (só suas) | ✅ (todas do clube) | ✅ (todas do clube) | ✅ |
| `DELETE /provas/:id` | ❌ | ✅ (só suas) | ✅ (todas do clube) | ✅ (todas do clube) | ✅ |
| `POST /questoes` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `POST /respostas` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /membros/aprovar` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `POST /questoes/gerar-ia` | ❌ | ✅ | ✅ | ✅ | ✅ |

Ver detalhes completos em: `docs/BUSINESS_RULES.md`

---

## 🔄 Paginação

Endpoints de listagem suportam paginação via query params:

```http
GET /provas?page=1&limit=10&sortBy=criadoEm&order=desc
```

**Parâmetros**:
- `page` (number, default: 1) - Página atual
- `limit` (number, default: 20, max: 100) - Itens por página
- `sortBy` (string) - Campo para ordenar
- `order` (asc|desc, default: asc) - Ordem

**Resposta**:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

---

## 🔍 Filtros

Muitos endpoints suportam filtros via query params:

```http
GET /provas?visibilidade=CLUBE&especialidadeId=5&criadaPorId=10
```

Consulte a documentação Swagger para filtros específicos de cada endpoint.

---

## ⚠️ Tratamento de Erros

Todos os erros retornam um JSON no formato:

```json
{
  "statusCode": 400,
  "message": "Email já cadastrado",
  "error": "Bad Request",
  "timestamp": "2025-12-04T20:45:00.000Z",
  "path": "/auth/registro"
}
```

### Exemplos de Erros Comuns

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "senha must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Token inválido ou expirado",
  "error": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Você não tem permissão para editar esta prova",
  "error": "Forbidden"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Prova com ID 999 não encontrada",
  "error": "Not Found"
}
```

---

## 🌐 CORS

CORS está habilitado para:

**Development**: `*` (todas as origens)
**Production**: Apenas domínios autorizados

Headers permitidos:
- `Authorization`
- `Content-Type`
- `Accept`

---

## 📈 Rate Limiting (Futuro)

Para evitar abuso, implementaremos rate limiting:

- **Endpoints públicos**: 10 req/min por IP
- **Endpoints autenticados**: 100 req/min por usuário
- **Geração de IA**: 5 req/min por usuário

---

## 🧪 Ambiente de Testes

Para testar a API localmente sem afetar dados reais:

```bash
# Usar banco de teste
DATABASE_URL="postgresql://provas:provas123@localhost:5432/provas_test"

# Rodar seeds (dados de exemplo)
npx prisma db seed

# Testar endpoints
curl -X GET http://localhost:3000/clubes
```

---

## 📚 Recursos Adicionais

- **Swagger UI**: [/api-docs](http://localhost:3000/api-docs)
- **Compodoc**: `npm run docs:serve`
- **Postman Collection**: (futuro) Link para collection exportada
- **OpenAPI Spec**: [/api-docs-json](http://localhost:3000/api-docs-json)

---

## 🆕 Versionamento (Futuro)

Quando lançarmos a v2 da API:

- **v1**: `/api/v1/provas` (estável, suportada)
- **v2**: `/api/v2/provas` (nova versão)

Versão padrão (sem prefixo) sempre aponta para a mais recente estável.

---

## ⚡ Performance

**Response Times médios esperados**:
- `GET` simples: < 50ms
- `POST`/`PATCH`: < 100ms
- Geração de IA: 2-5s (assíncrono recomendado)
- OCR: 3-10s (depende do tamanho da imagem)

---

**Versão**: 0.1.0-beta
**Última atualização**: 2025-12-04
**Documentação completa**: [Swagger](http://localhost:3000/api-docs)
