"""
Permissões de acesso a recursos administrativos do sistema.
"""

from fastapi import Depends, HTTPException, status

from app import auth, models
from app.config import FORM_SCHEMA_ADMIN_USERS


def is_form_schema_admin(user: models.User) -> bool:
    return user.username.lower() in FORM_SCHEMA_ADMIN_USERS


def require_form_schema_admin(
    current_user: models.User = Depends(auth.get_current_user),
) -> models.User:
    if not is_form_schema_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário sem permissão para administrar perguntas do formulário",
        )
    return current_user
