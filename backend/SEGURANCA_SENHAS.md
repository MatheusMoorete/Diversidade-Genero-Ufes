# 🔒 Segurança de Senhas - Documentação

## Como Funciona a Autenticação

### 1. **Envio da Senha (Cliente → Servidor)**
- A senha é enviada via **HTTP POST** usando `application/x-www-form-urlencoded` (padrão OAuth2)
- ⚠️ **IMPORTANTE**: Em produção, você **DEVE** usar **HTTPS (SSL/TLS)** para criptografar a transmissão
- Sem HTTPS, a senha trafega em texto plano pela rede (perigoso!)

### 2. **Processamento no Servidor**
- ✅ A senha **NUNCA** é logada
- ✅ A senha **NUNCA** é armazenada em texto plano
- ✅ A senha é comparada apenas com o hash armazenado no banco
- ✅ O middleware de auditoria filtra dados sensíveis dos logs

### 3. **Armazenamento no Banco**
- ✅ Senhas são hasheadas com **bcrypt** (algoritmo seguro)
- ✅ Hash é armazenado na coluna `password_hash`
- ✅ Senha original nunca é armazenada

## Proteções Implementadas

### ✅ Logs Seguros
- Middleware de auditoria não loga o body de requisições de login/registro
- Logs mostram apenas: método, path, IP, status - **SEM senha**

### ✅ Rate Limiting
- Endpoint `/api/auth/login` tem limite de 5 tentativas por minuto
- Previne ataques de força bruta

### ✅ Hash Seguro
- Usa bcrypt com salt automático
- Cada hash é único, mesmo para senhas iguais

### ✅ Validação
- Senha é verificada apenas com `verify_password()` que compara hash
- Senha em texto plano nunca é armazenada ou retornada

## ⚠️ O QUE VOCÊ PRECISA FAZER EM PRODUÇÃO

### 1. **Configurar HTTPS (OBRIGATÓRIO)**
```bash
# Use um proxy reverso como Nginx com certificado SSL
# Ou configure o FastAPI com certificado SSL diretamente
```

### 2. **Usar Variáveis de Ambiente**
```bash
# .env em produção
SECRET_KEY=<chave-super-secreta-gerada-aleatoriamente>
DATABASE_URL=<connection-string-segura>
```

### 3. **Revisar Logs**
- Certifique-se de que logs não contêm senhas
- Use ferramentas de análise de segurança

## Como Testar a Segurança

### ✅ Verificar que senha não é logada:
```bash
# Faça login e verifique o arquivo audit.log
# Você NÃO deve ver a senha em nenhum lugar
```

### ✅ Verificar que senha não está no banco:
```sql
-- A senha deve estar hasheada, não em texto plano
SELECT username, password_hash FROM users;
-- password_hash deve ser algo como: $2b$12$...
```

## Resumo

| Aspecto | Status |
|---------|--------|
| Senha em texto plano no banco | ❌ NUNCA |
| Senha logada | ❌ NUNCA |
| Senha retornada na API | ❌ NUNCA |
| Hash seguro (bcrypt) | ✅ SIM |
| Rate limiting | ✅ SIM |
| HTTPS em produção | ⚠️ CONFIGURE |

## Conclusão

O sistema está **seguro** do ponto de vista de código:
- ✅ Senhas são hasheadas
- ✅ Senhas não são logadas
- ✅ Senhas não são expostas

**MAS** você precisa configurar **HTTPS em produção** para proteger a transmissão entre cliente e servidor.

