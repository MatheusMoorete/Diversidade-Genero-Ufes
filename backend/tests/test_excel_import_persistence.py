import os
from pathlib import Path
import sys
import unittest
from datetime import datetime
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
os.environ["DATABASE_URL"] = "sqlite:///C:/tmp/div-import-app-tests.sqlite3"
os.environ["SECRET_KEY"] = "test-secret-key-with-sufficient-length"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.routers import excel as excel_router


class ExcelImportPersistenceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        models.Base.metadata.create_all(self.engine)
        self.session = sessionmaker(bind=self.engine)()
        self.user_one = models.User(username="researcher-one", password_hash="hash")
        self.user_two = models.User(username="researcher-two", password_hash="hash")
        self.session.add_all([self.user_one, self.user_two])
        self.session.commit()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    @staticmethod
    def _imported_row():
        return {
            "full_name": "Paciente Teste",
            "form_response": {
                "response_date": datetime(2026, 1, 2, 10, 30),
                "uses_hormone_over_1year": True,
                "form_data": {
                    "patient_name": "Paciente Teste",
                    "hormone_therapy_over_one_year": "Sim",
                },
            },
        }

    def test_isolates_same_patient_name_between_users_and_avoids_duplicate_response(self):
        other_users_patient = models.Patient(
            full_name="Paciente Teste",
            created_by_user_id=self.user_two.id,
        )
        self.session.add(other_users_patient)
        self.session.commit()

        first_result = excel_router._persist_imported_patients(
            self.session,
            user_id=self.user_one.id,
            imported_rows=[self._imported_row()],
        )
        second_result = excel_router._persist_imported_patients(
            self.session,
            user_id=self.user_one.id,
            imported_rows=[self._imported_row()],
        )

        user_one_patients = self.session.query(models.Patient).filter_by(
            created_by_user_id=self.user_one.id
        ).all()
        user_two_patients = self.session.query(models.Patient).filter_by(
            created_by_user_id=self.user_two.id
        ).all()
        responses = self.session.query(models.FormResponse).all()

        self.assertEqual(len(user_one_patients), 1)
        self.assertEqual(len(user_two_patients), 1)
        self.assertEqual(len(responses), 1)
        self.assertEqual(responses[0].created_by_user_id, self.user_one.id)
        self.assertEqual(responses[0].patient_id, user_one_patients[0].id)
        self.assertEqual(len(first_result["created_patients"]), 1)
        self.assertEqual(first_result["created_responses"], 1)
        self.assertEqual(second_result["created_patients"], [])
        self.assertEqual(second_result["duplicate_responses"], 1)

    def test_rolls_back_patient_when_response_creation_fails(self):
        with patch.object(
            excel_router.crud,
            "create_form_response",
            side_effect=RuntimeError("simulated failure"),
        ):
            with self.assertRaises(RuntimeError):
                excel_router._persist_imported_patients(
                    self.session,
                    user_id=self.user_one.id,
                    imported_rows=[self._imported_row()],
                )

        patient_count = self.session.query(models.Patient).filter_by(
            created_by_user_id=self.user_one.id
        ).count()
        response_count = self.session.query(models.FormResponse).filter_by(
            created_by_user_id=self.user_one.id
        ).count()
        self.assertEqual(patient_count, 0)
        self.assertEqual(response_count, 0)


if __name__ == "__main__":
    unittest.main()
