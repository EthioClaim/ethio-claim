from fastapi import Header, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.core.config import settings

security_bearer = HTTPBearer(auto_error=False)


async def verify_internal_token(
    x_internal_service_token: Optional[str] = Header(None, alias="X-Internal-Service-Token"),
    bearer_credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> bool:
    """
    Verifies that the caller possesses the trusted internal service secret token.
    Supports either 'X-Internal-Service-Token' header or 'Authorization: Bearer <token>'.
    """
    token = x_internal_service_token
    if not token and bearer_credentials:
        token = bearer_credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing internal service authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if token != settings.INTERNAL_SERVICE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal service token",
        )

    return True
