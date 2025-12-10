# Instalação do Backend

## Windows

No Windows, o comando `pip` pode não estar disponível diretamente. Use uma das seguintes opções:

### Opção 1: Usar python -m pip
```powershell
python -m pip install -r requirements.txt
```

### Opção 2: Usar py -m pip
```powershell
py -m pip install -r requirements.txt
```

### Opção 3: Usar python3 -m pip
```powershell
python3 -m pip install -r requirements.txt
```

## Verificar se Python está instalado

```powershell
python --version
```

ou

```powershell
py --version
```

## Criar ambiente virtual (recomendado)

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## Executar o servidor

```powershell
python run.py
```

ou

```powershell
uvicorn app.main:app --reload
```


