"""
Configuração centralizada de rate limiting.

Mantém o limiter fora do main para evitar importações circulares
entre a aplicação e os routers.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
