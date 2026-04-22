"""
Router de autenticação.
Gerencia login e registro de usuários.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import logging

from app import crud, models, schemas, auth
from app.database import get_db
from app.config import RATE_LIMIT_LOGIN, RATE_LIMIT_REGISTER
from app.permissions import is_form_schema_admin
from app.rate_limit import limiter

logger = logging.getLogger(__name__)

# Cria o router
router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


@router.post("/register", response_model=schemas.UserResponse)
@limiter.limit(RATE_LIMIT_REGISTER)
async def register(
    request: Request,
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    """
    Endpoint de registro. Cria um novo usuário no sistema.
    
    SEGURANÇA:
    - Senha é hasheada com bcrypt antes de armazenar
    - Senha nunca é logada ou retornada na resposta
    - Apenas username é logado (sem senha)
    """
    # Verifica se o usuário já existe
    existing_user = crud.get_user_by_username(db, username=user_data.username)
    if existing_user:
        # Log sem expor senha
        logger.warning(f"Tentativa de registro com username já existente: {user_data.username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário já está em uso"
        )
    
    # Cria o novo usuário (senha será hasheada no crud.create_user)
    try:
        new_user = crud.create_user(db=db, user=user_data)
        # Log sem expor senha - apenas username
        logger.info(f"Novo usuário registrado: {new_user.username}")
        return new_user
    except Exception as e:
        # Log de erro sem expor senha
        logger.error(f"Erro ao criar usuário: {str(e)}", exc_info=True)
        # Rollback da transação em caso de erro
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao criar usuário"
        )


@router.post("/login", response_model=schemas.Token)
@limiter.limit(RATE_LIMIT_LOGIN)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Endpoint de login. Retorna token JWT para autenticação.
    
    SEGURANÇA:
    - Senha é enviada via HTTPS (SSL/TLS) - configure certificado em produção
    - Senha nunca é logada ou armazenada em texto plano
    - Senha é comparada apenas com hash armazenado no banco
    - Rate limiting aplicado para prevenir brute force
    """
    # IMPORTANTE: form_data.password nunca é logado ou exposto
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        # Log sem expor senha ou detalhes sensíveis
        logger.warning(f"Tentativa de login falhada para usuário: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Log sem expor senha
    logger.info(f"Login bem-sucedido para usuário: {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
async def read_current_user(
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Retorna os dados do usuário autenticado e suas permissões administrativas.
    """
    return schemas.UserResponse(
        id=current_user.id,
        username=current_user.username,
        created_at=current_user.created_at,
        is_form_admin=is_form_schema_admin(current_user),
    )
