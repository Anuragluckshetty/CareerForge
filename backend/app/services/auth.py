import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt

from app.config.settings import settings


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(
        password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=64
    )
    return "scrypt$" + base64.urlsafe_b64encode(salt).decode() + "$" + base64.urlsafe_b64encode(digest).decode()


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, encoded_salt, encoded_digest = stored_hash.split("$")
        if algorithm != "scrypt":
            return False
        salt = base64.urlsafe_b64decode(encoded_salt)
        expected = base64.urlsafe_b64decode(encoded_digest)
        actual = hashlib.scrypt(
            password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=64
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected)


def create_access_token(user_id: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    return jwt.encode(
        {"sub": user_id, "exp": expires, "jti": str(uuid4())},
        settings.jwt_secret_key,
        algorithm="HS256",
    )


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
    except jwt.PyJWTError as error:
        raise ValueError("Invalid or expired access token.") from error
    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise ValueError("Token subject is missing.")
    return subject

