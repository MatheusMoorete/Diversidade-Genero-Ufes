"""
Schemas Pydantic para validação de dados de entrada e saída.
Define a estrutura esperada para requisições e respostas da API.
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Dict, Any, Literal, List
from datetime import datetime


# Schemas para User
class UserBase(BaseModel):
    """Schema base para User."""
    username: str = Field(..., min_length=3, max_length=50, description="Nome de usuário único")


class UserCreate(UserBase):
    """Schema para criação de usuário."""
    password: str = Field(..., min_length=6, description="Senha do usuário (mínimo 6 caracteres)")

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Senha deve ter no máximo 72 bytes em UTF-8")
        return value


class UserResponse(UserBase):
    """Schema para resposta de usuário (sem senha)."""
    id: int
    created_at: datetime
    is_form_admin: bool = False

    class Config:
        from_attributes = True


class NeonSnapshotSummary(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    created_at: Optional[str] = None
    expires_at: Optional[str] = None
    source_branch_id: Optional[str] = None


class NeonBackupStatusResponse(BaseModel):
    configured: bool
    healthy: bool
    checked_at: str
    project_id: Optional[str] = None
    branch_id: Optional[str] = None
    retention_days: int
    max_age_hours: int
    latest_snapshot: Optional[NeonSnapshotSummary] = None
    created_snapshot: Optional[NeonSnapshotSummary] = None
    recent_snapshots: List[NeonSnapshotSummary] = Field(default_factory=list)
    issues: List[str] = Field(default_factory=list)
    latest_snapshot_age_hours: Optional[float] = None


class FormQuestionConditional(BaseModel):
    depends_on: str = Field(..., min_length=2, max_length=64)
    value: Optional[str | bool] = None
    value_not: Optional[str] = None

    @model_validator(mode="after")
    def validate_conditional(self) -> "FormQuestionConditional":
        if self.value is None and self.value_not is None:
            raise ValueError("Conditional deve informar value ou value_not")
        if self.value is not None and self.value_not is not None:
            raise ValueError("Conditional deve informar apenas value ou value_not")
        return self


class FormQuestionCalculated(BaseModel):
    formula: str = Field(..., min_length=1, max_length=120)
    depends_on: List[str] = Field(..., min_length=1)


class FormQuestionDefinition(BaseModel):
    id: str = Field(..., min_length=2, max_length=64)
    label: str = Field(..., min_length=1, max_length=300)
    type: Literal["text", "textarea", "number", "boolean", "select", "multiselect", "date", "tel", "radio", "checkbox"]
    required: bool = False
    options: Optional[List[str]] = None
    placeholder: Optional[str] = Field(None, max_length=200)
    min: Optional[float] = None
    max: Optional[float] = None
    readonly: bool = False
    allow_other: bool = False
    conditional: Optional[FormQuestionConditional] = None
    calculated: Optional[FormQuestionCalculated] = None


class FormQuestionCreateRequest(BaseModel):
    section_id: str = Field(..., min_length=2, max_length=64)
    insert_after_question_id: Optional[str] = Field(None, min_length=2, max_length=64)
    question: FormQuestionDefinition


class FormQuestionUpdateRequest(BaseModel):
    section_id: str = Field(..., min_length=2, max_length=64)
    insert_after_question_id: Optional[str] = Field(None, min_length=2, max_length=64)
    question: FormQuestionDefinition


# Schemas para Patient
class PatientBase(BaseModel):
    """Schema base para Patient."""
    full_name: str = Field(..., min_length=1, max_length=255, description="Nome completo do paciente")


class PatientCreate(PatientBase):
    """Schema para criação de paciente."""
    pass


class PatientUpdate(BaseModel):
    """Schema para atualização de paciente."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)


class PatientResponse(PatientBase):
    """
    Schema para resposta de paciente.
    Não inclui dados sensíveis de identificação.
    """
    id: int
    created_by_user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Schemas para FormResponse
class FormResponseBase(BaseModel):
    """Schema base para FormResponse."""
    patient_id: int = Field(..., description="ID do paciente")
    response_date: datetime = Field(..., description="Data da resposta do formulário")
    uses_hormone_over_1year: bool = Field(False, description="Usa hormônio há mais de 1 ano")
    form_data: Optional[Dict[str, Any]] = Field(None, description="Dados adicionais do formulário em JSON")
    next_return_date: Optional[datetime] = Field(None, description="Data do próximo retorno")


class FormResponseCreate(FormResponseBase):
    """Schema para criação de resposta de formulário."""
    pass


class FormResponseUpdate(BaseModel):
    """Schema para atualização de resposta de formulário."""
    response_date: Optional[datetime] = None
    uses_hormone_over_1year: Optional[bool] = None
    form_data: Optional[Dict[str, Any]] = None
    next_return_date: Optional[datetime] = None


class FormResponseResponse(FormResponseBase):
    """Schema para resposta de formulário."""
    id: int
    created_by_user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Schemas para Autenticação
class Token(BaseModel):
    """Schema para resposta de token JWT."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema para dados do token."""
    username: Optional[str] = None


class LoginRequest(BaseModel):
    """Schema para requisição de login."""
    username: str
    password: str
