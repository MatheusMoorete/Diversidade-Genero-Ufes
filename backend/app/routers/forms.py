"""
Router de formulários.
Gerencia CRUD de respostas de formulário e perguntas do formulário.

SEGURANÇA:
- Cada usuário só pode acessar respostas de formulário que ele criou
- Dados sensíveis de pacientes são protegidos e isolados por usuário
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from typing import List
import logging
import json

from app import crud, models, schemas, auth
from app.database import get_db
from app.config import RATE_LIMIT_DELETE, RATE_LIMIT_FORM_SCHEMA_WRITE
from app.form_questions_service import (
    FORM_KIND_ADDITIONAL,
    FORM_KIND_STANDARD,
    add_question,
    load_form_definition,
    remove_question,
    update_question,
)
from app.permissions import require_form_schema_admin
from app.rate_limit import limiter

logger = logging.getLogger(__name__)

# Cria o router
router = APIRouter(prefix="/api/form-responses", tags=["Formulários"])


@router.post("", response_model=schemas.FormResponseResponse)
async def create_form_response(
    request: Request,
    form_response: schemas.FormResponseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Cria uma nova resposta de formulário.
    
    SEGURANÇA: Verifica se o paciente pertence ao usuário antes de criar.
    Requer autenticação.
    """
    # Verifica se o paciente existe E pertence ao usuário
    patient = crud.get_patient_by_user(
        db, 
        patient_id=form_response.patient_id, 
        user_id=current_user.id
    )
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente não encontrado"
        )
    
    db_form_response = crud.create_form_response(
        db=db, 
        form_response=form_response,
        user_id=current_user.id
    )
    logger.info(f"Resposta de formulário criada: {db_form_response.id} por usuário: {current_user.username}")
    return db_form_response


