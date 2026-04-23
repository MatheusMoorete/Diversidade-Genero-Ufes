"""
Router de autenticacao.
"""

import logging
from datetime import timedelta
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import auth, crud, models, schemas
from app.config import (
    ALLOW_PUBLIC_REGISTRATION,
    AUTH_COOKIE_NAME,
    AUTH_COOKIE_SAMESITE,
    AUTH_COOKIE_SECURE,
    RATE_LIMIT_LOGIN,
    RATE_LIMIT_REGISTER,
)
from app.database import get_db
from app.permissions import is_form_schema_admin
from app.rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Autenticacao"])

LOCALHOST_HOSTNAMES = {"localhost", "127.0.0.1"}


def _is_https_request(request: Request) -> bool:
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower()
    if forwarded_proto:
        return forwarded_proto == "https"
    return request.url.scheme == "https"


def _is_remote_origin(origin: str | None) -> bool:
    if not origin:
        return False

    hostname = urlparse(origin).hostname
    if not hostname:
        return False

    return hostname not in LOCALHOST_HOSTNAMES


def _resolve_cookie_settings(request: Request) -> tuple[bool, str]:
    secure = AUTH_COOKIE_SECURE
    samesite = AUTH_COOKIE_SAMESITE

    # Frontend e backend em origens diferentes exigem SameSite=None; Secure
    # para que o navegador envie o cookie nas chamadas XHR/fetch autenticadas.
    if _is_remote_origin(request.headers.get("origin")) and _is_https_request(request):
        secure = True
        samesite = "none"

    if samesite == "none":
        secure = True

    return secure, samesite


@router.post("/register", response_model=schemas.UserResponse)
@limiter.limit(RATE_LIMIT_REGISTER)
async def register(
    request: Request,
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    """
    Cria um novo usuario quando o cadastro publico estiver habilitado.
    """
    if not ALLOW_PUBLIC_REGISTRATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cadastro publico desabilitado. Solicite acesso a TI responsavel.",
        )

    existing_user = crud.get_user_by_username(db, username=user_data.username)
    if existing_user:
        logger.warning("Tentativa de registro com username ja existente: %s", user_data.username)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuario ja esta em uso",
        )

    try:
        new_user = crud.create_user(db=db, user=user_data)
        logger.info("Novo usuario registrado: %s", new_user.username)
        return new_user
    except Exception as exc:
        logger.error("Erro ao criar usuario: %s", str(exc), exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao criar usuario",
        ) from exc


@router.post("/login", response_model=schemas.Token)
@limiter.limit(RATE_LIMIT_LOGIN)
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Realiza login e grava o token em cookie HttpOnly.
    """
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        logger.warning("Tentativa de login falhada para usuario: %s", form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires,
    )

    cookie_secure, cookie_samesite = _resolve_cookie_settings(request)

    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
        max_age=int(access_token_expires.total_seconds()),
        expires=int(access_token_expires.total_seconds()),
        path="/",
    )

    logger.info("Login bem-sucedido para usuario: %s", user.username)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(request: Request, response: Response):
    """
    Remove o cookie de autenticacao do navegador.
    """
    cookie_secure, cookie_samesite = _resolve_cookie_settings(request)

    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
        path="/",
    )
    return {"message": "Logout realizado com sucesso"}


@router.get("/me", response_model=schemas.UserResponse)
async def read_current_user(
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Retorna dados do usuario autenticado e permissoes administrativas.
    """
    return schemas.UserResponse(
        id=current_user.id,
        username=current_user.username,
        created_at=current_user.created_at,
        is_form_admin=is_form_schema_admin(current_user),
    )
