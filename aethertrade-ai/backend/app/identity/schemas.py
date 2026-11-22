"""API schemas for authentication, users and preferences."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.core.types import DecimalStr


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Deliberately not EmailStr: login must not reveal anything through validation differences.
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=1024)


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    role: str
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    permissions: list[str]


class LoginResponse(BaseModel):
    user: UserOut
    access_expires_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"  # noqa: S105 - OAuth2 token type
    expires_in: int


class CapitalBounds(BaseModel):
    min: DecimalStr
    max: DecimalStr


class PreferencesOut(BaseModel):
    base_currency: str
    timezone: str
    number_locale: str
    theme: str
    default_paper_capital: DecimalStr
    paper_capital_bounds: CapitalBounds
    updated_at: datetime


class PreferencesUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    base_currency: Literal["INR", "USD"] | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    number_locale: Literal["en-IN", "en-US"] | None = None
    theme: Literal["dark", "light", "system"] | None = None
    default_paper_capital: DecimalStr | None = Field(default=None, max_digits=16, decimal_places=2)


class PasswordChangeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str = Field(min_length=1, max_length=1024)
    new_password: str = Field(min_length=1, max_length=1024)
