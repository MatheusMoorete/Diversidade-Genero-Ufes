"""
Remove dados de pesquisa do banco preservando usuários.

Escopo:
- apaga fisicamente todas as linhas de form_responses
- apaga fisicamente todas as linhas de patients
- mantém users intacto
"""

from __future__ import annotations

from sqlalchemy import text

from app.database import SessionLocal


def main() -> int:
    session = SessionLocal()
    try:
        users_before = session.execute(text("SELECT COUNT(*) FROM users")).scalar_one()
        patients_before = session.execute(text("SELECT COUNT(*) FROM patients")).scalar_one()
        responses_before = session.execute(text("SELECT COUNT(*) FROM form_responses")).scalar_one()

        session.execute(text("DELETE FROM form_responses"))
        session.execute(text("DELETE FROM patients"))
        session.commit()

        users_after = session.execute(text("SELECT COUNT(*) FROM users")).scalar_one()
        patients_after = session.execute(text("SELECT COUNT(*) FROM patients")).scalar_one()
        responses_after = session.execute(text("SELECT COUNT(*) FROM form_responses")).scalar_one()

        print(
            "RESET_OK "
            f"users_before={users_before} "
            f"patients_before={patients_before} "
            f"responses_before={responses_before} "
            f"users_after={users_after} "
            f"patients_after={patients_after} "
            f"responses_after={responses_after}"
        )
        return 0
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
