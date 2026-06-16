from fastapi import Header, HTTPException
from .config import settings


def require_coach(x_api_key: str = Header(...)):
    if x_api_key != settings.coach_api_key:
        raise HTTPException(403, "Invalid API key")
