"""
Router de pacientes.
Gerencia CRUD de pacientes com segurança baseada em propriedade.

SEGURANÇA:
- Cada usuário só pode acessar pacientes que ele criou
- Dados sensíveis são protegidos e isolados por usuário
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app import crud, models, schemas, auth
from app.database import get_db
from app.config import RATE_LIMIT_DELETE
from app.rate_limit import limiter

logger = logging.getLogger(__name__)

# Cria o router
router = APIRouter(prefix="/api/patients", tags=["Pacientes"])


@router.post("", response_model=schemas.PatientResponse)
async def create_patient(
    request: Request,
    patient: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Cria um novo paciente vinculado ao usuário atual.
    Requer autenticação.
    """
    db_patient = crud.create_patient(db=db, patient=patient, user_id=current_user.id)
    logger.info(f"Paciente criado: {db_patient.id} - {db_patient.full_name} por usuário: {current_user.username}")
    return db_patient


@router.get("", response_model=List[schemas.PatientResponse])
async def read_patients(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    order_by: Optional[str] = None,  # 'name' ou 'created_at'
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Lista pacientes do usuário atual com paginação, busca e ordenação opcionais.
    
    SEGURANÇA: Retorna apenas pacientes criados pelo usuário logado.
    Requer autenticação.
    
    order_by: 'name' para ordem alfabética, 'created_at' para ordem de cadastro (padrão: created_at)
    """
    patients = crud.get_patients(
        db, 
        user_id=current_user.id, 
        skip=skip, 
        limit=limit, 
        search=search,
        order_by=order_by
    )
    return patients


@router.get("/{patient_id}", response_model=schemas.PatientResponse)
async def read_patient(
    request: Request,
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Busca um paciente específico pelo ID.
    
    SEGURANÇA: Só retorna se o paciente pertencer ao usuário logado.
    Requer autenticação.
    """
    db_patient = crud.get_patient_by_user(db, patient_id=patient_id, user_id=current_user.id)
    if db_patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente não encontrado"
        )
    return db_patient


@router.put("/{patient_id}", response_model=schemas.PatientResponse)
async def update_patient(
    request: Request,
    patient_id: int,
    patient_update: schemas.PatientUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Atualiza um paciente existente.
    
    SEGURANÇA: Só atualiza se o paciente pertencer ao usuário logado.
    Requer autenticação.
    """
    db_patient = crud.update_patient(
        db, 
        patient_id=patient_id, 
        patient_update=patient_update,
        user_id=current_user.id
    )
    if db_patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente não encontrado"
        )
    logger.info(f"Paciente atualizado: {patient_id} por usuário: {current_user.username}")
    return db_patient


@router.delete("/{patient_id}")
@limiter.limit(RATE_LIMIT_DELETE)
async def delete_patient(
    request: Request,
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Remove um paciente do sistema.
    
    SEGURANÇA: Só remove se o paciente pertencer ao usuário logado.
    Requer autenticação.
    """
    success = crud.delete_patient(db, patient_id=patient_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente não encontrado"
        )
    logger.info(f"Paciente removido: {patient_id} por usuário: {current_user.username}")
    return {"message": "Paciente removido com sucesso"}

