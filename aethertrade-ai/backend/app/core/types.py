"""Shared Pydantic field types.

``DecimalStr`` is the wire format for money, prices and quantities: accepted as a JSON string (or an
integer), rejected as a float (binary floating point cannot represent most decimal amounts exactly), and
serialized back as a string.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any

from pydantic import AfterValidator, BeforeValidator, PlainSerializer

from app.core.clock import ensure_utc


def _reject_float(value: Any) -> Any:
    if isinstance(value, float):
        raise ValueError("decimal values must be sent as strings, not floating-point numbers")
    if isinstance(value, bool):
        raise ValueError("boolean is not a decimal value")
    return value


DecimalStr = Annotated[
    Decimal,
    BeforeValidator(_reject_float),
    PlainSerializer(lambda v: format(v, "f"), return_type=str, when_used="json"),
]

UtcDatetime = Annotated[datetime, AfterValidator(ensure_utc)]
