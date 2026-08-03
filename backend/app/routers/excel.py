"""
Router de Excel.
Gerencia exportação e importação de pacientes via Excel.

SEGURANÇA:
- Exportação retorna apenas dados do usuário logado
- Importação cria pacientes vinculados ao usuário logado
"""

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask
import logging
import os
import tempfile

from app import crud, models, schemas, auth, excel_service
from app.database import get_db
from app.config import RATE_LIMIT_EXCEL, EXCEL_MAX_UPLOAD_SIZE_BYTES
from app.rate_limit import limiter

logger = logging.getLogger(__name__)

# Cria o router
router = APIRouter(prefix="/api", tags=["Excel"])


def _safe_remove_file(filepath: str) -> None:
    try:
        os.remove(filepath)
    except OSError:
        pass


def _patient_name_key(full_name: str) -> str:
    return " ".join(full_name.split()).casefold()


def _form_response_signature(response_date) -> str:
    if response_date is None:
        return ""
    return response_date.replace(tzinfo=None).isoformat()


def _persist_imported_patients(
    db: Session,
    user_id: int,
    imported_rows,
):
    """Persiste todas as linhas validas em uma unica transacao."""
    existing_patients = crud.get_patients(db, user_id=user_id, skip=0, limit=10000)
    patients_by_name = {
        _patient_name_key(patient.full_name): patient
        for patient in existing_patients
    }
    preexisting_names = set(patients_by_name)
    reused_names = set()
    response_signatures = {}

    for patient in existing_patients:
        responses = crud.get_form_responses_by_patient(
            db,
            patient_id=patient.id,
            user_id=user_id,
            skip=0,
            limit=10000,
        )
        response_signatures[patient.id] = {
            _form_response_signature(
                response.response_date,
            )
            for response in responses
        }

    created_patients = []
    created_responses = 0
    duplicate_responses = 0

    try:
        for imported in imported_rows:
            name_key = _patient_name_key(imported["full_name"])
            patient = patients_by_name.get(name_key)

            if patient is None:
                patient = crud.create_patient(
                    db=db,
                    patient=schemas.PatientCreate(full_name=imported["full_name"]),
                    user_id=user_id,
                    commit=False,
                )
                patients_by_name[name_key] = patient
                response_signatures[patient.id] = set()
                created_patients.append({"id": patient.id, "full_name": patient.full_name})
            elif name_key in preexisting_names:
                reused_names.add(name_key)

            imported_response = imported.get("form_response")
            if not imported_response:
                continue

            signature = _form_response_signature(
                imported_response["response_date"],
            )
            if signature in response_signatures[patient.id]:
                duplicate_responses += 1
                continue

            crud.create_form_response(
                db=db,
                form_response=schemas.FormResponseCreate(
                    patient_id=patient.id,
                    response_date=imported_response["response_date"],
                    uses_hormone_over_1year=imported_response["uses_hormone_over_1year"],
                    form_data=imported_response["form_data"],
                ),
                user_id=user_id,
                commit=False,
            )
            response_signatures[patient.id].add(signature)
            created_responses += 1

        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "created_patients": created_patients,
        "reused_patients": len(reused_names),
        "created_responses": created_responses,
        "duplicate_responses": duplicate_responses,
    }


