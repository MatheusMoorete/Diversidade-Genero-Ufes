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
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
        if not file.filename.lower().endswith(('.xlsx', '.xls')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Arquivo deve ser do tipo .xlsx ou .xls"
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
        
        # Cria pacientes no banco de dados
        pacientes_criados = []
        pacientes_com_erro = []
        
        for paciente_data in pacientes_validados:
            try:
                # Verifica se paciente já existe para este usuário (por nome)
                pacientes_existentes = crud.get_patients(
                    db, 
                    user_id=current_user.id,
                    skip=0, 
                    limit=1000, 
                    search=paciente_data["full_name"]
                )
                
                # Verifica se já existe paciente com mesmo nome exato
                paciente_existente = None
                for p in pacientes_existentes:
                    if p.full_name.strip().lower() == paciente_data["full_name"].strip().lower():
                        paciente_existente = p
                        break
                
                if paciente_existente:
                    pacientes_com_erro.append({
                        "paciente": paciente_data["full_name"],
                        "erro": "Paciente já existe no sistema"
                    })
                    continue
                
                # Cria novo paciente (sem CPF)
                paciente_create = schemas.PatientCreate(
                    full_name=paciente_data["full_name"]
                )
                
                # Cria paciente vinculado ao usuário logado
                novo_paciente = crud.create_patient(
                    db=db, 
                    patient=paciente_create,
                    user_id=current_user.id
                )
                pacientes_criados.append({
                    "id": novo_paciente.id,
                    "full_name": novo_paciente.full_name
                })
                
            except Exception as e:
                pacientes_com_erro.append({
                    "paciente": paciente_data.get("full_name", "Desconhecido"),
                    "erro": str(e)
                })
                continue
        
        logger.info(
            f"Importação Excel realizada por usuário: {current_user.username} - "
            f"{len(pacientes_criados)} criados, {len(pacientes_com_erro)} com erro"
        )
        
        # Retorna resultado
        return {
            "message": "Importação concluída",
            "pacientes_criados": len(pacientes_criados),
            "pacientes_com_erro": len(pacientes_com_erro),
            "total_processado": len(pacientes_validados),
            "erros_validacao": erros,
            "detalhes_criados": pacientes_criados,
            "detalhes_erros": pacientes_com_erro
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao importar Excel: {str(e)}", exc_info=True)
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
