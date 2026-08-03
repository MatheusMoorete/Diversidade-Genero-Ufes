import os
from pathlib import Path
import sys
import tempfile
import types
import unittest
from datetime import datetime

import pandas as pd


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-with-sufficient-length")

if "dotenv" not in sys.modules:
    dotenv_stub = types.ModuleType("dotenv")
    dotenv_stub.load_dotenv = lambda *args, **kwargs: False
    sys.modules["dotenv"] = dotenv_stub

from app import excel_service


class ExcelServiceTests(unittest.TestCase):
    def test_exports_patient_without_form_response(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            original_export_dir = excel_service.EXPORT_DIR
            excel_service.EXPORT_DIR = Path(temp_dir)
            try:
                filepath = excel_service.exportar_pacientes_excel([
                    {
                        "patient": {"id": 1, "full_name": "Paciente Teste"},
                        "form_responses": [],
                    }
                ])
                exported = pd.read_excel(filepath, engine="openpyxl")
            finally:
                excel_service.EXPORT_DIR = original_export_dir

        self.assertEqual(len(exported), 1)
        self.assertEqual(
            exported.loc[0, excel_service.FIELD_TO_EXPORT_COLUMN["patient_name"]],
            "Paciente Teste",
        )
        self.assertTrue(pd.isna(exported.loc[0, excel_service.SURVEY_EXPORT_COLUMNS[0]]))

    def test_exported_file_can_be_imported_with_form_response(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            original_export_dir = excel_service.EXPORT_DIR
            excel_service.EXPORT_DIR = Path(temp_dir)
            try:
                filepath = excel_service.exportar_pacientes_excel([
                    {
                        "patient": {"id": 1, "full_name": "Paciente Teste"},
                        "form_responses": [
                            {
                                "response_date": datetime(2026, 1, 2, 10, 30),
                                "form_data": {
                                    "patient_name": "Paciente Teste",
                                    "birth_date": "2000-05-20",
                                    "previous_diseases": ["Diabetes", "Hipertensão"],
                                    "hormone_therapy_over_one_year": "Sim",
                                    "weight": 70.5,
                                },
                            }
                        ],
                    }
                ])
                imported, errors = excel_service.importar_pacientes_excel(filepath)
            finally:
                excel_service.EXPORT_DIR = original_export_dir

        self.assertEqual(errors, [])
        self.assertEqual(len(imported), 1)
        self.assertEqual(imported[0]["full_name"], "Paciente Teste")
        response = imported[0]["form_response"]
        self.assertEqual(response["response_date"], datetime(2026, 1, 2, 10, 30))
        self.assertTrue(response["uses_hormone_over_1year"])
        self.assertEqual(response["form_data"]["birth_date"], "2000-05-20")
        self.assertEqual(
            response["form_data"]["previous_diseases"],
            ["Diabetes", "Hipertensão"],
        )

    def test_accepts_legacy_name_only_spreadsheet(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            filepath = Path(temp_dir) / "legacy.xlsx"
            pd.DataFrame([{"Nome_Completo": "Paciente Teste"}]).to_excel(
                filepath,
                index=False,
                engine="openpyxl",
            )
            imported, errors = excel_service.importar_pacientes_excel(str(filepath))

        self.assertEqual(errors, [])
        self.assertEqual(imported, [{"full_name": "Paciente Teste"}])

    def test_rejects_clinical_data_without_response_date(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            filepath = Path(temp_dir) / "missing-date.xlsx"
            pd.DataFrame([
                {
                    excel_service.FIELD_TO_EXPORT_COLUMN["patient_name"]: "Paciente Teste",
                    excel_service.FIELD_TO_EXPORT_COLUMN["weight"]: 70,
                }
            ]).to_excel(filepath, index=False, engine="openpyxl")
            imported, errors = excel_service.importar_pacientes_excel(str(filepath))

        self.assertEqual(imported, [])
        self.assertEqual(len(errors), 1)
        self.assertIn("Carimbo de data/hora", errors[0])


if __name__ == "__main__":
    unittest.main()
