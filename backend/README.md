# Gestão de Pacientes

Backend em Python usando FastAPI para gestão de pacientes e formulários de pesquisa acadêmica.

## Características

- ✅ Autenticação JWT com bcrypt
- ✅ Banco de dados PostgreSQL (Neon)
- ✅ Criptografia de CPF
- ✅ CORS configurado
- ✅ Rate limiting
- ✅ Middleware de segurança (headers HTTP)
- ✅ Logs de auditoria
- ✅ Validação com Pydantic
- ✅ Documentação automática (Swagger/OpenAPI)

## Estrutura do Projeto

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # Aplicação principal FastAPI
│   ├── database.py      # Configuração do banco de dados
│   ├── models.py        # Modelos SQLAlchemy
│   ├── schemas.py       # Schemas Pydantic
│   ├── auth.py          # Autenticação JWT
│   ├── crud.py          # Operações CRUD
│   └── excel_service.py  # Serviço de Excel
├── requirements.txt     # Dependências
├── run.py              # Script para iniciar o servidor
├── .gitignore          # Arquivos ignorados pelo Git
└── README.md           # Este arquivo
```

## Instalação

1. **Navegue para a pasta backend:**

```bash
cd backend
```

2. **Instale as dependências:**

**Windows (PowerShell):**
```powershell
python -m pip install -r requirements.txt
```

ou

```powershell
py -m pip install -r requirements.txt
```

**Linux/Mac:**
```bash
pip install -r requirements.txt
```

> **Nota:** Se o comando `pip` não funcionar no Windows, use `python -m pip` ou `py -m pip`. Veja mais detalhes em `INSTALACAO.md`.

3. **Configure o banco de dados Neon:**

   a. **Crie uma conta no Neon:**
      - Acesse https://console.neon.tech
      - Crie uma conta gratuita
      - Crie um novo projeto

   b. **Obtenha a string de conexão:**
      - No dashboard do Neon, vá em "Connection Details"
      - Copie a connection string (formato: `postgresql://user:password@host/database?sslmode=require`)

   c. **Configure a variável de ambiente:**
      
      **Windows (PowerShell):**
      ```powershell
      $env:DATABASE_URL="postgresql://user:password@host.neon.tech/database?sslmode=require"
      ```
      
      **Linux/Mac:**
      ```bash
      export DATABASE_URL="postgresql://user:password@host.neon.tech/database?sslmode=require"
      ```
      
      **Ou crie um arquivo `.env` na pasta `backend/`:**
      ```
      DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require
      SECRET_KEY=sua-chave-secreta-super-segura-aqui
      SQL_ECHO=False
      ```

   > **Nota:** A variável `DATABASE_URL` é obrigatória. Configure-a antes de executar a aplicação.

5. **Execute a aplicação:**

```bash
python run.py
```

Ou usando uvicorn diretamente:

```bash
uvicorn app.main:app --reload
```

A API estará disponível em: `http://localhost:8000`

## Documentação da API

Após iniciar o servidor, acesse:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Endpoints Principais

### Autenticação

- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login e obter token JWT

### Pacientes

- `POST /api/patients` - Criar paciente
- `GET /api/patients` - Listar pacientes (com busca opcional)
- `GET /api/patients/{id}` - Buscar paciente por ID
- `PUT /api/patients/{id}` - Atualizar paciente
- `DELETE /api/patients/{id}` - Remover paciente

### Formulários

- `POST /api/form-responses` - Criar resposta de formulário
- `GET /api/form-responses/patient/{patient_id}` - Listar respostas de um paciente
- `GET /api/form-responses/{id}` - Buscar resposta por ID
- `PUT /api/form-responses/{id}` - Atualizar resposta
- `DELETE /api/form-responses/{id}` - Remover resposta

## Uso da API

### 1. Registrar um usuário

```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username": "pesquisador1", "password": "senha123"}'
```

### 2. Fazer login

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=pesquisador1&password=senha123"
```

Resposta:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### 3. Criar um paciente (requer autenticação)

```bash
curl -X POST "http://localhost:8000/api/patients" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "João Silva",
    "cpf": "12345678900"
  }'
```

### 4. Criar resposta de formulário

```bash
curl -X POST "http://localhost:8000/api/form-responses" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "response_date": "2024-01-15T10:00:00",
    "uses_hormone_over_1year": true,
    "form_data": {"campo1": "valor1"},
    "next_return_date": "2024-02-15T10:00:00"
  }'
```

## Segurança

### Variáveis de Ambiente

Para produção, configure as seguintes variáveis de ambiente:

```bash
# Banco de dados Neon
export DATABASE_URL="postgresql://user:password@host.neon.tech/database?sslmode=require"

# Chave secreta para JWT (gere uma chave segura)
export SECRET_KEY="sua-chave-secreta-super-segura-aqui"

# Log de queries SQL (False em produção)
export SQL_ECHO="False"
```

**Gerar chave secreta segura:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Criptografia de CPF

O CPF dos pacientes é armazenado de forma criptografada usando Fernet (cryptography). A chave de criptografia é gerada automaticamente e armazenada no arquivo `.encryption_key`.

**⚠️ IMPORTANTE:** Em produção, armazene a chave de criptografia de forma segura (ex: variável de ambiente ou serviço de gerenciamento de segredos).

## Rate Limiting

A API possui rate limiting configurado:

- Login: 5 tentativas por minuto
- Registro: 3 registros por hora
- Endpoints gerais: 100 requisições por hora
- Exclusões: 50 requisições por hora

## Logs de Auditoria

Todos os eventos importantes são registrados no arquivo `audit.log` na pasta `backend/`, incluindo:

- Tentativas de login (bem-sucedidas e falhadas)
- Criação, atualização e remoção de pacientes
- Criação, atualização e remoção de formulários
- Todas as requisições HTTP com IP, método, path e tempo de resposta

## Banco de Dados

### Neon (PostgreSQL Serverless)

O sistema está configurado para usar **Neon** (PostgreSQL serverless). O Neon oferece:

- ✅ Plano gratuito com 0.5 GB de armazenamento
- ✅ Backups automáticos
- ✅ Scale-to-zero (pausa quando inativo)
- ✅ Acesso remoto seguro
- ✅ Ideal para produção e desenvolvimento

**Configuração:**
1. Crie uma conta em https://console.neon.tech
2. Crie um projeto
3. Configure a variável `DATABASE_URL` com a connection string do Neon
4. Veja o guia completo em `NEON_SETUP.md`

### Modelos

- **User**: Pesquisadores/usuários do sistema
- **Patient**: Pacientes com nome e CPF (criptografado)
- **FormResponse**: Respostas dos formulários dos pacientes

### Inicialização do Banco

O banco de dados é inicializado automaticamente na primeira execução da aplicação. As tabelas são criadas automaticamente se não existirem.

## Desenvolvimento

Para desenvolvimento com hot-reload:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Licença

Este projeto é para uso acadêmico.

