"""
Configuração do banco de dados PostgreSQL (Neon) usando SQLAlchemy.
Gerencia a conexão e sessão do banco de dados.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import DATABASE_URL, SQL_ECHO

# Configuração do engine para PostgreSQL/Neon
# pool_pre_ping verifica conexões antes de usar (importante para Neon serverless)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verifica conexões antes de usar (importante para Neon serverless)
    pool_size=5,  # Tamanho do pool de conexões
    max_overflow=10,  # Conexões extras permitidas
    echo=SQL_ECHO  # Log de queries (desabilitado por padrão)
)

# Cria a classe SessionLocal para criar sessões do banco
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para os modelos declarativos
Base = declarative_base()


def get_db():
    """
    Dependency para obter uma sessão do banco de dados.
    Usado como dependency no FastAPI para gerenciar a sessão automaticamente.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Inicializa o banco de dados criando todas as tabelas.
    Deve ser chamado na inicialização da aplicação.
    """
    Base.metadata.create_all(bind=engine)

