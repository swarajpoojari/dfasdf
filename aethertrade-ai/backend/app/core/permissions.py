"""Roles and permissions. Endpoints depend on permissions, never on role names directly."""

from __future__ import annotations

from enum import StrEnum


class Role(StrEnum):
    OWNER = "owner"
    ANALYST = "analyst"
    VIEWER = "viewer"


class Permission(StrEnum):
    READ = "read"
    PREFERENCES_WRITE = "preferences:write"
    RESEARCH_RUN = "research:run"
    STRATEGIES_WRITE = "strategies:write"
    PAPER_TRADE = "paper:trade"
    CREDENTIALS_MANAGE = "credentials:manage"
    AUDIT_READ = "audit:read"
    USERS_MANAGE = "users:manage"


ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.OWNER: frozenset(Permission),
    Role.ANALYST: frozenset(
        {
            Permission.READ,
            Permission.PREFERENCES_WRITE,
            Permission.RESEARCH_RUN,
            Permission.STRATEGIES_WRITE,
            Permission.PAPER_TRADE,
        }
    ),
    Role.VIEWER: frozenset({Permission.READ, Permission.PREFERENCES_WRITE}),
}


def permissions_for(role: str) -> frozenset[Permission]:
    try:
        return ROLE_PERMISSIONS[Role(role)]
    except ValueError:
        return frozenset()


def has_permission(role: str, permission: Permission) -> bool:
    return permission in permissions_for(role)
