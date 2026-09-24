"""Coletas de antropometria, armazenadas separadamente dos pacientes assistenciais."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import Integer, cast, func, text
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
    db.execute(text("LOCK TABLE anthropometry_records IN EXCLUSIVE MODE"))
    last_participant = db.query(
        func.max(cast(models.AnthropometryRecord.participant_id, Integer))
    ).scalar() or 0
    if last_participant >= 100:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="O limite de 100 participantes foi atingido.",
        )

    record = models.AnthropometryRecord(
        participant_id=f"{last_participant + 1:03d}",
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
            detail="Não foi possível gerar o próximo ID de participante.",
        )
    db.refresh(record)
    return record
