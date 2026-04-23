"""
Configurações centralizadas da aplicação.
Todas as configurações importantes em um único lugar para fácil manutenção.
"""

import os
from pathlib import Path


def _get_int_env(name: str, default: int) -> int:
    raw_value = os.getenv(name, "").strip()
    if not raw_value:
        return default
    return int(raw_value)


def _get_bool_env(name: str, default: bool) -> bool:
    raw_value = os.getenv(name, "").strip().lower()
    if not raw_value:
        return default
    return raw_value in {"1", "true", "yes", "on"}

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
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError(
        "SECRET_KEY não configurada! "
        "Configure a variável de ambiente SECRET_KEY com uma chave segura. "
        "Gere com: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
JWT_ISSUER = "diversidade-genero-ufes"
JWT_AUDIENCE = "diversidade-genero-ufes-api"
AUTH_COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "access_token").strip() or "access_token"
AUTH_COOKIE_SECURE = _get_bool_env("AUTH_COOKIE_SECURE", False)
AUTH_COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", "lax").strip().lower() or "lax"
ALLOW_PUBLIC_REGISTRATION = _get_bool_env("ALLOW_PUBLIC_REGISTRATION", False)

# Configurações de CORS
# IMPORTANTE: Em produção, especificar domínios permitidos
LOCAL_DEV_CORS_ORIGINS = {
    "http://localhost:3000",
    "http://localhost:4173",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:5173",
}

CORS_ORIGINS_STR = os.getenv("CORS_ORIGINS", "")
configured_cors_origins = {
    origin.strip()
    for origin in CORS_ORIGINS_STR.split(",")
    if origin.strip()
}

if configured_cors_origins:
    # Mantém os domínios explicitamente configurados e adiciona apenas
    # origens locais seguras para desenvolvimento.
    CORS_ORIGINS = sorted(configured_cors_origins | LOCAL_DEV_CORS_ORIGINS)
else:
    CORS_ORIGINS = sorted(LOCAL_DEV_CORS_ORIGINS)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]

# Configurações de Logging
LOG_FILE = BASE_DIR / "audit.log"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# Configurações de Rate Limiting
RATE_LIMIT_LOGIN = "5/minute"
RATE_LIMIT_REGISTER = "3/hour"
RATE_LIMIT_DEFAULT = "100/hour"
RATE_LIMIT_DELETE = "50/hour"
RATE_LIMIT_EXCEL = "10/hour"
RATE_LIMIT_BACKUP = "5/hour"
RATE_LIMIT_FORM_SCHEMA_WRITE = "20/hour"
RATE_LIMIT_NEON_BACKUP_WRITE = "6/day"

# Configurações de SQL
SQL_ECHO = os.getenv("SQL_ECHO", "False").lower() == "true"

# Configurações de Excel
EXPORT_DIR = BASE_DIR / "exports"
FORM_QUESTIONS_FILE = BASE_DIR / "app" / "form_questions.json"
FORM_QUESTIONS_ADDITIONAL_FILE = BASE_DIR / "app" / "form_questions_additional.json"
EXCEL_MAX_UPLOAD_SIZE_BYTES = int(os.getenv("EXCEL_MAX_UPLOAD_SIZE_BYTES", str(5 * 1024 * 1024)))
FORM_SCHEMA_ADMIN_USERS = {"sistema"} | {
    username.strip().lower()
    for username in os.getenv("FORM_SCHEMA_ADMIN_USERS", "").split(",")
    if username.strip()
}
NEON_API_KEY = os.getenv("NEON_API_KEY", "").strip()
NEON_PROJECT_ID = os.getenv("NEON_PROJECT_ID", "").strip()
NEON_BRANCH_ID = os.getenv("NEON_BRANCH_ID", "").strip()
NEON_BACKUP_RETENTION_DAYS = _get_int_env("NEON_BACKUP_RETENTION_DAYS", 30)
NEON_BACKUP_MAX_AGE_HOURS = _get_int_env("NEON_BACKUP_MAX_AGE_HOURS", 36)
NEON_API_BASE_URL = "https://console.neon.tech/api/v2"

# Configurações da Aplicação
APP_TITLE = "Gestão de Pacientes"
APP_DESCRIPTION = "API para gestão de pacientes e formulários de pesquisa"
APP_VERSION = "1.0.0"
