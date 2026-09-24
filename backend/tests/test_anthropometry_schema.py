import unittest

from pydantic import ValidationError

from app.schemas import AnthropometryRecordCreate


class AnthropometryRecordValidationTest(unittest.TestCase):
    def test_participant_and_age_limits(self):
        valid = AnthropometryRecordCreate(
            participant_id="001", full_name="Participante", age=18, form_data={}
        )
        self.assertEqual(valid.participant_id, "001")

        for participant_id, age in [("000", 18), ("101", 18), ("001", 17), ("001", 61)]:
            with self.subTest(participant_id=participant_id, age=age), self.assertRaises(ValidationError):
                AnthropometryRecordCreate(
                    participant_id=participant_id,
                    full_name="Participante",
                    age=age,
                    form_data={},
                )


if __name__ == "__main__":
    unittest.main()
