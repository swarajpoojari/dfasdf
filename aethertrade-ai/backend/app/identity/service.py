"""Authentication and user use-cases.

Each public method is one unit of work: it commits on success, and on handled failures commits only the
audit trail it wants to keep (e.g. a failed login) before raising.

Rate-limit policy (all windows fixed, keys never contain raw emails):

* every login attempt counts against the client IP (``login_attempts_per_ip_per_minute``);
* failed attempts count against (account, IP) — after ``login_failures_per_account_window`` failures the
  pair is locked for the rest of ``login_failure_window_seconds``; a success clears the counter;
* refresh attempts count against the client IP.
"""

from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import AuditContext, AuditService
from app.core.clock import Clock
from app.core.config import Settings
from app.core.errors import (
    ConflictError,
    ForbiddenError,
    InvalidCredentialsError,
    RateLimitedError,
    UnauthorizedError,
    UnprocessableError,
)
from app.core.ids import uuid7
from app.core.permissions import Role, permissions_for
from app.core.rate_limit import RateLimiter, enforce
from app.core.security import (
    IssuedToken,
    PasswordPolicyError,
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    password_needs_rehash,
    validate_password_policy,
    verify_password,
)
from app.database.models import AuthSession, User, UserPreferences
from app.database.repositories.identity import AuthSessionRepository, UserRepository
from app.identity.schemas import CapitalBounds, PreferencesOut, PreferencesUpdate, UserOut

# A rotated refresh token presented again within this window is treated as a benign race between two
# browser tabs (both share the new cookie) rather than theft.
ROTATION_GRACE = timedelta(seconds=10)
MONEY_QUANTUM = Decimal("0.01")


class RotationRaceError(UnauthorizedError):
    """The presented refresh token was rotated moments ago by a concurrent request (another tab).

    The browser already holds the new cookies from the winning request, so the API must *not* clear
    cookies in this case — doing so would delete the fresh session and log the user out.
    """

    slug = "session-rotated"
    title = "Session was just refreshed"


@dataclass(frozen=True)
class IssuedSession:
    user: User
    access: IssuedToken
    refresh_token: str
    refresh_expires_at: datetime


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _email_key(email: str) -> str:
    return hashlib.sha256(email.encode("utf-8")).hexdigest()[:32]


def user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        permissions=sorted(p.value for p in permissions_for(user.role)),
    )


