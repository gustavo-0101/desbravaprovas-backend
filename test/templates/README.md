# Templates de Testes

Este diretório contém templates para facilitar a criação de testes no projeto.

## 📋 Templates Disponíveis

### 1. `unit.template.spec.ts`
Template para **testes unitários** de Services.

**Quando usar**:
- Testar lógica de negócio isolada
- Testar services, guards, pipes
- Usar mocks para dependências externas (Prisma, APIs)

**Como usar**:
1. Copie o arquivo para o módulo que deseja testar
2. Renomeie para `nome-do-service.service.spec.ts`
3. Substitua `ExemploService` pelo nome do seu service
4. Adapte os mocks do PrismaService conforme necessário
5. Implemente os testes específicos

**Exemplo**:
```bash
# Copiar template
cp test/templates/unit.template.spec.ts src/usuarios/usuarios.service.spec.ts

# Editar e adaptar
# - Trocar 'ExemploService' por 'UsuariosService'
# - Adicionar testes específicos
```

---

### 2. `e2e.template.spec.ts`
Template para **testes E2E** (End-to-End).

**Quando usar**:
- Testar fluxos completos da aplicação
- Testar endpoints HTTP (controllers)
- Integração com banco de dados real (test database)
- Validar autenticação e autorização

**Como usar**:
1. Copie o arquivo para `test/`
2. Renomeie para `nome-do-modulo.e2e-spec.ts`
3. Substitua `exemplo` pelo nome do seu módulo/recurso
4. Adapte o setup de dados de teste
5. Implemente os cenários de teste

**Exemplo**:
```bash
# Copiar template
cp test/templates/e2e.template.spec.ts test/provas.e2e-spec.ts

# Editar e adaptar
# - Trocar '/exemplo' por '/provas'
# - Criar dados de teste específicos para provas
```

---

## 🎯 Boas Práticas

### Estrutura de um Teste (AAA Pattern)

```typescript
it('deve fazer algo', async () => {
  // Arrange (Preparar) - Setup do cenário
  const dto = { campo: 'valor' };
  const expected = { id: 1, ...dto };
  jest.spyOn(prisma.exemplo, 'create').mockResolvedValue(expected);

  // Act (Agir) - Executar a ação
  const result = await service.criar(dto);

  // Assert (Verificar) - Validar resultado
  expect(result).toEqual(expected);
});
```

### Nomenclatura de Testes

- **Descreva o comportamento, não a implementação**
  - ✅ `deve retornar 404 se usuário não encontrado`
  - ❌ `testa método buscarPorId`

- **Use describe() para agrupar testes relacionados**
  ```typescript
  describe('UsuariosService', () => {
    describe('criar', () => {
      it('deve criar um usuário válido', ...);
      it('deve lançar exceção se email duplicado', ...);
    });
  });
  ```

### Mocking

- **Mock apenas dependências externas** (banco, APIs, filesystem)
- **Não mock a classe sendo testada**
- **Use jest.spyOn() para espionar métodos**

```typescript
jest.spyOn(prisma.usuario, 'create').mockResolvedValue(mockUser);
```

### Testes E2E

- **Sempre limpar dados entre testes**
- **Usar test database separado** (nunca development)
- **Criar dados mínimos necessários** para o teste

---

## 🧪 Comandos de Teste

```bash
# Rodar todos os testes
npm run test

# Testes unitários em modo watch
npm run test:watch

# Testes com coverage
npm run test:cov

# Testes E2E
npm run test:e2e

# Teste específico
npm run test -- usuarios.service.spec.ts

# Testes em modo debug
npm run test:debug
```

---

## 📊 Coverage

Meta de coverage: **>80%**

Visualizar relatório:
```bash
npm run test:cov
# Abrir: coverage/lcov-report/index.html
```

**O que cobrir**:
- ✅ Services (lógica de negócio)
- ✅ Guards (autenticação/autorização)
- ✅ Pipes (validação)
- ✅ Controllers (endpoints principais)
- ⚠️ DTOs (menos crítico)
- ❌ Arquivos de configuração

---

## 🔍 Debugar Testes

### VSCode

1. Adicione breakpoint no código ou teste
2. Execute: `npm run test:debug`
3. No VSCode: `F5` ou `Run > Start Debugging`

### Console.log

```typescript
it('deve fazer algo', () => {
  console.log('Debug:', variavel);
  // ...
});
```

---

## ✅ Checklist de Teste

Antes de fazer commit:

- [ ] Todos os testes passando
- [ ] Coverage acima de 80%
- [ ] Testes E2E para fluxos críticos
- [ ] Mocks adequados (não testar implementação de libs)
- [ ] Testes independentes (ordem não importa)
- [ ] Cleanup de dados entre testes

---

## 📚 Recursos

- [Jest Docs](https://jestjs.io/docs/getting-started)
- [NestJS Testing Docs](https://docs.nestjs.com/fundamentals/testing)
- [Supertest Docs](https://github.com/visionmedia/supertest)

---

**Última atualização**: 2025-12-04
