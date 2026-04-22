"""
Router de Backup.
Gerencia endpoints de backup e restauração de dados.

SEGURANÇA:
- Backup retorna apenas dados do usuário logado
- Requer autenticação
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging

from app import models, auth, backup_service
from app.database import get_db
from app.config import RATE_LIMIT_BACKUP
from app.rate_limit import limiter

logger = logging.getLogger(__name__)

# Cria o router
router = APIRouter(prefix="/api/backup", tags=["Backup"])


@router.get("/full")
@limiter.limit(RATE_LIMIT_BACKUP)
async def get_full_backup(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Gera um backup completo de todos os dados do usuário.
    
    SEGURANÇA: Retorna apenas dados do usuário logado.
    Inclui pacientes e respostas de formulário (inclusive deletados).
    Requer autenticação.
    
    Returns:
        JSON com todos os dados do usuário para backup
    """
    try:
        backup_data = backup_service.create_full_backup(db, current_user.id)
        
        logger.info(f"Backup completo gerado para usuário: {current_user.username}")
        
        # Retorna como JSON com headers para download
        return JSONResponse(
            content=backup_data,
            headers={
                "Content-Disposition": f"attachment; filename=backup_{current_user.username}.json"
            }
        )
        
    except Exception as e:
        logger.error(f"Erro ao gerar backup: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao gerar backup"
        )


@router.get("/stats")
@limiter.limit(RATE_LIMIT_BACKUP)
async def get_backup_stats(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Retorna estatísticas dos dados do usuário para verificação antes do backup.
    
    Requer autenticação.
    """
    try:
        # Conta pacientes (ativos)
        active_patients = db.query(models.Patient).filter(
            models.Patient.created_by_user_id == current_user.id,
            models.Patient.deleted_at.is_(None)
        ).count()
        
        # Conta pacientes deletados (soft delete)
        deleted_patients = db.query(models.Patient).filter(
            models.Patient.created_by_user_id == current_user.id,
            models.Patient.deleted_at.isnot(None)
        ).count()
        
        # Conta respostas (ativas)
        active_responses = db.query(models.FormResponse).filter(
            models.FormResponse.created_by_user_id == current_user.id,
            models.FormResponse.deleted_at.is_(None)
        ).count()
        
        # Conta respostas deletadas
        deleted_responses = db.query(models.FormResponse).filter(
            models.FormResponse.created_by_user_id == current_user.id,
            models.FormResponse.deleted_at.isnot(None)
        ).count()
        
        return {
            "username": current_user.username,
            "patients": {
                "active": active_patients,
                "deleted": deleted_patients,
                "total": active_patients + deleted_patients
            },
            "form_responses": {
                "active": active_responses,
                "deleted": deleted_responses,
                "total": active_responses + deleted_responses
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter estatísticas de backup"
        )
