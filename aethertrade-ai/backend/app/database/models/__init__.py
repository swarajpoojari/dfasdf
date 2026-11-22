"""All models are imported here so Alembic autogenerate and the mapper registry see every table."""

from app.database.models.audit import AuditLog
from app.database.models.credentials import ProviderCredential
from app.database.models.identity import AuthSession, User, UserPreferences

__all__ = ["AuditLog", "AuthSession", "ProviderCredential", "User", "UserPreferences"]
