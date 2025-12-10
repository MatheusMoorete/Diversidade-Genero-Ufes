# Como Iniciar o Backend

## Passo a Passo

### 1. Navegar para a pasta backend

```powershell
cd backend
```

### 2. Verificar se as dependências estão instaladas

```powershell
python -m pip list | Select-String "fastapi"
```

Se não aparecer, instale as dependências:

```powershell
python -m pip install -r requirements.txt
```

### 3. Iniciar o servidor

**Opção 1: Usando o script run.py (Recomendado)**
```powershell
python run.py
```

**Opção 2: Usando uvicorn diretamente**
```powershell
uvicorn app.main:app --reload
```

**Opção 3: Com host e porta específicos**
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Verificar se está funcionando

Após iniciar, você verá algo como:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## Acessar a API

- **API:** http://localhost:8000
- **Documentação Swagger:** http://localhost:8000/docs
- **Documentação ReDoc:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health

## Parar o servidor

Pressione `Ctrl+C` no terminal

## Troubleshooting

### Erro: "ModuleNotFoundError"
- Instale as dependências: `python -m pip install -r requirements.txt`

### Erro: "Address already in use"
- A porta 8000 está em uso
- Pare o processo que está usando a porta ou mude a porta no `run.py`

### Erro: "No module named 'app'"
- Certifique-se de estar na pasta `backend/` ao executar
- Ou use: `python -m uvicorn app.main:app --reload`

