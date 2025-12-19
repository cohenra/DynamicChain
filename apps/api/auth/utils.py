from datetime import datetime, timedelta
from typing import Optional, Any, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from config import settings
from schemas.auth import TokenData


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt (Alias for compatibility)."""
    return hash_password(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expiration_minutes)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenData]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
        user_id: int = payload.get("user_id")
        tenant_id: int = payload.get("tenant_id")
        email: str = payload.get("email")
        role: str = payload.get("role")

        if user_id is None or email is None:
            return None

        return TokenData(
            user_id=user_id,
            tenant_id=tenant_id,
            email=email,
            role=role
        )
    except JWTError:
        return None