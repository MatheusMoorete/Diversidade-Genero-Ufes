"""
Router de backup.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app import auth, backup_service, models, schemas
from app.config import RATE_LIMIT_BACKUP, RATE_LIMIT_NEON_BACKUP_WRITE
from app.database import get_db
from app.neon_backup_service import NeonBackupError, create_neon_snapshot, get_neon_backup_status
from app.permissions import require_form_schema_admin
from app.rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backup", tags=["Backup"])


@router.get("/full")
@limiter.limit(RATE_LIMIT_BACKUP)
async def get_full_backup(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Gera um backup completo de todos os dados do usuario logado.
    """
    try:
        backup_data = backup_service.create_full_backup(db, current_user.id)
        logger.info("Backup completo gerado para usuario: %s", current_user.username)
        return JSONResponse(
            content=backup_data,
            headers={
                "Content-Disposition": f"attachment; filename=backup_{current_user.username}.json",
            },
        )
    except Exception as exc:
        logger.error("Erro ao gerar backup: %s", str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao gerar backup",
        ) from exc


@router.get("/stats")
@limiter.limit(RATE_LIMIT_BACKUP)
async def get_backup_stats(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Retorna estatisticas do usuario antes do backup.
    """
    try:
        active_patients = db.query(models.Patient).filter(
            models.Patient.created_by_user_id == current_user.id,
            models.Patient.deleted_at.is_(None),
        ).count()

        deleted_patients = db.query(models.Patient).filter(
            models.Patient.created_by_user_id == current_user.id,
            models.Patient.deleted_at.isnot(None),
        ).count()

        active_responses = db.query(models.FormResponse).filter(
            models.FormResponse.created_by_user_id == current_user.id,
            models.FormResponse.deleted_at.is_(None),
        ).count()

        deleted_responses = db.query(models.FormResponse).filter(
            models.FormResponse.created_by_user_id == current_user.id,
            models.FormResponse.deleted_at.isnot(None),
        ).count()

        return {
            "username": current_user.username,
            "patients": {
                "active": active_patients,
                "deleted": deleted_patients,
                "total": active_patients + deleted_patients,
            },
            "form_responses": {
                "active": active_responses,
                "deleted": deleted_responses,
                "total": active_responses + deleted_responses,
            },
        }
    except Exception as exc:
        logger.error("Erro ao obter estatisticas de backup: %s", str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter estatisticas de backup",
        ) from exc


@router.get("/neon/status", response_model=schemas.NeonBackupStatusResponse)
@limiter.limit(RATE_LIMIT_BACKUP)
async def get_neon_status(
    request: Request,
    current_user: models.User = Depends(require_form_schema_admin),
):
    """
    Retorna o estado atual dos snapshots configurados no Neon.
    """
    try:
        return get_neon_backup_status()
    except NeonBackupError as exc:
        logger.error("Erro ao consultar status de backup Neon: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


@router.post("/neon/snapshot", response_model=schemas.NeonBackupStatusResponse)
@limiter.limit(RATE_LIMIT_NEON_BACKUP_WRITE)
async def create_neon_snapshot_now(
    request: Request,
    current_user: models.User = Depends(require_form_schema_admin),
):
    """
    Cria um snapshot manual da branch configurada no Neon.
    """
    try:
        status_payload = create_neon_snapshot()
        logger.info("Snapshot manual do Neon criado por usuario: %s", current_user.username)
        return status_payload
    except NeonBackupError as exc:
        logger.error("Erro ao criar snapshot manual do Neon: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