@router.post("/export/excel")
@limiter.limit(RATE_LIMIT_EXCEL)
async def export_pacientes_excel(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Exporta pacientes do usuário com suas respostas de formulário para Excel.
    
    SEGURANÇA: Retorna apenas pacientes e respostas criados pelo usuário logado.
    Retorna arquivo Excel formatado profissionalmente.
    Requer autenticação.
    """
    try:
        # Busca apenas pacientes do usuário logado
        pacientes = crud.get_patients(
            db, 
            user_id=current_user.id,
            skip=0, 
            limit=10000
        )
        
        if not pacientes:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhum paciente encontrado para exportar"
            )
        
        # Prepara dados para exportação
        pacientes_data = []
        for paciente in pacientes:
            # Busca respostas do formulário do paciente (apenas do usuário)
            form_responses = crud.get_form_responses_by_patient(
                db, 
                patient_id=paciente.id, 
                user_id=current_user.id,
                skip=0, 
                limit=10000
            )
            
            # Converte para dicionários (sem CPF)
            patient_dict = {
                "id": paciente.id,
                "full_name": paciente.full_name,
                "created_at": paciente.created_at.isoformat() if paciente.created_at else None
            }
            
            responses_list = []
            for response in form_responses:
                response_dict = {
                    "id": response.id,
                    "response_date": response.response_date.isoformat() if response.response_date else None,
                    "uses_hormone_over_1year": response.uses_hormone_over_1year,
                    "form_data": response.form_data,
                    "next_return_date": response.next_return_date.isoformat() if response.next_return_date else None,
                    "created_at": response.created_at.isoformat() if response.created_at else None
                }
                responses_list.append(response_dict)
            
            pacientes_data.append({
                "patient": patient_dict,
                "form_responses": responses_list
            })
        
        # Gera arquivo Excel
        filepath = excel_service.exportar_pacientes_excel(pacientes_data)
        
        logger.info(f"Exportação Excel realizada por usuário: {current_user.username}")
        
        # Retorna arquivo
        return FileResponse(
            path=filepath,
            filename=os.path.basename(filepath),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            background=BackgroundTask(_safe_remove_file, filepath),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao exportar Excel: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao exportar arquivo Excel"
        )


@router.post("/import/excel")
@limiter.limit(RATE_LIMIT_EXCEL)
async def import_pacientes_excel(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Importa pacientes de um arquivo Excel.
    
    SEGURANÇA: Pacientes importados são vinculados ao usuário logado.
    Valida estrutura, limpa dados e cria pacientes no sistema.
    Requer autenticação.
    """
    temp_filepath = None
    
    try:
        # Valida tipo de arquivo
        if not (file.filename or "").lower().endswith('.xlsx'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Arquivo deve ser do tipo .xlsx"
            )
        
        # Salva arquivo temporário em stream com limite de tamanho
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
            total_bytes = 0
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > EXCEL_MAX_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=(
                            f"Arquivo excede o limite de "
                            f"{EXCEL_MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB"
                        )
                    )
                tmp_file.write(chunk)
            temp_filepath = tmp_file.name
        
        # Valida estrutura do arquivo
        is_valid, erros_validacao = excel_service.validar_estrutura_excel(temp_filepath)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Arquivo inválido: {'; '.join(erros_validacao)}"
            )
        
        # Importa pacientes
        pacientes_validados, erros = excel_service.importar_pacientes_excel(temp_filepath)
        
        if not pacientes_validados:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Nenhum paciente válido encontrado. Erros: {'; '.join(erros) if erros else 'Arquivo vazio'}"
            )
        
        persistence_result = _persist_imported_patients(
            db=db,
            user_id=current_user.id,
            imported_rows=pacientes_validados,
        )
        detalhes_erros = [
            {"paciente": "Linha da planilha", "erro": erro}
            for erro in erros
        ]
        
        logger.info(
            f"Importação Excel realizada por usuário: {current_user.username} - "
            f"{len(persistence_result['created_patients'])} pacientes e "
            f"{persistence_result['created_responses']} respostas criados; "
            f"{len(erros)} linhas inválidas"
        )
        
        # Retorna resultado
        return {
            "message": "Importação concluída",
            "pacientes_criados": len(persistence_result["created_patients"]),
            "pacientes_reutilizados": persistence_result["reused_patients"],
            "respostas_criadas": persistence_result["created_responses"],
            "respostas_duplicadas": persistence_result["duplicate_responses"],
            "pacientes_com_erro": len(erros),
            "total_processado": len(pacientes_validados) + len(erros),
            "erros_validacao": erros,
            "detalhes_criados": persistence_result["created_patients"],
            "detalhes_erros": detalhes_erros,
        }
        
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.error("Erro interno ao importar arquivo Excel")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao importar arquivo Excel"
        )
    finally:
        await file.close()
        # Remove arquivo temporário
        if temp_filepath and os.path.exists(temp_filepath):
            try:
                os.remove(temp_filepath)
            except:
                pass
