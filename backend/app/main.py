"""
Aplicação principal FastAPI.
Configura middlewares, CORS, rate limiting e registra routers.
Arquitetura organizada para fácil manutenção.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import logging
from datetime import datetime

from app.database import init_db
from app.create_indexes import create_indexes
from app.config import (
    LOG_FILE,
    LOG_LEVEL,
    LOG_FORMAT,
    CORS_ORIGINS,
    CORS_ALLOW_CREDENTIALS,
    CORS_ALLOW_METHODS,
    CORS_ALLOW_HEADERS,
    APP_TITLE,
    APP_DESCRIPTION,
    APP_VERSION,
)

# Importa routers
from app.routers import auth, patients, forms, excel, backup

# Configuração de logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper()),
    format=LOG_FORMAT,
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Inicializa o banco de dados
init_db()

# Cria índices otimizados (executa apenas uma vez, é idempotente)
try:
    create_indexes()
except Exception as e:
    logger.warning(f"Erro ao criar índices (pode ser normal se já existirem): {e}")

# Cria a aplicação FastAPI
app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION
)

# Configuração de Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=CORS_ALLOW_METHODS,
    allow_headers=CORS_ALLOW_HEADERS,
)


# Middleware de segurança (equivalente ao Helmet)
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """
    Adiciona headers de segurança HTTP.
    Equivalente ao Helmet.js do Node.js.
    """
    response = await call_next(request)
    
    # Headers de segurança
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    
    return response


# Middleware de auditoria/logging
@app.middleware("http")
async def audit_logging_middleware(request: Request, call_next):
    """
    Registra todas as requisições para auditoria.
    
    SEGURANÇA: Nunca loga senhas ou dados sensíveis.
    """
    start_time = datetime.utcnow()
    
    # Lista de paths sensíveis que não devem ter detalhes logados
    sensitive_paths = ["/api/auth/login", "/api/auth/register"]
    is_sensitive = any(request.url.path.startswith(path) for path in sensitive_paths)
    
    # Log da requisição (sem dados sensíveis)
    log_message = (
        f"Requisição: {request.method} {request.url.path} - "
        f"IP: {get_remote_address(request)} - "
        f"User-Agent: {request.headers.get('user-agent', 'N/A')}"
    )
    
    if is_sensitive:
        log_message += " [DADOS SENSÍVEIS - LOG LIMITADO]"
    
    logger.info(log_message)
    
    response = await call_next(request)
    
    # Calcula tempo de processamento
    process_time = (datetime.utcnow() - start_time).total_seconds()
    
    # Log da resposta (sem dados sensíveis)
    logger.info(
        f"Resposta: {request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Tempo: {process_time:.3f}s"
    )
    
    return response


# Registra routers com rate limiting
# Auth router
app.include_router(auth.router)

# Patients router
app.include_router(patients.router)

# Forms router (form responses)
app.include_router(forms.router)
# Forms questions router
app.include_router(forms.forms_questions_router)

# Excel router
app.include_router(excel.router)

# Backup router
app.include_router(backup.router)


# Endpoints de sistema (health check, root)
@app.get("/health", tags=["Sistema"])
async def health_check():
    """
    Endpoint para verificar o status da API.
    """
    return {"status": "ok", "message": "API está funcionando"}


@app.get("/", tags=["Sistema"])
async def root():
    """
    Endpoint raiz da API.
    """
    return {
        "message": APP_TITLE,
        "version": APP_VERSION,
        "docs": "/docs"
    }
