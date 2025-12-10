"""
Módulo de manipulação de arquivos Excel.
Gerencia exportação e importação de pacientes e formulários em formato Excel.

SEGURANÇA:
- Não exporta nem importa dados sensíveis de identificação (CPF, RG, etc.)
- Exportação filtra apenas dados do usuário logado (feito no router)
"""

import pandas as pd
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import logging
from pathlib import Path

from app.config import EXPORT_DIR

logger = logging.getLogger(__name__)

# Configuração de cores e formatação
HEADER_COLOR = "4472C4"  # Azul
HEADER_TEXT_COLOR = "FFFFFF"  # Branco


def ensure_export_dir():
    """
    Garante que o diretório de exportação existe.
    """
    Path(EXPORT_DIR).mkdir(parents=True, exist_ok=True)


def exportar_pacientes_excel(
    pacientes_data: List[Dict[str, Any]]
) -> str:
    """
    Exporta lista de pacientes com suas respostas de formulário para Excel.
    
    Cada paciente pode ter múltiplas respostas de formulário. Cada pergunta
    do formulário será uma coluna separada no Excel.
    
    Args:
        pacientes_data: Lista de dicionários contendo:
            - patient: dados do paciente (id, full_name, created_at)
            - form_responses: lista de respostas de formulário do paciente
    
    Returns:
        Caminho do arquivo Excel gerado
        
    Raises:
        Exception: Se houver erro ao gerar o arquivo
    """
    try:
        ensure_export_dir()
        
        # Prepara lista de linhas para o DataFrame
        rows = []
        
        # Processa cada paciente e suas respostas
        for paciente_info in pacientes_data:
            patient = paciente_info.get("patient", {})
            form_responses = paciente_info.get("form_responses", [])
            
            # Se o paciente não tem respostas, cria uma linha vazia
            if not form_responses:
                row = {
                    "ID_Paciente": patient.get("id"),
                    "Nome_Completo": patient.get("full_name", ""),
                    "Data_Cadastro": patient.get("created_at"),
                }
                rows.append(row)
            else:
                # Para cada resposta, cria uma linha
                for response in form_responses:
                    row = {
                        "ID_Paciente": patient.get("id"),
                        "Nome_Completo": patient.get("full_name", ""),
                        "Data_Cadastro": patient.get("created_at"),
                        "ID_Resposta": response.get("id"),
                        "Data_Resposta": response.get("response_date"),
                        "Usa_Hormonio_Mais_1_Ano": response.get("uses_hormone_over_1year", False),
                        "Data_Proximo_Retorno": response.get("next_return_date"),
                        "Data_Criacao_Resposta": response.get("created_at"),
                    }
                    
                    # Adiciona campos do form_data como colunas separadas
                    form_data = response.get("form_data", {})
                    if form_data and isinstance(form_data, dict):
                        for key, value in form_data.items():
                            # Sanitiza o nome da coluna
                            col_name = f"Form_{key}"
                            row[col_name] = value
                    
                    rows.append(row)
        
        # Cria DataFrame
        if not rows:
            raise ValueError("Nenhum dado para exportar")
        
        df = pd.DataFrame(rows)
        
        # Gera nome do arquivo com timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"pacientes_export_{timestamp}.xlsx"
        filepath = str(EXPORT_DIR / filename)
        
        # Salva Excel usando openpyxl para formatação
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Pacientes', index=False)
            
            # Obtém a planilha para formatação
            worksheet = writer.sheets['Pacientes']
            
            # Formata cabeçalho
            header_fill = PatternFill(start_color=HEADER_COLOR, end_color=HEADER_COLOR, fill_type="solid")
            header_font = Font(bold=True, color=HEADER_TEXT_COLOR, size=11)
            header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            
            # Aplica formatação no cabeçalho
            for cell in worksheet[1]:
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = header_alignment
            
            # Ajusta largura das colunas
            for column in worksheet.columns:
                max_length = 0
                column_letter = get_column_letter(column[0].column)
                
                # Encontra o comprimento máximo na coluna
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                
                # Define largura (mínimo 10, máximo 50)
                adjusted_width = min(max(max_length + 2, 10), 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width
            
            # Congela primeira linha
            worksheet.freeze_panes = "A2"
            
            # Aplica alinhamento nas células de dados
            data_alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            for row in worksheet.iter_rows(min_row=2, max_row=worksheet.max_row):
                for cell in row:
                    cell.alignment = data_alignment
        
        logger.info(f"Arquivo Excel exportado com sucesso: {filepath}")
        return filepath
        
    except Exception as e:
        logger.error(f"Erro ao exportar Excel: {str(e)}", exc_info=True)
        raise Exception(f"Erro ao exportar arquivo Excel: {str(e)}")


def importar_pacientes_excel(
    filepath: str
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Importa pacientes de um arquivo Excel.
    
    Valida a estrutura do arquivo, limpa os dados e retorna lista de pacientes
    validados ou lista de erros encontrados.
    
    Args:
        filepath: Caminho do arquivo Excel a ser importado
    
    Returns:
        Tupla contendo:
            - Lista de pacientes validados (dicionários)
            - Lista de erros encontrados (strings vazia se não houver erros)
    
    Raises:
        Exception: Se houver erro crítico ao processar o arquivo
    """
    erros = []
    pacientes_validados = []
    
    try:
        # Verifica se o arquivo existe
        filepath_obj = Path(filepath)
        if not filepath_obj.exists():
            raise FileNotFoundError(f"Arquivo não encontrado: {filepath}")
        
        # Lê o arquivo Excel
        try:
            df = pd.read_excel(filepath, engine='openpyxl')
        except Exception as e:
            raise Exception(f"Erro ao ler arquivo Excel: {str(e)}")
        
        # Valida colunas obrigatórias
        colunas_obrigatorias = ["Nome_Completo"]
        colunas_faltando = [col for col in colunas_obrigatorias if col not in df.columns]
        
        if colunas_faltando:
            erros.append(f"Colunas obrigatórias faltando: {', '.join(colunas_faltando)}")
            return pacientes_validados, erros
        
        # Processa cada linha
        for index, row in df.iterrows():
            linha_num = index + 2  # +2 porque index começa em 0 e há cabeçalho
            
            try:
                # Limpa e valida nome completo
                nome_completo = str(row.get("Nome_Completo", "")).strip()
                if not nome_completo or nome_completo.lower() in ["nan", "none", ""]:
                    erros.append(f"Linha {linha_num}: Nome completo é obrigatório")
                    continue
                
                if len(nome_completo) > 255:
                    erros.append(f"Linha {linha_num}: Nome completo muito longo (máximo 255 caracteres)")
                    continue
                
                # Prepara dados do paciente (sem CPF)
                paciente = {
                    "full_name": nome_completo
                }
                
                # Adiciona campos opcionais se existirem
                if "ID_Paciente" in df.columns and pd.notna(row.get("ID_Paciente")):
                    try:
                        paciente["id"] = int(row.get("ID_Paciente"))
                    except:
                        pass  # ID é opcional na importação
                
                pacientes_validados.append(paciente)
                
            except Exception as e:
                erros.append(f"Linha {linha_num}: Erro ao processar - {str(e)}")
                continue
        
        if not pacientes_validados and not erros:
            erros.append("Nenhum paciente válido encontrado no arquivo")
        
        logger.info(f"Importação concluída: {len(pacientes_validados)} pacientes válidos, {len(erros)} erros")
        return pacientes_validados, erros
        
    except FileNotFoundError as e:
        logger.error(f"Arquivo não encontrado: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Erro ao importar Excel: {str(e)}", exc_info=True)
        raise Exception(f"Erro ao importar arquivo Excel: {str(e)}")


def validar_estrutura_excel(filepath: str) -> Tuple[bool, List[str]]:
    """
    Valida a estrutura básica de um arquivo Excel antes da importação.
    
    Args:
        filepath: Caminho do arquivo Excel
    
    Returns:
        Tupla contendo:
            - True se a estrutura é válida, False caso contrário
            - Lista de mensagens de erro
    """
    erros = []
    
    try:
        # Verifica extensão
        if not str(filepath).lower().endswith(('.xlsx', '.xls')):
            erros.append("Arquivo deve ser do tipo .xlsx ou .xls")
            return False, erros
        
        # Tenta abrir o arquivo
        try:
            wb = load_workbook(filepath, read_only=True)
            if len(wb.sheetnames) == 0:
                erros.append("Arquivo não contém planilhas")
                return False, erros
            wb.close()
        except Exception as e:
            erros.append(f"Arquivo Excel corrompido ou inválido: {str(e)}")
            return False, erros
        
        return True, erros
        
    except Exception as e:
        erros.append(f"Erro ao validar arquivo: {str(e)}")
        return False, erros
