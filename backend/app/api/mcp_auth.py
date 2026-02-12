from typing import Optional
from fastapi import Header, HTTPException, status
from app.core.config import settings


async def verify_mcp_api_key(authorization: Optional[str] = Header(None)) -> None:
    """
    Verify MCP API key from Authorization header.
    
    Args:
        authorization: Authorization header value (should be "Bearer <api_key>")
    
    Raises:
        HTTPException: 401 if API key is missing or invalid
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Please provide Authorization header with Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract Bearer token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Use: Authorization: Bearer <API_KEY>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    provided_key = parts[1]
    
    # Validate against configured MCP API key
    if not settings.MCP_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MCP API key not configured on server",
        )
    
    if provided_key != settings.MCP_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # API key is valid, return None (dependency satisfied)
    return None