@router.get("/patient/{patient_id}", response_model=List[schemas.FormResponseResponse])
async def read_form_responses_by_patient(
    request: Request,
    patient_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Lista todas as respostas de formulário de um paciente.
    
    SEGURANÇA: 
    - Verifica se o paciente pertence ao usuário
    - Retorna apenas respostas criadas pelo usuário logado
    Requer autenticação.
    """
    # Primeiro verifica se o paciente pertence ao usuário
    patient = crud.get_patient_by_user(db, patient_id=patient_id, user_id=current_user.id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente não encontrado"
        )
    
    # Retorna apenas respostas criadas pelo usuário
    form_responses = crud.get_form_responses_by_patient(
        db, 
        patient_id=patient_id, 
        user_id=current_user.id,
        skip=skip, 
        limit=limit
    )
    return form_responses


@router.get("/upcoming-returns", response_model=List[schemas.FormResponseResponse])
async def get_upcoming_returns(
    request: Request,
    days: int = 15,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Retorna todos os retornos agendados dos próximos N dias (padrão: 15 dias)
    de todos os pacientes do usuário logado.
    
    SEGURANÇA: Retorna apenas retornos de pacientes que pertencem ao usuário logado.
    Requer autenticação.
    """
    form_responses = crud.get_upcoming_returns(
        db=db,
        user_id=current_user.id,
        days=days,
    )

    logger.info(f"Retornados {len(form_responses)} retornos dos próximos {days} dias para usuário: {current_user.username}")
    return form_responses


@router.get("/{form_response_id}", response_model=schemas.FormResponseResponse)
async def read_form_response(
    request: Request,
    form_response_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Busca uma resposta de formulário específica pelo ID.
    
    SEGURANÇA: Só retorna se a resposta pertencer ao usuário logado.
    Requer autenticação.
    """
    db_form_response = crud.get_form_response_by_user(
        db, 
        form_response_id=form_response_id,
        user_id=current_user.id
    )
    if db_form_response is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resposta de formulário não encontrada"
        )
    return db_form_response


@router.put("/{form_response_id}", response_model=schemas.FormResponseResponse)
async def update_form_response(
    request: Request,
    form_response_id: int,
    form_response_update: schemas.FormResponseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Atualiza uma resposta de formulário existente.
    
    SEGURANÇA: Só atualiza se a resposta pertencer ao usuário logado.
    Requer autenticação.
    """
    db_form_response = crud.update_form_response(
        db, 
        form_response_id=form_response_id, 
        form_response_update=form_response_update,
        user_id=current_user.id
    )
    if db_form_response is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resposta de formulário não encontrada"
        )
    logger.info(f"Resposta de formulário atualizada: {form_response_id} por usuário: {current_user.username}")
    return db_form_response


@router.delete("/{form_response_id}")
@limiter.limit(RATE_LIMIT_DELETE)
async def delete_form_response(
    request: Request,
    form_response_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Remove uma resposta de formulário do sistema.
    
    SEGURANÇA: Só remove se a resposta pertencer ao usuário logado.
    Requer autenticação.
    """
    success = crud.delete_form_response(
        db, 
        form_response_id=form_response_id,
        user_id=current_user.id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resposta de formulário não encontrada"
        )
    logger.info(f"Resposta de formulário removida: {form_response_id} por usuário: {current_user.username}")
    return {"message": "Resposta de formulário removida com sucesso"}


# Router separado para perguntas do formulário
forms_questions_router = APIRouter(prefix="/api/form-questions", tags=["Formulários"])


@forms_questions_router.get("")
async def get_form_questions(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Retorna a estrutura completa das perguntas do formulário em JSON.
    Requer autenticação.
    
    Headers de cache configurados para otimizar performance:
    - Cache-Control: permite cache do cliente por 1 hora
    - ETag: baseado na versão do formulário para validação condicional
    """
    try:
        questions_data = load_form_definition(FORM_KIND_STANDARD)
        
        # Obtém versão do formulário para ETag
        version = questions_data.get("version", "unknown")
        last_updated = questions_data.get("last_updated", "")
        
        # Cria ETag baseado na versão e data de atualização
        etag = f'"{version}-{last_updated}"'
        
        # Verifica se o cliente já tem a versão mais recente
        if_none_match = request.headers.get("If-None-Match")
        if if_none_match == etag:
            return Response(status_code=status.HTTP_304_NOT_MODIFIED)
        
        # Retorna dados com headers de cache otimizados
        # FastAPI serializa automaticamente o dict para JSON
        response = Response(
            content=json.dumps(questions_data, ensure_ascii=False),
            media_type="application/json",
            headers={
                "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
                "ETag": etag,
                "Last-Modified": last_updated if last_updated else "",
            }
        )
        return response
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo de perguntas do formulário não encontrado"
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar arquivo de perguntas do formulário"
        )


@forms_questions_router.get("/additional")
async def get_additional_form_questions(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Retorna a estrutura completa das perguntas do formulário adicional em JSON.
    Requer autenticação.
    
    Este formulário é usado para consultas de retorno.
    Headers de cache configurados para otimizar performance.
    """
    try:
        questions_data = load_form_definition(FORM_KIND_ADDITIONAL)
        
        # Obtém versão do formulário para ETag
        version = questions_data.get("version", "unknown")
        last_updated = questions_data.get("last_updated", "")
        
        # Cria ETag baseado na versão e data de atualização
        etag = f'"{version}-{last_updated}"'
        
        # Verifica se o cliente já tem a versão mais recente
        if_none_match = request.headers.get("If-None-Match")
        if if_none_match == etag:
            return Response(status_code=status.HTTP_304_NOT_MODIFIED)
        
        # Retorna dados com headers de cache otimizados
        response = Response(
            content=json.dumps(questions_data, ensure_ascii=False),
            media_type="application/json",
            headers={
                "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
                "ETag": etag,
                "Last-Modified": last_updated if last_updated else "",
            }
        )
        return response
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo de perguntas do formulário adicional não encontrado"
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar arquivo de perguntas do formulário adicional"
        )


@forms_questions_router.post("/{form_kind}/questions")
@limiter.limit(RATE_LIMIT_FORM_SCHEMA_WRITE)
async def create_form_question(
    request: Request,
    form_kind: str,
    payload: schemas.FormQuestionCreateRequest,
    current_user: models.User = Depends(require_form_schema_admin),
):
    """
    Adiciona uma nova pergunta a uma seção existente do formulário.
    Restrito a usuários administradores configurados.
    """
    updated_definition = add_question(
        form_kind=form_kind,
        section_id=payload.section_id,
        question=payload.question.model_dump(exclude_none=True),
        insert_after_question_id=payload.insert_after_question_id,
    )
    logger.info(
        "Pergunta adicionada ao formulário %s por usuário %s: %s",
        form_kind,
        current_user.username,
        payload.question.id,
    )
    return updated_definition


@forms_questions_router.delete("/{form_kind}/questions/{question_id}")
@limiter.limit(RATE_LIMIT_FORM_SCHEMA_WRITE)
async def delete_form_question(
    request: Request,
    form_kind: str,
    question_id: str,
    current_user: models.User = Depends(require_form_schema_admin),
):
    """
    Remove uma pergunta do formulário quando isso não compromete as regras do sistema.
    Restrito a usuários administradores configurados.
    """
    updated_definition = remove_question(form_kind=form_kind, question_id=question_id)
    logger.info(
        "Pergunta removida do formulário %s por usuário %s: %s",
        form_kind,
        current_user.username,
        question_id,
    )
    return updated_definition


@forms_questions_router.put("/{form_kind}/questions/{question_id}")
@limiter.limit(RATE_LIMIT_FORM_SCHEMA_WRITE)
async def update_form_question(
    request: Request,
    form_kind: str,
    question_id: str,
    payload: schemas.FormQuestionUpdateRequest,
    current_user: models.User = Depends(require_form_schema_admin),
):
    """
    Atualiza uma pergunta existente sem permitir alterações que quebrem referências do sistema.
    Restrito a usuários administradores configurados.
    """
    updated_definition = update_question(
        form_kind=form_kind,
        question_id=question_id,
        section_id=payload.section_id,
        question=payload.question.model_dump(exclude_none=True),
        insert_after_question_id=payload.insert_after_question_id,
    )
    logger.info(
        "Pergunta atualizada no formulário %s por usuário %s: %s",
        form_kind,
        current_user.username,
        question_id,
    )
    return updated_definition
