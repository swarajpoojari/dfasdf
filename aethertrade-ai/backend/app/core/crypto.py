"""Encryption of secrets at rest (provider API keys).

Fernet = AES-128-CBC + HMAC-SHA256 with a timestamp, from ``cryptography``. ``MultiFernet`` encrypts with
the first configured key and decrypts with any of them, which allows key rotation: add a new key at the
front, re-encrypt with :meth:`SecretCipher.rotate`, then remove the old key.

Keys live in the environment (``AETHER_SECRETS_ENCRYPTION_KEYS``), never in the database.
"""

from __future__ import annotations

import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken, MultiFernet


class SecretEncryptionNotConfiguredError(RuntimeError):
    pass


class SecretDecryptionError(RuntimeError):
    pass


class SecretCipher:
    def __init__(self, keys: list[str]) -> None:
        if not keys:
            raise SecretEncryptionNotConfiguredError("no encryption keys configured")
        try:
            self._fernet = MultiFernet([Fernet(k.encode("ascii")) for k in keys])
        except (ValueError, UnicodeEncodeError) as exc:
            raise SecretEncryptionNotConfiguredError(
                "AETHER_SECRETS_ENCRYPTION_KEYS contains an invalid Fernet key"
            ) from exc

    @classmethod
    def from_setting(cls, raw: str | None) -> SecretCipher | None:
        if raw is None or not raw.strip():
            return None
        return cls([k.strip() for k in raw.split(",") if k.strip()])

    @staticmethod
    def generate_key() -> str:
        return Fernet.generate_key().decode("ascii")

    def encrypt_json(self, payload: dict[str, Any]) -> bytes:
        data = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        return self._fernet.encrypt(data)

    def decrypt_json(self, token: bytes) -> dict[str, Any]:
        try:
            data = self._fernet.decrypt(token)
        except InvalidToken as exc:
            raise SecretDecryptionError(
                "secret could not be decrypted with configured keys"
            ) from exc
        value = json.loads(data)
        if not isinstance(value, dict):
            raise SecretDecryptionError("decrypted secret payload is not an object")
        return value

    def rotate(self, token: bytes) -> bytes:
        try:
            return self._fernet.rotate(token)
        except InvalidToken as exc:
            raise SecretDecryptionError(
                "secret could not be decrypted with configured keys"
            ) from exc
