"""API schemas for provider credentials. Secret values are accepted on create and never returned."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

LABEL_PATTERN = r"^[a-z0-9][a-z0-9_-]{0,63}$"


class ProviderOut(BaseModel):
    id: str
    name: str
    category: str
    intended_use: list[str]
    secret_fields: list[str]
    config_fields: list[str]
    docs_url: str
    adapter_status: str
    active_credentials: int


class CredentialCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: str = Field(min_length=1, max_length=64)
    label: str = Field(default="primary", pattern=LABEL_PATTERN)
    secrets: dict[str, str] = Field(default_factory=dict)
    config: dict[str, str] = Field(default_factory=dict)


class CredentialOut(BaseModel):
    id: uuid.UUID
    provider: str
    label: str
    secret_fields: list[str]
    secret_hint: str | None
    config: dict[str, str]
    created_at: datetime
    updated_at: datetime
