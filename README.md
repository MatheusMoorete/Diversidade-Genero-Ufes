# Gestão de Pacientes - Diversidade

Sistema de gestão de pacientes e formulários de pesquisa acadêmica, desenvolvido com React + TypeScript (frontend) e FastAPI + PostgreSQL (backend).

## 📁 Estrutura do Projeto

```
.
├── frontend/          # Aplicação React com Vite
├── backend/           # API FastAPI com PostgreSQL
└── README.md          # Este arquivo
```

## 🛠️ Desenvolvimento Local

### Pré-requisitos

- **Node.js** 18+ (para frontend)
- **Python** 3.10+ (para backend)
- **PostgreSQL** (via Neon ou local)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:3000

### Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

API disponível em: http://localhost:8000

## 🚀 Deploy

### Frontend (Vercel)

1. Conecte o repositório na Vercel
2. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Adicione variável de ambiente: `VITE_API_URL` (URL do backend)

### Backend (Railway/Render)

1. Conecte o repositório
2. Configure **Root Directory:** `backend`
3. Configure variáveis de ambiente:
   - `DATABASE_URL`
   - `SECRET_KEY`
   - `CORS_ORIGINS` (URL do frontend)
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## 📝 Variáveis de Ambiente

### Frontend
- `VITE_API_URL`: URL da API backend (ex: `https://seu-backend.railway.app`)

### Backend
- `DATABASE_URL`: Connection string do PostgreSQL (Neon)
- `SECRET_KEY`: Chave secreta para JWT (gere uma chave segura)
- `CORS_ORIGINS`: URLs permitidas separadas por vírgula
- `SQL_ECHO`: `False` em produção
- `LOG_LEVEL`: `INFO` em produção

## 🔒 Segurança

- Autenticação JWT
- Criptografia de dados sensíveis
- Rate limiting
- CORS configurado
- Headers de segurança HTTP

## 📄 Licença

Uso acadêmico.