class AuthService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        settings: Settings,
        clock: Clock,
        limiter: RateLimiter,
    ) -> None:
        self._s = session
        self._settings = settings
        self._clock = clock
        self._limiter = limiter
        self._users = UserRepository(session)
        self._sessions = AuthSessionRepository(session)
        self._audit = AuditService(session, clock)

    # --- tokens --------------------------------------------------------------------------------
    def issue_access_token(self, user: User) -> IssuedToken:
        return create_access_token(
            user_id=user.id,
            role=user.role,
            token_version=user.token_version,
            secret=self._settings.jwt_secret.get_secret_value(),
            issuer=self._settings.jwt_issuer,
            ttl_seconds=self._settings.access_token_ttl_seconds,
            now=self._clock(),
        )

    async def _new_session(
        self, user: User, ctx: AuditContext, *, family_id: uuid.UUID | None = None
    ) -> tuple[str, datetime]:
        now = self._clock()
        token = generate_refresh_token()
        expires_at = now + timedelta(seconds=self._settings.refresh_token_ttl_seconds)
        await self._sessions.add(
            AuthSession(
                user_id=user.id,
                family_id=family_id or uuid7(),
                token_hash=hash_token(token),
                issued_at=now,
                expires_at=expires_at,
                user_agent=(ctx.user_agent or "")[:512] or None,
                ip_address=ctx.ip_address,
            )
        )
        return token, expires_at

    # --- login ---------------------------------------------------------------------------------
    async def authenticate(self, email: str, password: str, ctx: AuditContext) -> User:
        ip = ctx.ip_address or "unknown"
        email_norm = normalize_email(email)
        await enforce(
            self._limiter,
            f"login:ip:{ip}",
            limit=self._settings.login_attempts_per_ip_per_minute,
            window_seconds=60,
        )
        window = self._settings.login_failure_window_seconds
        fail_key = f"login:fail:{_email_key(email_norm)}:{ip}"
        # Counts failures from every IP. Defence in depth: if the apparent client IP can be varied
        # (many source addresses, or a misconfigured proxy-header trust), the per-(account, IP) lock
        # alone would allow unlimited guessing.
        global_fail_key = f"login:fail:{_email_key(email_norm)}:any"
        for key, limit in (
            (fail_key, self._settings.login_failures_per_account_window),
            (global_fail_key, self._settings.login_failures_per_account_all_ips_window),
        ):
            failures = await self._limiter.peek(key)
            if failures.count >= limit:
                raise RateLimitedError(retry_after=failures.reset_after or window)

        user = await self._users.get_by_email(email_norm)
        if not verify_password(password, user.password_hash if user else None) or user is None:
            await self._limiter.increment(fail_key, window)
            await self._limiter.increment(global_fail_key, window)
            await self._audit.record(
                ctx,
                "auth.login.failed",
                entity_type="user",
                entity_id=user.id if user else None,
                details={"email": email_norm[:320], "reason": "invalid_credentials"},
            )
            await self._s.commit()
            raise InvalidCredentialsError("Email or password is incorrect.")

        if not user.is_active:
            await self._audit.record(
                ctx.as_user(user.id),
                "auth.login.failed",
                entity_type="user",
                entity_id=user.id,
                details={"reason": "inactive"},
            )
            await self._s.commit()
            raise ForbiddenError("This account is disabled.")

        await self._limiter.reset(fail_key)
        await self._limiter.reset(global_fail_key)
        if password_needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)
        return user

    async def login(self, email: str, password: str, ctx: AuditContext) -> IssuedSession:
        user = await self.authenticate(email, password, ctx)
        user.last_login_at = self._clock()
        refresh, refresh_exp = await self._new_session(user, ctx)
        access = self.issue_access_token(user)
        await self._audit.record(
            ctx.as_user(user.id), "auth.login.succeeded", entity_type="user", entity_id=user.id
        )
        await self._s.commit()
        return IssuedSession(user, access, refresh, refresh_exp)

    async def token_login(
        self, email: str, password: str, ctx: AuditContext
    ) -> tuple[User, IssuedToken]:
        """Bearer-token login for API clients: no refresh token, no cookies."""
        user = await self.authenticate(email, password, ctx)
        user.last_login_at = self._clock()
        access = self.issue_access_token(user)
        await self._audit.record(
            ctx.as_user(user.id), "auth.token.issued", entity_type="user", entity_id=user.id
        )
        await self._s.commit()
        return user, access

    # --- refresh / logout ----------------------------------------------------------------------
    async def refresh(self, refresh_token: str | None, ctx: AuditContext) -> IssuedSession:
        await enforce(
            self._limiter,
            f"refresh:ip:{ctx.ip_address or 'unknown'}",
            limit=self._settings.refresh_attempts_per_ip_per_minute,
            window_seconds=60,
        )
        if not refresh_token:
            raise UnauthorizedError("No refresh token.")
        now = self._clock()
        row = await self._sessions.get_by_token_hash(hash_token(refresh_token), for_update=True)
        if row is None:
            raise UnauthorizedError("Session is not valid.")

        if row.revoked_at is not None:
            benign_race = (
                row.revoked_reason == "rotated"
                and row.rotated_at is not None
                and now - row.rotated_at <= ROTATION_GRACE
            )
            if benign_race:
                raise RotationRaceError(
                    "This session was just refreshed by another request; retry with current cookies."
                )
            if row.revoked_reason == "rotated":
                await self._sessions.revoke_family(row.family_id, reason="reuse_detected", now=now)
                await self._audit.record(
                    AuditContext(
                        actor_type="user",
                        actor_id=row.user_id,
                        request_id=ctx.request_id,
                        ip_address=ctx.ip_address,
                        user_agent=ctx.user_agent,
                    ),
                    "auth.refresh.reuse_detected",
                    entity_type="auth_session_family",
                    entity_id=row.family_id,
                )
                await self._s.commit()
            raise UnauthorizedError("Session is no longer valid.")

        if row.expires_at <= now:
            row.revoked_at, row.revoked_reason = now, "expired"
            await self._s.commit()
            raise UnauthorizedError("Session expired.")

        user = await self._users.get(row.user_id)
        if user is None or not user.is_active:
            await self._sessions.revoke_family(row.family_id, reason="logout", now=now)
            await self._s.commit()
            raise UnauthorizedError("Session is no longer valid.")

        row.rotated_at, row.revoked_at, row.revoked_reason = now, now, "rotated"
        refresh, refresh_exp = await self._new_session(user, ctx, family_id=row.family_id)
        access = self.issue_access_token(user)
        await self._s.commit()
        return IssuedSession(user, access, refresh, refresh_exp)

    async def logout(self, refresh_token: str | None, ctx: AuditContext) -> None:
        if not refresh_token:
            return
        row = await self._sessions.get_by_token_hash(hash_token(refresh_token))
        if row is None:
            return
        await self._sessions.revoke_family(row.family_id, reason="logout", now=self._clock())
        await self._audit.record(
            ctx.as_user(row.user_id), "auth.logout", entity_type="user", entity_id=row.user_id
        )
        await self._s.commit()

    # --- password ------------------------------------------------------------------------------
    async def change_password(
        self, user: User, current_password: str, new_password: str, ctx: AuditContext
    ) -> IssuedSession:
        fail_key = f"password:fail:{user.id}"
        failures = await self._limiter.peek(fail_key)
        if failures.count >= self._settings.login_failures_per_account_window:
            raise RateLimitedError(retry_after=failures.reset_after or 60)
        if not verify_password(current_password, user.password_hash):
            await self._limiter.increment(fail_key, self._settings.login_failure_window_seconds)
            raise InvalidCredentialsError("Current password is incorrect.")
        try:
            validate_password_policy(new_password, email=user.email)
        except PasswordPolicyError as exc:
            raise UnprocessableError(str(exc)) from exc
        if verify_password(new_password, user.password_hash):
            raise UnprocessableError("New password must differ from the current password.")

        await self._limiter.reset(fail_key)
        now = self._clock()
        user.password_hash = hash_password(new_password)
        user.token_version += 1
        await self._sessions.revoke_all_for_user(user.id, reason="password_changed", now=now)
        refresh, refresh_exp = await self._new_session(user, ctx)
        access = self.issue_access_token(user)
        await self._audit.record(
            ctx, "auth.password.changed", entity_type="user", entity_id=user.id
        )
        await self._s.commit()
        return IssuedSession(user, access, refresh, refresh_exp)


