"""
Utilitários para cálculo de datas de retorno.
"""

from __future__ import annotations

from calendar import monthrange
from datetime import datetime


def add_months(value: datetime, months: int) -> datetime:
    """
    Soma meses preservando o dia quando possível.
    """
    target_month_index = (value.month - 1) + months
    target_year = value.year + (target_month_index // 12)
    target_month = (target_month_index % 12) + 1
    target_day = min(value.day, monthrange(target_year, target_month)[1])

    return value.replace(year=target_year, month=target_month, day=target_day)


def calculate_next_return_date(response_date: datetime, uses_hormone_over_1year: bool) -> datetime:
    """
    Regra de negócio atual:
    - menos de 1 ano de hormonioterapia: retorno em 3 meses
    - 1 ano ou mais de hormonioterapia: retorno em 6 meses
    """
    months_to_add = 6 if uses_hormone_over_1year else 3
    return add_months(response_date, months_to_add)
