"""
Operações CRUD (Create, Read, Update, Delete) para os modelos.
Contém as funções de acesso ao banco de dados.
"""

from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas
from app.auth import get_password_hash
from datetime import datetime


# CRUD para User
def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """
    Cria um novo usuário no banco de dados.
    
    Args:
        db: Sessão do banco de dados
        user: Dados do usuário a ser criado
        
    Returns:
        Objeto User criado
    """
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    """
    Busca um usuário pelo username.
    
    Args:
        db: Sessão do banco de dados
        username: Nome de usuário
        
    Returns:
        Objeto User se encontrado, None caso contrário
    """
    return db.query(models.User).filter(models.User.username == username).first()


# CRUD para Patient
def create_patient(
    db: Session, 
    patient: schemas.PatientCreate,
    user_id: int
) -> models.Patient:
    """
    Cria um novo paciente no banco de dados.
    O paciente fica vinculado ao usuário que o criou.
    
    Args:
        db: Sessão do banco de dados
        patient: Dados do paciente a ser criado
        user_id: ID do usuário que está criando
        
    Returns:
        Objeto Patient criado
    """
    db_patient = models.Patient(
        full_name=patient.full_name,
        created_by_user_id=user_id
    )
    
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


def get_patient(db: Session, patient_id: int) -> Optional[models.Patient]:
    """
    Busca um paciente pelo ID.
    
    Args:
        db: Sessão do banco de dados
        patient_id: ID do paciente
        
    Returns:
        Objeto Patient se encontrado, None caso contrário
    """
    return db.query(models.Patient).filter(models.Patient.id == patient_id).first()


def get_patient_by_user(
    db: Session, 
    patient_id: int, 
    user_id: int
) -> Optional[models.Patient]:
    """
    Busca um paciente pelo ID, verificando se pertence ao usuário.
    
    SEGURANÇA: Retorna None se o paciente não pertencer ao usuário.
    
    Args:
        db: Sessão do banco de dados
        patient_id: ID do paciente
        user_id: ID do usuário
        
    Returns:
        Objeto Patient se encontrado e pertencer ao usuário, None caso contrário
    """
    return db.query(models.Patient).filter(
        models.Patient.id == patient_id,
        models.Patient.created_by_user_id == user_id
    ).first()


def get_patients(
    db: Session, 
    user_id: int,
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = None,
    order_by: Optional[str] = None
) -> List[models.Patient]:
    """
    Lista pacientes com paginação, busca e ordenação opcionais.
    
    SEGURANÇA: Retorna apenas pacientes criados pelo usuário.
    
    Args:
        db: Sessão do banco de dados
        user_id: ID do usuário (filtra apenas pacientes deste usuário)
        skip: Número de registros a pular (para paginação)
        limit: Número máximo de registros a retornar
        search: Termo de busca para filtrar por nome
        order_by: 'name' para ordem alfabética, 'created_at' para ordem de cadastro (padrão: created_at)
        
    Returns:
        Lista de objetos Patient
    """
    # Query otimizada: sempre filtra por user_id primeiro (usa índice)
    query = db.query(models.Patient).filter(
        models.Patient.created_by_user_id == user_id
    )
    
    # Busca otimizada: se há search, aplica ILIKE
    # Para pequenos datasets, ILIKE com índice em full_name é aceitável
    if search:
        search_term = search.strip()
        if search_term:
            query = query.filter(models.Patient.full_name.ilike(f"%{search_term}%"))
    
    # Aplica ordenação (usa índices compostos criados)
    if order_by == 'name':
        query = query.order_by(models.Patient.full_name.asc())
    else:
        # Padrão: ordem de cadastro (mais recente primeiro)
        query = query.order_by(models.Patient.created_at.desc())
    
    # Aplica paginação e retorna
    return query.offset(skip).limit(limit).all()


def update_patient(
    db: Session, 
    patient_id: int, 
    patient_update: schemas.PatientUpdate,
    user_id: int
) -> Optional[models.Patient]:
    """
    Atualiza um paciente existente.
    
    SEGURANÇA: Só atualiza se o paciente pertencer ao usuário.
    
    Args:
        db: Sessão do banco de dados
        patient_id: ID do paciente a ser atualizado
        patient_update: Dados a serem atualizados
        user_id: ID do usuário (para verificação de propriedade)
        
    Returns:
        Objeto Patient atualizado se encontrado e pertencer ao usuário, None caso contrário
    """
    db_patient = get_patient_by_user(db, patient_id, user_id)
    if not db_patient:
        return None
    
    if patient_update.full_name is not None:
        db_patient.full_name = patient_update.full_name
    
    db.commit()
    db.refresh(db_patient)
    return db_patient


