"""
Serviço de Backup do Sistema.
Permite exportar todos os dados do banco em formato JSON para backup completo.

SEGURANÇA:
- Exporta apenas dados do usuário logado
- Não inclui hashes de senha na exportação
"""

import json
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
import logging

from app import models
from app.config import EXPORT_DIR

logger = logging.getLogger(__name__)


def create_full_backup(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Cria um backup completo de todos os dados do usuário.
    
    SEGURANÇA: Exporta apenas dados do usuário especificado.
    
    Args:
        db: Sessão do banco de dados
        user_id: ID do usuário
        
    Returns:
        Dicionário com todos os dados do usuário
    """
    # Busca dados do usuário (sem senha)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise ValueError("Usuário não encontrado")
    
    # Busca TODOS os pacientes (incluindo deletados para backup completo)
    patients = db.query(models.Patient).filter(
        models.Patient.created_by_user_id == user_id
    ).all()
    
    # Busca TODAS as respostas (incluindo deletadas para backup completo)
    form_responses = db.query(models.FormResponse).filter(
        models.FormResponse.created_by_user_id == user_id
    ).all()
    
    # Monta estrutura de backup
    backup_data = {
        "backup_metadata": {
            "created_at": datetime.now().isoformat(),
            "user_id": user_id,
            "username": user.username,
            "version": "1.0",
            "total_patients": len(patients),
            "total_form_responses": len(form_responses)
        },
        "user": {
            "id": user.id,
            "username": user.username,
            "created_at": user.created_at.isoformat() if user.created_at else None
            # Nota: password_hash NÃO é exportado por segurança
        },
        "patients": [
            {
                "id": p.id,
                "full_name": p.full_name,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                "deleted_at": p.deleted_at.isoformat() if p.deleted_at else None
            }
            for p in patients
        ],
        "form_responses": [
            {
                "id": fr.id,
                "patient_id": fr.patient_id,
                "response_date": fr.response_date.isoformat() if fr.response_date else None,
                "uses_hormone_over_1year": fr.uses_hormone_over_1year,
                "form_data": fr.form_data,
                "next_return_date": fr.next_return_date.isoformat() if fr.next_return_date else None,
                "created_at": fr.created_at.isoformat() if fr.created_at else None,
                "updated_at": fr.updated_at.isoformat() if fr.updated_at else None,
                "deleted_at": fr.deleted_at.isoformat() if fr.deleted_at else None
            }
            for fr in form_responses
        ]
    }
    
    logger.info(
        f"Backup criado para usuário {user.username}: "
        f"{len(patients)} pacientes, {len(form_responses)} respostas"
    )
    
    return backup_data


def save_backup_to_file(backup_data: Dict[str, Any], user_id: int) -> str:
    """
    Salva o backup em um arquivo JSON.
    
    Args:
        backup_data: Dados do backup
        user_id: ID do usuário
        
    Returns:
        Caminho do arquivo salvo
    """
    # Garante que o diretório existe
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Gera nome do arquivo
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_user_{user_id}_{timestamp}.json"
    filepath = EXPORT_DIR / filename
    
    # Salva arquivo
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(backup_data, f, ensure_ascii=False, indent=2)
    
    logger.info(f"Backup salvo em: {filepath}")
    
    return str(filepath)
