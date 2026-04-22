"""
Sincroniza next_return_date a partir do formulário mais recente
de cada paciente.
"""

from __future__ import annotations

import argparse

from app import models
from app.database import SessionLocal
from app.return_schedule import calculate_next_return_date


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sincroniza next_return_date do formulário mais recente de cada paciente."
    )
    parser.add_argument(
        "--username",
        type=str,
        default=None,
        help="Limita a operação a um usuário específico.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    session = SessionLocal()

    try:
        users_query = session.query(models.User)
        if args.username:
            users_query = users_query.filter(models.User.username == args.username)

        users = users_query.all()
        updated = 0

        for user in users:
            responses = session.query(models.FormResponse).join(models.Patient).filter(
                models.FormResponse.created_by_user_id == user.id,
                models.FormResponse.deleted_at.is_(None),
                models.Patient.created_by_user_id == user.id,
                models.Patient.deleted_at.is_(None),
            ).order_by(
                models.FormResponse.patient_id.asc(),
                models.FormResponse.response_date.desc(),
                models.FormResponse.id.desc(),
            ).all()

            latest_by_patient: dict[int, models.FormResponse] = {}
            for response in responses:
                if response.patient_id not in latest_by_patient:
                    latest_by_patient[response.patient_id] = response

            for response in latest_by_patient.values():
                desired_next_return_date = None

                if isinstance(response.form_data, dict):
                    hormone_over_one_year_answer = response.form_data.get("hormone_therapy_over_one_year")
                    if hormone_over_one_year_answer in {"Sim", "Não"}:
                        desired_next_return_date = calculate_next_return_date(
                            response_date=response.response_date,
                            uses_hormone_over_1year=response.uses_hormone_over_1year,
                        )

                current_next_return_date = response.next_return_date
                if current_next_return_date == desired_next_return_date:
                    continue

                response.next_return_date = desired_next_return_date
                updated += 1

        session.commit()
        print(f"Registros atualizados: {updated}")
        return 0
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
