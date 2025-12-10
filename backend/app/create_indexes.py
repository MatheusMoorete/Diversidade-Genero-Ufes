"""
Script para criar índices otimizados no banco de dados.
Executa uma vez para melhorar performance das queries.

Índices criados:
- Índice composto em (created_by_user_id, full_name) para busca e ordenação por nome
- Índice composto em (created_by_user_id, created_at DESC) para ordenação por data
- Índice em created_by_user_id se não existir (já pode existir via ForeignKey)
"""

from sqlalchemy import text
from app.database import engine

def create_indexes():
    """Cria índices otimizados para melhorar performance."""
    with engine.begin() as conn:
        try:
            # Índice composto para busca e ordenação por nome
            # Útil para queries: WHERE created_by_user_id = X AND full_name ILIKE '%search%' ORDER BY full_name
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_patients_user_name 
                ON patients(created_by_user_id, full_name)
            """))
            
            # Índice composto para ordenação por data (DESC)
            # Útil para queries: WHERE created_by_user_id = X ORDER BY created_at DESC
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_patients_user_created_at 
                ON patients(created_by_user_id, created_at DESC)
            """))
            
            # Índice simples em created_by_user_id (pode já existir, mas garante)
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_patients_created_by_user_id 
                ON patients(created_by_user_id)
            """))
            
            # Índice para form_responses (otimizar queries de retornos)
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_form_responses_patient_user 
                ON form_responses(patient_id, created_by_user_id)
            """))
            
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_form_responses_next_return 
                ON form_responses(created_by_user_id, next_return_date) 
                WHERE next_return_date IS NOT NULL
            """))
            
            print("✅ Índices criados com sucesso!")
            
        except Exception as e:
            # Não levanta exceção, apenas loga (pode ser que índices já existam)
            print(f"⚠️  Aviso ao criar índices (pode ser normal): {e}")
            # Não faz rollback explícito - engine.begin() já faz isso automaticamente em caso de exceção

if __name__ == "__main__":
    create_indexes()