class UserService:
    def __init__(self, session: AsyncSession, *, settings: Settings, clock: Clock) -> None:
        self._s = session
        self._settings = settings
        self._users = UserRepository(session)
        self._audit = AuditService(session, clock)

    def _bounds(self) -> CapitalBounds:
        return CapitalBounds(
            min=self._settings.paper_capital_min.quantize(MONEY_QUANTUM),
            max=self._settings.paper_capital_max.quantize(MONEY_QUANTUM),
        )

    def _out(self, prefs: UserPreferences) -> PreferencesOut:
        return PreferencesOut(
            base_currency=prefs.base_currency,
            timezone=prefs.timezone,
            number_locale=prefs.number_locale,
            theme=prefs.theme,
            default_paper_capital=prefs.default_paper_capital.quantize(MONEY_QUANTUM),
            paper_capital_bounds=self._bounds(),
            updated_at=prefs.updated_at,
        )

    async def create_user(
        self, *, email: str, display_name: str, password: str, role: Role, ctx: AuditContext
    ) -> User:
        email_norm = normalize_email(email)
        if "@" not in email_norm or len(email_norm) > 320:
            raise UnprocessableError("A valid email address is required.")
        if not display_name.strip() or len(display_name) > 120:
            raise UnprocessableError("Display name must be 1 to 120 characters.")
        try:
            validate_password_policy(password, email=email_norm)
        except PasswordPolicyError as exc:
            raise UnprocessableError(str(exc)) from exc
        if await self._users.get_by_email(email_norm) is not None:
            raise ConflictError("A user with this email already exists.")
        user = await self._users.add(
            User(
                email=email_norm,
                display_name=display_name.strip(),
                password_hash=hash_password(password),
                role=role.value,
                is_active=True,
                token_version=0,
            ),
            UserPreferences(default_paper_capital=self._settings.paper_capital_default),
        )
        await self._audit.record(
            ctx,
            "users.created",
            entity_type="user",
            entity_id=user.id,
            details={"role": role.value},
        )
        await self._s.commit()
        return user

    async def get_preferences(self, user: User) -> PreferencesOut:
        prefs = await self._users.get_preferences(user.id)
        if prefs is None:  # pragma: no cover - created with the user; defensive
            raise UnprocessableError("Preferences are missing for this user.")
        return self._out(prefs)

    async def update_preferences(
        self, user: User, patch: PreferencesUpdate, ctx: AuditContext
    ) -> PreferencesOut:
        prefs = await self._users.get_preferences(user.id)
        if prefs is None:  # pragma: no cover
            raise UnprocessableError("Preferences are missing for this user.")
        changes = patch.model_dump(exclude_unset=True, exclude_none=True)
        if "timezone" in changes:
            try:
                ZoneInfo(changes["timezone"])
            except (ZoneInfoNotFoundError, ValueError) as exc:
                raise UnprocessableError(f"Unknown timezone: {changes['timezone']!r}") from exc
        if "default_paper_capital" in changes:
            capital: Decimal = changes["default_paper_capital"]
            lo, hi = self._settings.paper_capital_min, self._settings.paper_capital_max
            if not lo <= capital <= hi:
                raise UnprocessableError(
                    f"Default paper capital must be between {lo:,.2f} and {hi:,.2f}."
                )
        diff: dict[str, dict[str, str]] = {}
        for key, new in changes.items():
            old = getattr(prefs, key)
            if old != new:
                diff[key] = {"from": str(old), "to": str(new)}
                setattr(prefs, key, new)
        if diff:
            await self._audit.record(
                ctx, "preferences.updated", entity_type="user", entity_id=user.id, details=diff
            )
            await self._s.commit()
            await self._s.refresh(prefs)
        return self._out(prefs)