def delete_patient(db: Session, patient_id: int, user_id: int) -> bool:
    """
    Remove um paciente do banco de dados.
    
    SEGURANÇA: Só remove se o paciente pertencer ao usuário.
    
    Args:
        db: Sessão do banco de dados
        patient_id: ID do paciente a ser removido
        user_id: ID do usuário (para verificação de propriedade)
        
    Returns:
        True se o paciente foi removido, False caso contrário
    """
    db_patient = get_patient_by_user(db, patient_id, user_id)
    if not db_patient:
        return False
    
    db.delete(db_patient)
    db.commit()
    return True


# CRUD para FormResponse
def create_form_response(
    db: Session, 
    form_response: schemas.FormResponseCreate,
    user_id: int
) -> models.FormResponse:
    """
    Cria uma nova resposta de formulário.
    
    Args:
        db: Sessão do banco de dados
        form_response: Dados da resposta do formulário
        user_id: ID do usuário que está criando
        
    Returns:
        Objeto FormResponse criado
    """
    db_form_response = models.FormResponse(
        patient_id=form_response.patient_id,
        response_date=form_response.response_date,
        uses_hormone_over_1year=form_response.uses_hormone_over_1year,
        form_data=form_response.form_data,
        next_return_date=form_response.next_return_date,
        created_by_user_id=user_id
    )
    db.add(db_form_response)
    db.commit()
    db.refresh(db_form_response)
    return db_form_response


def get_form_response(db: Session, form_response_id: int) -> Optional[models.FormResponse]:
    """
    Busca uma resposta de formulário pelo ID.
    
    Args:
        db: Sessão do banco de dados
        form_response_id: ID da resposta
        
    Returns:
        Objeto FormResponse se encontrado, None caso contrário
    """
    return db.query(models.FormResponse).filter(
        models.FormResponse.id == form_response_id
    ).first()


def get_form_response_by_user(
    db: Session, 
    form_response_id: int,
    user_id: int
) -> Optional[models.FormResponse]:
    """
    Busca uma resposta de formulário pelo ID, verificando se pertence ao usuário.
    
    SEGURANÇA: Retorna None se a resposta não pertencer ao usuário.
    
    Args:
        db: Sessão do banco de dados
        form_response_id: ID da resposta
        user_id: ID do usuário
        
    Returns:
        Objeto FormResponse se encontrado e pertencer ao usuário, None caso contrário
    """
    return db.query(models.FormResponse).filter(
        models.FormResponse.id == form_response_id,
        models.FormResponse.created_by_user_id == user_id
    ).first()


def get_form_responses_by_patient(
    db: Session, 
    patient_id: int,
    user_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[models.FormResponse]:
    """
    Lista todas as respostas de formulário de um paciente.
    
    SEGURANÇA: Retorna apenas respostas criadas pelo usuário.
    
    Args:
        db: Sessão do banco de dados
        patient_id: ID do paciente
        user_id: ID do usuário (filtra apenas respostas deste usuário)
        skip: Número de registros a pular
        limit: Número máximo de registros a retornar
        
    Returns:
        Lista de objetos FormResponse
    """
    return db.query(models.FormResponse).filter(
        models.FormResponse.patient_id == patient_id,
        models.FormResponse.created_by_user_id == user_id
    ).offset(skip).limit(limit).all()


def update_form_response(
    db: Session,
    form_response_id: int,
    form_response_update: schemas.FormResponseUpdate,
    user_id: int
) -> Optional[models.FormResponse]:
    """
    Atualiza uma resposta de formulário existente.
    
    SEGURANÇA: Só atualiza se a resposta pertencer ao usuário.
    
    Args:
        db: Sessão do banco de dados
        form_response_id: ID da resposta a ser atualizada
        form_response_update: Dados a serem atualizados
        user_id: ID do usuário (para verificação de propriedade)
        
    Returns:
        Objeto FormResponse atualizado se encontrado e pertencer ao usuário, None caso contrário
    """
    db_form_response = get_form_response_by_user(db, form_response_id, user_id)
    if not db_form_response:
        return None
    
    if form_response_update.response_date is not None:
        db_form_response.response_date = form_response_update.response_date
    
    if form_response_update.uses_hormone_over_1year is not None:
        db_form_response.uses_hormone_over_1year = form_response_update.uses_hormone_over_1year
    
    if form_response_update.form_data is not None:
        db_form_response.form_data = form_response_update.form_data
    
    if form_response_update.next_return_date is not None:
        db_form_response.next_return_date = form_response_update.next_return_date
    
    db.commit()
    db.refresh(db_form_response)
    return db_form_response


def delete_form_response(db: Session, form_response_id: int, user_id: int) -> bool:
    """
    Remove uma resposta de formulário do banco de dados.
    
    SEGURANÇA: Só remove se a resposta pertencer ao usuário.
    
    Args:
        db: Sessão do banco de dados
        form_response_id: ID da resposta a ser removida
        user_id: ID do usuário (para verificação de propriedade)
        
    Returns:
        True se a resposta foi removida, False caso contrário
    """
    db_form_response = get_form_response_by_user(db, form_response_id, user_id)
    if not db_form_response:
        return False
    
    db.delete(db_form_response)
    db.commit()
    return True

