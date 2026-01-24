"""
Modelos SQLAlchemy para o banco de dados.
Define a estrutura das tabelas: User, Patient e FormResponse.

SEGURANÇA:
- Dados de pacientes são sensíveis e protegidos
- Cada usuário só pode acessar dados que ele criou
- Não armazenamos CPF ou outros documentos de identificação
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """
    Modelo para pesquisadores/usuários do sistema.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relacionamentos
    form_responses = relationship("FormResponse", back_populates="created_by")
    patients = relationship("Patient", back_populates="created_by")


class Patient(Base):
    """
    Modelo para pacientes do sistema.
    
    SEGURANÇA: Cada paciente está vinculado ao usuário que o criou.
    Usuários só podem acessar pacientes que eles mesmos criaram.
    
    AUDITORIA: 
    - updated_at: rastreia última modificação (LGPD)
    - deleted_at: soft delete para recuperação de dados
    """
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)  # Soft delete

    # Relacionamentos
    form_responses = relationship("FormResponse", back_populates="patient", cascade="all, delete-orphan")
    created_by = relationship("User", back_populates="patients")


class FormResponse(Base):
    """
    Modelo para respostas dos formulários dos pacientes.
    
    AUDITORIA: 
    - updated_at: rastreia última modificação (LGPD)
    - deleted_at: soft delete para recuperação de dados
    """
    __tablename__ = "form_responses"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    response_date = Column(DateTime(timezone=True), nullable=False)
    uses_hormone_over_1year = Column(Boolean, default=False, nullable=False)
    form_data = Column(JSON, nullable=True)  # Dados adicionais do formulário em JSON
    next_return_date = Column(DateTime(timezone=True), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)  # Soft delete

    # Relacionamentos
    patient = relationship("Patient", back_populates="form_responses")
    created_by = relationship("User", back_populates="form_responses")

