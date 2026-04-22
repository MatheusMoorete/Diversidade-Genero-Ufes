"""
Serviços para leitura, validação e persistência dos metadados dos formulários.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.config import FORM_QUESTIONS_ADDITIONAL_FILE, FORM_QUESTIONS_FILE

FORM_KIND_STANDARD = "standard"
FORM_KIND_ADDITIONAL = "additional"
FORM_KIND_TO_PATH = {
    FORM_KIND_STANDARD: FORM_QUESTIONS_FILE,
    FORM_KIND_ADDITIONAL: FORM_QUESTIONS_ADDITIONAL_FILE,
}
ALLOWED_QUESTION_TYPES = {
    "text",
    "textarea",
    "number",
    "boolean",
    "select",
    "multiselect",
    "date",
    "tel",
    "radio",
    "checkbox",
}
OPTION_BASED_TYPES = {"select", "multiselect", "radio", "checkbox"}
PROTECTED_QUESTION_IDS = {
    "bmi",
    "height",
    "hormone_therapy_over_one_year",
    "patient_name",
    "using_hormone_therapy",
    "weight",
}
QUESTION_ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,63}$")


def _get_form_path(form_kind: str) -> Path:
    try:
        return FORM_KIND_TO_PATH[form_kind]
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tipo de formulário inválido",
        ) from exc


def load_form_definition(form_kind: str) -> dict[str, Any]:
    path = _get_form_path(form_kind)
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo de perguntas do formulário não encontrado",
        ) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar arquivo de perguntas do formulário",
        ) from exc


def load_all_form_definitions() -> dict[str, dict[str, Any]]:
    return {
        FORM_KIND_STANDARD: load_form_definition(FORM_KIND_STANDARD),
        FORM_KIND_ADDITIONAL: load_form_definition(FORM_KIND_ADDITIONAL),
    }


def _normalize_label(label: str) -> str:
    return " ".join(label.lower().split())


def _iter_questions(payload: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        question
        for section in payload.get("sections", [])
        for question in section.get("questions", [])
    ]


def _build_question_index(payloads: dict[str, dict[str, Any]]) -> dict[str, tuple[str, str]]:
    index: dict[str, tuple[str, str]] = {}
    for form_kind, payload in payloads.items():
        for section in payload.get("sections", []):
            section_id = section["id"]
            for question in section.get("questions", []):
                index[question["id"]] = (form_kind, section_id)
    return index


def _build_label_index(payloads: dict[str, dict[str, Any]]) -> dict[str, str]:
    labels: dict[str, str] = {}
    for payload in payloads.values():
        for question in _iter_questions(payload):
            labels[_normalize_label(question["label"])] = question["id"]
    return labels


def _referenced_question_ids(payloads: dict[str, dict[str, Any]]) -> set[str]:
    referenced: set[str] = set()
    for payload in payloads.values():
        for question in _iter_questions(payload):
            conditional = question.get("conditional")
            if isinstance(conditional, dict):
                depends_on = conditional.get("depends_on")
                if isinstance(depends_on, str) and depends_on:
                    referenced.add(depends_on)

            calculated = question.get("calculated")
            if isinstance(calculated, dict):
                for depends_on in calculated.get("depends_on", []):
                    if isinstance(depends_on, str) and depends_on:
                        referenced.add(depends_on)
    return referenced


def _bump_version(version: Any) -> str:
    if isinstance(version, str):
        parts = version.split(".")
        if len(parts) == 3 and all(part.isdigit() for part in parts):
            major, minor, patch = (int(part) for part in parts)
            return f"{major}.{minor}.{patch + 1}"
    return "1.0.0"


def _write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_file = None
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            delete=False,
            dir=path.parent,
            encoding="utf-8",
            newline="\n",
            suffix=".tmp",
        ) as temp_file:
            json.dump(payload, temp_file, ensure_ascii=False, indent=2)
            temp_file.write("\n")
            temp_file.flush()
            os.fsync(temp_file.fileno())
        os.replace(temp_file.name, path)
    finally:
        if temp_file is not None and os.path.exists(temp_file.name):
            os.unlink(temp_file.name)


def _validate_question_structure(
    *,
    question: dict[str, Any],
    existing_question_ids: set[str],
    existing_normalized_labels: set[str],
    current_question_id: str | None = None,
) -> None:
    question_id = question["id"]
    label = question["label"]
    question_type = question["type"]

    if not QUESTION_ID_PATTERN.fullmatch(question_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ID da pergunta deve usar apenas letras minúsculas, números e underscore",
        )

    if question_id in existing_question_ids and question_id != current_question_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma pergunta com esse ID",
        )

    normalized_label = _normalize_label(label)
    if normalized_label in existing_normalized_labels:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma pergunta com esse rótulo",
        )

    if question_type not in ALLOWED_QUESTION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tipo de pergunta inválido",
        )

    options = question.get("options")
    if question_type in OPTION_BASED_TYPES:
        if not isinstance(options, list) or len(options) == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Perguntas desse tipo exigem ao menos uma opção",
            )
        cleaned_options = []
        seen_options: set[str] = set()
        for option in options:
            if not isinstance(option, str) or not option.strip():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Todas as opções devem ser textos não vazios",
                )
            normalized_option = " ".join(option.split())
            if normalized_option.lower() in seen_options:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Não é permitido repetir opções na mesma pergunta",
                )
            seen_options.add(normalized_option.lower())
            cleaned_options.append(normalized_option)
        question["options"] = cleaned_options
    elif options:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Esse tipo de pergunta não aceita opções",
        )

    if question.get("allow_other") and question_type not in OPTION_BASED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="allow_other só pode ser usado em perguntas com opções",
        )

    if question_type != "number":
        if question.get("min") is not None or question.get("max") is not None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Apenas perguntas numéricas aceitam min e max",
            )

    min_value = question.get("min")
    max_value = question.get("max")
    if min_value is not None and max_value is not None and min_value > max_value:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="min não pode ser maior que max",
        )

    conditional = question.get("conditional")
    if conditional:
        depends_on = conditional["depends_on"]
        if depends_on == question_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A pergunta não pode depender dela mesma",
            )
        if depends_on not in existing_question_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A pergunta condicional depende de um ID inexistente",
            )

    calculated = question.get("calculated")
    if calculated:
        if question_id != "bmi":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No momento apenas a pergunta 'bmi' pode ser calculada automaticamente",
            )
        depends_on = calculated["depends_on"]
        if not all(dep in existing_question_ids for dep in depends_on):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A pergunta calculada depende de IDs inexistentes",
            )


def add_question(
    *,
    form_kind: str,
    section_id: str,
    question: dict[str, Any],
    insert_after_question_id: str | None,
) -> dict[str, Any]:
    payloads = load_all_form_definitions()
    target_payload = deepcopy(payloads[form_kind])
    question_index = _build_question_index(payloads)
    label_index = _build_label_index(payloads)

    cleaned_question = deepcopy(question)
    cleaned_question["label"] = " ".join(cleaned_question["label"].split())
    if cleaned_question.get("placeholder"):
        cleaned_question["placeholder"] = " ".join(str(cleaned_question["placeholder"]).split())

    existing_ids = set(question_index.keys())
    _validate_question_structure(
        question=cleaned_question,
        existing_question_ids=existing_ids,
        existing_normalized_labels=set(label_index.keys()),
    )

    target_section = next(
        (section for section in target_payload.get("sections", []) if section.get("id") == section_id),
        None,
    )
    if target_section is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seção não encontrada",
        )

    questions = target_section.setdefault("questions", [])
    if insert_after_question_id:
        insert_index = next(
            (index for index, item in enumerate(questions) if item.get("id") == insert_after_question_id),
            None,
        )
        if insert_index is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pergunta de referência não encontrada na seção escolhida",
            )
        questions.insert(insert_index + 1, cleaned_question)
    else:
        questions.append(cleaned_question)

    target_payload["version"] = _bump_version(target_payload.get("version"))
    target_payload["last_updated"] = datetime.now(timezone.utc).date().isoformat()
    _write_json_atomic(_get_form_path(form_kind), target_payload)
    return target_payload


def update_question(
    *,
    form_kind: str,
    question_id: str,
    section_id: str,
    question: dict[str, Any],
    insert_after_question_id: str | None,
) -> dict[str, Any]:
    payloads = load_all_form_definitions()
    question_index = _build_question_index(payloads)
    if question_id not in question_index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pergunta não encontrada",
        )

    question_form_kind, current_section_id = question_index[question_id]
    if question_form_kind != form_kind:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pergunta não encontrada no formulário informado",
        )

    target_payload = deepcopy(payloads[form_kind])
    current_question: dict[str, Any] | None = None

    for section in target_payload.get("sections", []):
        remaining_questions = []
        for item in section.get("questions", []):
            if item.get("id") == question_id:
                current_question = deepcopy(item)
                continue
            remaining_questions.append(item)
        section["questions"] = remaining_questions

    if current_question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pergunta não encontrada",
        )

    cleaned_question = deepcopy(question)
    cleaned_question["label"] = " ".join(cleaned_question["label"].split())
    if cleaned_question.get("placeholder"):
        cleaned_question["placeholder"] = " ".join(str(cleaned_question["placeholder"]).split())

    if cleaned_question["id"] != question_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O ID técnico não pode ser alterado após a criação",
        )

    referenced_ids = _referenced_question_ids(payloads)
    if question_id in PROTECTED_QUESTION_IDS and cleaned_question.get("type") != current_question.get("type"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O tipo de uma pergunta protegida não pode ser alterado",
        )

    if question_id in referenced_ids and cleaned_question.get("type") != current_question.get("type"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O tipo dessa pergunta não pode ser alterado porque outras regras dependem dela",
        )

    existing_ids = set(_build_question_index(payloads).keys())
    existing_labels = set(_build_label_index(payloads).keys())
    current_label_normalized = _normalize_label(current_question["label"])
    if current_label_normalized in existing_labels:
        existing_labels.remove(current_label_normalized)

    _validate_question_structure(
        question=cleaned_question,
        existing_question_ids=existing_ids,
        existing_normalized_labels=existing_labels,
        current_question_id=question_id,
    )

    target_section = next(
        (section for section in target_payload.get("sections", []) if section.get("id") == section_id),
        None,
    )
    if target_section is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seção não encontrada",
        )

    questions = target_section.setdefault("questions", [])
    if insert_after_question_id:
        if insert_after_question_id == question_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A pergunta não pode ser posicionada após ela mesma",
            )
        insert_index = next(
            (index for index, item in enumerate(questions) if item.get("id") == insert_after_question_id),
            None,
        )
        if insert_index is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pergunta de referência não encontrada na seção escolhida",
            )
        questions.insert(insert_index + 1, cleaned_question)
    else:
        questions.append(cleaned_question)

    target_payload["version"] = _bump_version(target_payload.get("version"))
    target_payload["last_updated"] = datetime.now(timezone.utc).date().isoformat()
    _write_json_atomic(_get_form_path(form_kind), target_payload)
    return target_payload


def remove_question(*, form_kind: str, question_id: str) -> dict[str, Any]:
    payloads = load_all_form_definitions()
    question_index = _build_question_index(payloads)
    if question_id not in question_index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pergunta não encontrada",
        )

    question_form_kind, _ = question_index[question_id]
    if question_form_kind != form_kind:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pergunta não encontrada no formulário informado",
        )

    if question_id in PROTECTED_QUESTION_IDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Essa pergunta é protegida e não pode ser removida",
        )

    referenced_ids = _referenced_question_ids(payloads)
    if question_id in referenced_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Essa pergunta é usada por regras condicionais ou cálculos e não pode ser removida",
        )

    target_payload = deepcopy(payloads[form_kind])
    removed = False
    for section in target_payload.get("sections", []):
        section_questions = section.get("questions", [])
        remaining_questions = [item for item in section_questions if item.get("id") != question_id]
        if len(remaining_questions) != len(section_questions):
            section["questions"] = remaining_questions
            removed = True
            break

    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pergunta não encontrada",
        )

    target_payload["version"] = _bump_version(target_payload.get("version"))
    target_payload["last_updated"] = datetime.now(timezone.utc).date().isoformat()
    _write_json_atomic(_get_form_path(form_kind), target_payload)
    return target_payload
