"""JWT authentication and role authorization helpers."""

import os
from typing import Dict

import jwt
from fastapi import Header, HTTPException, status


def _jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET", "").strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT configuration is missing",
        )
    return secret


def get_current_user(
    authorization: str = Header(default=""),
) -> Dict[str, str]:
    """Validate a Bearer token and return its user claims."""

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = jwt.decode(
            token,
            _jwt_secret(),
            algorithms=["HS256"],
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        ) from exc

    username = str(payload.get("sub") or "").strip()
    role = str(payload.get("role") or "user").strip().lower()

    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    return {
        "username": username,
        "role": role,
    }


def require_reviewer(
    authorization: str = Header(default=""),
) -> Dict[str, str]:
    """Allow only reviewer and admin roles."""

    user = get_current_user(authorization)

    if user["role"] not in {"reviewer", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reviewer access required",
        )

    return user
