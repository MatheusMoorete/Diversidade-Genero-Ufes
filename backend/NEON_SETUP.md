# Guia de Configuração do Neon

Este guia explica como configurar o banco de dados Neon para produção.

## 1. Criar Conta no Neon

1. Acesse https://console.neon.tech
2. Clique em "Sign Up" e crie uma conta (pode usar GitHub, Google, etc.)
3. Confirme seu email

## 2. Criar Projeto

1. No dashboard, clique em "Create Project"
2. Escolha um nome para o projeto (ex: "gestao-pacientes")
3. Selecione a região mais próxima (ex: "US East (Ohio)")
4. Clique em "Create Project"

## 3. Obter String de Conexão

1. No dashboard do projeto, vá em "Connection Details"
2. Você verá a connection string no formato:
   ```
   postgresql://user:password@host.neon.tech/database?sslmode=require
   ```
3. **IMPORTANTE:** Copie a connection string completa. Ela contém a senha que só aparece uma vez!

## 4. Configurar Variável de Ambiente

### Opção 1: Arquivo .env (Recomendado)

Crie um arquivo `.env` na pasta `backend/`:

```env
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require
SECRET_KEY=sua-chave-secreta-super-segura-aqui
SQL_ECHO=False
```

**Gerar SECRET_KEY segura:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Opção 2: Variável de Ambiente do Sistema

**Windows (PowerShell):**
```powershell
$env:DATABASE_URL="postgresql://user:password@host.neon.tech/database?sslmode=require"
$env:SECRET_KEY="sua-chave-secreta"
```

**Linux/Mac:**
```bash
export DATABASE_URL="postgresql://user:password@host.neon.tech/database?sslmode=require"
export SECRET_KEY="sua-chave-secreta"
```

## 5. Instalar Dependências

Certifique-se de ter instalado todas as dependências:

```bash
pip install -r requirements.txt
```

Isso instalará o driver PostgreSQL (`psycopg2-binary`).

## 6. Migrar Dados (Se Aplicável)

Se você já tem dados no SQLite e quer migrar para o Neon:

```bash
# Certifique-se de que DATABASE_URL está configurada
python migrate_to_neon.py
```

O script irá:
- ✅ Conectar ao SQLite local
- ✅ Conectar ao Neon
- ✅ Criar todas as tabelas
- ✅ Migrar usuários, pacientes e respostas
- ✅ Verificar integridade dos dados

## 7. Testar Conexão

Execute a aplicação:

```bash
python run.py
```

Ou:

```bash
uvicorn app.main:app --reload
```

Acesse http://localhost:8000/docs e teste os endpoints.

## 8. Verificar no Dashboard do Neon

1. Acesse o dashboard do Neon
2. Vá em "SQL Editor"
3. Execute uma query para verificar os dados:

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM patients;
SELECT COUNT(*) FROM form_responses;
```

## Troubleshooting

### Erro: "could not connect to server"

- Verifique se a `DATABASE_URL` está correta
- Certifique-se de que o `sslmode=require` está na string
- Verifique sua conexão com a internet

### Erro: "password authentication failed"

- A senha na connection string pode estar incorreta
- Gere uma nova senha no dashboard do Neon (Settings > Reset Password)

### Erro: "relation does not exist"

- Execute o script de migração: `python migrate_to_neon.py`
- Ou inicialize o banco: a aplicação criará as tabelas automaticamente na primeira execução

### Erro: "psycopg2 not found"

- Instale as dependências: `pip install -r requirements.txt`

## Plano Gratuito do Neon

O plano gratuito inclui:
- ✅ 0.5 GB de armazenamento (suficiente para ~300 pacientes)
- ✅ 191.9 horas de computação por mês
- ✅ Backups automáticos
- ✅ Scale-to-zero (pausa quando inativo)

## Próximos Passos

1. ✅ Configure o Neon
2. ✅ Migre os dados (se necessário)
3. ✅ Teste a aplicação localmente
4. ✅ Configure variáveis de ambiente no servidor de produção
5. ✅ Faça deploy da aplicação

## Suporte

- Documentação do Neon: https://neon.tech/docs
- Dashboard: https://console.neon.tech

