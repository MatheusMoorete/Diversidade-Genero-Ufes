"""
Configurações centralizadas da aplicação.
Todas as configurações importantes em um único lugar para fácil manutenção.
"""

import os
from pathlib import Path

# Diretório base do projeto
BASE_DIR = Path(__file__).parent.parent

# Carrega variáveis de ambiente
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configurações do Banco de Dados
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL não configurada! "
        "Configure a variável de ambiente DATABASE_URL com a connection string do Neon."
    )

# Configurações de Autenticação
SECRET_KEY = os.getenv("SECRET_KEY", "sua-chave-secreta-super-segura-aqui-mude-em-producao")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Configurações de CORS
# Em produção, especificar domínios permitidos via variável de ambiente
CORS_ORIGINS_STR = os.getenv("CORS_ORIGINS", "*")
CORS_ORIGINS = CORS_ORIGINS_STR.split(",") if CORS_ORIGINS_STR != "*" else ["*"]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]

# Configurações de Logging
LOG_FILE = BASE_DIR / "audit.log"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# Configurações de Rate Limiting
RATE_LIMIT_LOGIN = "5/minute"
RATE_LIMIT_DEFAULT = "100/hour"
RATE_LIMIT_DELETE = "50/hour"
RATE_LIMIT_EXCEL = "10/hour"

# Configurações de SQL
SQL_ECHO = os.getenv("SQL_ECHO", "False").lower() == "true"

# Configurações de Excel
EXPORT_DIR = BASE_DIR / "exports"
FORM_QUESTIONS_FILE = BASE_DIR / "app" / "form_questions.json"
FORM_QUESTIONS_ADDITIONAL_FILE = BASE_DIR / "app" / "form_questions_additional.json"

# Configurações da Aplicação
APP_TITLE = "Gestão de Pacientes"
APP_DESCRIPTION = "API para gestão de pacientes e formulários de pesquisa"
APP_VERSION = "1.0.0"
