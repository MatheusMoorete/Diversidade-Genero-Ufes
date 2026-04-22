"""
Preview de migração das planilhas históricas do Google Forms.

Converte planilhas em um formato intermediário compatível com o backend atual:
- pacientes deduplicados
- respostas históricas normalizadas
- campos não mapeados preservados em legacy_fields

O objetivo é validar a migração antes de gravar qualquer dado no banco.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import text

from app import models
from app.database import SessionLocal
from app.return_schedule import calculate_next_return_date


BASE_DIR = Path(__file__).resolve().parent
APP_DIR = BASE_DIR / "app"
DEFAULT_OUTPUT_BASE = BASE_DIR / "exports" / "google_forms_preview"
RULES_FILE = BASE_DIR / "google_forms_migration_rules.json"


def normalize_spaces(value: str) -> str:
    return " ".join(str(value).replace("\n", " ").split()).strip()


def normalize_key(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and pd.isna(value):
        return ""
    return normalize_spaces(str(value)).lower()


def normalize_phone(value: Any) -> str:
    digits = re.sub(r"\D+", "", normalize_spaces(value))
    return digits


def clean_scalar(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime()
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or None
    if isinstance(value, (int, bool)):
        return value
    if isinstance(value, float):
        if value.is_integer():
            return int(value)
        return round(value, 4)
    return value


def clean_name_value(value: Any) -> str | None:
    cleaned = clean_scalar(value)
    if cleaned is None:
        return None
    text = normalize_spaces(str(cleaned))
    if not text:
        return None
    if not re.search(r"[A-Za-zÀ-ÿ]", text):
        return None
    return text


def to_iso_date(value: Any) -> str | None:
    value = clean_scalar(value)
    if value is None:
        return None
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.strftime("%Y-%m-%d")


def to_iso_datetime(value: Any) -> str | None:
    value = clean_scalar(value)
    if value is None:
        return None
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.to_pydatetime().isoformat()


def to_number(value: Any) -> int | float | None:
    value = clean_scalar(value)
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return value
    parsed = pd.to_numeric(value, errors="coerce")
    if pd.isna(parsed):
        return None
    if float(parsed).is_integer():
        return int(parsed)
    return round(float(parsed), 4)


def split_checkbox_values(value: Any) -> list[str] | None:
    value = clean_scalar(value)
    if value is None:
        return None
    if isinstance(value, list):
        return [normalize_spaces(item) for item in value if normalize_spaces(item)]
    text = str(value)
    parts = [normalize_spaces(part) for part in re.split(r"\s*,\s*", text) if normalize_spaces(part)]
    return parts or None


def clean_height_cm(value: Any) -> int | float | None:
    number = to_number(value)
    if number is None:
        return None
    if 0.5 <= float(number) <= 3:
        converted = float(number) * 100
        return int(converted) if converted.is_integer() else round(converted, 2)
    return number


def duration_to_over_one_year(value: Any) -> str | None:
    text = normalize_key(value)
    if not text:
        return None
    if "mais de 1 ano" in text or "mais de um ano" in text:
        return "Sim"
    if "menos de 1 ano" in text or "menos de um ano" in text:
        return "Não"
    if "ano" in text:
        numbers = [int(match) for match in re.findall(r"\d+", text)]
        if numbers:
            return "Sim" if numbers[0] >= 1 else "Não"
        return "Sim"
    if "mes" in text:
        numbers = [int(match) for match in re.findall(r"\d+", text)]
        if numbers:
            return "Sim" if numbers[0] >= 12 else "Não"
        return "Não"
    return None


def choose_first_non_empty(row: dict[str, Any], columns: tuple[str, ...]) -> Any:
    for column in columns:
        value = clean_scalar(row.get(column))
        if value is not None:
            return value
    return None


def json_default(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


@dataclass(frozen=True)
class SourceConfig:
    source_name: str
    file_match: str
    timestamp_column: str
    preferred_name_columns: tuple[str, ...]
    patient_name_columns: tuple[str, ...]
    social_name_columns: tuple[str, ...]
    phone_columns: tuple[str, ...]
    medical_record_columns: tuple[str, ...]


SOURCE_CONFIGS = (
    SourceConfig(
        source_name="legacy_forms",
        file_match="planilha completa",
        timestamp_column="r",
        preferred_name_columns=("Nome social:", "Nome do paciente:"),
        patient_name_columns=("Nome do paciente:",),
        social_name_columns=("Nome social:",),
        phone_columns=("Telefone:",),
        medical_record_columns=("Prontuário:",),
    ),
    SourceConfig(
        source_name="current_forms",
        file_match="questionário - hormonioterapia",
        timestamp_column="Carimbo de data/hora",
        preferred_name_columns=("Nome do paciente:", "Nome social:"),
        patient_name_columns=("Nome do paciente:",),
        social_name_columns=("Nome social:",),
        phone_columns=("Telefone:",),
        medical_record_columns=("Prontuário:",),
    ),
)


EXPLICIT_FIELD_ALIASES = {
    "nome do paciente:": "patient_name",
    "nome social:": "social_name",
    "prontuário:": "medical_record",
    "telefone:": "phone",
    "raça:": "race",
    "data de nascimento:": "birth_date",
    "tcle assinado?": "tcle_signed",
    "grau de escolaridade:": "education_level",
    "estado civil:": "marital_status",
    "ocupação principal:": "occupation",
    "renda familiar (considerar as pessoas com quem você mora):": "family_income",
    "número de pessoas que vivem na casa (contando com você):": "household_size",
    "pratica atividade física?": "physical_activity",
    "se sim, em qual local?": "physical_activity_location",
    "quantas vezes por semana?": "physical_activity_frequency",
    "qual a duração média aproximada de cada sessão?": "physical_activity_duration",
    "tipo de atividade física principal?": "physical_activity_type",
    "você consome bebidas alcoólicas?": "alcohol_consumption",
    "se sim, qual a frequência do consumo de bebida alcoólica?": "alcohol_frequency",
    "qual o tipo de bebida que consome com mais frequência?": "alcohol_type",
    "você fuma?": "smoking",
    "qual tipo de cigarro você usa com mais frequência?": "cigarette_type",
    "se fuma cigarro de maço, qual quantidade de cigarros fuma aproximadamente por dia?": "cigarettes_per_day",
    "você faz uso de drogas ilícitas?": "illicit_drugs",
    "se sim, qual/quais:": "illicit_drugs_type",
    "qual a frequência do uso de drogas ilícitas?": "illicit_drugs_frequency",
    "você sabe se já teve/tem alguma dessas doenças:": "previous_diseases",
    "história familiar de doenças (cardiovasculares e outras)?": "family_history",
    "história familiar de doenças (cardiovasculares, trombóticas, oncológicas, ou outros)?": "family_history",
    "medicamentos em uso atual (escrever medicamento, dose e frequência):": "current_medications",
    "pa": "blood_pressure",
    "altura (cm):": "height",
    "peso (kg):": "weight",
    "imc:": "bmi",
    "está em uso de terapia hormonizadora?": "using_hormone_therapy",
    "qual? (para homens trans)": "hormone_type_men",
    "qual? (para mulheres)": "hormone_type_women",
    "se já fez uso e não faz mais, qual o motivo da suspensão?": "suspension_reason",
    "se sim, há quanto tempo?": "__therapy_duration",
    "você faz ou já fez algum acompanhamento de saúde mental?": "mental_health_follow_up",
    "você tem ou já teve algum diagnóstico relacionado a saúde mental?": "mental_health_diagnosis",
    "caso a resposta para a pergunta anterior seja positiva, o quadro apresentou correlação com uso da hormonioterapia?": "hormone_mental_health_correlation",
    "quais os seus objetivos quando começou/ para começar a hormonioterapia (homens trans)?": "hormone_objectives_men",
    "quais os seus objetivos quando começou/ para começar a hormonioterapia (mulheres trans)?": "hormone_objectives_women",
    "já teve alguma reação alérgica grave desde o início da hormonioterapia (anafilaxia)?": "allergic_reaction",
    "teve acne desde o início da hormonioterapia?": "acne_occurrence",
    "qual a região de acometimento da acne?": "acne_location",
    "notou as áreas do pescoço, axilas ou outras áreas de dobra mais enegrecidas (acantose nigricans)?": "acanthosis_nigricans",
    "notou o aparecimento de nódulos ou tumores palpáveis nas mamas?": "breast_nodules",
    "com o uso da hormonioterapia, notou aumento de irritabilidade e/ou agressividade?": "irritability_aggressiveness",
    "com o uso da hormonioterapia, notou aumento de estresse?": "stress_increase",
    "notou alguma outra mudança no humor?": "mood_changes",
    "como você avalia a sua autoestima durante o uso da hormonioterapia?": "self_esteem",
    "qual seu grau de satisfação com os resultados físicos/estéticos da hormonioterapia?": "satisfaction_results",
    "qual seu grau de satisfação com os resultados físicos/estéticos da hormonioterapia?.1": "satisfaction_results",
    "notou o aparecimento de outras condições de saúde (ex. nódulos hepáticos, outros nódulos, condições dermatológicas etc)": "other_health_conditions",
    "glicose (data):": "glucose",
    "outros exames (data):": "other_exams",
    "tgo (data)": "tgo",
    "tgp (data)": "tgp",
    "triglicerídeos (data)": "triglycerides",
    "colesterol total (data)": "total_cholesterol",
    "hdl (data)": "hdl",
    "ldl (data)": "ldl",
    "testesterona (data)": "testosterone",
    "testosterona (data)": "testosterone",
    "hemoglobina (data)": "hemoglobin",
    "hematócrito (data)": "hematocrit",
    "leucócitos (data)": "leukocytes",
    "plaquetas (data)": "platelets",
    "bioimpedância - peso (kg)": "bioimpedance_weight",
    "bioimpedância - músculo (kg)": "bioimpedance_muscle",
    "bioimpedância - gordura (%)": "bioimpedance_fat",
    "% gordura corporal": "bioimpedance_fat",
    "você faz terapia hormonal masculinizadora? (para homens trans)": "__legacy_hormone_type_men",
    "você faz terapia hormonal feminilizante? (para mulheres trans)": "__legacy_hormone_type_women",
}


IGNORE_COLUMNS = {
    "carimbo de data/hora",
    "r",
}


def load_question_metadata() -> tuple[dict[str, str], set[str]]:
    label_to_id: dict[str, str] = {}
    checkbox_fields: set[str] = set()

    for filename in ("form_questions.json", "form_questions_additional.json"):
        payload = json.loads((APP_DIR / filename).read_text(encoding="utf-8"))
        for section in payload["sections"]:
            for question in section["questions"]:
                label_to_id[normalize_key(question["label"])] = question["id"]
                if question["type"] == "checkbox":
                    checkbox_fields.add(question["id"])

    return label_to_id, checkbox_fields


def load_migration_rules() -> dict[str, Any]:
    if not RULES_FILE.exists():
        return {"exclude_rows": [], "merge_patient_keys": {}}
    data = json.loads(RULES_FILE.read_text(encoding="utf-8"))
    data.setdefault("exclude_rows", [])
    data.setdefault("merge_patient_keys", {})
    return data


def should_exclude_row(rules: dict[str, Any], source_name: str, source_row: int) -> bool:
    for rule in rules.get("exclude_rows", []):
        if rule.get("source_name") == source_name and int(rule.get("source_row")) == int(source_row):
            return True
    return False


def detect_source_config(path: Path) -> SourceConfig:
    name = normalize_key(path.name)
    for config in SOURCE_CONFIGS:
        if config.file_match in name:
            return config
    raise ValueError(f"Não foi possível identificar o tipo da planilha: {path.name}")


def normalize_dataframe_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    normalized_columns: list[str] = []
    for column in df.columns:
        text = normalize_spaces(str(column))
        normalized_columns.append(text)
    df.columns = normalized_columns
    return df


def choose_patient_key(
    display_name: str | None,
    birth_date: str | None,
    phone: str | None,
    medical_record: str | None,
) -> tuple[str | None, str]:
    normalized_name = normalize_key(display_name)
    if not normalized_name:
        return None, "missing_name"
    if birth_date:
        return f"{normalized_name}|dob:{birth_date}", "high"
    if phone:
        return f"{normalized_name}|phone:{phone}", "medium"
    if medical_record:
        return f"{normalized_name}|mr:{normalize_key(medical_record)}", "medium"
    return f"{normalized_name}|name_only", "low"


def coerce_field_value(field_id: str, value: Any, checkbox_fields: set[str]) -> Any:
    if field_id == "birth_date":
        return to_iso_date(value)
    if field_id in {
        "height",
        "weight",
        "bmi",
        "bioimpedance_weight",
        "bioimpedance_muscle",
        "bioimpedance_fat",
    }:
        if field_id == "height":
            return clean_height_cm(value)
        return to_number(value)
    if field_id in checkbox_fields:
        return split_checkbox_values(value)
    if field_id in {"phone", "medical_record"}:
        cleaned = clean_scalar(value)
        return str(cleaned) if cleaned is not None else None
    if field_id in {
        "glucose",
        "tgo",
        "tgp",
        "triglycerides",
        "total_cholesterol",
        "hdl",
        "ldl",
        "testosterone",
        "hemoglobin",
        "hematocrit",
        "leukocytes",
        "platelets",
        "other_exams",
        "family_history",
        "current_medications",
        "blood_pressure",
    }:
        cleaned = clean_scalar(value)
        return str(cleaned) if cleaned is not None else None
    return clean_scalar(value)


def apply_legacy_hormone_mapping(form_data: dict[str, Any], raw_value: Any, target_field: str) -> None:
    cleaned = clean_scalar(raw_value)
    if cleaned is None:
        return
    text = str(cleaned)
    form_data[target_field] = text
    if "using_hormone_therapy" not in form_data:
        lowered = normalize_key(text)
        if lowered.startswith("sim"):
            form_data["using_hormone_therapy"] = "Sim"
        elif "não" in lowered or "nao" in lowered or "nunca" in lowered:
            form_data["using_hormone_therapy"] = "Não"


def build_row_payload(
    row: dict[str, Any],
    source_path: Path,
    source_config: SourceConfig,
    question_label_map: dict[str, str],
    checkbox_fields: set[str],
    row_number: int,
) -> dict[str, Any] | None:
    response_date = to_iso_datetime(row.get(source_config.timestamp_column))

    patient_name = None
    for column in source_config.patient_name_columns:
        patient_name = clean_name_value(row.get(column))
        if patient_name:
            break

    social_name = None
    for column in source_config.social_name_columns:
        social_name = clean_name_value(row.get(column))
        if social_name:
            break

    preferred_name = None
    for column in source_config.preferred_name_columns:
        preferred_name = clean_name_value(row.get(column))
        if preferred_name:
            break
    birth_date = to_iso_date(row.get("Data de nascimento:"))
    phone = normalize_phone(choose_first_non_empty(row, source_config.phone_columns))
    medical_record = clean_scalar(choose_first_non_empty(row, source_config.medical_record_columns))

    patient_key, confidence = choose_patient_key(
        display_name=str(preferred_name) if preferred_name else None,
        birth_date=birth_date,
        phone=phone or None,
        medical_record=str(medical_record) if medical_record else None,
    )
    if patient_key is None:
        return None

    form_data: dict[str, Any] = {}
    legacy_fields: dict[str, Any] = {}
    notes: list[str] = []

    for header, raw_value in row.items():
        cleaned_header = normalize_spaces(str(header))
        normalized_header = normalize_key(cleaned_header)
        if not normalized_header or normalized_header.startswith("unnamed:"):
            continue
        if normalized_header in IGNORE_COLUMNS:
            continue

        field_id = EXPLICIT_FIELD_ALIASES.get(normalized_header)
        if field_id is None:
            field_id = question_label_map.get(normalized_header)

        if field_id == "__therapy_duration":
            derived = duration_to_over_one_year(raw_value)
            cleaned = clean_scalar(raw_value)
            if cleaned is not None:
                legacy_fields["therapy_duration_text"] = str(cleaned)
            if derived:
                form_data["hormone_therapy_over_one_year"] = derived
            elif cleaned is not None:
                notes.append("duration_without_derivation")
            continue

        if field_id == "__legacy_hormone_type_men":
            apply_legacy_hormone_mapping(form_data, raw_value, "hormone_type_men")
            continue

        if field_id == "__legacy_hormone_type_women":
            apply_legacy_hormone_mapping(form_data, raw_value, "hormone_type_women")
            continue

        if field_id is None:
            cleaned = clean_scalar(raw_value)
            if cleaned is not None:
                legacy_fields[cleaned_header] = cleaned
            continue

        coerced = coerce_field_value(field_id, raw_value, checkbox_fields)
        if coerced is None or coerced == []:
            continue
        form_data[field_id] = coerced

    if patient_name and "patient_name" not in form_data:
        form_data["patient_name"] = str(patient_name)
    if social_name and "social_name" not in form_data:
        form_data["social_name"] = str(social_name)
    if birth_date and "birth_date" not in form_data:
        form_data["birth_date"] = birth_date
    if phone and "phone" not in form_data:
        form_data["phone"] = phone
    if medical_record and "medical_record" not in form_data:
        form_data["medical_record"] = str(medical_record)

    uses_hormone_over_1year = form_data.get("hormone_therapy_over_one_year")
    if isinstance(uses_hormone_over_1year, str):
        uses_hormone_flag = uses_hormone_over_1year == "Sim"
    else:
        uses_hormone_flag = False
        if "using_hormone_therapy" in form_data and form_data["using_hormone_therapy"] == "Sim":
            notes.append("missing_over_one_year_answer")

    migration_meta = {
        "source_file": source_path.name,
        "source_name": source_config.source_name,
        "source_row": row_number,
        "patient_key": patient_key,
        "match_confidence": confidence,
    }
    form_data["_migration"] = migration_meta
    if legacy_fields:
        form_data["_legacy_fields"] = legacy_fields

    return {
        "patient_key": patient_key,
        "match_confidence": confidence,
        "preferred_name": str(preferred_name) if preferred_name else "",
        "patient_name": str(patient_name) if patient_name else "",
        "social_name": str(social_name) if social_name else "",
        "birth_date": birth_date or "",
        "phone": phone or "",
        "medical_record": str(medical_record) if medical_record else "",
        "response_date": response_date,
        "uses_hormone_over_1year": uses_hormone_flag,
        "form_data": form_data,
        "legacy_field_count": len(legacy_fields),
        "mapped_field_count": len([key for key in form_data.keys() if not key.startswith("_")]),
        "notes": notes,
        "source_file": source_path.name,
        "source_name": source_config.source_name,
        "source_row": row_number,
    }


def read_source_rows(
    source_path: Path,
    question_label_map: dict[str, str],
    checkbox_fields: set[str],
    rules: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    source_config = detect_source_config(source_path)
    df = normalize_dataframe_columns(pd.read_excel(source_path))
    rows: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []

    for row_index, (_, row) in enumerate(df.iterrows(), start=2):
        if should_exclude_row(rules, source_config.source_name, row_index):
            skipped.append(
                {
                    "source_file": source_path.name,
                    "source_name": source_config.source_name,
                    "source_row": row_index,
                    "reason": "excluded_by_rule",
                }
            )
            continue
        row_payload = build_row_payload(
            row=row.to_dict(),
            source_path=source_path,
            source_config=source_config,
            question_label_map=question_label_map,
            checkbox_fields=checkbox_fields,
            row_number=row_index,
        )
        if row_payload is None:
            skipped.append(
                {
                    "source_file": source_path.name,
                    "source_name": source_config.source_name,
                    "source_row": row_index,
                    "reason": "missing_patient_identifier",
                }
            )
            continue
        rows.append(row_payload)

    return rows, skipped


def choose_group_display_name(group_rows: list[dict[str, Any]]) -> str:
    social_names = [row["social_name"] for row in group_rows if row["social_name"]]
    patient_names = [row["patient_name"] for row in group_rows if row["patient_name"]]
    preferred_names = [row["preferred_name"] for row in group_rows if row["preferred_name"]]

    for candidates in (social_names, patient_names, preferred_names):
        if candidates:
            counts = Counter(candidates)
            return counts.most_common(1)[0][0]
    return "Paciente sem nome"


def build_preview(rows: list[dict[str, Any]], skipped_rows: list[dict[str, Any]]) -> dict[str, Any]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[row["patient_key"]].append(row)

    patients_preview: list[dict[str, Any]] = []
    responses_preview: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = list(skipped_rows)

    for patient_key, group_rows in sorted(grouped.items(), key=lambda item: item[0]):
        group_rows.sort(key=lambda item: item["response_date"] or "")
        display_name = choose_group_display_name(group_rows)
        birth_dates = [row["birth_date"] for row in group_rows if row["birth_date"]]
        phones = [row["phone"] for row in group_rows if row["phone"]]
        medical_records = [row["medical_record"] for row in group_rows if row["medical_record"]]

        patient_record = {
            "patient_key": patient_key,
            "display_name": display_name,
            "birth_date": Counter(birth_dates).most_common(1)[0][0] if birth_dates else "",
            "phone": Counter(phones).most_common(1)[0][0] if phones else "",
            "medical_record": Counter(medical_records).most_common(1)[0][0] if medical_records else "",
            "response_count": len(group_rows),
            "source_names": ",".join(sorted({row["source_name"] for row in group_rows})),
            "match_confidence": Counter(row["match_confidence"] for row in group_rows).most_common(1)[0][0],
            "first_response_date": group_rows[0]["response_date"] or "",
            "last_response_date": group_rows[-1]["response_date"] or "",
        }
        patients_preview.append(patient_record)

        if patient_record["match_confidence"] == "low":
            warnings.append(
                {
                    "source_file": "",
                    "source_name": patient_record["source_names"],
                    "source_row": "",
                    "reason": "patient_match_low_confidence",
                    "patient_key": patient_key,
                    "display_name": display_name,
                }
            )

        seen_dates = Counter(row["response_date"] for row in group_rows if row["response_date"])
        if any(count > 1 for count in seen_dates.values()):
            warnings.append(
                {
                    "source_file": "",
                    "source_name": patient_record["source_names"],
                    "source_row": "",
                    "reason": "multiple_responses_same_datetime",
                    "patient_key": patient_key,
                    "display_name": display_name,
                }
            )

        for row in group_rows:
            responses_preview.append(
                {
                    "patient_key": patient_key,
                    "display_name": display_name,
                    "response_date": row["response_date"] or "",
                    "source_name": row["source_name"],
                    "source_file": row["source_file"],
                    "source_row": row["source_row"],
                    "uses_hormone_over_1year": row["uses_hormone_over_1year"],
                    "mapped_field_count": row["mapped_field_count"],
                    "legacy_field_count": row["legacy_field_count"],
                    "notes": ",".join(row["notes"]),
                    "form_data_json": json.dumps(row["form_data"], ensure_ascii=False, default=json_default),
                }
            )

    patients_by_birth_date: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for patient in patients_preview:
        if patient["birth_date"]:
            patients_by_birth_date[patient["birth_date"]].append(patient)

    possible_duplicate_count = 0
    for birth_date, patients_with_same_dob in patients_by_birth_date.items():
        if len(patients_with_same_dob) < 2:
            continue
        for index, left in enumerate(patients_with_same_dob):
            left_name = normalize_key(left["display_name"])
            for right in patients_with_same_dob[index + 1:]:
                right_name = normalize_key(right["display_name"])
                similarity = SequenceMatcher(a=left_name, b=right_name).ratio()
                contains_other = left_name in right_name or right_name in left_name
                if similarity >= 0.82 or contains_other:
                    warnings.append(
                        {
                            "source_file": "",
                            "source_name": ",".join(sorted({left["source_names"], right["source_names"]})),
                            "source_row": "",
                            "reason": "possible_duplicate_patient_same_birth_date",
                            "patient_key": left["patient_key"],
                            "display_name": left["display_name"],
                            "other_patient_key": right["patient_key"],
                            "other_display_name": right["display_name"],
                            "birth_date": birth_date,
                            "similarity": round(similarity, 3),
                        }
                    )
                    possible_duplicate_count += 1

    source_summary: dict[str, int] = Counter(row["source_name"] for row in rows)

    return {
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "source_response_counts": dict(source_summary),
            "total_rows_processed": len(rows) + len(skipped_rows),
            "total_rows_mapped": len(rows),
            "total_rows_skipped": len(skipped_rows),
            "unique_patients": len(patients_preview),
            "total_responses": len(responses_preview),
            "low_confidence_patients": sum(1 for patient in patients_preview if patient["match_confidence"] == "low"),
            "possible_duplicate_patients": possible_duplicate_count,
        },
        "patients": patients_preview,
        "responses": responses_preview,
        "warnings": warnings,
    }


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value)


def group_rows_by_patient(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[row["patient_key"]].append(row)
    for patient_rows in grouped.values():
        patient_rows.sort(key=lambda item: item["response_date"] or "")
    return grouped


def apply_import(rows: list[dict[str, Any]], username: str) -> dict[str, int | str]:
    grouped = group_rows_by_patient(rows)
    session = SessionLocal()
    try:
        user = session.execute(
            text("SELECT id, username FROM users WHERE username = :username"),
            {"username": username},
        ).fetchone()
        if not user:
            raise ValueError(f"Usuário não encontrado: {username}")

        existing_patients = session.execute(
            text("SELECT COUNT(*) FROM patients WHERE created_by_user_id = :user_id"),
            {"user_id": user.id},
        ).scalar_one()
        existing_responses = session.execute(
            text("SELECT COUNT(*) FROM form_responses WHERE created_by_user_id = :user_id"),
            {"user_id": user.id},
        ).scalar_one()
        if existing_patients or existing_responses:
            raise ValueError(
                f"O usuário {username} já possui dados: "
                f"patients={existing_patients}, responses={existing_responses}"
            )

        imported_patients = 0
        imported_responses = 0

        for patient_key in sorted(grouped.keys()):
            patient_rows = grouped[patient_key]
            display_name = choose_group_display_name(patient_rows)

            patient = models.Patient(
                full_name=display_name,
                created_by_user_id=user.id,
            )
            session.add(patient)
            session.flush()
            imported_patients += 1

            for row in patient_rows:
                response_date = parse_iso_datetime(row["response_date"]) or datetime.utcnow()
                next_return_date = None
                hormone_over_one_year_answer = row["form_data"].get("hormone_therapy_over_one_year")
                if hormone_over_one_year_answer in {"Sim", "Não"}:
                    next_return_date = calculate_next_return_date(
                        response_date=response_date,
                        uses_hormone_over_1year=bool(row["uses_hormone_over_1year"]),
                    )

                response = models.FormResponse(
                    patient_id=patient.id,
                    response_date=response_date,
                    uses_hormone_over_1year=bool(row["uses_hormone_over_1year"]),
                    form_data=row["form_data"],
                    next_return_date=next_return_date,
                    created_by_user_id=user.id,
                )
                session.add(response)
                imported_responses += 1

        session.commit()
        return {
            "username": user.username,
            "user_id": user.id,
            "patients_imported": imported_patients,
            "responses_imported": imported_responses,
        }
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def write_preview_files(preview: dict[str, Any], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    summary_path = output_dir / "summary.json"
    patients_path = output_dir / "patients_preview.csv"
    responses_path = output_dir / "responses_preview.csv"
    warnings_path = output_dir / "warnings.csv"

    summary_path.write_text(json.dumps(preview["summary"], ensure_ascii=False, indent=2), encoding="utf-8")
    pd.DataFrame(preview["patients"]).to_csv(patients_path, index=False, encoding="utf-8-sig")
    pd.DataFrame(preview["responses"]).to_csv(responses_path, index=False, encoding="utf-8-sig")
    pd.DataFrame(preview["warnings"]).to_csv(warnings_path, index=False, encoding="utf-8-sig")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Gera um preview da migração das planilhas históricas do Google Forms."
    )
    parser.add_argument(
        "files",
        nargs="+",
        type=Path,
        help="Caminhos das planilhas .xlsx exportadas do Google Forms.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Diretório para salvar o preview. Padrão: backend/exports/google_forms_preview/<timestamp>",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Importa os dados no banco após montar as regras e o preview.",
    )
    parser.add_argument(
        "--username",
        type=str,
        default=None,
        help="Usuário dono dos dados importados quando --apply for usado.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    question_label_map, checkbox_fields = load_question_metadata()
    rules = load_migration_rules()

    all_rows: list[dict[str, Any]] = []
    skipped_rows: list[dict[str, Any]] = []

    for file_path in args.files:
        if not file_path.exists():
            raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")
        rows, skipped = read_source_rows(file_path, question_label_map, checkbox_fields, rules)
        all_rows.extend(rows)
        skipped_rows.extend(skipped)

    merge_patient_keys: dict[str, str] = rules.get("merge_patient_keys", {})
    for row in all_rows:
        row["patient_key"] = merge_patient_keys.get(row["patient_key"], row["patient_key"])
        migration_meta = row["form_data"].get("_migration")
        if isinstance(migration_meta, dict):
            migration_meta["patient_key"] = row["patient_key"]

    preview = build_preview(all_rows, skipped_rows)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = args.output_dir or (DEFAULT_OUTPUT_BASE / timestamp)
    write_preview_files(preview, output_dir)

    print(f"Preview gerado em: {output_dir}")
    print(json.dumps(preview["summary"], ensure_ascii=False, indent=2))

    if args.apply:
        if preview["summary"]["low_confidence_patients"] or preview["summary"]["possible_duplicate_patients"]:
            raise ValueError("Ainda existem pendências no preview. Resolva antes de usar --apply.")
        if not args.username:
            raise ValueError("Informe --username ao usar --apply.")
        result = apply_import(all_rows, args.username)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
