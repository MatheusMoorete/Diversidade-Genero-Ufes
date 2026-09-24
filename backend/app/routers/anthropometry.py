"""Coletas de antropometria, armazenadas separadamente dos pacientes assistenciais."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import auth, models, schemas
from app.database import get_db


router = APIRouter(prefix="/api/anthropometry", tags=["Antropometria"])


@router.post("", response_model=schemas.AnthropometryRecordResponse, status_code=status.HTTP_201_CREATED)
def create_anthropometry_record(
    payload: schemas.AnthropometryRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    record = models.AnthropometryRecord(
        participant_id=payload.participant_id,
        full_name=payload.full_name.strip(),
        age=payload.age,
        form_data=payload.form_data,
        created_by_user_id=current_user.id,
    )
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este ID de participante já foi cadastrado.",
        )
    db.refresh(record)
    return record
