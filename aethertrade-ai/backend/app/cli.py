"""Operational commands.

    python -m app.cli create-user --email you@example.com --name "Owner" [--role owner]
    python -m app.cli generate-encryption-key

Passwords are read from an interactive prompt, or from stdin with ``--password-stdin`` (for scripts and
containers). They are never accepted as command-line arguments, which would leak into shell history and
process listings.
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import sys

from app.audit.service import AuditContext
from app.core.clock import utc_now
from app.core.config import get_settings
from app.core.crypto import SecretCipher
from app.core.errors import ProblemError
from app.core.permissions import Role
from app.database.session import Database
from app.identity.service import UserService


def _read_password(from_stdin: bool) -> str:
    if from_stdin:
        return sys.stdin.readline().rstrip("\n")
    first = getpass.getpass("Password (min 12 characters): ")
    second = getpass.getpass("Repeat password: ")
    if first != second:
        raise SystemExit("Passwords do not match.")
    return first


async def _create_user(email: str, name: str, role: Role, password: str) -> None:
    settings = get_settings()
    db = Database(settings.database_url, pool_size=1)
    try:
        async with db.session_factory() as session:
            user = await UserService(session, settings=settings, clock=utc_now).create_user(
                email=email,
                display_name=name,
                password=password,
                role=role,
                ctx=AuditContext(actor_type="system"),
            )
            print(f"Created {user.role} {user.email} ({user.id})")
    finally:
        await db.dispose()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli", description="AetherTrade operations")
    sub = parser.add_subparsers(dest="command", required=True)

    create = sub.add_parser("create-user", help="Create a user (there is no public sign-up)")
    create.add_argument("--email", required=True)
    create.add_argument("--name", required=True)
    create.add_argument("--role", choices=[r.value for r in Role], default=Role.OWNER.value)
    create.add_argument("--password-stdin", action="store_true")

    sub.add_parser("generate-encryption-key", help="Print a new Fernet key for secrets at rest")

    args = parser.parse_args(argv)
    if args.command == "generate-encryption-key":
        print(SecretCipher.generate_key())
        return 0

    password = _read_password(args.password_stdin)
    try:
        asyncio.run(_create_user(args.email, args.name, Role(args.role), password))
    except ProblemError as exc:
        print(f"Error: {exc.detail or exc.title}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
