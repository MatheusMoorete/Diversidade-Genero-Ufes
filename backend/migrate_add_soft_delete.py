"""
Script de migração do banco de dados.
Adiciona as colunas updated_at e deleted_at para suporte a soft delete.

Execute este script ANTES de iniciar a aplicação após atualizar os models.
O Neon suporta ALTER TABLE sem downtime.

Uso: python migrate_add_soft_delete.py
"""

import os
import sys
from pathlib import Path

# Adiciona o diretório pai ao path para importar app
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from app.config import DATABASE_URL

def run_migration():
    """
    Executa a migração adicionando colunas updated_at e deleted_at.
    """
    print("[*] Iniciando migracao...")
    print("[*] Conectando ao banco de dados...")
    
    engine = create_engine(DATABASE_URL)
    
    migrations = [
        # Adiciona updated_at e deleted_at na tabela patients
        ("patients", "updated_at", "ALTER TABLE patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE"),
        ("patients", "deleted_at", "ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE"),
        
        # Adiciona updated_at e deleted_at na tabela form_responses
        ("form_responses", "updated_at", "ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE"),
        ("form_responses", "deleted_at", "ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE"),
    ]
    
    with engine.connect() as conn:
        for table, column, sql in migrations:
            try:
                print(f"  [+] Adicionando {column} em {table}...")
                conn.execute(text(sql))
                conn.commit()
                print(f"  [OK] {column} adicionado com sucesso!")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                    print(f"  [SKIP] {column} ja existe em {table}, pulando...")
                else:
                    print(f"  [ERROR] Erro ao adicionar {column}: {e}")
                    raise
    
    print("")
    print("[OK] Migracao concluida com sucesso!")
    print("")
    print("Resumo das alteracoes:")
    print("  - patients.updated_at (TIMESTAMP) - rastreia ultima modificacao")
    print("  - patients.deleted_at (TIMESTAMP) - soft delete")
    print("  - form_responses.updated_at (TIMESTAMP) - rastreia ultima modificacao")
    print("  - form_responses.deleted_at (TIMESTAMP) - soft delete")
    print("")
    print("[*] Voce pode iniciar a aplicacao normalmente agora.")


if __name__ == "__main__":
    run_migration()
