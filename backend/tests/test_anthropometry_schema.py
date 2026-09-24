import unittest

from pydantic import ValidationError

from app.schemas import AnthropometryRecordCreate


class AnthropometryRecordValidationTest(unittest.TestCase):
    def test_age_limits(self):
        valid = AnthropometryRecordCreate(
            full_name="Participante", age=18, form_data={}
        )
        self.assertEqual(valid.age, 18)

        for age in (17, 61):
            with self.subTest(age=age), self.assertRaises(ValidationError):
                AnthropometryRecordCreate(
                    full_name="Participante",
                    age=age,
                    form_data={},
                )


if __name__ == "__main__":
    unittest.main()
